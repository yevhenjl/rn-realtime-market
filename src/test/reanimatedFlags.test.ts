// "Rows do not re-render on ticks" on a device depends on a native build setting Jest cannot observe: with Reanimated's static flag
// FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS on (the 4.x default), a 500 ms poll setStates every animated view
// whose props moved, and each ticking watchlist row re-renders (~13 renders/s on a Galaxy M23).
// The flag is compiled from package.json "reanimated.staticFeatureFlags"; changing it needs a new dev build.
import packageJson from '../../package.json';

test('Reanimated settled-animation sync is off in the native build config (rows must not re-render on ticks)', () => {
  const flags = (packageJson as { reanimated?: { staticFeatureFlags?: Record<string, boolean> } }).reanimated
    ?.staticFeatureFlags;
  expect(flags?.FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS).toBe(false);
});
