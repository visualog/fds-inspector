const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  createContentScanRunner,
} = require('./content-scan-runner.js');

test('content initial scan asks the runner to collect entries before a filter is active', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');

  assert.match(
    contentSource,
    /runner\.run\(\{\s*filters:\s*FILTER_KEYS,\s*activeFilter,\s*collectAllEntries:\s*!activeFilter\s*\}\)/
  );
});

test('content scan clears loading state and exposes an error message when scan fails', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');

  assert.match(contentSource, /catch\s*\(\s*error\s*\)/);
  assert.match(contentSource, /scanErrorText\s*=\s*'검사 중 오류가 발생했습니다\. 새로고침 버튼으로 다시 검사해 주세요\.'/);
  assert.match(contentSource, /finally\s*\{/);
  assert.match(contentSource, /activeScanPromise\s*=\s*null/);
});

test('content exposes a localhost-only scan error fixture trigger', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');

  assert.match(contentSource, /function\s+shouldForceScanErrorForVerification\(\)/);
  assert.match(contentSource, /hostname === 'localhost' \|\| hostname === '127\.0\.0\.1'/);
  assert.match(contentSource, /fdsInspectorForceScanError === 'true'/);
  assert.match(contentSource, /Forced scan error for local verification/);
});

test('content stores personal violation notes in chrome storage by page and issue key', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');

  assert.match(contentSource, /const VIOLATION_NOTES_STORAGE_KEY = 'fdsViolationNotes'/);
  assert.match(contentSource, /function\s+getViolationNotesPageKey\(\)/);
  assert.match(contentSource, /function\s+getViolationNoteKey\(entry\)/);
  assert.match(contentSource, /async function\s+loadViolationNotesForPage\(\)/);
  assert.match(contentSource, /async function\s+saveViolationNote\(entry,\s*text\)/);
  assert.match(contentSource, /async function\s+deleteViolationNote\(entry\)/);
  assert.match(contentSource, /chrome\.storage\?\.local\.get\(VIOLATION_NOTES_STORAGE_KEY\)/);
  assert.match(contentSource, /chrome\.storage\?\.local\.set\(\{ \[VIOLATION_NOTES_STORAGE_KEY\]:/);
});

test('content summary hides completed scan metrics from the persistent panel UI', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
  const styleSource = fs.readFileSync(path.join(__dirname, 'overlay.css'), 'utf8');

  assert.match(contentSource, /function\s+formatScanCompletionText/);
  assert.match(contentSource, /검사 완료 · \$\{scanned\}\/\$\{total\}개 요소/);
  assert.doesNotMatch(contentSource, /class="fds-panel-info"/);
  assert.doesNotMatch(contentSource, /completedInfoText/);
  assert.doesNotMatch(styleSource, /\.fds-panel-info/);
});

test('content summary keeps scan scope out of the persistent panel while preserving badge context', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
  const styleSource = fs.readFileSync(path.join(__dirname, 'overlay.css'), 'utf8');
  const toolbarStateSource = fs.readFileSync(path.join(__dirname, 'toolbar-state.js'), 'utf8');

  assert.match(contentSource, /function\s+formatScanScopeText\(meta = scanData\?\.meta\)/);
  assert.match(contentSource, /렌더링 기준 · 검사됨 \$\{scanned\.toLocaleString\('ko-KR'\)\}개 · 제외됨 \$\{skipped\.toLocaleString\('ko-KR'\)\}개/);
  assert.doesNotMatch(contentSource, /const scanScopeText = formatScanScopeText\(\)/);
  assert.doesNotMatch(contentSource, /class="fds-panel-meta"/);
  assert.doesNotMatch(styleSource, /\.fds-panel-meta\s*\{/);
  assert.match(toolbarStateSource, /function\s+formatScanScopeText\(scanData = \{\}\)/);
  assert.match(toolbarStateSource, /badgeFullCount[\s\S]*scanScopeText[\s\S]*filter\(Boolean\)\.join\(' · '\)/);
});

test('content opens saved violation reports in a new tab while keeping the download', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');

  assert.match(contentSource, /function\s+createTextFileUrl\(\{ content,\s*type = 'text\/html;charset=utf-8' \}\)/);
  assert.match(contentSource, /function\s+downloadTextFileFromUrl\(\{ filename,\s*url \}\)/);
  assert.match(contentSource, /function\s+openReportInNewTab\(url\)/);
  assert.match(contentSource, /window\.open\(url,\s*'_blank',\s*'noopener'\)/);
  assert.match(contentSource, /downloadTextFileFromUrl\(\{\s*filename,\s*url\s*\}\)/);
  assert.doesNotMatch(contentSource, /downloadTextFileFromUrl\(\{\s*filename: aiRequestFilename,\s*url: aiRequestUrl\s*\}\)/);
  assert.match(contentSource, /getViolationNoteForEntry,\s*\n\s*\}\)/);
  assert.match(contentSource, /openReportInNewTab\(url\)/);
  assert.match(contentSource, /URL\.revokeObjectURL\(url\)/);
});

test('content summary selects warning color results when danger count is empty', () => {
  const summaryModelSource = fs.readFileSync(path.join(__dirname, 'content-summary-model.js'), 'utf8');

  assert.match(summaryModelSource, /function\s+normalizeActiveSummaryToneForCounts\(toneCounts = EMPTY_TONE_COUNTS\)/);
  assert.match(summaryModelSource, /activeSummaryTone === 'danger' && toneCounts\.danger === 0 && toneCounts\.warning > 0/);
  assert.match(summaryModelSource, /setActiveSummaryTone\('warning'\)/);
});

test('content summary filters non-color issue lists by selected missing or raw card', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
  const summaryModelSource = fs.readFileSync(path.join(__dirname, 'content-summary-model.js'), 'utf8');

  assert.match(summaryModelSource, /if \(activeFilter !== 'color'\) \{[\s\S]*return entries\.filter\(\(entry\) => entry\.tone === activeSummaryTone\);[\s\S]*\}/);
  assert.match(contentSource, /if \(activeFilter && activeFilter !== 'color'\) \{[\s\S]*normalizeActiveSummaryToneForCounts\(getToneCountsForEntries\(activeIssueEntries\)\);[\s\S]*\}/);
  assert.match(summaryModelSource, /activeFilter \? getActiveSummaryTone\(\) : 'all'/);
});

