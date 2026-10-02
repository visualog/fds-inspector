const test = require('node:test');
const assert = require('node:assert/strict');
const detection = require('./style-token-detection.js');
const { createContentInspector } = require('./content-inspection.js');
const { createContentScanRunner } = require('./content-scan-runner.js');
const { countViolationsByFilter } = require('./toolbar-state.js');
const { createContentSummaryModel } = require('./content-summary-model.js');

function fixture(style, variables = {}, parent = null, computed = {}) {
  const element = { style, parentElement: parent, matches: () => false };
  const root = { styleSheets: [], defaultView: { getComputedStyle: () => ({
    direction: 'ltr', writingMode: 'horizontal-tb', fontSize: '16px', ...computed,
    getPropertyValue: name => variables[name] || '',
  }) } };
  root.documentElement = {};
  return { element, root };
}

test('logical inline padding is recognized for each physical horizontal side', () => {
  const { element, root } = fixture({ 'padding-inline': 'var(--spacing-3)' }, { '--spacing-3': '12px' });
  for (const side of ['left', 'right']) {
    assert.equal(detection.hasAuthoredTokenReference(element, [`padding-${side}`, 'padding'], root,
      { variables: { '--spacing-3': '12px' } }), true);
  }
});

test('CSSOM expanded logical longhands retain a pending var shorthand source', () => {
  const { element, root } = fixture({
    length: 2, 0: 'padding-inline-start', 1: 'padding-inline-end',
    [Symbol.iterator]: function* () { yield 'padding-inline-start'; yield 'padding-inline-end'; },
    getPropertyValue: property => property === 'padding-inline' ? 'var(--spacing-3)' : '',
  });
  assert.equal(detection.hasAuthoredTokenReference(element, ['padding-left'], root), true);
});

test('logical start maps to right in rtl and does not authorize the opposite side', () => {
  const { element, root } = fixture({ 'padding-inline-start': 'var(--spacing-3)' }, {}, null, { direction: 'rtl' });
  assert.equal(detection.hasAuthoredTokenReference(element, ['padding-right'], root), true);
  assert.equal(detection.hasAuthoredTokenReference(element, ['padding-left'], root), false);
});

test('vertical writing mode maps inline padding to top and bottom', () => {
  const { element, root } = fixture({ 'padding-inline': 'var(--spacing-3)' }, {}, null, { writingMode: 'vertical-rl' });
  assert.equal(detection.hasAuthoredTokenReference(element, ['padding-top'], root), true);
  assert.equal(detection.hasAuthoredTokenReference(element, ['padding-left'], root), false);
});

test('inherited registered color is recognized but a child literal override is not', () => {
  const parent = { style: { color: 'var(--color-text-secondary)' }, matches: () => false };
  const { element, root } = fixture({}, { '--color-text-secondary': '#717985' }, parent);
  const registry = { variables: { '--color-text-secondary': '#717985' } };
  assert.equal(detection.hasAuthoredTokenReference(element, ['color'], root, registry), true);
  element.style.color = '#717985';
  assert.equal(detection.hasAuthoredTokenReference(element, ['color'], root, registry), false);
});

test('escaped decimal custom property names match their registered unescaped names', () => {
  assert.equal(detection.isRegisteredTokenReference('var(--spacing-2\\.5)',
    { '--spacing-2.5': '10px' }, name => name === '--spacing-2.5' ? '10px' : ''), true);
});

test('registered rem lengths compare to equivalent px without trusting an unknown variable', () => {
  const { element, root } = fixture({ 'border-radius': 'var(--fds-radius)' }, { '--fds-radius': '0.5rem' });
  assert.equal(detection.hasAuthoredTokenReference(element, ['border-radius'], root,
    { variables: { '--fds-radius': '8px' } }), true);
  assert.equal(detection.hasAuthoredTokenReference(element, ['border-radius'], root,
    { variables: {} }), false);
});

function spacingInspector(element, root) {
  return createContentInspector({
    getActiveInspectorSpecs: () => ({ spacing: [0, 8, 12], spacingTokens: { 12: ['--spacing-3'] } }),
    getKnownColorTokens: () => [], hasDirectTextContent: () => false, rgbToHex: x => x,
    hasAuthoredTokenReference: (el, props) => detection.hasAuthoredTokenReference(el, props, root),
    getAuthoredStyleValue: (el, props) => detection.getAuthoredStyleValue(el, props, root),
  });
}

test('auto margin is not treated as a fixed 212px spacing violation', () => {
  const { element, root } = fixture({ 'margin-right': 'auto' });
  assert.deepEqual(spacingInspector(element, root).getInspectionForFilter('spacing',
    { marginRight: '212.674px' }, element).issues, []);
});

test('fractional spacing is preserved rather than truncated to a valid integer', () => {
  const { element, root } = fixture({ 'padding-top': '8.5px' });
  assert.match(spacingInspector(element, root).getInspectionForFilter('spacing',
    { paddingTop: '8.5px' }, element).issues.join(' '), /8\.5px.*미등록/);
});

test('equal padding does not let one tokenized side mask three literal sides', () => {
  const { element, root } = fixture({ 'padding-top': 'var(--spacing-3)', 'padding-right': '12px',
    'padding-bottom': '12px', 'padding-left': '12px' });
  const result = spacingInspector(element, root).getInspectionForFilter('spacing',
    { paddingTop: '12px', paddingRight: '12px', paddingBottom: '12px', paddingLeft: '12px' }, element);
  assert.equal(result.issues.length, 3);
});

