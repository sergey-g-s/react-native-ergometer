# Example app

React Native CLI app for trying `react-native-ergometer` on a device. It lists nearby PM5 monitors, connects to them, shows what each connected monitor reports, starts a distance, time or calories workout and shows its live data and summary.

Metro loads the workspace packages from `packages/*/src`, so library changes show up on reload without a rebuild.

Bluetooth does not work in the iOS Simulator or the Android emulator. Use a physical device.

## Run

From the repository root, with Node 24:

```sh
pnpm install
pnpm example start
```

In another terminal:

```sh
pnpm example ios --device   # first time: cd example/ios && bundle install && bundle exec pod install
pnpm example android
```

If the app shows stale code, restart Metro with `pnpm example start --reset-cache`.
