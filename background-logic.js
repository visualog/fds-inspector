(function initBackgroundLogic(globalScope) {
  const CONTENT_SCRIPT_FILES = Object.freeze([
    'vendor/gsap.min.js',
    'toolbar-state.js',
    'toolbar-drag.js',
    'style-token-detection.js',
    'storybook-registry.js',
    'token-source.js',
    'bridge-token-source.js',
    'snapshot-token-source.js',
    'design-variables.js',
    'html-utils.js',
    'content-render.js',
    'content-scan-utils.js',
    'content-theme.js',
    'content-state-utils.js',
    'content-inspection.js',
    'content-summary-model.js',
    'content-violation-report.js',
    'content-summary-panel.js',
    'content-toolbar-ui.js',
    'content-bridge-specs.js',
    'content-token-suggestions.js',
    'content-floating-inspector.js',
    'content-scan-runner.js',
    'content-motion.js',
    'content.js',
  ]);
  const CONTENT_CSS_FILES = Object.freeze(['overlay.css']);

  function normalizeString(value) {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  function normalizePluginIds(value) {
    const items = Array.isArray(value)
      ? value
      : value == null
        ? []
        : [value];

    return items
      .map((entry) => {
        if (typeof entry === 'string') {
          return normalizeString(entry);
        }

        if (entry && typeof entry === 'object') {
          return (
            normalizeString(entry.id) ||
            normalizeString(entry.pluginId) ||
            normalizeString(entry.value) ||
            normalizeString(entry.name)
          );
        }

        return null;
      })
      .filter(Boolean);
  }

  function readSessionState(payload) {
    return (
      normalizeString(payload?.session?.state) ||
      normalizeString(payload?.sessionState) ||
      normalizeString(payload?.connectionState) ||
      normalizeString(payload?.status) ||
      normalizeString(payload?.bridgeState) ||
      normalizeString(payload?.observability?.sessions?.state)
    );
  }

  function isActiveSessionState(state) {
    switch ((state || '').toLowerCase()) {
      case 'active':
      case 'connected':
      case 'online':
      case 'ready':
      case 'healthy':
      case 'running':
        return true;
      default:
        return false;
    }
  }

  function isInactiveSessionState(state) {
    switch ((state || '').toLowerCase()) {
      case 'inactive':
      case 'offline':
      case 'stale':
      case 'closed':
      case 'detached':
      case 'disconnected':
        return true;
      default:
        return false;
    }
  }

  function toNonNegativeInteger(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }

  function hasModernTransportMetadata(payload) {
    return Boolean(
      payload &&
      typeof payload === 'object' &&
      (
        payload.transportCapabilities !== undefined ||
        payload.runtimeFeatureFlags !== undefined ||
        payload.transportHealth !== undefined
      )
    );
  }

  function deriveBridgeHealth(payload) {
    const bridgeOnline = Boolean(
      payload &&
      payload.ok === true &&
      payload.server === 'writable-mcp-bridge'
    );
    const activePluginIds = normalizePluginIds(
      payload?.activePlugins ?? payload?.activePluginIds ?? payload?.plugins
    );
    const reportedPluginId =
      normalizeString(payload?.activePluginId) ||
      normalizeString(payload?.pluginId) ||
      normalizeString(payload?.session?.pluginId) ||
      normalizeString(payload?.session?.activePluginId);
    const sessionState = readSessionState(payload);
    const sessionStateIsActive = isActiveSessionState(sessionState);
    const sessionStateIsInactive = isInactiveSessionState(sessionState);
    const trackedSessionCount = toNonNegativeInteger(payload?.observability?.sessions?.trackedTotal);
    const pendingCommands = toNonNegativeInteger(payload?.observability?.queue?.pendingCommands);
    const pendingResults = toNonNegativeInteger(payload?.observability?.queue?.pendingResults);
    const primaryActivePluginId = activePluginIds[0] ?? null;
    const activePluginCount = activePluginIds.length;
    const connected = bridgeOnline && (activePluginCount > 0 || sessionStateIsActive);
    const modernTransportMetadata = hasModernTransportMetadata(payload);
    const connectionTier = !connected
      ? 'offline'
      : modernTransportMetadata
        ? 'modern'
        : 'legacy';
    const connectionSummary = connectionTier === 'modern'
      ? '최신 브리지 연결됨'
      : connectionTier === 'legacy'
        ? '레거시 브리지 연결됨'
        : '브리지 연결 안 됨';
    const connectionDetail = connectionTier === 'modern'
      ? '최신 transport 상태 정보를 수신 중입니다.'
      : connectionTier === 'legacy'
        ? '최신 transport 상태 정보가 없어 fallback 모드로 동작합니다.'
        : '브리지 연결이 끊겼거나 세션이 없습니다.';

    return {
      bridgeOnline,
      connected,
      modernTransportMetadata,
      connectionTier,
      connectionSummary,
      connectionDetail,
      activePluginIds,
      activePluginCount,
      primaryActivePluginId,
      reportedPluginId,
      staleReportedPluginId: Boolean(
        reportedPluginId &&
        primaryActivePluginId &&
        reportedPluginId !== primaryActivePluginId
      ),
      sessionState,
      sessionStateIsActive,
      sessionStateIsInactive,
      trackedSessionCount,
      pendingCommands,
      pendingResults,
    };
  }

  function isBridgeHealthy(payload) {
    return deriveBridgeHealth(payload).connected;
  }

  function getBadgeText(isActive) {
    return isActive ? 'ON' : '';
  }

  function shouldIgnoreToggleError(error) {
    const message = error instanceof Error ? error.message : String(error || '');
    return (
      message.includes('Could not establish connection. Receiving end does not exist.') ||
      message.includes('The message port closed before a response was received.')
    );
  }

  function canInjectIntoUrl(url) {
    return typeof url === 'string' && /^https?:\/\//i.test(url);
  }

  const api = {
    CONTENT_SCRIPT_FILES,
    CONTENT_CSS_FILES,
    deriveBridgeHealth,
    isBridgeHealthy,
    getBadgeText,
    shouldIgnoreToggleError,
    canInjectIntoUrl,
  };

  globalScope.FDSBackgroundLogic = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
