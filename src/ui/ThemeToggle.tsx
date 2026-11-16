import { Pressable, Text } from 'react-native';
import { Uniwind, useUniwind } from 'uniwind';

// Re-renders only when the theme changes (useUniwind), never on market ticks.
export function ThemeToggle() {
  const { theme } = useUniwind();
  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Switch to ${next} theme`}
      testID="theme-toggle"
      hitSlop={8}
      onPress={() => Uniwind.setTheme(next)}
      className="rounded-full border border-border bg-surface px-3 py-1 active:opacity-70">
      <Text className="text-sm font-medium text-fg">{next === 'light' ? 'Light' : 'Dark'}</Text>
    </Pressable>
  );
}
