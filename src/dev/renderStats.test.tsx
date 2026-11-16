import { act, render } from '@testing-library/react-native';
import { Profiler } from 'react';
import { Text } from 'react-native';

import { Counted, countCommit, measureRenders } from './renderStats';

describe('renderStats', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not count the mount, counts a re-render of a Counted child', async () => {
    const pending = measureRenders(1);
    const view = await render(
      <Counted id="row">
        <Text>a</Text>
      </Counted>,
    );
    await act(async () => {
      jest.advanceTimersByTime(1_000);
    });
    await expect(pending).resolves.toEqual({ rowRendersPerSec: 0, commitsPerSec: 0 });

    const pending2 = measureRenders(1);
    await view.rerender(
      <Counted id="row">
        <Text>b</Text>
      </Counted>,
    );
    await act(async () => {
      jest.advanceTimersByTime(1_000);
    });
    await expect(pending2).resolves.toMatchObject({ rowRendersPerSec: 1 });
  });

  it('measureRenders(2) resolves with per-second numbers incl. list commits', async () => {
    const tree = (label: string) => (
      <Profiler id="list" onRender={countCommit}>
        <Counted id="a">
          <Text>{label}</Text>
        </Counted>
        <Counted id="b">
          <Text>{label}</Text>
        </Counted>
      </Profiler>
    );
    const view = await render(tree('0'));
    const pending = measureRenders(2);
    await view.rerender(tree('1'));
    await view.rerender(tree('2'));
    await act(async () => {
      jest.advanceTimersByTime(2_000);
    });
    // 2 updates x 2 rows over 2 s; 2 list commits over 2 s
    await expect(pending).resolves.toEqual({ rowRendersPerSec: 2, commitsPerSec: 1 });
  });
});
