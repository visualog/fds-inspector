(function initContentRender(globalScope) {
  const fallbackEscapeHtml =
    globalScope.FDSHtmlUtils?.escapeHtml ||
    (typeof require === 'function' ? require('./html-utils.js').escapeHtml : null);

  function createContentRenderers({
    iconPaths,
    getUrl,
    escapeHtml = fallbackEscapeHtml,
  }) {
    function removeRenderingScopeFromText(text) {
      const value = String(text || '');
      const tokenIndex = value.indexOf(' · 현재 렌더링 기준');
      return tokenIndex >= 0 ? value.slice(0, tokenIndex) : value;
    }

    function renderAssetIcon(kind, alt) {
      const path = iconPaths[kind] || iconPaths.close;
      const src = path ? getUrl(path) : null;
      if (!src) {
        return '<span class="fds-icon-svg fds-icon-svg-fallback" aria-hidden="true"></span>';
      }

      if (kind === 'close') {
        return `<img class="fds-icon-svg" src="${escapeHtml(src)}" alt="" aria-hidden="true" />`;
      }

      return `<img class="fds-icon-svg" src="${escapeHtml(src)}" alt="${escapeHtml(alt || kind)}" />`;
    }

    function renderLucideStatusIcon(kind) {
      const iconMap = {
        'circle-alert': '<circle cx="12" cy="12" r="10"></circle><path d="M12 8v4"></path><path d="M12 16h.01"></path>',
        'triangle-alert': '<path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path>',
      };
      const paths = iconMap[kind];
      if (!paths) return '';
      return `<svg class="fds-icon-svg fds-icon-lucide" data-lucide="${escapeHtml(kind)}" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;
    }

    function renderStatusIcon(kind, alt) {
      return renderLucideStatusIcon(kind) || renderAssetIcon(kind, alt);
    }

    function renderLucideChevronIcon(kind) {
      const isDown = kind === 'chevron-down';
      const points = isDown ? 'm6 9 6 6 6-6' : 'm9 18 6-6-6-6';
      const label = isDown ? 'chevron-down' : 'chevron-right';
      return `<svg class="fds-group-caret-icon" data-lucide="${label}" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${points}"></path></svg>`;
    }

    function renderDivider(id) {
      return `<div id="${escapeHtml(id)}" class="fds-divider" aria-hidden="true"></div>`;
    }

    function renderToolbarStatus({ id, text, tone }) {
      const extraClass = tone === 'connected' ? ' fds-toolbar-status-connected' : '';
      return `<div id="${escapeHtml(id)}" class="fds-toolbar-status${extraClass}">${escapeHtml(text)}</div>`;
    }

    function renderToolbarButton(button) {
      if (!button) return '';
      const accessibleLabel = button.badgeLabel || button.ariaLabel || button.title || '';
      const tooltip = removeRenderingScopeFromText(button.tooltip || button.title || button.badgeLabel || '');
      const attrs = [
        `id="${escapeHtml(button.id)}"`,
        'class="fds-btn' + (button.extraClass ? ` ${button.extraClass}` : '') + (button.active ? ' active' : '') + (button.dot ? ' has-dot' : '') + '"',
        'type="button"',
        `aria-label="${escapeHtml(accessibleLabel)}"`,
        `data-tooltip="${escapeHtml(tooltip)}"`,
        `data-kind="${escapeHtml(button.kind)}"`,
      ];

      if (button.filter) attrs.push(`data-filter="${escapeHtml(button.filter)}"`);
      if (button.active) attrs.push('data-state="active"');
      if (button.badgeMarker) attrs.push('data-badge="•"');
      if (button.badgeCount) attrs.push(`data-badge-count="${escapeHtml(button.badgeCount)}"`);
      if (button.badgeFullCount) attrs.push(`data-badge-full-count="${escapeHtml(button.badgeFullCount)}"`);
      if (button.badgeCountVisible) attrs.push('data-badge-visible="true"');
      if (button.refreshNeeded) attrs.push('data-refresh-needed="true"');

      return `<button ${attrs.join(' ')}><span class="fds-icon-slot">${renderAssetIcon(button.kind, button.title || button.kind)}</span></button>`;
    }

    function renderToolbarModelItem(item, model) {
      if (item.type === 'static') {
        const moveTooltip = '툴바 이동';
        return `<button id="${escapeHtml(item.id)}" class="fds-btn-static fds-btn-move" type="button" data-tooltip="${escapeHtml(moveTooltip)}" data-kind="${escapeHtml(item.kind)}"><span class="fds-icon-slot">${renderAssetIcon(item.kind, item.kind)}</span></button>`;
      }

      if (item.type === 'divider') return renderDivider(item.id);
      if (item.type === 'status') return renderToolbarStatus(item);

      if (item.type === 'group') {
        return `<div id="${escapeHtml(item.id)}" class="fds-btn-group">${item.refs.map((ref) => renderToolbarButton(model.buttons[ref])).join('')}</div>`;
      }

      if (item.type === 'button') {
        return renderToolbarButton(model.buttons[item.ref]);
      }

      return '';
    }

    function renderToolbarMarkup(model) {
      return model.items.map((item) => renderToolbarModelItem(item, model)).join('');
    }

    function getViolationToneFromSuffix(suffix, fallback = 'warning') {
      return suffix === '미등록' ? 'danger' : fallback;
    }

    function parseViolationItem(item) {
      const text = String(item || '');
      const patterns = [
        { regex: /^배경색\s+(.+?)\s+\((미등록)\)$/, chip: '배경색', tone: 'danger', valueLabel: '값' },
        { regex: /^배경색\s+(.+?)\s+\((원시값 직접 사용)\)$/, chip: '배경색', tone: 'warning', valueLabel: '값' },
        { regex: /^글자색\s+(.+?)\s+\((미등록)\)$/, chip: '글자색', tone: 'danger', valueLabel: '값' },
        { regex: /^글자색\s+(.+?)\s+\((원시값 직접 사용)\)$/, chip: '글자색', tone: 'warning', valueLabel: '값' },
        { regex: /^보더색\s+(.+?)\s+\((미등록)\)$/, chip: '보더색', tone: 'danger', valueLabel: '값' },
        { regex: /^보더색\s+(.+?)\s+\((원시값 직접 사용)\)$/, chip: '보더색', tone: 'warning', valueLabel: '값' },
        { regex: /^서체\s+'(.+?)'\s+\((.+?)\)$/, chip: '서체', tone: 'success', valueLabel: '글꼴' },
        { regex: /^패딩\s+(.+?)\s+\((.+?)\)$/, chip: '패딩', tone: 'warning', valueLabel: '크기' },
        { regex: /^(상단|오른쪽|하단|왼쪽) 패딩\s+(.+?)\s+\((.+?)\)$/, chip: (_, side) => `${side} 패딩`, tone: 'warning', valueLabel: '크기' },
        { regex: /^마진\s+(.+?)\s+\((.+?)\)$/, chip: '마진', tone: 'warning', valueLabel: '크기' },
        { regex: /^(상단|오른쪽|하단|왼쪽) 마진\s+(.+?)\s+\((.+?)\)$/, chip: (_, side) => `${side} 마진`, tone: 'warning', valueLabel: '크기' },
        { regex: /^갭\s+(.+?)\s+\((.+?)\)$/, chip: '갭', tone: 'warning', valueLabel: '크기' },
        { regex: /^(행|열) 갭\s+(.+?)\s+\((.+?)\)$/, chip: (_, axis) => `${axis} 갭`, tone: 'warning', valueLabel: '크기' },
        { regex: /^라운드\s+(.+?)\s+\((.+?)\)$/, chip: '라운드', tone: 'warning', valueLabel: '크기' },
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern.regex);
        if (match) {
          const chip = typeof pattern.chip === 'function' ? pattern.chip(...match) : pattern.chip;
          const valueIndex = typeof pattern.chip === 'function' ? 2 : 1;
          const tagIndex = typeof pattern.chip === 'function' ? 3 : 2;
          const suffix = match[tagIndex];
          return {
            chip,
            tone: getViolationToneFromSuffix(suffix, pattern.tone),
            value: match[valueIndex],
            suffix,
            tag: suffix,
            valueLabel: pattern.valueLabel,
          };
        }
      }

      return {
        chip: '위반',
        tone: 'danger',
        value: text,
        suffix: '',
        tag: '위반',
        valueLabel: '내용',
      };
    }

    function getIssueElementLabel(item) {
      if (typeof item === 'object' && typeof item?.elementLabel === 'string' && item.elementLabel.trim()) {
        return item.elementLabel;
      }
      const element = typeof item === 'object' ? item?.element : null;
      const tagName = element?.tagName?.toLowerCase?.() || 'element';
      const idPart = element?.id ? `#${element.id}` : '';
      const classPart = typeof element?.className === 'string' && element.className.trim()
        ? `.${element.className.trim().split(/\s+/).slice(0, 1).join('.')}`
        : '';
      return `${tagName}${idPart}${classPart}`;
    }

    function formatDisplayCount(value) {
      const numericValue = Number(value);
      if (Number.isFinite(numericValue) && String(value).trim?.() !== '') {
        return numericValue.toLocaleString('ko-KR');
      }
      return value === null || value === undefined ? '' : String(value);
    }

    function formatCompactCount(value) {
      const numericValue = Number(value || 0);
      if (!Number.isFinite(numericValue)) return '0';
      if (numericValue < 1000) return String(numericValue);
      if (numericValue < 10000) return `${Math.floor(numericValue / 1000)}천+`;
      if (numericValue < 100000000) return `${Math.floor(numericValue / 10000)}만+`;
      return '1억+';
    }

    function renderSummaryMetricCard({ tone, label, value, caption = '', icon = '', isToggle = false, isActive = false }) {
      const tagName = isToggle ? 'button' : 'article';
      const typeAttr = isToggle ? ' type="button"' : '';
      const dataAttr = isToggle ? ` data-summary-tone="${escapeHtml(tone)}"` : '';
      const pressedAttr = isToggle ? ` aria-pressed="${isActive ? 'true' : 'false'}"` : '';
      const displayValue = formatDisplayCount(value);
      const captionText = String(caption || '');
      const ariaLabel = captionText ? `${label}: ${displayValue}, ${captionText}` : `${label}: ${displayValue}`;
      const resolvedIcon = icon || (tone === 'danger' ? 'triangle-alert' : tone === 'warning' ? 'circle-alert' : 'warning');
      return `
    <${tagName}${typeAttr}${dataAttr}${pressedAttr} class="fds-stat-box ${tone}${isToggle ? ' is-toggle' : ''}${isActive ? ' is-active' : ''}" aria-label="${escapeHtml(ariaLabel)}">
      <div class="fds-stat-topline" aria-hidden="true">
        <span class="fds-stat-icon">${renderStatusIcon(resolvedIcon, resolvedIcon)}</span>
        <span class="fds-stat-heading">${escapeHtml(label)}</span>
      </div>
      <div class="fds-stat-num">${escapeHtml(displayValue)}</div>
      ${captionText ? `<div class="fds-stat-caption">${escapeHtml(captionText)}</div>` : ''}
    </${tagName}>
  `;
    }

    function formatTokenContextLabel({
      sourceName,
      pageName = '',
      colorCount = 0,
      spacingCount = 0,
      radiusCount = 0,
      fallbackLabel = '토큰 기준',
    }) {
      const normalizedSourceName = sourceName || fallbackLabel;
      const normalizedPageName = pageName ? ` · ${pageName}` : '';
      const hasTokenCounts = Number(colorCount) || Number(spacingCount) || Number(radiusCount);
      const tokenSummary = hasTokenCounts
        ? `기준 컬러 토큰 ${Number(colorCount || 0)}개 · 간격 토큰 ${Number(spacingCount || 0)}개 · 라운드 토큰 ${Number(radiusCount || 0)}개`
        : fallbackLabel;
      return `${normalizedSourceName}${normalizedPageName} · ${tokenSummary}`;
    }

    function createSummaryMetricCards({
      hasViolations,
      missingColorCount = 0,
      primitiveColorCount = 0,
      missingColorPatternCount = 0,
      primitiveColorPatternCount = 0,
      activeSummaryTone = 'danger',
      hasSourceReview = false,
      assessmentMode = false,
      recommendationCount = 0,
      reviewCount = 0,
    }) {
      if (!hasViolations) {
        return [{
          tone: 'success',
          label: '위반 없음',
          value: '0',
          caption: '검사 완료',
          icon: 'success',
        }];
      }

      return [
        {
          tone: 'danger',
          label: assessmentMode ? 'FDS 불일치 후보' : '미등록',
          value: missingColorPatternCount,
          caption: `영향 ${formatDisplayCount(missingColorCount)}개 요소`,
          icon: 'triangle-alert',
          isToggle: true,
          isActive: activeSummaryTone === 'danger',
        },
        {
          tone: 'warning',
          label: assessmentMode ? '권장·확인 사항' : hasSourceReview ? '토큰 검토' : '원시값',
          value: primitiveColorPatternCount,
          caption: assessmentMode
            ? `전환 권장 ${formatDisplayCount(recommendationCount)}건 · 확인 필요 ${formatDisplayCount(reviewCount)}건`
            : `영향 ${formatDisplayCount(primitiveColorCount)}개 요소`,
          icon: 'circle-alert',
          isToggle: true,
          isActive: activeSummaryTone === 'warning',
        },
      ];
    }

    function renderSummaryEmptyState({
      isIdle = false,
      activeFilterLabel = '현재 검사',
    } = {}) {
      const message = isIdle
        ? '툴바에서 컬러, 폰트, 간격, 라운드 중 하나를 선택하면 검사 결과가 여기에 표시됩니다.'
        : `${activeFilterLabel} 위반 항목이 없습니다.`;

      return `<div class="fds-list-empty" role="note">${escapeHtml(message)}</div>`;
    }

    function renderSummaryTabBar({
      activeFilter,
      colorTabs = [],
      activeSummarySubtab = 'bg',
    }) {
      if (activeFilter !== 'color') {
        return '';
      }

      const activeTabCount = colorTabs.length;
      const activeTabIndex = Math.max(0, colorTabs.findIndex((tab) => tab.key === activeSummarySubtab));
      const hasActiveTab = colorTabs.some((tab) => tab.key === activeSummarySubtab);
      const fullLabels = {
        bg: '배경색',
        border: '보더색',
        text: '글자색',
      };
      const tabMarkup = colorTabs.map((tab) => {
        const count = Number(tab.count || 0);
        const fullCountLabel = `${fullLabels[tab.key] || tab.label} ${formatDisplayCount(count)}개 요소`;
        return `
        <button
          class="fds-summary-tab${activeSummarySubtab === tab.key ? ' active' : ''}${count > 0 ? ' has-value' : ''}"
          type="button"
          data-summary-tab="${escapeHtml(tab.key)}"
          aria-label="${escapeHtml(fullCountLabel)}"
          title="${escapeHtml(fullCountLabel)}"
        >
          <span>${escapeHtml(tab.label)}</span>
        </button>
      `;
      }).join('');

      return `
      <div
        class="fds-summary-tabbar"
        style="--fds-summary-tab-count:${activeTabCount};--fds-summary-tab-index:${activeTabIndex};--fds-summary-tab-indicator-opacity:${hasActiveTab ? 1 : 0};"
      >
        <span class="fds-summary-tab-indicator" aria-hidden="true"></span>
        ${tabMarkup}
      </div>
      `;
    }

    function renderSummaryListItem(item) {
      const message = typeof item === 'string' ? item : item?.message;
      const parsed = parseViolationItem(message);
      const tone = typeof item === 'object' && item?.tone ? item.tone : parsed.tone;
      const issueKey = typeof item === 'object' && item?.key ? item.key : '';
      const issueKeys = Array.isArray(item?.issueKeys) && item.issueKeys.length ? item.issueKeys : issueKey ? [issueKey] : [];
      const badgeLabel = parsed.tag || parsed.chip;
      const elementLabel = getIssueElementLabel(item);
      const elementCount = Number(typeof item === 'object' ? item?.elementCount : 0);
      const countSuffix = elementCount > 1 ? ` · ${formatDisplayCount(elementCount)}개 요소` : '';
      const displayElementLabel = `${elementLabel}${countSuffix}`;
      const itemLabel = `${displayElementLabel}, ${parsed.chip} ${badgeLabel}, ${parsed.value}. 클릭하면 대표 요소로 이동합니다.`;
      const tooltipLabel = '요소로 이동';
      const hasNote = Boolean(typeof item === 'object' && item?.hasNote);
      return `
    <button class="fds-list-item ${tone}${hasNote ? ' has-note' : ''}" type="button" role="listitem" data-issue-key="${escapeHtml(issueKey)}" data-issue-keys="${escapeHtml(JSON.stringify(issueKeys))}" data-tooltip="${escapeHtml(tooltipLabel)}" aria-label="${escapeHtml(itemLabel)}">
      <span class="fds-list-label">
        <span class="fds-list-label-icon" aria-hidden="true">${renderStatusIcon(tone === 'warning' ? 'circle-alert' : 'triangle-alert', tone)}</span>
        <span class="fds-list-label-text">
          <span class="fds-list-element">${escapeHtml(displayElementLabel)}</span>
          ${hasNote ? '<span class="fds-list-note-badge">메모</span>' : ''}
        </span>
      </span>
    </button>
  `;
    }

    function renderSummaryGroupItem(group) {
      const tone = group?.tone || 'danger';
      const expanded = Boolean(group?.expanded);
      const count = Number(group?.count || 0);
      const chip = group?.chip || '위반';
      const tag = group?.tag || '위반';
      const value = group?.value || '';
      const groupKey = group?.key || '';
      const countLabel = `${count}개 요소`;
      const displayCount = formatDisplayCount(count);
      const groupLabel = `${chip} ${value}, ${tag}, ${countLabel}. 클릭하면 상세 목록을 ${expanded ? '접습니다' : '펼칩니다'}.`;
      const tooltipLabel = expanded ? '목록 접기' : '목록 펼치기';

      return `
    <button id="fds-group-${escapeHtml(encodeURIComponent(groupKey))}" class="fds-list-group ${escapeHtml(tone)}${expanded ? ' is-expanded' : ''}" type="button" role="listitem" data-group-key="${escapeHtml(groupKey)}" aria-expanded="${expanded ? 'true' : 'false'}"${expanded ? ` aria-controls="fds-group-${escapeHtml(encodeURIComponent(groupKey))}-details"` : ''} data-tooltip="${escapeHtml(tooltipLabel)}" aria-label="${escapeHtml(groupLabel)}">
      <span class="fds-group-caret" aria-hidden="true">${renderLucideChevronIcon(expanded ? 'chevron-down' : 'chevron-right')}</span>
      <span class="fds-group-value"><span class="fds-group-heading"><span class="fds-group-chip">${escapeHtml(chip)}</span><span class="fds-group-number">${escapeHtml(value)}</span></span>${group?.entries?.some(entry => entry.metadata?.assessment) ? `<span class="fds-group-status">${escapeHtml(tag)}</span>` : ''}</span>
      <span class="fds-group-count" aria-label="${escapeHtml(countLabel)}">${escapeHtml(displayCount)}</span>
    </button>
  `;
    }

    function renderSummaryIssueGroup(group, detailEntries = []) {
      const headerId = `fds-group-${encodeURIComponent(group?.key || '')}`;
      return `<div class="fds-issue-group${group?.expanded ? ' is-expanded' : ''}">
        ${renderSummaryGroupItem(group)}
        ${group?.expanded ? `<div id="${escapeHtml(headerId)}-details" class="fds-list-group-details" role="group" aria-labelledby="${escapeHtml(headerId)}">${detailEntries.map(renderSummaryListItem).join('')}</div>` : ''}
      </div>`;
    }

    function renderAssessmentGuide() {
      return `<details class="fds-assessment-guide">
        <summary>검사 결과 안내</summary>
        <div class="fds-assessment-guide-body">
          <p><strong>토큰 전환 권장</strong><br>FDS에 있는 값을 직접 지정한 것으로 확인됨.</p>
          <p><strong>출처 확인 필요</strong><br>변수·계산식 등의 적용 방식을 아직 확정하지 못함.</p>
          <p>확인 필요는 바로 토큰으로 바꾸라는 뜻은 아닙니다. 적용된 CSS를 먼저 확인하세요. 유동 레이아웃은 고정 토큰으로 일괄 전환하지 마세요.</p>
        </div>
      </details>`;
    }

    return {
      renderAssetIcon,
      renderDivider,
      renderToolbarMarkup,
      parseViolationItem,
      getIssueElementLabel,
      formatTokenContextLabel,
      createSummaryMetricCards,
      renderSummaryEmptyState,
      renderSummaryTabBar,
      renderSummaryMetricCard,
      renderSummaryGroupItem,
      renderSummaryIssueGroup,
      renderAssessmentGuide,
      renderSummaryListItem,
    };
  }

  const api = { createContentRenderers };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  globalScope.FDSContentRender = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
