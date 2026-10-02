const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const css = fs.readFileSync(require.resolve('./overlay.css'), 'utf8');
const rule = selector => css.slice(css.indexOf(`${selector} {`)).split('}')[0];

test('memo section has no second button surface', () => {
  assert.match(rule('.fds-card-note'), /background:\s*transparent/);
  assert.match(rule('.fds-card-note'), /padding:\s*0/);
  assert.match(css, /\.fds-card-note-action:focus-visible\s*\{[^}]*outline:/);
});

test('expanded groups share a surface and indent neutral child rows', () => {
  assert.match(rule('.fds-issue-group.is-expanded'), /background:\s*var\(--fds-local-group-surface\)/);
  assert.match(rule('.fds-list-group-details'), /padding:\s*4px 8px 8px 24px/);
  assert.match(rule('#fds-root .fds-list-group-details .fds-list-item'), /background:\s*transparent/);
  assert.match(rule('#fds-root .fds-list-group-details .fds-list-item.is-pin-active'), /background:\s*var\(--fds-local-selection-surface\)/);
  assert.match(css, /\.fds-list-group:focus-visible\s*\{[^}]*outline:/);
});
