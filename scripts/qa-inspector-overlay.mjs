import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { CONTENT_SCRIPT_FILES } = require('../background-logic.js');

// A test-only runtime shim in an agent-owned tab, not a installed-extension test.
export async function verifyInspectorOverlay(page) {
  const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8'));
  const assets = {};
  for (const name of ['close', 'color', 'font', 'move', 'spacing', 'success', 'round 2', 'exclamationmark.triangle']) {
    const file = `assets/ic_tool_${name}.svg`;
    assets[file] = `data:image/svg+xml;base64,${(await readFile(new URL(`../${file}`, import.meta.url))).toString('base64')}`;
  }
  const css = await readFile(new URL('../overlay.css', import.meta.url), 'utf8');
  await page.evaluate(({ assets, css, manifest }) => {
    window.chrome = { runtime: { getURL: path => assets[path] || '', getManifest: () => manifest,
      sendMessage: async payload => payload?.action === 'SNAPSHOT_TOKEN_SPECS'
        ? { status: 'success', connected: false, source: 'snapshot', fileName: 'QA bundled baseline',
          specs: { colors: {}, spacing: [0, 2, 4, 6, 8, 10, 12], radius: ['8px'],
            radiusTokens: { '8px': ['radius/8'] }, meta: { colorTokenCount: 1 } } }
        : { connected: false },
      onMessage: { addListener: handler => { window.qaInspectorMessage = handler; } } },
      storage: { local: { get: async () => ({}), set: async () => ({}) } } };
    const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
  }, { assets, css, manifest });
  for (const file of CONTENT_SCRIPT_FILES) {
    const expression = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    const result = await page.cdp('Runtime.evaluate', { expression });
    if (result.exceptionDetails) throw new Error(`${file}: ${JSON.stringify(result.exceptionDetails)}`);
  }
  await page.evaluate(() => window.qaInspectorMessage({ action: 'TOGGLE', state: true }, {}, () => {}));
  await page.waitForFunction(() => document.querySelector('#fds-btn-radius')?.getAttribute('aria-label')?.includes('검토 대상'), undefined, { timeout: 60000 });
  console.log(await page.snapshot());
  await page.click('#fds-btn-radius');
  await page.waitForFunction(() => document.querySelector('.fds-summary-provenance'), undefined, { timeout: 10000 });
  return verifyOverlayResult(page);
}

export async function verifyOverlayResult(page) {
  await page.waitForFunction(() => document.querySelector('#fds-summary-panel')?.innerText?.includes('권장·확인 사항'), undefined, { timeout: 10000 });
  const result = await page.evaluate(() => ({
    provenance: document.querySelector('.fds-summary-provenance')?.textContent,
    panel: document.querySelector('#fds-summary-panel')?.innerText,
    badges: [...document.querySelectorAll('#fds-toolbar button')].map(el => el.getAttribute('aria-label')).filter(Boolean),
    clipped: [...document.querySelectorAll('.fds-summary-provenance')].some(el => el.scrollWidth > el.clientWidth),
  }));
  const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8'));
  assert.ok(result.provenance.includes(`확장앱 ${manifest.version}`));
  assert.match(result.panel, /권장·확인 사항/);
  assert.equal(result.clipped, false);
  console.log(JSON.stringify(result, null, 2));
  return result;
}
