import { fireEvent, render, screen } from '@testing-library/react-native';

import { ThemeToggle } from './ThemeToggle';

// jest.setup.js replaces uniwind with a mock; override useUniwind per test.
const uniwind = jest.requireMock('uniwind') as {
  Uniwind: { setTheme: jest.Mock };
  useUniwind: jest.Mock;
};

const originalUseUniwind = uniwind.useUniwind;

function mockTheme(theme: 'dark' | 'light') {
  uniwind.useUniwind = jest.fn(() => ({ theme, hasAdaptiveThemes: false }));
}

beforeEach(() => {
  uniwind.Uniwind.setTheme.mockClear();
});

afterEach(() => {
  uniwind.useUniwind = originalUseUniwind;
});

describe('ThemeToggle', () => {
  it('offers to switch to light while the theme is dark', async () => {
    mockTheme('dark');
    await render(<ThemeToggle />);

    const button = screen.getByTestId('theme-toggle');
    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityLabel).toBe('Switch to light theme');
  });

  it('offers to switch to dark while the theme is light', async () => {
    mockTheme('light');
    await render(<ThemeToggle />);

    expect(screen.getByTestId('theme-toggle').props.accessibilityLabel).toBe('Switch to dark theme');
  });

  it('switches dark to light on press', async () => {
    mockTheme('dark');
    await render(<ThemeToggle />);

    await fireEvent.press(screen.getByTestId('theme-toggle'));

    expect(uniwind.Uniwind.setTheme).toHaveBeenCalledTimes(1);
    expect(uniwind.Uniwind.setTheme).toHaveBeenCalledWith('light');
  });

  it('switches light to dark on press', async () => {
    mockTheme('light');
    await render(<ThemeToggle />);

    await fireEvent.press(screen.getByTestId('theme-toggle'));

    expect(uniwind.Uniwind.setTheme).toHaveBeenCalledWith('dark');
  });
});
