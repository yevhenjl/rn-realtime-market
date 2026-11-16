import '../global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Uniwind, useResolveClassNames, useUniwind } from 'uniwind';

import { DevOverlay } from '@/dev/DevOverlay';
import { queryClient, setupQueryManagers } from '@/queryClient';
import { realtime, syncClock } from '@/realtime/client';
import { useRealtimeLifecycle } from '@/realtime/lifecycle';
import { LiveConnectionBanner } from '@/ui/LiveConnectionBanner';
import { StyledRootView } from '@/ui/styled';
import { ThemeToggle } from '@/ui/ThemeToggle';
import { useThemeColors } from '@/ui/theme';

// Uniwind starts adaptive (follows the system scheme). Dark is the guaranteed default.
Uniwind.setTheme('dark');

const renderThemeToggle = () => <ThemeToggle />;
// One warm-up + three timed /api/v3/time requests (weight 1 each): see syncClock.
const CLOCK_SAMPLES = 4;

export default function RootLayout() {
  useRealtimeLifecycle(realtime); // AppState + NetInfo drive the single connection
  useEffect(() => setupQueryManagers(), []); // NetInfo/AppState -> TanStack Query online/focus
  // Uniwind Free does not read insets natively: feed them for *-safe classes (edge-to-edge Android nav bar).
  // SafeAreaProvider comes from Expo Router's root.
  const insets = useSafeAreaInsets();
  useEffect(() => {
    Uniwind.updateInsets(insets);
  }, [insets]);
  // Clock offset for the latency metric; errors are swallowed inside, abort on unmount.
  useEffect(() => {
    const controller = new AbortController();
    void syncClock(controller.signal, CLOCK_SAMPLES);
    return () => controller.abort();
  }, []);
  const screenBg = useResolveClassNames('bg-bg');
  const { fg } = useThemeColors();
  const { theme } = useUniwind(); // re-renders on theme change only

  return (
    <StyledRootView className="flex-1 bg-bg">
      <QueryClientProvider client={queryClient}>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: screenBg,
            headerTintColor: fg,
            contentStyle: screenBg,
            headerRight: renderThemeToggle,
          }}>
          <Stack.Screen name="index" options={{ title: 'Realtime Market' }} />
        </Stack>
        <LiveConnectionBanner />
        <DevOverlay />
      </QueryClientProvider>
    </StyledRootView>
  );
}
