# Example app

React Native CLI app for testing `react-native-ergometer` during development. Metro loads the workspace packages from `packages/*/src`, so library changes show up on reload without a rebuild.

BLE does not work in the iOS Simulator or the Android emulator. Use a physical device to talk to real machines.

## Run

From the repository root:

```sh
pnpm install
pnpm example start
```

In another terminal:

```sh
pnpm example ios      # first time: cd example/ios && bundle install && bundle exec pod install
pnpm example android
```
