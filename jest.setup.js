/* global jest */
jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock.js'),
);

// Metro compiles Uniwind. Unit tests exercise behavior, not CSS output.
jest.mock('uniwind', () => ({
  useCSSVariable: (name) => Array.isArray(name) ? name.map(() => '#808080') : '#808080',
  useResolveClassNames: () => ({}),
  useUniwind: () => ({ theme: 'dark', hasAdaptiveThemes: false }),
  withUniwind: (Component) => Component,
  Uniwind: { setTheme: jest.fn(), getCSSVariable: () => '#808080' },
}));

// FlashList measures through native layout, which Jest lacks. Fixed sizes: a 400x2400 viewport with
// 56 px rows (the real row is h-14) renders the whole 20-symbol watchlist at once.
jest.mock('@shopify/flash-list/dist/recyclerview/utils/measureLayout', () => ({
  ...jest.requireActual('@shopify/flash-list/dist/recyclerview/utils/measureLayout'),
  measureParentSize: () => ({ x: 0, y: 0, width: 400, height: 2400 }),
  measureFirstChildLayout: () => ({ x: 0, y: 0, width: 400, height: 2400 }),
  measureItemLayout: () => ({ x: 0, y: 0, width: 400, height: 56 }),
}));
