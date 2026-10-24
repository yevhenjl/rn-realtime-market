import { ScrollView, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <ScrollView className="flex-1 bg-bg" contentInsetAdjustmentBehavior="automatic">
      <View className="gap-8 px-6 py-10">
        <View className="gap-3">
          <Text selectable className="text-sm font-semibold uppercase tracking-widest text-accent">
            Учебный проект
          </Text>
          <Text selectable accessibilityRole="header" className="text-3xl font-semibold text-fg">
            Realtime Market
          </Text>
          <Text selectable className="text-base leading-6 text-muted">
            Watchlist и свечной график на публичных данных Binance.
          </Text>
        </View>

        <View className="gap-3 rounded-2xl border border-border bg-surface p-5">
          <Text selectable className="text-lg font-semibold text-fg">
            Данные рынка ещё не подключены
          </Text>
          <Text selectable className="text-base leading-6 text-muted">
            Здесь появятся живые котировки и графики. Пока приложение работает как стартовый каркас.
          </Text>
        </View>

        <View className="gap-2">
          <Text selectable className="text-base font-semibold text-accent">
            Следующий шаг — system design
          </Text>
          <Text selectable className="text-base leading-6 text-muted">
            Определи требования, потоки данных и поведение при сбоях до реализации WebSocket-клиента.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
