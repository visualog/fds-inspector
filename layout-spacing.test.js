const test = require('node:test');
const assert = require('node:assert/strict');
const { createContentInspector } = require('./content-inspection.js');
const { createContentSummaryModel } = require('./content-summary-model.js');
const { createContentRenderers } = require('./content-render.js');

function inspect(styles, declarations = {}) {
  return createContentInspector({
    getActiveInspectorSpecs: () => ({ spacing: [0, 6, 8], spacingTokens: { 8: ['--spacing-2'] } }),
    getAuthoredStyleValue: (_, props) => declarations[props[0]] || '',
    hasAuthoredTokenReference: () => false,
    getKnownColorTokens: () => [], hasDirectTextContent: () => false, rgbToHex: x => x,
  }).getInspectionForFilter('spacing', styles, {});
}

test('auto margin is excluded regardless of casing and surrounding whitespace', () => {
  assert.deepEqual(inspect({ marginLeft: '118.844px' }, { 'margin-left': ' AUTO ' }).issues, []);
});
test('direct fractional margin remains a mismatch candidate', () => {
  assert.equal(inspect({ marginLeft: '118.844px' }, { 'margin-left': '118.844px' }).issueDetails[0].assessment.status, 'mismatch');
});
for (const authored of ['12%', '2vw', 'calc(50% - 12px)', 'min(8px, 2vw)', 'clamp(4px, 1vw, 16px)']) {
  test(`fluid spacing is review, not token mismatch: ${authored}`, () => {
    const result = inspect({ marginLeft: '118.844px' }, { 'margin-left': authored });
    assert.equal(result.issueDetails[0].assessment.status, 'review');
    assert.equal(result.issueDetails[0].assessment.reason, 'fluid-layout');
    assert.equal(result.issueDetails[0].assessment.value, 'unknown');
  });
}
test('equal computed sides with different authored semantics are not merged', () => {
  const result = inspect({ paddingTop: '8px', paddingRight: '8px', paddingBottom: '8px', paddingLeft: '8px' },
    { 'padding-top': '1%', 'padding-right': '8px', 'padding-bottom': '8px', 'padding-left': '8px' });
  assert.equal(result.issues.length, 4);
  assert.equal(result.issueDetails[0].assessment.reason, 'fluid-layout');
  assert.equal(result.issueDetails[1].assessment.status, 'recommendation');
});
test('unknown CSS declaration reports missing evidence without recommending a value', () => {
  assert.equal(inspect({ marginLeft: '118.844px' }).issueDetails[0].assessment.reason, 'declaration-unavailable');
});
test('dynamic groups explain their layout review instead of generic source review', () => {
  const renderers = createContentRenderers({});
  const model = createContentSummaryModel({ parseViolationItem: renderers.parseViolationItem, getExpandedIssueGroupKeys: () => new Set() });
  const result = inspect({ marginLeft: '118.844px' }, { 'margin-left': '20%' });
  const groups = model.groupIssueEntries([{ message: result.issues[0], metadata: result.issueDetails[0], tone: 'warning' }]);
  assert.equal(groups[0].tag, '유동 레이아웃 확인');
});
