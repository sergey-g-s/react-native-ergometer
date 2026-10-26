# react-native-ergometer

React Native library for connecting to fitness ergometers over Bluetooth Low Energy (BLE).

> **Status:** early development, not published to npm yet. Scanning, connecting and starting a distance workout on PM5 monitors works.

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

### `connectDevice(device)`

Connects to a scanned PM5 and reads what it reports about itself. Connections stay open across screens until you disconnect. Throws `ConnectionError` on failure.

```ts
const pm5 = await connectDevice(device);
// { id, name, serialNumber: '430045867', machineType: 'row', firmwareVersion: '37.000', hardwareRevision: '340', isConnected: true }
pm5.onDisconnect(error => {});
await pm5.disconnect();
```

### `connection.startWorkout({ distance })`

Programs a fixed-distance workout (meters, at least 100) and opens its screen on the PM5, ready to row.

```ts
await pm5.startWorkout({ distance: 2000 });
```

### `useErgConnection(deviceId)` / `useErgConnections()`

Connection status for one device, and every connected machine.

```tsx
const { status, connection, error } = useErgConnection(device.id); // status: 'disconnected' | 'connecting' | 'connected'
const connections = useErgConnections();
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
