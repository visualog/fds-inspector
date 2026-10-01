# FDS Storybook / Tailwind inspection

Published source: http://192.168.100.108:6006/

Refresh the bundled registry with `node scripts/sync-storybook-registry.mjs`.
The importer discovers CSS from iframe.html, reads index.json for documentation,
and records the timestamp and CSS SHA-256. It never executes downloaded JavaScript.
Scanning uses the bundled snapshot offline; refresh is an explicit developer action.

Implemented: registered CSS variable names AND their current resolved values are
checked against published FDS CSS. Tailwind utilities using these variables pass
through their actual stylesheet declarations. Literal utilities, arbitrary values,
unknown variables and overridden FDS values do not pass merely by matching a class
name. Issue detail displays published Tailwind alternatives and Foundation links.
Alternatives may change all sides; the UI asks developers to check application scope.

Limits: published CSS includes only utilities emitted by that Storybook build.
Suggestions are therefore incomplete, rather than an invented full Tailwind preset.
Complex/pseudo selectors are excluded from the suggestion registry; authored page
CSS still supplies token evidence. CSS evidence uses the existing scan traversal,
which is not a full cascade solver (specificity, inaccessible
stylesheets and shadow roots remain limitations). Component variants/DOM identity
and prose guidelines are not automatically validated by this first implementation.
Radius docs are not linked because this build exposes no dedicated Radius docs.

Verification: registry provenance, real p-2 mapping (8px), unknown/overridden variables,
inline literal override and conservative import parsing are covered by tests.

On 2026-10-02, the published build yielded 258 variables, 285 emitted utilities and
54 documentation links. Automated suite: 269 passing tests. Extension package
contains 49 runtime files, including the offline Storybook registry.

Browser QA (2026-10-02): Ego Lite ran 8 cases through the real inspection engine.
FDS p-2, registered background and active responsive declarations pass. Literal
8px and unknown variables are flagged as raw values; overridden spacing (13px)
and background (#ff0000) are unregistered. An inactive media rule must not mask
the active literal declaration. Disabled sheets, inactive media and unsupported
@supports rules are excluded from authored token evidence.

Re-run with ego-browser nodejs and import scripts/qa-storybook-browser.mjs, then
call runStorybookBrowserQA(taskSpace). This is page-context validation of the
actual engine, not proof of an installed Chrome extension or the complete UI.
