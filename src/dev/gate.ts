// One gate for every dev tool shown or reachable outside development (overlay, chart bench): development, or
// a release build with EXPO_PUBLIC_DEV_OVERLAY=1 (eas.json `preview`). EXPO_PUBLIC_ variables are inlined at
// build time; production does not set it, so there the tools are unreachable.
// A function, not a module constant, so tests can flip the flags; both reads are cheap and constant at runtime.
export const isDevToolsEnabled = () => __DEV__ || process.env.EXPO_PUBLIC_DEV_OVERLAY === '1';