test('content summary groups toggle details while child rows navigate issues on click', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');

  assert.match(contentSource, /querySelectorAll\('\.fds-list-group\[data-group-key\]'\)/);
  assert.match(contentSource, /const offsetY = button\.closest\?\.\('\.fds-summary-list'\) \? 6 : 18;/);
  assert.match(contentSource, /window\.scrollY \+ rect\.top - tooltipHeight - offsetY/);
  assert.doesNotMatch(contentSource, /const showGroupPin/);
  assert.doesNotMatch(contentSource, /\.fds-list-group\[data-group-key\]'[\s\S]*?showInspectorCardForEntries\(entry\.element, \[entry\]\)[\s\S]*?panel\.querySelectorAll\('\.fds-list-item\[data-issue-key\]'\)/);
  assert.match(contentSource, /item\.onclick = \(event\) => \{[\s\S]*event\.preventDefault\(\);[\s\S]*event\.stopPropagation\(\);[\s\S]*expandedIssueGroupKeys = nextExpandedKeys;[\s\S]*updateSummaryUI\(\);/);
  assert.match(contentSource, /querySelectorAll\('\.fds-list-item\[data-issue-key\]'\)/);
  assert.match(contentSource, /const showPin = \(\{ locked = false,\s*isolate = false \} = \{\}\) =>/);
  assert.match(contentSource, /const issueKeys = parseIssueKeysDataset\(item\.dataset\.issueKeys\);/);
  assert.match(contentSource, /const isolatedEntries = getVisibleIssueEntriesByKeys\(issueKeys\);/);
  assert.match(contentSource, /applyVisibleIssueHighlights\(isolatedEntries\.length \? isolatedEntries : \[entry\]\);/);
  assert.match(contentSource, /function\s+renderViolationPins\(entries = \[\]\)/);
  assert.match(contentSource, /function\s+getOrderedViolationPinEntries\(entries = \[\]\)/);
  assert.match(contentSource, /\.sort\(\(a, b\) => a\.top - b\.top \|\| a\.left - b\.left \|\| a\.index - b\.index\)/);
  assert.match(contentSource, /const label = String\(index \+ 1\);/);
  assert.match(contentSource, /const title = `위반 요소 \$\{label\}`;/);
  assert.match(contentSource, /setActiveViolationPins\(isolatedEntries\.length \? isolatedEntries : \[entry\], \{ locked \}\);/);
  assert.match(contentSource, /if \(activeIsolatedIssueKey === issueKey\) \{[\s\S]*applyVisibleIssueHighlights\(\);[\s\S]*return;/);
  assert.match(contentSource, /item\.onmouseenter = \(\) => showToolbarButtonTooltip\(item\);/);
  assert.match(contentSource, /item\.onfocus = \(\) => showToolbarButtonTooltip\(item\);/);
  assert.match(contentSource, /item\.onmouseleave = hideTooltip;/);
  assert.doesNotMatch(contentSource, /item\.onmouseenter = \(\) => \{[\s\S]*showPin\(\)/);
  assert.doesNotMatch(contentSource, /const showPin = \(\{ locked = false \} = \{\}\) => \{[\s\S]*?showInspectorCardForEntries\(entry\.element, \[entry\]\)[\s\S]*?return entry;/);
  assert.match(contentSource, /const entry = showPin\(\{ locked: true,\s*isolate: true \}\);/);
  assert.match(contentSource, /scrollToIssueElement\(entry,\s*\{[\s\S]*ignoreCustomPosition:\s*true,[\s\S]*issueEntries:/);
});

test('content scrolls issue elements through nested app containers before window fallback', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');

  assert.match(contentSource, /function\s+scheduleIssuePreviewAfterScroll\(entry,\s*\{\s*ignoreCustomPosition\s*=\s*false,\s*issueEntries\s*=\s*null\s*\}\s*=\s*\{\}\)/);
  assert.match(contentSource, /entry\.element\.scrollIntoView\(\{[\s\S]*block:\s*'center'[\s\S]*inline:\s*'center'[\s\S]*behavior/);
  assert.match(contentSource, /scheduleIssuePreviewAfterScroll\(entry,\s*\{\s*ignoreCustomPosition,\s*issueEntries\s*\}\);[\s\S]*return;[\s\S]*catch \(error\)/);
  assert.match(contentSource, /function\s+scheduleIssuePreviewAfterScroll\(entry,[\s\S]*const maxWaitMs = 900/);
  assert.match(contentSource, /const isTargetReady = rect && isViolationPinTargetVisible\(rect\)/);
  assert.match(contentSource, /if \(!isTargetReady && getElapsedMs\(\) < maxWaitMs\) \{[\s\S]*window\.setTimeout\?\.?\(updateIssuePreview,\s*80\)/);
  assert.match(contentSource, /function\s+scheduleIssuePreviewAfterScroll\(entry,[\s\S]*showInspectorCardForEntries\(entry\.element,\s*entriesForPreview,\s*entry\.element,\s*\{\s*ignoreCustomPosition\s*\}\)/);
  assert.match(contentSource, /if \(typeof window\.scrollTo !== 'function'\) return;[\s\S]*window\.scrollTo\(\{/);
  assert.match(contentSource, /window\.setTimeout\?\.?\(updateIssuePreview,\s*240\)/);
  assert.match(contentSource, /window\.setTimeout\?\.?\(updateIssuePreview,\s*maxWaitMs\)/);
});

test('overlay exposes visible keyboard focus states for summary controls', () => {
  const styleSource = fs.readFileSync(path.join(__dirname, 'overlay.css'), 'utf8');

  assert.match(styleSource, /\.fds-summary-tab:focus-visible/);
  assert.match(styleSource, /\.fds-stat-box\.is-toggle:focus-visible/);
  assert.match(styleSource, /\.fds-panel-close:focus-visible/);
  assert.match(styleSource, /outline: 2px solid/);
});

test('spacing violations expose directional padding and margin markers', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
  const styleSource = fs.readFileSync(path.join(__dirname, 'overlay.css'), 'utf8');

  assert.match(contentSource, /function\s+getSpacingIssueMetadata\(entries = \[\]\)/);
  assert.match(contentSource, /entry\?\.metadata\?\.spacing/);
  assert.match(contentSource, /function\s+markScannedElementsFromEntries\(\)[\s\S]*renderGapHighlights\(scanData\.issueEntries\)/);
  assert.match(contentSource, /function\s+clearInspectionMarks\(\)\s*\{[\s\S]*clearGapHighlights\(\)/);
  assert.match(contentSource, /data-fds-spacing-kind/);
  assert.match(contentSource, /data-fds-spacing-sides/);
  assert.match(contentSource, /data-fds-spacing-label/);
  assert.match(contentSource, /function\s+applyElementSpacingAreaVariables\(element, spacingMetadata\)/);
  assert.match(contentSource, /--fds-spacing-area-\$\{side\}/);
  assert.match(contentSource, /function\s+renderGapHighlights\(entries = getVisibleIssueEntries\(\)\)/);
  assert.match(contentSource, /function\s+getGapHighlightLayer\(\)/);
  assert.match(contentSource, /function\s+getRadiusHighlightLayer\(\)/);
  assert.match(contentSource, /function\s+getTextColorHighlightLayer\(\)/);
  assert.match(contentSource, /id="fds-gap-highlight-layer" class="fds-gap-highlight-layer"/);
  assert.match(contentSource, /id="fds-radius-highlight-layer" class="fds-radius-highlight-layer"/);
  assert.match(contentSource, /id="fds-text-color-highlight-layer" class="fds-text-color-highlight-layer"/);
  assert.match(contentSource, /const layer = getGapHighlightLayer\(\);[\s\S]*clearGapHighlights\(\);/);
  assert.match(contentSource, /function\s+renderTextColorHighlights\(entries = getVisibleIssueEntries\(\)\)/);
  assert.match(contentSource, /function\s+getTextColorMarkerRects\(element\)/);
  assert.match(contentSource, /range\.getClientRects/);
  assert.match(contentSource, /function\s+appendTextColorMarker\(layer, rect\)/);
  assert.match(contentSource, /const\s+gapHighlightScheduler\s*=\s*createVisualUpdateScheduler/);
  assert.match(contentSource, /const\s+radiusHighlightScheduler\s*=\s*createVisualUpdateScheduler/);
  assert.match(contentSource, /const\s+textColorHighlightScheduler\s*=\s*createVisualUpdateScheduler/);
  assert.match(contentSource, /function\s+scheduleGapHighlightUpdate\(\)\s*\{\s*gapHighlightScheduler\.schedule\(\)/);
  assert.match(contentSource, /function\s+scheduleRadiusHighlightUpdate\(\)\s*\{\s*radiusHighlightScheduler\.schedule\(\)/);
  assert.match(contentSource, /function\s+scheduleTextColorHighlightUpdate\(\)\s*\{\s*textColorHighlightScheduler\.schedule\(\)/);
  assert.match(contentSource, /scheduleTextColorHighlightUpdate\(\)/);
  assert.match(contentSource, /renderTextColorHighlights\(scanData\.issueEntries\)/);
  assert.match(contentSource, /function\s+renderRadiusHighlights\(entries = getVisibleIssueEntries\(\)\)/);
  assert.match(contentSource, /function\s+parseCssRadiusPair\(value\)/);
  assert.match(contentSource, /function\s+getRadiusCornerRects\(element\)/);
  assert.match(contentSource, /styles\.borderTopLeftRadius/);
  assert.match(contentSource, /--fds-radius-corner-width/);
  assert.match(contentSource, /function\s+appendRadiusCornerMarker\(layer, rect\)/);
  assert.match(contentSource, /function\s+renderViolationPins\(entries = \[\]\)[\s\S]*const layer = getViolationPinLayer\(\)/);
  assert.match(contentSource, /function\s+getGapMarkerRects\(element, spacingMetadata\)/);
  assert.match(contentSource, /function\s+getVisibleGapParticipantRects\(element\)/);
  assert.match(contentSource, /function\s+getDirectTextNodeRects\(element\)/);
  assert.match(contentSource, /return getVisibleGapParticipantRects\(element\)/);
  assert.match(contentSource, /range\.selectNodeContents\(node\)/);
  assert.match(contentSource, /function\s+getGapFallbackMarkerRects\(element, spacingMetadata, existingMarkerRects = \[\]\)/);
  assert.match(contentSource, /function\s+getContentBoxRect\(element\)/);
  assert.match(contentSource, /function\s+getGapItemMarkerRects\(element, spacingMetadata\)/);
  assert.match(contentSource, /function\s+getBoxSpacingMarkerRects\(element, spacingMetadata\)/);
  assert.match(contentSource, /function\s+appendGapOverlayMarker\(layer, className, rect, dataset = \{\}\)/);
  assert.match(contentSource, /appendGapOverlayMarker\(layer, 'fds-spacing-box-highlight', element\.getBoundingClientRect\(\), \{ kind: spacingMetadata\.kind \}\)/);
  assert.match(contentSource, /appendGapOverlayMarker\(layer, 'fds-spacing-area-highlight', rect, \{ kind: rect\.kind, side: rect\.side \}\)/);
  assert.match(contentSource, /appendGapOverlayMarker\(layer, 'fds-gap-box-highlight', element\.getBoundingClientRect\(\), \{ kind: spacingMetadata\.kind \}\)/);
  assert.match(contentSource, /appendGapOverlayMarker\(layer, 'fds-gap-item-highlight', rect\)/);
  assert.match(contentSource, /const fallbackMarkerRects = getGapFallbackMarkerRects\(element, spacingMetadata, gapMarkerRects\)/);
  assert.match(contentSource, /appendGapOverlayMarker\(layer, 'fds-gap-highlight', rect, \{ axis: rect\.axis, fallback: rect\.fallback \? 'true' : 'false' \}\)/);
  assert.match(contentSource, /scheduleGapHighlightUpdate\(\)/);
  assert.match(contentSource, /scheduleRadiusHighlightUpdate\(\)/);
  assert.match(contentSource, /element\.style\.position = 'relative'/);
  assert.match(styleSource, /\.fds-violation\[data-fds-category="spacing"\]::before/);
  assert.match(styleSource, /\[data-fds-spacing-kind="padding"\]::before/);
  assert.match(styleSource, /\[data-fds-spacing-kind="margin"\]::before/);
  assert.match(styleSource, /\[data-fds-spacing-kind="gap"\]::before/);
  assert.match(styleSource, /\.fds-text-color-highlight-layer,\s*\.fds-gap-highlight-layer,\s*\.fds-radius-highlight-layer,\s*\.fds-issue-pin-layer\s*\{[\s\S]*position:\s*fixed/);
  assert.match(styleSource, /\.fds-issue-pin-layer\s*\{[\s\S]*z-index:\s*2147483645/);
  assert.match(styleSource, /\.fds-text-color-highlight\s*\{[\s\S]*background:\s*var\(--fds-devtools-content-fill,\s*rgba\(111,\s*168,\s*220,\s*0\.22\)\)/);
  assert.match(styleSource, /\.fds-violation\[data-fds-category="color"\]\[data-fds-color-part="text"\]\s*\{[\s\S]*box-shadow:\s*none !important/);
  assert.match(styleSource, /\.fds-gap-highlight\s*\{[\s\S]*position:\s*fixed/);
  assert.match(styleSource, /\.fds-radius-corner-highlight\s*\{[\s\S]*position:\s*fixed/);
  assert.match(styleSource, /\.fds-violation\[data-fds-category="radius"\]\s*\{[\s\S]*box-shadow:\s*none !important/);
  assert.match(styleSource, /\.fds-radius-corner-highlight\s*\{[\s\S]*color:\s*rgba\(255,\s*229,\s*153,\s*0\.98\)/);
  assert.match(styleSource, /\.fds-radius-corner-highlight\[data-corner="top-left"\]\s*\{[\s\S]*border-top-left-radius:\s*var\(--fds-radius-corner-width,\s*16px\) var\(--fds-radius-corner-height,\s*16px\)/);
  assert.match(styleSource, /\[data-fds-spacing-kind="gap"\]\s*\{[\s\S]*box-shadow:\s*none !important/);
  assert.match(styleSource, /\[data-fds-spacing-kind="gap"\]\s*\{[\s\S]*outline-color:\s*transparent !important/);
  assert.match(styleSource, /\[data-fds-spacing-kind="margin"\]::before\s*\{[\s\S]*border:\s*none/);
  assert.match(styleSource, /\.fds-gap-item-highlight\s*\{[\s\S]*background:\s*transparent/);
  assert.match(styleSource, /\.fds-gap-item-highlight\s*\{[\s\S]*border:\s*none/);
  assert.match(styleSource, /\.fds-gap-box-highlight\s*\{[\s\S]*border:\s*1px solid rgba\(161,\s*120,\s*255,\s*0\.82\)/);
  assert.match(styleSource, /\.fds-gap-highlight\s*\{[\s\S]*border:\s*none/);
  assert.match(styleSource, /\.fds-gap-highlight\s*\{[\s\S]*repeating-linear-gradient\(\s*45deg/);
  assert.match(styleSource, /\.fds-gap-highlight\[data-fallback="true"\]\s*\{[\s\S]*opacity:\s*0\.82/);
  assert.match(styleSource, /\.fds-spacing-box-highlight,\s*\.fds-spacing-area-highlight,\s*\.fds-text-color-highlight\s*\{[\s\S]*position:\s*fixed/);
  assert.match(styleSource, /\.fds-violation\[data-fds-category="spacing"\]::before\s*\{[\s\S]*display:\s*none/);
  assert.match(styleSource, /\.fds-spacing-area-highlight\[data-kind="padding"\]\s*\{[\s\S]*background:\s*var\(--fds-devtools-padding-fill/);
  assert.match(styleSource, /\.fds-spacing-area-highlight\[data-kind="margin"\]\s*\{[\s\S]*background:\s*var\(--fds-devtools-margin-fill/);
  assert.match(styleSource, /--fds-devtools-content-line:\s*rgba\(111,\s*168,\s*220,\s*0\.95\)/);
  assert.match(styleSource, /--fds-devtools-padding-fill:\s*rgba\(147,\s*196,\s*125,\s*0\.36\)/);
  assert.match(styleSource, /--fds-devtools-radius-line:\s*rgba\(255,\s*229,\s*153,\s*0\.98\)/);
  assert.match(styleSource, /--fds-devtools-margin-fill:\s*rgba\(246,\s*178,\s*107,\s*0\.34\)/);
  assert.match(styleSource, /--fds-devtools-gap-line:\s*rgba\(161,\s*120,\s*255,\s*0\.96\)/);
  assert.match(styleSource, /\.fds-violation\s*\{[\s\S]*outline:\s*2px solid var\(--fds-devtools-content-line\) !important/);
  assert.match(styleSource, /\.fds-violation\s*\{[\s\S]*inset 0 0 0 9999px var\(--fds-devtools-content-fill\)/);
  assert.match(styleSource, /\.fds-violation\[data-fds-category="spacing"\]\s*\{[\s\S]*outline-color:\s*transparent !important/);
  assert.match(styleSource, /\.fds-violation\[data-fds-category="spacing"\]::before\s*\{[\s\S]*border:\s*none/);
  assert.match(styleSource, /\.fds-inspected\.fds-hover-target\s*\{[\s\S]*outline:\s*2px solid rgba\(111,\s*168,\s*220,\s*0\.98\) !important/);
  assert.match(styleSource, /\.fds-inspected\.fds-hover-target\.fds-violation-warning\s*\{[\s\S]*outline-color:\s*rgba\(111,\s*168,\s*220,\s*0\.98\) !important/);
  assert.match(styleSource, /\.fds-inspected\.fds-hover-target\[data-fds-category="spacing"\]\s*\{[\s\S]*outline-color:\s*transparent !important/);
  assert.match(styleSource, /\.fds-inspected\.fds-hover-target\[data-fds-category="radius"\]\s*\{[\s\S]*outline-color:\s*transparent !important/);
  assert.doesNotMatch(styleSource, /\.fds-inspected\.fds-hover-target\s*\{[^}]*2px dashed/);
  assert.match(styleSource, /top \/ 100% var\(--fds-spacing-area-top, 0px\) no-repeat/);
  assert.match(styleSource, /right \/ var\(--fds-spacing-area-right, 0px\) 100% no-repeat/);
  assert.match(styleSource, /calc\(var\(--fds-spacing-area-top, 0px\) \* -1\)/);
  assert.doesNotMatch(styleSource, /\.fds-violation\[data-fds-category="spacing"\][^{]*::after/);
});

test('scan runner preserves issue metadata on visible entries', async () => {
  const runner = createContentScanRunner({
    batchSize: 10,
    getElements: () => [{ visible: true }],
    isElementVisible: () => true,
    getStyles: () => ({}),
    inspectElement: () => ({
      issues: ['갭 3px (미등록)'],
      issueDetails: [{ spacing: { kind: 'gap', sides: ['row', 'column'], value: 3 } }],
      suggestions: [],
    }),
    addIssueEntry: ({ category, message, metadata }) => ({
      key: `${category}-${message}`,
      category,
      message,
      metadata,
    }),
    markElement: () => {},
    yieldToBrowser: async () => {},
  });

  const result = await runner.run({ filters: ['spacing'], activeFilter: 'spacing' });

  assert.deepEqual(result.issueEntries[0].metadata, {
    spacing: { kind: 'gap', sides: ['row', 'column'], value: 3 },
  });
});

test('overlay shields the page from hover and click interactions while inspecting results', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
  const toolbarUiSource = fs.readFileSync(path.join(__dirname, 'content-toolbar-ui.js'), 'utf8');
  const styleSource = fs.readFileSync(path.join(__dirname, 'overlay.css'), 'utf8');

  assert.match(contentSource, /<div id="fds-page-interaction-shield" class="fds-page-interaction-shield" aria-hidden="true"><\/div>/);
  assert.match(contentSource, /function\s+bindPageInteractionShieldEvents\(root = document\.getElementById\('fds-root'\)\)/);
  assert.match(contentSource, /shield\.addEventListener\('wheel', handlePageInteractionShieldWheel, \{ capture: true, passive: false \}\)/);
  assert.match(contentSource, /function\s+getElementUnderShield\(shield, clientX, clientY\)/);
  assert.match(contentSource, /function\s+getScrollableAncestor\(element, deltaX = 0, deltaY = 0\)/);
  assert.match(contentSource, /function\s+handlePageInteractionShieldWheel\(event\)/);
  assert.match(contentSource, /scrollTarget\.scrollBy\(\{[\s\S]*left: event\.deltaX,[\s\S]*top: event\.deltaY/);
  assert.match(contentSource, /'pointerover'[\s\S]*'pointermove'[\s\S]*'mouseover'[\s\S]*'mousemove'[\s\S]*'click'[\s\S]*'contextmenu'/);
  assert.match(contentSource, /event\.stopPropagation\(\);[\s\S]*eventName === 'click'[\s\S]*event\.preventDefault\(\)/);
  assert.match(contentSource, /mountPoint\.appendChild\(root\);[\s\S]*bindPageInteractionShieldEvents\(root\);/);
  assert.match(contentSource, /root\.dataset\.pageInteractionShield = activeFilter \|\| isScanning \? 'active' : 'idle';/);
  assert.match(toolbarUiSource, /root\.querySelector\('#fds-page-interaction-shield'\)/);
  assert.match(styleSource, /\.fds-page-interaction-shield\s*\{[\s\S]*position:\s*fixed/);
  assert.match(styleSource, /\.fds-page-interaction-shield\s*\{[\s\S]*inset:\s*0/);
  assert.match(styleSource, /\.fds-page-interaction-shield\s*\{[\s\S]*z-index:\s*2147483643/);
  assert.match(styleSource, /\.fds-page-interaction-shield\s*\{[\s\S]*pointer-events:\s*none/);
  assert.match(styleSource, /#fds-root\[data-page-interaction-shield="active"\]\s+\.fds-page-interaction-shield\s*\{[\s\S]*pointer-events:\s*auto/);
  assert.match(styleSource, /\.fds-issue-pin-layer\s*\{[\s\S]*z-index:\s*2147483644/);
  assert.match(styleSource, /\.fds-summary-card\s*\{[\s\S]*z-index:\s*2147483645/);
  assert.match(styleSource, /\.fds-card\s*\{[\s\S]*z-index:\s*2147483646/);
  assert.match(styleSource, /#fds-root \.fds-toolbar\s*\{[\s\S]*z-index:\s*2147483647/);
});

test('active summary detail items use the same background color as violation pins', () => {
  const styleSource = fs.readFileSync(path.join(__dirname, 'overlay.css'), 'utf8');

  assert.match(styleSource, /\.fds-issue-pin\.danger\s*\{[\s\S]*--fds-issue-pin-bg:\s*#D84936;[\s\S]*background:\s*var\(--fds-issue-pin-bg\)/);
  assert.match(styleSource, /\.fds-issue-pin\.warning\s*\{[\s\S]*--fds-issue-pin-bg:\s*#D49C13;[\s\S]*background:\s*var\(--fds-issue-pin-bg\)/);
  assert.doesNotMatch(styleSource, /\.fds-list-group\.danger\s*\{[^}]*--fds-list-pin-bg:\s*#D84936/);
  assert.doesNotMatch(styleSource, /\.fds-list-group\.warning\s*\{[^}]*--fds-list-pin-bg:\s*#D49C13/);
  assert.doesNotMatch(styleSource, /\.fds-list-group\.is-expanded\s*\{[^}]*background:\s*#D84936/);
  assert.doesNotMatch(styleSource, /\.fds-list-group\.is-expanded\s*\{[^}]*background:\s*#D49C13/);
  assert.match(styleSource, /\.fds-list-item\.danger\s*\{[\s\S]*--fds-list-pin-bg:\s*#D84936/);
  assert.match(styleSource, /\.fds-list-item\.warning\s*\{[\s\S]*--fds-list-pin-bg:\s*#D49C13/);
  assert.match(styleSource, /\.fds-list-item\.is-pin-active\s*\{[\s\S]*background:\s*var\(--fds-list-pin-bg\)/);
  assert.match(styleSource, /\.fds-list-item\.danger\.is-pin-active,[\s\S]*?\.fds-list-item\.danger\.is-pin-active:hover,[\s\S]*?\.fds-list-item\.danger\.is-pin-active:focus-visible\s*\{[\s\S]*background:\s*#D84936/);
  assert.match(styleSource, /\.fds-list-item\.warning\.is-pin-active,[\s\S]*?\.fds-list-item\.warning\.is-pin-active:hover,[\s\S]*?\.fds-list-item\.warning\.is-pin-active:focus-visible\s*\{[\s\S]*background:\s*#D49C13/);
  assert.match(styleSource, /\.fds-list-label-icon\s*\{[\s\S]*display:\s*none/);
  assert.match(styleSource, /\.fds-list-item\.is-pin-active \.fds-list-label-icon\s*\{[\s\S]*display:\s*inline-flex/);
  assert.match(styleSource, /\.fds-list-item\.is-pin-active \.fds-list-label-text\s*\{[\s\S]*color:\s*#fff/);
  assert.doesNotMatch(styleSource, /\.fds-list-item\.danger:hover,[\s\S]*?\.fds-list-item\.danger\.is-pin-active\s*\{/);
  assert.doesNotMatch(styleSource, /\.fds-list-item\.warning:hover,[\s\S]*?\.fds-list-item\.warning\.is-pin-active\s*\{/);
});

test('summary panel cards and lists render without borders', () => {
  const styleSource = fs.readFileSync(path.join(__dirname, 'overlay.css'), 'utf8');

  assert.match(styleSource, /\.fds-summary-card\s*\{[\s\S]*border:\s*none/);
  assert.match(styleSource, /\.fds-stat-box\s*\{[\s\S]*border:\s*none/);
  assert.doesNotMatch(styleSource, /\.fds-stat-box\.(danger|success|warning)(?:\.[^{\s]+)?\s*\{[^}]*border-color:/);
  assert.match(styleSource, /\.fds-list-group\s*\{[\s\S]*border:\s*none/);
  assert.match(styleSource, /\.fds-list-item\s*\{[\s\S]*border:\s*none/);
  assert.match(styleSource, /\.fds-list-group-details\s*\{[\s\S]*border-left:\s*none/);
  assert.doesNotMatch(styleSource, /\.fds-list-group\.(danger|success|warning)\s*\{[^}]*border-color:/);
  assert.doesNotMatch(styleSource, /\.fds-list-item\.(danger|success|warning)(?:\.[^{\s]+)?\s*\{[^}]*border-color:/);
});

test('overlay keeps group rows focused on value and count', () => {
  const styleSource = fs.readFileSync(path.join(__dirname, 'overlay.css'), 'utf8');

  assert.match(styleSource, /\.fds-list-group\s*\{[\s\S]*grid-template-columns:\s*14px minmax\(0, 1fr\) max-content/);
  assert.match(styleSource, /\.fds-list-group\s*\{[\s\S]*padding:\s*0 8px/);
  assert.match(styleSource, /\.fds-list-group\s*\{[\s\S]*column-gap:\s*4px/);
  assert.doesNotMatch(styleSource, /\.fds-list-group\s*\{[\s\S]*column-gap:\s*7px/);
  assert.match(styleSource, /\.fds-group-caret\s*\{[\s\S]*align-self:\s*center/);
  assert.match(styleSource, /\.fds-group-caret\s*\{[\s\S]*line-height:\s*0/);
  assert.match(styleSource, /\.fds-group-caret-icon\s*\{[\s\S]*display:\s*block/);
  assert.match(styleSource, /\.fds-group-caret-icon\s*\{[\s\S]*width:\s*14px/);
  assert.match(styleSource, /\.fds-group-caret-icon\s*\{[\s\S]*height:\s*14px/);
  assert.doesNotMatch(styleSource, /\.fds-group-caret::before\s*\{/);
  assert.match(styleSource, /\.fds-group-count\s*\{[\s\S]*display:\s*inline-flex/);
  assert.match(styleSource, /\.fds-group-count\s*\{[\s\S]*align-items:\s*center/);
  assert.match(styleSource, /\.fds-group-count\s*\{[\s\S]*min-width:\s*12px/);
  assert.match(styleSource, /\.fds-group-value\s*\{[\s\S]*text-overflow:\s*ellipsis/);
  assert.match(styleSource, /\.fds-group-value\s*\{[\s\S]*display:\s*inline-flex/);
  assert.match(styleSource, /\.fds-group-value\s*\{[\s\S]*align-items:\s*center/);
  assert.doesNotMatch(styleSource, /\.fds-group-status\s*\{/);
  assert.doesNotMatch(styleSource, /\.fds-group-chip\s*\{/);
});

test('overlay keeps scrollbar gutters stable during panel focus changes', () => {
  const styleSource = fs.readFileSync(path.join(__dirname, 'overlay.css'), 'utf8');

  assert.match(styleSource, /\.fds-panel-body\s*\{[\s\S]*scrollbar-width:\s*thin/);
  assert.match(styleSource, /\.fds-summary-card\s*\{[\s\S]*overflow-y:\s*hidden/);
  assert.match(styleSource, /\.fds-summary-card\s*\{[\s\S]*scrollbar-width:\s*none/);
  assert.match(styleSource, /\.fds-summary-list\s*\{[\s\S]*overflow-y:\s*auto/);
  assert.match(styleSource, /\.fds-summary-list\s*\{[\s\S]*scrollbar-width:\s*none/);
  assert.match(styleSource, /\.fds-summary-list\.is-scrollable\s*\{[\s\S]*overflow-y:\s*auto/);
  assert.match(styleSource, /\.fds-summary-list\.is-scrollable\s*\{[\s\S]*scrollbar-width:\s*none/);
  assert.match(styleSource, /\.fds-panel-body\s*\{[\s\S]*scrollbar-gutter:\s*stable/);
  assert.doesNotMatch(styleSource, /\.fds-summary-list\.is-scrollable\s*\{[\s\S]*scrollbar-gutter:/);
  assert.match(styleSource, /\.fds-summary-card::-webkit-scrollbar\s*\{[\s\S]*width:\s*0/);
  assert.match(styleSource, /\.fds-summary-card\.is-resizing\s*\{[\s\S]*scrollbar-width:\s*none/);
  assert.match(styleSource, /\.fds-summary-card\.is-resizing\s+\.fds-panel-body\s*\{[\s\S]*scrollbar-width:\s*none/);
  assert.match(styleSource, /\.fds-summary-card\.is-resizing::-webkit-scrollbar\s*\{[\s\S]*width:\s*0/);
  assert.match(styleSource, /\.fds-summary-card\.is-resizing\s+\.fds-panel-body::-webkit-scrollbar\s*\{[\s\S]*width:\s*0/);
  assert.match(styleSource, /\.fds-summary-list::-webkit-scrollbar,\s*\.fds-summary-list\.is-scrollable::-webkit-scrollbar,\s*\.fds-summary-card\.is-resizing\s+\.fds-summary-list::-webkit-scrollbar,\s*\.fds-summary-card\.is-resizing\s+\.fds-summary-list\.is-scrollable::-webkit-scrollbar\s*\{[\s\S]*width:\s*0/);
  assert.match(styleSource, /\.fds-summary-list::-webkit-scrollbar-thumb\s*\{[\s\S]*background-clip:\s*content-box/);
  assert.match(styleSource, /\.fds-summary-list::-webkit-scrollbar-thumb\s*\{[\s\S]*border:\s*2px solid transparent/);
  assert.doesNotMatch(
    styleSource,
    /\.fds-panel-body:hover,\s*\.fds-panel-body:focus-within\s*\{[^}]*scrollbar-width/
  );
  assert.doesNotMatch(
    styleSource,
    /\.fds-summary-list(?:\.is-scrollable)?:hover,\s*\.fds-summary-list(?:\.is-scrollable)?:focus-within\s*\{[^}]*scrollbar-width/
  );
  assert.doesNotMatch(
    styleSource,
    /\.fds-summary-card:hover,\s*\.fds-summary-card:focus-within\s*\{[^}]*scrollbar-color/
  );
});

test('content clears previous issue preview when switching inspection filters', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');

  assert.match(contentSource, /function\s+clearActiveViolationPin\(\)\s*\{/);
  assert.match(contentSource, /clearHoveredInspectionTarget\(\)/);
  assert.match(contentSource, /hideInspectorCard\(\)/);
  assert.match(contentSource, /function\s+setActiveFilter\(nextFilter\)[\s\S]*clearActiveViolationPin\(\)/);
});

test('content wires motion feedback into panel, inspector, pin, and copy interactions', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');

  assert.match(contentSource, /requestSummaryMotion\('tab'\)/);
  assert.match(contentSource, /getFDSMotion\(\)\?\.animateTabSwitch\?\.?\(panel,\s*tabSwitchMotionOptions\)/);
  assert.match(contentSource, /getFDSMotion\(\)\?\.animatePanelOpen\?\.?\(panel\)/);
  assert.match(contentSource, /getFDSMotion\(\)\?\.animateSummaryRefresh\?\.?\(panel/);
  assert.match(contentSource, /getFDSMotion\(\)\?\.animateInspectorCard\?\.?\(card\)/);
  assert.match(contentSource, /getFDSMotion\(\)\?\.animatePin\?\.?\(pin\)/);
  assert.match(contentSource, /function\s+getLucideIconSvg\(name, className = 'fds-icon-inline'\)/);
  assert.match(contentSource, /function\s+setTokenCopyButtonState\(button, state = 'copy'\)/);
  assert.match(contentSource, /function\s+showCopyToast\(message = '토큰이 복사되었습니다\.'\)/);
  assert.match(contentSource, /function\s+positionCopyToastNearInspectorCard\(toast, card = document\.getElementById\('fds-inspector-card'\)\)/);
  assert.match(contentSource, /const bottomTop = cardRect\.bottom \+ gap/);
  assert.match(contentSource, /const topTop = cardRect\.top - gap - toastHeight/);
  assert.match(contentSource, /toast\.dataset\.placement = hasBottomRoom \? 'bottom' : 'top'/);
  assert.match(contentSource, /toast\.style\.left = `\$\{Math\.round\(left\)\}px`/);
  assert.match(contentSource, /toast\.style\.top = `\$\{Math\.round\(top\)\}px`/);
  assert.match(contentSource, /const root = document\.getElementById\('fds-root'\)/);
  assert.match(contentSource, /const card = document\.getElementById\('fds-inspector-card'\)/);
  assert.match(contentSource, /let toast = root\.querySelector\('#fds-copy-toast'\)/);
  assert.match(contentSource, /root\.appendChild\(toast\)/);
  assert.match(contentSource, /positionCopyToastNearInspectorCard\(toast, card\)/);
  assert.match(contentSource, /function\s+scheduleTokenCopyButtonReset\(button\)/);
  assert.match(contentSource, /getLucideIconSvg\(isCopied \? 'check' : 'copy', 'fds-token-copy-icon'\)/);
  assert.match(contentSource, /showCopyToast\('토큰이 복사되었습니다\.'\)/);
  assert.match(contentSource, /setTokenCopyButtonState\(button, 'copied'\)/);
  assert.match(contentSource, /scheduleTokenCopyButtonReset\(button\)/);
  assert.match(contentSource, /getFDSMotion\(\)\?\.animateCopySuccess\?\.?\(button\)/);
});

test('tab clicks keep list content stable while allowing real height changes to animate', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');

  assert.match(contentSource, /const shouldRevealListItems = !\['group-toggle', 'tab'\]\.includes\(summaryMotion\?\.kind\)/);
  assert.match(contentSource, /const didAnimateSummaryRefresh = !customSummaryPanelHeight && Boolean\(getFDSMotion\(\)\?\.animateSummaryRefresh\?\.?\(panel/);
  assert.match(contentSource, /force:\s*false/);
  assert.match(contentSource, /revealListItems:\s*shouldRevealListItems/);
});

test('summary panel height can be resized by dragging the bottom handle', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
  const styleSource = fs.readFileSync(path.join(__dirname, 'overlay.css'), 'utf8');

  assert.match(contentSource, /let panelResizeState = null;/);
  assert.match(contentSource, /let customSummaryPanelHeight = null;/);
  assert.match(contentSource, /function\s+clearCustomSummaryPanelHeight\(panel = getSummaryPanel\(\)\)/);
  assert.match(contentSource, /customSummaryPanelHeight = null;/);
  assert.match(contentSource, /panel\.style\.removeProperty\('--fds-summary-custom-height'\)/);
  assert.match(contentSource, /if \(action\.type === 'activate-filter'\) \{[\s\S]*clearCustomSummaryPanelHeight\(\);[\s\S]*setActiveFilter\(action\.filter\)/);
  assert.match(contentSource, /function\s+beginSummaryPanelResize\(event\)/);
  assert.match(contentSource, /function\s+moveSummaryPanelResize\(event\)/);
  assert.match(contentSource, /function\s+stopSummaryPanelResize\(\)/);
  assert.match(contentSource, /customSummaryPanelHeight = clampSummaryPanelHeight\(panelResizeState\.startHeight \+ deltaY,\s*panelResizeState\.top\)/);
  assert.match(contentSource, /panel\.style\.setProperty\('--fds-summary-custom-height', `\$\{height\}px`\)/);
  assert.match(contentSource, /<div class="fds-panel-resize-handle" role="separator" aria-label="패널 높이 조절"/);
  assert.match(contentSource, /panelResizeHandle\.onpointerdown = beginSummaryPanelResize/);
  assert.match(contentSource, /window\.addEventListener\('pointermove', moveSummaryPanelResize\)/);
  assert.match(contentSource, /window\.addEventListener\('pointerup', stopSummaryPanelResize\)/);
  assert.match(styleSource, /\.fds-panel-resize-handle\s*\{[\s\S]*cursor:\s*ns-resize/);
  assert.match(styleSource, /\.fds-summary-card\.has-custom-height\s+\.fds-summary-section\s*\{[\s\S]*flex:\s*1 1 auto/);
  assert.match(styleSource, /\.fds-summary-card\.has-custom-height\s+\.fds-summary-list\s*\{[\s\S]*max-height:\s*none/);
  assert.match(styleSource, /body\.fds-panel-resizing\s*\{[\s\S]*cursor:\s*ns-resize !important/);
});

test('filter clicks do not immediately refresh over the panel open animation', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');

  assert.doesNotMatch(
    contentSource,
    /openSummaryPanelForActiveFilter\(\);\s*updateSummaryUI\(\);\s*hideTooltip\(\);/
  );
});

test('already-open summary panel uses resize motion instead of replaying panel open', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');

  assert.match(contentSource, /function\s+showSummaryPanel\(\{ anchorFilter = null,\s*animatePosition = true \} = \{\}\)[\s\S]*const wasPanelVisible = isSummaryPanelVisible\(\)/);
  assert.match(contentSource, /if \(!wasPanelVisible\) \{[\s\S]*getFDSMotion\(\)\?\.animatePanelOpen\?\.?\(panel\)/);
  assert.doesNotMatch(contentSource, /updateSummaryUI\(\);\s*getFDSMotion\(\)\?\.animatePanelOpen\?\.?\(panel\);/);
});

test('tab switch motion runs once per summary refresh', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');

  assert.match(contentSource, /const tabSwitchMotionOptions = summaryMotion\?\.details \|\| \{\}/);
  assert.match(contentSource, /getFDSMotion\(\)\?\.animateTabSwitch\?\.?\(panel,\s*tabSwitchMotionOptions\)/);
  assert.doesNotMatch(
    contentSource,
    /getFDSMotion\(\)\?\.animateTabSwitch\?\.?\(panel\);\s*if \(summaryMotion\?\.details\) \{[\s\S]*getFDSMotion\(\)\?\.animateTabSwitch\?\.?\(panel,\s*summaryMotion\.details\)/
  );
});

test('summary list transition ghost stays anchored to the list area', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');

  assert.doesNotMatch(contentSource, /listTransitionGhost\.style\.inset\s*=\s*['"]0['"]/);
  assert.match(
    contentSource,
    /listTransitionGhost\.style\.top\s*=\s*`\$\{Math\.max\(0,\s*nextList\.offsetTop\s*\|\|\s*0\)\}px`/
  );
  assert.match(contentSource, /listTransitionGhost\.style\.height\s*=\s*`\$\{previousListHeight\}px`/);
});

test('summary panel height derives from the rendered list height instead of full scroll height', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
  const summaryPanelSource = fs.readFileSync(path.join(__dirname, 'content-summary-panel.js'), 'utf8');

  assert.doesNotMatch(contentSource, /SUMMARY_LIST_MAX_HEIGHT/);
  assert.match(contentSource, /const previousListRenderedHeight = previousList/);
  assert.match(contentSource, /previousList\.getBoundingClientRect\?\.\(\)\.height/);
  assert.match(contentSource, /previousList\.clientHeight/);
  assert.match(summaryPanelSource, /function measureNaturalSummaryPanelHeight\(panel\)/);
  assert.match(summaryPanelSource, /function measureSummaryPanelTargetHeight\(panel,\s*\{ listHeight = 0 \} = \{\}\)/);
  assert.match(summaryPanelSource, /child\.classList\?\.contains\('fds-summary-list'\)[\s\S]*\? listHeight/);
  assert.match(contentSource, /const directContentPanelHeight = measureSummaryPanelTargetHeight\(panel,\s*\{ listHeight: nextListHeight \}\)/);
  assert.match(contentSource, /const naturalPanelHeight = measureNaturalSummaryPanelHeight\(panel\)/);
  assert.match(contentSource, /const nextPanelHeight = directContentPanelHeight \|\| naturalPanelHeight \|\| listDerivedPanelHeight \|\| previousPanelHeight/);
  assert.ok(
    contentSource.indexOf('const nextPanelHeight = directContentPanelHeight')
      < contentSource.indexOf("listTransitionGhost.classList.add('fds-summary-list-transition-ghost')"),
    'summary target height should be measured before inserting the transition ghost'
  );
  assert.match(contentSource, /const previousListHeight = previousList \? previousListRenderedHeight : 0/);
  assert.match(contentSource, /const nextListHeight = nextList \? nextList\.scrollHeight : 0/);
  assert.doesNotMatch(contentSource, /const previousListHeight = previousList \? Math\.min\(previousList\.scrollHeight, SUMMARY_LIST_MAX_HEIGHT\) : 0/);
});

test('summary list uses natural height and only scrolls when the viewport constrains the panel', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
  const styleSource = fs.readFileSync(path.join(__dirname, 'overlay.css'), 'utf8');
  const motionSource = fs.readFileSync(path.join(__dirname, 'content-motion.js'), 'utf8');

  assert.doesNotMatch(contentSource, /SUMMARY_LIST_SCROLL_ITEM_THRESHOLD/);
  assert.match(contentSource, /<div class="fds-summary-list is-scrollable" role="list" aria-label="위반 목록">/);
  assert.match(styleSource, /\.fds-summary-card\s*\{[\s\S]*max-height:\s*calc\(100vh - var\(--fds-summary-panel-bottom,\s*88px\) - 12px\)/);
  assert.match(styleSource, /\.fds-summary-section\s*\{[\s\S]*flex:\s*1 1 auto/);
  assert.match(styleSource, /\.fds-summary-list\s*\{[\s\S]*max-height:\s*none/);
  assert.match(styleSource, /\.fds-summary-list\s*\{[\s\S]*overflow-y:\s*auto/);
  assert.doesNotMatch(motionSource, /SUMMARY_LIST_MAX_HEIGHT/);
});

test('summary panel reserves toolbar clearance so short collapsed lists are not visually clipped', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
  const styleSource = fs.readFileSync(path.join(__dirname, 'overlay.css'), 'utf8');

  assert.match(styleSource, /\.fds-summary-card\s*\{[\s\S]*padding:\s*16px 12px 12px/);
  assert.match(styleSource, /\.fds-summary-card\s*\{[\s\S]*border-radius:\s*16px/);
  assert.match(styleSource, /\.fds-summary-card\s*\{[\s\S]*min-height:\s*56px/);
  assert.match(contentSource, /const SUMMARY_PANEL_MIN_HEIGHT = 56;/);
  assert.match(contentSource, /Math\.max\(previousPanelHeight,\s*SUMMARY_PANEL_MIN_HEIGHT\)/);
  assert.match(styleSource, /\.fds-panel-head\s*\{[\s\S]*height:\s*auto/);
  assert.match(styleSource, /\.fds-panel-head\s*\{[\s\S]*min-height:\s*28px/);
  assert.match(styleSource, /\.fds-panel-head\s*\{[\s\S]*align-items:\s*center/);
  assert.match(styleSource, /\.fds-panel-title-wrap\s*\{[\s\S]*flex-direction:\s*row/);
  assert.match(styleSource, /\.fds-panel-title-wrap\s*\{[\s\S]*align-items:\s*center/);
  assert.match(styleSource, /\.fds-panel-title\s*\{[\s\S]*line-height:\s*16px/);
  assert.match(styleSource, /\.fds-panel-actions\s*\{[\s\S]*height:\s*22px/);
  assert.match(styleSource, /\.fds-panel-report\s*\{[\s\S]*height:\s*22px/);
  assert.doesNotMatch(styleSource, /\.fds-panel-close\s*\{[\s\S]*transform:\s*translateY\(-2px\)/);
  assert.match(styleSource, /#fds-root \.fds-panel-head \+ \.fds-summary-section\s*\{[\s\S]*margin-top:\s*8px/);
  assert.match(styleSource, /\.fds-summary-section\s*\{[\s\S]*gap:\s*4px/);
  assert.match(styleSource, /\.fds-summary-tabbar\s*\{[\s\S]*height:\s*28px/);
  assert.match(styleSource, /\.fds-summary-tab-indicator\s*\{[\s\S]*height:\s*24px/);
  assert.match(styleSource, /\.fds-summary-tab\s*\{[\s\S]*height:\s*24px/);
  assert.match(styleSource, /\.fds-summary-card-row\s*\{[\s\S]*height:\s*64px/);
  assert.match(styleSource, /\.fds-summary-card-row\s*\{[\s\S]*gap:\s*4px/);
  assert.match(styleSource, /\.fds-stat-box\s*\{[\s\S]*height:\s*64px/);
  assert.match(styleSource, /\.fds-stat-box\s*\{[\s\S]*flex:\s*0 0 calc\(\(100% - 4px\) \/ 2\)/);
  assert.match(styleSource, /\.fds-summary-list\s*\{[\s\S]*gap:\s*2px/);
  assert.match(styleSource, /\.fds-list-group\s*\{[\s\S]*min-height:\s*32px/);
  assert.match(styleSource, /\.fds-list-group-details\s*\{[\s\S]*gap:\s*2px/);
  assert.match(styleSource, /--fds-toolbar-bottom:\s*24px/);
  assert.match(styleSource, /--fds-summary-toolbar-gap:\s*16px/);
  assert.match(styleSource, /--fds-summary-panel-bottom:\s*calc\(/);
  assert.match(styleSource, /#fds-root \.fds-toolbar\s*\{[\s\S]*bottom:\s*var\(--fds-toolbar-bottom,\s*24px\)/);
  assert.match(styleSource, /\.fds-summary-card\s*\{[\s\S]*bottom:\s*var\(--fds-summary-panel-bottom,\s*88px\)/);
  assert.match(styleSource, /\.fds-summary-card\s*\{[\s\S]*max-height:\s*calc\(100vh - var\(--fds-summary-panel-bottom,\s*88px\) - 12px\)/);
  assert.match(styleSource, /\.fds-summary-card\s*\{[\s\S]*overflow-y:\s*hidden/);
  assert.match(styleSource, /\.fds-summary-list\.is-scrollable\s*\{[\s\S]*overflow-y:\s*auto/);
  assert.match(contentSource, /function positionDockedSummaryPanel\(toolbarRect\)[\s\S]*const gap = 16;/);
});

test('summary panel shows a full loading skeleton while scan data is pending', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
  const styleSource = fs.readFileSync(path.join(__dirname, 'overlay.css'), 'utf8');

  assert.match(contentSource, /function\s+renderSummaryLoadingSkeleton\(\{ activeFilter \} = \{\}\)/);
  assert.match(contentSource, /function\s+hasCompletedScanForSummary\(\)/);
  assert.match(contentSource, /const isPendingInitialSummaryScan = Boolean\(activeFilter\) && !hasCompletedScanForSummary\(\);/);
  assert.match(contentSource, /const isSummaryLoading = !scanErrorText && \(isScanning \|\| isPendingInitialSummaryScan\);/);
  assert.match(contentSource, /renderSummaryLoadingSkeleton\(\{ activeFilter \}\)/);
  assert.match(contentSource, /panel\.classList\.toggle\('is-loading', isSummaryLoading\)/);
  assert.match(contentSource, /aria-busy="true"/);
  assert.match(styleSource, /\.fds-summary-card\.is-loading \.fds-summary-section\s*\{[\s\S]*min-height:\s*198px/);
  assert.match(styleSource, /\.fds-summary-tabbar\.is-skeleton\s*\{[\s\S]*grid-template-columns:\s*repeat\(3,\s*1fr\)/);
  assert.match(styleSource, /\.fds-stat-box\.is-skeleton\s*\{[\s\S]*pointer-events:\s*none/);
  assert.match(styleSource, /\.fds-summary-list\.is-skeleton\s*\{[\s\S]*min-height:\s*104px/);
  assert.match(styleSource, /@keyframes fds-summary-skeleton/);
});

test('summary panel uses a readable blurred surface over page content', () => {
  const styleSource = fs.readFileSync(path.join(__dirname, 'overlay.css'), 'utf8');

  assert.match(styleSource, /--fds-summary-panel-surface-opacity:\s*0\.94/);
  assert.match(styleSource, /--fds-summary-panel-bg:\s*rgba\(0,\s*0,\s*0,\s*var\(--fds-summary-panel-surface-opacity,\s*0\.94\)\)/);
  assert.match(styleSource, /--fds-summary-panel-backdrop-blur:\s*16px/);
  assert.match(styleSource, /--fds-summary-panel-backdrop-brightness:\s*0\.76/);
  assert.match(styleSource, /\.fds-summary-card\s*\{[\s\S]*background:\s*transparent/);
  assert.match(styleSource, /\.fds-summary-card\s*\{[\s\S]*box-shadow:\s*0 12px 28px rgba\(0,\s*0,\s*0,\s*0\.18\)/);
  assert.match(styleSource, /\.fds-summary-card::before\s*\{[\s\S]*background-color:\s*var\(--fds-summary-panel-bg,\s*rgba\(0,\s*0,\s*0,\s*0\.94\)\)/);
  assert.match(styleSource, /\.fds-summary-card::before\s*\{[\s\S]*-webkit-backdrop-filter:[\s\S]*blur\(var\(--fds-summary-panel-backdrop-blur,\s*16px\)\)[\s\S]*brightness\(var\(--fds-summary-panel-backdrop-brightness,\s*0\.76\)\)[\s\S]*saturate\(1\.05\)/);
  assert.match(styleSource, /\.fds-summary-card::before\s*\{[\s\S]*backdrop-filter:[\s\S]*blur\(var\(--fds-summary-panel-backdrop-blur,\s*16px\)\)[\s\S]*brightness\(var\(--fds-summary-panel-backdrop-brightness,\s*0\.76\)\)[\s\S]*saturate\(1\.05\)/);
  assert.match(styleSource, /\.fds-summary-card > \*\s*\{[\s\S]*z-index:\s*1/);
  assert.match(styleSource, /\.fds-stat-box\.success\s*\{[\s\S]*background:\s*rgba\(26,\s*49,\s*40,\s*0\.42\)/);
  assert.match(styleSource, /\.fds-stat-box\.danger\.is-active\s*\{[\s\S]*background:\s*rgba\(68,\s*35,\s*28,\s*0\.48\)/);
});

test('toolbar menu clicks preserve a user-moved summary panel position', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
  const summaryPanelSource = fs.readFileSync(path.join(__dirname, 'content-summary-panel.js'), 'utf8');

  assert.match(contentSource, /let customSummaryPanelPosition = null;/);
  assert.match(contentSource, /function\s+saveCustomSummaryPanelPosition\(\)[\s\S]*customSummaryPanelPosition = \{/);
  assert.match(contentSource, /function\s+applyCustomSummaryPanelPosition\(\)[\s\S]*applyCustomSummaryPanelPositionStyle\(\{/);
  assert.match(summaryPanelSource, /function\s+applyCustomSummaryPanelPosition\(\{[\s\S]*panel\.style\.left = `\$\{position\.left\}px`/);
  assert.match(contentSource, /function\s+restoreExpandedToolbarAndPanelPosition\(\{[\s\S]*preserveSummaryPanelPosition = false,[\s\S]*resetSummaryPanelPosition = true,[\s\S]*\} = \{\}\)/);
  assert.match(contentSource, /if \(preserveSummaryPanelPosition && applyCustomSummaryPanelPosition\(\)\) return;/);
  assert.match(contentSource, /if \(!resetSummaryPanelPosition\) return;/);
  assert.match(contentSource, /preserveSummaryPanelPosition: Boolean\(customSummaryPanelPosition\) && !anchorFilter/);
  assert.match(contentSource, /resetSummaryPanelPosition: !anchorFilter/);
  assert.match(contentSource, /const didMovePanel = Boolean\(panelDragState\?\.hasMoved\)/);
  assert.match(contentSource, /if \(didMovePanel\) \{[\s\S]*saveCustomSummaryPanelPosition\(\)/);
});

test('toolbar menu clicks align the summary panel to the clicked filter button', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
  const motionSource = fs.readFileSync(path.join(__dirname, 'content-motion.js'), 'utf8');

  assert.match(contentSource, /function\s+getSummaryPanelPositionForToolbarButton\(anchorElement\)/);
  assert.match(contentSource, /function\s+getToolbarFilterButton\(filter = activeFilter\)/);
  assert.match(contentSource, /const buttonId = BUTTON_META\?\.\[normalizedFilter\]\?\.id/);
  assert.match(contentSource, /buttonRect\.left \+ \(buttonRect\.width \/ 2\) - \(panelRect\.width \/ 2\)/);
  assert.match(contentSource, /window\.innerHeight - buttonRect\.top \+ gap/);
  assert.match(contentSource, /return \{ left: Math\.round\(left\), bottom: Math\.round\(bottom\) \}/);
  assert.match(contentSource, /function\s+positionSummaryPanelForToolbarButton\(anchorElement,\s*\{ animate = true \} = \{\}\)/);
  assert.match(contentSource, /panel\.style\.top = 'auto'/);
  assert.match(contentSource, /panel\.style\.bottom = `\$\{nextPosition\.bottom\}px`/);
  assert.match(contentSource, /panel\.style\.setProperty\('--fds-summary-panel-bottom', `\$\{nextPosition\.bottom\}px`\)/);
  assert.match(contentSource, /getFDSMotion\(\)\?\.animateSummaryPanelMove\?\.?\(panel,\s*\{ fromRect,\s*toRect \}\)/);
  assert.match(contentSource, /function\s+showSummaryPanel\(\{ anchorFilter = null,\s*animatePosition = true \} = \{\}\)/);
  assert.match(contentSource, /const anchorElement = getToolbarFilterButton\(anchorFilter \|\| activeFilter\)/);
  assert.match(contentSource, /positionSummaryPanelForToolbarButton\(anchorElement,\s*\{ animate: animatePosition && wasPanelVisible \}\)/);
  assert.match(contentSource, /function\s+openSummaryPanelForActiveFilter\(\{ forceExpanded = true,\s*anchorFilter = activeFilter \} = \{\}\)/);
  assert.match(contentSource, /openSummaryPanelForActiveFilter\(\{ anchorFilter: action\.filter \}\)/);
  assert.match(motionSource, /function\s+animateSummaryPanelMove\(panel,\s*\{/);
  assert.match(motionSource, /recordMotion\('summary-panel-move'\)/);
});

test('summary refresh releases fixed panel height after animation completes', () => {
  const motionSource = fs.readFileSync(path.join(__dirname, 'content-motion.js'), 'utf8');

  assert.match(motionSource, /panel\.classList\?\.add\?\.\('is-resizing'\)/);
  assert.match(motionSource, /timeline\.add\(\(\) => \{[\s\S]*panel\.classList\?\.remove\?\.\('is-resizing'\)[\s\S]*panel\.style\.height = ''/);
  assert.match(motionSource, /onComplete:\s*\(\) => \{[\s\S]*panel\.classList\?\.remove\?\.\('is-resizing'\)[\s\S]*panel\.style\.height = ''/);
  assert.doesNotMatch(motionSource, /panel\.style\.height = `\$\{resolvedToPanelHeight\}px`/);
});

test('inspector card gives users enough time to move from target to copy action', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
  const styleSource = fs.readFileSync(path.join(__dirname, 'overlay.css'), 'utf8');

  assert.match(contentSource, /const INSPECTOR_CARD_HIDE_DELAY_MS = 700;/);
  assert.match(contentSource, /card\.onpointerenter = clearInspectorCardHideTimer/);
  assert.match(contentSource, /document\.addEventListener\('mouseout'[\s\S]*scheduleTransientInspectorPreviewClear\(\)/);
  assert.match(styleSource, /\.fds-card\s*\{[\s\S]*pointer-events:\s*auto/);
});

test('inspector hover card uses the violation type as its title', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
  const styleSource = fs.readFileSync(path.join(__dirname, 'overlay.css'), 'utf8');

  assert.match(contentSource, /function\s+getInspectorCardTitle\(issueEntries = \[\]\)/);
  assert.match(contentSource, /return `\$\{parsedIssue\.chip \|\| '속성'\} 위반`/);
  assert.match(contentSource, /return `\$\{categoryLabel\} 위반 \$\{issueEntries\.length\}건`/);
  assert.match(contentSource, /const displayEntries = getUniqueInspectorIssueEntries\(issueEntries\)/);
  assert.match(contentSource, /const cardTitle = getInspectorCardTitle\(displayEntries\)/);
  assert.match(contentSource, /<div class="fds-card-title" title="\$\{escapeHtml\(cardTitle\)\}">\$\{escapeHtml\(cardTitle\)\}<\/div>/);
  assert.doesNotMatch(contentSource, /<div class="fds-card-title">INSPECTOR<\/div>/);
  assert.doesNotMatch(contentSource, /fds-card-tone/);
  assert.doesNotMatch(contentSource, /위험 감지/);
  assert.doesNotMatch(contentSource, /경고 감지/);
  assert.doesNotMatch(contentSource, /const targetLabel = getViolationPinLabel\(\{ element: target \}\)/);
  assert.doesNotMatch(contentSource, /<div class="fds-card-subtitle">\$\{target\.tagName\.toLowerCase\(\)\}<\/div>/);
  assert.match(styleSource, /\.fds-card\s*\{[\s\S]*background:\s*#0F131A/);
  assert.doesNotMatch(styleSource, /\.fds-card\s*\{[^}]*background:\s*rgba\(15,\s*19,\s*26,\s*0\.\d+\)/);
  assert.match(styleSource, /\.fds-card\s*\{[\s\S]*border:\s*none/);
  assert.match(styleSource, /\.fds-card\s*\{[\s\S]*padding:\s*12px/);
  assert.match(styleSource, /\.fds-card\s*\{[\s\S]*display:\s*flex/);
  assert.match(styleSource, /\.fds-card\s*\{[\s\S]*flex-direction:\s*column/);
  assert.match(styleSource, /\.fds-card\s*\{[\s\S]*gap:\s*8px/);
  assert.match(styleSource, /\.fds-card-head\s*\{[\s\S]*margin-bottom:\s*0/);
  assert.match(styleSource, /\.fds-card-body\s*\{[\s\S]*gap:\s*6px/);
  assert.match(styleSource, /\.fds-issue-item\s*\{[\s\S]*background:\s*transparent/);
  assert.match(styleSource, /\.fds-issue-item\s*\{[\s\S]*border:\s*none/);
  assert.match(styleSource, /\.fds-issue-replacement\s*\{[\s\S]*border-top:\s*none/);
  assert.doesNotMatch(styleSource, /\.fds-card\.(danger|success|warning)\s+\.fds-issue-item\s*\{[^}]*background:/);
  assert.doesNotMatch(styleSource, /\.fds-card\.(danger|success|warning)\s+\.fds-issue-item\s*\{[^}]*border-color:/);
  assert.doesNotMatch(styleSource, /\.fds-card-tone/);
  assert.match(styleSource, /\.fds-card-title\s*\{[\s\S]*text-overflow:\s*ellipsis/);
});

test('inspector hover card deduplicates repeated issue messages across elements', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');

  assert.match(contentSource, /function\s+getInspectorIssueDisplayKey\(entry\)/);
  assert.match(contentSource, /entry\?\.message \|\| ''/);
  assert.match(contentSource, /function\s+getUniqueInspectorIssueEntries\(issueEntries = \[\]\)/);
  assert.match(contentSource, /if \(!entriesByDisplayKey\.has\(displayKey\)\) \{/);
  assert.match(contentSource, /const previewEntries = displayEntries\.slice\(0, 4\)/);
  assert.match(contentSource, /displayEntries\.length > 4 \? `<div class="fds-card-more">외 \$\{displayEntries\.length - 4\}건<\/div>` : ''/);
});

test('inspector hover card separates issue value from repeated violation type copy', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
  const styleSource = fs.readFileSync(path.join(__dirname, 'overlay.css'), 'utf8');

  assert.match(contentSource, /function\s+getInspectorIssueDisplay\(entry\)/);
  assert.match(contentSource, /description:\s*'투명도가 포함된 미등록 컬러'/);
  assert.match(contentSource, /tip:\s*'반투명 컬러 토큰 등록을 검토하세요\.'/);
  assert.match(contentSource, /return \{ value,\s*description:\s*'미등록 컬러가 사용되었습니다\.' \}/);
  assert.match(contentSource, /return \{ value,\s*description:\s*'원시값 컬러가 사용되었습니다\.' \}/);
  assert.match(contentSource, /<strong class="fds-issue-value">\$\{escapeHtml\(issueDisplay\.value\)\}<\/strong>/);
  assert.match(contentSource, /<span class="fds-issue-description">\$\{escapeHtml\(issueDisplay\.description\)\}<\/span>/);
  assert.match(contentSource, /<span class="fds-issue-tip"><svg class="fds-issue-tip-icon" data-lucide="info"[\s\S]*<span>\$\{escapeHtml\(issueDisplay\.tip\)\}<\/span><\/span>/);
  assert.match(contentSource, /function\s+getKnownColorForToken\(token\)/);
  assert.match(contentSource, /function\s+renderSuggestedTokenRows\(tokens = \[\],\s*\{ showColorChips = false \} = \{\}\)/);
  assert.match(contentSource, /<span class="fds-issue-replacement-label">FDS 추천 토큰<\/span>/);
  assert.match(contentSource, /class="fds-token-color-chip"[\s\S]*role="img"[\s\S]*--fds-token-chip-color:\s*\$\{escapeHtml\(color\)\}[\s\S]*title="\$\{escapeHtml\(`\$\{token\}: \$\{color\}`\)\}"/);
  assert.match(contentSource, /renderSuggestedTokenRows\(suggestedTokens,\s*\{ showColorChips:\s*entry\?\.category === 'color' \}\)/);
  assert.match(contentSource, /tokens\.map\(\(token\) => \{[\s\S]*<div class="fds-token-row">[\s\S]*data-copy-token="\$\{escapeHtml\(token\)\}"/);
  assert.match(contentSource, /<button class="fds-token-copy"[\s\S]*data-lucide="\$\{escapeHtml\(name\)\}"/);
  assert.doesNotMatch(contentSource, />토큰명 복사<\/button>/);
  assert.doesNotMatch(contentSource, /<span>대체 토큰<\/span>/);
  assert.doesNotMatch(contentSource, /<div class="fds-issue-message">\$\{escapeHtml\(entry\.message\)\}<\/div>/);
  assert.match(styleSource, /\.fds-issue-message\s*\{[\s\S]*flex-direction:\s*column/);
  assert.match(styleSource, /\.fds-issue-value\s*\{[\s\S]*font-weight:\s*800/);
  assert.match(styleSource, /\.fds-issue-description\s*\{[\s\S]*font-size:\s*10px/);
  assert.doesNotMatch(styleSource, /\*border-top/);
  assert.doesNotMatch(styleSource, /\.fds-issue-tip\s*\{[^}]*border-top:/);
  assert.match(styleSource, /\.fds-issue-tip\s*\{[\s\S]*align-items:\s*center/);
  assert.match(styleSource, /\.fds-issue-tip\s*\{[\s\S]*color:\s*#75bef8/);
  assert.match(styleSource, /\.fds-issue-tip-icon\s*\{[\s\S]*width:\s*12px/);
  assert.doesNotMatch(styleSource, /\.fds-issue-tip-icon\s*\{[^}]*margin-top/);
  assert.match(styleSource, /\.fds-issue-replacement\s*\{[\s\S]*flex-direction:\s*column/);
  assert.match(styleSource, /\.fds-issue-replacement-label\s*\{[\s\S]*font-size:\s*9px/);
  assert.match(styleSource, /\.fds-token-row\s*\{[\s\S]*align-items:\s*center/);
  assert.match(styleSource, /\.fds-token-color-chip\s*\{[\s\S]*background-color:\s*var\(--fds-token-chip-color\)/);
  assert.match(styleSource, /\.fds-token-color-chip\s*\{[\s\S]*border:\s*1px solid/);
  assert.doesNotMatch(styleSource, /\.fds-issue-replacement span\s*\{/);
  assert.match(styleSource, /\.fds-token-row strong\s*\{[\s\S]*flex:\s*1 1 auto/);
  assert.match(styleSource, /\.fds-token-copy\s*\{[\s\S]*width:\s*22px/);
  assert.match(styleSource, /\.fds-token-copy\s*\{[\s\S]*border:\s*none/);
  assert.match(styleSource, /\.fds-token-copy\s*\{[\s\S]*background:\s*transparent/);
  assert.match(styleSource, /\.fds-token-copy:hover,[\s\S]*?\.fds-token-copy:focus-visible\s*\{[\s\S]*background:\s*transparent/);
  assert.doesNotMatch(styleSource, /\.fds-token-copy(?:\[data-state="copied"\]|:hover|:focus-visible)?\s*\{[^}]*border-color:/);
  assert.match(styleSource, /\.fds-token-copy-icon\s*\{[\s\S]*width:\s*14px/);
  assert.match(styleSource, /\.fds-token-copy\[data-state="copied"\]\s*\{[\s\S]*color:\s*#43C971/);
  assert.match(styleSource, /\.fds-copy-toast\s*\{[\s\S]*position:\s*fixed/);
  assert.match(styleSource, /\.fds-copy-toast\s*\{[\s\S]*top:\s*12px/);
  assert.match(styleSource, /\.fds-copy-toast\s*\{[\s\S]*z-index:\s*2147483647/);
  assert.match(styleSource, /\.fds-copy-toast\[data-visible="true"\]\s*\{[\s\S]*opacity:\s*1/);
});

test('inspector hover card anchors to violation elements instead of summary list rows', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');

  assert.match(contentSource, /function\s+showInspectorCardForEntries\(target,\s*issueEntries,\s*anchorElement\s*=\s*target,\s*\{\s*ignoreCustomPosition\s*=\s*false\s*\}\s*=\s*\{\}\)/);
  assert.match(contentSource, /const\s+anchorRect\s*=\s*\(anchorElement\s*\|\|\s*target\)\.getBoundingClientRect\(\)/);
  assert.match(contentSource, /const cardHead = card\.querySelector\('\.fds-card-head'\)/);
  assert.match(contentSource, /cardHead\.onpointerdown = beginInspectorCardDrag/);
  assert.match(contentSource, /if \(!ignoreCustomPosition && applyCustomInspectorCardPosition\(card\)\) \{/);
  assert.match(contentSource, /if \(ignoreCustomPosition\) \{[\s\S]*customInspectorCardPosition = null;[\s\S]*\}/);
  assert.match(contentSource, /placeFloatingElement\(card,\s*window\.scrollX \+ cardPosition\.left,\s*window\.scrollY \+ cardPosition\.top\)/);
  assert.match(contentSource, /const shouldAnimateCard = card\.style\.display !== 'block' \|\| card\.dataset\.issueKeys !== nextIssueKeys/);
  assert.match(contentSource, /if \(shouldAnimateCard\) \{[\s\S]*getFDSMotion\(\)\?\.animateInspectorCard\?\.?\(card\)/);
  assert.doesNotMatch(contentSource, /showInspectorCardForEntries\(entry\.element,\s*\[entry\],\s*item\)/);
  assert.match(contentSource, /showInspectorCardForEntries\(entry\.element,\s*entriesForPreview,\s*entry\.element,\s*\{\s*ignoreCustomPosition\s*\}\)/);
});

test('inspector card renders personal note controls for selected violations', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');

  assert.match(contentSource, /function\s+renderViolationNoteControls\(entries\)/);
  assert.match(contentSource, /class="fds-card-note"/);
  assert.match(contentSource, /data-note-action="edit"/);
  assert.match(contentSource, /data-note-action="save"/);
  assert.match(contentSource, /data-note-action="delete"/);
  assert.match(contentSource, /const noteEntries = getInspectorNoteEntries\(issueEntries,\s*displayEntries\[0\]\)/);
  assert.match(contentSource, /bindViolationNoteControls\(card,\s*noteEntries\)/);
});

test('inspector card binds personal note edit save and delete actions', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
  const styleSource = fs.readFileSync(path.join(__dirname, 'overlay.css'), 'utf8');

  assert.match(contentSource, /function\s+normalizeViolationNoteEntries\(entries\)/);
  assert.match(contentSource, /function\s+bindViolationNoteControls\(card,\s*entries\)/);
  assert.match(contentSource, /card\.querySelector\('\[data-note-action="edit"\]'\)/);
  assert.match(contentSource, /saveViolationNotes\(entries,\s*textarea\.value\)/);
  assert.match(contentSource, /deleteViolationNotes\(entries\)/);
  assert.match(contentSource, /showInspectorCardForEntries\(refreshEntry\.element,\s*getVisibleIssueEntriesForElement\(refreshEntry\.element\)/);
  assert.match(styleSource, /\.fds-card-note\s*\{/);
  assert.match(styleSource, /\.fds-card-note-text\s*\{/);
  assert.match(styleSource, /\.fds-card-note-action\s*\{/);
});

test('inspector notes apply to every matching entry represented by the card', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');

  assert.match(contentSource, /function\s+getInspectorNoteEntries\(issueEntries,\s*representativeEntry\)/);
  assert.match(contentSource, /getInspectorIssueDisplayKey\(entry\) === representativeDisplayKey/);
  assert.match(contentSource, /const noteEntries = normalizeViolationNoteEntries\(entries\)/);
  assert.match(contentSource, /noteEntries\.forEach\(\(entry\) => \{/);
  assert.match(contentSource, /violationNotesByKey\.set\(noteKey,/);
  assert.match(contentSource, /noteEntries\.forEach\(\(entry\) => \{[\s\S]*violationNotesByKey\.delete\(noteKey\)/);
});

test('summary rows and violation pins expose note state', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
  const styleSource = fs.readFileSync(path.join(__dirname, 'overlay.css'), 'utf8');

  assert.match(contentSource, /function\s+withViolationNoteState\(entry\)/);
  assert.match(contentSource, /renderSummaryListItem\(withViolationNoteState\(item\)\)/);
  assert.match(contentSource, /pin\.classList\.toggle\('has-note'/);
  assert.match(styleSource, /\.fds-list-item\.has-note/);
  assert.match(styleSource, /\.fds-issue-pin\.has-note/);
});

test('content loads violation notes before refreshing visible scan results', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');

  assert.match(contentSource, /await loadViolationNotesForPage\(\)/);
  assert.match(contentSource, /loadViolationNotesForPage\(\)\.then\(\(\) => updateSummaryUI\(\)\)/);
});

test('summary detail clicks keep aggregated issue entries for locked inspector previews', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');

  assert.match(contentSource, /function\s+scheduleIssuePreviewAfterScroll\(entry,\s*\{\s*ignoreCustomPosition\s*=\s*false,\s*issueEntries\s*=\s*null\s*\}\s*=\s*\{\}\)/);
  assert.match(contentSource, /const previewEntries = Array\.isArray\(issueEntries\) && issueEntries\.length \? issueEntries : \[entry\]/);
  assert.match(contentSource, /const entriesForPreview = connectedPreviewEntries\.length \? connectedPreviewEntries : \[entry\]/);
  assert.match(contentSource, /positionViolationPin\(entriesForPreview\)/);
  assert.match(contentSource, /const isTargetReady = rect && isViolationPinTargetVisible\(rect\)/);
  assert.match(contentSource, /if \(!isTargetReady && getElapsedMs\(\) < maxWaitMs\) \{[\s\S]*window\.setTimeout\?\.?\(updateIssuePreview,\s*80\)/);
  assert.match(contentSource, /showInspectorCardForEntries\(entry\.element,\s*entriesForPreview,\s*entry\.element,\s*\{\s*ignoreCustomPosition\s*\}\)/);
  assert.match(contentSource, /showInspectorCardForEntries\(lockedEntries\[0\]\.element,\s*lockedEntries\)/);
  assert.match(contentSource, /scrollToIssueElement\(entry,\s*\{\s*[\s\S]*issueEntries:\s*isolatedEntries\.length \? isolatedEntries : entry \? \[entry\] : \[\],[\s\S]*\}\)/);
});

test('inspector card can be moved by dragging its header', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
  const styleSource = fs.readFileSync(path.join(__dirname, 'overlay.css'), 'utf8');

  assert.match(contentSource, /let\s+inspectorCardDragState\s*=\s*null/);
  assert.match(contentSource, /let\s+customInspectorCardPosition\s*=\s*null/);
  assert.match(contentSource, /function\s+beginInspectorCardDrag\(event\)/);
  assert.match(contentSource, /event\.target\?\.closest\?\.\('#fds-inspector-card \.fds-card-head'\)/);
  assert.match(contentSource, /card\.setPointerCapture\?\.\(event\.pointerId\)/);
  assert.match(contentSource, /function\s+moveInspectorCardDrag\(event\)/);
  assert.match(contentSource, /customInspectorCardPosition = nextPosition/);
  assert.match(contentSource, /function\s+stopInspectorCardDrag\(\)/);
  assert.match(contentSource, /customInspectorCardPosition = \{ left: Math\.round\(rect\.left\), top: Math\.round\(rect\.top\) \}/);
  assert.match(contentSource, /window\.addEventListener\('pointermove', moveInspectorCardDrag\)/);
  assert.match(contentSource, /window\.addEventListener\('pointerup', stopInspectorCardDrag\)/);
  assert.match(contentSource, /window\.addEventListener\('resize'[\s\S]*applyCustomInspectorCardPosition\(\)/);
  assert.match(styleSource, /body\.fds-inspector-card-dragging\s*\{[\s\S]*cursor:\s*grabbing/);
  assert.match(styleSource, /\.fds-card-head\s*\{[\s\S]*cursor:\s*grab/);
  assert.match(styleSource, /\.fds-card\.is-dragging \.fds-card-head\s*\{[\s\S]*cursor:\s*grabbing/);
});

test('inspector card moves the summary panel away when they overlap', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');

  assert.match(contentSource, /function\s+avoidSummaryPanelOverlapWithInspectorCard\(card\)/);
  assert.match(contentSource, /getRectOverlapArea\(cardRect,\s*panelRect\) <= 0/);
  assert.match(contentSource, /customSummaryPanelPosition = \{[\s\S]*left:\s*Math\.round\(nextPosition\.left\),[\s\S]*top:\s*Math\.round\(nextPosition\.top\)/);
  assert.match(contentSource, /applyCustomSummaryPanelPosition\(\);/);
  assert.match(contentSource, /placeFloatingElement\(card,[\s\S]*\);[\s\S]*avoidSummaryPanelOverlapWithInspectorCard\(card\);[\s\S]*positionViolationPin/);
});

test('inspected element mouseout gives users time to move into the inspector card', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');

  assert.match(contentSource, /document\.addEventListener\('mouseout'[\s\S]*event\.target\?\.closest\?\.\('\.fds-inspected'\)[\s\S]*scheduleTransientInspectorPreviewClear\(\)/);
});

test('page mouseover gaps do not immediately close a visible inspector card', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');

  assert.match(contentSource, /function\s+deferInspectorCardClear\(\)/);
  assert.match(contentSource, /document\.addEventListener\('mouseover'[\s\S]*deferInspectorCardClear\(\)/);
});

test('violation pin placement avoids overlapping the inspector card', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
  const floatingInspectorSource = fs.readFileSync(path.join(__dirname, 'content-floating-inspector.js'), 'utf8');

  assert.match(floatingInspectorSource, /function\s+getBestPinPosition\(rect,\s*pinWidth,\s*pinHeight,\s*avoidRect\s*=\s*null\)/);
  assert.match(floatingInspectorSource, /getRectOverlapArea\(candidate\.rect,\s*avoidRect\)/);
  assert.match(contentSource, /const pinnedEntries = getPinnedIssueEntries\(\)/);
  assert.match(contentSource, /positionViolationPin\(pinnedEntries\.length \? pinnedEntries : issueEntries,\s*\{\s*avoidElement:\s*card\s*\}\)/);
});

test('active violation pin follows nested app scroll and clears stale targets', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');

  assert.match(contentSource, /createVisualUpdateScheduler/);
  assert.match(contentSource, /const\s+violationPinPositionScheduler\s*=\s*createVisualUpdateScheduler/);
  assert.match(contentSource, /const\s+inspectorPreviewPositionScheduler\s*=\s*createVisualUpdateScheduler/);
  assert.match(contentSource, /function\s+scheduleViolationPinPositionUpdate\(\)\s*\{\s*violationPinPositionScheduler\.schedule\(\)/);
  assert.match(contentSource, /function\s+scheduleInspectorPreviewPositionUpdate\(\)\s*\{\s*inspectorPreviewPositionScheduler\.schedule\(\)/);
  assert.match(contentSource, /const\s+scheduledVisualUpdates\s*=\s*\[\]/);
  assert.match(contentSource, /scheduledVisualUpdates\.push\([\s\S]*violationPinPositionScheduler[\s\S]*inspectorPreviewPositionScheduler[\s\S]*\)/);
  assert.match(contentSource, /function\s+cancelScheduledVisualUpdates\(\)\s*\{\s*scheduledVisualUpdates\.forEach\(\(scheduler\)\s*=>\s*scheduler\.cancel\(\)\)/);
  assert.match(contentSource, /function\s+clearInspectionMarks\(\)\s*\{\s*cancelScheduledVisualUpdates\(\)/);
  assert.match(contentSource, /function\s+handleExtensionContextInvalid\(error\)[\s\S]*cancelScheduledVisualUpdates\(\)/);
  assert.match(contentSource, /document\.addEventListener\('scroll'[\s\S]*scheduleInspectorPreviewPositionUpdate\(\)[\s\S]*\{\s*passive:\s*true,\s*capture:\s*true\s*\}/);
  assert.match(contentSource, /window\.addEventListener\('resize'[\s\S]*scheduleInspectorPreviewPositionUpdate\(\)/);
  assert.doesNotMatch(contentSource, /window\.addEventListener\('resize'[\s\S]*hideInspectorCard\(\)[\s\S]*scheduleInspectorPreviewPositionUpdate\(\)/);
  assert.doesNotMatch(contentSource, /document\.addEventListener\('scroll'[\s\S]*hideInspectorCard\(\)[\s\S]*scheduleInspectorPreviewPositionUpdate\(\)/);
  assert.match(contentSource, /function\s+getPinnedIssueEntries\(\)/);
  assert.match(contentSource, /function\s+getInspectorCardIssueEntries\(\)/);
  assert.match(contentSource, /const issueKeys = String\(card\?\.dataset\?\.issueKeys \|\| ''\)\.split\('\\n'\)\.filter\(Boolean\)/);
  assert.match(contentSource, /function\s+refreshActiveInspectorPreviewPosition\(\)[\s\S]*clearInspectorCardHideTimer\(\)/);
  assert.match(contentSource, /refreshActiveInspectorPreviewPosition\(\)[\s\S]*restoreLockedViolationPin\(getVisibleIssueEntries\(\)\)/);
  assert.match(contentSource, /refreshActiveInspectorPreviewPosition\(\)[\s\S]*showInspectorCardForEntries\(cardEntries\[0\]\.element,\s*cardEntries\)/);
  assert.match(contentSource, /const targetEntries = Array\.isArray\(entry\)/);
  assert.match(contentSource, /let\s+lockedPinnedIssueKeys\s*=\s*\[\]/);
  assert.match(contentSource, /lockedPinnedIssueKeys\s*=\s*connectedEntries\.map\(\(item\) => item\.key\)/);
  assert.match(contentSource, /function\s+clearHoveredInspectionTarget\(\) \{[\s\S]*document\.querySelectorAll\('\.fds-hover-target'\)/);
  assert.match(contentSource, /function\s+clearActiveViolationPin\(\) \{[\s\S]*document\.querySelectorAll\('\.fds-spacing-focus'\)/);
  assert.match(contentSource, /const lockedKeySet = new Set\(lockedPinnedIssueKeys\.length \? lockedPinnedIssueKeys : \[lockedPinnedIssueKey\]\)/);
  assert.match(contentSource, /setActiveViolationPins\(lockedEntries,\s*\{\s*locked:\s*true\s*\}\)/);
  assert.match(contentSource, /showInspectorCardForEntries\(lockedEntries\[0\]\.element,\s*lockedEntries\)/);
  assert.match(contentSource, /const shouldReplacePins = layer\.dataset\.issueKeys !== nextIssueKeys/);
  assert.match(contentSource, /if \(shouldReplacePins\) \{[\s\S]*layer\.innerHTML = connectedEntries\.map/);
  assert.match(contentSource, /if \(shouldReplacePins\) \{[\s\S]*getFDSMotion\(\)\?\.animatePin\?\.?\(pin\)/);
  assert.match(contentSource, /if \(!targetEntries\.length\) \{[\s\S]*clearActiveViolationPin\(\);[\s\S]*return;[\s\S]*\}/);
  assert.match(contentSource, /if \(!isViolationPinTargetVisible\(rect\)\) \{[\s\S]*pin\.style\.display = 'none';[\s\S]*return;/);
  assert.match(contentSource, /if \(!visiblePinCount && !lockedPinnedIssueKey && lockedPinnedIssueKeys\.length === 0\) \{[\s\S]*clearActiveViolationPin\(\);[\s\S]*\}/);
});

test('viewport width changes refresh settled highlight geometry without rescanning the page', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
  const floatingInspectorSource = fs.readFileSync(path.join(__dirname, 'content-floating-inspector.js'), 'utf8');

  assert.match(floatingInspectorSource, /function\s+createDebouncedUpdateScheduler\(/);
  assert.match(contentSource, /let\s+lastViewportWidth\s*=\s*window\.innerWidth/);
  assert.match(contentSource, /function\s+refreshResponsiveIssueGeometry\(\)[\s\S]*rebindUnrenderedIssueEntries\([\s\S]*applyVisibleIssueHighlights\(\)[\s\S]*refreshActiveInspectorPreviewPosition\(\)/);
  assert.match(contentSource, /pendingResponsiveLockedIssueKeys\s*=\s*\[\.\.\.lockedPinnedIssueKeys\]/);
  assert.match(contentSource, /const\s+responsiveViewportGeometryScheduler\s*=\s*createDebouncedUpdateScheduler\(\{[\s\S]*delayMs:\s*300,[\s\S]*onUpdate:\s*refreshResponsiveIssueGeometry/);
  assert.match(contentSource, /window\.addEventListener\('resize'[\s\S]*const\s+viewportWidthChanged\s*=\s*window\.innerWidth\s*!==\s*lastViewportWidth/);
  assert.match(contentSource, /window\.addEventListener\('resize'[\s\S]*if\s*\(viewportWidthChanged\)\s*\{[\s\S]*responsiveViewportGeometryScheduler\.schedule\(\)/);
  assert.match(contentSource, /scheduledVisualUpdates\.push\([\s\S]*responsiveViewportGeometryScheduler[\s\S]*\)/);
  assert.doesNotMatch(contentSource, /responsiveViewport\w*Scheduler[\s\S]{0,300}void\s+scan\(/);
});

test('inspector card hover area is protected from document-level mouse clearing', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');

  assert.match(contentSource, /document\.addEventListener\('mouseover'[\s\S]*event\.target\?\.closest\?\.\('#fds-inspector-card'\)[\s\S]*clearInspectorCardHideTimer\(\)[\s\S]*return/);
  assert.match(contentSource, /document\.addEventListener\('mouseout'[\s\S]*relatedTarget\?\.closest\?\.\('#fds-inspector-card'\)[\s\S]*return/);
  assert.match(contentSource, /document\.addEventListener\('mouseout'[\s\S]*event\.target\?\.closest\?\.\('#fds-inspector-card'\)[\s\S]*scheduleTransientInspectorPreviewClear\(\)[\s\S]*return/);
  assert.match(contentSource, /document\.addEventListener\('mouseout'[\s\S]*if \(isInspectorCardVisible\(\)\) \{[\s\S]*scheduleTransientInspectorPreviewClear\(\);[\s\S]*return;/);
});

test('inspector token text can wrap instead of hiding long token candidates', () => {
  const styleSource = fs.readFileSync(path.join(__dirname, 'overlay.css'), 'utf8');

  assert.match(styleSource, /\.fds-token-row strong\s*\{[\s\S]*overflow-wrap:\s*anywhere/);
  assert.match(styleSource, /\.fds-token-row strong\s*\{[\s\S]*white-space:\s*normal/);
});

test('fixture QA injects the bundled GSAP motion layer before the content script', () => {
  const qaSource = fs.readFileSync(path.join(__dirname, 'scripts/run-uiux-fixture-qa.mjs'), 'utf8');

  assert.match(qaSource, /'vendor\/gsap\.min\.js'[\s\S]*'content-motion\.js'[\s\S]*'content\.js'/);
});

test('overlay respects reduced motion preferences for CSS transitions and animations', () => {
  const styleSource = fs.readFileSync(path.join(__dirname, 'overlay.css'), 'utf8');

  assert.match(styleSource, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(styleSource, /#fds-root \*[\s\S]*animation-duration:\s*0\.01ms !important/);
  assert.match(styleSource, /#fds-root \*[\s\S]*transition-duration:\s*0\.01ms !important/);
});

test('scan runner processes elements in batches and yields between batches', async () => {
  const yielded = [];
  const elements = Array.from({ length: 5 }, (_, index) => ({ index, visible: true }));
  const runner = createContentScanRunner({
    batchSize: 2,
    getElements: () => elements,
    isElementVisible: (element) => element.visible,
    getStyles: (element) => ({ index: element.index }),
    inspectElement: ({ filterKey, element }) => ({
      issues: filterKey === 'color' && element.index % 2 === 0 ? [`color-${element.index}`] : [],
      suggestions: [],
    }),
    addIssueEntry: ({ category, message, element }) => ({
      key: `${category}-${element.index}`,
      category,
      message,
      element,
    }),
    markElement: () => {},
    yieldToBrowser: async () => {
      yielded.push('yield');
    },
  });

  const result = await runner.run({ filters: ['color', 'font'], activeFilter: 'color' });

  assert.deepEqual(result.counts, { color: 3, font: 0 });
  assert.deepEqual(result.violations, ['color-0', 'color-2', 'color-4']);
  assert.equal(yielded.length, 2);
});

test('scan runner does not add visible entries for inactive filters', async () => {
  const runner = createContentScanRunner({
    batchSize: 10,
    getElements: () => [{ visible: true }],
    isElementVisible: () => true,
    getStyles: () => ({}),
    inspectElement: ({ filterKey }) => ({
      issues: [`${filterKey}-issue`],
      suggestions: [],
    }),
    addIssueEntry: ({ category, message }) => ({ key: `${category}-${message}`, category, message }),
    markElement: () => {},
    yieldToBrowser: async () => {},
  });

  const result = await runner.run({ filters: ['color', 'font'], activeFilter: 'font' });

  assert.deepEqual(result.counts, { color: 1, font: 1 });
  assert.deepEqual(result.violations, ['font-issue']);
  assert.equal(result.issueEntries.length, 1);
});

test('scan runner can collect entries for all filters in one pass', async () => {
  const runner = createContentScanRunner({
    batchSize: 10,
    getElements: () => [{ visible: true }],
    isElementVisible: () => true,
    getStyles: () => ({}),
    inspectElement: ({ filterKey }) => ({
      issues: [`${filterKey}-issue`],
      suggestions: [],
    }),
    addIssueEntry: ({ category, message }) => ({ key: `${category}-${message}`, category, message }),
    markElement: () => {},
    yieldToBrowser: async () => {},
  });

  const result = await runner.run({ filters: ['color', 'font'], activeFilter: 'font', collectAllEntries: true });

  assert.deepEqual(result.counts, { color: 1, font: 1 });
  assert.deepEqual(result.violations, ['color-issue', 'font-issue']);
  assert.deepEqual(result.issueEntries.map((entry) => entry.category), ['color', 'font']);
});

test('scan runner can collect initial entries before an active filter is selected', async () => {
  const runner = createContentScanRunner({
    batchSize: 10,
    getElements: () => [{ visible: true }],
    isElementVisible: () => true,
    getStyles: () => ({}),
    inspectElement: ({ filterKey }) => ({
      issues: [`${filterKey}-issue`],
      suggestions: [],
    }),
    addIssueEntry: ({ category, message }) => ({ key: `${category}-${message}`, category, message }),
    markElement: () => {},
    yieldToBrowser: async () => {},
  });

  const result = await runner.run({ filters: ['color', 'font'], activeFilter: null, collectAllEntries: true });

  assert.deepEqual(result.counts, { color: 1, font: 1 });
  assert.deepEqual(result.violations, ['color-issue', 'font-issue']);
  assert.deepEqual(result.issueEntries.map((entry) => entry.category), ['color', 'font']);
});

test('scan runner counts all filters while collecting entries only for the active filter by default', async () => {
  const runner = createContentScanRunner({
    batchSize: 10,
    getElements: () => [{ visible: true }],
    isElementVisible: () => true,
    getStyles: () => ({}),
    inspectElement: ({ filterKey }) => ({
      issues: [`${filterKey}-issue`],
      suggestions: [],
    }),
    addIssueEntry: ({ category, message }) => ({ key: `${category}-${message}`, category, message }),
    markElement: () => {},
    yieldToBrowser: async () => {},
  });

  const result = await runner.run({ filters: ['color', 'font'], activeFilter: 'font' });

  assert.deepEqual(result.counts, { color: 1, font: 1 });
  assert.deepEqual(result.violations, ['font-issue']);
  assert.deepEqual(result.meta, {
    totalElementCount: 1,
    scannedElementCount: 1,
    skippedElementCount: 0,
    excludedElementCount: 0,
    batchYieldCount: 0,
    truncated: false,
  });
});

test('scan runner deduplicates issue entries by key before counting visible results', async () => {
  const runner = createContentScanRunner({
    batchSize: 10,
    getElements: () => [{ index: 0 }, { index: 1 }, { index: 2 }],
    isElementVisible: () => true,
    getStyles: () => ({}),
    inspectElement: () => ({
      issues: ['패딩 14px (미등록)'],
      suggestions: [],
    }),
    addIssueEntry: ({ category, message }) => ({
      key: `${category}|same-box|${message}`,
      category,
      message,
      tone: 'danger',
    }),
    markElement: () => {},
    yieldToBrowser: async () => {},
  });

  const result = await runner.run({ filters: ['spacing'], activeFilter: 'spacing' });

  assert.equal(result.counts.spacing, 1);
  assert.equal(result.issueEntries.length, 1);
  assert.deepEqual(result.violations, ['패딩 14px (미등록)']);
});

test('scan runner yields when the batch time budget is exceeded', async () => {
  let now = 0;
  const yielded = [];
  const runner = createContentScanRunner({
    batchSize: 100,
    batchBudgetMs: 5,
    now: () => now,
    getElements: () => Array.from({ length: 4 }, (_, index) => ({ index })),
    isElementVisible: () => true,
    getStyles: () => {
      now += 3;
      return {};
    },
    inspectElement: () => ({ issues: [], suggestions: [] }),
    addIssueEntry: ({ category, message }) => ({ key: `${category}-${message}`, category, message }),
    markElement: () => {},
    yieldToBrowser: async () => {
      yielded.push(now);
    },
  });

  const result = await runner.run({ filters: ['color'], activeFilter: 'color' });

  assert.equal(result.meta.batchYieldCount >= 1, true);
  assert.equal(yielded.length >= 1, true);
});

test('scan runner can limit scanned elements and report truncation', async () => {
  const runner = createContentScanRunner({
    batchSize: 10,
    maxElements: 2,
    getElements: () => Array.from({ length: 4 }, (_, index) => ({ index })),
    isElementVisible: () => true,
    getStyles: () => ({}),
    inspectElement: () => ({ issues: ['issue'], suggestions: [] }),
    addIssueEntry: ({ category, message, element }) => ({
      key: `${category}-${element.index}`,
      category,
      message,
      element,
    }),
    markElement: () => {},
    yieldToBrowser: async () => {},
  });

  const result = await runner.run({ filters: ['color'], activeFilter: 'color' });

  assert.equal(result.meta.totalElementCount, 4);
  assert.equal(result.meta.scannedElementCount, 2);
  assert.equal(result.meta.truncated, true);
  assert.deepEqual(result.violations, ['issue', 'issue']);
});

test('content does not repaint inspection marks after being toggled off mid-scan', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');

  assert.match(contentSource, /scanData\s*=\s*await runner\.run\([\s\S]*if \(!isExtensionVisible \|\| isDismissedByUser\) \{[\s\S]*clearInspectionMarks\(\);[\s\S]*return scanData;[\s\S]*\}[\s\S]*markScannedElementsFromEntries\(\)/);
  assert.match(contentSource, /function\s+clearScan\(\)\s*\{[\s\S]*clearInspectionMarks\(\)/);
});

test('content repairs stale inspector shell before visible toggle scans', () => {
  const contentSource = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
  const toolbarUiSource = fs.readFileSync(path.join(__dirname, 'content-toolbar-ui.js'), 'utf8');

  assert.match(toolbarUiSource, /function\s+isInspectorUIShellComplete\(/);
  assert.match(contentSource, /function\s+ensureVisibleInspectorUI\(\)/);
  assert.match(contentSource, /if \(root && !isInspectorUIShellComplete\(root\)\) \{[\s\S]*root\.remove\(\);[\s\S]*root = null;[\s\S]*\}/);
  assert.match(contentSource, /if \(!root\) \{[\s\S]*createUI\(\);[\s\S]*root = document\.getElementById\('fds-root'\);[\s\S]*\}/);
  assert.match(contentSource, /setRootVisibility\(true\);[\s\S]*syncToolbar\(\);/);
  assert.match(contentSource, /if \(isVisible\) root = ensureVisibleInspectorUI\(\);/);
  assert.match(contentSource, /visible:\s*isInspectorUIVisible\(\)/);
  assert.match(contentSource, /Boolean\(root\.querySelector\('#fds-toolbar button'\)\)/);
});
