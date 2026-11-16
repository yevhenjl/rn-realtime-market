import { decideConnection } from './decideConnection';

test.each([
  ['active', true, 'run'],
  ['inactive', true, 'run'], // шторка, входящий звонок — сокет не трогаем
  ['background', true, 'idle'],
  ['background', false, 'idle'],
  ['active', false, 'offline'],
  ['active', null, 'run'], // NetInfo ещё не ответил
] as const)('%s + isConnected=%s → %s', (appState, isConnected, expected) => {
  expect(decideConnection(appState, isConnected)).toBe(expected);
});

// Additional rows: the rest of the decision table.
test.each([
  ['inactive', false, 'offline'],
  ['background', null, 'idle'],
  [null, true, 'run'], // AppState not known yet: treated as foreground
  [undefined, true, 'run'],
  [null, false, 'offline'],
  [undefined, null, 'run'],
  ['unknown', true, 'run'], // iOS cold-start value
  ['unknown', false, 'offline'],
  ['extension', true, 'run'],
] as const)('extra: %s + isConnected=%s → %s', (appState, isConnected, expected) => {
  expect(decideConnection(appState, isConnected)).toBe(expected);
});
