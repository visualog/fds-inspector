import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Run with ego-browser nodejs; the browser helper is passed by the CLI runtime.
export async function runStorybookBrowserQA(taskSpace) {
  const task = await taskSpace('FDS Storybook Tailwind browser QA');
  const page = task.page('p1');
  try {
    await page.goto('about:blank');
    for (const name of ['storybook-registry.js', 'style-token-detection.js', 'content-inspection.js']) {
      const source = await readFile(new URL(`../${name}`, import.meta.url), 'utf8');
      const response = await page.cdp('Runtime.evaluate', { expression: source });
      if (response.exceptionDetails) throw new Error(`${name}: browser script failed`);
    }
    const results = await page.evaluate(() => {
      document.body.innerHTML = `<style>
        :root { --spacing-2: 8px; --color-bg-primary: #FFFFFF }
        .p-2 { padding: var(--spacing-2) }
        .literal { padding: 8px }
        .override { --spacing-2: 13px }
        .unknown { padding: var(--custom-space); --custom-space: 8px }
        .bg { background-color: var(--color-bg-primary) }
        .wrong-bg { --color-bg-primary: #ff0000 }
        .responsive { padding: 8px }
        @media (min-width: 1px) { .responsive { padding: var(--spacing-2) } }
        .inactive { padding: 8px }
        @media (min-width: 99999px) { .inactive { padding: var(--spacing-2) } }
      </style>
      <div id="good" class="p-2">FDS utility</div>
      <div id="literal" class="literal">Literal</div>
      <div id="override" class="p-2 override">Overridden FDS variable</div>
      <div id="unknown" class="unknown">Unknown variable</div>
      <div id="color" class="bg">FDS background</div>
      <div id="wrongColor" class="bg wrong-bg">Overridden background</div>
      <div id="responsive" class="responsive">Active responsive utility</div>
      <div id="inactive" class="inactive">Inactive responsive utility</div>`;
      const inspector = FDSContentInspection.createContentInspector({
        getActiveInspectorSpecs: () => ({ spacing: [0, 8], spacingTokens: { 8: ['--spacing-2'] }, radius: [], fonts: [] }),
        getKnownColorTokens: hex => hex === '#ffffff' ? ['--color-bg-primary'] : [],
        hasAuthoredTokenReference: (element, properties) => FDSStyleTokenDetection.hasAuthoredTokenReference(element, properties, document, FDSStorybookRegistry),
        hasDirectTextContent: () => false,
        rgbToHex: value => {
          const match = value.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
          return match ? `#${match.slice(1).map(channel => Number(channel).toString(16).padStart(2, '0')).join('')}` : null;
        },
      });
      return Object.fromEntries(['good', 'literal', 'override', 'unknown', 'color', 'wrongColor', 'responsive', 'inactive'].map(id => {
        const element = document.getElementById(id);
        const filter = ['color', 'wrongColor'].includes(id) ? 'color' : 'spacing';
        return [id, inspector.getInspectionForFilter(filter, getComputedStyle(element), element).issues];
      }));
    });
    assert.deepEqual(results.good, []);
    assert.deepEqual(results.color, []);
    assert.deepEqual(results.responsive, []);
    assert.match(results.literal.join(' '), /원시값 직접 사용/);
    assert.match(results.unknown.join(' '), /원시값 직접 사용/);
    assert.match(results.override.join(' '), /13px.*미등록/);
    assert.match(results.wrongColor.join(' '), /#ff0000.*미등록/);
    assert.match(results.inactive.join(' '), /원시값 직접 사용/);
    console.log(JSON.stringify({ passed: true, cases: 8, results }, null, 2));
    return results;
  } finally {
    await task.finish({ keep: [] });
  }
}
