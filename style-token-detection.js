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

  function visitCssRules(rules, visitor, view = globalScope) {
    Array.from(rules || []).forEach((rule) => {
      if (rule?.media?.mediaText && view?.matchMedia
        && !view.matchMedia(rule.media.mediaText).matches) return;
      if (rule?.constructor?.name === 'CSSSupportsRule' && view?.CSS?.supports
        && !view.CSS.supports(rule.conditionText)) return;
      if (rule?.cssRules) {
        visitCssRules(rule.cssRules, visitor, view);
      }
      visitor(rule);
    });
  }

  function normalizeTokenValue(value) {
    const text = String(value || '').trim().toLowerCase().replace(/\s+/g, '');
    const rgb = text.match(/^rgba?\((\d+),(\d+),(\d+)(?:,1)?\)$/);
    if (rgb) return `#${rgb.slice(1, 4).map(channel => Number(channel).toString(16).padStart(2, '0')).join('')}`;
    return text.replace(/^#([a-f\d])([a-f\d])([a-f\d])$/, '#$1$1$2$2$3$3');
  }

  function isRegisteredTokenReference(value, variables, readVariable) {
    const names = [...String(value || '').matchAll(/var\(\s*(--[\w-]+)/g)].map(match => match[1]);
    return names.length > 0 && names.every(name => (
      Object.hasOwn(variables, name)
      && normalizeTokenValue(readVariable(name)) === normalizeTokenValue(variables[name])
    ));
  }

  function hasAuthoredTokenReference(element, properties, root = globalScope.document, registry = null) {
    if (!element || !properties?.length) return false;
    let latestValue = '';

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

      visitCssRules(rules, (rule) => {
        if (!rule?.style || !canMatchSelector(element, rule.selectorText)) return;
        properties.forEach((property) => {
          const value = readDeclarationValue(rule.style, property).trim();
          if (value) latestValue = value;
        });
      }, root?.defaultView || globalScope);
    });

    const inlineStyle = element.style;
    properties.forEach((property) => {
      const value = readDeclarationValue(inlineStyle, property).trim();
      if (value) latestValue = value;
    });

    if (!registry) return isCssVariableReference(latestValue);
    const styles = root?.defaultView?.getComputedStyle?.(element);
    return isRegisteredTokenReference(latestValue, registry.variables || {},
      name => styles?.getPropertyValue(name) || '');
  }

  const api = { hasAuthoredTokenReference, isCssVariableReference, isRegisteredTokenReference, normalizeTokenValue };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  globalScope.FDSStyleTokenDetection = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
