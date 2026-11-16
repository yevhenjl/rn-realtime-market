// Registers the Gesture Handler native-module mocks; must run before anything imports the library.
import 'react-native-gesture-handler/jestSetup';

import { render } from '@testing-library/react-native';
import { View } from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { createGestureController, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { makeMutable, type SharedValue } from 'react-native-reanimated';

import { AXIS_W } from '@/chart/layout';
import { MAX_CANDLE_W, MIN_CANDLE_W, maxOffset, zoomAt } from '@/chart/viewport';

import { useChartGestures } from './useChartGestures';

// Jest resolves react-native-worklets to its web build, whose getUIRuntimeHolder throws; the mocked
// native module has no UI runtime to bind anyway.
jest.mock('react-native-gesture-handler/lib/module/handlers/gestures/installUIRuntimeBindings', () => ({
  installUIRuntimeBindings: () => {},
}));

const WIDTH = 400;
const AREA = WIDTH - AXIS_W;

type Shared = {
  candleW: SharedValue<number>;
  offset: SharedValue<number>;
  crossX: SharedValue<number>;
  crossY: SharedValue<number>;
  count: SharedValue<number>;
  width: SharedValue<number>;
};

const setup = (init: { candleW?: number; offset?: number; count?: number } = {}) => {
  const sv: Shared = {
    candleW: makeMutable(init.candleW ?? 8),
    offset: makeMutable(init.offset ?? 0),
    crossX: makeMutable(-1),
    crossY: makeMutable(0),
    count: makeMutable(init.count ?? 500),
    width: makeMutable(WIDTH),
  };
  const renders = jest.fn();
  const Chart = () => {
    renders();
    const gesture = useChartGestures(sv);
    return (
      <GestureDetector gesture={gesture}>
        <View />
      </GestureDetector>
    );
  };
  return { sv, renders, Chart };
};

const mount = async (init?: Parameters<typeof setup>[0]) => {
  const s = setup(init);
  await render(
    <GestureHandlerRootView>
      <s.Chart />
    </GestureHandlerRootView>,
  );
  const scroll = createGestureController(getByGestureTestId('chart-scroll'));
  const pinch = createGestureController(getByGestureTestId('chart-pinch'));
  const crosshair = createGestureController(getByGestureTestId('chart-crosshair'));
  return { ...s, scroll, pinch, crosshair };
};

describe('useChartGestures', () => {
  it('pan: finger right scrolls into history by changeX, clamped to [0, maxOffset]', async () => {
    const { sv, scroll, renders } = await mount();
    const max = maxOffset(500, 8, AREA);
    // The hook derives changeX from the change of translationX between events.
    scroll.begin();
    scroll.activate({ translationX: 0 });
    scroll.update({ translationX: 30 });
    expect(sv.offset.get()).toBe(30);
    scroll.update({ translationX: -20 }); // changeX -50: past the live edge
    expect(sv.offset.get()).toBe(0);
    scroll.update({ translationX: max + 980 }); // changeX max + 1000: past the first candle
    expect(sv.offset.get()).toBe(max);
    expect(renders).toHaveBeenCalledTimes(1); // gestures never re-render React
  });

  it('pan: release flings in the finger direction, clamped, and a new touch stops it', async () => {
    jest.useFakeTimers();
    try {
      const { sv, scroll } = await mount({ offset: 50 });
      const max = maxOffset(500, 8, AREA);
      scroll.begin();
      scroll.activate({ translationX: 0 });
      scroll.end({ velocityX: 3000 });
      await jest.advanceTimersByTimeAsync(300);
      const mid = sv.offset.get();
      expect(mid).toBeGreaterThan(50); // finger moved right: older candles keep coming in
      scroll.begin(); // a touch cancels the animation
      await jest.advanceTimersByTimeAsync(1000);
      expect(sv.offset.get()).toBe(mid);
      scroll.activate({ translationX: 0 });
      scroll.end({ velocityX: 1e6 });
      await jest.advanceTimersByTimeAsync(5000);
      expect(sv.offset.get()).toBe(max);
      scroll.begin();
      scroll.activate({ translationX: 0 });
      scroll.end({ velocityX: -1e6 });
      await jest.advanceTimersByTimeAsync(5000);
      expect(sv.offset.get()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('pan: ignores updates while a pinch is active', async () => {
    const { sv, scroll, pinch } = await mount({ offset: 100 });
    pinch.begin();
    pinch.activate({ focalX: 100 });
    scroll.begin();
    scroll.activate({ translationX: 0 });
    scroll.update({ translationX: 40 });
    expect(sv.offset.get()).toBe(100);
    pinch.end();
    scroll.update({ translationX: 80 });
    expect(sv.offset.get()).toBe(140);
  });

  it('pinch: the candle under the focal point stays, width clamped to 3..32', async () => {
    const { sv, pinch } = await mount({ candleW: 8, offset: 200 });
    const focalX = 150;
    const idxAt = (w: number, off: number) => (AREA + off - focalX) / w;
    const before = idxAt(8, 200);
    pinch.begin();
    pinch.activate({ focalX });
    pinch.update({ scale: 2, focalX });
    expect(sv.candleW.get()).toBe(16);
    expect(idxAt(sv.candleW.get(), sv.offset.get())).toBeCloseTo(before, 6);
    pinch.update({ scale: 10, focalX });
    expect(sv.candleW.get()).toBe(MAX_CANDLE_W);
    pinch.update({ scale: 0.01, focalX });
    expect(sv.candleW.get()).toBe(MIN_CANDLE_W);
    pinch.end();
  });

  it('pinch: the second pinch starts from the current width, no jump', async () => {
    const { sv, pinch } = await mount({ candleW: 8, offset: 200 });
    pinch.begin();
    pinch.activate({ focalX: 150 });
    pinch.update({ scale: 2, focalX: 150 });
    pinch.end();
    const wAfter = sv.candleW.get();
    const offAfter = sv.offset.get();
    pinch.begin();
    pinch.activate({ focalX: 150 });
    expect(sv.candleW.get()).toBe(wAfter); // activation alone changes nothing
    expect(sv.offset.get()).toBe(offAfter);
    pinch.update({ scale: 1, focalX: 150 });
    expect(sv.candleW.get()).toBe(wAfter);
    expect(sv.offset.get()).toBeCloseTo(offAfter, 6);
    pinch.update({ scale: 0.5, focalX: 150 });
    expect(sv.candleW.get()).toBeCloseTo(wAfter / 2, 6);
    const expected = zoomAt({ candleW: wAfter, offset: offAfter }, 0.5, 150, AREA, 500);
    expect(sv.offset.get()).toBeCloseTo(expected.offset, 6);
    pinch.end();
  });

  it('crosshair: long press sets crossX/crossY, release resets crossX to -1', async () => {
    const { sv, crosshair } = await mount();
    crosshair.begin();
    crosshair.activate({ x: 120, y: 80 });
    expect(sv.crossX.get()).toBe(120);
    expect(sv.crossY.get()).toBe(80);
    crosshair.update({ x: 130, y: 90 });
    expect(sv.crossX.get()).toBe(130);
    expect(sv.crossY.get()).toBe(90);
    crosshair.end();
    expect(sv.crossX.get()).toBe(-1);
  });
});
