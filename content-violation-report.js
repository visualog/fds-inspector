(function initContentViolationReport(globalScope) {
  const CATEGORY_LABELS = Object.freeze({
    color: '컬러',
    font: '폰트',
    spacing: '간격',
    radius: '라운드',
  });
  const CATEGORY_ORDER = Object.freeze(['color', 'font', 'spacing', 'radius']);
  const REPORT_TABS = Object.freeze([
    { key: 'color-bg', label: '배경색', category: 'color', colorPart: 'bg' },
    { key: 'color-border', label: '보더색', category: 'color', colorPart: 'border' },
    { key: 'color-text', label: '폰트색', category: 'color', colorPart: 'text' },
    { key: 'font-family', label: '폰트 패밀리', category: 'font' },
    { key: 'spacing', label: '스페이싱', category: 'spacing' },
    { key: 'radius', label: '모서리 라운드', category: 'radius' },
  ]);
  const TONE_LABELS = Object.freeze({
    danger: '미등록',
    warning: '원시값',
    success: '정상',
  });
  const TONE_ORDER = Object.freeze(['danger', 'warning', 'success']);
  const LOCATION_GUIDANCE_TEXT = 'DOM 클래스명은 빌드 과정에서 생성된 불안정한 값일 수 있습니다. 수정 위치는 요소 텍스트, role, aria-label, name, data-* 속성, 화면 구조를 기준으로 확인하세요.';

  function normalizeEntries(scanData = {}) {
    return Array.isArray(scanData.issueEntries) ? scanData.issueEntries : [];
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatNumber(value) {
    const numericValue = Number(value || 0);
    return Number.isFinite(numericValue) ? numericValue.toLocaleString('ko-KR') : '0';
  }

  function formatReportDate(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const parts = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);
    const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${byType.year}-${byType.month}-${byType.day} ${byType.hour}:${byType.minute}`;
  }

  function getReportEyebrow(pageUrl = '') {
    return String(pageUrl || '').trim() || '검사 대상 페이지';
  }

  function getEntryElementLabel(entry = {}) {
    const element = entry.element;
    const tagName = element?.tagName?.toLowerCase?.() || 'element';
    const idPart = element?.id ? `#${element.id}` : '';
    const classPart = typeof element?.className === 'string' && element.className.trim()
      ? `.${element.className.trim().split(/\s+/).slice(0, 1).join('.')}`
      : '';
    return entry.elementLabel || `${tagName}${idPart}${classPart}`;
  }

  function getElementClassNames(element = {}) {
    if (typeof element?.className === 'string') {
      return element.className.trim().split(/\s+/).filter(Boolean);
    }
    if (typeof element?.getAttribute === 'function') {
      return String(element.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean);
    }
    return [];
  }

  function getElementDomSegment(element = {}) {
    const tagName = element?.tagName?.toLowerCase?.() || 'element';
    if (element?.id) return `${tagName}#${element.id}`;
    const classNames = getElementClassNames(element).slice(0, 1);
    if (classNames.length) return `${tagName}.${classNames.join('.')}`;
    const parent = element?.parentElement;
    if (!parent?.children) return tagName;
    const siblings = Array.from(parent.children).filter((sibling) => sibling?.tagName === element.tagName);
    const index = siblings.indexOf(element);
    return index > 0 ? `${tagName}:nth-of-type(${index + 1})` : tagName;
  }

  function getEntryPageLocation(entry = {}) {
    if (entry.pageLocation) return entry.pageLocation;
    if (entry.domPath) return entry.domPath;
    if (entry.selector) return entry.selector;
    const element = entry.element;
    if (!element) return '확인 불가';
    const segments = [];
    let current = element;
    while (current && segments.length < 8) {
      segments.unshift(getElementDomSegment(current));
      if (current.id || current.tagName?.toLowerCase?.() === 'html') break;
      current = current.parentElement;
    }
    return segments.length ? segments.join(' > ') : getEntryElementLabel(entry);
  }

  function formatCompactPageLocation(location) {
    const parts = String(location || '').split(/\s*>\s*/).map((part) => part.trim()).filter(Boolean);
    if (parts.length <= 2) return String(location || '');
    return `${parts[0]} > … > ${parts[parts.length - 1]}`;
  }

  function splitPageLocation(location) {
    return String(location || '').split(/\s*>\s*/).map((part) => part.trim()).filter(Boolean);
  }

  function getPathToneClass(tone) {
    if (tone === 'danger') return ' danger';
    if (tone === 'warning') return ' warning';
    return '';
  }

  function createPathSegmentsHtml(parts = [], tone = '') {
    return parts.map((part, index) => {
      const isEllipsis = part === '…';
      const isLastElement = index === parts.length - 1 && !isEllipsis;
      const segmentClass = isEllipsis
        ? 'path-ellipsis'
        : `path-segment${isLastElement ? ` path-segment-impact${getPathToneClass(tone)}` : ''}`;
      return `<span class="${segmentClass}">${escapeHtml(part)}</span>`;
    }).join('<span class="path-separator"> &gt; </span>');
  }

  function createPageLocationPathHtml(location, tone = '', compact = false) {
    const parts = splitPageLocation(location);
    if (!parts.length) return escapeHtml(location);
    const visibleParts = compact && parts.length > 2
      ? [parts[0], '…', parts[parts.length - 1]]
      : parts;
    return createPathSegmentsHtml(visibleParts, tone);
  }

  function getFallbackParsedViolation(entry = {}) {
    return {
      chip: CATEGORY_LABELS[entry.category] || '위반',
      tone: entry.tone || 'danger',
      value: entry.message || '',
      tag: TONE_LABELS[entry.tone] || '위반',
    };
  }

  function getParsedViolation(entry, parseViolationItem) {
    const assessmentTag = entry.metadata?.assessment?.reason === 'fluid-layout' ? '유동 레이아웃 확인'
      : entry.metadata?.assessment?.reason === 'declaration-unavailable' ? 'CSS 선언 확인 필요'
      : ({ mismatch: 'FDS 불일치 후보', recommendation: '토큰 전환 권장', review: '출처 확인 필요' })[entry.metadata?.assessment?.status];
    return {
      ...getFallbackParsedViolation(entry),
      ...(typeof parseViolationItem === 'function' ? parseViolationItem(entry.message) : {}),
      ...(assessmentTag ? { tag: assessmentTag } : {}),
    };
  }

  function normalizeTokenList(tokens = []) {
    return [...new Set((Array.isArray(tokens) ? tokens : [tokens])
      .map((token) => String(token || '').trim())
      .filter(Boolean))];
  }

  function extractReplacementTokensFromTag(tag = '') {
    const match = String(tag || '').match(/:\s*(.+)$/);
    if (!match) return [];
    return normalizeTokenList(match[1].split(','));
  }

  function getStatusLabel(tag = '', tone = '') {
    const label = String(tag || TONE_LABELS[tone] || tone || '').split(':')[0].trim();
    return label || TONE_LABELS[tone] || tone || '위반';
  }

  function getSuggestedTokensForEntry(entry = {}, parsed = {}, getSuggestedTokensForIssue) {
    const entryTokens = normalizeTokenList(
      entry.suggestedTokens || entry.replacementTokens || entry.tokens || [],
    );
    const tagTokens = extractReplacementTokensFromTag(parsed.tag || parsed.suffix);
    const resolverTokens = typeof getSuggestedTokensForIssue === 'function'
      ? normalizeTokenList(getSuggestedTokensForIssue(entry))
      : [];
    return normalizeTokenList([...entryTokens, ...tagTokens, ...resolverTokens]);
  }

  function normalizeReportNote(note) {
    if (!note) return null;
    if (typeof note === 'string') {
      const text = note.trim();
      return text ? { text } : null;
    }
    if (typeof note !== 'object') return null;
    const text = String(note.text || note.memo || '').trim();
    if (!text) return null;
    return {
      ...note,
      text,
    };
  }

  function getReportEntryNote(entry = {}, getViolationNoteForEntry) {
    const directNote = normalizeReportNote(entry.note || entry.userNote || entry.memo);
    if (directNote) return directNote;
    if (typeof getViolationNoteForEntry !== 'function') return null;
    return normalizeReportNote(getViolationNoteForEntry(entry));
  }

  function formatMarkdownLine(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function createCategoryCounts(entries = []) {
    const counts = {};
    CATEGORY_ORDER.forEach((category) => {
      counts[category] = { total: 0, danger: 0, warning: 0 };
    });

    entries.forEach((entry) => {
      const category = CATEGORY_ORDER.includes(entry.category) ? entry.category : 'unknown';
      counts[category] = counts[category] || { total: 0, danger: 0, warning: 0 };
      counts[category].total += 1;
      if (entry.tone === 'danger') counts[category].danger += 1;
      if (entry.tone === 'warning') counts[category].warning += 1;
    });

    return counts;
  }

  function getCategorySortIndex(category) {
    const index = CATEGORY_ORDER.indexOf(category);
    return index >= 0 ? index : CATEGORY_ORDER.length;
  }

  function getToneSortIndex(tone) {
    const index = TONE_ORDER.indexOf(tone);
    return index >= 0 ? index : TONE_ORDER.length;
  }

  function groupEntries(entries = [], parseViolationItem, getSuggestedTokensForIssue) {
    const groupsByKey = new Map();

    entries.forEach((entry) => {
      const parsed = getParsedViolation(entry, parseViolationItem);
      const category = entry.category || 'unknown';
      const tone = entry.tone || parsed.tone || 'danger';
      const key = [
        category,
        tone,
        entry.colorPart || '',
        parsed.chip || '',
        parsed.value || '',
        parsed.tag || '',
      ].join('::');
      if (!groupsByKey.has(key)) {
        groupsByKey.set(key, {
          key,
          category,
          tone,
          chip: parsed.chip || CATEGORY_LABELS[category] || '위반',
          value: parsed.value || '',
          tag: parsed.tag || TONE_LABELS[tone] || '위반',
          suggestedTokens: [],
          entries: [],
        });
      }
      const group = groupsByKey.get(key);
      group.entries.push(entry);
      group.suggestedTokens = normalizeTokenList([
        ...group.suggestedTokens,
        ...getSuggestedTokensForEntry(entry, parsed, getSuggestedTokensForIssue),
      ]);
    });

    return [...groupsByKey.values()].sort((a, b) => (
      getCategorySortIndex(a.category) - getCategorySortIndex(b.category)
      || getToneSortIndex(a.tone) - getToneSortIndex(b.tone)
      || b.entries.length - a.entries.length
      || String(a.value).localeCompare(String(b.value), 'ko-KR')
    ));
  }

  function createSummaryTableHtml(entries = []) {
    const counts = createCategoryCounts(entries);
    const rows = Object.entries(counts)
      .filter(([, count]) => count.total > 0)
      .sort(([a], [b]) => getCategorySortIndex(a) - getCategorySortIndex(b))
      .map(([category, count]) => `<tr><th>${escapeHtml(CATEGORY_LABELS[category] || category)}</th><td>${formatNumber(count.total)}</td><td>${formatNumber(count.danger)}</td><td>${formatNumber(count.warning)}</td></tr>`)
      .join('');

    return `
      <table class="summary-table">
        <thead>
          <tr><th>구분</th><th>전체</th><th>미등록</th><th>원시값</th></tr>
        </thead>
        <tbody>
          <tr><th>전체</th><td>${formatNumber(entries.length)}</td><td>${formatNumber(entries.filter((entry) => entry.tone === 'danger').length)}</td><td>${formatNumber(entries.filter((entry) => entry.tone === 'warning').length)}</td></tr>
          ${rows}
        </tbody>
      </table>
    `;
  }

  function createSummaryTitleMetaHtml({ inspectedAt, tokenContextLabel = '' }) {
    const rows = [
      ['검사 시각', formatReportDate(inspectedAt)],
      tokenContextLabel ? ['토큰 기준', tokenContextLabel] : null,
    ].filter(Boolean);

    if (!rows.length) return '';

    return `
      <div class="summary-title-meta" aria-label="검사 메타 정보">
        ${rows.map(([label, value]) => `<div class="meta-row"><span class="meta-label">${escapeHtml(label)}</span><span>${escapeHtml(value)}</span></div>`).join('')}
      </div>
    `;
  }

  function createViolationMetricCardsHtml(entries = []) {
    return `
      <div class="summary-grid">
        <article class="summary-card total"><span>전체 위반</span><strong>${formatNumber(entries.length)}</strong></article>
        <article class="summary-card danger"><span>미등록</span><strong>${formatNumber(entries.filter((entry) => entry.tone === 'danger').length)}</strong></article>
        <article class="summary-card warning"><span>원시값</span><strong>${formatNumber(entries.filter((entry) => entry.tone === 'warning').length)}</strong></article>
      </div>
    `;
  }

  function createReportSummaryOverviewHtml({ entries = [] }) {
    return `
      <div class="summary-overview">
        <article class="summary-panel violation-info">
          ${createViolationMetricCardsHtml(entries)}
          ${createSummaryTableHtml(entries)}
        </article>
      </div>
    `;
  }

  function getReplacementTokenLabel(group) {
    return group.suggestedTokens?.length
      ? group.suggestedTokens.join(', ')
      : '확인 필요';
  }

  function createAiRequestGroupMarkdown({ group, getViolationNoteForEntry }) {
    const groupValue = group.value || group.chip;
    const groupTone = getStatusLabel(group.tag, group.tone);
    const locations = group.entries.map((entry, index) => {
      const note = getReportEntryNote(entry, getViolationNoteForEntry);
      const lines = [`${index + 1}. ${getEntryPageLocation(entry)}`];
      if (note) lines.push(`   - 사용자 메모: ${formatMarkdownLine(note.text)}`);
      return lines.join('\n');
    }).join('\n');
    return [
      `### ${groupTone} / ${groupValue} / ${formatNumber(group.entries.length)}개 요소에 영향`,
      '',
      `FDS 추천 토큰: ${getReplacementTokenLabel(group)}`,
      '',
      '영향 요소 위치:',
      locations || '- 없음',
    ].join('\n');
  }

  function createViolationReportAiRequestMarkdown({
    scanData = {},
    pageTitle = '',
    pageUrl = '',
    inspectedAt = new Date(),
    tokenContextLabel = '',
    parseViolationItem,
    getSuggestedTokensForIssue,
    getViolationNoteForEntry,
  } = {}) {
    const entries = normalizeEntries(scanData);
    const sections = REPORT_TABS.map((tab) => {
      const tabEntries = getReportTabEntries(entries, tab);
      const groups = groupEntries(tabEntries, parseViolationItem, getSuggestedTokensForIssue);
      if (!groups.length) return '';
      return [
        `## ${tab.label}`,
        '',
        groups.map((group) => createAiRequestGroupMarkdown({ group, getViolationNoteForEntry })).join('\n\n'),
      ].join('\n');
    }).filter(Boolean).join('\n\n');

    return [
      '# FDS 디자인 토큰 위반 수정 요청서',
      '',
      '아래 검사 결과를 기준으로 디자인 토큰 위반을 수정해줘.',
      '',
      '## 수정 기준',
      '',
      '- 미등록 값은 FDS 토큰으로 교체',
      '- 원시값 직접 사용 값은 대응 가능한 FDS 토큰으로 교체',
      '- 실제 영향 요소 위치를 기준으로 수정',
      '- 같은 값이 여러 요소에 반복되면 공통 스타일 또는 컴포넌트 단위로 정리',
      `- 위치 정보 안내: ${LOCATION_GUIDANCE_TEXT}`,
      '- 확실하지 않은 위치는 추정이라고 표시하고 수정 전 관련 파일을 먼저 확인',
      '- 변경 후 동일 검사를 다시 실행했을 때 아래 위반이 줄어들어야 함',
      '',
      '## 검사 정보',
      '',
      `- 페이지: ${pageTitle || '제목 없음'}`,
      `- URL: ${pageUrl || '알 수 없음'}`,
      `- 검사 시각: ${formatReportDate(inspectedAt)}`,
      `- 토큰 기준: ${tokenContextLabel || '알 수 없음'}`,
      `- 전체 위반: ${formatNumber(entries.length)}개`,
      `- 미등록: ${formatNumber(entries.filter((entry) => entry.tone === 'danger').length)}개`,
      `- 원시값 직접 사용: ${formatNumber(entries.filter((entry) => entry.tone === 'warning').length)}개`,
      '',
      entries.length ? sections : '## 검사 결과\n\n검출된 위반 요소가 없습니다.',
      '',
    ].join('\n');
  }

  function createGroupHtml(group, { getViolationNoteForEntry } = {}) {
    const groupValue = group.value
      ? `<code>${escapeHtml(group.value)}</code>`
      : escapeHtml(group.chip);
    const groupTone = getStatusLabel(group.tag, group.tone);
    const replacementTokenLabel = getReplacementTokenLabel(group);
    const rows = group.entries.map((entry) => {
      const pageLocation = getEntryPageLocation(entry);
      const compactLocation = formatCompactPageLocation(pageLocation);
      const compactPathHtml = createPageLocationPathHtml(pageLocation, group.tone, true);
      const fullPathHtml = createPageLocationPathHtml(pageLocation, group.tone, false);
      const note = getReportEntryNote(entry, getViolationNoteForEntry);
      const noteHtml = note
        ? `<div class="path-note"><span>사용자 메모</span><p>${escapeHtml(note.text)}</p></div>`
        : '';
      return `<tr class="path-row" tabindex="0" aria-expanded="false" data-path-row data-compact-path="${escapeHtml(compactLocation)}" data-full-path="${escapeHtml(pageLocation)}"><td><code class="path-compact"><span class="path-view path-view-compact">${compactPathHtml}</span><span class="path-view path-view-full">${fullPathHtml}</span></code>${noteHtml}</td></tr>`;
    }).join('');

    return `
      <details class="issue-group ${escapeHtml(group.tone)}">
        <summary class="issue-table-summary">
          <span class="issue-accordion-marker" aria-hidden="true"></span>
          <span class="issue-table-summary-copy">
            <span class="tone ${escapeHtml(group.tone)}">${escapeHtml(groupTone)}</span>
            <span class="issue-table-separator">/</span>
            <span class="issue-table-title">${groupValue}</span>
            <span class="issue-table-separator">/</span>
            <span class="issue-table-impact">${formatNumber(group.entries.length)}개 요소에 영향</span>
          </span>
        </summary>
        <div class="issue-token-hint"><span>FDS 추천 토큰</span><code>${escapeHtml(replacementTokenLabel)}</code></div>
        <table class="issue-table">
          <tbody>${rows}</tbody>
        </table>
      </details>
    `;
  }

  function getCategoryEntries(entries = [], category) {
    return entries.filter((entry) => entry.category === category);
  }

  function getReportTabEntries(entries = [], tab) {
    return entries.filter((entry) => {
      if (entry.category !== tab.category) return false;
      if (tab.colorPart) return (entry.colorPart || 'bg') === tab.colorPart;
      return true;
    });
  }

  function getInitialReportTabKey(entries = []) {
    const activeTab = REPORT_TABS.find((tab) => getReportTabEntries(entries, tab).length > 0);
    return activeTab?.key || REPORT_TABS[0].key;
  }

  function createReportTabsHtml(entries = [], activeTabKey = REPORT_TABS[0].key) {
    return `
      <div class="report-tabs" role="tablist" aria-label="위반 카테고리">
        ${REPORT_TABS.map((tab) => {
          const count = getReportTabEntries(entries, tab).length;
          const isActive = tab.key === activeTabKey;
          return `<button class="report-tab${isActive ? ' is-active' : ''}" type="button" role="tab" aria-selected="${isActive ? 'true' : 'false'}" aria-controls="report-panel-${escapeHtml(tab.key)}" id="report-tab-${escapeHtml(tab.key)}" data-report-tab="${escapeHtml(tab.key)}">${escapeHtml(tab.label)} <span>${formatNumber(count)}</span></button>`;
        }).join('')}
      </div>
    `;
  }

  function createReportTabSectionHtml({
    tab,
    entries = [],
    activeTabKey,
    parseViolationItem,
    getSuggestedTokensForIssue,
    getViolationNoteForEntry,
  }) {
    const isActive = tab.key === activeTabKey;
    const groups = groupEntries(entries, parseViolationItem, getSuggestedTokensForIssue);
    const sectionAttrs = [
      `class="category-section${isActive ? ' is-active' : ''}"`,
      `id="report-panel-${escapeHtml(tab.key)}"`,
      'role="tabpanel"',
      `aria-labelledby="report-tab-${escapeHtml(tab.key)}"`,
      `data-report-panel="${escapeHtml(tab.key)}"`,
      isActive ? '' : 'hidden',
    ].filter(Boolean).join(' ');
    const body = groups.length
      ? groups.map((group) => createGroupHtml(group, { getViolationNoteForEntry })).join('')
      : '<p class="empty-state">이 카테고리의 위반 요소가 없습니다.</p>';

    return `
      <section ${sectionAttrs}>
        ${body}
      </section>
    `;
  }

  function createReportScript() {
    return `<script>(() => {
  const viewTabs = Array.from(document.querySelectorAll('[data-report-view-tab]'));
  const viewPanels = Array.from(document.querySelectorAll('[data-report-view-panel]'));
  const activateReportView = (nextView) => {
    viewTabs.forEach((tab) => {
      const active = tab.dataset.reportViewTab === nextView;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    viewPanels.forEach((panel) => {
      panel.hidden = panel.dataset.reportViewPanel !== nextView;
      panel.classList.toggle('is-active', !panel.hidden);
    });
  };
  const tabs = Array.from(document.querySelectorAll('[data-report-tab]'));
  const panels = Array.from(document.querySelectorAll('[data-report-panel]'));
  const activate = (nextCategory) => {
    tabs.forEach((tab) => {
      const active = tab.dataset.reportTab === nextCategory;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.reportPanel !== nextCategory;
      panel.classList.toggle('is-active', !panel.hidden);
    });
  };
  viewTabs.forEach((tab) => {
    tab.addEventListener('click', () => activateReportView(tab.dataset.reportViewTab));
  });
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => activate(tab.dataset.reportTab));
  });
  const pathRows = Array.from(document.querySelectorAll('[data-path-row]'));
  const togglePathRow = (row) => {
    const expanded = row.getAttribute('aria-expanded') === 'true';
    row.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    row.classList.toggle('is-expanded', !expanded);
  };
  pathRows.forEach((row) => {
    row.addEventListener('click', () => togglePathRow(row));
    row.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      togglePathRow(row);
    });
  });
})();</script>`;
  }

  function createReportStyles() {
    return `
      :root {
        color-scheme: light;
        --bg: #f5f7fb;
        --surface: #ffffff;
        --surface-muted: #f8fafc;
        --text: #172033;
        --muted: #657089;
        --line: #dce3ee;
        --brand: #2f6ff3;
        --danger: #d92d20;
        --danger-bg: #fff1f0;
        --warning: #b45309;
        --warning-bg: #fff7e6;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.4;
      }
      main {
        width: min(1120px, calc(100% - 48px));
        margin: 0 auto;
        padding: 28px 0 44px;
      }
      .hero {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        padding: 18px 0 14px;
      }
      .hero-copy {
        min-width: 0;
      }
      .eyebrow {
        margin: 0 0 6px;
        color: var(--brand);
        font-size: 12px;
        font-weight: 800;
      }
      h1 {
        margin: 0;
        font-size: 30px;
        line-height: 1.2;
        letter-spacing: 0;
      }
      .report-view-tabs {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px;
        background: var(--surface-muted);
        border: 1px solid var(--line);
        border-radius: 8px;
        flex: 0 0 auto;
      }
      .report-view-tab {
        appearance: none;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: var(--muted);
        min-height: 28px;
        padding: 0 10px;
        font-size: 12px;
        line-height: 16px;
        font-weight: 700;
        cursor: pointer;
      }
      .report-view-tab.is-active {
        background: var(--surface);
        color: var(--text);
        box-shadow: inset 0 0 0 1px var(--line);
      }
      .report-view-tab:focus-visible {
        outline: 2px solid rgba(47, 111, 243, 0.34);
        outline-offset: 2px;
      }
      .report-view-panel[hidden] {
        display: none;
      }
      .ai-request-doc {
        margin: 0;
        padding: 16px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 8px;
        color: var(--text);
        font-size: 12px;
        line-height: 1.6;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
      h2 {
        margin: 22px 0 10px;
        font-size: 17px;
        letter-spacing: 0;
      }
      h3 {
        margin: 0;
        font-size: 15px;
        letter-spacing: 0;
      }
      code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 0.92em;
      }
      .path-compact {
        display: inline-block;
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        vertical-align: bottom;
      }
      .path-view-full {
        display: none;
      }
      .path-row.is-expanded .path-view-compact {
        display: none;
      }
      .path-row.is-expanded .path-view-full {
        display: inline;
      }
      .path-row.is-expanded .path-compact {
        white-space: normal;
        overflow: visible;
        text-overflow: clip;
      }
      .location-guidance {
        margin: -4px 0 12px;
        color: var(--muted);
        font-size: 12px;
        line-height: 18px;
      }
      .location-guidance strong {
        color: var(--text);
        font-weight: 700;
      }
      .path-segment-impact.danger {
        color: var(--danger);
      }
      .path-segment-impact.warning {
        color: var(--warning);
      }
      .section-title-row {
        display: flex;
        align-items: baseline;
        gap: 14px;
        flex-wrap: wrap;
        margin: 22px 0 10px;
      }
      .section-title-row h2 {
        margin: 0;
      }
      .summary-title-meta {
        display: flex;
        align-items: baseline;
        gap: 12px;
        flex-wrap: wrap;
        min-width: 0;
      }
      .summary-overview {
        display: block;
      }
      .summary-panel {
        padding: 0;
        background: transparent;
        border: 0;
        border-radius: 0;
      }
      .meta-row {
        display: grid;
        grid-template-columns: 78px minmax(0, 1fr);
        gap: 10px;
        min-width: 0;
        font-size: 12px;
      }
      .summary-title-meta .meta-row {
        display: flex;
        grid-template-columns: none;
        gap: 6px;
      }
      .meta-label {
        color: var(--muted);
        font-weight: 700;
      }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
        margin: 0 0 10px;
      }
      .summary-card {
        padding: 10px 12px;
        background: var(--surface-muted);
        border: 1px solid var(--line);
        border-radius: 8px;
      }
      .summary-card span {
        display: block;
        color: var(--muted);
        font-size: 12px;
        font-weight: 700;
      }
      .summary-card strong {
        display: block;
        margin-top: 2px;
        font-size: 24px;
        line-height: 1.1;
      }
      .scan-summary-section {
        margin-bottom: 28px;
      }
      .violation-detail-section {
        margin-top: 0;
      }
      .report-tabs {
        display: flex;
        gap: 0;
        flex-wrap: wrap;
        margin: 0 0 12px;
        border-bottom: 1px solid var(--line);
      }
      .report-tab {
        appearance: none;
        border: 0;
        border-bottom: 2px solid transparent;
        border-radius: 0;
        background: transparent;
        color: var(--muted);
        min-height: 32px;
        padding: 0 12px 7px;
        margin: 0 0 -1px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 800;
        cursor: pointer;
      }
      .report-tab span {
        min-width: 22px;
        height: 22px;
        border-radius: 999px;
        background: #e9eef7;
        color: var(--text);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0 7px;
        font-size: 12px;
      }
      .report-tab.is-active {
        border-bottom-color: var(--brand);
        color: var(--brand);
      }
      .report-tab.is-active span {
        background: rgba(47, 111, 243, 0.12);
        color: var(--brand);
      }
      .report-tab:focus-visible {
        outline: 2px solid rgba(47, 111, 243, 0.34);
        outline-offset: 2px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 8px;
        overflow: hidden;
      }
      th, td {
        padding: 8px 10px;
        border-bottom: 1px solid var(--line);
        text-align: left;
        vertical-align: top;
        font-size: 12px;
      }
      th {
        color: var(--muted);
        background: var(--surface-muted);
        font-weight: 800;
      }
      tbody th {
        background: var(--surface);
      }
      td {
        overflow-wrap: anywhere;
      }
      .path-row {
        cursor: pointer;
      }
      .path-row:hover td {
        background: #f8fafc;
      }
      .path-row:focus-visible {
        outline: 2px solid rgba(47, 111, 243, 0.34);
        outline-offset: -2px;
      }
      .path-note {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 8px;
        margin-top: 6px;
        color: var(--muted);
        font-size: 12px;
        line-height: 16px;
      }
      .path-note span {
        color: var(--text);
        font-weight: 700;
        white-space: nowrap;
      }
      .path-note p {
        margin: 0;
        color: var(--text);
        white-space: pre-wrap;
      }
      tr:last-child th,
      tr:last-child td {
        border-bottom: 0;
      }
      .issue-group {
        margin-bottom: 0;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 8px;
        overflow: hidden;
      }
      .category-section {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .category-section[hidden] {
        display: none;
      }
      .issue-table {
        border: 0;
        border-radius: 0;
      }
      .issue-table-summary {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 9px 12px;
        background: var(--surface-muted);
        color: var(--text);
        cursor: pointer;
        font-size: 12px;
        line-height: 16px;
        font-weight: 500;
        list-style: none;
        user-select: none;
      }
      .issue-table-summary::-webkit-details-marker {
        display: none;
      }
      .issue-table-summary:focus-visible {
        outline: 2px solid rgba(47, 111, 243, 0.34);
        outline-offset: -2px;
      }
      .issue-table-summary-copy {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        min-width: 0;
        font-size: 12px;
        line-height: 16px;
        font-weight: 500;
      }
      .issue-accordion-marker {
        width: 14px;
        height: 14px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
      }
      .issue-accordion-marker::before {
        content: "";
        width: 5px;
        height: 5px;
        border-right: 1.5px solid #9aa8bd;
        border-bottom: 1.5px solid #9aa8bd;
        transform: rotate(45deg) translateY(-1px);
        transition: transform 0.16s ease;
      }
      .issue-group[open] .issue-accordion-marker::before {
        transform: rotate(225deg) translate(-1px, -1px);
      }
      .issue-group[open] .issue-table {
        border-top: 1px solid var(--line);
      }
      .issue-token-hint {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 7px 12px 8px 34px;
        border-top: 1px solid var(--line);
        background: var(--surface);
        color: var(--muted);
        font-size: 12px;
        line-height: 16px;
        font-weight: 500;
      }
      .issue-token-hint span {
        color: var(--muted);
        font-weight: 500;
      }
      .issue-token-hint code {
        color: var(--text);
        font-size: 12px;
        line-height: 16px;
        font-weight: 500;
      }
      .issue-table-title {
        color: var(--text);
        font-size: 12px;
        line-height: 16px;
        font-weight: 500;
      }
      .issue-table-title code {
        font-size: 12px;
        line-height: 16px;
        font-weight: 500;
      }
      .issue-table-separator,
      .issue-table-impact {
        color: var(--muted);
        font-size: 12px;
        line-height: 16px;
        font-weight: 500;
      }
      .issue-table-separator {
        color: #a8b2c2;
        font-weight: 300;
      }
      .tone {
        display: inline-flex;
        align-items: center;
        min-height: 24px;
        padding: 0 8px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 800;
        white-space: nowrap;
      }
      .issue-table-summary .tone {
        min-height: 20px;
        font-size: 12px;
        line-height: 16px;
        font-weight: 500;
      }
      .issue-table-summary .tone.danger {
        box-shadow: inset 0 0 0 1px #ffd4cf;
      }
      .issue-table-summary .tone.warning {
        box-shadow: inset 0 0 0 1px #f8deb4;
      }
      .tone.danger {
        color: var(--danger);
        background: var(--danger-bg);
      }
      .tone.warning {
        color: var(--warning);
        background: var(--warning-bg);
      }
      .empty-state {
        padding: 20px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 8px;
        color: var(--muted);
      }
      @media (max-width: 860px) {
        main {
          width: min(100% - 28px, 1120px);
        }
        .hero {
          flex-direction: column;
        }
        .summary-overview {
          grid-template-columns: 1fr;
        }
        .summary-grid {
          grid-template-columns: 1fr;
        }
      }
      @media print {
        body { background: white; }
        main { width: 100%; padding: 0; }
        .report-tabs, .report-view-tabs { display: none; }
        .report-view-panel[hidden] { display: block; }
        .category-section[hidden] { display: block; }
        .issue-group, .summary-card, .summary-panel { break-inside: avoid; }
      }
    `;
  }

  function createViolationReportHtml({
    scanData = {},
    pageTitle = '',
    pageUrl = '',
    inspectedAt = new Date(),
    tokenContextLabel = '',
    parseViolationItem,
    getSuggestedTokensForIssue,
    getViolationNoteForEntry,
  } = {}) {
    const entries = normalizeEntries(scanData);
    const aiRequestMarkdown = createViolationReportAiRequestMarkdown({
      scanData,
      pageTitle,
      pageUrl,
      inspectedAt,
      tokenContextLabel,
      parseViolationItem,
      getSuggestedTokensForIssue,
      getViolationNoteForEntry,
    });
    const activeTabKey = getInitialReportTabKey(entries);
    const issueSections = entries.length
      ? REPORT_TABS.map((tab) => createReportTabSectionHtml({
        tab,
        entries: getReportTabEntries(entries, tab),
        activeTabKey,
        parseViolationItem,
        getSuggestedTokensForIssue,
        getViolationNoteForEntry,
      })).join('')
      : '<p class="empty-state">검출된 위반 요소가 없습니다.</p>';
    const reportTitle = 'FDS 디자인 토큰 위반 요소 리포트';
    const reportEyebrow = getReportEyebrow(pageUrl);

    return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(reportTitle)}</title>
  <style>${createReportStyles()}</style>
</head>
<body>
  <main>
    <header class="hero">
      <div class="hero-copy">
        <p class="eyebrow">${escapeHtml(reportEyebrow)}</p>
        <h1>${escapeHtml(reportTitle)}</h1>
      </div>
      <div class="report-view-tabs" role="tablist" aria-label="리포트 화면 전환">
        <button class="report-view-tab is-active" type="button" role="tab" aria-selected="true" aria-controls="report-view-report" id="report-view-tab-report" data-report-view-tab="report">리포트</button>
        <button class="report-view-tab" type="button" role="tab" aria-selected="false" aria-controls="report-view-ai-request" id="report-view-tab-ai-request" data-report-view-tab="ai-request">AI 수정 요청서</button>
      </div>
    </header>
    <div class="report-view-panel is-active" id="report-view-report" role="tabpanel" aria-labelledby="report-view-tab-report" data-report-view-panel="report">
      <section class="scan-summary-section" aria-labelledby="summary-title">
        <div class="section-title-row">
          <h2 id="summary-title">검사 정보</h2>
          ${createSummaryTitleMetaHtml({ inspectedAt, tokenContextLabel })}
        </div>
        ${createReportSummaryOverviewHtml({ entries })}
      </section>
      <section class="violation-detail-section" aria-labelledby="violation-detail-title">
        <h2 id="violation-detail-title">검사 결과</h2>
        <p class="location-guidance"><strong>위치 정보 안내</strong> ${escapeHtml(LOCATION_GUIDANCE_TEXT)}</p>
        ${createReportTabsHtml(entries, activeTabKey)}
        ${issueSections}
      </section>
    </div>
    <section class="report-view-panel ai-request-panel" id="report-view-ai-request" role="tabpanel" aria-labelledby="report-view-tab-ai-request" data-report-view-panel="ai-request" hidden>
      <h2>AI 수정 요청서</h2>
      <pre class="ai-request-doc">${escapeHtml(aiRequestMarkdown)}</pre>
    </section>
  </main>
  ${createReportScript()}
</body>
</html>
`;
  }

  function createViolationReportFilename(date = new Date()) {
    const stamp = formatReportDate(date).replace(/[-:]/g, '').replace(/\s+/g, '-');
    return `fds-violation-report-${stamp || 'latest'}.html`;
  }

  function createViolationReportAiRequestFilename(date = new Date()) {
    const stamp = formatReportDate(date).replace(/[-:]/g, '').replace(/\s+/g, '-');
    return `fds-violation-ai-request-${stamp || 'latest'}.md`;
  }

  const api = {
    createViolationReportAiRequestFilename,
    createViolationReportAiRequestMarkdown,
    createViolationReportHtml,
    createViolationReportFilename,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  globalScope.FDSContentViolationReport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
