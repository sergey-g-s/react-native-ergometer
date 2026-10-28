# react-native-ergometer

## 0.3.0

### Minor Changes

- 99a27cb: Add interval workouts: `startWorkout({ intervals })` with a distance, duration or calories and a `rest` per interval, `continueWorkout()` to end a rest without a set length, and interval and rest fields in the live data and the workout summary

### Patch Changes

- @ergometer/core@0.3.0
  - @ergometer/pm5@0.3.0

## 0.2.0

### Minor Changes

- 2dbdfab: Add `onWorkoutData` and `onWorkoutEnd` to read live readings and the final summary from a connected PM5
- a481b4f: Add time and calories workouts: `startWorkout({ duration })` in seconds and `startWorkout({ calories })`. `distanceWorkoutFrames` is replaced by `workoutFrames`

### Patch Changes

- @ergometer/core@0.2.0
  - @ergometer/pm5@0.2.0

## 0.1.0

### Minor Changes

- d05dec6: Require `react-native-ble-plx` as a peer dependency
- 1686683: Add `connectDevice`, `useErgConnection` and `useErgConnections` to connect to PM5 monitors
- d05dec6: Add `useErgScanner` and `scanDevices` to find nearby PM5 monitors
- ca49c24: Add `startWorkout({ distance })` to program a fixed-distance workout on a connected PM5

### Patch Changes

- Updated dependencies [58d4f82]
  - @ergometer/pm5@0.1.0
  - @ergometer/core@0.1.0
