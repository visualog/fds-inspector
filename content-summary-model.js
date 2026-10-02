(function initContentSummaryModel(globalScope) {
  const EMPTY_TONE_COUNTS = Object.freeze({ danger: 0, warning: 0 });

  function createToneCounts() {
    return { danger: 0, warning: 0 };
  }

  function createContentSummaryModel({
    getScanData,
    getActiveFilter,
    getActiveSummarySubtab,
    setActiveSummarySubtab,
    getActiveSummaryTone,
    setActiveSummaryTone,
    getExpandedIssueGroupKeys,
    parseViolationItem,
  }) {
    function normalizeActiveSummaryToneForCounts(toneCounts = EMPTY_TONE_COUNTS) {
      const activeSummaryTone = getActiveSummaryTone();
      if (activeSummaryTone === 'danger' && toneCounts.danger === 0 && toneCounts.warning > 0) {
        setActiveSummaryTone('warning');
      } else if (activeSummaryTone === 'warning' && toneCounts.warning === 0 && toneCounts.danger > 0) {
        setActiveSummaryTone('danger');
      }
    }

    function getColorEntriesForActiveSubtab() {
      const activeSummarySubtab = getActiveSummarySubtab();
      return (getScanData()?.issueEntries || []).filter((entry) => {
        if (entry.category !== 'color') return false;
        if (activeSummarySubtab === 'bg') return entry.colorPart === 'bg';
        if (activeSummarySubtab === 'text') return entry.colorPart === 'text';
        return entry.colorPart === 'border';
      });
    }

    function getToneCountsForEntries(entries = []) {
      const seen = { danger: new Set(), warning: new Set() };
      return entries.reduce((acc, entry) => {
        const targets = seen[entry.tone];
        const target = entry.element || entry;
        if (targets && !targets.has(target)) {
          targets.add(target);
          acc[entry.tone] += 1;
        }
        return acc;
      }, createToneCounts());
    }

    function getColorToneCountsForActiveSubtab() {
      return getToneCountsForEntries(getColorEntriesForActiveSubtab());
    }

    function getTonePatternCountsForGroups(groups = []) {
      return groups.reduce((acc, group) => {
        if (group.tone === 'danger') acc.danger += 1;
        if (group.tone === 'warning') acc.warning += 1;
        return acc;
      }, createToneCounts());
    }

    function getVisibleIssueEntries() {
      const activeFilter = getActiveFilter();
      const activeSummaryTone = getActiveSummaryTone();
      if (!activeFilter) return [];
      const entries = (getScanData()?.issueEntries || []).filter((entry) => entry.category === activeFilter);
      if (activeFilter !== 'color') {
        return entries.filter((entry) => entry.tone === activeSummaryTone);
      }

      return getColorEntriesForActiveSubtab().filter((entry) => entry.tone === activeSummaryTone);
    }

    function getExcludedEntries() {
      return getScanData()?.excludedEntries || [];
    }

    function getIssueGroupKey(entry, parsed = parseViolationItem(entry?.message)) {
      return [
        entry?.category || 'unknown',
        entry?.tone || parsed.tone || 'danger',
        entry?.colorPart || 'all',
        parsed.chip || '',
        parsed.value || '',
        parsed.tag || '',
        ...(entry?.metadata?.assessment ? [entry.metadata.assessment.status, entry.metadata.assessment.reason || ''] : []),
      ].join('::');
    }

    function getEntryElementLabel(entry) {
      const element = entry?.element;
      const tagName = element?.tagName?.toLowerCase?.() || 'element';
      const idPart = element?.id ? `#${element.id}` : '';
      const classPart = typeof element?.className === 'string' && element.className.trim()
        ? `.${element.className.trim().split(/\s+/).slice(0, 1).join('.')}`
        : '';
      return `${tagName}${idPart}${classPart}`;
    }

    function aggregateIssueDetailEntries(entries = []) {
      const entriesByElementLabel = new Map();

      entries.forEach((entry) => {
        const elementLabel = getEntryElementLabel(entry);
        const key = `${entry?.message || ''}::${elementLabel}`;
        if (!entriesByElementLabel.has(key)) {
          entriesByElementLabel.set(key, {
            ...entry,
            elementLabel,
            elementCount: 0,
            issueKeys: [],
          });
        }
        const aggregatedEntry = entriesByElementLabel.get(key);
        aggregatedEntry.elementCount += 1;
        if (entry?.key) aggregatedEntry.issueKeys.push(entry.key);
      });

      return [...entriesByElementLabel.values()];
    }

    function groupIssueEntries(entries = []) {
      const groupsByKey = new Map();

      entries.forEach((entry) => {
        const parsed = parseViolationItem(entry?.message);
        const key = getIssueGroupKey(entry, parsed);
        if (!groupsByKey.has(key)) {
          groupsByKey.set(key, {
            key,
            tone: entry?.tone || parsed.tone || 'danger',
            chip: parsed.chip,
            tag: entry?.metadata?.assessment?.reason === 'fluid-layout' ? '유동 레이아웃 확인'
              : entry?.metadata?.assessment?.reason === 'declaration-unavailable' ? 'CSS 선언 확인 필요'
              : ({ mismatch: 'FDS 불일치 후보', recommendation: '토큰 전환 권장', review: '출처 확인 필요' })[entry?.metadata?.assessment?.status] || parsed.tag,
            value: parsed.value,
            entries: [],
          });
        }
        groupsByKey.get(key).entries.push(entry);
      });

      const expandedIssueGroupKeys = getExpandedIssueGroupKeys();
      return [...groupsByKey.values()]
        .map((group) => ({
          ...group,
          count: group.entries.length,
          detailEntries: aggregateIssueDetailEntries(group.entries),
          expanded: expandedIssueGroupKeys.has(group.key),
        }))
        .sort((a, b) => b.count - a.count || String(a.value).localeCompare(String(b.value)));
    }

    function getColorTonePatternCountsForActiveSubtab() {
      return getTonePatternCountsForGroups(groupIssueEntries(getColorEntriesForActiveSubtab()));
    }

    function getColorSummaryTabs() {
      const issueEntries = getScanData()?.issueEntries || [];
      const counts = {
        bg: issueEntries.filter((item) => item.category === 'color' && item.colorPart === 'bg').length,
        border: issueEntries.filter((item) => item.category === 'color' && item.colorPart === 'border').length,
        text: issueEntries.filter((item) => item.category === 'color' && item.colorPart === 'text').length,
      };

      const tabs = [
        { key: 'bg', label: 'BG', count: counts.bg },
        { key: 'border', label: 'Border', count: counts.border },
        { key: 'text', label: 'Text', count: counts.text },
      ];

      const activeSummarySubtab = getActiveSummarySubtab();
      const currentTabExists = tabs.some((tab) => tab.key === activeSummarySubtab);
      const preferredTab = tabs.find((tab) => tab.count > 0)?.key || 'bg';

      if (!currentTabExists || !tabs.find((tab) => tab.key === activeSummarySubtab)?.count) {
        setActiveSummarySubtab(preferredTab);
      }

      normalizeActiveSummaryToneForCounts(getColorToneCountsForActiveSubtab());

      return tabs;
    }

    function getSummaryListRenderKey(visibleItems) {
      const activeFilter = getActiveFilter();
      return [
        activeFilter || 'idle',
        activeFilter === 'color' ? getActiveSummarySubtab() : 'all',
        activeFilter ? getActiveSummaryTone() : 'all',
        visibleItems.map((item) => item.key).join('|'),
        [...getExpandedIssueGroupKeys()].sort().join('|'),
      ].join('::');
    }

    return {
      normalizeActiveSummaryToneForCounts,
      getVisibleIssueEntries,
      getColorEntriesForActiveSubtab,
      getColorToneCountsForActiveSubtab,
      getToneCountsForEntries,
      getTonePatternCountsForGroups,
      getExcludedEntries,
      getColorTonePatternCountsForActiveSubtab,
      getColorSummaryTabs,
      getSummaryListRenderKey,
      getIssueGroupKey,
      aggregateIssueDetailEntries,
      groupIssueEntries,
    };
  }

  const api = { createContentSummaryModel };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  globalScope.FDSContentSummaryModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
