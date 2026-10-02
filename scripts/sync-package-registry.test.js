const test = require('node:test');
const assert = require('node:assert/strict');
const load = () => import('./sync-package-registry.mjs').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
  throw error;
});

test('extracts static CVA base, variants and defaults without executing source', async () => {
  const { extractComponentContract } = await load();
  assert.equal(typeof extractComponentContract, 'function');
  const contract = extractComponentContract("const buttonVariants = cva('gap-[6px] rounded-lg', {variants:{size:{sm:'rounded-md',md:'rounded-lg'}},defaultVariants:{size:'md'}});", 'Button');
  assert.equal(contract.baseClasses, 'gap-[6px] rounded-lg');
  assert.equal(contract.variants.size.sm, 'rounded-md');
  assert.equal(contract.defaultVariants.size, 'md');
});
test('dynamic component definitions fail closed rather than becoming allowed rules', async () => {
  const { extractComponentContract } = await load();
  assert.equal(typeof extractComponentContract, 'function');
  assert.throws(() => extractComponentContract("const x=cva(runCode(), {});", 'Button'), /static/i);
});
test('supports multiline template bases and a trailing CVA argument comma', async () => {
  const { extractComponentContract } = await load();
  const contract = extractComponentContract('const x=cva(`w-full\nrounded-lg`, {variants:{size:{md:"px-3"}}},);', 'Input');
  assert.equal(contract.baseClasses, 'w-full\nrounded-lg');
});
test('package variable extraction preserves decimal names and full token families', async () => {
  const { extractPackageVariables } = await load();
  assert.equal(typeof extractPackageVariables, 'function');
  const vars = extractPackageVariables(':root{--spacing-1\\.5:6px;--shadow-100:0 1px #000;--font-weight-regular:400} .x{--local:7px}');
  assert.deepEqual(vars, { '--spacing-1.5': '6px', '--shadow-100': '0 1px #000', '--font-weight-regular': '400' });
});
test('icon metadata records defaults and viewBox, not a fixed required render size', async () => {
  const { extractIconMetadata } = await load();
  assert.equal(typeof extractIconMetadata, 'function');
  const metadata = extractIconMetadata('const n=({size:l=20,...i})=>o("svg",{width:l,...i,viewBox:"0 0 20 20"});');
  assert.equal(metadata.defaultSize, 20);
  assert.equal(metadata.viewBox, '0 0 20 20');
  assert.equal(metadata.sizeOverridable, true);
});
