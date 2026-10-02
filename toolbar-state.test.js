const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getToolbarVariantState,
  getNextToolbarMode,
  countViolationsByFilter,
  getNextActiveFilter,
  createToolbarModel,
  getPresentationMode,
  getFigmaToolbarAxes,
  TOOLBAR_SPEC,
  TOOLBAR_MODES,
} = require('./toolbar-state.js');

test('toolbar spec centralizes reusable geometry values', () => {
  assert.equal(TOOLBAR_SPEC.geometry.padding, 8);
  assert.equal(TOOLBAR_SPEC.geometry.itemSpacing, 16);
  assert.equal(TOOLBAR_SPEC.geometry.buttonSize, 32);
  assert.equal(TOOLBAR_SPEC.geometry.dividerHeight, 19);
  assert.equal(TOOLBAR_SPEC.geometry.collapsedWidth, 48);
});

test('toolbar spec centralizes reusable variant widths', () => {
  assert.equal(TOOLBAR_SPEC.variants[TOOLBAR_MODES.DEFAULT].width, 336);
  assert.equal(TOOLBAR_SPEC.variants[TOOLBAR_MODES.DISCONNECTED_MESSAGE].width, 401);
  assert.equal(TOOLBAR_SPEC.variants[TOOLBAR_MODES.CONNECTED_MESSAGE].width, 310);
  assert.equal(TOOLBAR_SPEC.variants[TOOLBAR_MODES.COMPACT].width, 96);
  assert.equal(TOOLBAR_SPEC.variants[TOOLBAR_MODES.SINGLE_BUTTON].width, 48);
});

test('toolbar spec preserves the default child order from figma', () => {
  assert.deepEqual(
    TOOLBAR_SPEC.variants[TOOLBAR_MODES.DEFAULT].items.map((item) => {
      if (item.type === 'button') return item.ref;
      if (item.type === 'static') return item.kind;
      return item.type;
    }),
    ['move', 'divider', 'color', 'font', 'spacing', 'radius', 'divider', 'close']
  );
});

test('countViolationsByFilter deduplicates matching violations', () => {
  const scanData = {
    violations: ['배경색 #fff (미등록)', '배경색 #fff (미등록)', '라운드 10px (미준수)'],
    suggestions: [],
  };

  assert.equal(countViolationsByFilter(scanData, 'color'), 1);
  assert.equal(countViolationsByFilter(scanData, 'radius'), 1);
  assert.equal(countViolationsByFilter(scanData, 'font'), 0);
});

test('countViolationsByFilter prefers structured counts when present', () => {
  const scanData = {
    violations: ['배경색 #fff (미등록)'],
    suggestions: [],
    counts: {
      color: 3,
      font: 1,
      spacing: 0,
      radius: 2,
    },
  };

  assert.equal(countViolationsByFilter(scanData, 'color'), 3);
  assert.equal(countViolationsByFilter(scanData, 'font'), 1);
  assert.equal(countViolationsByFilter(scanData, 'radius'), 2);
});

test('getToolbarVariantState keeps base variant idle when no filter is selected', () => {
  const state = getToolbarVariantState({
    activeFilter: null,
    isFigmaConnected: true,
    scanData: { violations: [], suggestions: [] },
  });

  assert.equal(state.color.active, false);
  assert.equal(state.font.active, false);
  assert.equal(state.spacing.active, false);
  assert.equal(state.radius.active, false);
  assert.equal(state.refresh.dot, false);
});

test('getToolbarVariantState exposes badge states from violations', () => {
  const state = getToolbarVariantState({
    activeFilter: 'radius',
    isFigmaConnected: true,
    scanData: {
      violations: ['배경색 #fff (미등록)', '라운드 10px (미준수)', '라운드 10px (미준수)'],
      suggestions: [],
    },
  });

  assert.equal(state.color.badge, '•');
  assert.equal(state.color.badgeCount, '1');
  assert.equal(state.color.badgeCountVisible, false);
  assert.equal(state.radius.active, true);
  assert.equal(state.radius.badge, '1');
  assert.equal(state.radius.badgeCount, '1');
  assert.equal(state.radius.badgeCountVisible, true);
  assert.equal(state.radius.badgeMarker, true);
  assert.equal(state.radius.dot, false);
  assert.equal(state.refresh.dot, false);
  assert.equal(state.refresh.refreshNeeded, true);
});

