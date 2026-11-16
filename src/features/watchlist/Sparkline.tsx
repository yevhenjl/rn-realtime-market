import { useMemo } from 'react';
import { useDerivedValue, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { Path, Skia } from 'react-native-skia';

import { minMax, priceToY } from '@/chart/scale';
import { StyledCanvas } from '@/ui/styled';

type Props = { values: SharedValue<number[]>; up: string; down: string; className?: string };

// Size comes from className via onLayout; the path is built on the UI thread, so a new point
// does not re-render the row.
export function Sparkline({ values, up, down, className }: Props) {
  const size = useSharedValue({ width: 0, height: 0 });
  // Not usePathValue: it re-dirties itself and rebuilds every frame; inline reads are tracked inputs.
  const builder = useSharedValue(useMemo(() => Skia.PathBuilder.Make(), []));
  const path = useDerivedValue(() => {
    const b = builder.get();
    b.reset();
    const { width, height } = size.get();
    const v = values.get();
    if (v.length < 2 || width === 0) return b.build();
    const range = minMax(v);
    const step = width / (v.length - 1);
    for (let i = 0; i < v.length; i++) {
      const x = i * step;
      const y = priceToY(v[i]!, range, 2, height - 2);
      if (i === 0) b.moveTo(x, y);
      else b.lineTo(x, y);
    }
    return b.build();
  });
  const color = useDerivedValue(() => {
    const v = values.get();
    return v.length > 1 && v[v.length - 1]! < v[0]! ? down : up;
  });
  return (
    <StyledCanvas
      className={className}
      pointerEvents="none"
      onLayout={(e) =>
        size.set({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
      }
    >
      <Path path={path} style="stroke" strokeWidth={1.5} strokeJoin="round" color={color} />
    </StyledCanvas>
  );
}
