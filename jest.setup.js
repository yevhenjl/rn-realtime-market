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
