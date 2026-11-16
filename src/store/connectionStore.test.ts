import { useConnection } from './connectionStore';

beforeEach(() => {
  useConnection.setState(useConnection.getInitialState(), true);
});

test('initial state: idle, attempt 0, no messages yet', () => {
  expect(useConnection.getInitialState()).toEqual({ status: 'idle', attempt: 0, lastMessageAt: null });
  expect(useConnection.getState()).toEqual({ status: 'idle', attempt: 0, lastMessageAt: null });
});

test('setState merges a snapshot', () => {
  useConnection.setState({ status: 'open', attempt: 0, lastMessageAt: 123 });
  expect(useConnection.getState()).toEqual({ status: 'open', attempt: 0, lastMessageAt: 123 });
});

test('reset to the initial state', () => {
  useConnection.setState({ status: 'reconnecting', attempt: 3, lastMessageAt: 5 });
  useConnection.setState(useConnection.getInitialState(), true);
  expect(useConnection.getState().status).toBe('idle');
});
