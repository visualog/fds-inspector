(function initContentScanRunner(globalScope) {
  function createEmptyCounts(filters) {
    return filters.reduce((acc, filterKey) => {
      acc[filterKey] = 0;
      return acc;
    }, {});
  }

  function createContentScanRunner({
    batchSize = 80,
    batchBudgetMs = 12,
    maxElements = Number.POSITIVE_INFINITY,
    now = () => performance.now(),
    getElements,
    isElementVisible,
    getStyles,
    inspectElement,
    addIssueEntry,
    addExcludedEntry,
    markElement,
    yieldToBrowser,
  }) {
    async function run({ filters, activeFilter, collectAllEntries = false }) {
      const scanData = {
        violations: [],
        issueEntries: [],
        suggestions: [],
        excludedEntries: [],
        counts: createEmptyCounts(filters),
        affectedElementCounts: createEmptyCounts(filters),
        colorBreakdown: {
          missing: 0,
          primitiveRaw: 0,
        },
        meta: {
          totalElementCount: 0,
          scannedElementCount: 0,
          skippedElementCount: 0,
          excludedElementCount: 0,
          batchYieldCount: 0,
          truncated: false,
        },
      };
      const elements = Array.from(getElements());
      scanData.meta.totalElementCount = elements.length;
      let batchStartedAt = now();

      for (let index = 0; index < elements.length; index += 1) {
        if (scanData.meta.scannedElementCount >= maxElements) {
          scanData.meta.truncated = true;
          break;
        }

        const element = elements[index];
        if (!isElementVisible(element)) {
          scanData.meta.skippedElementCount += 1;
          const excludedEntry = typeof addExcludedEntry === 'function'
            ? addExcludedEntry(element)
            : null;
          if (excludedEntry) {
            scanData.excludedEntries.push(excludedEntry);
            scanData.meta.excludedElementCount += 1;
          }
          continue;
        }

        scanData.meta.scannedElementCount += 1;
        const styles = getStyles(element);
        const activeIssues = [];
        const activeSuggestions = [];

        filters.forEach((filterKey) => {
          const inspection = inspectElement({ filterKey, styles, element });
          const issues = Array.isArray(inspection?.issues) ? inspection.issues : [];
          const issueDetails = Array.isArray(inspection?.issueDetails) ? inspection.issueDetails : [];
          const suggestions = Array.isArray(inspection?.suggestions) ? inspection.suggestions : [];
          if (issues.length) scanData.affectedElementCounts[filterKey] += 1;

          if (!collectAllEntries && filterKey !== activeFilter) {
            scanData.counts[filterKey] += issues.length;
            return;
          }

          issues.forEach((issue, issueIndex) => {
            const entry = addIssueEntry({
              category: filterKey,
              message: issue,
              element,
              metadata: issueDetails[issueIndex] || null,
            });
            if (entry) {
              if (entry.key && scanData.issueEntries.some((candidate) => candidate.key === entry.key)) {
                return;
              }
              const nextEntry = {
                ...entry,
                id: scanData.issueEntries.length + 1,
              };
              scanData.issueEntries.push(nextEntry);
              scanData.violations.push(nextEntry.message);
              scanData.counts[filterKey] += 1;
              activeIssues.push(issue);
              if (nextEntry.category === 'color' && nextEntry.tone === 'danger') {
                scanData.colorBreakdown.missing += 1;
              }
              if (nextEntry.category === 'color' && nextEntry.tone === 'warning') {
                scanData.colorBreakdown.primitiveRaw += 1;
              }
            }
          });

          suggestions.forEach((suggestion) => {
            scanData.suggestions.push(suggestion);
            activeSuggestions.push(suggestion);
          });
        });

        markElement({ element, issues: activeIssues, suggestions: activeSuggestions, entries: scanData.issueEntries });

        if ((index + 1) % batchSize === 0 || now() - batchStartedAt >= batchBudgetMs) {
          scanData.meta.batchYieldCount += 1;
          await yieldToBrowser();
          batchStartedAt = now();
        }
      }

      return scanData;
    }

    return { run };
  }

  const api = { createContentScanRunner };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  globalScope.FDSContentScanRunner = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
