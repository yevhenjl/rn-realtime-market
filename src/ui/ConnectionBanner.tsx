import { Text, View } from 'react-native';

import { getBannerState, type BannerInput } from './getBannerState';
import { useNow } from './useNow';

export function ConnectionBanner({ connection }: { connection: BannerInput }) {
  // Time matters only for stale detection: an open socket that has delivered a message.
  const tracksStaleness = connection.status === 'open' && connection.lastMessageAt !== null;
  const now = useNow(1000, tracksStaleness);
  const banner = getBannerState(connection, now);
  if (!banner) return null;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      testID="connection-banner"
      className="absolute inset-x-0 bottom-0 border-t border-border bg-surface px-4 pt-3 pb-safe-offset-3">
      <Text className="text-center text-fg">{banner.text}</Text>
    </View>
  );
}