test('getToolbarVariantState shows badge marker in idle and count on hover or active', () => {
  const idleState = getToolbarVariantState({
    activeFilter: null,
    hoveredFilter: null,
    isFigmaConnected: true,
    scanData: {
      violations: ['배경색 #fff (미등록)'],
      suggestions: [],
    },
  });

  assert.equal(idleState.color.badge, '•');
  assert.equal(idleState.color.badgeCount, '1');
  assert.equal(idleState.color.badgeCountVisible, false);
  assert.equal(idleState.color.badgeMarker, true);

  const hoveredState = getToolbarVariantState({
    activeFilter: null,
    hoveredFilter: 'color',
    isFigmaConnected: true,
    scanData: {
      violations: ['배경색 #fff (미등록)'],
      suggestions: [],
      counts: { color: 2, font: 0, spacing: 0, radius: 0 },
    },
  });

  assert.equal(hoveredState.color.badge, '2');
  assert.equal(hoveredState.color.badgeCount, '2');
  assert.equal(hoveredState.color.badgeCountVisible, true);

  const activeState = getToolbarVariantState({
    activeFilter: 'color',
    hoveredFilter: null,
    isFigmaConnected: true,
    scanData: {
      violations: ['배경색 #fff (미등록)'],
      suggestions: [],
      counts: { color: 3, font: 0, spacing: 0, radius: 0 },
    },
  });

  assert.equal(activeState.color.badge, '3');
  assert.equal(activeState.color.badgeCount, '3');
  assert.equal(activeState.color.badgeCountVisible, true);
  assert.equal(activeState.color.active, true);
});

test('getToolbarVariantState keeps large badge counts numeric and preserves full count labels', () => {
  const state = getToolbarVariantState({
    activeFilter: 'color',
    hoveredFilter: null,
    isFigmaConnected: true,
    scanData: {
      violations: ['배경색 #fff (미등록)'],
      suggestions: [],
      counts: { color: 2003, font: 0, spacing: 0, radius: 0 },
    },
  });

  assert.equal(state.color.badge, '2003');
  assert.equal(state.color.badgeCount, '2003');
  assert.equal(state.color.badgeFullCount, '2,003');
  assert.equal(state.color.badgeLabel, '컬러 검사 2,003개 검토 대상 요소');
});

test('getToolbarVariantState adds scan scope context to violation badge labels', () => {
  const state = getToolbarVariantState({
    activeFilter: 'color',
    hoveredFilter: null,
    isFigmaConnected: true,
    scanData: {
      violations: ['배경색 #fff (미등록)'],
      suggestions: [],
      counts: { color: 154, font: 0, spacing: 0, radius: 0 },
      meta: {
        scannedElementCount: 408,
        skippedElementCount: 336,
      },
    },
  });

  assert.equal(
    state.color.badgeLabel,
    '컬러 검사 154개 검토 대상 요소 · 현재 렌더링 기준 · 검사됨 408개 · 제외됨 336개'
  );
});

test('getToolbarVariantState keeps refresh clear even when disconnected without violations', () => {
  const state = getToolbarVariantState({
    activeFilter: null,
    isFigmaConnected: false,
    scanData: { violations: [], suggestions: [] },
  });

  assert.equal(state.refresh.dot, false);
  assert.equal(state.refresh.refreshNeeded, false);
});

test('getNextToolbarMode resolves disconnected and stable connected states', () => {
  assert.equal(getNextToolbarMode({ isFigmaConnected: false, previousConnectionState: true }), 'disconnected-message');
  assert.equal(getNextToolbarMode({ isFigmaConnected: true, previousConnectionState: true }), 'connected-default');
});

test('getNextToolbarMode uses default tools when a snapshot token source is available', () => {
  assert.equal(
    getNextToolbarMode({ isFigmaConnected: false, previousConnectionState: false, hasTokenSource: true }),
    'connected-default'
  );
});

test('getNextToolbarMode emits connected-message on reconnect from disconnected', () => {
  assert.equal(getNextToolbarMode({ isFigmaConnected: true, previousConnectionState: false }), 'connected-message');
});

test('getNextActiveFilter toggles selected filter back to idle', () => {
  assert.equal(getNextActiveFilter(null, 'color'), 'color');
  assert.equal(getNextActiveFilter('color', 'color'), null);
  assert.equal(getNextActiveFilter('font', 'radius'), 'radius');
  assert.equal(getNextActiveFilter('spacing', 'unknown'), null);
});

test('createToolbarModel uses figma compact disconnected structure', () => {
  const model = createToolbarModel({ mode: TOOLBAR_MODES.COMPACT });
  assert.equal(model.width, TOOLBAR_SPEC.variants[TOOLBAR_MODES.COMPACT].width);
  assert.deepEqual(model.items.map((item) => item.type === 'button' ? item.ref : item.kind || item.type), ['plug', 'close']);
});

test('createToolbarModel uses flat figma child order for default toolbar variant', () => {
  const model = createToolbarModel({ mode: TOOLBAR_MODES.DEFAULT });

  assert.deepEqual(
    model.items.map((item) => {
      if (item.type === 'button') return item.ref;
      if (item.type === 'static') return item.kind;
      return item.type;
    }),
    ['move', 'divider', 'color', 'font', 'spacing', 'radius', 'divider', 'close']
  );
});

test('createToolbarModel uses figma single-button structure with font default', () => {
  const model = createToolbarModel({ mode: TOOLBAR_MODES.SINGLE_BUTTON });
  assert.equal(model.width, TOOLBAR_SPEC.variants[TOOLBAR_MODES.SINGLE_BUTTON].width);
  assert.equal(model.items.length, 1);
  assert.equal(model.items[0].ref, 'font');
});

