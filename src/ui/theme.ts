import { useCSSVariable } from 'uniwind';

const TOKENS = [
  '--color-bg', '--color-fg', '--color-muted', '--color-border',
  '--color-up', '--color-down', '--color-accent',
];

export type ThemeColors = {
  bg: string; fg: string; muted: string; border: string;
  up: string; down: string; accent: string;
};

export function useThemeColors(): ThemeColors {
  const [bg, fg, muted, border, up, down, accent] =
    useCSSVariable(TOKENS).map((value) => String(value ?? '#808080'));
  return { bg: bg!, fg: fg!, muted: muted!, border: border!, up: up!, down: down!, accent: accent! };
}
