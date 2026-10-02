(function initContentInspection(globalScope) {
  function createContentInspector({
    getActiveInspectorSpecs,
    getKnownColorTokens,
    hasAuthoredTokenReference,
    getAuthoredStyleValue = () => '',
    hasDirectTextContent,
    rgbToHex,
  }) {
    function formatKnownTokenList(tokens) {
      return Array.isArray(tokens) && tokens.length ? `: ${tokens.slice(0, 3).join(', ')}` : '';
    }

    function getSpacingTokens(specs, pxValue) {
      const tokenMap = specs?.spacingTokens || {};
      return tokenMap[pxValue] || tokenMap[String(pxValue)] || [];
    }

    function getRadiusTokens(specs, radius) {
      const tokenMap = specs?.radiusTokens || {};
      const directTokens = tokenMap[radius] || [];
      if (directTokens.length) return directTokens;

      const numericRadius = Number.parseFloat(radius);
      if (Number.isFinite(numericRadius) && numericRadius >= 999) {
        return tokenMap['9999px'] || [];
      }

      return [];
    }

    function getColorPartFromTokenName(token) {
      const parts = String(token || '')
        .toLowerCase()
        .split(/[./_\-\s]+/)
        .filter(Boolean);
      if (parts.includes('text') || parts.includes('foreground') || parts.includes('content')) return 'text';
      if (parts.includes('border') || parts.includes('stroke') || parts.includes('outline')) return 'border';
      if (parts.includes('bg') || parts.includes('background') || parts.includes('surface')) return 'bg';
      return null;
    }

    function getKnownColorTokensForPart(value, colorPart) {
      return getKnownColorTokens(value).filter((token) => {
        const tokenPart = getColorPartFromTokenName(token);
        return tokenPart === null || tokenPart === colorPart;
      });
    }

    function getPxValue(value) {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    function addSpacingIssue({ issues, issueDetails, activeSpecs, label, value, metadata }) {
      if (value <= 0) return;
      const tokens = getSpacingTokens(activeSpecs, value);
      if (tokens.length) {
        issues.push(`${label} ${value}px (원시값 직접 사용${formatKnownTokenList(tokens)})`);
        issueDetails.push(metadata);
      } else if (!activeSpecs.spacing.includes(value)) {
        issues.push(`${label} ${value}px (미등록)`);
        issueDetails.push(metadata);
      }
    }

    function inspectBoxSpacing({ issues, issueDetails, activeSpecs, styles, element, kind, sides }) {
      const values = sides.map((side) => {
        const authored = getAuthoredStyleValue(element, [side.cssProp, kind]) || '';
        return { ...side, authored,
          value: kind === 'margin' && authored.trim().toLowerCase() === 'auto'
            ? 0 : getPxValue(styles[side.styleKey]) };
      });
      const positiveValues = values.filter((item) => item.value > 0);
      if (!positiveValues.length) return;

      const allSidesEqual = values.every((item) => item.value === values[0].value && item.authored === values[0].authored);
      const tokenizedSides = values.map(item => hasAuthoredTokenReference(element, [item.cssProp, kind]));
      if (allSidesEqual && tokenizedSides.every(value => !value)) {
        const tokenProps = [kind, ...sides.map((side) => side.cssProp)];
        if (!hasAuthoredTokenReference(element, tokenProps)) {
          addSpacingIssue({
            issues,
            issueDetails,
            activeSpecs,
            label: kind === 'padding' ? '패딩' : '마진',
            value: values[0].value,
            metadata: { spacing: { kind, sides: ['top', 'right', 'bottom', 'left'], value: values[0].value, ...(values[0].authored ? { authored: values[0].authored } : {}) } },
          });
        }
        return;
      }

      values.forEach((item) => {
        if (item.value <= 0) return;
        if (hasAuthoredTokenReference(element, [item.cssProp, kind])) return;
        addSpacingIssue({
          issues,
          issueDetails,
          activeSpecs,
          label: `${item.label} ${kind === 'padding' ? '패딩' : '마진'}`,
          value: item.value,
          metadata: { spacing: { kind, sides: [item.side], value: item.value, ...(item.authored ? { authored: item.authored } : {}) } },
        });
      });
    }

    function inspectGapSpacing({ issues, issueDetails, activeSpecs, styles, element }) {
      const gaps = [
        { label: '행 갭', cssProp: 'row-gap', styleKey: 'rowGap', axis: 'row' },
        { label: '열 갭', cssProp: 'column-gap', styleKey: 'columnGap', axis: 'column' },
      ].map((item) => ({
        ...item,
        authored: getAuthoredStyleValue(element, [item.cssProp, 'gap']) || '',
        value: getPxValue(styles[item.styleKey]),
      }));
      const positiveGaps = gaps.filter((item) => item.value > 0);
      if (!positiveGaps.length) return;

      const allGapsEqual = gaps.every((item) => item.value === gaps[0].value && item.authored === gaps[0].authored);
      const tokenizedGaps = gaps.map(item => hasAuthoredTokenReference(element, [item.cssProp, 'gap']));
      if (allGapsEqual && tokenizedGaps.every(value => !value)) {
        if (!hasAuthoredTokenReference(element, ['gap', 'row-gap', 'column-gap'])) {
          addSpacingIssue({
            issues,
            issueDetails,
            activeSpecs,
            label: '갭',
            value: gaps[0].value,
            metadata: { spacing: { kind: 'gap', sides: ['row', 'column'], value: gaps[0].value, ...(gaps[0].authored ? { authored: gaps[0].authored } : {}) } },
          });
        }
        return;
      }

      positiveGaps.forEach((item) => {
        if (hasAuthoredTokenReference(element, [item.cssProp, 'gap'])) return;
        addSpacingIssue({
          issues,
          issueDetails,
          activeSpecs,
          label: item.label,
          value: item.value,
          metadata: { spacing: { kind: 'gap', sides: [item.axis], value: item.value, ...(item.authored ? { authored: item.authored } : {}) } },
        });
      });
    }

    function getInspectionForFilter(filter, styles, element = null) {
      const issues = [];
      const issueDetails = [];
      const suggestions = [];
      const activeSpecs = getActiveInspectorSpecs();

      if (filter === 'color') {
        const bg = rgbToHex(styles.backgroundColor);
        const text = hasDirectTextContent(element) ? rgbToHex(styles.color) : null;
        const borderWidth = Number.parseFloat(styles.borderTopWidth || '0');
        const borderColor = rgbToHex(styles.borderTopColor);
        const bgUsesToken = hasAuthoredTokenReference(element, ['background-color', 'background']);
        const textUsesToken = hasAuthoredTokenReference(element, ['color']);
        const borderUsesToken = hasAuthoredTokenReference(element, [
          'border-color',
          'border-top-color',
          'border',
          'border-top',
        ]);

        if (bg && !bgUsesToken) {
          const tokens = getKnownColorTokensForPart(bg, 'bg');
          issues.push(tokens.length ? `배경색 ${bg} (원시값 직접 사용)` : `배경색 ${bg} (미등록)`);
        }

        if (text && !textUsesToken) {
          const tokens = getKnownColorTokensForPart(text, 'text');
          issues.push(tokens.length ? `글자색 ${text} (원시값 직접 사용)` : `글자색 ${text} (미등록)`);
        }

        if (borderWidth > 0 && borderColor && !borderUsesToken) {
          const tokens = getKnownColorTokensForPart(borderColor, 'border');
          issues.push(tokens.length ? `보더색 ${borderColor} (원시값 직접 사용)` : `보더색 ${borderColor} (미등록)`);
        }
      } else if (filter === 'font') {
        if (!hasDirectTextContent(element)) return { issues, issueDetails, suggestions };
        const font = styles.fontFamily.split(',')[0].replace(/"/g, '');
        if (!activeSpecs.fonts.some((item) => font.includes(item))) {
          issues.push(`서체 '${font}' (차단)`);
        }
      } else if (filter === 'spacing') {
        const boxSides = [
          { label: '상단', side: 'top', cssProp: 'padding-top', styleKey: 'paddingTop' },
          { label: '오른쪽', side: 'right', cssProp: 'padding-right', styleKey: 'paddingRight' },
          { label: '하단', side: 'bottom', cssProp: 'padding-bottom', styleKey: 'paddingBottom' },
          { label: '왼쪽', side: 'left', cssProp: 'padding-left', styleKey: 'paddingLeft' },
        ];
        inspectBoxSpacing({ issues, issueDetails, activeSpecs, styles, element, kind: 'padding', sides: boxSides });
        inspectBoxSpacing({
          issues,
          issueDetails,
          activeSpecs,
          styles,
          element,
          kind: 'margin',
          sides: boxSides.map((side) => ({
            ...side,
            cssProp: side.cssProp.replace('padding', 'margin'),
            styleKey: side.styleKey.replace('padding', 'margin'),
          })),
        });
        inspectGapSpacing({ issues, issueDetails, activeSpecs, styles, element });
      } else if (filter === 'radius') {
        const radius = styles.borderRadius;
        const radiusUsesToken = hasAuthoredTokenReference(element, ['border-radius']);
        if (radius !== '0px' && !radiusUsesToken) {
          const tokens = getRadiusTokens(activeSpecs, radius);
          const source = getAuthoredStyleValue(element, ['border-radius']);
          if (/\bvar\(/.test(source)) {
            issues.push(`라운드 ${radius} (변수 출처 확인 필요: ${source})`);
            issueDetails.push({ source: { status: 'review', authored: source, computed: radius } });
          } else if (tokens.length) {
            issues.push(`라운드 ${radius} (원시값 직접 사용${formatKnownTokenList(tokens)})`);
          } else if (!activeSpecs.radius.includes(radius)) {
            issues.push(`라운드 ${radius} (미준수)`);
          }
        }
      }

      // Keep the value check separate from evidence about how it was authored.
      // Neither a class name nor a matching value establishes package ownership.
      const assessedDetails = issues.map((message, index) => {
        const detail = issueDetails[index] || {};
        const spacing = detail.spacing;
        const props = spacing
          ? spacing.kind === 'gap'
            ? spacing.sides.map(side => `${side}-gap`).concat('gap')
            : spacing.sides.map(side => `${spacing.kind}-${side}`).concat(spacing.kind)
          : message.startsWith('배경색') ? ['background-color', 'background']
            : message.startsWith('글자색') ? ['color']
              : message.startsWith('보더색') ? ['border-top-color', 'border-color', 'border-top', 'border']
                : filter === 'font' ? ['font-family'] : ['border-radius'];
        const authored = spacing?.authored ?? (getAuthoredStyleValue(element, props) || '');
        const aligned = message.includes('원시값 직접 사용');
        const fluid = Boolean(spacing && (/%|\b(?:calc|min|max|clamp|env)\(/i.test(authored)
          || /[\d.](?:[dls]?v[whib]|vmin|vmax|cq[whib]|cqmin|cqmax)\b/i.test(authored)));
        const uncertain = !authored || fluid || /\b(?:var|calc|env)\(/.test(authored)
          || /^(?:inherit|initial|unset|revert|revert-layer)$/i.test(authored.trim());
        const reason = fluid ? 'fluid-layout' : !authored ? 'declaration-unavailable'
          : uncertain ? 'expression-unresolved' : null;
        const status = uncertain ? 'review' : aligned ? 'recommendation' : 'mismatch';
        return { ...detail, assessment: {
          status,
          value: fluid ? 'unknown' : aligned ? 'aligned' : message.includes('출처 확인 필요') ? 'unknown' : 'outside',
          usage: !authored ? 'unknown' : /\bvar\(/.test(authored) ? 'variable' : uncertain ? 'expression' : 'literal',
          origin: 'unknown',
          authored,
          ...(reason ? { reason } : {}),
        } };
      });
      return { issues, issueDetails: assessedDetails, suggestions };
    }

    return { getInspectionForFilter };
  }

  const api = { createContentInspector };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  globalScope.FDSContentInspection = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
