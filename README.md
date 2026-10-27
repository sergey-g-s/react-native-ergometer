# react-native-ergometer

React Native library for Concept2 PM5 performance monitors over Bluetooth Low Energy. Find nearby monitors, connect to one or several at once, read what they report about themselves, start a workout from your app and follow it live.

Built on [react-native-ble-plx](https://github.com/dotintent/react-native-ble-plx). Support for machines that use the standard Fitness Machine Service (FTMS) is planned.

> **Status:** early development. Until 1.0, minor versions may change the API.

## Features

- Scan for PM5 monitors, with machine type (row, ski, bike) and serial number.
- Connect to several monitors at once; connections stay open across screens.
- Read serial number, machine type, firmware version and hardware revision after connecting.
- Start a fixed distance, time or calories workout on the monitor.
- Live data during a workout: time, distance, pace, power, stroke rate, heart rate, calories and per-stroke readings.
- The final numbers when a workout ends.
- Fetch the latest public PM5 firmware from Concept2.

## Requirements

- React Native with the New Architecture (developed against 0.88).
- `react-native-ble-plx` 3.5.1 or newer.
- A physical device. Bluetooth does not work in the iOS Simulator or the Android emulator.
- Expo works with a development build. Expo Go is not supported, because Bluetooth needs native code.

## Installation

```sh
npm install react-native-ergometer react-native-ble-plx
cd ios && pod install
```

**iOS:** add a Bluetooth usage description to `Info.plist`:

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Connects to fitness machines over Bluetooth.</string>
```

**Android:** `react-native-ble-plx` adds the Bluetooth permissions to the manifest. The library asks for them at runtime when you scan or connect.

**Expo:** add the `react-native-ble-plx` config plugin to `app.json` and build a development build:

```json
{ "expo": { "plugins": ["react-native-ble-plx"] } }
```

## Quick start

```tsx
import { Button } from 'react-native';
import { connectDevice, useErgScanner } from 'react-native-ergometer';

function Monitors() {
  const { devices, error } = useErgScanner();

  return devices.map(device => (
    <Button
      key={device.id}
      title={device.name ?? device.id}
      onPress={async () => {
        const pm5 = await connectDevice(device);
        await pm5.startWorkout({ distance: 2000 });
      }}
    />
  ));
}
```

## API

### Scanning

#### `useErgScanner()`

Scans for PM5 monitors while the component is mounted and stops on unmount. On Android it asks for Bluetooth permission first. A monitor that stops advertising for 10 seconds (switched off, asleep or out of range) drops off the list.

Returns `{ devices: ErgDevice[], error: ScanError | null }`.

#### `scanDevices(onDevices, onError?)`

The same scan, started on demand, for example from a button. Calls `onDevices` with the full list whenever it changes. Resolves with a function that stops the scan; rejects with `ScanError` when permission is denied or Bluetooth is off.

```ts
const stop = await scanDevices(devices => setDevices(devices));
stop();
```

#### `ErgDevice`

| Field          | Type                  | Notes                                                                                                             |
| -------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `id`           | `string`              | Bluetooth identifier: a UUID on iOS, a MAC address on Android.                                                    |
| `name`         | `string \| null`      | Advertised name, e.g. `PM5 431861503 Ski`.                                                                        |
| `rssi`         | `number \| null`      | Signal strength in dBm.                                                                                           |
| `machineType`  | `MachineType \| null` | From the advertisement. Monitors that don't name their machine are reported as `row`; connect for the exact type. |
| `serialNumber` | `string \| null`      | Taken from the advertised name.                                                                                   |

`MachineType` is `'row' | 'ski' | 'bike' | 'strength'`.

### Connecting

#### `connectDevice(device)`

Connects to a scanned monitor and reads its device information. Resolves with a `Pm5Connection`. If the device is already connected or connecting, returns that connection instead of opening a second one. Gives up after 20 seconds and rejects with `ConnectionError`.

The connection stays open until you call `disconnect()` or the monitor goes away, regardless of which screen is mounted.

#### `Pm5Connection`

| Member                    | Description                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `id`, `name`              | Same as the scanned device.                                                                                               |
| `serialNumber`            | Reported by the monitor.                                                                                                  |
| `machineType`             | Reported by the monitor, so it's exact even when the scan guessed.                                                        |
| `firmwareVersion`         | E.g. `37.000`, the same format as `version` from `fetchLatestPm5Firmware`.                                                |
| `hardwareRevision`        | As reported by the monitor, e.g. `340`.                                                                                   |
| `isConnected`             | `false` once the connection closes. A closed connection can't be reused; call `connectDevice` again.                      |
| `startWorkout(workout)`   | See [Workouts](#workouts).                                                                                                |
| `onWorkoutData(listener)` | See [Live data](#live-data).                                                                                              |
| `onWorkoutEnd(listener)`  | See [Workout summary](#workout-summary).                                                                                  |
| `disconnect()`            | Closes the connection.                                                                                                    |
| `onDisconnect(listener)`  | Called with `ConnectionError` when the connection drops, or `null` after `disconnect()`. Returns an unsubscribe function. |

#### `useErgConnection(deviceId)`

Returns `{ status, connection, error }` for one device. `status` is `'disconnected' | 'connecting' | 'connected'`; `connection` is set while connected; `error` holds the last connection failure.

#### `useErgConnections()`

Returns every connected `Pm5Connection`, on any screen.

#### `getConnections()` / `onConnectionsChange(listener)`

The same data outside React: the current connections, and a subscription that fires when a device starts connecting, connects or disconnects.

### Workouts

#### `connection.startWorkout(workout)`

Programs a fixed workout on the monitor and opens its workout screen, ready to start. Pass one of:

| Workout                | Unit     | Accepted values                            | Splits                                  |
| ---------------------- | -------- | ------------------------------------------ | --------------------------------------- |
| `{ distance: number }` | meters   | A whole number, at least 100.              | The distance rounded down to 100 m.     |
| `{ duration: number }` | seconds  | A whole number from 20 to 35999 (9:59:59). | The whole duration, at most 90 minutes. |
| `{ calories: number }` | calories | A whole number from 5 to 65535.            | The whole amount.                       |

A value outside the range throws `RangeError`; a lost connection throws `ConnectionError`. Subscribe to [live data](#live-data) before you start to see the workout from its first stroke.

```ts
await pm5.startWorkout({ distance: 2000 });
await pm5.startWorkout({ duration: 20 * 60 });
await pm5.startWorkout({ calories: 100 });
```

### Live data

#### `connection.onWorkoutData(listener)`

Calls `listener` with the latest readings each time the monitor reports them, about twice a second. Returns an unsubscribe function. The first call comes once the monitor has sent every status packet, and readings keep arriving between workouts, as zeros.

```tsx
useEffect(() => {
  const stopData = pm5.onWorkoutData(setData);
  const stopEnd = pm5.onWorkoutEnd(setSummary);
  return () => {
    stopData();
    stopEnd();
  };
}, [pm5]);
```

`WorkoutData`:

| Field               | Type                   | Notes                                                                                  |
| ------------------- | ---------------------- | -------------------------------------------------------------------------------------- |
| `workoutType`       | `WorkoutType \| null`  | `'justRow' \| 'distance' \| 'time' \| 'calories' \| 'wattMinutes' \| 'interval'`.      |
| `workoutState`      | `WorkoutState \| null` | `'waiting' \| 'working' \| 'rest' \| 'ended'`.                                         |
| `target`            | `number \| null`       | What the workout runs to: meters, seconds, calories or watt-minutes, by `workoutType`. |
| `elapsedTime`       | `number`               | Seconds.                                                                               |
| `distance`          | `number`               | Meters.                                                                                |
| `speed`             | `number`               | Meters per second.                                                                     |
| `pace`              | `number`               | Seconds per 500 m.                                                                     |
| `averagePace`       | `number`               | Seconds per 500 m.                                                                     |
| `power`             | `number`               | Average watts.                                                                         |
| `strokeRate`        | `number`               | Strokes per minute.                                                                    |
| `heartRate`         | `number \| null`       | Beats per minute; `null` without a heart rate belt.                                    |
| `calories`          | `number`               | Calories burned.                                                                       |
| `dragFactor`        | `number`               |                                                                                        |
| `strokeCount`       | `number`               | Strokes since the workout began.                                                       |
| `driveLength`       | `number`               | Meters.                                                                                |
| `driveTime`         | `number`               | Seconds.                                                                               |
| `recoveryTime`      | `number`               | Seconds.                                                                               |
| `strokeDistance`    | `number`               | Meters per stroke.                                                                     |
| `peakDriveForce`    | `number`               | Pounds of force.                                                                       |
| `averageDriveForce` | `number`               | Pounds of force.                                                                       |
| `workPerStroke`     | `number`               | Joules.                                                                                |
| `strokePower`       | `number`               | Watts of the last stroke.                                                              |
| `strokeCalories`    | `number`               | Calories per hour at the last stroke's effort.                                         |
| `projectedTime`     | `number`               | Projected total workout time at the current effort, in seconds.                        |
| `projectedDistance` | `number`               | Projected total workout distance at the current effort, in meters.                     |

The monitor sends the per-stroke fields (`strokeCount` to `projectedDistance`) once per stroke, so they are zero until the first stroke and reset when the monitor goes back to `'waiting'`. `elapsedTime` and `distance` restart with each workout, so don't assume they only grow.

### Workout summary

#### `connection.onWorkoutEnd(listener)`

Calls `listener` with the final numbers when a workout ends, including a Just Row that you end on the monitor. Returns an unsubscribe function. After a minute of rest the monitor can send a revised summary with `recoveryHeartRate`, which calls the listener again. Check `workoutType` if you only want summaries of some workouts.

`WorkoutSummary`:

| Field               | Type                  | Notes                                                                   |
| ------------------- | --------------------- | ----------------------------------------------------------------------- |
| `workoutType`       | `WorkoutType \| null` |                                                                         |
| `elapsedTime`       | `number`              | Seconds.                                                                |
| `distance`          | `number`              | Meters.                                                                 |
| `averagePace`       | `number`              | Seconds per 500 m.                                                      |
| `averagePower`      | `number`              | Watts.                                                                  |
| `averageStrokeRate` | `number`              | Strokes per minute.                                                     |
| `calories`          | `number`              | Calories burned.                                                        |
| `dragFactor`        | `number`              | Average for the workout.                                                |
| `endingHeartRate`   | `number \| null`      | Beats per minute; the four heart rate fields are `null` without a belt. |
| `averageHeartRate`  | `number \| null`      |                                                                         |
| `minHeartRate`      | `number \| null`      |                                                                         |
| `maxHeartRate`      | `number \| null`      |                                                                         |
| `recoveryHeartRate` | `number \| null`      | Heart rate after a minute of rest; only in the revised summary.         |

### Firmware

#### `fetchLatestPm5Firmware(options?)`

Fetches the latest public PM5 firmware from Concept2. Each PM5 hardware revision has its own firmware line, so the result has one entry per hardware revision and machine type. Pass `{ machineType }` to filter. Rejects with `FirmwareFetchError` (with `status` when the server responded).

```ts
const firmware = await fetchLatestPm5Firmware({ machineType: 'row' });
// [{ machineType: 'row', hardware: 6, version: '459.069', releaseDate: '2026-06-27', ... }, ...]
```

### Errors

| Error                | When                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------- |
| `ScanError`          | Permission denied, Bluetooth off or unsupported, or the scan failed.                    |
| `ConnectionError`    | Connecting failed or timed out, the connection dropped, or the monitor isn't connected. |
| `FirmwareFetchError` | The firmware service couldn't be reached or returned something unexpected.              |

The original error, when there is one, is in `error.cause`.

## Example app

[`example/`](https://github.com/sergey-g-s/react-native-ergometer/tree/main/example) is a React Native app for trying the library on a device: it lists nearby monitors, connects, shows the connection details, starts a distance, time or calories workout and shows its live data and summary. See [example/README.md](https://github.com/sergey-g-s/react-native-ergometer/blob/main/example/README.md).

## Development

This repo is a pnpm workspace:

- `packages/core`: shared types.
- `packages/pm5`: PM5 protocol: UUIDs, parsing, CSAFE frames.
- `packages/react-native`: the published `react-native-ergometer` package: Bluetooth, connections and hooks.
- `example`: the example app.

```sh
pnpm install
pnpm example start
```

Changes go through a pull request. Add a changeset (`pnpm changeset`) when you change a package.

## References

- [Concept2 PM CSAFE Communication Definition](https://cms.concept2.com/sites/default/files/2026-03/Concept2%20PM%20CSAFE%20Communication%20Definition.pdf): the CSAFE commands used to program workouts and the Bluetooth characteristics for live data and the workout summary.

## Roadmap

- [x] Scan for PM5 monitors.
- [x] Connect to monitor and read device information.
- [x] Start a fixed distance workout.
- [x] Live data from the monitor during a workout.
- [x] Workout summary when a workout ends.
- [x] Time and calories workouts.
- [ ] More workout types: intervals by distance or time, Just Row.
- [ ] Later: other machines that use the standard Fitness Machine Service (FTMS).

## License

[MIT](https://github.com/sergey-g-s/react-native-ergometer/blob/main/LICENSE)

## Disclaimer

This project is independent and is not affiliated with, endorsed by, or sponsored by Concept2, Inc. or any other equipment manufacturer. Concept2 and related product names are trademarks of their respective owners and are used here only to describe compatibility.
