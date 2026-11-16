const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Pure modules must not depend on React Native / Skia / Uniwind / Expo.
// Flat config replaces (not merges) a rule per file, so the two blocks below never overlap.
const rnGroups = ['react-native', 'react-native/*', 'react-native-*', '@shopify/*', 'uniwind', 'uniwind/*', 'expo', 'expo/*', 'expo-*'];

// React Compiler 1.0 turns `metrics.x++` inside a hook into `metrics.x = <module>.x + 1` (NaN); use increment().
// The worklets plugin does not capture identifiers used only in parameter defaults: on the UI thread they
// are undefined ("Property 'X' doesn't exist"). Literals are fine.
const workletDefaults = {
  selector: 'AssignmentPattern[right.type=/^(Identifier|MemberExpression|CallExpression)$/]',
  message: 'Worklet code: resolve defaults in the body (`x ?? CONST`), not in parameters.',
};

const metricsUpdate = [
  {
    selector: "UpdateExpression > MemberExpression.argument[object.name='metrics']",
    message: "Use increment('x') from '@/dev/metrics': React Compiler miscompiles metrics.x++ in hooks.",
  },
  {
    selector: "AssignmentExpression[operator!='='] > MemberExpression.left[object.name='metrics']",
    message: "Use increment('x') from '@/dev/metrics': React Compiler miscompiles metrics.x += n in hooks.",
  },
];

const restrict = (group, message) => ({
  'no-restricted-imports': ['error', { patterns: [{ group, message }] }],
});

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/**', '.expo/**', 'android/**', 'ios/**', 'coverage/**', 'src/uniwind-types.d.ts'] },
  {
    // Tests are not compiled by React Compiler and reset counters directly; metrics.ts owns them.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.test.{ts,tsx}', 'src/dev/metrics.ts', 'src/chart/**'],
    rules: {
      'no-restricted-syntax': ['error', ...metricsUpdate],
      // Skia 3.7.4 usePathValue re-dirties its own mapper: a rebuild every frame forever.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-native-skia',
              importNames: ['usePathValue'],
              message: 'usePathValue rebuilds every frame: useDerivedValue + Skia.PathBuilder, reads inline.',
            },
          ],
        },
      ],
    },
  },
  {
    // Chart math is pure TS: also no React, state or query libraries.
    files: ['src/chart/**/*.{ts,tsx}'],
    rules: {
      ...restrict(
        [...rnGroups, 'react', 'react/*', 'zustand', 'zustand/*', '@tanstack/*'],
        'src/chart is pure worklet math: no React/RN/Skia/Uniwind/Expo/zustand/query imports',
      ),
      'no-restricted-syntax': ['error', workletDefaults],
    },
  },
  {
    // Worklet code outside src/chart. Flat config replaces the rule's options per file, so the
    // metrics guard of the src/** block is repeated here.
    files: ['src/dev/chartBench.ts', 'src/features/symbol/chartPaths.ts', 'src/features/symbol/useChartGestures.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...metricsUpdate, workletDefaults],
    },
  },
  {
    // Pure data/transport modules: no RN/Skia/Uniwind/Expo (zustand allowed in store).
    files: [
      'src/binance/**/*.{ts,tsx}',
      'src/store/**/*.{ts,tsx}',
      'src/realtime/backoff.{ts,test.ts}',
      // New pure realtime modules must be added here; lifecycle.ts/client.ts are intentionally excluded.
      'src/realtime/RealtimeClient.{ts,test.ts}',
      'src/realtime/RealtimeClient.*.test.ts',
      'src/realtime/decideConnection.{ts,test.ts}',
    ],
    rules: restrict(
      rnGroups,
      'pure module (binance/store/realtime core): no React Native/Skia/Uniwind/Expo imports',
    ),
  },
]);
