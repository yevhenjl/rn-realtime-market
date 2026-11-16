import {
  useCompetingGestures,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
} from 'react-native-gesture-handler';
import {
  cancelAnimation,
  useSharedValue,
  withDecay,
  type SharedValue,
} from 'react-native-reanimated';

import { AXIS_W } from '@/chart/layout';
import { maxOffset, panBy, zoomAt } from '@/chart/viewport';

export type ChartGestureParams = {
  candleW: SharedValue<number>;
  offset: SharedValue<number>;
  /** -1: no crosshair. */
  crossX: SharedValue<number>;
  crossY: SharedValue<number>;
  count: SharedValue<number>;
  /** Canvas width including the price axis. */
  width: SharedValue<number>;
};

/**
 * Chart gestures: pan with inertia, pinch around the fingers, long-press crosshair.
 * Every callback is a worklet on the UI thread: no React re-render while a gesture runs.
 * `offset` is the distance in px scrolled from the live edge into history (positive = back in time),
 * so a finger moving right (positive changeX / velocityX) pulls older candles into view.
 */
export function useChartGestures({
  candleW,
  offset,
  crossX,
  crossY,
  count,
  width,
}: ChartGestureParams) {
  const pinching = useSharedValue(false);
  const startW = useSharedValue(0);
  const startOffset = useSharedValue(0);
  const focalX = useSharedValue(0);

  const scroll = usePanGesture({
    testID: 'chart-scroll',
    activeOffsetX: [-8, 8],
    onBegin: () => {
      'worklet';
      cancelAnimation(offset); // a touch stops the inertia
    },
    onUpdate: (e) => {
      'worklet';
      if (pinching.get()) return; // during a pinch zoomAt owns the offset
      offset.set(panBy(offset.get(), e.changeX, count.get(), candleW.get(), width.get() - AXIS_W));
    },
    onDeactivate: (e) => {
      'worklet';
      if (pinching.get()) return;
      offset.set(
        withDecay({
          velocity: e.velocityX,
          clamp: [0, maxOffset(count.get(), candleW.get(), width.get() - AXIS_W)],
        }),
      );
    },
  });

  const pinch = usePinchGesture({
    testID: 'chart-pinch',
    onActivate: (e) => {
      'worklet';
      cancelAnimation(offset);
      pinching.set(true);
      // e.scale counts from the start of the gesture: remember the state it is relative to.
      startW.set(candleW.get());
      startOffset.set(offset.get());
      focalX.set(e.focalX);
    },
    onUpdate: (e) => {
      'worklet';
      const vp = zoomAt(
        { candleW: startW.get(), offset: startOffset.get() },
        e.scale,
        focalX.get(),
        width.get() - AXIS_W,
        count.get(),
      );
      candleW.set(vp.candleW);
      offset.set(vp.offset);
    },
    onFinalize: () => {
      'worklet';
      pinching.set(false);
    },
  });

  // Holding 250 ms starts the crosshair; a quick move is left to the scroll.
  const crosshair = usePanGesture({
    testID: 'chart-crosshair',
    activateAfterLongPress: 250,
    maxPointers: 1, // two resting fingers are a pinch, not a crosshair
    onActivate: (e) => {
      'worklet';
      crossX.set(e.x);
      crossY.set(e.y);
    },
    onUpdate: (e) => {
      'worklet';
      crossX.set(e.x);
      crossY.set(e.y);
    },
    onFinalize: () => {
      'worklet';
      crossX.set(-1);
    },
  });

  const navigate = useSimultaneousGestures(scroll, pinch);
  return useCompetingGestures(crosshair, navigate);
}
