const {
  BUTTON_META,
  DEFAULT_FILTER,
  FILTER_KEYS,
  TOOLBAR_SPEC,
  TOOLBAR_MODES,
  countViolationsByFilter,
  createToolbarModel,
  getPresentationMode,
  getNextToolbarMode,
  getNextActiveFilter,
  normalizeActiveFilter,
} = globalThis.FDSToolbarState;

const {
  computeElementScrollTarget,
  computeToolbarDragPosition,
  shouldStartToolbarDrag: shouldStartToolbarDragByState,
} = globalThis.FDSToolbarDrag;
const { hasAuthoredTokenReference: detectAuthoredTokenReference } = globalThis.FDSStyleTokenDetection;
const STORYBOOK_REGISTRY = globalThis.FDSStorybookRegistry;
function hasAuthoredTokenReference(element, properties) {
  return detectAuthoredTokenReference(element, properties, document, STORYBOOK_REGISTRY);
}
const { buildTokenRegistry } = globalThis.FDSTokenSource;
const { escapeHtml } = globalThis.FDSHtmlUtils;
const { createContentRenderers } = globalThis.FDSContentRender;
const { createContentScanUtils } = globalThis.FDSContentScanUtils;
const { createContentTheme } = globalThis.FDSContentTheme;
const { createContentStateUtils } = globalThis.FDSContentStateUtils;
const { createContentInspector } = globalThis.FDSContentInspection;
const { createContentSummaryModel } = globalThis.FDSContentSummaryModel;
const {
  createViolationReportHtml,
  createViolationReportFilename,
} = globalThis.FDSContentViolationReport;
const { createContentSummaryPanel } = globalThis.FDSContentSummaryPanel;
const { createContentToolbarUI } = globalThis.FDSContentToolbarUI;
const { createContentBridgeSpecs } = globalThis.FDSContentBridgeSpecs;
const { createContentTokenSuggestions } = globalThis.FDSContentTokenSuggestions;
const { createContentFloatingInspector } = globalThis.FDSContentFloatingInspector;
const { createContentScanRunner } = globalThis.FDSContentScanRunner;
const FDS_DESIGN_VARIABLES = globalThis.FDSDesignVariables;

const FDS_BUILD = '2026-04-13-dev3';
const BRIDGE_POLL_INTERVAL_MS = 3000;
const BRIDGE_DISCONNECT_GRACE_SAMPLES = 3;
const SUMMARY_PANEL_MIN_HEIGHT = 56;
const FDS_CSS_VARIABLES = FDS_DESIGN_VARIABLES?.cssVariables || {};
const FDS_SPECS = FDS_DESIGN_VARIABLES?.inspectorSpecs || {
  colors: {},
  fonts: ['Pretendard', 'Noto Sans KR', 'Noto Sans'],
  spacing: [0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 28, 32, 36, 40, 48, 64, 80, 144],
  radius: ['4px', '6px', '8px', '10px', '12px', '16px', '9999px'],
};

const ICON_PATHS = {
  move: 'assets/ic_tool_move.svg',
  color: 'assets/ic_tool_color.svg',
  font: 'assets/ic_tool_font.svg',
  spacing: 'assets/ic_tool_spacing.svg',
  warning: 'assets/ic_tool_exclamationmark.triangle.svg',
  success: 'assets/ic_tool_success.svg',
  radius: 'assets/ic_tool_round 2.svg',
  refresh: 'assets/ic_tool_rescan.svg',
  close: 'assets/ic_tool_close.svg',
};
const {
  renderAssetIcon,
  renderToolbarMarkup,
  parseViolationItem,
  formatTokenContextLabel,
  createSummaryMetricCards,
  renderSummaryEmptyState,
  renderSummaryTabBar,
  renderSummaryMetricCard,
  renderSummaryGroupItem,
  renderSummaryListItem,
  getIssueElementLabel,
} = createContentRenderers({
  iconPaths: ICON_PATHS,
  getUrl: safeRuntimeGetUrl,
  escapeHtml,
});
const {
  getToolbarButtonTooltip,
  setRootVisibility,
  isInspectorUIShellComplete,
  resetToolbarFloatingPosition,
  resetSummaryPanelFloatingPosition,
  applyToolbarSyncState,
  replaceToolbarMarkupIfChanged,
  getToolbarCollapsedState,
  getToolbarModelVisibilityState,
  createCollapsedToolbarModel,
  bindToolbarPointerEvents,
  bindToolbarButtonHoverEvents,
  clearToolbarMoveButtonClick,
  getToolbarFilterClickAction,
  bindToolbarFilterButtonEvents,
  bindToolbarCommandButtonEvents,
  bindSummaryPanelCloseButton,
  clearToolbarDragActiveState,
  applyToolbarDragActiveState,
  getToolbarDragMovement,
  getToolbarDragNextPosition,
  applyToolbarDragPosition,
} = createContentToolbarUI({
  documentRef: document,
  computeToolbarDragPosition,
});
const {
  recordIssue,
  getElementIssueSignature,
  getDirectTextContent,
  hasDirectTextContent,
  rebindUnrenderedIssueEntries,
  getIssueTone,
  getIssueColorPart,
  getIssueCategoryFromMessage,
  rgbToHex,
} = createContentScanUtils({ parseViolationItem });
const {
  applyThemeVariables,
  applyToolbarSpecVariables,
} = createContentTheme({
  designVariables: FDS_DESIGN_VARIABLES,
  cssVariables: FDS_CSS_VARIABLES,
  toolbarSpec: TOOLBAR_SPEC,
  toolbarModes: TOOLBAR_MODES,
});
const { getInspectionForFilter } = createContentInspector({
  getActiveInspectorSpecs,
  getKnownColorTokens,
  hasAuthoredTokenReference,
  hasDirectTextContent,
  rgbToHex,
});
const TOKEN_SOURCE_STORAGE_KEY = 'fdsTokenSource';
const VIOLATION_NOTES_STORAGE_KEY = 'fdsViolationNotes';
const SCAN_BATCH_BUDGET_MS = 12;
const MAX_SCAN_ELEMENTS = 6000;
const INSPECTOR_CARD_HIDE_DELAY_MS = 700;
const IGNORED_SCAN_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEMPLATE',
  'META',
  'LINK',
  'SVG',
  'PATH',
  'DEFS',
  'CLIPPATH',
  'MASK',
  'LINEARGRADIENT',
  'RADIALGRADIENT',
  'STOP',
]);
let activeFilter = DEFAULT_FILTER;
let isFigmaConnected = false;
let scanData;
let toolbarMode = TOOLBAR_MODES.DEFAULT;
let previousConnectionState = null;
let connectedMessageTimer = null;
let bridgePollIntervalId = null;
let bridgeCheckInFlight = false;
let isExtensionVisible = false;
let isDismissedByUser = false;
let hasBoundViewportEvents = false;
let dragState = null;
let panelDragState = null;
let panelResizeState = null;
let inspectorCardDragState = null;
let customSummaryPanelPosition = null;
let customSummaryPanelHeight = null;
let customInspectorCardPosition = null;
let isToolbarCollapsed = false;
let suppressToolbarClickUntil = 0;
let isSummaryPanelDismissed = false;
let isSummaryPanelDockedToToolbar = false;
let activeSummarySubtab = 'bg';
let activeSummaryTone = 'danger';
let activePinnedIssueKey = null;
let lockedPinnedIssueKey = null;
let lockedPinnedIssueKeys = [];
let activeIsolatedIssueKey = null;
let expandedIssueGroupKeys = new Set();
let bridgeConnectionTier = 'offline';
let bridgeConnectionSummary = '브리지 연결 안 됨';
let bridgeConnectionDetail = '브리지 연결이 끊겼거나 세션이 없습니다.';
let bridgeDisconnectStreak = 0;
let activeTokenSource = null;
let activeTokenRegistry = buildTokenRegistry({});
let activeBridgePluginId = null;
let bridgeInspectorSpecOverrides = null;
let bridgeColorTokenRegistry = { colors: {}, meta: { colorTokenCount: 0, colorVariableCount: 0 } };
let bridgeTokenFileName = null;
let bridgeTokenPageName = null;
let violationNotesByKey = new Map();
let hasLoadedViolationNotes = false;
let snapshotInspectorSpecOverrides = null;
let snapshotColorTokenRegistry = { colors: {}, meta: { colorTokenCount: 0 } };
let snapshotTokenFileName = null;
let hasSnapshotTokenSource = false;
let isScanning = false;
let scanStatusText = '';
let scanErrorText = '';
let activeScanPromise = null;
let queuedScanReason = '';
let lastScanMetrics = null;
let pendingSummaryMotion = null;
const scheduledVisualUpdates = [];
let lastViewportWidth = window.innerWidth;
let pendingResponsiveLockedIssueKeys = [];

const FILTER_LABELS = Object.freeze({
  color: '컬러',
  font: '폰트',
  spacing: '스페이싱',
  radius: '모서리 라운드',
});
const {
  createEmptyScanData,
  getFilterLabel,
  getScanStatusMessage,
} = createContentStateUtils({
  filterLabels: FILTER_LABELS,
  getActiveFilter: () => activeFilter,
});
scanData = createEmptyScanData();
const {
  normalizeActiveSummaryToneForCounts,
  getVisibleIssueEntries,
  getColorEntriesForActiveSubtab,
  getColorToneCountsForActiveSubtab,
  getToneCountsForEntries,
  getTonePatternCountsForGroups,
  getColorTonePatternCountsForActiveSubtab,
  getColorSummaryTabs,
  getSummaryListRenderKey,
  getIssueGroupKey,
  groupIssueEntries,
} = createContentSummaryModel({
  getScanData: () => scanData,
  getActiveFilter: () => activeFilter,
  getActiveSummarySubtab: () => activeSummarySubtab,
  setActiveSummarySubtab: (nextSubtab) => {
    activeSummarySubtab = nextSubtab;
  },
  getActiveSummaryTone: () => activeSummaryTone,
  setActiveSummaryTone: (nextTone) => {
    activeSummaryTone = nextTone;
  },
  getExpandedIssueGroupKeys: () => expandedIssueGroupKeys,
  parseViolationItem,
});
const {
  getSummaryPanel,
  setSummaryPanelVisible,
  hideSummaryPanelElement,
  isSummaryPanelElementVisible,
  clearSummaryPanelDragActiveState,
  applySummaryPanelDragActiveState,
  applySummaryPanelPosition,
  applyCustomSummaryPanelPosition: applyCustomSummaryPanelPositionStyle,
  measureNaturalSummaryPanelHeight,
  measureSummaryPanelTargetHeight,
} = createContentSummaryPanel({
  documentRef: document,
  getComputedStyleRef: globalThis.getComputedStyle,
});

function getFDSMotion() {
  return globalThis.FDSMotion || null;
}

function requestSummaryMotion(kind, details = null) {
  pendingSummaryMotion = typeof kind === 'object' && kind !== null ? kind : { kind, details };
}

function formatScanCompletionText(metrics = lastScanMetrics) {
  if (!metrics || !Number(metrics.scannedElementCount)) return '';
  const seconds = Math.max(0.1, Number(metrics.durationMs || 0) / 1000);
  const scanned = Number(metrics.scannedElementCount || 0).toLocaleString('ko-KR');
  const total = Number(metrics.totalElementCount || metrics.scannedElementCount || 0).toLocaleString('ko-KR');
  const truncatedLabel = metrics.truncated ? ' · 일부만 검사' : '';
  return `검사 완료 · ${scanned}/${total}개 요소 · ${seconds.toFixed(1)}초${truncatedLabel}`;
}

function formatScanScopeText(meta = scanData?.meta) {
  const scanned = Number(meta?.scannedElementCount || 0);
  const skipped = Number(meta?.skippedElementCount || 0);
  if (!Number.isFinite(scanned) || !Number.isFinite(skipped) || scanned + skipped <= 0) {
    return '';
  }

  return `렌더링 기준 · 검사됨 ${scanned.toLocaleString('ko-KR')}개 · 제외됨 ${skipped.toLocaleString('ko-KR')}개`;
}

const SCAN_BATCH_SIZE = 80;

function shouldForceScanErrorForVerification() {
  const hostname = window.location?.hostname || '';
  const isLocalVerificationHost = hostname === 'localhost' || hostname === '127.0.0.1';
  return isLocalVerificationHost
    && document.documentElement?.dataset?.fdsInspectorForceScanError === 'true';
}

function handleExtensionContextInvalid(error) {
  const message = error instanceof Error ? error.message : String(error || '');
  if (!message.includes('Extension context invalidated')) {
    return false;
  }

  isExtensionVisible = false;
  isDismissedByUser = true;
  cancelScheduledVisualUpdates();
  clearConnectedMessageTimer();
  stopBridgePolling();
  hideTooltip();
  hideSummaryPanel();
  hideInspectorCard();

  const root = document.getElementById('fds-root');
  if (root) {
    root.remove();
  }

  return true;
}

async function safeRuntimeSendMessage(payload) {
  try {
    return await chrome.runtime.sendMessage(payload);
  } catch (error) {
    if (handleExtensionContextInvalid(error)) {
      return null;
    }
    throw error;
  }
}

function safeRuntimeGetUrl(path) {
  try {
    return chrome.runtime.getURL(path);
  } catch (error) {
    handleExtensionContextInvalid(error);
    return null;
  }
}

function getViolationNotesPageKey() {
  try {
    const url = new URL(window.location.href);
    url.hash = '';
    return url.toString();
  } catch (_error) {
    return String(window.location?.href || '').split('#')[0];
  }
}

function getViolationNoteKey(entry) {
  if (!entry) return '';
  return [
    getViolationNotesPageKey(),
    entry.category || '',
    entry.colorPart || '',
    entry.message || '',
    getIssueElementLabel(entry),
    entry.key || '',
  ].join('::');
}

function normalizeViolationNoteEntries(entries) {
  return (Array.isArray(entries) ? entries : [entries])
    .filter((entry) => entry?.key);
}

function getStoredViolationNotesContainer(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

async function loadViolationNotesForPage() {
  if (!chrome.storage?.local || hasLoadedViolationNotes) return violationNotesByKey;
  try {
    const result = await chrome.storage?.local.get(VIOLATION_NOTES_STORAGE_KEY);
    const allNotes = getStoredViolationNotesContainer(result?.[VIOLATION_NOTES_STORAGE_KEY]);
    const pageKey = getViolationNotesPageKey();
    violationNotesByKey = new Map(Object.entries(getStoredViolationNotesContainer(allNotes[pageKey])));
    hasLoadedViolationNotes = true;
  } catch (error) {
    console.warn('[FDS Inspector] Failed to load violation notes', error);
    violationNotesByKey = new Map();
  }
  return violationNotesByKey;
}

async function writeViolationNotesForPage(nextNotesByKey) {
  if (!chrome.storage?.local) return false;
  const result = await chrome.storage?.local.get(VIOLATION_NOTES_STORAGE_KEY);
  const allNotes = getStoredViolationNotesContainer(result?.[VIOLATION_NOTES_STORAGE_KEY]);
  allNotes[getViolationNotesPageKey()] = Object.fromEntries(nextNotesByKey.entries());
  await chrome.storage?.local.set({ [VIOLATION_NOTES_STORAGE_KEY]: allNotes });
  return true;
}

async function saveViolationNote(entry, text) {
  const noteKey = getViolationNoteKey(entry);
  const trimmedText = String(text || '').trim();
  if (!noteKey || !trimmedText) return false;
  await loadViolationNotesForPage();
  const existing = violationNotesByKey.get(noteKey);
  const now = new Date().toISOString();
  violationNotesByKey.set(noteKey, {
    category: entry.category || '',
    message: entry.message || '',
    elementLabel: getIssueElementLabel(entry),
    text: trimmedText,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  });
  return writeViolationNotesForPage(violationNotesByKey);
}

async function saveViolationNotes(entries, text) {
  const noteEntries = normalizeViolationNoteEntries(entries);
  const trimmedText = String(text || '').trim();
  if (!noteEntries.length || !trimmedText) return false;
  await loadViolationNotesForPage();
  const now = new Date().toISOString();
  noteEntries.forEach((entry) => {
    const noteKey = getViolationNoteKey(entry);
    if (!noteKey) return;
    const existing = violationNotesByKey.get(noteKey);
    violationNotesByKey.set(noteKey, {
      category: entry.category || '',
      message: entry.message || '',
      elementLabel: getIssueElementLabel(entry),
      text: trimmedText,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    });
  });
  return writeViolationNotesForPage(violationNotesByKey);
}

async function deleteViolationNote(entry) {
  const noteKey = getViolationNoteKey(entry);
  if (!noteKey) return false;
  await loadViolationNotesForPage();
  violationNotesByKey.delete(noteKey);
  return writeViolationNotesForPage(violationNotesByKey);
}

async function deleteViolationNotes(entries) {
  const noteEntries = normalizeViolationNoteEntries(entries);
  if (!noteEntries.length) return false;
  await loadViolationNotesForPage();
  noteEntries.forEach((entry) => {
    const noteKey = getViolationNoteKey(entry);
    if (!noteKey) return;
    violationNotesByKey.delete(noteKey);
  });
  return writeViolationNotesForPage(violationNotesByKey);
}

async function loadTokenSourceFromStorage() {
  if (!chrome.storage?.local) return null;
  try {
    const result = await chrome.storage.local.get(TOKEN_SOURCE_STORAGE_KEY);
    activeTokenSource = result?.[TOKEN_SOURCE_STORAGE_KEY] || null;
    activeTokenRegistry = activeTokenSource?.registry || buildTokenRegistry({});
    return activeTokenSource;
  } catch {
    activeTokenSource = null;
    activeTokenRegistry = buildTokenRegistry({});
    return null;
  }
}

function getKnownColorTokens(hex) {
  if (!hex) return [];
  const bridgeTokens = Array.isArray(bridgeColorTokenRegistry?.colors?.[hex])
    ? bridgeColorTokenRegistry.colors[hex]
    : [];
  const sourceTokens = Array.isArray(activeTokenRegistry?.colors?.[hex])
    ? activeTokenRegistry.colors[hex]
    : [];
  const snapshotTokens = Array.isArray(snapshotColorTokenRegistry?.colors?.[hex])
    ? snapshotColorTokenRegistry.colors[hex]
    : [];
  const builtInToken = FDS_SPECS.colors[hex] ? [FDS_SPECS.colors[hex]] : [];
  const storybookTokens = Object.entries(STORYBOOK_REGISTRY?.variables || {})
    .filter(([name, value]) => name.startsWith('--color-') && value.toLowerCase() === hex.toLowerCase())
    .map(([name]) => name);
  return [...new Set([...bridgeTokens, ...snapshotTokens, ...sourceTokens, ...builtInToken, ...storybookTokens])];
}

function getKnownColorTokenEntries() {
  const mergedColors = new Map();
  const appendRegistry = (colors = {}) => {
    Object.entries(colors).forEach(([hex, tokens]) => {
      if (!Array.isArray(tokens) || !tokens.length) return;
      const existing = mergedColors.get(hex) || [];
      mergedColors.set(hex, [...new Set([...existing, ...tokens])]);
    });
  };

  appendRegistry(bridgeColorTokenRegistry?.colors);
  appendRegistry(snapshotColorTokenRegistry?.colors);
  appendRegistry(activeTokenRegistry?.colors);
  Object.entries(STORYBOOK_REGISTRY?.variables || {}).forEach(([name, value]) => {
    if (name.startsWith('--color-') && /^#[0-9a-f]{6}$/i.test(value)) {
      appendRegistry({ [value.toLowerCase()]: [name] });
    }
  });
  appendRegistry(Object.fromEntries(
    Object.entries(FDS_SPECS.colors || {}).map(([hex, token]) => [hex, [token]]),
  ));
  return [...mergedColors.entries()].map(([hex, tokens]) => ({ hex, tokens }));
}

function getKnownColorForToken(token) {
  const match = getKnownColorTokenEntries().find((entry) => (
    /^#[0-9a-f]{6}$/i.test(entry.hex)
    && entry.tokens.includes(token)
  ));
  return match ? match.hex.toLowerCase() : null;
}

function getActiveInspectorSpecs() {
  const activeOverrides = bridgeInspectorSpecOverrides || snapshotInspectorSpecOverrides;
  const spacingTokens = { ...(activeOverrides?.spacingTokens || {}) };
  const radiusTokens = { ...(activeOverrides?.radiusTokens || {}) };
  Object.entries(STORYBOOK_REGISTRY?.variables || {}).forEach(([name, value]) => {
    if (!/^\d+(?:\.\d+)?px$/.test(value)) return;
    const map = name.startsWith('--spacing-') ? spacingTokens : name.startsWith('--radius-') ? radiusTokens : null;
    if (!map) return;
    const key = name.startsWith('--spacing-') ? Number.parseFloat(value) : value;
    map[key] = [...new Set([...(map[key] || []), name])];
  });
  return {
    ...FDS_SPECS,
    spacing: Array.isArray(activeOverrides?.spacing) && activeOverrides.spacing.length > 0
      ? activeOverrides.spacing
      : FDS_SPECS.spacing,
    radius: Array.isArray(activeOverrides?.radius) && activeOverrides.radius.length > 0
      ? activeOverrides.radius
      : FDS_SPECS.radius,
    spacingTokens,
    radiusTokens,
  };
}
const { getSuggestedTokensForIssue } = createContentTokenSuggestions({
  getActiveInspectorSpecs,
  getKnownColorTokens,
  getKnownColorTokenEntries,
  parseViolationItem,
});
const {
  createBridgeInspectorSpecsRefreshState,
  createSnapshotInspectorSpecsRefreshState,
  getBridgeSpecStateSignature: getBridgeSpecStateSignatureBase,
  getBridgeTokenContextLabel: getBridgeTokenContextLabelBase,
} = createContentBridgeSpecs({
  formatTokenContextLabel,
});

function getBridgeSpecStateSignature(overrides = {}) {
  return getBridgeSpecStateSignatureBase({
    pluginId: activeBridgePluginId,
    fileName: bridgeTokenFileName,
    pageName: bridgeTokenPageName,
    overrides: bridgeInspectorSpecOverrides,
    colorRegistry: bridgeColorTokenRegistry,
    ...overrides,
  });
}

async function refreshBridgeInspectorSpecs() {
  const previousSignature = getBridgeSpecStateSignature();
  const response = await safeRuntimeSendMessage({ action: 'BRIDGE_TOKEN_SPECS' });
  const nextState = createBridgeInspectorSpecsRefreshState(response, {
    activePluginId: activeBridgePluginId,
    emptyColorRegistry: buildTokenRegistry({}),
  });

  activeBridgePluginId = nextState.activePluginId;
  bridgeTokenFileName = nextState.fileName;
  bridgeTokenPageName = nextState.pageName;
  bridgeColorTokenRegistry = nextState.colorRegistry;
  bridgeInspectorSpecOverrides = nextState.overrides;

  if (!nextState.connected) {
    return {
      changed: previousSignature !== getBridgeSpecStateSignature(),
      connected: false,
    };
  }

  return {
    changed: previousSignature !== getBridgeSpecStateSignature(),
    connected: true,
    overrides: bridgeInspectorSpecOverrides,
  };
}

async function refreshSnapshotInspectorSpecs() {
  const response = await safeRuntimeSendMessage({ action: 'SNAPSHOT_TOKEN_SPECS' });
  const nextState = createSnapshotInspectorSpecsRefreshState(response);
  snapshotTokenFileName = nextState.fileName;
  hasSnapshotTokenSource = nextState.hasSnapshotTokenSource;
  snapshotInspectorSpecOverrides = nextState.overrides;
  snapshotColorTokenRegistry = nextState.colorRegistry;

  if (!nextState.hasSpecs) {
    return { changed: false, source: 'snapshot' };
  }

  return { changed: true, source: 'snapshot', overrides: snapshotInspectorSpecOverrides };
}

function getBridgeTokenContextLabel() {
  return getBridgeTokenContextLabelBase({
    isFigmaConnected,
    snapshotOverrides: snapshotInspectorSpecOverrides,
    snapshotColorRegistry: snapshotColorTokenRegistry,
    snapshotFileName: snapshotTokenFileName,
    bridgeOverrides: bridgeInspectorSpecOverrides,
    bridgeColorRegistry: bridgeColorTokenRegistry,
    bridgeFileName: bridgeTokenFileName,
    bridgePageName: bridgeTokenPageName,
  });
}

function createTextFileUrl({ content, type = 'text/html;charset=utf-8' }) {
  const blob = new Blob([content], { type });
  return URL.createObjectURL(blob);
}

function downloadTextFileFromUrl({ filename, url }) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function openReportInNewTab(url) {
  window.open(url, '_blank', 'noopener');
}

function scheduleObjectUrlRevoke(url) {
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60000);
}

