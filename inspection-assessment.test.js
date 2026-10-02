const test = require('node:test');
const assert = require('node:assert/strict');
const { createContentInspector } = require('./content-inspection.js');
const { createContentRenderers } = require('./content-render.js');
const { createContentSummaryModel } = require('./content-summary-model.js');
const { createViolationReportHtml } = require('./content-violation-report.js');
const { getToolbarVariantState } = require('./toolbar-state.js');
const { readFileSync } = require('node:fs');

function inspect(value, authored, tokenized = false) {
  return createContentInspector({
    getActiveInspectorSpecs: () => ({ spacing: [0, 6], spacingTokens: { 6: ['--spacing-1.5'] } }),
    hasAuthoredTokenReference: () => tokenized,
    getAuthoredStyleValue: () => authored,
    getKnownColorTokens: () => [], hasDirectTextContent: () => false, rgbToHex: x => x,
  }).getInspectionForFilter('spacing', { rowGap: `${value}px`, columnGap: `${value}px` }, { className: 'gap-[6px]' });
}

test('registered 6px literal is value-aligned and a recommendation, not a mismatch', () => {
  const result = inspect(6, '6px');
  assert.deepEqual(result.issueDetails[0].assessment, {
    status: 'recommendation', value: 'aligned', usage: 'literal', origin: 'unknown', authored: '6px',
  });
});
test('unregistered literal is a mismatch candidate', () => {
  assert.equal(inspect(7, '7px').issueDetails[0].assessment.status, 'mismatch');
});
test('computed value without authored evidence remains review and cannot prove library origin', () => {
  const result = inspect(6, '');
  assert.equal(result.issueDetails[0].assessment.status, 'review');
  assert.equal(result.issueDetails[0].assessment.origin, 'unknown');
});
test('unregistered variable is review rather than a raw literal mismatch', () => {
  assert.equal(inspect(7, 'var(--custom-gap)').issueDetails[0].assessment.status, 'review');
});
test('registered token use produces no actionable findings', () => {
  assert.deepEqual(inspect(6, 'var(--spacing-1\\.5)', true).issues, []);
});
test('summary separates mismatch candidates from recommendations and review', () => {
  const renderer = createContentRenderers({ iconPaths: {}, getUrl: x => x });
  const cards = renderer.createSummaryMetricCards({ hasViolations: true, assessmentMode: true,
    recommendationCount: 2, reviewCount: 3 });
  assert.equal(cards[0].label, 'FDS 불일치 후보');
  assert.equal(cards[1].label, '권장·확인 사항');
  assert.match(cards[1].caption, /전환 권장 2건 · 확인 필요 3건/);
});
test('same value recommendations and reviews remain separate labeled groups', () => {
  const renderer = createContentRenderers({ iconPaths: {}, getUrl: x => x });
  const model = createContentSummaryModel({
    parseViolationItem: renderer.parseViolationItem, getExpandedIssueGroupKeys: () => new Set(),
  });
  const groups = model.groupIssueEntries(['recommendation', 'review'].map(status => ({
    category: 'spacing', tone: 'warning', message: '갭 6px (원시값 직접 사용: --spacing-1.5)',
    metadata: { assessment: { status } },
  })));
  assert.equal(groups.length, 2);
  assert.deepEqual(groups.map(g => g.tag).sort(), ['토큰 전환 권장', '출처 확인 필요'].sort());
  assert.match(renderer.renderSummaryGroupItem(groups[0]), /class="fds-group-status">토큰 전환 권장/);
});
test('exported report retains the assessment rather than labeling all aligned values raw violations', () => {
  const renderer = createContentRenderers({ iconPaths: {}, getUrl: x => x });
  const report = createViolationReportHtml({ scanData: { issueEntries: [{
    category: 'spacing', tone: 'warning', message: '갭 6px (원시값 직접 사용: --spacing-1.5)',
    metadata: { assessment: { status: 'recommendation' } },
  }] }, parseViolationItem: renderer.parseViolationItem });
  assert.match(report, /토큰 전환 권장/);
});
test('toolbar count describes review targets rather than confirmed violations', () => {
  const state = getToolbarVariantState({ activeFilter: 'spacing', isFigmaConnected: true,
    scanData: { counts: { spacing: 1 }, violations: ['갭 6px (원시값 직접 사용)'], suggestions: [] } });
  assert.match(state.spacing.badgeLabel, /검토 대상 요소/);
});
test('assessment count captions can wrap instead of truncating review counts', () => {
  const css = readFileSync(require.resolve('./overlay.css'), 'utf8');
  assert.match(css.match(/\.fds-stat-caption\s*\{([^}]+)\}/)[1], /white-space:\s*normal/);
  assert.match(css.match(/^\.fds-stat-box\s*\{([^}]+)\}/m)[1], /height:\s*auto/);
});
