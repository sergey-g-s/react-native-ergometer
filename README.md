# react-native-ergometer

React Native library for connecting to fitness ergometers over Bluetooth Low Energy (BLE).

> **Status:** early development, not published to npm yet. Scanning for PM5 monitors works; connecting is not ready.

## Goals

- First target: the Concept2 PM5 performance monitor (BLE + CSAFE).
- Later: machines that implement the standard Bluetooth Fitness Machine Service (FTMS).
- Simple hooks API for scanning, connecting and reading live workout metrics.
- Works with Expo (development build) and bare React Native. Expo Go is not supported, because BLE needs native code.

## API

### `useErgScanner()`

Scans for PM5 monitors while the component is mounted. Asks for Bluetooth permission on Android. A monitor that stops advertising for 10 seconds (switched off or out of range) drops off the list.

```tsx
const { devices, error } = useErgScanner();
// devices: [{ id, name: 'PM5 431861503 Ski', rssi: -60, machineType: 'ski', serialNumber: '431861503' }, ...]
```

### `scanDevices(onDevices, onError?)`

Same scan, started on demand (for example from a button). Resolves with a function that stops it. Throws `ScanError` if the scan can't start.

```ts
const stop = await scanDevices(devices => setDevices(devices));
stop();
```

### `fetchLatestPm5Firmware(options?)`

Latest public PM5 firmware, one entry per hardware revision and machine type. Throws `FirmwareFetchError` on failure.

```ts
const firmware = await fetchLatestPm5Firmware({ machineType: 'row' });
// [{ machineType: 'row', hardware: 6, version: '459.069', releaseDate: '2026-06-27', ... }, ...]
```

## License

[MIT](LICENSE)

## Disclaimer

This project is independent and is not affiliated with, endorsed by, or sponsored by Concept2, Inc. or any other equipment manufacturer. Concept2 and related product names are trademarks of their respective owners and are used here only to describe compatibility.