function saveViolationReport() {
  const inspectedAt = new Date();
  const content = createViolationReportHtml({
    scanData,
    pageTitle: document.title,
    pageUrl: window.location.href,
    inspectedAt,
    tokenContextLabel: getBridgeTokenContextLabel(),
    parseViolationItem,
    getSuggestedTokensForIssue,
    getViolationNoteForEntry,
  });
  const filename = createViolationReportFilename(inspectedAt);
  const url = createTextFileUrl({ content });
  openReportInNewTab(url);
  downloadTextFileFromUrl({ filename, url });
  scheduleObjectUrlRevoke(url);
}

function setScanningState(nextScanning, reason = '') {
  isScanning = Boolean(nextScanning);
  scanStatusText = isScanning ? getScanStatusMessage(reason) : '';
  const root = document.getElementById('fds-root');
  const toolbar = document.getElementById('fds-toolbar');
  if (root) {
    root.dataset.scanState = isScanning ? 'scanning' : 'idle';
  }
  if (toolbar) {
    toolbar.dataset.scanState = isScanning ? 'scanning' : 'idle';
    toolbar.dataset.scanStatus = scanStatusText;
  }
}

function waitForNextPaint() {
  return new Promise((resolve) => {
    if (typeof window.requestAnimationFrame !== 'function') {
      window.setTimeout(resolve, 16);
      return;
    }
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

function waitForDelay(delayMs) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

async function yieldToBrowser() {
  await waitForNextPaint();
  await waitForDelay(0);
}

function ensureValidActiveFilter() {
  activeFilter = normalizeActiveFilter(activeFilter);
}

function setActiveFilter(nextFilter) {
  activeFilter = normalizeActiveFilter(nextFilter);
  clearActiveViolationPin();
  if (activeFilter !== 'color') {
    activeSummarySubtab = 'bg';
    activeSummaryTone = 'danger';
  }
}

function setToolbarCollapsed(nextCollapsed) {
  isToolbarCollapsed = getToolbarCollapsedState({
    nextCollapsed,
    activeFilter,
  });
  hideTooltip();
}

function clearConnectedMessageTimer() {
  if (connectedMessageTimer) {
    clearTimeout(connectedMessageTimer);
    connectedMessageTimer = null;
  }
}

function addIssueEntry({ category, message, element, metadata = null }) {
  if (!message) return null;
  const normalizedCategory = getIssueCategoryFromMessage(message, category);
  const colorPart = getIssueColorPart(message);
  const tone = getIssueTone(message);
  const signature = getElementIssueSignature(element);
  const key = `${normalizedCategory}|${colorPart || 'all'}|${message}|${signature}`;
  const existingEntry = scanData.issueEntries.find((entry) => entry.key === key);
  if (existingEntry) return existingEntry;

  const entry = {
    id: scanData.issueEntries.length + 1,
    key,
    category: normalizedCategory,
    colorPart,
    tone,
    message,
    element,
    metadata,
  };
  return entry;
}

function hideTooltip() {
  const tooltip = document.getElementById('fds-inline-tooltip');
  if (tooltip) tooltip.style.display = 'none';
}

function ensureTooltip() {
  let tooltip = document.getElementById('fds-inline-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'fds-inline-tooltip';
    tooltip.className = 'fds-inline-tooltip';
    document.body.appendChild(tooltip);
  }
  return tooltip;
}

function clampPosition(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

const {
  createInspectorCardHideTimer,
  createVisualUpdateScheduler,
  createDebouncedUpdateScheduler,
  getViolationPinLabel,
  isViolationPinTargetVisible,
  getRectOverlapArea,
  getPinPositionCandidate,
  getClampedPinCandidate,
  getBestPinPosition,
  getFloatingCardPosition,
} = createContentFloatingInspector({
  clampPosition,
});
const inspectorCardHideTimer = createInspectorCardHideTimer({
  hideDelayMs: INSPECTOR_CARD_HIDE_DELAY_MS,
  onClear: () => clearTransientInspectorPreview(),
});
const gapHighlightScheduler = createVisualUpdateScheduler({
  onUpdate: () => {
    if (!isExtensionVisible || isDismissedByUser) return;
    renderGapHighlights();
  },
});
const radiusHighlightScheduler = createVisualUpdateScheduler({
  onUpdate: () => {
    if (!isExtensionVisible || isDismissedByUser) return;
    renderRadiusHighlights();
  },
});
const textColorHighlightScheduler = createVisualUpdateScheduler({
  onUpdate: () => {
    if (!isExtensionVisible || isDismissedByUser) return;
    renderTextColorHighlights();
  },
});
const violationPinPositionScheduler = createVisualUpdateScheduler({
  onUpdate: () => {
    if (!isExtensionVisible || isDismissedByUser) return;
    positionViolationPin();
  },
});
const inspectorPreviewPositionScheduler = createVisualUpdateScheduler({
  onUpdate: () => {
    if (!isExtensionVisible || isDismissedByUser) return;
    refreshActiveInspectorPreviewPosition();
  },
});
function refreshResponsiveIssueGeometry() {
  if (!isExtensionVisible || isDismissedByUser) return;
  rebindUnrenderedIssueEntries({
    entries: scanData.issueEntries.filter((entry) => entry.category === activeFilter),
    root: document,
    isElementVisible: isScannableElement,
    getStyles: (element) => window.getComputedStyle(element),
    inspectElement: ({ filterKey, styles, element }) => getInspectionForFilter(filterKey, styles, element),
  });
  if (pendingResponsiveLockedIssueKeys.length > 0) {
    lockedPinnedIssueKeys = [...pendingResponsiveLockedIssueKeys];
    lockedPinnedIssueKey = lockedPinnedIssueKeys[0] || null;
    pendingResponsiveLockedIssueKeys = [];
  }
  applyVisibleIssueHighlights();
  refreshActiveInspectorPreviewPosition();
}

const responsiveViewportGeometryScheduler = createDebouncedUpdateScheduler({
  delayMs: 300,
  onUpdate: refreshResponsiveIssueGeometry,
});
scheduledVisualUpdates.push(
  gapHighlightScheduler,
  radiusHighlightScheduler,
  textColorHighlightScheduler,
  violationPinPositionScheduler,
  inspectorPreviewPositionScheduler,
  responsiveViewportGeometryScheduler,
);

function cancelScheduledVisualUpdates() {
  scheduledVisualUpdates.forEach((scheduler) => scheduler.cancel());
}

function placeFloatingElement(element, preferredLeft, preferredTop, { margin = 12 } = {}) {
  const width = element.offsetWidth || 0;
  const height = element.offsetHeight || 0;
  const viewportLeft = window.scrollX + margin;
  const viewportTop = window.scrollY + margin;
  const viewportRight = window.scrollX + window.innerWidth - margin - width;
  const viewportBottom = window.scrollY + window.innerHeight - margin - height;

  const clampedLeft = clampPosition(preferredLeft, viewportLeft, Math.max(viewportLeft, viewportRight));
  const clampedTop = clampPosition(preferredTop, viewportTop, Math.max(viewportTop, viewportBottom));

  element.style.left = `${clampedLeft}px`;
  element.style.top = `${clampedTop}px`;
}

function showToolbarButtonTooltip(button) {
  const tooltipText = getToolbarButtonTooltip(button);
  if (!tooltipText) {
    hideTooltip();
    return;
  }

  const tooltip = ensureTooltip();
  tooltip.textContent = tooltipText;
  const rect = button.getBoundingClientRect();
  tooltip.style.display = 'block';
  const tooltipHeight = tooltip.offsetHeight || 36;
  const offsetY = button.closest?.('.fds-summary-list') ? 6 : 18;
  placeFloatingElement(
    tooltip,
    window.scrollX + rect.left + rect.width / 2,
    window.scrollY + rect.top - tooltipHeight - offsetY
  );
}

function avoidSummaryPanelOverlapWithInspectorCard(card) {
  const panel = getSummaryPanel();
  if (!panel || panel.style.display !== 'block' || !card || card.style.display === 'none') return false;

  const cardRect = card.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  if (!cardRect.width || !cardRect.height || !panelRect.width || !panelRect.height) return false;
  if (getRectOverlapArea(cardRect, panelRect) <= 0) return false;

  const gap = 12;
  const margin = 12;
  const panelWidth = panelRect.width;
  const panelHeight = panelRect.height;
  const clampLeft = (left) => clampPosition(left, margin, Math.max(margin, window.innerWidth - panelWidth - margin));
  const clampTop = (top) => clampPosition(top, margin, Math.max(margin, window.innerHeight - panelHeight - margin));
  const toCandidate = ({ left, top }) => {
    const nextLeft = clampLeft(left);
    const nextTop = clampTop(top);
    return {
      left: nextLeft,
      top: nextTop,
      rect: {
        left: nextLeft,
        top: nextTop,
        right: nextLeft + panelWidth,
        bottom: nextTop + panelHeight,
      },
      distance: Math.abs(nextLeft - panelRect.left) + Math.abs(nextTop - panelRect.top),
    };
  };

  const candidates = [
    { left: cardRect.right + gap, top: cardRect.top },
    { left: cardRect.left - panelWidth - gap, top: cardRect.top },
    { left: cardRect.left, top: cardRect.bottom + gap },
    { left: cardRect.left, top: cardRect.top - panelHeight - gap },
    { left: margin, top: margin },
    { left: window.innerWidth - panelWidth - margin, top: margin },
    { left: margin, top: window.innerHeight - panelHeight - margin },
    { left: window.innerWidth - panelWidth - margin, top: window.innerHeight - panelHeight - margin },
  ].map(toCandidate)
    .sort((a, b) => getRectOverlapArea(a.rect, cardRect) - getRectOverlapArea(b.rect, cardRect) || a.distance - b.distance);

  const nextPosition = candidates[0];
  if (!nextPosition) return false;
  customSummaryPanelPosition = {
    left: Math.round(nextPosition.left),
    top: Math.round(nextPosition.top),
  };
  applyCustomSummaryPanelPosition();
  return true;
}

function isInspectorUIVisible() {
  const root = document.getElementById('fds-root');
  return Boolean(isExtensionVisible && !isDismissedByUser)
    && isInspectorUIShellComplete(root)
    && Boolean(root.querySelector('#fds-toolbar button'))
    && root.style.display !== 'none'
    && root.dataset.visible === 'true';
}

function ensureVisibleInspectorUI() {
  let root = document.getElementById('fds-root');

  if (root && root.getAttribute('data-fds-build') !== FDS_BUILD) {
    clearConnectedMessageTimer();
    stopBridgePolling();
    hideTooltip();
    root.remove();
    root = null;
  }

  if (root && !isInspectorUIShellComplete(root)) {
    root.remove();
    root = null;
  }

  if (!root) {
    createUI();
    root = document.getElementById('fds-root');
  }

  if (root) {
    setRootVisibility(true);
    syncToolbar();
  }

  return root;
}

function stopBridgePolling() {
  if (bridgePollIntervalId !== null) {
    clearInterval(bridgePollIntervalId);
    bridgePollIntervalId = null;
  }
}

function startBridgePolling() {
  if (bridgePollIntervalId !== null) return;
  bridgePollIntervalId = window.setInterval(() => {
    if (!isExtensionVisible || isDismissedByUser) return;
    checkBridgeConnection();
  }, BRIDGE_POLL_INTERVAL_MS);
}

function showSummaryPanel({ anchorFilter = null, animatePosition = true } = {}) {
  const panel = getSummaryPanel();
  if (!panel || !isExtensionVisible || isDismissedByUser || isSummaryPanelDismissed) return;
  const wasPanelVisible = isSummaryPanelVisible();
  activeSummaryTone = 'danger';
  setSummaryPanelVisible(panel);
  if (!hasLoadedViolationNotes) {
    loadViolationNotesForPage().then(() => updateSummaryUI()).catch(() => updateSummaryUI());
  } else {
    updateSummaryUI();
  }
  const anchorElement = getToolbarFilterButton(anchorFilter || activeFilter);
  if (anchorElement && !isSummaryPanelDockedToToolbar) {
    positionSummaryPanelForToolbarButton(anchorElement, { animate: animatePosition && wasPanelVisible });
  }
  if (!wasPanelVisible) {
    getFDSMotion()?.animatePanelOpen?.(panel);
  }
  if (isSummaryPanelDockedToToolbar && isToolbarCollapsed) {
    dockCollapsedToolbarAndPanel();
  }
}

function openSummaryPanelForActiveFilter({ forceExpanded = true, anchorFilter = activeFilter } = {}) {
  if (forceExpanded) {
    setToolbarCollapsed(false);
    restoreExpandedToolbarAndPanelPosition({
      preserveSummaryPanelPosition: Boolean(customSummaryPanelPosition) && !anchorFilter,
      resetSummaryPanelPosition: !anchorFilter,
    });
  }
  isSummaryPanelDismissed = false;
  updateToolbarIndicators();
  showSummaryPanel({ anchorFilter });
}

function hideSummaryPanel() {
  hideSummaryPanelElement();
  clearGapHighlights();
  clearRadiusHighlights();
  clearTextColorHighlights();
  clearViolationPins();
}

function dismissSummaryPanel() {
  isSummaryPanelDismissed = true;
  isSummaryPanelDockedToToolbar = false;
  hideSummaryPanel();
}

function isSummaryPanelVisible() {
  return isSummaryPanelElementVisible();
}

function getViolationPinLayer() {
  return document.getElementById('fds-issue-pin-layer');
}

function getGapHighlightLayer() {
  return document.getElementById('fds-gap-highlight-layer');
}

function getRadiusHighlightLayer() {
  return document.getElementById('fds-radius-highlight-layer');
}

function getTextColorHighlightLayer() {
  return document.getElementById('fds-text-color-highlight-layer');
}

function clearViolationPins() {
  const layer = getViolationPinLayer();
  if (layer) {
    layer.innerHTML = '';
    delete layer.dataset.issueKeys;
  }
}

function clearGapHighlights() {
  const layer = getGapHighlightLayer();
  layer?.querySelectorAll?.('.fds-gap-highlight, .fds-gap-item-highlight, .fds-gap-box-highlight, .fds-spacing-box-highlight, .fds-spacing-area-highlight')?.forEach((marker) => marker.remove());
}

function clearRadiusHighlights() {
  const layer = getRadiusHighlightLayer();
  layer?.querySelectorAll?.('.fds-radius-corner-highlight')?.forEach((marker) => marker.remove());
}

function clearTextColorHighlights() {
  const layer = getTextColorHighlightLayer();
  layer?.querySelectorAll?.('.fds-text-color-highlight')?.forEach((marker) => marker.remove());
}

function clearHoveredInspectionTarget() {
  document.querySelectorAll('.fds-hover-target').forEach((el) => {
    el.classList.remove('fds-hover-target');
  });
}

function clearActiveViolationPin() {
  activePinnedIssueKey = null;
  lockedPinnedIssueKey = null;
  lockedPinnedIssueKeys = [];
  activeIsolatedIssueKey = null;
  clearHoveredInspectionTarget();
  document.querySelectorAll('.fds-spacing-focus').forEach((el) => {
    el.classList.remove('fds-spacing-focus');
  });
  hideInspectorCard();
  clearViolationPins();
}

function clearInspectorCardHideTimer() {
  inspectorCardHideTimer.clear();
}

function clearExpandedIssueGroups() {
  expandedIssueGroupKeys = new Set();
}

function clearElementSpacingHighlightMetadata(element) {
  if (!element) return;
  element.removeAttribute('data-fds-category');
  element.removeAttribute('data-fds-color-part');
  element.removeAttribute('data-fds-spacing-kind');
  element.removeAttribute('data-fds-spacing-sides');
  element.removeAttribute('data-fds-spacing-value');
  element.removeAttribute('data-fds-spacing-label');
  ['top', 'right', 'bottom', 'left'].forEach((side) => {
    element.style.removeProperty(`--fds-spacing-area-${side}`);
  });
  element.classList.remove('fds-spacing-focus');
  if (element.getAttribute('data-fds-position-was-static') === 'true') {
    const previousPosition = element.getAttribute('data-fds-prev-inline-position');
    if (previousPosition) {
      element.style.position = previousPosition;
    } else {
      element.style.removeProperty('position');
    }
  }
  element.removeAttribute('data-fds-position-was-static');
  element.removeAttribute('data-fds-prev-inline-position');
}

function getRadiusIssueMetadata(entries = []) {
  const radiusEntries = entries
    .map((entry) => ({ entry, parsed: parseViolationItem(entry?.message) }))
    .filter(({ entry, parsed }) => entry?.category === 'radius' || String(parsed.chip || '').includes('라운드'));
  if (!radiusEntries.length) return null;
  const firstValue = radiusEntries.find(({ parsed }) => parsed.value)?.parsed?.value || '';
  return { value: firstValue };
}

function getTextColorIssueMetadata(entries = []) {
  const colorEntries = entries.filter((entry) => entry?.category === 'color');
  if (!colorEntries.length) return null;
  const hasOnlyTextColor = colorEntries.every((entry) => entry.colorPart === 'text');
  return hasOnlyTextColor ? { part: 'text' } : null;
}

function getSpacingIssueMetadata(entries = []) {
  const metadataEntries = entries
    .map((entry) => entry?.metadata?.spacing)
    .filter((spacing) => spacing?.kind && Array.isArray(spacing.sides) && spacing.sides.length);
  if (metadataEntries.length) {
    const kind = metadataEntries[0].kind;
    const sideOrder = kind === 'gap' ? ['row', 'column'] : ['top', 'right', 'bottom', 'left'];
    const sides = new Set();
    let value = '';

    metadataEntries
      .filter((spacing) => spacing.kind === kind)
      .forEach((spacing) => {
        spacing.sides.forEach((side) => sides.add(side));
        if (!value && Number.isFinite(spacing.value)) value = `${spacing.value}px`;
      });

    const normalizedSides = sideOrder.filter((side) => sides.has(side));
    if (!normalizedSides.length) return null;
    if (kind === 'gap') {
      return {
        kind,
        sides: normalizedSides.join(' '),
        value,
        label: `g${normalizedSides.map((axis) => axis[0]).join('')} ${value}`.trim(),
      };
    }

    const shortKind = kind === 'padding' ? 'p' : 'm';
    const sideLabel = normalizedSides.length === 4 ? 'all' : normalizedSides.map((side) => side[0]).join('');
    return {
      kind,
      sides: normalizedSides.join(' '),
      value,
      label: `${shortKind}${sideLabel} ${value}`.trim(),
    };
  }

  const spacingEntries = entries
    .map((entry) => ({ entry, parsed: parseViolationItem(entry?.message) }))
    .filter(({ entry, parsed }) => entry?.category === 'spacing' || ['패딩', '마진', '갭'].some((label) => String(parsed.chip || '').includes(label)));
  if (!spacingEntries.length) return null;

  const sideMap = { '상단': 'top', '오른쪽': 'right', '하단': 'bottom', '왼쪽': 'left' };
  const sideOrder = ['top', 'right', 'bottom', 'left'];
  const axisMap = { '행': 'row', '열': 'column' };
  const axisOrder = ['row', 'column'];
  const sides = new Set();
  const axes = new Set();
  let kind = null;
  let value = '';

  spacingEntries.forEach(({ parsed }) => {
    const chip = String(parsed.chip || '');
    const isPadding = chip.includes('패딩');
    const isMargin = chip.includes('마진');
    const isGap = chip.includes('갭');
    if (!kind) kind = isPadding ? 'padding' : isMargin ? 'margin' : isGap ? 'gap' : null;
    if (!value && parsed.value) value = parsed.value;
    const sideLabel = Object.keys(sideMap).find((label) => chip.includes(label));
    const axisLabel = Object.keys(axisMap).find((label) => chip.includes(label));
    if (sideLabel) {
      sides.add(sideMap[sideLabel]);
    } else if (axisLabel) {
      axes.add(axisMap[axisLabel]);
    } else if (isPadding || isMargin) {
      sideOrder.forEach((side) => sides.add(side));
    } else if (isGap) {
      axisOrder.forEach((axis) => axes.add(axis));
    }
  });

  if (!kind) return null;
  if (kind === 'gap') {
    if (!axes.size) return null;
    const normalizedAxes = axisOrder.filter((axis) => axes.has(axis));
    return {
      kind,
      sides: normalizedAxes.join(' '),
      value,
      label: `g${normalizedAxes.map((axis) => axis[0]).join('')} ${value}`.trim(),
    };
  }

  if (!sides.size) return null;
  const normalizedSides = sideOrder.filter((side) => sides.has(side));
  const shortKind = kind === 'padding' ? 'p' : 'm';
  const sideLabel = normalizedSides.length === 4 ? 'all' : normalizedSides.map((side) => side[0]).join('');
  return {
    kind,
    sides: normalizedSides.join(' '),
    value,
    label: `${shortKind}${sideLabel} ${value}`.trim(),
  };
}

function getSpacingAreaValue(styles, kind, side) {
  if (kind === 'gap') return '0px';
  const propertyName = `${kind}${side.charAt(0).toUpperCase()}${side.slice(1)}`;
  return styles?.[propertyName] || '0px';
}

function applyElementSpacingAreaVariables(element, spacingMetadata) {
  const styles = getComputedStyle(element);
  const activeSides = new Set(String(spacingMetadata.sides || '').split(/\s+/).filter(Boolean));
  ['top', 'right', 'bottom', 'left'].forEach((side) => {
    const value = activeSides.has(side)
      ? getSpacingAreaValue(styles, spacingMetadata.kind, side)
      : '0px';
    element.style.setProperty(`--fds-spacing-area-${side}`, value || '0px');
  });
}

function applyElementSpacingHighlightMetadata(element, elementEntries = []) {
  const spacingMetadata = getSpacingIssueMetadata(elementEntries);
  if (!spacingMetadata) {
    clearElementSpacingHighlightMetadata(element);
    if (getRadiusIssueMetadata(elementEntries)) {
      element.setAttribute('data-fds-category', 'radius');
    } else if (getTextColorIssueMetadata(elementEntries)) {
      element.setAttribute('data-fds-category', 'color');
      element.setAttribute('data-fds-color-part', 'text');
    }
    return;
  }

  element.setAttribute('data-fds-category', 'spacing');
  element.setAttribute('data-fds-spacing-kind', spacingMetadata.kind);
  element.setAttribute('data-fds-spacing-sides', spacingMetadata.sides);
  element.setAttribute('data-fds-spacing-value', spacingMetadata.value);
  element.setAttribute('data-fds-spacing-label', spacingMetadata.label);
  applyElementSpacingAreaVariables(element, spacingMetadata);

  if (getComputedStyle(element).position === 'static') {
    element.setAttribute('data-fds-position-was-static', 'true');
    element.setAttribute('data-fds-prev-inline-position', element.style.position || '');
    element.style.position = 'relative';
  }
}

function getVisibleChildRects(element) {
  return getVisibleGapParticipantRects(element);
}

function getDirectTextNodeRects(element) {
  if (!element?.isConnected || typeof document.createRange !== 'function') return [];
  const elementRect = element.getBoundingClientRect?.();
  if (!elementRect || elementRect.width <= 0 || elementRect.height <= 0) return [];
  const rects = [];

  getDirectTextNodes(element).forEach((node) => {
    const range = document.createRange();
    try {
      range.selectNodeContents(node);
      Array.from(range.getClientRects?.() || []).forEach((rect) => {
        const left = Math.max(elementRect.left, rect.left);
        const top = Math.max(elementRect.top, rect.top);
        const right = Math.min(elementRect.right, rect.right);
        const bottom = Math.min(elementRect.bottom, rect.bottom);
        if (right - left < 1 || bottom - top < 1) return;
        rects.push({ left, top, right, bottom, width: right - left, height: bottom - top });
      });
    } finally {
      range.detach?.();
    }
  });

  return rects;
}

function getVisibleGapParticipantRects(element) {
  const childRects = Array.from(element?.children || [])
    .slice(0, 96)
    .map((child) => {
      const rect = child.getBoundingClientRect?.();
      if (!rect || rect.width <= 0 || rect.height <= 0) return null;
      return rect;
    })
    .filter(Boolean);
  return [...childRects, ...getDirectTextNodeRects(element)]
    .sort((a, b) => a.top - b.top || a.left - b.left)
    .slice(0, 128);
}

function getGapMarkerRects(element, spacingMetadata) {
  if (!element || spacingMetadata?.kind !== 'gap') return [];
  const containerRect = element.getBoundingClientRect?.();
  if (!containerRect || containerRect.width <= 0 || containerRect.height <= 0) return [];
  const axes = new Set(String(spacingMetadata.sides || '').split(/\s+/).filter(Boolean));
  const children = getVisibleChildRects(element);
  if (children.length < 2) return [];

  const markerRects = [];
  const minOverlap = 2;
  const minGap = 1;
  const addMarker = (rect, axis) => {
    if (!rect || rect.width < minGap || rect.height < minGap) return;
    markerRects.push({
      axis,
      left: Math.max(containerRect.left, rect.left),
      top: Math.max(containerRect.top, rect.top),
      width: Math.min(containerRect.right, rect.left + rect.width) - Math.max(containerRect.left, rect.left),
      height: Math.min(containerRect.bottom, rect.top + rect.height) - Math.max(containerRect.top, rect.top),
    });
  };

  if (axes.has('column')) {
    children.forEach((current) => {
      const rightNeighbor = children
        .filter((candidate) => candidate.left >= current.right + minGap)
        .filter((candidate) => Math.min(current.bottom, candidate.bottom) - Math.max(current.top, candidate.top) >= minOverlap)
        .sort((a, b) => a.left - b.left)[0];
      if (!rightNeighbor) return;
      addMarker({
        left: current.right,
        top: Math.max(current.top, rightNeighbor.top),
        width: rightNeighbor.left - current.right,
        height: Math.min(current.bottom, rightNeighbor.bottom) - Math.max(current.top, rightNeighbor.top),
      }, 'column');
    });
  }

  if (axes.has('row')) {
    children.forEach((current) => {
      const bottomNeighbor = children
        .filter((candidate) => candidate.top >= current.bottom + minGap)
        .filter((candidate) => Math.min(current.right, candidate.right) - Math.max(current.left, candidate.left) >= minOverlap)
        .sort((a, b) => a.top - b.top)[0];
      if (!bottomNeighbor) return;
      addMarker({
        left: Math.max(current.left, bottomNeighbor.left),
        top: current.bottom,
        width: Math.min(current.right, bottomNeighbor.right) - Math.max(current.left, bottomNeighbor.left),
        height: bottomNeighbor.top - current.bottom,
      }, 'row');
    });
  }

  return markerRects
    .filter((rect) => rect.width >= minGap && rect.height >= minGap)
    .slice(0, 48);
}

function getContentBoxRect(element) {
  const rect = element?.getBoundingClientRect?.();
  if (!rect || rect.width <= 0 || rect.height <= 0) return null;
  const styles = getComputedStyle(element);
  const borderLeft = getBorderSideValue(styles, 'left');
  const borderTop = getBorderSideValue(styles, 'top');
  const borderRight = getBorderSideValue(styles, 'right');
  const borderBottom = getBorderSideValue(styles, 'bottom');
  const paddingLeft = getBoxSpacingSideValue(styles, 'padding', 'left');
  const paddingTop = getBoxSpacingSideValue(styles, 'padding', 'top');
  const paddingRight = getBoxSpacingSideValue(styles, 'padding', 'right');
  const paddingBottom = getBoxSpacingSideValue(styles, 'padding', 'bottom');
  const left = rect.left + borderLeft + paddingLeft;
  const top = rect.top + borderTop + paddingTop;
  const right = rect.right - borderRight - paddingRight;
  const bottom = rect.bottom - borderBottom - paddingBottom;
  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

function getGapFallbackMarkerRects(element, spacingMetadata, existingMarkerRects = []) {
  if (!element || spacingMetadata?.kind !== 'gap' || existingMarkerRects.length > 0) return [];
  const contentRect = getContentBoxRect(element);
  if (!contentRect) return [];
  const styles = getComputedStyle(element);
  const axes = new Set(String(spacingMetadata.sides || '').split(/\s+/).filter(Boolean));
  const rowGap = Number.parseFloat(styles.rowGap || '0');
  const columnGap = Number.parseFloat(styles.columnGap || '0');
  const markerRects = [];
  const minMarkerSize = 2;

  if (axes.has('column') && Number.isFinite(columnGap) && columnGap > 0 && contentRect.width > minMarkerSize) {
    const width = Math.max(1, Math.min(columnGap, contentRect.width));
    markerRects.push({
      axis: 'column',
      fallback: true,
      left: contentRect.left + Math.max(0, (contentRect.width - width) / 2),
      top: contentRect.top,
      width,
      height: contentRect.height,
    });
  }

  if (axes.has('row') && Number.isFinite(rowGap) && rowGap > 0 && contentRect.height > minMarkerSize) {
    const height = Math.max(1, Math.min(rowGap, contentRect.height));
    markerRects.push({
      axis: 'row',
      fallback: true,
      left: contentRect.left,
      top: contentRect.top + Math.max(0, (contentRect.height - height) / 2),
      width: contentRect.width,
      height,
    });
  }

  return markerRects;
}

function getGapItemMarkerRects(element, spacingMetadata) {
  if (!element || spacingMetadata?.kind !== 'gap') return [];
  const containerRect = element.getBoundingClientRect?.();
  if (!containerRect || containerRect.width <= 0 || containerRect.height <= 0) return [];
  return getVisibleChildRects(element)
    .map((rect) => ({
      left: Math.max(containerRect.left, rect.left),
      top: Math.max(containerRect.top, rect.top),
      width: Math.min(containerRect.right, rect.right) - Math.max(containerRect.left, rect.left),
      height: Math.min(containerRect.bottom, rect.bottom) - Math.max(containerRect.top, rect.top),
    }))
    .filter((rect) => rect.width >= 1 && rect.height >= 1)
    .slice(0, 96);
}

function getBoxSpacingSideValue(styles, kind, side) {
  const propertyName = `${kind}${side.charAt(0).toUpperCase()}${side.slice(1)}`;
  const value = Number.parseFloat(styles?.[propertyName] || '0');
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function getBorderSideValue(styles, side) {
  const propertyName = `border${side.charAt(0).toUpperCase()}${side.slice(1)}Width`;
  const value = Number.parseFloat(styles?.[propertyName] || '0');
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function getBoxSpacingMarkerRects(element, spacingMetadata) {
  if (!element || !['padding', 'margin'].includes(spacingMetadata?.kind)) return [];
  const rect = element.getBoundingClientRect?.();
  if (!rect || rect.width <= 0 || rect.height <= 0) return [];
  const styles = getComputedStyle(element);
  const activeSides = new Set(String(spacingMetadata.sides || '').split(/\s+/).filter(Boolean));
  const sideValues = {
    top: getBoxSpacingSideValue(styles, spacingMetadata.kind, 'top'),
    right: getBoxSpacingSideValue(styles, spacingMetadata.kind, 'right'),
    bottom: getBoxSpacingSideValue(styles, spacingMetadata.kind, 'bottom'),
    left: getBoxSpacingSideValue(styles, spacingMetadata.kind, 'left'),
  };
  const borders = {
    top: getBorderSideValue(styles, 'top'),
    right: getBorderSideValue(styles, 'right'),
    bottom: getBorderSideValue(styles, 'bottom'),
    left: getBorderSideValue(styles, 'left'),
  };
  const markerRects = [];
  const addRect = (side, candidate) => {
    if (!activeSides.has(side) || sideValues[side] <= 0) return;
    if (!candidate || candidate.width <= 0 || candidate.height <= 0) return;
    markerRects.push({ ...candidate, side, kind: spacingMetadata.kind });
  };

  if (spacingMetadata.kind === 'margin') {
    addRect('top', {
      left: rect.left - sideValues.left,
      top: rect.top - sideValues.top,
      width: rect.width + sideValues.left + sideValues.right,
      height: sideValues.top,
    });
    addRect('right', {
      left: rect.right,
      top: rect.top,
      width: sideValues.right,
      height: rect.height,
    });
    addRect('bottom', {
      left: rect.left - sideValues.left,
      top: rect.bottom,
      width: rect.width + sideValues.left + sideValues.right,
      height: sideValues.bottom,
    });
    addRect('left', {
      left: rect.left - sideValues.left,
      top: rect.top,
      width: sideValues.left,
      height: rect.height,
    });
    return markerRects;
  }

  const innerLeft = rect.left + borders.left;
  const innerTop = rect.top + borders.top;
  const innerRight = rect.right - borders.right;
  const innerBottom = rect.bottom - borders.bottom;
  const innerWidth = Math.max(0, innerRight - innerLeft);
  const innerHeight = Math.max(0, innerBottom - innerTop);

  addRect('top', {
    left: innerLeft,
    top: innerTop,
    width: innerWidth,
    height: Math.min(sideValues.top, innerHeight),
  });
  addRect('right', {
    left: Math.max(innerLeft, innerRight - sideValues.right),
    top: innerTop + Math.min(sideValues.top, innerHeight),
    width: Math.min(sideValues.right, innerWidth),
    height: Math.max(0, innerHeight - sideValues.top - sideValues.bottom),
  });
  addRect('bottom', {
    left: innerLeft,
    top: Math.max(innerTop, innerBottom - sideValues.bottom),
    width: innerWidth,
    height: Math.min(sideValues.bottom, innerHeight),
  });
  addRect('left', {
    left: innerLeft,
    top: innerTop + Math.min(sideValues.top, innerHeight),
    width: Math.min(sideValues.left, innerWidth),
    height: Math.max(0, innerHeight - sideValues.top - sideValues.bottom),
  });

  return markerRects;
}

function appendGapOverlayMarker(layer, className, rect, dataset = {}) {
  const marker = document.createElement('div');
  marker.className = className;
  Object.entries(dataset).forEach(([key, value]) => {
    marker.dataset[key] = value;
  });
  marker.style.left = `${Math.round(rect.left)}px`;
  marker.style.top = `${Math.round(rect.top)}px`;
  marker.style.width = `${Math.max(1, Math.round(rect.width))}px`;
  marker.style.height = `${Math.max(1, Math.round(rect.height))}px`;
  layer.appendChild(marker);
  return marker;
}

function parseCssRadiusPair(value) {
  const parts = String(value || '')
    .trim()
    .split(/\s+/)
    .map((part) => Number.parseFloat(part))
    .filter((number) => Number.isFinite(number) && number > 0);
  if (!parts.length) return { x: 0, y: 0 };
  return { x: parts[0], y: parts[1] || parts[0] };
}

function getRadiusCornerRects(element) {
  const rect = element?.getBoundingClientRect?.();
  if (!rect || rect.width <= 0 || rect.height <= 0) return [];
  const styles = getComputedStyle(element);
  const maxX = Math.max(1, rect.width / 2);
  const maxY = Math.max(1, rect.height / 2);
  const strokeOutset = 1;
  const normalize = (corner, value) => {
    const radius = parseCssRadiusPair(value);
    const width = Math.min(maxX, radius.x);
    const height = Math.min(maxY, radius.y);
    if (width <= 0 || height <= 0) return null;
    const isRight = corner.includes('right');
    const isBottom = corner.includes('bottom');
    return {
      corner,
      left: isRight ? rect.right - width + strokeOutset : rect.left - strokeOutset,
      top: isBottom ? rect.bottom - height + strokeOutset : rect.top - strokeOutset,
      width,
      height,
    };
  };
  return [
    normalize('top-left', styles.borderTopLeftRadius),
    normalize('top-right', styles.borderTopRightRadius),
    normalize('bottom-left', styles.borderBottomLeftRadius),
    normalize('bottom-right', styles.borderBottomRightRadius),
  ].filter(Boolean);
}

function appendRadiusCornerMarker(layer, rect) {
  const marker = document.createElement('div');
  marker.className = 'fds-radius-corner-highlight';
  marker.dataset.corner = rect.corner;
  marker.style.left = `${Math.round(rect.left)}px`;
  marker.style.top = `${Math.round(rect.top)}px`;
  marker.style.width = `${Math.max(1, Math.round(rect.width))}px`;
  marker.style.height = `${Math.max(1, Math.round(rect.height))}px`;
  marker.style.setProperty('--fds-radius-corner-width', `${Math.max(1, Math.round(rect.width))}px`);
  marker.style.setProperty('--fds-radius-corner-height', `${Math.max(1, Math.round(rect.height))}px`);
  layer.appendChild(marker);
  return marker;
}

function getDirectTextNodes(element) {
  return Array.from(element?.childNodes || [])
    .filter((node) => node?.nodeType === Node.TEXT_NODE && String(node.textContent || '').trim());
}

function getTextColorMarkerRects(element) {
  if (!element?.isConnected || typeof document.createRange !== 'function') return [];
  const elementRect = element.getBoundingClientRect?.();
  if (!elementRect || elementRect.width <= 0 || elementRect.height <= 0) return [];
  const markerRects = [];

  getDirectTextNodes(element).forEach((node) => {
    const range = document.createRange();
    try {
      range.selectNodeContents(node);
      Array.from(range.getClientRects?.() || []).forEach((rect) => {
        const left = Math.max(elementRect.left, rect.left);
        const top = Math.max(elementRect.top, rect.top);
        const right = Math.min(elementRect.right, rect.right);
        const bottom = Math.min(elementRect.bottom, rect.bottom);
        if (right - left < 1 || bottom - top < 1) return;
        markerRects.push({ left, top, width: right - left, height: bottom - top });
      });
    } finally {
      range.detach?.();
    }
  });

  return markerRects.slice(0, 64);
}

function appendTextColorMarker(layer, rect) {
  const marker = document.createElement('div');
  marker.className = 'fds-text-color-highlight';
  marker.style.left = `${Math.round(rect.left)}px`;
  marker.style.top = `${Math.round(rect.top)}px`;
  marker.style.width = `${Math.max(1, Math.round(rect.width))}px`;
  marker.style.height = `${Math.max(1, Math.round(rect.height))}px`;
  layer.appendChild(marker);
  return marker;
}

function renderGapHighlights(entries = getVisibleIssueEntries()) {
  const layer = getGapHighlightLayer();
  if (!layer) return;
  clearGapHighlights();

  const entriesByElement = new Map();
  entries.forEach((entry) => {
    if (!entry?.element?.isConnected || entry.category !== 'spacing') return;
    const current = entriesByElement.get(entry.element) || [];
    current.push(entry);
    entriesByElement.set(entry.element, current);
  });

  entriesByElement.forEach((elementEntries, element) => {
    const spacingMetadata = getSpacingIssueMetadata(elementEntries);
    if (['padding', 'margin'].includes(spacingMetadata?.kind)) {
      appendGapOverlayMarker(layer, 'fds-spacing-box-highlight', element.getBoundingClientRect(), { kind: spacingMetadata.kind });
      getBoxSpacingMarkerRects(element, spacingMetadata).forEach((rect) => {
        appendGapOverlayMarker(layer, 'fds-spacing-area-highlight', rect, { kind: rect.kind, side: rect.side });
      });
      return;
    }
    if (spacingMetadata?.kind !== 'gap') return;
    appendGapOverlayMarker(layer, 'fds-gap-box-highlight', element.getBoundingClientRect(), { kind: spacingMetadata.kind });
    getGapItemMarkerRects(element, spacingMetadata).forEach((rect) => {
      appendGapOverlayMarker(layer, 'fds-gap-item-highlight', rect);
    });
    const gapMarkerRects = getGapMarkerRects(element, spacingMetadata);
    const fallbackMarkerRects = getGapFallbackMarkerRects(element, spacingMetadata, gapMarkerRects);
    [...gapMarkerRects, ...fallbackMarkerRects].forEach((rect) => {
      appendGapOverlayMarker(layer, 'fds-gap-highlight', rect, { axis: rect.axis, fallback: rect.fallback ? 'true' : 'false' });
    });
  });
}

function renderRadiusHighlights(entries = getVisibleIssueEntries()) {
  const layer = getRadiusHighlightLayer();
  if (!layer) return;
  clearRadiusHighlights();

  const entriesByElement = new Map();
  entries.forEach((entry) => {
    if (!entry?.element?.isConnected || entry.category !== 'radius') return;
    if (!entriesByElement.has(entry.element)) entriesByElement.set(entry.element, []);
    entriesByElement.get(entry.element).push(entry);
  });

  entriesByElement.forEach((elementEntries, element) => {
    if (!getRadiusIssueMetadata(elementEntries)) return;
    getRadiusCornerRects(element).forEach((rect) => {
      appendRadiusCornerMarker(layer, rect);
    });
  });
}

function renderTextColorHighlights(entries = getVisibleIssueEntries()) {
  const layer = getTextColorHighlightLayer();
  if (!layer) return;
  clearTextColorHighlights();

  const textColorElements = new Set();
  entries.forEach((entry) => {
    if (!entry?.element?.isConnected || entry.category !== 'color' || entry.colorPart !== 'text') return;
    textColorElements.add(entry.element);
  });

  textColorElements.forEach((element) => {
    getTextColorMarkerRects(element).forEach((rect) => {
      appendTextColorMarker(layer, rect);
    });
  });
}

function scheduleGapHighlightUpdate() {
  gapHighlightScheduler.schedule();
}

function scheduleRadiusHighlightUpdate() {
  radiusHighlightScheduler.schedule();
}

function scheduleTextColorHighlightUpdate() {
  textColorHighlightScheduler.schedule();
}

function applyVisibleIssueHighlights(entries = getVisibleIssueEntries()) {
  clearGapHighlights();
  clearRadiusHighlights();
  clearTextColorHighlights();
  document.querySelectorAll('.fds-inspected, .fds-violation, .fds-hover-target').forEach((el) => {
    el.classList.remove('fds-inspected', 'fds-violation', 'fds-violation-danger', 'fds-violation-warning', 'fds-hover-target');
    el.removeAttribute('data-fds-msg');
    el.removeAttribute('data-fds-type');
    el.removeAttribute('data-fds-issue-keys');
    clearElementSpacingHighlightMetadata(el);
  });

  const entriesByElement = new Map();
  entries.forEach((entry) => {
    if (!entry?.element?.isConnected) return;
    const current = entriesByElement.get(entry.element) || [];
    current.push(entry);
    entriesByElement.set(entry.element, current);
  });

  entriesByElement.forEach((elementEntries, element) => {
    const hasDanger = elementEntries.some((entry) => entry.tone === 'danger');
    const hasWarning = elementEntries.some((entry) => entry.tone === 'warning');
    element.classList.add('fds-inspected');
    element.classList.add('fds-violation');
    element.classList.toggle('fds-violation-danger', hasDanger);
    element.classList.toggle('fds-violation-warning', !hasDanger && hasWarning);
    element.setAttribute('data-fds-msg', JSON.stringify(elementEntries.map((entry) => entry.message)));
    element.setAttribute('data-fds-type', hasDanger ? 'danger' : hasWarning ? 'warning' : 'success');
    element.setAttribute('data-fds-issue-keys', JSON.stringify(elementEntries.map((entry) => entry.key)));
    applyElementSpacingHighlightMetadata(element, elementEntries);
  });
  renderGapHighlights(entries);
  renderRadiusHighlights(entries);
  renderTextColorHighlights(entries);
}

function getVisibleIssueEntriesForElement(element) {
  if (!element) return [];
  return getVisibleIssueEntries().filter((entry) => entry.element === element && entry.element?.isConnected);
}

function parseIssueKeysDataset(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch (_error) {
    return [];
  }
}

function getVisibleIssueEntriesByKeys(issueKeys = []) {
  const keySet = new Set(issueKeys);
  if (!keySet.size) return [];
  return getVisibleIssueEntries().filter((entry) => keySet.has(entry.key) && entry.element?.isConnected);
}

function getHoveredInspectionTarget(event) {
  if (!event || typeof document.elementsFromPoint !== 'function') {
    return event?.target?.closest?.('.fds-inspected') || null;
  }

  const visibleElements = new Set(
    getVisibleIssueEntries()
      .map((entry) => entry.element)
      .filter((element) => element?.isConnected)
  );

  return document.elementsFromPoint(event.clientX, event.clientY)
    .find((element) => visibleElements.has(element) && element.classList.contains('fds-inspected')) || null;
}

function getInspectorCardTitle(issueEntries = []) {
  if (!issueEntries.length) return '위반 정보';
  if (issueEntries.length === 1) {
    const parsedIssue = parseViolationItem(issueEntries[0]?.message);
    return `${parsedIssue.chip || '속성'} 위반`;
  }

  const categories = new Set(issueEntries.map((entry) => entry?.category).filter(Boolean));
  if (categories.size === 1) {
    const category = [...categories][0];
    const categoryLabel = {
      color: '색상',
      font: '서체',
      spacing: '간격',
      radius: '라운드',
    }[category] || '속성';
    return `${categoryLabel} 위반 ${issueEntries.length}건`;
  }

  return `위반 ${issueEntries.length}건`;
}

function getInspectorIssueDisplayKey(entry) {
  return [
    entry?.category || '',
    entry?.colorPart || '',
    entry?.tone || '',
    entry?.message || '',
  ].join('::');
}

function getUniqueInspectorIssueEntries(issueEntries = []) {
  const entriesByDisplayKey = new Map();
  issueEntries.forEach((entry) => {
    const displayKey = getInspectorIssueDisplayKey(entry);
    if (!entriesByDisplayKey.has(displayKey)) {
      entriesByDisplayKey.set(displayKey, entry);
    }
  });
  return [...entriesByDisplayKey.values()];
}

function getInspectorNoteEntries(issueEntries, representativeEntry) {
  const representativeDisplayKey = getInspectorIssueDisplayKey(representativeEntry);
  const matchingEntries = (issueEntries || []).filter((entry) => (
    entry?.key && getInspectorIssueDisplayKey(entry) === representativeDisplayKey
  ));
  return matchingEntries.length ? matchingEntries : normalizeViolationNoteEntries(representativeEntry);
}

function getInspectorIssueDisplay(entry) {
  const parsedIssue = parseViolationItem(entry?.message);
  const value = parsedIssue.value || entry?.message || '확인 필요';
  const suffix = String(parsedIssue.suffix || parsedIssue.tag || '').trim();
  const isColorIssue = entry?.category === 'color' || ['배경색', '글자색', '보더색'].includes(parsedIssue.chip);
  const hasAlpha = /^rgba\(.+,\s*(0?\.\d+|0)\s*\)$/i.test(value);

  if (isColorIssue && suffix === '미등록') {
    if (hasAlpha) {
      return {
        value,
        description: '투명도가 포함된 미등록 컬러',
        tip: '반투명 컬러 토큰 등록을 검토하세요.',
      };
    }
    return { value, description: '미등록 컬러가 사용되었습니다.' };
  }

  if (isColorIssue && suffix === '원시값 직접 사용') {
    return { value, description: '원시값 컬러가 사용되었습니다.' };
  }

  if (suffix.startsWith('원시값 직접 사용')) {
    return { value, description: '원시값이 직접 사용되었습니다.' };
  }

  if (suffix) {
    return { value, description: `${suffix} 값이 사용되었습니다.` };
  }

  return { value, description: '위반 정보가 감지되었습니다.' };
}

function renderSuggestedTokenRows(tokens = [], { showColorChips = false } = {}) {
  return tokens.map((token) => {
    const color = showColorChips ? getKnownColorForToken(token) : null;
    return `
      <div class="fds-token-row">
        ${color ? `<span class="fds-token-color-chip" role="img" style="--fds-token-chip-color: ${escapeHtml(color)}" title="${escapeHtml(`${token}: ${color}`)}" aria-label="${escapeHtml(`${token} 색상 ${color}`)}"></span>` : ''}
        <strong title="${escapeHtml(token)}">${escapeHtml(token)}</strong>
        <button class="fds-token-copy" type="button" data-copy-token="${escapeHtml(token)}" data-state="idle" aria-label="${escapeHtml(`토큰명 복사: ${token}`)}" title="${escapeHtml(`토큰명 복사: ${token}`)}">${getLucideIconSvg('copy', 'fds-token-copy-icon')}</button>
      </div>
    `;
  }).join('');
}

function renderStorybookGuidance(entry, tokens = []) {
  if (!STORYBOOK_REGISTRY) return '';
  const category = entry?.category;
  const title = category === 'color' ? 'Foundation/Colors/Semantic'
    : category === 'spacing' ? 'Foundation/Spacing'
      : category === 'font' ? 'Foundation/Typography' : null;
  const url = title ? STORYBOOK_REGISTRY.docs[title] : null;
  const parsed = parseViolationItem(String(entry?.message || ''));
  const property = category === 'color'
    ? entry.colorPart === 'bg' || parsed.chip === '배경색' ? 'background-color'
      : entry.colorPart === 'border' || parsed.chip === '보더색' ? 'border-color' : 'color'
    : category === 'radius' ? 'border-radius'
      : category === 'spacing' ? /갭/.test(parsed.chip || '') ? 'gap'
        : /마진/.test(parsed.chip || '') ? 'margin' : 'padding' : null;
  const variables = tokens.filter(token => token.startsWith('--'));
  const utilities = Object.entries(STORYBOOK_REGISTRY.utilities)
    .filter(([, declarations]) => declarations[property]
      && variables.some(name => declarations[property] === `var(${name})`))
    .map(([name]) => name).slice(0, 3);
  if (!url && !utilities.length) return '';
  return `<div class="fds-issue-replacement">
    ${utilities.length ? `<span class="fds-issue-replacement-label">FDS Tailwind 대안 · 적용 범위 확인</span>${renderSuggestedTokenRows(utilities)}` : ''}
    ${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">FDS Storybook 가이드 ↗</a>` : ''}
    <span class="fds-issue-replacement-label">기준 수집: ${escapeHtml(STORYBOOK_REGISTRY.source.capturedAt.slice(0, 10))}</span>
  </div>`;
}

function getViolationNoteForEntry(entry) {
  return violationNotesByKey.get(getViolationNoteKey(entry)) || null;
}

function getViolationNoteForEntries(entries) {
  return normalizeViolationNoteEntries(entries)
    .map((entry) => getViolationNoteForEntry(entry))
    .find(Boolean) || null;
}

function withViolationNoteState(entry) {
  return {
    ...entry,
    hasNote: Boolean(getViolationNoteForEntry(entry)),
  };
}

function renderViolationNoteControls(entries) {
  const note = getViolationNoteForEntries(entries);
  const noteText = note?.text || '';

  return `
    <div class="fds-card-note" data-note-mode="${note ? 'saved' : 'empty'}">
      ${note
        ? `<div class="fds-card-note-text">${escapeHtml(noteText)}</div>
           <div class="fds-card-note-actions">
             <button class="fds-card-note-action" type="button" data-note-action="edit">수정</button>
             <button class="fds-card-note-action danger" type="button" data-note-action="delete">삭제</button>
           </div>`
        : `<button class="fds-card-note-action" type="button" data-note-action="edit">메모 추가</button>`}
      <div class="fds-card-note-editor" hidden>
        <textarea class="fds-card-note-input" rows="3" maxlength="300" placeholder="이 위반 요소에 남길 메모">${escapeHtml(noteText)}</textarea>
        <div class="fds-card-note-actions">
          <button class="fds-card-note-action primary" type="button" data-note-action="save">저장</button>
          <button class="fds-card-note-action" type="button" data-note-action="cancel">취소</button>
        </div>
      </div>
    </div>
  `;
}

function renderViolationNoteEditor(card, entries) {
  const note = getViolationNoteForEntries(entries);
  const noteRoot = card.querySelector('.fds-card-note');
  if (!noteRoot) return;
  noteRoot.innerHTML = `
    <textarea class="fds-card-note-input" rows="3" maxlength="300" placeholder="이 위반 요소에 남길 메모">${escapeHtml(note?.text || '')}</textarea>
    <div class="fds-card-note-actions">
      <button class="fds-card-note-action primary" type="button" data-note-action="save">저장</button>
      <button class="fds-card-note-action" type="button" data-note-action="cancel">취소</button>
    </div>
  `;
  const textarea = noteRoot.querySelector('.fds-card-note-input');
  textarea?.focus?.();
  textarea?.setSelectionRange?.(textarea.value.length, textarea.value.length);
  bindViolationNoteControls(card, entries);
}

function refreshInspectorCardForEntries(entries) {
  const refreshEntry = normalizeViolationNoteEntries(entries).find((entry) => entry?.element?.isConnected);
  if (!refreshEntry) return;
  showInspectorCardForEntries(refreshEntry.element, getVisibleIssueEntriesForElement(refreshEntry.element), refreshEntry.element, { ignoreCustomPosition: true });
}

function bindViolationNoteControls(card, entries) {
  if (!card || !normalizeViolationNoteEntries(entries).length) return;
  card.querySelector('[data-note-action="edit"]')?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    renderViolationNoteEditor(card, entries);
  });
  card.querySelector('[data-note-action="cancel"]')?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    refreshInspectorCardForEntries(entries);
  });
  card.querySelector('[data-note-action="save"]')?.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const textarea = card.querySelector('.fds-card-note-input');
    if (!textarea) return;
    const ok = await saveViolationNotes(entries, textarea.value);
    if (ok) refreshInspectorCardForEntries(entries);
  });
  card.querySelector('[data-note-action="delete"]')?.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const ok = await deleteViolationNotes(entries);
    if (ok) refreshInspectorCardForEntries(entries);
  });
}

function showInspectorCardForEntries(target, issueEntries, anchorElement = target, { ignoreCustomPosition = false } = {}) {
  const card = document.getElementById('fds-inspector-card');
  if (!target?.isConnected || !card || !issueEntries?.length) {
    clearHoveredInspectionTarget();
    hideInspectorCard();
    return;
  }

  clearInspectorCardHideTimer();
  clearHoveredInspectionTarget();
  target.classList.add('fds-hover-target');

  const hasDanger = issueEntries.some((entry) => entry.tone === 'danger');
  const hasWarning = issueEntries.some((entry) => entry.tone === 'warning');
  const toneClass = hasDanger ? 'danger' : hasWarning ? 'warning' : 'success';
  const displayEntries = getUniqueInspectorIssueEntries(issueEntries);
  const cardTitle = getInspectorCardTitle(displayEntries);
  const previewEntries = displayEntries.slice(0, 4);
  const noteEntries = getInspectorNoteEntries(issueEntries, displayEntries[0]);
  const nextIssueKeys = issueEntries.map((entry) => entry.key).join('\n');
  const shouldAnimateCard = card.style.display !== 'block' || card.dataset.issueKeys !== nextIssueKeys;
  card.dataset.issueKeys = nextIssueKeys;
  card.className = `fds-card ${toneClass}`;
  resetTokenCopyButtons(card);
  card.innerHTML = `
    <div class="fds-card-head">
      <div class="fds-card-title-wrap">
        <div class="fds-card-title" title="${escapeHtml(cardTitle)}">${escapeHtml(cardTitle)}</div>
      </div>
    </div>
    <div class="fds-card-body">
      ${previewEntries.map((entry) => {
        const suggestedTokens = getSuggestedTokensForIssue(entry);
        const issueDisplay = getInspectorIssueDisplay(entry);
        return `
          <div class="fds-issue-item">
            <div class="fds-issue-message" title="${escapeHtml(entry.message)}">
              <strong class="fds-issue-value">${escapeHtml(issueDisplay.value)}</strong>
              <span class="fds-issue-description">${escapeHtml(issueDisplay.description)}</span>
              ${issueDisplay.tip ? `<span class="fds-issue-tip"><svg class="fds-issue-tip-icon" data-lucide="info" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg><span>${escapeHtml(issueDisplay.tip)}</span></span>` : ''}
            </div>
            ${suggestedTokens.length
              ? `<div class="fds-issue-replacement">
                  <span class="fds-issue-replacement-label">FDS 추천 토큰</span>
                  ${renderSuggestedTokenRows(suggestedTokens, { showColorChips: entry?.category === 'color' })}
                </div>`
              : ''}
            ${renderStorybookGuidance(entry, suggestedTokens)}
          </div>
        `;
      }).join('')}
      ${displayEntries.length > 4 ? `<div class="fds-card-more">외 ${displayEntries.length - 4}건</div>` : ''}
      ${renderViolationNoteControls(noteEntries)}
    </div>
  `;
  bindViolationNoteControls(card, noteEntries);
  card.querySelectorAll('.fds-token-copy').forEach((button) => {
    button.onclick = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const tokenName = button.dataset.copyToken || '';
      if (!tokenName) return;
      try {
        await navigator.clipboard?.writeText?.(tokenName);
        setTokenCopyButtonState(button, 'copied');
        showCopyToast('토큰이 복사되었습니다.');
        scheduleTokenCopyButtonReset(button);
        getFDSMotion()?.animateCopySuccess?.(button);
      } catch (error) {
        button.setAttribute('aria-label', '토큰 복사 실패');
      }
    };
  });
  card.onmouseenter = clearInspectorCardHideTimer;
  card.onpointerenter = clearInspectorCardHideTimer;
  card.onfocusin = clearInspectorCardHideTimer;
  card.onmouseleave = () => scheduleTransientInspectorPreviewClear();
  card.onfocusout = (event) => {
    if (event.relatedTarget?.closest?.('#fds-inspector-card')) return;
    scheduleTransientInspectorPreviewClear();
  };
  const cardHead = card.querySelector('.fds-card-head');
  if (cardHead) {
    cardHead.onpointerdown = beginInspectorCardDrag;
  }
  const anchorRect = (anchorElement || target).getBoundingClientRect();
  card.style.display = 'block';
  const cardPosition = getFloatingCardPosition(
    anchorRect,
    card.offsetWidth || 240,
    card.offsetHeight || 84,
    { gap: 12, margin: 12 }
  );
  const pinnedEntries = getPinnedIssueEntries();
  if (!ignoreCustomPosition && applyCustomInspectorCardPosition(card)) {
    positionViolationPin(pinnedEntries.length ? pinnedEntries : issueEntries, { avoidElement: card });
    if (shouldAnimateCard) {
      getFDSMotion()?.animateInspectorCard?.(card);
    }
    return;
  }

  if (ignoreCustomPosition) {
    customInspectorCardPosition = null;
  }
  placeFloatingElement(card, window.scrollX + cardPosition.left, window.scrollY + cardPosition.top);
  avoidSummaryPanelOverlapWithInspectorCard(card);
  positionViolationPin(pinnedEntries.length ? pinnedEntries : issueEntries, { avoidElement: card });
  if (shouldAnimateCard) {
    getFDSMotion()?.animateInspectorCard?.(card);
  }
}

function renderViolationPin(entry) {
  renderViolationPins(entry ? [entry] : []);
}

function getLucideIconSvg(name, className = 'fds-icon-inline') {
  const iconMap = {
    copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>',
    check: '<path d="M20 6 9 17l-5-5"></path>',
    download: '<path d="M12 15V3"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path>'
  };
  const paths = iconMap[name] || iconMap.copy;
  return `<svg class="${escapeHtml(className)}" data-lucide="${escapeHtml(name)}" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;
}

function setTokenCopyButtonState(button, state = 'copy') {
  if (!button) return;
  const isCopied = state === 'copied';
  button.dataset.state = isCopied ? 'copied' : 'idle';
  button.innerHTML = getLucideIconSvg(isCopied ? 'check' : 'copy', 'fds-token-copy-icon');
  button.setAttribute('aria-label', isCopied ? '토큰이 복사되었습니다.' : '토큰명 복사');
}

function positionCopyToastNearInspectorCard(toast, card = document.getElementById('fds-inspector-card')) {
  if (!toast || !card) return;
  const cardRect = card.getBoundingClientRect();
  const toastRect = toast.getBoundingClientRect();
  const margin = 12;
  const gap = 8;
  const toastWidth = toastRect.width || 160;
  const toastHeight = toastRect.height || 28;
  const left = clampPosition(
    cardRect.left + cardRect.width / 2,
    margin + toastWidth / 2,
    Math.max(margin + toastWidth / 2, window.innerWidth - margin - toastWidth / 2)
  );
  const bottomTop = cardRect.bottom + gap;
  const topTop = cardRect.top - gap - toastHeight;
  const hasBottomRoom = bottomTop + toastHeight <= window.innerHeight - margin;
  const hasTopRoom = topTop >= margin;
  const top = hasBottomRoom
    ? bottomTop
    : hasTopRoom
      ? topTop
      : clampPosition(bottomTop, margin, Math.max(margin, window.innerHeight - margin - toastHeight));

  toast.dataset.placement = hasBottomRoom ? 'bottom' : 'top';
  toast.style.left = `${Math.round(left)}px`;
  toast.style.top = `${Math.round(top)}px`;
}

function showCopyToast(message = '토큰이 복사되었습니다.') {
  const root = document.getElementById('fds-root');
  const card = document.getElementById('fds-inspector-card');
  if (!root || !card) return;
  let toast = root.querySelector('#fds-copy-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'fds-copy-toast';
    toast.className = 'fds-copy-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    root.appendChild(toast);
  }
  if (toast.dataset.hideTimer) {
    window.clearTimeout(Number(toast.dataset.hideTimer));
  }
  toast.textContent = message;
  positionCopyToastNearInspectorCard(toast, card);
  toast.dataset.visible = 'true';
  toast.dataset.hideTimer = String(window.setTimeout(() => {
    toast.dataset.visible = 'false';
    delete toast.dataset.hideTimer;
  }, 1400));
}

function scheduleTokenCopyButtonReset(button) {
  if (!button) return;
  if (button.dataset.resetTimer) {
    window.clearTimeout(Number(button.dataset.resetTimer));
  }
  button.dataset.resetTimer = String(window.setTimeout(() => {
    setTokenCopyButtonState(button, 'copy');
    delete button.dataset.resetTimer;
  }, 1200));
}

function resetTokenCopyButtons(root) {
  root?.querySelectorAll?.('.fds-token-copy').forEach((button) => {
    if (button.dataset.resetTimer) {
      window.clearTimeout(Number(button.dataset.resetTimer));
      delete button.dataset.resetTimer;
    }
    setTokenCopyButtonState(button, 'copy');
  });
}

function getOrderedViolationPinEntries(entries = []) {
  return entries
    .filter((entry) => entry?.element?.isConnected)
    .map((entry, index) => {
      const rect = entry.element.getBoundingClientRect();
      return {
        entry,
        index,
        top: Number.isFinite(rect.top) ? rect.top : 0,
        left: Number.isFinite(rect.left) ? rect.left : 0
      };
    })
    .sort((a, b) => a.top - b.top || a.left - b.left || a.index - b.index)
    .map(({ entry }) => entry);
}

function renderViolationPins(entries = []) {
  const layer = getViolationPinLayer();
  const connectedEntries = getOrderedViolationPinEntries(entries);
  if (!layer || !isSummaryPanelVisible() || !connectedEntries.length) {
    clearViolationPins();
    return;
  }

  const nextIssueKeys = connectedEntries.map((entry) => entry.key).join('\n');
  const shouldReplacePins = layer.dataset.issueKeys !== nextIssueKeys;
  if (shouldReplacePins) {
    layer.innerHTML = connectedEntries.map((entry, index) => {
      const tone = entry.tone === 'warning' ? 'warning' : 'danger';
      const label = String(index + 1);
      const title = `위반 요소 ${label}`;
      return `<span class="fds-issue-pin ${tone}" data-issue-key="${escapeHtml(entry.key)}" data-pin-index="${escapeHtml(label)}" title="${escapeHtml(title)}">${escapeHtml(label)}</span>`;
    }).join('');
    layer.dataset.issueKeys = nextIssueKeys;
  }
  positionViolationPin(connectedEntries);
  if (shouldReplacePins) {
    layer.querySelectorAll('.fds-issue-pin').forEach((pin) => {
      getFDSMotion()?.animatePin?.(pin);
    });
  }
}

function getPinnedIssueEntries() {
  const layer = getViolationPinLayer();
  if (!layer) return [];
  const entriesByKey = new Map(getVisibleIssueEntries().map((entry) => [entry.key, entry]));
  return Array.from(layer.querySelectorAll('.fds-issue-pin[data-issue-key]'))
    .map((pin) => entriesByKey.get(pin.dataset.issueKey))
    .filter((entry) => entry?.element?.isConnected);
}

function escapeIssueKeySelector(value) {
  if (globalThis.CSS?.escape) return globalThis.CSS.escape(value);
  return String(value).replace(/["\\]/g, '\\$&');
}

function getInspectorCardIssueEntries() {
  const card = document.getElementById('fds-inspector-card');
  const issueKeys = String(card?.dataset?.issueKeys || '').split('\n').filter(Boolean);
  return getVisibleIssueEntriesByKeys(issueKeys);
}

function positionViolationPin(
  entry = getPinnedIssueEntries(),
  { avoidElement = null } = {}
) {
  const layer = getViolationPinLayer();
  if (!layer) return;
  if (!isSummaryPanelVisible()) {
    clearViolationPins();
    return;
  }
  const targetEntries = Array.isArray(entry)
    ? entry.filter((item) => item?.element?.isConnected)
    : entry?.element?.isConnected
      ? [entry]
      : [];
  if (!targetEntries.length) {
    clearActiveViolationPin();
    return;
  }

  let visiblePinCount = 0;
  targetEntries.forEach((targetEntry) => {
    const pin = layer.querySelector(`.fds-issue-pin[data-issue-key="${escapeIssueKeySelector(targetEntry.key)}"]`);
    if (!pin) return;
    const rect = targetEntry.element.getBoundingClientRect();
    if (!isViolationPinTargetVisible(rect)) {
      pin.style.display = 'none';
      return;
    }

    visiblePinCount += 1;
    pin.style.display = 'inline-flex';
    pin.classList.toggle('has-note', Boolean(getViolationNoteForEntry(targetEntry)));
    const pinWidth = pin.offsetWidth || 28;
    const pinHeight = pin.offsetHeight || 24;
    const avoidRect = avoidElement?.style?.display !== 'none' ? avoidElement?.getBoundingClientRect?.() : null;
    const pinPosition = getBestPinPosition(rect, pinWidth, pinHeight, avoidRect);
    pin.dataset.position = pinPosition;
    const candidate = getClampedPinCandidate(
      getPinPositionCandidate(rect, pinWidth, pinHeight, pinPosition),
      pinWidth,
      pinHeight
    );
    pin.style.left = `${Math.round(candidate.left)}px`;
    pin.style.top = `${Math.round(candidate.top)}px`;
  });

  if (!visiblePinCount && !lockedPinnedIssueKey && lockedPinnedIssueKeys.length === 0) {
    clearActiveViolationPin();
  }
}

function scheduleViolationPinPositionUpdate() {
  violationPinPositionScheduler.schedule();
}

function refreshActiveInspectorPreviewPosition() {
  clearInspectorCardHideTimer();
  if (lockedPinnedIssueKey || lockedPinnedIssueKeys.length > 0) {
    restoreLockedViolationPin(getVisibleIssueEntries());
    return;
  }

  const cardEntries = getInspectorCardIssueEntries();
  if (cardEntries.length && isInspectorCardVisible()) {
    showInspectorCardForEntries(cardEntries[0].element, cardEntries);
    return;
  }

  positionViolationPin();
}

function scheduleInspectorPreviewPositionUpdate() {
  inspectorPreviewPositionScheduler.schedule();
}

function setActiveViolationPin(entry, { locked = false } = {}) {
  setActiveViolationPins(entry ? [entry] : [], { locked });
}

function setActiveViolationPins(entries = [], { locked = false } = {}) {
  const connectedEntries = entries.filter((entry) => entry?.element?.isConnected);
  const entry = connectedEntries[0];
  if (!entry) {
    clearActiveViolationPin();
    return;
  }
  document.querySelectorAll('.fds-spacing-focus').forEach((el) => {
    el.classList.remove('fds-spacing-focus');
  });
  activePinnedIssueKey = entry.key;
  if (locked) {
    lockedPinnedIssueKey = entry.key;
    lockedPinnedIssueKeys = connectedEntries.map((item) => item.key);
  }
  connectedEntries.forEach((item) => {
    if (item.category === 'spacing' && item.element?.isConnected) {
      item.element.classList.add('fds-spacing-focus');
    }
  });
  renderViolationPins(connectedEntries);
}

function scheduleIssuePreviewAfterScroll(entry, { ignoreCustomPosition = false, issueEntries = null } = {}) {
  const previewEntries = Array.isArray(issueEntries) && issueEntries.length ? issueEntries : [entry];
  const startedAt = typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
  const maxWaitMs = 900;
  const getElapsedMs = () => {
    const now = typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();
    return now - startedAt;
  };
  const updateIssuePreview = () => {
    if (!entry?.element?.isConnected) return;
    const connectedPreviewEntries = previewEntries.filter((item) => item?.element?.isConnected);
    const entriesForPreview = connectedPreviewEntries.length ? connectedPreviewEntries : [entry];
    positionViolationPin(entriesForPreview);
    const rect = entry.element.getBoundingClientRect?.();
    const isTargetReady = rect && isViolationPinTargetVisible(rect);
    if (!isTargetReady && getElapsedMs() < maxWaitMs) {
      window.setTimeout?.(updateIssuePreview, 80);
      return;
    }
    showInspectorCardForEntries(entry.element, entriesForPreview, entry.element, { ignoreCustomPosition });
  };

  window.requestAnimationFrame?.(updateIssuePreview);
  window.setTimeout?.(updateIssuePreview, 240);
  window.setTimeout?.(updateIssuePreview, maxWaitMs);
}

function scrollToIssueElement(entry, { ignoreCustomPosition = false, issueEntries = null } = {}) {
  if (!entry?.element?.isConnected) return;
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const behavior = prefersReducedMotion ? 'auto' : 'smooth';

  if (typeof entry.element.scrollIntoView === 'function') {
    try {
      entry.element.scrollIntoView({
        block: 'center',
        inline: 'center',
        behavior,
      });
      scheduleIssuePreviewAfterScroll(entry, { ignoreCustomPosition, issueEntries });
      return;
    } catch (error) {
      // Fall back to the document scroll path for older scrollIntoView implementations.
    }
  }

  if (typeof window.scrollTo !== 'function') return;
  const rect = entry.element.getBoundingClientRect();
  const target = computeElementScrollTarget({
    rect,
    scroll: { x: window.scrollX, y: window.scrollY },
    viewport: { width: window.innerWidth, height: window.innerHeight },
  });

  window.scrollTo({
    left: target.left,
    top: target.top,
    behavior,
  });

  scheduleIssuePreviewAfterScroll(entry, { ignoreCustomPosition, issueEntries });
}

function restoreLockedViolationPin(visibleEntries) {
  if (!lockedPinnedIssueKey && lockedPinnedIssueKeys.length === 0) {
    clearViolationPins();
    activePinnedIssueKey = null;
    return;
  }
  const lockedKeySet = new Set(lockedPinnedIssueKeys.length ? lockedPinnedIssueKeys : [lockedPinnedIssueKey]);
  const lockedEntries = visibleEntries.filter((entry) => lockedKeySet.has(entry.key));
  if (!lockedEntries.length) {
    clearActiveViolationPin();
    return;
  }
  setActiveViolationPins(lockedEntries, { locked: true });
  showInspectorCardForEntries(lockedEntries[0].element, lockedEntries);
}

function hideInspectorCard() {
  clearInspectorCardHideTimer();
  const card = document.getElementById('fds-inspector-card');
  if (card) card.style.display = 'none';
}

function isInspectorCardVisible() {
  const card = document.getElementById('fds-inspector-card');
  return card?.style.display === 'block';
}

function deferInspectorCardClear() {
  if (isInspectorCardVisible()) {
    scheduleTransientInspectorPreviewClear();
    return;
  }
  clearHoveredInspectionTarget();
  hideInspectorCard();
}

function clearTransientInspectorPreview() {
  if (lockedPinnedIssueKey || lockedPinnedIssueKeys.length > 0) {
    restoreLockedViolationPin(getVisibleIssueEntries());
    return;
  }

  clearViolationPins();
  activePinnedIssueKey = null;
  clearHoveredInspectionTarget();
  hideInspectorCard();
  document.querySelectorAll('.fds-list-item.is-pin-active').forEach((activeItem) => {
    activeItem.classList.remove('is-pin-active');
  });
}

function scheduleTransientInspectorPreviewClear() {
  inspectorCardHideTimer.schedule();
}

function isMovingIntoInspectorCard(event) {
  return Boolean(event?.relatedTarget?.closest?.('#fds-inspector-card'));
}

function stopSummaryPanelDrag() {
  const didMovePanel = Boolean(panelDragState?.hasMoved);
  panelDragState = null;
  clearSummaryPanelDragActiveState();
  if (didMovePanel) {
    saveCustomSummaryPanelPosition();
  }
}

function clearInspectorCardDragActiveState() {
  const card = document.getElementById('fds-inspector-card');
  card?.classList.remove('is-dragging');
  document.body?.classList.remove('fds-inspector-card-dragging');
}

function applyInspectorCardPosition(card, position) {
  if (!card || !position) return;
  card.style.left = `${Math.round(position.left)}px`;
  card.style.top = `${Math.round(position.top)}px`;
}

function applyCustomInspectorCardPosition(card = document.getElementById('fds-inspector-card')) {
  if (!card || !customInspectorCardPosition) return false;
  const rect = card.getBoundingClientRect();
  const nextPosition = computeToolbarDragPosition({
    startPointer: { x: 0, y: 0 },
    currentPointer: { x: 0, y: 0 },
    startRect: {
      left: customInspectorCardPosition.left,
      top: customInspectorCardPosition.top,
      width: rect.width || card.offsetWidth || 240,
      height: rect.height || card.offsetHeight || 84,
    },
    viewport: { width: window.innerWidth, height: window.innerHeight },
    margin: 12,
  });
  customInspectorCardPosition = nextPosition;
  applyInspectorCardPosition(card, nextPosition);
  return true;
}

function stopInspectorCardDrag() {
  const card = document.getElementById('fds-inspector-card');
  if (inspectorCardDragState?.hasMoved && card) {
    const rect = card.getBoundingClientRect();
    customInspectorCardPosition = { left: Math.round(rect.left), top: Math.round(rect.top) };
  }
  inspectorCardDragState = null;
  clearInspectorCardDragActiveState();
}

function beginInspectorCardDrag(event) {
  if (event.target?.closest?.('.fds-token-copy')) return;
  const cardHead = event.target?.closest?.('#fds-inspector-card .fds-card-head');
  if (!cardHead) return;
  const card = document.getElementById('fds-inspector-card');
  if (!card || card.style.display === 'none') return;

  const rect = card.getBoundingClientRect();
  inspectorCardDragState = {
    pointerId: event.pointerId,
    startPointer: { x: event.clientX, y: event.clientY },
    startRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    hasMoved: false,
  };
  card.classList.add('is-dragging');
  document.body?.classList.add('fds-inspector-card-dragging');
  card.setPointerCapture?.(event.pointerId);
  clearInspectorCardHideTimer();
  event.preventDefault();
  event.stopPropagation();
}

function moveInspectorCardDrag(event) {
  if (!inspectorCardDragState || inspectorCardDragState.pointerId !== event.pointerId) return;
  const card = document.getElementById('fds-inspector-card');
  if (!card) return;

  const nextPosition = computeToolbarDragPosition({
    startPointer: inspectorCardDragState.startPointer,
    currentPointer: { x: event.clientX, y: event.clientY },
    startRect: inspectorCardDragState.startRect,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    margin: 12,
  });

  inspectorCardDragState.hasMoved = true;
  customInspectorCardPosition = nextPosition;
  applyInspectorCardPosition(card, nextPosition);
  clearInspectorCardHideTimer();
  const pinnedEntries = getPinnedIssueEntries();
  if (pinnedEntries.length) {
    positionViolationPin(pinnedEntries, { avoidElement: card });
  }
  event.preventDefault();
}

function beginSummaryPanelDrag(event) {
  if (event.target?.closest?.('.fds-panel-actions')) return;
  const panelHead = event.target?.closest?.('#fds-summary-panel .fds-panel-head');
  if (!panelHead) return;

  const panel = document.getElementById('fds-summary-panel');
  if (!panel) return;

  const rect = panel.getBoundingClientRect();
  panelDragState = {
    pointerId: event.pointerId,
    startPointer: { x: event.clientX, y: event.clientY },
    startRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    hasMoved: false,
  };

  isSummaryPanelDockedToToolbar = false;
  applySummaryPanelDragActiveState({ panel, rect, pointerId: event.pointerId });
  event.preventDefault();
}

function moveSummaryPanelDrag(event) {
  if (!panelDragState || panelDragState.pointerId !== event.pointerId) return;
  const panel = document.getElementById('fds-summary-panel');
  if (!panel) return;

  const nextPosition = computeToolbarDragPosition({
    startPointer: panelDragState.startPointer,
    currentPointer: { x: event.clientX, y: event.clientY },
    startRect: panelDragState.startRect,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    margin: 12,
  });

  panelDragState.hasMoved = true;
  applySummaryPanelPosition(panel, nextPosition);
}

function clampSummaryPanelHeight(height, top = 12) {
  const margin = 12;
  const minHeight = 220;
  const maxHeight = Math.max(minHeight, window.innerHeight - top - margin);
  return Math.round(clampPosition(height, minHeight, maxHeight));
}

function applyCustomSummaryPanelHeight(panel = getSummaryPanel()) {
  if (!panel || !customSummaryPanelHeight) return false;
  const rect = panel.getBoundingClientRect();
  const top = Number.isFinite(rect.top) ? rect.top : 12;
  const height = clampSummaryPanelHeight(customSummaryPanelHeight, top);
  customSummaryPanelHeight = height;
  panel.classList.add('has-custom-height');
  panel.style.setProperty('--fds-summary-custom-height', `${height}px`);
  panel.style.height = `${height}px`;
  panel.style.overflow = 'hidden';
  return true;
}

function clearCustomSummaryPanelHeight(panel = getSummaryPanel()) {
  customSummaryPanelHeight = null;
  if (!panel) return false;
  panel.classList.remove('has-custom-height', 'is-user-resizing');
  panel.style.removeProperty('--fds-summary-custom-height');
  panel.style.height = '';
  panel.style.overflow = '';
  return true;
}

function beginSummaryPanelResize(event) {
  const handle = event.target?.closest?.('.fds-panel-resize-handle');
  if (!handle || event.button !== 0) return;
  const panel = getSummaryPanel();
  if (!panel || panel.style.display !== 'block') return;
  event.preventDefault();
  event.stopPropagation();

  const rect = panel.getBoundingClientRect();
  const nextPosition = {
    left: Math.round(rect.left),
    top: Math.round(rect.top),
  };
  customSummaryPanelPosition = nextPosition;
  applySummaryPanelPosition(panel, nextPosition);
  panel.style.bottom = 'auto';

  panelResizeState = {
    pointerId: event.pointerId,
    startY: event.clientY,
    startHeight: rect.height || panel.offsetHeight || 0,
    top: rect.top,
    hasMoved: false,
  };
  panel.classList.add('is-user-resizing', 'has-custom-height');
  document.body?.classList?.add?.('fds-panel-resizing');
  customSummaryPanelHeight = clampSummaryPanelHeight(panelResizeState.startHeight, rect.top);
  applyCustomSummaryPanelHeight(panel);

  if (typeof handle.setPointerCapture === 'function') {
    try {
      handle.setPointerCapture(event.pointerId);
    } catch {}
  }
}

function moveSummaryPanelResize(event) {
  if (!panelResizeState || panelResizeState.pointerId !== event.pointerId) return;
  const panel = getSummaryPanel();
  if (!panel) return;
  event.preventDefault();
  const deltaY = event.clientY - panelResizeState.startY;
  customSummaryPanelHeight = clampSummaryPanelHeight(panelResizeState.startHeight + deltaY, panelResizeState.top);
  panelResizeState.hasMoved = true;
  applyCustomSummaryPanelHeight(panel);
}

function stopSummaryPanelResize() {
  const panel = getSummaryPanel();
  panelResizeState = null;
  panel?.classList?.remove?.('is-user-resizing');
  document.body?.classList?.remove?.('fds-panel-resizing');
  if (panel && customSummaryPanelHeight) {
    applyCustomSummaryPanelHeight(panel);
  }
}

function saveCustomSummaryPanelPosition() {
  const panel = document.getElementById('fds-summary-panel');
  if (!panel) return;
  const rect = panel.getBoundingClientRect();
  customSummaryPanelPosition = {
    left: Math.round(rect.left),
    top: Math.round(rect.top),
  };
}

function applyCustomSummaryPanelPosition() {
  const panel = document.getElementById('fds-summary-panel');
  return applyCustomSummaryPanelPositionStyle({
    panel,
    position: customSummaryPanelPosition,
  });
}

function getToolbarFilterButton(filter = activeFilter) {
  const normalizedFilter = normalizeActiveFilter(filter);
  if (!normalizedFilter) return null;
  const buttonId = BUTTON_META?.[normalizedFilter]?.id;
  if (buttonId) {
    const button = document.getElementById(buttonId);
    if (button) return button;
  }
  return document.querySelector(`#fds-toolbar [data-filter="${normalizedFilter}"]`);
}

function getSummaryPanelPositionForToolbarButton(anchorElement) {
  const panel = getSummaryPanel();
  if (!panel || !anchorElement) return null;
  const buttonRect = anchorElement.getBoundingClientRect?.();
  const panelRect = panel.getBoundingClientRect?.();
  if (!buttonRect || !panelRect?.width) return null;

  const gap = 16;
  const margin = 12;
  const left = clampPosition(
    buttonRect.left + (buttonRect.width / 2) - (panelRect.width / 2),
    margin,
    Math.max(margin, window.innerWidth - panelRect.width - margin)
  );
  const bottom = clampPosition(
    window.innerHeight - buttonRect.top + gap,
    margin,
    Math.max(margin, window.innerHeight - SUMMARY_PANEL_MIN_HEIGHT - margin)
  );

  return { left: Math.round(left), bottom: Math.round(bottom) };
}

function positionSummaryPanelForToolbarButton(anchorElement, { animate = true } = {}) {
  const panel = getSummaryPanel();
  if (!panel || panel.style.display !== 'block' || !anchorElement) return false;
  const nextPosition = getSummaryPanelPositionForToolbarButton(anchorElement);
  if (!nextPosition) return false;

  const fromRect = panel.getBoundingClientRect?.();
  panel.style.left = `${nextPosition.left}px`;
  panel.style.top = 'auto';
  panel.style.bottom = `${nextPosition.bottom}px`;
  panel.style.right = '';
  panel.style.setProperty('--fds-summary-panel-bottom', `${nextPosition.bottom}px`);
  customSummaryPanelPosition = null;

  const toRect = panel.getBoundingClientRect?.();
  if (animate && fromRect && toRect) {
    getFDSMotion()?.animateSummaryPanelMove?.(panel, { fromRect, toRect });
  }
  return true;
}

function restoreExpandedToolbarAndPanelPosition({
  preserveSummaryPanelPosition = false,
  resetSummaryPanelPosition = true,
} = {}) {
  isSummaryPanelDockedToToolbar = false;
  resetToolbarFloatingPosition();
  if (preserveSummaryPanelPosition && applyCustomSummaryPanelPosition()) return;
  if (!resetSummaryPanelPosition) return;
  resetSummaryPanelFloatingPosition();
}

function positionDockedSummaryPanel(toolbarRect) {
  const panel = document.getElementById('fds-summary-panel');
  if (!panel || panel.style.display !== 'block') return;

  const gap = 16;
  const margin = 12;
  const panelRect = panel.getBoundingClientRect();
  const left = clampPosition(
    toolbarRect.right - panelRect.width,
    margin,
    Math.max(margin, window.innerWidth - panelRect.width - margin)
  );
  const top = clampPosition(
    toolbarRect.top - panelRect.height - gap,
    margin,
    Math.max(margin, window.innerHeight - panelRect.height - margin)
  );

  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
  panel.style.bottom = 'auto';
}

function dockCollapsedToolbarAndPanel() {
  const toolbar = document.getElementById('fds-toolbar');
  if (!toolbar) return;

  const margin = 12;
  const rect = toolbar.getBoundingClientRect();
  const left = Math.max(margin, window.innerWidth - rect.width - margin);
  const top = Math.max(margin, window.innerHeight - rect.height - margin);

  toolbar.style.left = `${left}px`;
  toolbar.style.top = `${top}px`;
  toolbar.style.bottom = 'auto';
  toolbar.style.transform = 'none';

  if (isSummaryPanelVisible()) {
    positionDockedSummaryPanel({
      left,
      top,
      width: rect.width,
      height: rect.height,
      right: left + rect.width,
      bottom: top + rect.height,
    });
  }
}

function stopToolbarDrag() {
  const dragged = Boolean(dragState?.hasMoved);
  dragState = null;
  clearToolbarDragActiveState();
  if (dragged) {
    suppressToolbarClickUntil = Date.now() + 250;
  }
}

function shouldStartToolbarDrag(target) {
  if (!target) return false;
  const toolbar = document.getElementById('fds-toolbar');
  return shouldStartToolbarDragByState({
    isCollapsed: toolbar?.dataset.collapsed === 'true',
    isMoveHandleTarget: Boolean(target.closest('#fds-btn-move')),
    isInsideToolbar: Boolean(target.closest('#fds-toolbar')),
  });
}

function beginToolbarDrag(event) {
  const toolbar = document.getElementById('fds-toolbar');
  if (!toolbar || !shouldStartToolbarDrag(event.target)) return;

  const rect = toolbar.getBoundingClientRect();
  const isCollapsedDrag = toolbar.dataset.collapsed === 'true';
  dragState = {
    pointerId: event.pointerId,
    startPointer: { x: event.clientX, y: event.clientY },
    startRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    hasMoved: false,
    isActive: !isCollapsedDrag,
  };

  if (!isCollapsedDrag) {
    applyToolbarDragActiveState({ toolbar, rect, pointerId: event.pointerId });
    event.preventDefault();
  }
}

function moveToolbarDrag(event) {
  if (!dragState || dragState.pointerId !== event.pointerId) return;
  const toolbar = document.getElementById('fds-toolbar');
  if (!toolbar) return;

  const currentPointer = { x: event.clientX, y: event.clientY };
  const { movedEnough } = getToolbarDragMovement({
    startPointer: dragState.startPointer,
    currentPointer,
  });

  if (!dragState.isActive) {
    if (!movedEnough) return;

    dragState.isActive = true;
    dragState.hasMoved = true;
    applyToolbarDragActiveState({
      toolbar,
      rect: dragState.startRect,
      pointerId: event.pointerId,
    });
    event.preventDefault();
  }

  const nextPosition = getToolbarDragNextPosition({
    dragState,
    currentPointer,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    margin: 12,
  });
  if (!nextPosition) return;

  if (movedEnough) {
    dragState.hasMoved = true;
  }

  applyToolbarDragPosition(toolbar, nextPosition);

  if (isSummaryPanelDockedToToolbar && isSummaryPanelVisible()) {
    positionDockedSummaryPanel({
      left: nextPosition.left,
      top: nextPosition.top,
      width: dragState.startRect.width,
      height: dragState.startRect.height,
      right: nextPosition.left + dragState.startRect.width,
      bottom: nextPosition.top + dragState.startRect.height,
    });
  }
}

function dismissToolbar() {
  isDismissedByUser = true;
  isExtensionVisible = false;
  clearConnectedMessageTimer();
  stopBridgePolling();
  setRootVisibility(false);
  hideTooltip();
  hideSummaryPanel();
  hideInspectorCard();
  clearScan();
  safeRuntimeSendMessage({ action: 'SET_ACTIVE', state: false }).catch(() => {
    setTimeout(() => {
      safeRuntimeSendMessage({ action: 'SET_ACTIVE', state: false }).catch(() => {});
    }, 150);
  });
}

function getToolbarModel() {
  const mode = getPresentationMode(
    toolbarMode,
    typeof window !== 'undefined' ? window.innerWidth : Number.POSITIVE_INFINITY
  );

  const baseModel = createToolbarModel({
    mode,
    activeFilter,
    isFigmaConnected,
    scanData,
    options: {
      collapsed: false,
    },
  });

  const visibilityState = getToolbarModelVisibilityState({
    mode,
    defaultMode: TOOLBAR_MODES.DEFAULT,
    isCollapsed: isToolbarCollapsed,
    activeFilter,
  });
  isToolbarCollapsed = visibilityState.nextIsCollapsed;

  if (!visibilityState.shouldCollapseToolbar) {
    return baseModel;
  }

  return createCollapsedToolbarModel({
    baseModel,
    collapsedWidth: TOOLBAR_SPEC.geometry.collapsedWidth,
    activeFilter,
  });
}

function syncToolbar() {
  const root = document.getElementById('fds-root');
  const toolbar = document.getElementById('fds-toolbar');
  if (!root || !toolbar) return;

  const model = getToolbarModel();
  const markup = renderToolbarMarkup(model).trim();
  applyToolbarSyncState({
    root,
    toolbar,
    model,
    isCollapsed: isToolbarCollapsed,
    isScanning,
    scanStatusText,
    applyToolbarSpecVariables,
  });
  root.dataset.pageInteractionShield = activeFilter || isScanning ? 'active' : 'idle';

  replaceToolbarMarkupIfChanged({
    toolbar,
    markup,
    onBeforeReplace: hideTooltip,
    onAfterReplace: bindToolbarEvents,
  });
}

function getViolationCountByFilter(filter) {
  return countViolationsByFilter(scanData, filter);
}

function updateToolbarIndicators() {
  const root = document.getElementById('fds-root');
  if (!root) return;
  if (toolbarMode === TOOLBAR_MODES.DEFAULT) {
    syncToolbar();
  } else {
    root.dataset.toolbarMode = toolbarMode;
    syncToolbar();
  }
}

function clearScan() {
  clearInspectionMarks();
  scanData = createEmptyScanData();
  setScanningState(false);
  updateToolbarIndicators();
}

async function checkBridgeConnection() {
  if (!isExtensionVisible || isDismissedByUser) return;
  if (bridgeCheckInFlight) return;
  bridgeCheckInFlight = true;
  try {
    const response = await safeRuntimeSendMessage({ action: 'BRIDGE_HEALTH' });
    const nextConnected = Boolean(response?.connected);
    const nextPluginId = response?.primaryActivePluginId || response?.reportedPluginId || null;
    if (nextConnected) {
      bridgeDisconnectStreak = 0;
      isFigmaConnected = true;
      const pluginChanged = nextPluginId && nextPluginId !== activeBridgePluginId;
      activeBridgePluginId = nextPluginId || activeBridgePluginId;
      bridgeConnectionTier = response?.connectionTier || 'legacy';
      bridgeConnectionSummary = response?.connectionSummary || '브리지 연결됨';
      bridgeConnectionDetail =
        response?.connectionDetail ||
        '브리지 연결은 확인됐지만 최신 transport 상태 정보는 제한될 수 있습니다.';
      if (pluginChanged || !bridgeInspectorSpecOverrides) {
        void refreshBridgeInspectorSpecs().then(() => {
          if (isSummaryPanelVisible()) {
            updateSummaryUI();
          }
        });
      }
    } else {
      bridgeDisconnectStreak += 1;
      const shouldHoldPreviousConnection =
        isFigmaConnected && bridgeDisconnectStreak < BRIDGE_DISCONNECT_GRACE_SAMPLES;

      if (shouldHoldPreviousConnection) {
        bridgeConnectionTier = response?.bridgeOnline ? 'modern' : bridgeConnectionTier;
        bridgeConnectionSummary = '브리지 연결 확인 중';
        bridgeConnectionDetail = '브리지 세션 신호가 일시적으로 흔들려 이전 연결 상태를 잠시 유지합니다.';
      } else {
        isFigmaConnected = false;
        activeBridgePluginId = null;
        bridgeInspectorSpecOverrides = null;
        bridgeColorTokenRegistry = { colors: {}, meta: { colorTokenCount: 0, colorVariableCount: 0 } };
        bridgeTokenFileName = null;
        bridgeTokenPageName = null;
        bridgeConnectionTier = 'offline';
        bridgeConnectionSummary = response?.connectionSummary || '브리지 연결 안 됨';
        bridgeConnectionDetail = response?.connectionDetail || '브리지 연결이 끊겼거나 세션이 없습니다.';
      }
    }
  } catch (error) {
    bridgeDisconnectStreak += 1;
    if (isFigmaConnected && bridgeDisconnectStreak < BRIDGE_DISCONNECT_GRACE_SAMPLES) {
      bridgeConnectionSummary = '브리지 연결 확인 중';
      bridgeConnectionDetail = '브리지 health 요청이 일시적으로 실패해 이전 연결 상태를 잠시 유지합니다.';
    } else {
      isFigmaConnected = false;
      activeBridgePluginId = null;
      bridgeInspectorSpecOverrides = null;
      bridgeColorTokenRegistry = { colors: {}, meta: { colorTokenCount: 0, colorVariableCount: 0 } };
      bridgeTokenFileName = null;
      bridgeTokenPageName = null;
      bridgeConnectionTier = 'offline';
      bridgeConnectionSummary = '브리지 연결 안 됨';
      bridgeConnectionDetail = '브리지 연결이 끊겼거나 세션이 없습니다.';
    }
  } finally {
    bridgeCheckInFlight = false;
  }
  updateConnectionUI();
}

function updateConnectionUI() {
  const root = document.getElementById('fds-root');
  if (!root || !isExtensionVisible || isDismissedByUser) return;

  clearConnectedMessageTimer();
  toolbarMode = getNextToolbarMode({
    isFigmaConnected,
    previousConnectionState,
    hasTokenSource: hasSnapshotTokenSource || Boolean(activeTokenSource?.registry?.meta?.colorTokenCount),
  });

  if (toolbarMode === TOOLBAR_MODES.CONNECTED_MESSAGE) {
    connectedMessageTimer = setTimeout(() => {
      const currentRoot = document.getElementById('fds-root');
      if (!currentRoot || !isFigmaConnected || !isExtensionVisible || isDismissedByUser) return;
      toolbarMode = TOOLBAR_MODES.DEFAULT;
      syncToolbar();
    }, 1800);
  }

  previousConnectionState = isFigmaConnected;
  root.classList.toggle('fds-disconnected', !isFigmaConnected);
  syncToolbar();
  if (isSummaryPanelVisible()) {
    updateSummaryUI();
  }
}

function handleToolbarFilterAction(action) {
  if (action.type === 'open-active-summary') {
    openSummaryPanelForActiveFilter({ anchorFilter: action.filter });
    hideTooltip();
    return;
  }

  if (action.type === 'toggle-active-filter') {
    setToolbarCollapsed(!isToolbarCollapsed);
    syncToolbar();
    isSummaryPanelDockedToToolbar = isToolbarCollapsed;
    if (isSummaryPanelVisible()) {
      updateSummaryUI();
    } else if (!isSummaryPanelDismissed) {
      isSummaryPanelDismissed = false;
      showSummaryPanel();
    }
    if (isToolbarCollapsed) {
      dockCollapsedToolbarAndPanel();
    } else {
      restoreExpandedToolbarAndPanelPosition({ preserveSummaryPanelPosition: Boolean(customSummaryPanelPosition) });
    }
    hideTooltip();
    return;
  }

  if (action.type === 'activate-filter') {
    clearCustomSummaryPanelHeight();
    setActiveFilter(action.filter);
    openSummaryPanelForActiveFilter({ anchorFilter: action.filter });
    hideTooltip();
  }
}

function bindToolbarEvents() {
  bindToolbarPointerEvents({
    onPointerDown: beginToolbarDrag,
    onPointerMove: moveToolbarDrag,
    onPointerUp: stopToolbarDrag,
    onPointerCancel: stopToolbarDrag,
    onMouseLeave: hideTooltip,
  });

  bindToolbarButtonHoverEvents({
    onShowTooltip: showToolbarButtonTooltip,
    onHideTooltip: hideTooltip,
  });

  clearToolbarMoveButtonClick();

  bindToolbarFilterButtonEvents({
    onHideTooltip: hideTooltip,
    getAction: (button) => getToolbarFilterClickAction({
      now: Date.now(),
      suppressUntil: suppressToolbarClickUntil,
      nextFilter: normalizeActiveFilter(button.dataset.filter),
      activeFilter,
      isSummaryPanelVisible: isSummaryPanelVisible(),
      isSummaryPanelDismissed,
    }),
    onAction: handleToolbarFilterAction,
  });

  bindToolbarCommandButtonEvents({
    onHideTooltip: hideTooltip,
    onRefresh: () => {
      if (isScanning) return;
      if (!isExtensionVisible || isDismissedByUser) return;
      void scan('페이지 위반 수를 다시 계산하는 중입니다.');
      if (!isSummaryPanelDismissed) {
        showSummaryPanel();
      }
    },
    onClose: () => {
      dismissToolbar();
    },
  });

  bindSummaryPanelCloseButton({
    onClose: () => {
      dismissSummaryPanel();
    },
  });
}

function createUI() {
  if (document.getElementById('fds-root')) return;

  applyThemeVariables();
  ensureValidActiveFilter();
  const root = document.createElement('div');
  root.id = 'fds-root';
  root.setAttribute('data-fds-build', FDS_BUILD);
  root.dataset.toolbarMode = toolbarMode;
  root.dataset.visible = 'true';
  console.info('[FDS Inspector] build:', FDS_BUILD);
  applyToolbarSpecVariables(root);
  root.innerHTML = `
    <div id="fds-page-interaction-shield" class="fds-page-interaction-shield" aria-hidden="true"></div>
    <div id="fds-text-color-highlight-layer" class="fds-text-color-highlight-layer" aria-hidden="true"></div>
    <div id="fds-gap-highlight-layer" class="fds-gap-highlight-layer" aria-hidden="true"></div>
    <div id="fds-radius-highlight-layer" class="fds-radius-highlight-layer" aria-hidden="true"></div>
    <div id="fds-issue-pin-layer" class="fds-issue-pin-layer" aria-hidden="true"></div>
    <div id="fds-toolbar" class="fds-toolbar" role="toolbar" aria-label="FDS Inspector toolbar"></div>
    <div id="fds-summary-panel" class="fds-summary-card" style="display:none;"></div>
    <div id="fds-inspector-card" class="fds-card" style="display:none;"></div>
  `;
  const mountPoint = document.body || document.documentElement;
  if (!mountPoint) return;
  mountPoint.appendChild(root);
  bindPageInteractionShieldEvents(root);

  bindViewportEvents();
  void loadTokenSourceFromStorage();
  void refreshSnapshotInspectorSpecs().then(() => {
    updateConnectionUI();
    if (isSummaryPanelVisible()) updateSummaryUI();
  });
  syncToolbar();
  resetToolbarFloatingPosition();
}

function bindPageInteractionShieldEvents(root = document.getElementById('fds-root')) {
  const shield = root?.querySelector?.('#fds-page-interaction-shield');
  if (!shield || shield.dataset.bound === 'true') return;
  shield.dataset.bound = 'true';
  shield.addEventListener('wheel', handlePageInteractionShieldWheel, { capture: true, passive: false });
  [
    'pointerover',
    'pointerenter',
    'pointermove',
    'pointerdown',
    'pointerup',
    'pointercancel',
    'mouseover',
    'mouseenter',
    'mousemove',
    'mousedown',
    'mouseup',
    'mouseout',
    'mouseleave',
    'click',
    'dblclick',
    'contextmenu',
  ].forEach((eventName) => {
    shield.addEventListener(eventName, (event) => {
      event.stopPropagation();
      if (eventName === 'click' || eventName === 'dblclick' || eventName === 'contextmenu') {
        event.preventDefault();
      }
    }, true);
  });
}

function getElementUnderShield(shield, clientX, clientY) {
  const previousPointerEvents = shield.style.pointerEvents;
  shield.style.pointerEvents = 'none';
  const element = document.elementFromPoint(clientX, clientY);
  shield.style.pointerEvents = previousPointerEvents;
  return element;
}

function getScrollableAncestor(element, deltaX = 0, deltaY = 0) {
  const axis = Math.abs(deltaX) > Math.abs(deltaY) ? 'x' : 'y';
  let current = element;
  while (current && current !== document.documentElement) {
    const style = window.getComputedStyle(current);
    const overflow = axis === 'x' ? style.overflowX : style.overflowY;
    const canScroll = /(auto|scroll|overlay)/.test(overflow);
    const hasScrollableArea = axis === 'x'
      ? current.scrollWidth > current.clientWidth
      : current.scrollHeight > current.clientHeight;
    if (canScroll && hasScrollableArea) return current;
    current = current.parentElement;
  }
  return document.scrollingElement || document.documentElement;
}

function handlePageInteractionShieldWheel(event) {
  const shield = event.currentTarget;
  const target = getElementUnderShield(shield, event.clientX, event.clientY);
  const scrollTarget = getScrollableAncestor(target, event.deltaX, event.deltaY);
  if (!scrollTarget) return;

  event.preventDefault();
  event.stopPropagation();
  scrollTarget.scrollBy({
    left: event.deltaX,
    top: event.deltaY,
    behavior: 'auto'
  });
}

function bindViewportEvents() {
  if (hasBoundViewportEvents) return;
  hasBoundViewportEvents = true;

  window.addEventListener('resize', () => {
    const viewportWidthChanged = window.innerWidth !== lastViewportWidth;
    lastViewportWidth = window.innerWidth;
    if (!isExtensionVisible || isDismissedByUser) return;
    if (viewportWidthChanged && lockedPinnedIssueKeys.length > 0) {
      pendingResponsiveLockedIssueKeys = [...lockedPinnedIssueKeys];
    }
    stopToolbarDrag();
    stopSummaryPanelDrag();
    syncToolbar();
    hideTooltip();
    if (isToolbarCollapsed && isSummaryPanelDockedToToolbar) {
      dockCollapsedToolbarAndPanel();
    }
    if (isSummaryPanelVisible()) {
      updateSummaryUI();
    }
    applyCustomInspectorCardPosition();
    scheduleInspectorPreviewPositionUpdate();
    scheduleTextColorHighlightUpdate();
    scheduleGapHighlightUpdate();
    scheduleRadiusHighlightUpdate();
    if (viewportWidthChanged) {
      responsiveViewportGeometryScheduler.schedule();
    }
  });

  window.addEventListener('scroll', () => {
    if (!isExtensionVisible || isDismissedByUser) return;
    hideTooltip();
    scheduleInspectorPreviewPositionUpdate();
    scheduleTextColorHighlightUpdate();
    scheduleGapHighlightUpdate();
    scheduleRadiusHighlightUpdate();
  }, { passive: true });

  document.addEventListener('scroll', () => {
    if (!isExtensionVisible || isDismissedByUser) return;
    hideTooltip();
    scheduleInspectorPreviewPositionUpdate();
    scheduleTextColorHighlightUpdate();
    scheduleGapHighlightUpdate();
    scheduleRadiusHighlightUpdate();
  }, { passive: true, capture: true });

  document.addEventListener('keydown', (event) => {
    if (!isExtensionVisible || isDismissedByUser) return;
    if (event.key !== 'Escape') return;
    hideTooltip();
    hideInspectorCard();
    if (isSummaryPanelVisible()) {
      dismissSummaryPanel();
      event.stopPropagation();
    }
  });

  window.addEventListener('pointerup', stopToolbarDrag);
  window.addEventListener('pointercancel', stopToolbarDrag);
  window.addEventListener('pointermove', moveInspectorCardDrag);
  window.addEventListener('pointerup', stopInspectorCardDrag);
  window.addEventListener('pointercancel', stopInspectorCardDrag);
  window.addEventListener('pointerup', stopSummaryPanelDrag);
  window.addEventListener('pointercancel', stopSummaryPanelDrag);
  window.addEventListener('pointermove', moveSummaryPanelResize);
  window.addEventListener('pointerup', stopSummaryPanelResize);
  window.addEventListener('pointercancel', stopSummaryPanelResize);
}

function getPageScanElements() {
  return Array.from(document.body.querySelectorAll('*')).filter((element) => !element.closest('#fds-root'));
}

function isScannableElement(element) {
  if (!element || IGNORED_SCAN_TAGS.has(element.tagName)) return false;
  if (typeof HTMLElement !== 'undefined' && !(element instanceof HTMLElement)) return false;
  const rect = element.getBoundingClientRect();
  return rect.width >= 1 && rect.height >= 1;
}

function markElementScanResult({ element, issues, suggestions, entries }) {
  const elementEntries = entries.filter((entry) => entry.element === element);
  if (elementEntries.length > 0) {
    const issueKeys = elementEntries.map((entry) => entry.key);
    element.setAttribute('data-fds-issue-keys', JSON.stringify(issueKeys));
  } else {
    element.removeAttribute('data-fds-issue-keys');
  }

  if (issues.length > 0 || suggestions.length > 0) {
    const hasDanger = elementEntries.some((entry) => entry.tone === 'danger');
    const hasWarning = elementEntries.some((entry) => entry.tone === 'warning');
    element.classList.add('fds-inspected');
    if (issues.length > 0) {
      element.classList.add('fds-violation');
      element.classList.toggle('fds-violation-danger', hasDanger);
      element.classList.toggle('fds-violation-warning', !hasDanger && hasWarning);
    }
    element.setAttribute('data-fds-msg', JSON.stringify([...issues, ...suggestions]));
    element.setAttribute('data-fds-type', hasDanger ? 'danger' : issues.length > 0 ? 'warning' : 'success');
    applyElementSpacingHighlightMetadata(element, elementEntries);
  } else {
    element.classList.remove('fds-inspected', 'fds-violation', 'fds-violation-danger', 'fds-violation-warning');
    element.removeAttribute('data-fds-msg');
    element.removeAttribute('data-fds-type');
    clearElementSpacingHighlightMetadata(element);
  }
}

function markScannedElementsFromEntries() {
  const groupedEntries = new Map();
  scanData.issueEntries.forEach((entry) => {
    if (!entry.element) return;
    if (!groupedEntries.has(entry.element)) groupedEntries.set(entry.element, []);
    groupedEntries.get(entry.element).push(entry);
  });

  groupedEntries.forEach((entries, element) => {
    markElementScanResult({
      element,
      issues: entries.map((entry) => entry.message),
      suggestions: [],
      entries,
    });
  });
  renderTextColorHighlights(scanData.issueEntries);
  renderGapHighlights(scanData.issueEntries);
  renderRadiusHighlights(scanData.issueEntries);
}

function getElementSummaryLabel(element) {
  if (!element) return 'element';
  const tagName = element.tagName ? element.tagName.toLowerCase() : 'element';
  const idLabel = element.id ? `#${element.id}` : '';
  const className = typeof element.className === 'string' && element.className.trim()
    ? `.${element.className.trim().split(/\s+/)[0]}`
    : '';
  return `${tagName}${idLabel}${className}`;
}

function addExcludedEntry(element) {
  if (!(element instanceof Element)) return null;
  const rect = element.getBoundingClientRect?.();
  const excludedIndex = (scanData?.excludedEntries?.length || 0) + 1;
  const width = Number(rect?.width || 0);
  const height = Number(rect?.height || 0);
  return {
    id: `excluded-${excludedIndex}`,
    key: `excluded-${excludedIndex}`,
    element,
    category: 'excluded',
    label: getElementSummaryLabel(element),
    reason: `렌더링 기준 미만 (${Number.isFinite(width) ? Math.round(width) : 0}×${Number.isFinite(height) ? Math.round(height) : 0}px)`,
    message: `제외됨: ${getElementSummaryLabel(element)} (${width ? '미검사' : '비표시'})`,
    tone: 'warning',
    tag: getElementSummaryLabel(element),
    value: 'excluded',
  };
}

async function runSingleScanPass() {
  ensureValidActiveFilter();
  scanData = createEmptyScanData();
  clearInspectionMarks();

  if (shouldForceScanErrorForVerification()) {
    throw new Error('Forced scan error for local verification');
  }

  const runner = createContentScanRunner({
    batchSize: SCAN_BATCH_SIZE,
    batchBudgetMs: SCAN_BATCH_BUDGET_MS,
    maxElements: MAX_SCAN_ELEMENTS,
    now: () => performance.now(),
    getElements: getPageScanElements,
    isElementVisible: isScannableElement,
    getStyles: (element) => window.getComputedStyle(element),
    inspectElement: ({ filterKey, styles, element }) => getInspectionForFilter(filterKey, styles, element),
    addExcludedEntry,
    addIssueEntry,
    markElement: () => {},
    yieldToBrowser,
  });
  scanData = await runner.run({ filters: FILTER_KEYS, activeFilter, collectAllEntries: !activeFilter });
  if (!isExtensionVisible || isDismissedByUser) {
    clearInspectionMarks();
    return scanData;
  }

  const nextActiveFilter = activeFilter || getPreferredViolationFilter(scanData.counts);
  if (nextActiveFilter && nextActiveFilter !== activeFilter) {
    setActiveFilter(nextActiveFilter);
  }

  refreshActiveScanBreakdown();
  await loadViolationNotesForPage();
  markScannedElementsFromEntries();
  updateToolbarIndicators();
  if (isSummaryPanelVisible()) {
    updateSummaryUI();
  }
  return scanData;
}

async function scan(reason = '') {
  queuedScanReason = reason || queuedScanReason;
  if (activeScanPromise) {
    return activeScanPromise;
  }

  activeScanPromise = (async () => {
    const scanStartedAt = performance.now();
    const nextReason = queuedScanReason;
    queuedScanReason = '';
    scanErrorText = '';
    setScanningState(true, nextReason);
    updateToolbarIndicators();
    if (isSummaryPanelVisible()) {
      updateSummaryUI();
    }

    try {
      await runSingleScanPass();
      const scanDurationMs = Math.round(performance.now() - scanStartedAt);
      lastScanMetrics = {
        durationMs: scanDurationMs,
        scannedElementCount: Number(scanData?.meta?.scannedElementCount || 0),
        skippedElementCount: Number(scanData?.meta?.skippedElementCount || 0),
        batchYieldCount: Number(scanData?.meta?.batchYieldCount || 0),
        totalElementCount: Number(scanData?.meta?.totalElementCount || 0),
        truncated: Boolean(scanData?.meta?.truncated),
        issueCount: Number(scanData?.issueEntries?.length || 0),
        activeFilter: activeFilter || null,
      };
      console.info('[FDS Inspector] scan metrics', lastScanMetrics);
      return scanData;
    } catch (error) {
      scanErrorText = '검사 중 오류가 발생했습니다. 새로고침 버튼으로 다시 검사해 주세요.';
      console.error('[FDS Inspector] scan failed', error);
      return scanData;
    } finally {
      setScanningState(false);
      updateToolbarIndicators();
      if (isSummaryPanelVisible()) {
        updateSummaryUI();
      }

      activeScanPromise = null;

      if (queuedScanReason && isExtensionVisible && !isDismissedByUser) {
        const rerunReason = queuedScanReason;
        queuedScanReason = '';
        void scan(rerunReason);
      }
    }
  })();

  return activeScanPromise;
}

function refreshActiveScanBreakdown() {
  scanData.violations = scanData.issueEntries.map((entry) => entry.message);
  scanData.colorBreakdown = scanData.issueEntries.reduce((acc, entry) => {
    if (entry.category !== 'color') return acc;
    if (entry.tone === 'danger') acc.missing += 1;
    if (entry.tone === 'warning') acc.primitiveRaw += 1;
    return acc;
  }, { missing: 0, primitiveRaw: 0 });
  if (activeFilter && scanData.counts && typeof scanData.counts[activeFilter] === 'number') {
    scanData.counts[activeFilter] = scanData.issueEntries.filter((entry) => entry.category === activeFilter).length;
  }
}

function clearInspectionMarks() {
  cancelScheduledVisualUpdates();
  clearGapHighlights();
  clearRadiusHighlights();
  clearTextColorHighlights();
  document.querySelectorAll('.fds-inspected, .fds-violation, .fds-hover-target').forEach((el) => {
    el.classList.remove('fds-inspected', 'fds-violation', 'fds-violation-danger', 'fds-violation-warning', 'fds-hover-target');
    el.removeAttribute('data-fds-msg');
    el.removeAttribute('data-fds-type');
    el.removeAttribute('data-fds-issue-keys');
    clearElementSpacingHighlightMetadata(el);
  });
  clearViolationPins();
}

function getPreferredViolationFilter(counts = {}) {
  return FILTER_KEYS.find((filterKey) => Number(counts[filterKey] || 0) > 0) || DEFAULT_FILTER;
}

function renderSummaryLoadingSkeleton({ activeFilter } = {}) {
  const tabSkeleton = activeFilter === 'color'
    ? `<div class="fds-summary-tabbar is-skeleton" aria-hidden="true">
        <span class="fds-summary-skeleton fds-summary-skeleton-tab"></span>
        <span class="fds-summary-skeleton fds-summary-skeleton-tab"></span>
        <span class="fds-summary-skeleton fds-summary-skeleton-tab"></span>
      </div>`
    : '';

  return `
    ${tabSkeleton}
    <div class="fds-summary-card-row" aria-hidden="true">
      <div class="fds-stat-box danger is-skeleton">
        <span class="fds-summary-skeleton fds-summary-skeleton-label"></span>
        <span class="fds-summary-skeleton fds-summary-skeleton-number"></span>
        <span class="fds-summary-skeleton fds-summary-skeleton-caption"></span>
      </div>
      <div class="fds-stat-box warning is-skeleton">
        <span class="fds-summary-skeleton fds-summary-skeleton-label"></span>
        <span class="fds-summary-skeleton fds-summary-skeleton-number"></span>
        <span class="fds-summary-skeleton fds-summary-skeleton-caption"></span>
      </div>
    </div>
    <div class="fds-summary-list is-skeleton" role="list" aria-label="위반 목록 로딩 중">
      <span class="fds-summary-skeleton fds-summary-skeleton-row"></span>
      <span class="fds-summary-skeleton fds-summary-skeleton-row"></span>
      <span class="fds-summary-skeleton fds-summary-skeleton-row short"></span>
    </div>
  `;
}

function hasCompletedScanForSummary() {
  return Boolean(lastScanMetrics)
    || Number(scanData?.meta?.scannedElementCount || 0) > 0
    || Number(scanData?.meta?.totalElementCount || 0) > 0;
}

  function updateSummaryUI() {
    const panel = document.getElementById('fds-summary-panel');
    if (!panel) return;
    const summaryMotion = pendingSummaryMotion;
    pendingSummaryMotion = null;
    const shouldRevealListItems = !['group-toggle', 'tab'].includes(summaryMotion?.kind);

  const sCount = scanData.suggestions.length;
  const colorTabs = activeFilter === 'color' ? getColorSummaryTabs() : [];
  const filterLabelMap = {
    color: '컬러',
    font: '폰트',
    spacing: '스페이싱',
    radius: '모서리 라운드',
  };
  const activeFilterLabel = activeFilter ? (filterLabelMap[activeFilter] || activeFilter) : '대기';
  const activeIssueEntries = activeFilter
    ? scanData.issueEntries.filter((entry) => entry.category === activeFilter)
    : scanData.issueEntries;
  if (activeFilter && activeFilter !== 'color') {
    normalizeActiveSummaryToneForCounts(getToneCountsForEntries(activeIssueEntries));
  }
  const isIdle = !activeFilter;
  const isPendingInitialSummaryScan = Boolean(activeFilter) && !hasCompletedScanForSummary();
  const isSummaryLoading = !scanErrorText && (isScanning || isPendingInitialSummaryScan);
  const hasViolations = activeIssueEntries.length > 0;
  const summaryTitle = isIdle ? '검사 정보' : `${activeFilterLabel} 위반 정보`;
  const scanStatusMarkup = isScanning
    ? `<div class="fds-summary-loading" role="status" aria-live="polite">${escapeHtml(scanStatusText || getScanStatusMessage())}</div>`
    : scanErrorText
    ? `<div class="fds-summary-loading danger" role="alert">${escapeHtml(scanErrorText)}</div>`
    : '';
  const visibleViolations = getVisibleIssueEntries();
  const visibleIssueGroups = groupIssueEntries(visibleViolations);
  const visibleListItems = visibleViolations;
  const activeToneCounts = activeFilter === 'color'
    ? getColorToneCountsForActiveSubtab()
    : getToneCountsForEntries(activeIssueEntries);
  const activeTonePatternCounts = activeFilter === 'color'
    ? getColorTonePatternCountsForActiveSubtab()
    : getTonePatternCountsForGroups(groupIssueEntries(activeIssueEntries));
  const missingColorCount = activeToneCounts.danger;
  const primitiveColorCount = activeToneCounts.warning;
  const missingColorPatternCount = activeTonePatternCounts.danger;
  const primitiveColorPatternCount = activeTonePatternCounts.warning;
  const activeIssueCount = getViolationCountByFilter(activeFilter);
  const previousList = panel.querySelector('.fds-summary-list');
  const previousListSnapshot = previousList ? previousList.innerHTML : '';
  const previousListKey = panel.dataset.summaryListKey || '';
  const previousScrollTop = previousList ? previousList.scrollTop : 0;
  const previousListRenderedHeight = previousList
    ? previousList.getBoundingClientRect?.().height
      || previousList.clientHeight
      || previousList.scrollHeight
      || 0
    : 0;
  const previousListHeight = previousList ? previousListRenderedHeight : 0;
  const previousPanelHeight = panel.offsetHeight || 0;
  const shouldAnimateListHeight = previousList !== null;
  const nextListKey = getSummaryListRenderKey(visibleListItems);
  const isListContentChanged = previousListKey !== nextListKey;
  const hasScanError = Boolean(scanErrorText);
  const listMarkup = isSummaryLoading
    ? ''
    : hasScanError
    ? '<div class="fds-list-empty danger" role="note">오류로 인해 결과를 표시할 수 없습니다. 새로고침 버튼으로 다시 검사해 주세요.</div>'
    : isIdle
    ? renderSummaryEmptyState({ isIdle: true })
    : visibleViolations.length > 0
      ? visibleIssueGroups.map((group) => `
          ${renderSummaryGroupItem(group)}
          ${group.expanded
            ? `<div class="fds-list-group-details" role="group" aria-label="${escapeHtml(`${group.chip} ${group.value} 상세 항목`)}">
                ${(group.detailEntries || group.entries).map((item) => renderSummaryListItem(withViolationNoteState(item))).join('')}
              </div>`
            : ''}
        `).join('')
      : renderSummaryEmptyState({ activeFilterLabel });
  const summaryCards = isSummaryLoading
    ? []
    : hasScanError
    ? [{
      tone: 'danger',
      label: '검사 실패',
      value: '!',
      caption: '다시 검사 필요',
      icon: 'warning',
    }]
    : createSummaryMetricCards({
      hasViolations,
      activeFilter,
      activePatternCount: visibleIssueGroups.length,
      activeIssueCount,
      suggestionCount: sCount,
      missingColorCount,
      primitiveColorCount,
      missingColorPatternCount,
      primitiveColorPatternCount,
      activeSummaryTone,
    });
  const cardRowMarkup = summaryCards.map((card) => renderSummaryMetricCard(card)).join('');
  const tabBarMarkup = renderSummaryTabBar({
    activeFilter,
    colorTabs,
    activeSummarySubtab,
  });
  const summaryBodyMarkup = isSummaryLoading
    ? renderSummaryLoadingSkeleton({ activeFilter })
    : `
      ${tabBarMarkup}
      <div class="fds-summary-card-row${!hasViolations || hasScanError ? ' is-single' : ''}">
        ${cardRowMarkup}
      </div>
      <div class="fds-summary-list is-scrollable" role="list" aria-label="위반 목록">
        ${listMarkup}
      </div>
    `;

  if (previousPanelHeight > 0) {
    panel.style.height = `${Math.max(previousPanelHeight, SUMMARY_PANEL_MIN_HEIGHT)}px`;
    panel.style.overflow = 'hidden';
  }

  panel.innerHTML = `
    <div class="fds-panel-head">
      <div class="fds-panel-title-wrap">
        <span class="fds-panel-title">${escapeHtml(summaryTitle)}</span>
      </div>
      <div class="fds-panel-actions">
        <button class="fds-panel-report" type="button" aria-label="전체 위반 요소 리포트 저장" title="전체 위반 요소 리포트 저장"${isSummaryLoading || hasScanError ? ' disabled' : ''}>${getLucideIconSvg('download', 'fds-panel-action-icon')}<span>리포트 저장</span></button>
        <button class="fds-panel-close" type="button" aria-label="패널 닫기" title="패널 닫기">${renderAssetIcon('close', 'close')}</button>
      </div>
    </div>
    <section class="fds-summary-section" aria-label="요약 및 탐색"${isSummaryLoading ? ' aria-busy="true"' : ''}>
      ${scanStatusMarkup}
      ${summaryBodyMarkup}
    </section>
    <div class="fds-panel-resize-handle" role="separator" aria-label="패널 높이 조절" title="패널 높이 조절" tabindex="0"></div>
  `;
  panel.classList.toggle('is-loading', isSummaryLoading);
  if (customSummaryPanelHeight) {
    applyCustomSummaryPanelHeight(panel);
  } else {
    panel.classList.remove('has-custom-height');
  }
  panel.dataset.summaryListKey = nextListKey;
  const nextList = panel.querySelector('.fds-summary-list');
  const nextListHeight = nextList ? nextList.scrollHeight : 0;
  const isListGrowing = nextListHeight > previousListHeight;
  const directContentPanelHeight = measureSummaryPanelTargetHeight(panel, { listHeight: nextListHeight });
  const naturalPanelHeight = measureNaturalSummaryPanelHeight(panel);
  const listDerivedPanelHeight = Math.max(
    0,
    previousPanelHeight - previousListHeight + nextListHeight,
  );
  const nextPanelHeight = directContentPanelHeight || naturalPanelHeight || listDerivedPanelHeight || previousPanelHeight;
  panel.querySelectorAll?.('.fds-summary-list-transition-ghost')?.forEach((ghostNode) => {
    ghostNode.remove();
  });
  let listTransitionGhost = null;
  const hasListTransitionGhost = shouldRevealListItems && isListContentChanged && previousList !== null && previousListSnapshot;
  if (nextList && hasListTransitionGhost) {
    listTransitionGhost = previousList.cloneNode(true);
    listTransitionGhost.classList.add('fds-summary-list-transition-ghost');
    listTransitionGhost.removeAttribute('aria-label');
    listTransitionGhost.setAttribute('aria-hidden', 'true');
    listTransitionGhost.style.position = 'absolute';
    listTransitionGhost.style.top = `${Math.max(0, nextList.offsetTop || 0)}px`;
    listTransitionGhost.style.left = '0';
    listTransitionGhost.style.right = '0';
    listTransitionGhost.style.bottom = 'auto';
    listTransitionGhost.style.height = `${previousListHeight}px`;
    listTransitionGhost.style.pointerEvents = 'none';
    listTransitionGhost.style.width = '100%';
    listTransitionGhost.style.maxWidth = '100%';
    listTransitionGhost.style.opacity = '1';
    listTransitionGhost.style.zIndex = '1';
    listTransitionGhost.style.willChange = 'transform,opacity';

    const listParent = nextList.parentElement;
    if (listParent) {
      listParent.style.position = listParent.style.position || 'relative';
      listParent.appendChild(listTransitionGhost);
    }

    nextList.style.position = 'relative';
    nextList.style.zIndex = '2';
  }
  if (shouldAnimateListHeight && nextList && previousListHeight >= 0) {
    nextList.style.height = `${previousListHeight}px`;
    nextList.style.opacity = shouldRevealListItems && isListContentChanged ? (isListGrowing ? '0.16' : '0.92') : '';
    nextList.style.transform = shouldRevealListItems && isListContentChanged ? (isListGrowing ? 'translateY(2px)' : 'translateY(-1px)') : '';
  }
  if (!isListContentChanged) {
    nextList.style.opacity = '';
    nextList.style.transform = '';
  }
  if (nextList && previousListKey === nextListKey) {
    nextList.scrollTop = Math.min(previousScrollTop, Math.max(0, nextList.scrollHeight - nextList.clientHeight));
  }
  applyVisibleIssueHighlights(visibleViolations);
  restoreLockedViolationPin(visibleListItems);

  bindSummaryPanelCloseButton({
    button: panel.querySelector('.fds-panel-close'),
    onClose: () => {
      dismissSummaryPanel();
    },
  });

  const reportButton = panel.querySelector('.fds-panel-report');
  if (reportButton) {
    reportButton.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (reportButton.disabled) return;
      saveViolationReport();
    };
  }

  panel.querySelectorAll('.fds-summary-tab[data-filter]').forEach((tab) => {
      tab.onclick = () => {
        const nextFilter = normalizeActiveFilter(tab.dataset.filter);
        if (!nextFilter) return;
        setActiveFilter(nextFilter);
      clearExpandedIssueGroups();
      requestSummaryMotion('tab');
      openSummaryPanelForActiveFilter();
    };
  });

  panel.querySelectorAll('.fds-summary-tab[data-summary-tab]').forEach((tab) => {
      tab.onclick = () => {
        if (isScanning) return;
        const nextSummarySubtab = tab.dataset.summaryTab || 'bg';
        if (nextSummarySubtab === activeSummarySubtab) return;
        const previousSummarySubtab = activeSummarySubtab;
        activeSummarySubtab = nextSummarySubtab;
        requestSummaryMotion('tab', {
          fromSummaryTab: previousSummarySubtab,
          toSummaryTab: nextSummarySubtab,
        });
        clearActiveViolationPin();
        clearExpandedIssueGroups();
        updateSummaryUI();
      };
    });

  panel.querySelectorAll('.fds-stat-box[data-summary-tone]').forEach((card) => {
    card.onclick = () => {
      if (isScanning) return;
      activeSummaryTone = card.dataset.summaryTone === 'warning' ? 'warning' : 'danger';
      clearActiveViolationPin();
      clearExpandedIssueGroups();
      requestSummaryMotion('tab');
      updateSummaryUI();
    };
  });

  panel.querySelectorAll('.fds-list-group[data-group-key]').forEach((item) => {
    item.onmouseenter = () => showToolbarButtonTooltip(item);
    item.onfocus = () => showToolbarButtonTooltip(item);
    item.onmouseleave = hideTooltip;
    item.onblur = hideTooltip;
    item.onpointerdown = hideTooltip;
    item.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const groupKey = item.dataset.groupKey;
      if (!groupKey) return;
      const nextExpandedKeys = new Set(expandedIssueGroupKeys);
      if (nextExpandedKeys.has(groupKey)) {
        nextExpandedKeys.delete(groupKey);
      } else {
        nextExpandedKeys.add(groupKey);
      }
      expandedIssueGroupKeys = nextExpandedKeys;
      clearActiveViolationPin();
      requestSummaryMotion('group-toggle');
      updateSummaryUI();
    };
  });

  panel.querySelectorAll('.fds-list-item[data-issue-key]').forEach((item) => {
    if ((item.dataset.issueKey || '') === activeIsolatedIssueKey) {
      item.classList.add('is-pin-active');
    }

    const showPin = ({ locked = false, isolate = false } = {}) => {
      const issueKey = item.dataset.issueKey;
      const issueKeys = parseIssueKeysDataset(item.dataset.issueKeys);
      const isolatedEntries = getVisibleIssueEntriesByKeys(issueKeys);
      const entry = isolatedEntries[0] || visibleListItems.find((candidate) => candidate.key === issueKey);
      if (!entry) return null;
      if (isolate) {
        applyVisibleIssueHighlights(isolatedEntries.length ? isolatedEntries : [entry]);
      }
      setActiveViolationPins(isolatedEntries.length ? isolatedEntries : [entry], { locked });
      panel.querySelectorAll('.fds-list-item.is-pin-active').forEach((activeItem) => {
        activeItem.classList.remove('is-pin-active');
      });
      item.classList.add('is-pin-active');
      return entry;
    };

    item.onmouseenter = () => showToolbarButtonTooltip(item);
    item.onfocus = () => showToolbarButtonTooltip(item);
    item.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const issueKey = item.dataset.issueKey;
      if (activeIsolatedIssueKey === issueKey) {
        activeIsolatedIssueKey = null;
        clearActiveViolationPin();
        applyVisibleIssueHighlights();
        panel.querySelectorAll('.fds-list-item.is-pin-active').forEach((activeItem) => {
          activeItem.classList.remove('is-pin-active');
        });
        return;
      }
      activeIsolatedIssueKey = issueKey;
      const entry = showPin({ locked: true, isolate: true });
      const issueKeys = parseIssueKeysDataset(item.dataset.issueKeys);
      const isolatedEntries = getVisibleIssueEntriesByKeys(issueKeys);
      scrollToIssueElement(entry, {
        ignoreCustomPosition: true,
        issueEntries: isolatedEntries.length ? isolatedEntries : entry ? [entry] : [],
      });
    };
    item.onmouseleave = hideTooltip;
    item.onblur = hideTooltip;
    item.onpointerdown = hideTooltip;
  });

  const panelHead = panel.querySelector('.fds-panel-head');
  if (panelHead) {
    panelHead.onpointerdown = beginSummaryPanelDrag;
  }
  const panelResizeHandle = panel.querySelector('.fds-panel-resize-handle');
  if (panelResizeHandle) {
    panelResizeHandle.onpointerdown = beginSummaryPanelResize;
  }
  panel.onpointermove = moveSummaryPanelDrag;
  panel.onpointerup = stopSummaryPanelDrag;
  panel.onpointercancel = stopSummaryPanelDrag;
  if (summaryMotion?.kind === 'tab') {
    const motionKind = summaryMotion.kind || summaryMotion;
    if (motionKind === 'tab') {
      const tabSwitchMotionOptions = summaryMotion?.details || {};
      getFDSMotion()?.animateTabSwitch?.(panel, tabSwitchMotionOptions);
    }
  }
  const didAnimateSummaryRefresh = !customSummaryPanelHeight && Boolean(getFDSMotion()?.animateSummaryRefresh?.(panel, {
    listChanged: isListContentChanged,
    fromPanelHeight: previousPanelHeight,
    toPanelHeight: nextPanelHeight,
    fromListHeight: previousListHeight,
    toListHeight: nextListHeight,
    shouldAnimateListHeight,
    force: false,
    listTransitionElement: listTransitionGhost,
    revealListItems: shouldRevealListItems,
  }));
  if (!didAnimateSummaryRefresh) {
    if (customSummaryPanelHeight) {
      applyCustomSummaryPanelHeight(panel);
    } else {
      panel.style.height = '';
    }
    panel.style.overflow = customSummaryPanelHeight ? 'hidden' : '';
    if (nextList) {
      nextList.style.height = '';
      nextList.style.opacity = '';
      nextList.style.overflow = '';
      nextList.style.transform = '';
      nextList.style.willChange = '';
    }
  }
  if (!didAnimateSummaryRefresh && listTransitionGhost) {
    listTransitionGhost.remove();
    listTransitionGhost = null;
  }
}

document.addEventListener('mouseover', (event) => {
  if (event.target?.closest?.('#fds-root')) return;
  if (event.target?.closest?.('#fds-inspector-card')) {
    clearInspectorCardHideTimer();
    return;
  }
  const target = getHoveredInspectionTarget(event);
  if (!target) {
    deferInspectorCardClear();
    return;
  }

  const issueEntries = getVisibleIssueEntriesForElement(target);
  if (!issueEntries.length) {
    deferInspectorCardClear();
    return;
  }

  showInspectorCardForEntries(target, issueEntries);
});

document.addEventListener('mouseout', (event) => {
  const relatedTarget = event.relatedTarget;
  if (event.target?.closest?.('#fds-root') || relatedTarget?.closest?.('#fds-root')) return;
  if (relatedTarget?.closest?.('#fds-inspector-card')) return;
  if (event.target?.closest?.('#fds-inspector-card')) {
    scheduleTransientInspectorPreviewClear();
    return;
  }
  if (relatedTarget?.closest?.('.fds-inspected')) return;
  if (event.target?.closest?.('.fds-inspected')) {
    scheduleTransientInspectorPreviewClear();
    return;
  }
  if (isInspectorCardVisible()) {
    scheduleTransientInspectorPreviewClear();
    return;
  }
  clearHoveredInspectionTarget();
  hideInspectorCard();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'PING') {
    sendResponse({
      status: 'alive',
      visible: isInspectorUIVisible(),
      dismissed: isDismissedByUser,
      scanMetrics: lastScanMetrics,
    });
    return false;
  }

  if (request.action === 'GET_SCAN_METRICS') {
    sendResponse({ status: 'success', scanMetrics: lastScanMetrics });
    return false;
  }

  if (request.action === 'RESCAN') {
    void loadTokenSourceFromStorage().then(() => {
      void refreshSnapshotInspectorSpecs().catch(() => {
        snapshotInspectorSpecOverrides = null;
      }).finally(() => {
        void scan('페이지 위반 수를 다시 계산하는 중입니다.');
        if (isSummaryPanelVisible()) updateSummaryUI();
      });
      sendResponse({ status: 'success' });
    });
    return true;
  }

  if (request.action === 'TOKEN_SOURCE_UPDATED') {
    void loadTokenSourceFromStorage().then(() => {
      void refreshSnapshotInspectorSpecs().catch(() => {
        snapshotInspectorSpecOverrides = null;
      }).finally(() => {
        if (isExtensionVisible && !isDismissedByUser) {
          void scan('토큰 정보를 반영해 위반 수를 다시 계산하는 중입니다.');
          if (isSummaryPanelVisible()) {
            updateSummaryUI();
          }
        }
      });
      sendResponse({ status: 'success' });
    });
    return true;
  }

  if (request.action === 'TOGGLE') {
    let root = document.getElementById('fds-root');
    const isVisible = Boolean(request.state);
    isExtensionVisible = isVisible;
    if (isVisible) isDismissedByUser = false;

    if (root && root.getAttribute('data-fds-build') !== FDS_BUILD) {
      clearConnectedMessageTimer();
      stopBridgePolling();
      hideTooltip();
      root.remove();
      root = null;
    }

    if (isVisible) root = ensureVisibleInspectorUI();

    if (root && !isVisible) {
      setRootVisibility(isVisible && !isDismissedByUser);
    }

    if (!isVisible) {
      clearConnectedMessageTimer();
      stopBridgePolling();
      hideTooltip();
      hideInspectorCard();
      clearScan();
      isToolbarCollapsed = false;
      isSummaryPanelDismissed = false;
    } else {
      void loadTokenSourceFromStorage().then(() => {
        if (!isExtensionVisible || isDismissedByUser) return;
        void refreshSnapshotInspectorSpecs().catch(() => {
          snapshotInspectorSpecOverrides = null;
        }).finally(() => {
          updateConnectionUI();
          void scan('초기 검사 결과를 계산하는 중입니다.');
          if (isSummaryPanelVisible()) {
            updateSummaryUI();
          }
        });
      });
    }

    sendResponse({
      status: 'success',
      visible: isInspectorUIVisible(),
      dismissed: isDismissedByUser,
    });
  }
  return true;
});
