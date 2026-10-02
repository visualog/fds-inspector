(function initStyleTokenDetection(globalScope) {
  function isCssVariableReference(value) {
    return /\bvar\(\s*--[^)]+\)/.test(String(value || ''));
  }

  function readDeclarationValue(style, property) {
    if (!style || !property) return '';
    if (typeof style.getPropertyValue === 'function') {
      return style.getPropertyValue(property) || '';
    }
    return style[property] || '';
  }

  function canMatchSelector(element, selectorText) {
    if (!element || typeof element.matches !== 'function' || !selectorText) return false;
    return selectorText.split(',').some((selector) => {
      try {
        return element.matches(selector.trim());
      } catch {
        return false;
      }
    });
  }

  function visitCssRules(rules, visitor, view = globalScope, layers = new Map(), layer = '', parentSelector = '') {
    Array.from(rules || []).forEach((rule) => {
      if (rule?.media?.mediaText && view?.matchMedia
        && !view.matchMedia(rule.media.mediaText).matches) return;
      if (rule?.constructor?.name === 'CSSSupportsRule' && view?.CSS?.supports
        && !view.CSS.supports(rule.conditionText)) return;
      const type = rule?.constructor?.name;
      if (type === 'CSSLayerStatementRule') {
        const names = typeof rule.nameList === 'string' ? rule.nameList.split(',') : Array.from(rule.nameList || []);
        names.forEach(name => {
          const key = layer ? `${layer}.${name.trim()}` : name.trim();
          if (!layers.has(key)) layers.set(key, layers.size);
        });
      }
      let nextLayer = layer;
      if (type === 'CSSLayerBlockRule') {
        nextLayer = layer ? `${layer}.${rule.name || layers.size}` : rule.name || `anonymous-${layers.size}`;
        if (!layers.has(nextLayer)) layers.set(nextLayer, layers.size);
      }
      const selector = rule?.selectorText && parentSelector
        ? rule.selectorText.split(',').flatMap(child => parentSelector.split(',').map(parent =>
          child.includes('&') ? child.replaceAll('&', `:is(${parent.trim()})`) : `${parent.trim()} ${child.trim()}`)).join(',')
        : rule?.selectorText;
      if (rule?.cssRules) {
        visitCssRules(rule.cssRules, visitor, view, layers, nextLayer, selector || parentSelector);
      }
      visitor(rule, nextLayer, selector);
    });
  }

  // Common selectors. Complex nesting/@scope are not a full browser cascade implementation.
  function selectorSpecificity(selector) {
    const text = selector.replace(/:where\([^)]*\)/g, '').replace(/\\./g, 'x');
    return [
      (text.match(/#[\w-]+/g) || []).length,
      (text.match(/\.[\w-]+|\[[^\]]+\]|(?<!:):[\w-]+/g) || []).length,
      (text.match(/(^|[\s>+~])\w+|::[\w-]+/g) || []).length,
    ];
  }

  function comparePriority(a, b) {
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) return a[i] > b[i];
    }
    return true; // Later declaration wins at equal priority.
  }

  function normalizeTokenValue(value, rootFontSize = 16) {
    const text = String(value || '').trim().toLowerCase().replace(/\s+/g, '');
    const length = text.match(/^(-?[\d.]+)(rem|px)$/);
    if (length) return `${Number(length[1]) * (length[2] === 'rem' ? rootFontSize : 1)}px`;
    const rgb = text.match(/^rgba?\((\d+),(\d+),(\d+)(?:,1)?\)$/);
    if (rgb) return `#${rgb.slice(1, 4).map(channel => Number(channel).toString(16).padStart(2, '0')).join('')}`;
    return text.replace(/^#([a-f\d])([a-f\d])([a-f\d])$/, '#$1$1$2$2$3$3');
  }

  function isRegisteredTokenReference(value, variables, readVariable, rootFontSize = 16) {
    const names = [...String(value || '').matchAll(/var\(\s*(--(?:\\.|[^\s,)])+)/g)]
      .map(match => match[1].replace(/\\([\da-f]{1,6})\s?|\\(.)/gi,
        (_, hex, char) => hex ? String.fromCodePoint(parseInt(hex, 16)) : char));
    return names.length > 0 && names.every(name => (
      Object.hasOwn(variables, name)
      && normalizeTokenValue(readVariable(name), rootFontSize) === normalizeTokenValue(variables[name], rootFontSize)
    ));
  }

  function splitCssValues(value) {
    return value.match(/(?:[^\s()]+|\((?:[^()]|\([^()]*\))*\))+/g) || [];
  }

  function getPropertyAliases(element, property, root) {
    if (/^(row|column)-gap$/.test(property)) return ['gap', property];
    const border = property.match(/^border-(top|right|bottom|left)-color$/);
    if (border) return ['border', `border-${border[1]}`, 'border-color', property];
    const match = property.match(/^(padding|margin)-(top|right|bottom|left)$/);
    if (!match) return [property];
    const [, kind, side] = match;
    const styles = root?.defaultView?.getComputedStyle?.(element);
    const vertical = /^(vertical|sideways)/.test(styles?.writingMode || '');
    const rtl = styles?.direction === 'rtl';
    const inlineStart = vertical ? (rtl ? 'bottom' : 'top') : (rtl ? 'right' : 'left');
    const inlineEnd = vertical ? (rtl ? 'top' : 'bottom') : (rtl ? 'left' : 'right');
    const blockStart = vertical ? (/-(lr)$/.test(styles?.writingMode) ? 'left' : 'right') : 'top';
    const axis = side === inlineStart || side === inlineEnd ? 'inline' : 'block';
    const edge = side === inlineStart || side === blockStart ? 'start' : 'end';
    return [kind, `${kind}-${axis}`, `${kind}-${axis}-${edge}`, property];
  }

  function getAuthoredStyleValue(element, properties, root = globalScope.document) {
    if (!element || !properties?.length) return '';
    // Prefer the specific longhand over an accompanying shorthand query.
    const physical = properties.find(property => /^(padding|margin)-(top|right|bottom|left)$/.test(property));
    const gap = properties.find(property => /^(row|column)-gap$/.test(property));
    const border = properties.find(property => /^border-(top|right|bottom|left)-color$/.test(property));
    const target = physical || gap || border;
    const query = target ? [target] : properties;
    const aliases = new Set(query.flatMap(property => getPropertyAliases(element, property, root)));
    let latestValue = '';
    let latestPriority = null;
    const layers = new Map();
    const readStyle = (style, specificity = [0, 0, 0], layer = '', inline = false) => {
      if (!style) return;
      const keys = typeof style.length === 'number' ? Array.from(style) : Object.keys(style);
      const ordered = keys.filter(key => aliases.has(key));
      // Plain style test doubles may expose only getPropertyValue.
      const declarations = ordered.length ? ordered : [...aliases];
      declarations.forEach(key => {
        let property = key;
        let value = readDeclarationValue(style, property).trim();
        // CSSOM expands shorthands into pending-substitution longhands whose
        // getPropertyValue is empty until var() resolves. Read their source.
        if (!value && physical) {
          const shorthand = /-(inline|block)-(start|end)$/.test(property)
            ? property.replace(/-(start|end)$/, '') : physical.split('-')[0];
          value = readDeclarationValue(style, shorthand).trim();
          property = shorthand;
        }
        if (!value && (gap || border)) {
          property = gap ? 'gap' : 'border-color';
          value = readDeclarationValue(style, property).trim();
        }
        if (!value) return;
        if ((gap && property === 'gap') || (border && property === 'border-color')) {
          const parts = splitCssValues(value);
          const index = gap ? (gap === 'row-gap' ? 0 : 1)
            : ['top', 'right', 'bottom', 'left'].indexOf(border.split('-')[1]);
          value = parts[index] || (index === 2 ? parts[0] : parts[1] || parts[0]);
        }
        if (physical && (property === physical.split('-')[0] || /-(inline|block)$/.test(property))) {
          const parts = splitCssValues(value);
          const side = physical.split('-')[1];
          const sideIndex = ['top', 'right', 'bottom', 'left'].indexOf(side);
          if (property === physical.split('-')[0]) {
            value = parts[sideIndex] || (sideIndex === 2 ? parts[0] : parts[1] || parts[0]);
          } else {
            const edge = getPropertyAliases(element, physical, root)[2];
            value = parts[edge.endsWith('-end') ? 1 : 0] || parts[0];
          }
        }
        const important = style.getPropertyPriority?.(key) === 'important';
        const layerRank = layer ? layers.get(layer) : Number.MAX_SAFE_INTEGER;
        const priority = [Number(important), Number(inline), important ? -layerRank : layerRank, ...specificity];
        if (!latestPriority || comparePriority(priority, latestPriority)) {
          latestValue = value;
          latestPriority = priority;
        }
      });
    };

    Array.from(root?.styleSheets || []).forEach((sheet) => {
      if (sheet.disabled) return;
      if (sheet.media?.mediaText && root?.defaultView?.matchMedia
        && !root.defaultView.matchMedia(sheet.media.mediaText).matches) return;
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        return;
      }

      visitCssRules(rules, (rule, layer, selector) => {
        if (!rule?.style || !canMatchSelector(element, selector)) return;
        const matching = selector.split(',').filter(selector => canMatchSelector(element, selector));
        const specificity = matching.map(selectorSpecificity).sort((a, b) => {
          for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return b[i] - a[i];
          return 0;
        })[0] || [0, 0, 0];
        readStyle(rule.style, specificity, layer);
      }, root?.defaultView || globalScope, layers);
    });

    readStyle(element.style, [0, 0, 0], '', true);
    if (properties.length === 1 && properties[0] === 'color'
      && (!latestValue || latestValue === 'inherit' || latestValue === 'unset') && element.parentElement) {
      return getAuthoredStyleValue(element.parentElement, properties, root);
    }
    return latestValue;
  }

  function hasAuthoredTokenReference(element, properties, root = globalScope.document, registry = null) {
    const latestValue = getAuthoredStyleValue(element, properties, root);
    if (!registry) return isCssVariableReference(latestValue);
    const styles = root?.defaultView?.getComputedStyle?.(element);
    const rootFontSize = Number.parseFloat(root?.defaultView?.getComputedStyle?.(root.documentElement)?.fontSize) || 16;
    return isRegisteredTokenReference(latestValue, registry.variables || {},
      name => styles?.getPropertyValue(name) || '', rootFontSize);
  }

  const api = { hasAuthoredTokenReference, getAuthoredStyleValue, isCssVariableReference, isRegisteredTokenReference, normalizeTokenValue };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  globalScope.FDSStyleTokenDetection = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
