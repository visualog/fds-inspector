import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { realpath } from 'node:fs/promises';
import { dirname } from 'node:path';

const run = promisify(execFile);
export async function readTailwindPreset(file) {
  if (Number(process.versions.node.split('.')[0]) < 25) throw new Error('Preset generation requires Node 25+ with network permission controls');
  const source = await realpath(file);
  const worker = `
    import { pathToFileURL } from 'node:url';
    for (const name of Object.keys(process.env)) delete process.env[name];
    const module = await import(pathToFileURL(process.argv[1]).href);
    const seen = new Set();
    function check(value) {
      if (value === null || ['string','boolean'].includes(typeof value)) return;
      if (typeof value === 'number' && Number.isFinite(value)) return;
      if (!value || typeof value !== 'object' || seen.has(value)) throw new Error('Preset is not JSON serializable');
      if (!Array.isArray(value) && ![Object.prototype,null].includes(Object.getPrototypeOf(value))) throw new Error('Preset is not JSON serializable');
      seen.add(value); for (const item of Object.values(value)) check(item); seen.delete(value);
    }
    check(module.tailwindPreset);
    if (!module.tailwindPreset.theme) throw new Error('Preset theme missing');
    process.stdout.write(JSON.stringify(module.tailwindPreset));
  `;
  // Build-time only. No inherited environment, write/network/spawn permissions,
  // extra dependencies, unbounded execution, or package code in the extension.
  const { stdout } = await run(process.execPath, ['--permission', `--allow-fs-read=${dirname(source)}`,
    '--input-type=module', '-e', worker, source], { env: {}, timeout: 5000, maxBuffer: 2 * 1024 * 1024 });
  return JSON.parse(stdout);
}

export function createTailwindMappings(preset, variables) {
  const theme = { ...(preset.theme || {}), ...(preset.theme?.extend || {}) };
  delete theme.extend;
  const utilities = {};
  const put = (name, declarations) => { utilities[name] = declarations; };
  const flattenColors = (value, path = []) => {
    for (const [key, entry] of Object.entries(value || {})) {
      const next = key === 'DEFAULT' ? path : [...path, key];
      if (typeof entry === 'string') {
        for (const [prefix, property] of Object.entries({ bg:'background-color',text:'color',border:'border-color',
          outline:'outline-color',fill:'fill',stroke:'stroke',decoration:'text-decoration-color',caret:'caret-color',accent:'accent-color' })) {
          put(`${prefix}-${next.join('-')}`, { [property]: entry });
        }
      } else if (entry && typeof entry === 'object') flattenColors(entry, next);
    }
  };
  flattenColors(theme.colors);
  const spacingPrefixes = { p:['padding'],px:['padding-inline'],py:['padding-block'],pt:['padding-top'],pr:['padding-right'],
    pb:['padding-bottom'],pl:['padding-left'],ps:['padding-inline-start'],pe:['padding-inline-end'],
    m:['margin'],mx:['margin-inline'],my:['margin-block'],mt:['margin-top'],mr:['margin-right'],mb:['margin-bottom'],
    ml:['margin-left'],ms:['margin-inline-start'],me:['margin-inline-end'],gap:['gap'],'gap-x':['column-gap'],'gap-y':['row-gap'],
    w:['width'],h:['height'],size:['width','height'],top:['top'],right:['right'],bottom:['bottom'],left:['left'],inset:['inset'] };
  for (const [key, value] of Object.entries(theme.spacing || {})) {
    for (const [prefix, properties] of Object.entries(spacingPrefixes)) put(`${prefix}-${key}`, Object.fromEntries(properties.map(property => [property,value])));
  }
  for (const [key, value] of Object.entries(theme.fontSize || {})) {
    const [size, options] = Array.isArray(value) ? value : [value, {}];
    const declarations = { 'font-size': size };
    if (typeof options === 'string') declarations['line-height'] = options;
    else for (const [name, property] of Object.entries({ lineHeight:'line-height',fontWeight:'font-weight',letterSpacing:'letter-spacing' })) {
      if (options?.[name] !== undefined) declarations[property] = options[name];
    }
    put(`text-${key}`, declarations);
  }
  for (const [key, value] of Object.entries(theme.fontFamily || {})) {
    const [families, options] = Array.isArray(value) && value[1] && typeof value[1] === 'object' ? value : [value, {}];
    const declarations = { 'font-family': Array.isArray(families) ? families.join(', ') : families };
    if (options.fontFeatureSettings) declarations['font-feature-settings'] = options.fontFeatureSettings;
    if (options.fontVariationSettings) declarations['font-variation-settings'] = options.fontVariationSettings;
    put(`font-${key}`, declarations);
  }
  for (const [section, prefix, property] of [['fontWeight','font','font-weight'],['borderRadius','rounded','border-radius'],
    ['boxShadow','shadow','box-shadow'],['animation','animate','animation']]) {
    for (const [key, value] of Object.entries(theme[section] || {})) put(key === 'DEFAULT' ? prefix : `${prefix}-${key}`, { [property]: value });
  }
  const mappedSections = ['colors','fontFamily','fontSize','fontWeight','spacing','screens','borderRadius','keyframes','animation','boxShadow'];
  const unresolved = new Set();
  const walk = value => {
    if (typeof value === 'string') for (const match of value.matchAll(/var\(\s*(--(?:\\.|[\w.-])+)/g)) {
      const name = match[1].replace(/\\([\da-f]{1,6})\s?|\\(.)/gi, (_,hex,char) => hex ? String.fromCodePoint(parseInt(hex,16)) : char);
      if (!Object.hasOwn(variables, name)) unresolved.add(name);
    }
    else if (value && typeof value === 'object') Object.values(value).forEach(walk);
  };
  walk(preset);
  return { preset, utilities, mappedThemeSections: Object.keys(theme).filter(key => mappedSections.includes(key)),
    unmappedThemeSections: Object.keys(theme).filter(key => !mappedSections.includes(key)),
    unresolvedTokenReferences: [...unresolved].sort(),
    coverage: 'complete-preset-data-with-explicit-utility-coverage',
    utilityExpansion: 'base-property-references-not-exhaustive-tailwind-class-enumeration',
    limitations: ['Tailwind built-in theme and project overrides are not included',
      'Utilities are declaration references, not compiled CSS or evidence of component ownership',
      'Responsive and state variants require actual page CSS cascade evidence'] };
}
