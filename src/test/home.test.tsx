import { render, screen } from '@testing-library/react-native';

import HomeScreen from '@/app/index';

it('opens the offline starter and points to the next learning stage', async () => {
  await render(<HomeScreen />);

  expect(screen.getByRole('header', { name: 'Realtime Market' })).toBeOnTheScreen();
  expect(screen.getByText('Данные рынка ещё не подключены')).toBeOnTheScreen();
  expect(screen.getByText('Следующий шаг — system design')).toBeOnTheScreen();
});