test('scan retains problem count separately from distinct affected elements for every filter', async () => {
  const element = {};
  const runner = createContentScanRunner({ getElements: () => [element], isElementVisible: () => true,
    getStyles: () => ({}), inspectElement: () => ({ issues: ['left', 'right'] }),
    addIssueEntry: ({ category, message, element }) => ({ key: category + message, category, message, element }),
    markElement: () => {}, yieldToBrowser: async () => {} });
  const result = await runner.run({ filters: ['spacing', 'color'], activeFilter: 'spacing' });
  assert.equal(result.counts.spacing, 2);
  assert.deepEqual(result.affectedElementCounts, { spacing: 1, color: 1 });
  assert.equal(countViolationsByFilter(result, 'spacing'), 1);
});

test('summary impact counts distinct elements rather than their directional issues', () => {
  const element = {};
  const entries = [
    { element, category: 'spacing', tone: 'warning', message: 'left' },
    { element, category: 'spacing', tone: 'warning', message: 'right' },
  ];
  const model = createContentSummaryModel({ getScanData: () => ({ issueEntries: entries }) });
  assert.deepEqual(model.getToneCountsForEntries(entries), { danger: 0, warning: 1 });
});

test('a later base-layer reset cannot override a utilities-layer token', () => {
  const { element, root } = fixture({});
  element.matches = selector => selector === '*' || selector === '.target';
  root.styleSheets = [{ cssRules: [
    { constructor: { name: 'CSSLayerBlockRule' }, name: 'base', cssRules: [{ selectorText: '*', style: { 'padding-left': '0px' } }] },
    { constructor: { name: 'CSSLayerBlockRule' }, name: 'utilities', cssRules: [{ selectorText: '.target', style: { 'padding-left': 'var(--spacing-3)' } }] },
    { constructor: { name: 'CSSLayerBlockRule' }, name: 'base', cssRules: [{ selectorText: '*', style: { 'padding-left': '0px' } }] },
  ] }];
  assert.equal(detection.hasAuthoredTokenReference(element, ['padding-left'], root), true);
});

test('a more specific literal rule beats a later lower-specificity token rule', () => {
  const { element, root } = fixture({});
  element.matches = () => true;
  root.styleSheets = [{ cssRules: [
    { selectorText: '#target', style: { color: '#717985' } },
    { selectorText: '.target', style: { color: 'var(--color-text-secondary)' } },
  ] }];
  assert.equal(detection.hasAuthoredTokenReference(element, ['color'], root), false);
});

test('important stylesheet literals beat normal inline tokens', () => {
  const { element, root } = fixture({ color: 'var(--color-text-secondary)' });
  element.matches = () => true;
  root.styleSheets = [{ cssRules: [{ selectorText: '.target', style: {
    color: '#717985', getPropertyPriority: () => 'important',
  } }] }];
  assert.equal(detection.hasAuthoredTokenReference(element, ['color'], root), false);
});

test('nested selectors cannot borrow a token from an unrelated parent selector', () => {
  const { element, root } = fixture({});
  element.matches = selector => selector === '.target' || selector === '&:first-child';
  root.styleSheets = [{ cssRules: [
    { selectorText: '.target', style: { 'padding-top': '10px' } },
    { selectorText: '.unrelated', style: {}, cssRules: [
      { selectorText: '&:first-child', style: { 'padding-top': 'var(--spacing-0)' } },
    ] },
  ] }];
  assert.equal(detection.hasAuthoredTokenReference(element, ['padding-top'], root), false);
});

function expandedStyle(values, keys) {
  return { length: keys.length, [Symbol.iterator]: function* () { yield* keys; },
    getPropertyValue: property => values[property] || '' };
}

test('pending border-color shorthand is recognized through its expanded color longhands', () => {
  const { element, root } = fixture(expandedStyle({ 'border-color': 'var(--color-border-primary)' },
    ['border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color']));
  assert.equal(detection.hasAuthoredTokenReference(element,
    ['border-color', 'border-top-color', 'border', 'border-top'], root), true);
});

test('pending gap shorthand is recognized through row and column longhands', () => {
  const { element, root } = fixture(expandedStyle({ gap: 'var(--spacing-2)' }, ['row-gap', 'column-gap']));
  assert.equal(detection.hasAuthoredTokenReference(element, ['gap', 'row-gap', 'column-gap'], root), true);
});

test('directional gap literal cannot be hidden by the other axis token', () => {
  const { element, root } = fixture({ 'row-gap': 'var(--spacing-3)', 'column-gap': '12px' });
  const result = spacingInspector(element, root).getInspectionForFilter('spacing', { rowGap: '12px', columnGap: '12px' }, element);
  assert.equal(result.issues.length, 1);
  assert.match(result.issues[0], /열 갭/);
});

test('unknown radius variables are reported for source review rather than as literal values', () => {
  const { element, root } = fixture({ 'border-radius': 'var(--radius-lg)' });
  const inspector = createContentInspector({ getActiveInspectorSpecs: () => ({ radius: ['8px'], radiusTokens: { '8px': ['radius/8'] } }),
    getKnownColorTokens: () => [], hasDirectTextContent: () => false, rgbToHex: x => x,
    hasAuthoredTokenReference: () => false,
    getAuthoredStyleValue: (el, props) => detection.getAuthoredStyleValue(el, props, root),
  });
  const result = inspector.getInspectionForFilter('radius', { borderRadius: '8px' }, element);
  assert.match(result.issues[0], /변수 출처 확인 필요.*--radius-lg/);
  assert.doesNotMatch(result.issues[0], /원시값/);
});
