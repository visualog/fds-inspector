const test = require('node:test');
const assert = require('node:assert/strict');
let api = {};
try { api = require('./package-registry-utils.js'); } catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; }
const packages = require('./fds-package-registry.js');
test('package token definitions take priority while preserving Storybook document links', () => {
  assert.equal(typeof api.createPackageInspectionRegistry, 'function');
  const result = api.createPackageInspectionRegistry(packages, { variables: { '--spacing-1.5': '7px' }, docs: { Button: '/docs' }, utilities: {} });
  assert.equal(result.variables['--spacing-1.5'], '6px');
  assert.equal(result.docs.Button, '/docs');
});
test('package utility mappings override stale Storybook declarations', () => {
  const result = api.createPackageInspectionRegistry({tokens:{variables:{},tailwind:{utilities:{
    'text-body': {'font-size':'14px','font-weight':'400'},
  }}}}, {utilities:{'text-body':{'font-size':'99px'}}});
  assert.equal(result.utilities['text-body']['font-size'], '14px');
  assert.equal(result.utilities['text-body']['font-weight'], '400');
});
test('bundled baseline includes all preset sections, generated aliases and typography', () => {
  const t = packages.tokens.tailwind;
  assert.equal(t.colors?.['text-primary'], 'var(--color-text-primary)');
  assert.ok(t.fontSize?.['body-2-regular']);
  assert.equal(t.utilities?.['text-body-2-regular']?.['font-weight'], 'var(--typography-body-2-regular-weight)');
  assert.deepEqual(t.unmappedThemeSections, []);
  assert.deepEqual(t.unresolvedTokenReferences, []);
  assert.equal(t.mappedThemeSections.length, 10);
});
test('package summary distinguishes baseline versions from unknown target versions', () => {
  assert.equal(typeof api.getPackageBaselineSummary, 'function');
  const summary = api.getPackageBaselineSummary(packages);
  assert.match(summary, /fe-ui 0\.6\.0/);
  assert.match(summary, /fe-tokens 0\.0\.11/);
  assert.match(summary, /fe-icons 0\.1\.1/);
  assert.match(summary, /실행 앱 버전 미확인/);
});
test('stored library contracts do not authorize DOM class based exemptions', () => {
  assert.equal(packages.components.Button.ownershipDetection, 'unavailable');
  assert.match(packages.components.Button.baseClasses, /gap-\[6px\]/);
  assert.equal(packages.tokens.variables['--radius-lg'], undefined);
  assert.equal(packages.icons.entries.length, 323);
  assert.equal(packages.icons.metadataCoverage.length, 3);
});
test('literal class references are contextual documentation, never ownership evidence', () => {
  assert.equal(typeof api.getComponentValueReferences, 'function');
  const refs = api.getComponentValueReferences(packages, 'spacing', '갭 6px (원시값 직접 사용)');
  assert.deepEqual(refs, [{ component: 'Button', packageVersion: '0.6.0', className: 'gap-[6px]', evidence: 'definition-only' }]);
  assert.deepEqual(api.getComponentValueReferences(packages, 'spacing', '갭 7px (미등록)'), []);
  assert.deepEqual(api.getComponentValueReferences(packages, 'radius', '라운드 8px (미준수)'), []);
  assert.deepEqual(api.getComponentValueReferences(packages, 'spacing', '상단 패딩 6px (원시값 직접 사용)'), []);
});
test('new package baseline files are built and injected before inspector logic', async () => {
  const { BUILD_FILES } = await import('./scripts/build-extension.mjs');
  const { CONTENT_SCRIPT_FILES } = require('./background-logic.js');
  for (const file of ['fds-package-registry.js', 'package-registry-utils.js']) {
    assert.ok(BUILD_FILES.includes(file));
    assert.ok(CONTENT_SCRIPT_FILES.indexOf(file) >= 0);
    assert.ok(CONTENT_SCRIPT_FILES.indexOf(file) < CONTENT_SCRIPT_FILES.indexOf('content.js'));
  }
});
