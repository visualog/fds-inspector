import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Runs current checkout modules, not the installed extension, in an agent-owned page.
export async function verifyInspectionAccuracy(page) {
  async function loadModules() {
    for (const file of ['storybook-registry.js', 'style-token-detection.js', 'content-inspection.js']) {
      const expression = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
      const result = await page.cdp('Runtime.evaluate', { expression });
      if (result.exceptionDetails) throw new Error(`Failed to load ${file}`);
    }
  }
  await page.goto('about:blank');
  await loadModules();
  const fixture = await page.evaluate(() => {
    document.body.innerHTML = `<style>
      :root { --spacing-3:12px; --spacing-2\\.5:10px; --color-text-secondary:#717985 }
      .logical { padding-inline:var(--spacing-3); padding-block:var(--spacing-2\\.5) }
      .text { color:var(--color-text-secondary) }
      .raw { padding:12px }
      .override { padding-right:13px }
      .layout { display:flex; width:600px }
      .auto { margin-right:auto }
      .fractional { padding-top:8.5px }
      .token-gap { gap:var(--spacing-3) }
      .token-border { border:1px solid; border-color:var(--color-border-primary) }
    </style>
    <div id="logical" class="logical">Logical</div>
    <div id="override" class="logical override">Override</div>
    <div id="raw" class="raw">Raw</div>
    <div class="text"><span id="inherited">Inherited</span><span id="literal" style="color:#717985">Literal</span></div>
    <div class="layout"><div id="auto" class="auto">Auto</div><span>Sibling</span></div>
    <div id="fractional" class="fractional">Fractional</div>
    <div id="tokenGap" class="token-gap">Gap</div>
    <div id="tokenBorder" class="token-border">Border</div>`;
    document.documentElement.style.setProperty('--color-border-primary', '#e9ecef');
    const registry = { variables: { ...FDSStorybookRegistry.variables, '--spacing-2.5': '10px' } };
    const api = FDSStyleTokenDetection;
    const inspector = FDSContentInspection.createContentInspector({
      getActiveInspectorSpecs: () => ({ spacing: [0, 8, 10, 12], spacingTokens: { 12: ['--spacing-3'] } }),
      getKnownColorTokens: () => [], hasDirectTextContent: () => true, rgbToHex: x => x,
      hasAuthoredTokenReference: (el, props) => api.hasAuthoredTokenReference(el, props, document, registry),
      getAuthoredStyleValue: (el, props) => api.getAuthoredStyleValue(el, props, document),
    });
    const spacing = id => { const el = document.getElementById(id); return inspector.getInspectionForFilter('spacing', getComputedStyle(el), el).issues; };
    return {
      logical: spacing('logical'), override: spacing('override'), raw: spacing('raw'),
      auto: spacing('auto'), fractional: spacing('fractional'),
      gap: spacing('tokenGap'),
      border: api.hasAuthoredTokenReference(document.getElementById('tokenBorder'),
        ['border-color', 'border-top-color', 'border', 'border-top'], document, registry),
      inherited: api.hasAuthoredTokenReference(document.getElementById('inherited'), ['color'], document, registry),
      literal: api.hasAuthoredTokenReference(document.getElementById('literal'), ['color'], document, registry),
      autoComputed: getComputedStyle(document.getElementById('auto')).marginRight,
    };
  });
  assert.deepEqual(fixture.logical, []);
  assert.deepEqual(fixture.auto, []);
  assert.deepEqual(fixture.gap, []);
  assert.equal(fixture.border, true);
  assert.equal(fixture.inherited, true);
  assert.equal(fixture.literal, false);
  assert.match(fixture.override.join(' '), /13px.*미등록/);
  assert.match(fixture.raw.join(' '), /원시값 직접 사용/);
  assert.match(fixture.fractional.join(' '), /8\.5px.*미등록/);

  await page.goto('http://localhost:5173/ui-system?view=fds&audience=service');
  await page.waitForFunction(() => document.querySelector('a.text-text-secondary'), undefined, { timeout: 15000 });
  await loadModules();
  const live = await page.evaluate(() => {
    const api = FDSStyleTokenDetection;
    const link = document.querySelector('a.text-text-secondary.px-3');
    const child = link?.querySelector('span');
    const auto = document.querySelector('.mr-auto');
    const border = document.querySelector('.border-border-primary');
    if (!link || !child || !auto) throw new Error('Live regression samples are missing');
    const cs = getComputedStyle(link);
    return {
      url: location.href, link: link.textContent,
      paddingLeft: cs.paddingLeft, paddingTop: cs.paddingTop,
      inlineRegistered: api.hasAuthoredTokenReference(link, ['padding-left', 'padding'], document, FDSStorybookRegistry),
      blockVariable: api.getAuthoredStyleValue(link, ['padding-top', 'padding'], document),
      blockRegistered: api.hasAuthoredTokenReference(link, ['padding-top', 'padding'], document, FDSStorybookRegistry),
      inheritedRegistered: api.hasAuthoredTokenReference(child, ['color'], document, FDSStorybookRegistry),
      autoAuthored: api.getAuthoredStyleValue(auto, ['margin-right', 'margin'], document),
      autoComputed: getComputedStyle(auto).marginRight,
      radiusAuthored: api.getAuthoredStyleValue(link, ['border-radius'], document),
      radiusRegistered: api.hasAuthoredTokenReference(link, ['border-radius'], document, FDSStorybookRegistry),
      gapRegistered: api.hasAuthoredTokenReference(auto, ['gap', 'row-gap', 'column-gap'], document, FDSStorybookRegistry),
      borderRegistered: api.hasAuthoredTokenReference(border, ['border-color', 'border-top-color', 'border', 'border-top'], document, FDSStorybookRegistry),
    };
  });
  assert.equal(live.inlineRegistered, true);
  assert.match(live.blockVariable, /spacing-2\\?\.5/);
  assert.equal(live.inheritedRegistered, true);
  assert.equal(live.autoAuthored, 'auto');
  assert.equal(live.radiusRegistered, false); // Tailwind defaults are not automatically FDS tokens.
  assert.equal(live.gapRegistered, true);
  assert.equal(live.borderRegistered, true);
  console.log(JSON.stringify({ passed: true, fixture, live }, null, 2));
  return { fixture, live };
}
