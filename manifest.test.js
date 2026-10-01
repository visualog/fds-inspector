const test = require('node:test');
const assert = require('node:assert/strict');
const { existsSync } = require('node:fs');
const path = require('node:path');

const manifest = require('./manifest.json');

test('manifest does not automatically inject inspector code into every page', () => {
  assert.equal(manifest.content_scripts, undefined);
});

test('manifest keeps host permissions limited to the local bridge', () => {
  assert.deepEqual(manifest.host_permissions, [
    'http://localhost:3846/*',
    'http://127.0.0.1:3846/*',
  ]);
});

test('manifest declares packaged transparent PNG extension icons', () => {
  const expectedIcons = {
    '16': 'icons/icon-16.png',
    '32': 'icons/icon-32.png',
    '48': 'icons/icon-48.png',
    '128': 'icons/icon-128.png',
  };

  assert.deepEqual(manifest.icons, expectedIcons);
  assert.deepEqual(manifest.action.default_icon, expectedIcons);

  for (const iconPath of Object.values(expectedIcons)) {
    assert.equal(existsSync(path.join(__dirname, iconPath)), true);
  }
});
