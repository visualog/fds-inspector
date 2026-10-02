(function initToolbarState(globalScope) {
  const TOOLBAR_MODES = Object.freeze({
    DEFAULT: 'connected-default',
    CONNECTED_MESSAGE: 'connected-message',
    DISCONNECTED_MESSAGE: 'disconnected-message',
    COMPACT: 'disconnected-compact',
    SINGLE_BUTTON: 'single-button',
  });

  const FILTER_KEYS = Object.freeze(['color', 'font', 'spacing', 'radius']);
  const DEFAULT_FILTER = null;

  const BUTTON_META = Object.freeze({
    color: { id: 'fds-btn-color', kind: 'color', title: '컬러 검사', filter: 'color' },
    font: { id: 'fds-btn-font', kind: 'font', title: '폰트 검사', filter: 'font' },
    spacing: { id: 'fds-btn-spacing', kind: 'spacing', title: '간격 검사', filter: 'spacing' },
    radius: { id: 'fds-btn-radius', kind: 'radius', title: '라운드 검사', filter: 'radius' },
    refresh: { id: 'fds-btn-refresh', kind: 'refresh', title: '새로고침' },
    close: { id: 'fds-btn-close', kind: 'close', title: '닫기', extraClass: 'fds-btn-close' },
  });

  const FILTER_MATCHERS = Object.freeze({
    color: (item) => item.includes('색'),
    font: (item) => item.includes('서체'),
    spacing: (item) => item.includes('패딩'),
    radius: (item) => item.includes('라운드'),
  });

  const BUTTON_STATE_FACTORIES = Object.freeze({
    color: ({ activeFilter, hoveredFilter, counts, scanScopeText }) => buildViolationButtonState({
      key: 'color',
      activeFilter,
      hoveredFilter,
      count: counts.color,
      indicator: 'badge',
      scanScopeText,
    }),
    font: ({ activeFilter, hoveredFilter, counts, scanScopeText }) => buildViolationButtonState({
      key: 'font',
      activeFilter,
      hoveredFilter,
      count: counts.font,
      indicator: 'badge',
      scanScopeText,
    }),
    spacing: ({ activeFilter, hoveredFilter, counts, scanScopeText }) => buildViolationButtonState({
      key: 'spacing',
      activeFilter,
      hoveredFilter,
      count: counts.spacing,
      indicator: 'badge',
      scanScopeText,
    }),
    radius: ({ activeFilter, hoveredFilter, counts, scanScopeText }) => buildViolationButtonState({
      key: 'radius',
      activeFilter,
      hoveredFilter,
      count: counts.radius,
      indicator: 'badge',
      scanScopeText,
    }),
    refresh: ({ isFigmaConnected, hasViolations }) => ({
      active: false,
      hovered: false,
      badge: '',
      badgeCount: '',
      badgeCountVisible: false,
      badgeMarker: false,
      dot: false,
      refreshNeeded: Boolean(hasViolations),
      violationCount: 0,
    }),
    close: () => ({
      active: false,
      hovered: false,
      badge: '',
      badgeCount: '',
      badgeCountVisible: false,
      badgeMarker: false,
      dot: false,
      refreshNeeded: false,
      violationCount: 0,
    }),
  });

  const TOOLBAR_SPEC = Object.freeze({
    geometry: Object.freeze({
      padding: 8,
      itemSpacing: 16,
      buttonSize: 32,
      dividerHeight: 19,
      collapsedWidth: 48,
    }),
    variants: Object.freeze({
      [TOOLBAR_MODES.DISCONNECTED_MESSAGE]: Object.freeze({
        width: 401,
        statusWidth: 257,
        items: Object.freeze([
          { type: 'static', id: 'fds-btn-move', kind: 'move' },
          { type: 'divider', id: 'fds-divider-a' },
          { type: 'status', id: 'fds-toolbar-status', text: '피그마에서 FDS xbridge를 실행하세요.', tone: 'default' },
          { type: 'divider', id: 'fds-divider-d' },
          { type: 'button', ref: 'close' },
        ]),
      }),
      [TOOLBAR_MODES.CONNECTED_MESSAGE]: Object.freeze({
        width: 310,
        statusWidth: 166,
        items: Object.freeze([
          { type: 'static', id: 'fds-btn-move', kind: 'move' },
          { type: 'divider', id: 'fds-divider-a' },
          { type: 'status', id: 'fds-toolbar-status', text: 'FDS xbridge와 연결되었습니다.', tone: 'connected' },
          { type: 'divider', id: 'fds-divider-d' },
          { type: 'button', ref: 'close' },
        ]),
      }),
      [TOOLBAR_MODES.DEFAULT]: Object.freeze({
        width: 336,
        items: Object.freeze([
          { type: 'static', id: 'fds-btn-move', kind: 'move' },
          { type: 'divider', id: 'fds-divider-a' },
          { type: 'button', ref: 'color' },
          { type: 'button', ref: 'font' },
          { type: 'button', ref: 'spacing' },
          { type: 'button', ref: 'radius' },
          { type: 'divider', id: 'fds-divider-d' },
          { type: 'button', ref: 'close' },
        ]),
      }),
      [TOOLBAR_MODES.COMPACT]: Object.freeze({
        width: 96,
        items: Object.freeze([
          { type: 'static', id: 'fds-btn-plug', kind: 'plug' },
          { type: 'button', ref: 'close' },
        ]),
      }),
      [TOOLBAR_MODES.SINGLE_BUTTON]: Object.freeze({
        width: 48,
        items: Object.freeze([
          { type: 'button', ref: 'font' },
        ]),
      }),
    }),
  });

  const VARIANT_LAYOUTS = TOOLBAR_SPEC.variants;

  const VARIANT_STATUS_WIDTHS = Object.freeze({
    [TOOLBAR_MODES.DISCONNECTED_MESSAGE]: TOOLBAR_SPEC.variants[TOOLBAR_MODES.DISCONNECTED_MESSAGE].statusWidth,
    [TOOLBAR_MODES.CONNECTED_MESSAGE]: TOOLBAR_SPEC.variants[TOOLBAR_MODES.CONNECTED_MESSAGE].statusWidth,
  });

  const FIGMA_STATUS_BY_FILTER = Object.freeze({
    color: 'color',
    font: 'font',
    spacing: 'contract',
    radius: 'contract',
  });

  function formatBadgeCount(count) {
    const numericCount = Number(count || 0);
    if (!Number.isFinite(numericCount) || numericCount <= 0) return '';
    return String(Math.trunc(numericCount));
  }

  function formatFullBadgeCount(count) {
    const numericCount = Number(count || 0);
    if (!Number.isFinite(numericCount) || numericCount <= 0) return '';
    return numericCount.toLocaleString('ko-KR');
  }

  function formatScanScopeText(scanData = {}) {
    const meta = scanData?.meta || {};
    const scanned = Number(meta.scannedElementCount || 0);
    const skipped = Number(meta.skippedElementCount || 0);
    if (!Number.isFinite(scanned) || !Number.isFinite(skipped) || scanned + skipped <= 0) {
      return '';
    }

    return `현재 렌더링 기준 · 검사됨 ${scanned.toLocaleString('ko-KR')}개 · 제외됨 ${skipped.toLocaleString('ko-KR')}개`;
  }

  function getViolationBadgeText({ count, hovered, active }) {
    if (count <= 0) return '';
    return hovered || active ? formatBadgeCount(count) : '•';
  }

  function buildViolationButtonState({ key, activeFilter, hoveredFilter, count, indicator, scanScopeText = '' }) {
    const active = activeFilter === key;
    const hovered = hoveredFilter === key;
    const isHighlighted = active || hovered;
    const badgeCount = formatBadgeCount(count);
    const badgeFullCount = formatFullBadgeCount(count);
    const badge = getViolationBadgeText({ count, hovered, active });
    const usesBadgeIndicator = indicator === 'badge';
    const badgeLabel = badgeFullCount
      ? [
        `${BUTTON_META[key]?.title || key} ${badgeFullCount}개 검토 대상 요소`,
        scanScopeText,
      ].filter(Boolean).join(' · ')
      : '';

    return {
      active,
      hovered,
      badge: usesBadgeIndicator ? badge : '',
      badgeCount,
      badgeFullCount,
      badgeLabel,
      badgeCountVisible: count > 0 && isHighlighted,
      badgeMarker: usesBadgeIndicator && count > 0,
      dot: indicator === 'dot' ? count > 0 : false,
      violationCount: count,
    };
  }

  function countViolationsByFilter(scanData, filter) {
    if (typeof scanData?.affectedElementCounts?.[filter] === 'number') {
      return scanData.affectedElementCounts[filter];
    }
    if (scanData?.counts && typeof scanData.counts[filter] === 'number') {
      return scanData.counts[filter];
    }
    const match = FILTER_MATCHERS[filter];
    if (!match) return 0;
    return new Set((scanData?.violations || []).filter(match)).size;
  }

  function normalizeActiveFilter(activeFilter) {
    if (activeFilter == null) return DEFAULT_FILTER;
    return FILTER_KEYS.includes(activeFilter) ? activeFilter : DEFAULT_FILTER;
  }

  function getNextActiveFilter(currentFilter, clickedFilter) {
    const normalizedClicked = normalizeActiveFilter(clickedFilter);
    if (normalizedClicked === DEFAULT_FILTER) return DEFAULT_FILTER;
    return normalizeActiveFilter(currentFilter) === normalizedClicked ? DEFAULT_FILTER : normalizedClicked;
  }

  function getViolationCounts(scanData) {
    return {
      color: countViolationsByFilter(scanData, 'color'),
      font: countViolationsByFilter(scanData, 'font'),
      spacing: countViolationsByFilter(scanData, 'spacing'),
      radius: countViolationsByFilter(scanData, 'radius'),
    };
  }

  function createButtonStateMap({
    activeFilter = DEFAULT_FILTER,
    hoveredFilter = DEFAULT_FILTER,
    isFigmaConnected = false,
    scanData = { violations: [], suggestions: [] },
  }) {
    const normalizedFilter = normalizeActiveFilter(activeFilter);
    const normalizedHoveredFilter = normalizeActiveFilter(hoveredFilter);
    const counts = getViolationCounts(scanData);
    const scanScopeText = formatScanScopeText(scanData);
    const hasViolations = (scanData?.violations || []).length > 0;
    const ctx = {
      activeFilter: normalizedFilter,
      hoveredFilter: normalizedHoveredFilter,
      counts,
      hasViolations,
      isFigmaConnected,
      scanData,
      scanScopeText,
    };

    return Object.keys(BUTTON_META).reduce((acc, key) => {
      const base = BUTTON_META[key];
      const deriveState = BUTTON_STATE_FACTORIES[key];
      acc[key] = {
        ...base,
        ...deriveState(ctx),
      };
      return acc;
    }, {});
  }

  function getToolbarVariantState({
    activeFilter = DEFAULT_FILTER,
    hoveredFilter = DEFAULT_FILTER,
    isFigmaConnected = false,
    scanData = { violations: [], suggestions: [] },
  }) {
    return createButtonStateMap({ activeFilter, hoveredFilter, isFigmaConnected, scanData });
  }

  function getToolbarLayout(mode = TOOLBAR_MODES.DEFAULT) {
    return VARIANT_LAYOUTS[mode] || VARIANT_LAYOUTS[TOOLBAR_MODES.DEFAULT];
  }

  function getToolbarStatusWidth(mode = TOOLBAR_MODES.DEFAULT) {
    return VARIANT_STATUS_WIDTHS[mode] || null;
  }

  function getPresentationMode(mode = TOOLBAR_MODES.DEFAULT, viewportWidth = Number.POSITIVE_INFINITY) {
    if (
      mode === TOOLBAR_MODES.DISCONNECTED_MESSAGE &&
      Number.isFinite(viewportWidth) &&
      viewportWidth < 440
    ) {
      return TOOLBAR_MODES.COMPACT;
    }

    return VARIANT_LAYOUTS[mode] ? mode : TOOLBAR_MODES.DEFAULT;
  }

  function getCollapsedToolbarItem(baseItems, activeFilter) {
    const normalizedFilter = normalizeActiveFilter(activeFilter);
    if (normalizedFilter && FILTER_KEYS.includes(normalizedFilter)) {
      return { type: 'button', ref: normalizedFilter };
    }

    const firstActionableButton = baseItems.find((item) => item.type === 'button' && FILTER_KEYS.includes(item.ref));
    if (firstActionableButton) return firstActionableButton;

    return baseItems[0] || null;
  }

  function getFigmaToolbarAxes({
    mode = TOOLBAR_MODES.DEFAULT,
    activeFilter = DEFAULT_FILTER,
    isFigmaConnected = false,
    scanData = { violations: [], suggestions: [] },
    hovered = false,
  } = {}) {
    const normalizedMode = VARIANT_LAYOUTS[mode] ? mode : TOOLBAR_MODES.DEFAULT;
    const normalizedFilter = normalizeActiveFilter(activeFilter);
    const counts = getViolationCounts(scanData);
    const totalViolations = Object.values(counts).reduce((sum, count) => sum + count, 0);
    const hasViolations = totalViolations > 0;

    if (normalizedMode === TOOLBAR_MODES.DISCONNECTED_MESSAGE) {
      return {
        status: 'message',
        error: 'True',
        success: 'True',
        active: 'False',
        hovered: 'False',
      };
    }

    if (normalizedMode === TOOLBAR_MODES.CONNECTED_MESSAGE) {
      return {
        status: 'message',
        error: 'False',
        success: 'True',
        active: 'False',
        hovered: 'False',
      };
    }

    if (normalizedMode === TOOLBAR_MODES.COMPACT) {
      return {
        status: 'default',
        error: 'True',
        success: 'True',
        active: 'False',
        hovered: 'False',
      };
    }

    if (normalizedFilter) {
      return {
        status: FIGMA_STATUS_BY_FILTER[normalizedFilter] || 'default',
        error: 'False',
        success: 'True',
        active: 'True',
        hovered: hovered ? 'True' : 'False',
      };
    }

    return {
      status: hasViolations ? 'default' : 'perfect',
      error: 'False',
      success: 'True',
      active: 'False',
      hovered: hovered ? 'True' : 'False',
    };
  }

  function createToolbarModel({
    mode = TOOLBAR_MODES.DEFAULT,
    activeFilter = DEFAULT_FILTER,
    hoveredFilter = DEFAULT_FILTER,
    isFigmaConnected = false,
    scanData = { violations: [], suggestions: [] },
    options = {},
  }) {
    const normalizedMode = VARIANT_LAYOUTS[mode] ? mode : TOOLBAR_MODES.DEFAULT;
    const buttons = createButtonStateMap({ activeFilter, hoveredFilter, isFigmaConnected, scanData });
    const baseLayout = getToolbarLayout(normalizedMode);
    const baseItems = baseLayout.items.map((item) => {
      if (item.type !== 'button' || normalizedMode !== TOOLBAR_MODES.SINGLE_BUTTON) return item;
      return { ...item, ref: options.singleButtonRef || item.ref };
    });
    const collapsed = Boolean(options.collapsed);
    const collapsedWidth = TOOLBAR_SPEC.geometry.collapsedWidth;
    const collapsedItem = collapsed ? getCollapsedToolbarItem(baseItems, activeFilter) : null;
    const items = collapsed && collapsedItem ? [collapsedItem] : baseItems;

    return {
      mode: normalizedMode,
      width: collapsed ? collapsedWidth : baseLayout.width,
      statusWidth: getToolbarStatusWidth(normalizedMode),
      buttons,
      items,
    };
  }

  function getNextToolbarMode({ isFigmaConnected, previousConnectionState, hasTokenSource = false }) {
    if (!isFigmaConnected && hasTokenSource) return TOOLBAR_MODES.DEFAULT;
    if (!isFigmaConnected) return TOOLBAR_MODES.DISCONNECTED_MESSAGE;
    if (previousConnectionState === false) return TOOLBAR_MODES.CONNECTED_MESSAGE;
    return TOOLBAR_MODES.DEFAULT;
  }

  const api = {
    BUTTON_META,
    DEFAULT_FILTER,
    FILTER_KEYS,
    TOOLBAR_SPEC,
    TOOLBAR_MODES,
    countViolationsByFilter,
    createButtonStateMap,
    createToolbarModel,
    getPresentationMode,
    getToolbarLayout,
    getToolbarStatusWidth,
    getToolbarVariantState,
    getNextToolbarMode,
    getNextActiveFilter,
    getFigmaToolbarAxes,
    normalizeActiveFilter,
  };

  globalScope.FDSToolbarState = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
