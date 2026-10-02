const test = require('node:test');
test('summary displays installed extension version and FDS registry capture time', () => {
  const source = require('node:fs').readFileSync(require('node:path').join(__dirname, 'content.js'), 'utf8');
  require('node:assert/strict').match(source, /getManifest\?\.\(\)/);
  require('node:assert/strict').match(source, /fds-summary-provenance/);
  require('node:assert/strict').match(source, /FDS 기준.*capturedAt/);
});
const assert = require('node:assert/strict');

const { createContentSummaryPanel } = require('./content-summary-panel.js');

function createElement({
  id = '',
  height = 0,
  scrollHeight = 0,
  offsetHeight = 0,
  children = [],
  classNames = [],
} = {}) {
  const childMap = new Map();
  const element = {
    id,
    style: {},
    children,
    scrollHeight,
    offsetHeight,
    getBoundingClientRect() {
      return { height };
    },
    classList: {
      added: [],
      removed: [],
      contains(className) {
        return classNames.includes(className);
      },
      add(className) {
        this.added.push(className);
      },
      remove(className) {
        this.removed.push(className);
      },
    },
    querySelector(selector) {
      return childMap.get(selector) || null;
    },
  };

  children.forEach((child) => {
    if (child.id) {
      childMap.set(`#${child.id}`, child);
    }
    classNamesFor(child).forEach((className) => {
      childMap.set(`.${className}`, child);
    });
  });

  return element;
}

function classNamesFor(element) {
  const knownClassNames = [
    'fds-panel-head',
    'fds-summary-section',
    'fds-summary-list',
    'fds-summary-card-row',
  ];
  return knownClassNames.filter((className) => element.classList?.contains?.(className));
}

test('summary panel UI shows, hides, and reads visibility from the panel element', () => {
  const panel = createElement({ id: 'fds-summary-panel' });
  const summaryPanel = createContentSummaryPanel({
    documentRef: {
      getElementById: () => panel,
    },
  });

  assert.equal(summaryPanel.isSummaryPanelElementVisible(), false);
  assert.equal(summaryPanel.setSummaryPanelVisible(), true);
  assert.equal(panel.style.display, 'block');
  assert.equal(panel.style.visibility, 'visible');
  assert.equal(summaryPanel.isSummaryPanelElementVisible(), true);

  assert.equal(summaryPanel.hideSummaryPanelElement(), true);
  assert.equal(panel.style.display, 'none');
  assert.equal(summaryPanel.isSummaryPanelElementVisible(), false);
});

test('summary panel UI measures natural height from scroll, rect, and offset fallbacks', () => {
  const summaryPanel = createContentSummaryPanel();

  assert.equal(summaryPanel.measureNaturalSummaryPanelHeight(createElement({ scrollHeight: 123.2 })), 124);
  assert.equal(summaryPanel.measureNaturalSummaryPanelHeight(createElement({ height: 64.4 })), 65);
  assert.equal(summaryPanel.measureNaturalSummaryPanelHeight(createElement({ offsetHeight: 42.1 })), 43);
  assert.equal(summaryPanel.measureNaturalSummaryPanelHeight(null), 0);
});

test('summary panel UI applies and clears drag active state', () => {
  const panel = createElement({ id: 'fds-summary-panel' });
  const body = createElement({ id: 'body' });
  const capturedPointers = [];
  panel.setPointerCapture = (pointerId) => {
    capturedPointers.push(pointerId);
  };

  const summaryPanel = createContentSummaryPanel();

  assert.equal(summaryPanel.applySummaryPanelDragActiveState({
    panel,
    body,
    rect: { left: 24, top: 40 },
    pointerId: 7,
  }), true);

  assert.equal(panel.style.left, '24px');
  assert.equal(panel.style.top, '40px');
  assert.equal(panel.style.bottom, 'auto');
  assert.deepEqual(panel.classList.added, ['is-dragging']);
  assert.deepEqual(body.classList.added, ['fds-panel-dragging']);
  assert.deepEqual(capturedPointers, [7]);

  summaryPanel.clearSummaryPanelDragActiveState({ panel, body });

  assert.deepEqual(panel.classList.removed, ['is-dragging']);
  assert.deepEqual(body.classList.removed, ['fds-panel-dragging']);
});

test('summary panel UI tolerates pointer capture failures during drag activation', () => {
  const panel = createElement({ id: 'fds-summary-panel' });
  panel.setPointerCapture = () => {
    throw new Error('capture unavailable');
  };

  const summaryPanel = createContentSummaryPanel();

  assert.doesNotThrow(() => summaryPanel.applySummaryPanelDragActiveState({
    panel,
    rect: { left: 8, top: 16 },
    pointerId: 3,
  }));
  assert.equal(panel.style.left, '8px');
  assert.equal(panel.style.top, '16px');
});

test('summary panel UI applies regular and custom panel positions', () => {
  const panel = createElement({ id: 'fds-summary-panel' });
  const summaryPanel = createContentSummaryPanel();

  assert.equal(summaryPanel.applySummaryPanelPosition(panel, { left: 48, top: 64 }), true);
  assert.equal(panel.style.left, '48px');
  assert.equal(panel.style.top, '64px');

  assert.equal(summaryPanel.applyCustomSummaryPanelPosition({
    panel,
    position: { left: 72, top: 96 },
  }), true);
  assert.equal(panel.style.left, '72px');
  assert.equal(panel.style.top, '96px');
  assert.equal(panel.style.bottom, 'auto');
  assert.equal(panel.style.right, '');
});

test('summary panel UI measures target panel height with list height override', () => {
  const panelHead = createElement({
    id: 'head',
    height: 24,
    classNames: ['fds-panel-head'],
  });
  const tabBar = createElement({ height: 20 });
  const cardRow = createElement({
    height: 36,
    classNames: ['fds-summary-card-row'],
  });
  const summaryList = createElement({
    height: 200,
    classNames: ['fds-summary-list'],
  });
  const section = createElement({
    id: 'section',
    children: [tabBar, cardRow, summaryList],
    classNames: ['fds-summary-section'],
  });
  const panel = createElement({
    children: [panelHead, section],
  });

  const summaryPanel = createContentSummaryPanel({
    getComputedStyleRef: (element) => {
      if (element === panel) {
        return { paddingTop: '10px', paddingBottom: '14px' };
      }
      if (element === section) {
        return { marginTop: '12px', rowGap: '6px' };
      }
      return {};
    },
  });

  assert.equal(summaryPanel.measureSummaryPanelTargetHeight(panel, { listHeight: 80 }), 208);
});
