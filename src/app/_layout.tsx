import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useResolveClassNames } from 'uniwind';

import { StyledRootView } from '@/ui/styled';
import { useThemeColors } from '@/ui/theme';

export default function RootLayout() {
  const screenBg = useResolveClassNames('bg-bg');
  const { fg } = useThemeColors();

  return (
    <StyledRootView className="flex-1 bg-bg">
      <StatusBar style="light" />
      <Stack screenOptions={{ headerStyle: screenBg, headerTintColor: fg, contentStyle: screenBg }}>
        <Stack.Screen name="index" options={{ title: 'Realtime Market' }} />
      </Stack>
    </StyledRootView>
  );
}
