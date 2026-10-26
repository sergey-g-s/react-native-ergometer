# react-native-ergometer

React Native library for connecting to fitness ergometers over Bluetooth Low Energy (BLE).

> **Status:** early development, not published to npm yet. BLE support is not ready.

## Goals

- First target: the Concept2 PM5 performance monitor (BLE + CSAFE).
- Later: machines that implement the standard Bluetooth Fitness Machine Service (FTMS).
- Simple hooks API for scanning, connecting and reading live workout metrics.
- Works with Expo (development build) and bare React Native. Expo Go is not supported, because BLE needs native code.

## API

### `fetchLatestPm5Firmware(options?)`

Latest public PM5 firmware, one entry per hardware revision and machine type. Throws `FirmwareFetchError` on failure.

```ts
const firmware = await fetchLatestPm5Firmware({ machine: 'rower' });
// [{ machine: 'rower', hardware: 6, version: '459.069', releaseDate: '2026-06-27', ... }, ...]
```

## License

[MIT](LICENSE)

## Disclaimer

This project is independent and is not affiliated with, endorsed by, or sponsored by Concept2, Inc. or any other equipment manufacturer. Concept2 and related product names are trademarks of their respective owners and are used here only to describe compatibility.
