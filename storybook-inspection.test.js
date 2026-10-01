const test = require('node:test');
const assert = require('node:assert/strict');
const registry = require('./storybook-registry.js');
const { hasAuthoredTokenReference, isRegisteredTokenReference } = require('./style-token-detection.js');

test('published Storybook registry carries source provenance and FDS mappings', () => {
  assert.match(registry.source.sha256, /^[a-f0-9]{64}$/);
  assert.equal(registry.variables['--spacing-2'], '8px');
  assert.equal(registry.variables['--color-text-primary'], '#252D38');
  assert.equal(registry.utilities['p-2'].padding, 'var(--spacing-2)');
  assert.match(registry.docs['Foundation/Spacing'], /foundation-spacing--docs/);
});

test('FDS validation rejects unknown and overridden variables', () => {
  assert.equal(isRegisteredTokenReference('var(--custom-color)', registry.variables, () => '#252D38'), false);
  assert.equal(isRegisteredTokenReference('var(--color-text-primary)', registry.variables, () => '#ff0000'), false);
  assert.equal(isRegisteredTokenReference('var(--color-text-primary)', registry.variables, () => 'rgb(37, 45, 56)'), true);
});

test('Tailwind class passes through its real CSS declaration; class name alone is insufficient', () => {
  const element = { matches: selector => selector === '.p-2' };
  const root = { styleSheets: [{ cssRules: [{ selectorText: '.p-2', style: { padding: 'var(--spacing-2)' } }] }],
    defaultView: { getComputedStyle: () => ({ getPropertyValue: () => '8px' }) } };
  assert.equal(hasAuthoredTokenReference(element, ['padding'], root, registry), true);
  root.styleSheets[0].cssRules[0].style.padding = '8px';
  assert.equal(hasAuthoredTokenReference(element, ['padding'], root, registry), false);
  root.styleSheets[0].cssRules[0].style.padding = 'var(--spacing-2)';
  element.style = { padding: '13px' };
  assert.equal(hasAuthoredTokenReference(element, ['padding'], root, registry), false);
});

test('registry extraction rejects a non-FDS payload and excludes pseudo utility selectors', async () => {
  const { extractRegistry } = await import('./scripts/sync-storybook-registry.mjs');
  assert.throws(() => extractRegistry(':root{--custom:1}', {}, 'https://example.test', 'styles.css'));
  const css = `:root{${Array.from({ length: 11 }, (_, i) => `--spacing-${i}:${i}px`).join(';')}}.p-2{padding:var(--spacing-2)}.hover\\:p-2:hover{padding:var(--spacing-2)}`;
  const result = extractRegistry(css, { entries: { docs: { type: 'docs', title: 'Foundation/Colors/Semantic', id: 'colors--docs' } } }, 'https://example.test', 'styles.css');
  assert.deepEqual(Object.keys(result.utilities), ['p-2']);
});
