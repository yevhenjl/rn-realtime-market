# rn-realtime-market

[EN](README.en.md) · **RU**

Учебный проект по [тренингу 6](../training/06-websocket-demo-binance/06-websocket-demo-binance.md): Expo, публичные рыночные данные Binance и графики Skia. Сейчас подготовлен каркас этапа 0; котировки и графики ещё не реализованы.

## Стек

Expo SDK 58, React Native 0.88, React 19.3, TypeScript 6; development build и CNG. Стили — Uniwind 1.13 + Tailwind CSS 4, графика — react-native-skia 2.15.1, Reanimated 4.7 и Gesture Handler 3.3. Также установлены Zustand, TanStack Query, Zod, FlashList и NetInfo. Точные версии — package.json и package-lock.json.

## Установка и проверки

Нужен Node 24; версия указана в .nvmrc.

```sh
nvm use
npm ci
npm run check
npx expo install --check
npm run doctor
```

`npm run check` генерирует типы Uniwind, проверяет TypeScript и ESLint, запускает Jest. Тест стартового экрана не обращается к Binance. Для покрытия: `npm test -- --ci --coverage --runInBand`.

## Development build

Приложению нужен собственный development build. Профили EAS подготовлены; облачный проект не создан, сборки не запускались.

```sh
# Локально, если Android SDK и устройство уже настроены:
npm run android

# После установки development build — только Metro:
npm start
```

Для облачной сборки после самостоятельной привязки к Expo: `eas build -p android --profile development`. Профиль `development-simulator` — для iOS Simulator, `preview` — release-APK для замеров, `production` — для стора.

Новый нативный пакет, плагин или изменение app.json требуют пересборки development build. Для изменений JS достаточно Metro. ios/ и android/ генерируются из app.json и не включаются в Git. Идентификатор: io.github.yevhenjl.rnrealtimemarket.

На этом Mac из тренинга iOS SDK 58 собрать нельзя; используй подходящий Mac или EAS. Запуск на устройстве требует отдельно установленного development build.

## Структура и обучение

- src/app — Expo Router и стартовый экран.
- src/global.css, src/ui — токены темы и обёртки Uniwind.
- src/binance, src/realtime, src/store, src/chart — места для твоей реализации следующих этапов.
- src/features — будущие watchlist и экран символа; src/dev — будущие метрики.
- docs/adr и docs/media — будущие ADR и материалы демонстрации.
- AGENTS.md и CLAUDE.md — правила проекта: ядро пишешь сам, AI объясняет и делает ревью.

Следующий шаг — [этап 1: system design](../training/06-websocket-demo-binance/06-websocket-demo-binance-part3.md) и четыре ADR до реализации ядра. Спецификации тестов ядра остаются в тренинге и добавляются на соответствующих этапах.

## Git и CI

Отдельный Git-репозиторий и коммиты не создавались. `.github/workflows/ci.yml` — готовый шаблон для отдельного репозитория с этим проектом в корне; внутри текущего diary вложенный workflow автоматически не запускается. Он проверяет версии Expo, doctor, типы, lint, тесты, Android prebuild и экспорт бандла. CI на GitHub ещё не запускался.

В приложении нет API-ключей и подключения к реальному рынку. Не добавляй секреты; файлы окружения, сборки, node_modules и генерируемые файлы игнорируются.

## Результаты локальной проверки

Проверены TypeScript, ESLint, тест стартового экрана, совместимость версий Expo, Expo Doctor (20/20), Android prebuild и экспорт Android JS-бандла. Jest использует файловый обход без системного Watchman.

APK не собирался; запуск на телефоне или эмуляторе ещё не проверен.

Лицензия: MIT.
