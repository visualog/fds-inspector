import { readFile, writeFile, rename } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readTailwindPreset, createTailwindMappings } from './tailwind-preset.mjs';

const hash = source => createHash('sha256').update(source).digest('hex');
const decode = value => value.replace(/\\([\da-f]{1,6})\s?|\\(.)/gi,
  (_, hex, char) => hex ? String.fromCodePoint(parseInt(hex, 16)) : char);

// A deliberately small literal parser. No eval, imports or component execution.
function parseStatic(text) {
  const tokens = text.match(/\s+|\/\/[^\n]*|\/\*[\s\S]*?\*\/|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`|[A-Za-z_$][\w$]*|-?\d+(?:\.\d+)?|./g) || [];
  const items = tokens.filter(token => !/^\s|^\/\//.test(token) && !token.startsWith('/*'));
  let index = 0;
  const string = token => {
    if (token.includes('${')) throw new Error('Non-static template');
    return token.slice(1, -1).replace(/\\([\\'"`nrt])/g, (_, char) => ({ n: '\n', r: '\r', t: '\t' })[char] || char);
  };
  const value = () => {
    const token = items[index++];
    if (!token) throw new Error('Missing static value');
    if (/^['"`]/.test(token)) return string(token);
    if (/^-?\d/.test(token)) return Number(token);
    if (token === 'true' || token === 'false') return token === 'true';
    if (token === 'null') return null;
    if (token === '{' || token === '[') {
      const object = token === '{';
      const result = object ? {} : [];
      const end = object ? '}' : ']';
      while (items[index] !== end) {
        if (object) {
          const keyToken = items[index++];
          if (!keyToken || !/^(?:['"`]|[\w$])/.test(keyToken)) throw new Error('Non-static key');
          const key = /^['"`]/.test(keyToken) ? string(keyToken) : keyToken;
          if (['__proto__', 'constructor', 'prototype'].includes(key) || items[index++] !== ':') throw new Error('Non-static property');
          result[key] = value();
        } else result.push(value());
        if (items[index] === ',') index++;
        else if (items[index] !== end) throw new Error('Non-static expression');
      }
      index++;
      return result;
    }
    throw new Error(`Non-static expression: ${token}`);
  };
  return { value: value(), rest: items.slice(index) };
}

export function extractComponentContract(source, name) {
  const match = /\bcva\s*\(/.exec(source);
  if (!match) throw new Error(`Static CVA missing: ${name}`);
  const base = parseStatic(source.slice(match.index + match[0].length));
  if (typeof base.value !== 'string' || base.rest[0] !== ',') throw new Error('Non-static CVA base');
  const options = parseStatic(base.rest.slice(1).join(' '));
  if (!((options.rest[0] === ')' || (options.rest[0] === ',' && options.rest[1] === ')')) && options.value.variants)) throw new Error('Non-static CVA options');
  return { name, baseClasses: base.value, variants: options.value.variants,
    defaultVariants: options.value.defaultVariants || {}, compoundVariants: options.value.compoundVariants || [],
    coverage: 'first-static-cva-definition-only', ownershipDetection: 'unavailable', sourceSha256: hash(source) };
}

export function extractPackageVariables(css) {
  const variables = {};
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const root of clean.matchAll(/:root\s*\{([^{}]*)\}/g)) {
    for (const match of root[1].matchAll(/(--(?:\\.|[\w.-])+)\s*:\s*([^;{}]+)/g)) {
      variables[decode(match[1])] = match[2].trim();
    }
  }
  return variables;
}

export function extractIconMetadata(source) {
  const boxes = [...source.matchAll(/\bviewBox\s*:\s*"([^"]+)"/g)].map(match => match[1]);
  const size = source.match(/\bsize\s*:\s*[\w$]+\s*=\s*(\d+)/);
  if (new Set(boxes).size !== 1 || !size) throw new Error('Static icon metadata missing');
  return { defaultSize: Number(size[1]), viewBox: boxes[0], sizeOverridable: true, sourceSha256: hash(source) };
}

export async function buildPackageRegistry(projectRoot) {
  if (!projectRoot) throw new Error('Specify the project containing installed @mis packages');
  const packageRoot = join(resolve(projectRoot), 'node_modules', '@mis');
  const read = (name, path) => readFile(join(packageRoot, name, path), 'utf8');
  const packages = {};
  for (const name of ['fe-ui', 'fe-tokens', 'fe-icons']) {
    const manifestText = await read(name, 'package.json');
    const manifest = JSON.parse(manifestText);
    if (manifest.name !== `@mis/${name}` || !manifest.version) throw new Error(`Package manifest mismatch: ${name}`);
    packages[manifest.name] = { version: manifest.version, manifestSha256: hash(manifestText) };
  }
  const css = await read('fe-tokens', 'dist/globals.css');
  const variables = extractPackageVariables(css);
  if (Object.keys(variables).length < 10 || variables['--spacing-1.5'] !== '6px') throw new Error('Token source incompatible; registry not generated');
  const preset = await read('fe-tokens', 'dist/index.js');
  const fullPreset = await readTailwindPreset(join(packageRoot, 'fe-tokens', 'dist/index.js'));
  const mappings = createTailwindMappings(fullPreset, variables);
  const tailwind = { ...fullPreset.theme.extend, ...mappings, sourceSha256: hash(preset) };
  const components = {};
  for (const name of ['Button', 'Input']) {
    const sourceFile = `src/components/atom/${name}/${name}.tsx`;
    components[name] = { ...extractComponentContract(await read('fe-ui', sourceFile), name), sourceFile };
  }
  const iconsText = await read('fe-icons', 'src/manifest.json');
  const icons = JSON.parse(iconsText).map(icon => {
    if (!/^I\w+$/.test(icon.name) || !['line', 'fill'].includes(icon.type)) throw new Error('Invalid icon manifest entry');
    return { name: icon.name, type: icon.type, sourceFile: icon.file };
  });
  const iconExports = await read('fe-icons', 'dist/index.js');
  for (const name of ['IAlertCircle', 'IActivity', 'IAddDocument']) {
    const chunk = iconExports.match(new RegExp(`import \\{ ${name} as \\w+ \\} from "(\\./index\\d+\\.js)"`))?.[1];
    if (!chunk) throw new Error(`Icon export missing: ${name}`);
    const icon = icons.find(item => item.name === name);
    if (!icon) throw new Error(`Icon manifest missing: ${name}`);
    Object.assign(icon, extractIconMetadata(await read('fe-icons', `dist/${chunk.slice(2)}`)), { compiledSource: `dist/${chunk.slice(2)}` });
  }
  return { schemaVersion: 1, source: { kind: 'installed-package-snapshot', capturedAt: new Date().toISOString() },
    packages, tokens: { variables, sourceFile: 'dist/globals.css', sourceSha256: hash(css), tailwind },
    components, icons: { entries: icons, manifestSha256: hash(iconsText), metadataCoverage: ['IAlertCircle', 'IActivity', 'IAddDocument'] } };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const registry = await buildPackageRegistry(process.argv[2]);
  const contents = `// Generated from installed packages; do not hand-edit.\n(function(root) {\n  const registry = ${JSON.stringify(registry, null, 2)};\n  root.FDSPackageRegistry = registry;\n  if (typeof module !== 'undefined') module.exports = registry;\n})(globalThis);\n`;
  if (process.argv.includes('--write')) {
    const target = new URL('../fds-package-registry.js', import.meta.url);
    const temporary = new URL('../fds-package-registry.js.tmp', import.meta.url);
    await writeFile(temporary, contents);
    await rename(temporary, target);
    console.log('Updated fds-package-registry.js after validating all package sources');
  } else process.stdout.write(contents);
}
