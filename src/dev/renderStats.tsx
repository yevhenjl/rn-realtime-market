import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from 'react';

const counts = new Map<string, number>();
let commits = 0;
const onRender: ProfilerOnRenderCallback = (id, phase) => {
  if (phase !== 'mount') counts.set(id, (counts.get(id) ?? 0) + 1);
};
export function Counted({ id, children }: { id: string; children: ReactNode }) {
  return <Profiler id={id} onRender={onRender}>{children}</Profiler>;
}
export const countCommit: ProfilerOnRenderCallback = () => {
  commits += 1;
};
// reset -> wait N seconds -> row renders and list commits per second
export function measureRenders(seconds = 10) {
  counts.clear();
  commits = 0;
  return new Promise<{ rowRendersPerSec: number; commitsPerSec: number }>((resolve) => {
    setTimeout(() => {
      const total = [...counts.values()].reduce((a, b) => a + b, 0);
      resolve({ rowRendersPerSec: total / seconds, commitsPerSec: commits / seconds });
    }, seconds * 1_000);
  });
}
