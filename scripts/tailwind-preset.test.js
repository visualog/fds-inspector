const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
async function load() {
  return import('./tailwind-preset.mjs').catch(error => { if (error.code === 'ERR_MODULE_NOT_FOUND') return {}; throw error; });
}
async function fixture(source, run) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'fds-preset-'));
  try { const file = path.join(dir, 'preset.mjs'); await fs.writeFile(file, source); await run(file); }
  finally { await fs.rm(dir, { recursive: true, force: true }); }
}
test('extracts function-generated preset values in a constrained build process', async () => {
  const { readTailwindPreset } = await load();
  assert.equal(typeof readTailwindPreset, 'function');
  await fixture('const colors=()=>({"bg-primary":"var(--color-bg-primary)"});export const tailwindPreset={theme:{extend:{colors:colors(),fontSize:{body:["14px",{lineHeight:"20px",fontWeight:"400"}]}}}};', async file => {
    const preset = await readTailwindPreset(file);
    assert.equal(preset.theme.extend.colors['bg-primary'], 'var(--color-bg-primary)');
    assert.equal(preset.theme.extend.fontSize.body[1].fontWeight, '400');
  });
});
test('build process denies writes and rejects functions left in the preset', async () => {
  const { readTailwindPreset } = await load();
  assert.equal(typeof readTailwindPreset, 'function');
  await fixture('import fs from "node:fs"; fs.writeFileSync("/private/tmp/fds-denied-write", "x");export const tailwindPreset={theme:{extend:{}}};', async file => {
    await assert.rejects(readTailwindPreset(file), /denied|ACCESS/i);
  });
  await fixture('export const tailwindPreset={theme:{extend:{colors:()=>({})}}};', async file => {
    await assert.rejects(readTailwindPreset(file), /serializable/i);
  });
});
test('maps color aliases and composite typography without trusting class names', async () => {
  const { createTailwindMappings } = await load();
  assert.equal(typeof createTailwindMappings, 'function');
  const result = createTailwindMappings({ theme:{extend:{ colors:{'text-primary':'var(--color-text-primary)'},
    fontSize:{body:['var(--body-size)',{lineHeight:'var(--body-height)',fontWeight:'400'}]},
    spacing:{'1.5':'var(--spacing-1\\.5)'},screens:{sm:'767px'},keyframes:{fade:{to:{opacity:'1'}}},
    boxShadow:{card:'var(--shadow-card)'},animation:{fade:'fade 1s'} }} }, {
      '--color-text-primary':'#000000','--body-size':'14px','--spacing-1.5':'6px','--shadow-card':'none',
    });
  assert.equal(result.utilities['text-text-primary'].color, 'var(--color-text-primary)');
  assert.deepEqual(result.utilities['text-body'], {'font-size':'var(--body-size)','line-height':'var(--body-height)','font-weight':'400'});
  assert.equal(result.utilities['gap-1.5'].gap, 'var(--spacing-1\\.5)');
  assert.equal(result.utilities['shadow-card']['box-shadow'], 'var(--shadow-card)');
  assert.deepEqual(result.unresolvedTokenReferences, ['--body-height']);
  assert.deepEqual(result.unmappedThemeSections, []);
});
test('unknown preset sections are retained and marked, not silently declared complete', async () => {
  const { createTailwindMappings } = await load();
  assert.equal(typeof createTailwindMappings, 'function');
  const result = createTailwindMappings({theme:{extend:{futureArea:{a:'1'}}}}, {});
  assert.deepEqual(result.unmappedThemeSections, ['futureArea']);
  assert.deepEqual(result.preset.theme.extend.futureArea, {a:'1'});
});
test('build evaluation denies network, subprocesses and inherited environment', async () => {
  const { readTailwindPreset } = await load();
  await fixture('import net from "node:net";net.createServer().listen(0,"127.0.0.1");export const tailwindPreset={theme:{extend:{}}};', async file => {
    await assert.rejects(readTailwindPreset(file), /denied|ACCESS/i);
  });
  await fixture('import {spawnSync} from "node:child_process";spawnSync(process.execPath,["-e","0"]);export const tailwindPreset={theme:{extend:{}}};', async file => {
    await assert.rejects(readTailwindPreset(file), /denied|ACCESS/i);
  });
  await fixture('export const tailwindPreset={theme:{extend:{probe:{inherited:Object.keys(process.env).length}}}};', async file => {
    assert.equal((await readTailwindPreset(file)).theme.extend.probe.inherited, 0);
  });
});
