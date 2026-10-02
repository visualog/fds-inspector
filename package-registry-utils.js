(function initPackageRegistryUtils(root) {
  function createPackageInspectionRegistry(packages, storybook = {}) {
    return {
      ...storybook,
      variables: { ...(storybook?.variables || {}), ...(packages?.tokens?.variables || {}) },
      utilities: { ...(storybook?.utilities || {}), ...(packages?.tokens?.tailwind?.utilities || {}) },
      docs: storybook?.docs || {},
      packageSource: packages?.source || null,
    };
  }
  function getPackageBaselineSummary(registry) {
    if (!registry?.packages) return '패키지 기준 없음';
    return ['fe-ui', 'fe-tokens', 'fe-icons']
      .map(name => `${name} ${registry.packages[`@mis/${name}`]?.version || '미확인'}`)
      .join(' · ') + ' · 실행 앱 버전 미확인';
  }
  function getComponentValueReferences(registry, category, message) {
    const value = String(message).match(/\s(\d+(?:\.\d+)?)px\s/);
    if (!value || !['spacing', 'radius'].includes(category)) return [];
    const references = [];
    const family = category === 'radius' ? 'rounded' : /갭/.test(message) ? 'gap' : /패딩/.test(message) ? 'p' : /마진/.test(message) ? 'm' : '';
    const collectStrings = value => typeof value === 'string' ? [value]
      : value && typeof value === 'object' ? Object.values(value).flatMap(collectStrings) : [];
    for (const [component, contract] of Object.entries(registry?.components || {})) {
      const classes = new Set(collectStrings([contract.baseClasses, contract.variants, contract.compoundVariants])
        .flatMap(text => text.split(/\s+/)));
      for (const className of classes) {
        const match = className.match(/^(gap(?:-[xy])?|p[xytrbl]?|m[xytrbl]?|rounded)-\[(\d+(?:\.\d+)?)px\]$/);
        if (!match || Number(match[2]) !== Number(value[1]) || (category === 'radius') !== (match[1] === 'rounded')) continue;
        if (!family || !match[1].startsWith(family)) continue;
        references.push({ component, packageVersion: registry.packages['@mis/fe-ui'].version, className, evidence: 'definition-only' });
      }
    }
    return references;
  }
  const api = { createPackageInspectionRegistry, getPackageBaselineSummary, getComponentValueReferences };
  root.FDSPackageRegistryUtils = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