test('createToolbarModel collapses to the active filter button when requested', () => {
  const model = createToolbarModel({
    mode: TOOLBAR_MODES.DEFAULT,
    activeFilter: 'font',
    options: { collapsed: true },
  });

  assert.equal(model.width, TOOLBAR_SPEC.geometry.collapsedWidth);
  assert.deepEqual(model.items, [
    { type: 'button', ref: 'font' },
  ]);
});

test('createToolbarModel collapses to the first actionable filter button when no filter is active', () => {
  const model = createToolbarModel({
    mode: TOOLBAR_MODES.DEFAULT,
    activeFilter: null,
    options: { collapsed: true },
  });

  assert.equal(model.width, TOOLBAR_SPEC.geometry.collapsedWidth);
  assert.deepEqual(model.items, [
    { type: 'button', ref: 'color' },
  ]);
});

test('createToolbarModel supports overriding single-button ref', () => {
  const model = createToolbarModel({ mode: TOOLBAR_MODES.SINGLE_BUTTON, options: { singleButtonRef: 'close' } });
  assert.equal(model.items[0].ref, 'close');
});

test('createToolbarModel exposes status widths for message variants', () => {
  assert.equal(createToolbarModel({ mode: TOOLBAR_MODES.DISCONNECTED_MESSAGE }).statusWidth, TOOLBAR_SPEC.variants[TOOLBAR_MODES.DISCONNECTED_MESSAGE].statusWidth);
  assert.equal(createToolbarModel({ mode: TOOLBAR_MODES.CONNECTED_MESSAGE }).statusWidth, TOOLBAR_SPEC.variants[TOOLBAR_MODES.CONNECTED_MESSAGE].statusWidth);
  assert.equal(createToolbarModel({ mode: TOOLBAR_MODES.DEFAULT }).statusWidth, null);
});

test('getPresentationMode switches disconnected message to compact on narrow viewport only', () => {
  assert.equal(getPresentationMode(TOOLBAR_MODES.DISCONNECTED_MESSAGE, 439), TOOLBAR_MODES.COMPACT);
  assert.equal(getPresentationMode(TOOLBAR_MODES.DISCONNECTED_MESSAGE, 440), TOOLBAR_MODES.DISCONNECTED_MESSAGE);
  assert.equal(getPresentationMode(TOOLBAR_MODES.DEFAULT, 320), TOOLBAR_MODES.DEFAULT);
});


test('getFigmaToolbarAxes maps message variants to the actual pattern/toolbar axes', () => {
  assert.deepEqual(
    getFigmaToolbarAxes({
      mode: TOOLBAR_MODES.DISCONNECTED_MESSAGE,
      activeFilter: null,
      isFigmaConnected: false,
      scanData: { violations: [], suggestions: [] },
    }),
    {
      status: 'message',
      error: 'True',
      success: 'True',
      active: 'False',
      hovered: 'False',
    }
  );

  assert.deepEqual(
    getFigmaToolbarAxes({
      mode: TOOLBAR_MODES.CONNECTED_MESSAGE,
      activeFilter: null,
      isFigmaConnected: true,
      scanData: { violations: [], suggestions: [] },
    }),
    {
      status: 'message',
      error: 'False',
      success: 'True',
      active: 'False',
      hovered: 'False',
    }
  );
});

test('getFigmaToolbarAxes maps compact, active, and perfect states to the actual pattern/toolbar axes', () => {
  assert.deepEqual(
    getFigmaToolbarAxes({
      mode: TOOLBAR_MODES.COMPACT,
      activeFilter: null,
      isFigmaConnected: false,
      scanData: { violations: [], suggestions: [] },
    }),
    {
      status: 'default',
      error: 'True',
      success: 'True',
      active: 'False',
      hovered: 'False',
    }
  );

  assert.deepEqual(
    getFigmaToolbarAxes({
      mode: TOOLBAR_MODES.DEFAULT,
      activeFilter: 'color',
      isFigmaConnected: true,
      scanData: { violations: ['배경색 #fff (미등록)'], suggestions: [] },
    }),
    {
      status: 'color',
      error: 'False',
      success: 'True',
      active: 'True',
      hovered: 'False',
    }
  );

  assert.deepEqual(
    getFigmaToolbarAxes({
      mode: TOOLBAR_MODES.DEFAULT,
      activeFilter: null,
      isFigmaConnected: true,
      scanData: { violations: [], suggestions: [] },
    }),
    {
      status: 'perfect',
      error: 'False',
      success: 'True',
      active: 'False',
      hovered: 'False',
    }
  );
});

test('getFigmaToolbarAxes maps spacing and radius checks to contract status', () => {
  assert.equal(
    getFigmaToolbarAxes({
      mode: TOOLBAR_MODES.DEFAULT,
      activeFilter: 'spacing',
      isFigmaConnected: true,
      scanData: { violations: ['상단 패딩 14px (비규격)'], suggestions: [] },
    }).status,
    'contract'
  );

  assert.equal(
    getFigmaToolbarAxes({
      mode: TOOLBAR_MODES.DEFAULT,
      activeFilter: 'radius',
      isFigmaConnected: true,
      scanData: { violations: ['라운드 10px (미준수)'], suggestions: [] },
    }).status,
    'contract'
  );
});
