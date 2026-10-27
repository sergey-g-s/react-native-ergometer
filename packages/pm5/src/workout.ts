import type {
  WorkoutData,
  WorkoutState,
  WorkoutSummary,
  WorkoutType,
} from '@ergometer/core';

// Each PM5 characteristic carries part of the workout numbers, so every parser returns a slice.
// A packet shorter than its characteristic defines is dropped as null.

// PM5 workout type codes, grouped by workout.
const WORKOUT_TYPES: [WorkoutType, number[]][] = [
  ['justRow', [0, 1]],
  ['distance', [2, 3]],
  ['time', [4, 5]],
  ['calories', [10]],
  ['wattMinutes', [11]],
  ['interval', [6, 7, 8, 9, 12, 13]],
];

/** Maps the PM5 workout type code to a workout type. */
export function parseWorkoutType(code: number): WorkoutType | null {
  return WORKOUT_TYPES.find(([, codes]) => codes.includes(code))?.[0] ?? null;
}

// PM5 workout state codes, grouped by state.
const WORKOUT_STATES: [WorkoutState, number[]][] = [
  ['waiting', [0, 13]],
  ['working', [1, 4, 5, 6, 7]],
  ['rest', [3, 8, 9]],
  ['ended', [10, 11, 12]],
];

/** Maps the PM5 workout state code to a workout state. */
export function parseWorkoutState(code: number): WorkoutState | null {
  return WORKOUT_STATES.find(([, codes]) => codes.includes(code))?.[0] ?? null;
}

export type GeneralStatus = Pick<
  WorkoutData,
  | 'workoutType'
  | 'workoutState'
  | 'target'
  | 'elapsedTime'
  | 'distance'
  | 'dragFactor'
>;
export type AdditionalStatus1 = Pick<
  WorkoutData,
  | 'speed'
  | 'strokeRate'
  | 'heartRate'
  | 'pace'
  | 'averagePace'
  | 'restDistance'
  | 'restTime'
>;
export type AdditionalStatus2 = Pick<
  WorkoutData,
  'power' | 'calories' | 'intervalCount'
>;
export type StrokeData = Pick<
  WorkoutData,
  | 'strokeCount'
  | 'driveLength'
  | 'driveTime'
  | 'recoveryTime'
  | 'strokeDistance'
  | 'peakDriveForce'
  | 'averageDriveForce'
  | 'workPerStroke'
>;
export type AdditionalStrokeData = Pick<
  WorkoutData,
  'strokePower' | 'strokeCalories' | 'projectedTime' | 'projectedDistance'
>;

/** Stroke readings before the first stroke, since the PM5 notifies them only once per stroke. */
export const NO_STROKE_DATA: StrokeData & AdditionalStrokeData = {
  strokeCount: 0,
  driveLength: 0,
  driveTime: 0,
  recoveryTime: 0,
  strokeDistance: 0,
  peakDriveForce: 0,
  averageDriveForce: 0,
  workPerStroke: 0,
  strokePower: 0,
  strokeCalories: 0,
  projectedTime: 0,
  projectedDistance: 0,
};

export type EndOfWorkoutSummary2 = Pick<
  WorkoutSummary,
  | 'calories'
  | 'averagePower'
  | 'intervalCount'
  | 'totalRestDistance'
  | 'restTime'
>;
export type EndOfWorkoutSummary = Omit<
  WorkoutSummary,
  keyof EndOfWorkoutSummary2
>;

/** Reads the PM5 general status notification (19 bytes). */
export function parseGeneralStatus(bytes: Uint8Array): GeneralStatus | null {
  if (bytes.length < 19) {
    return null;
  }
  return {
    workoutType: parseWorkoutType(bytes[6]!),
    workoutState: parseWorkoutState(bytes[8]!),
    target: parseTarget(uint24(bytes, 14), bytes[17]!),
    elapsedTime: uint24(bytes, 0) / 100,
    distance: uint24(bytes, 3) / 10,
    dragFactor: bytes[18]!,
  };
}

/** Reads the PM5 additional status 1 notification (17 bytes). */
export function parseAdditionalStatus1(
  bytes: Uint8Array,
): AdditionalStatus1 | null {
  if (bytes.length < 17) {
    return null;
  }
  return {
    speed: uint16(bytes, 3) / 1000,
    strokeRate: bytes[5]!,
    heartRate: heartRate(bytes[6]!),
    pace: uint16(bytes, 7) / 100,
    averagePace: uint16(bytes, 9) / 100,
    restDistance: uint16(bytes, 11),
    restTime: uint24(bytes, 13) / 100,
  };
}

/** Reads the PM5 additional status 2 notification (20 bytes). */
export function parseAdditionalStatus2(
  bytes: Uint8Array,
): AdditionalStatus2 | null {
  if (bytes.length < 20) {
    return null;
  }
  return {
    intervalCount: bytes[3]!,
    power: uint16(bytes, 4),
    calories: uint16(bytes, 6),
  };
}

/** Reads the PM5 stroke data notification (20 bytes). */
export function parseStrokeData(bytes: Uint8Array): StrokeData | null {
  if (bytes.length < 20) {
    return null;
  }
  return {
    driveLength: bytes[6]! / 100,
    driveTime: bytes[7]! / 100,
    recoveryTime: uint16(bytes, 8) / 100,
    strokeDistance: uint16(bytes, 10) / 100,
    peakDriveForce: uint16(bytes, 12) / 10,
    averageDriveForce: uint16(bytes, 14) / 10,
    workPerStroke: uint16(bytes, 16) / 10,
    strokeCount: uint16(bytes, 18),
  };
}

/** Reads the PM5 additional stroke data notification (15 bytes, the documented trailing bytes are not sent). */
export function parseAdditionalStrokeData(
  bytes: Uint8Array,
): AdditionalStrokeData | null {
  if (bytes.length < 15) {
    return null;
  }
  return {
    strokePower: uint16(bytes, 3),
    strokeCalories: uint16(bytes, 5),
    projectedTime: uint24(bytes, 9),
    projectedDistance: uint24(bytes, 12),
  };
}

/** Reads the PM5 end of workout summary notification (20 bytes). */
export function parseEndOfWorkoutSummary(
  bytes: Uint8Array,
): EndOfWorkoutSummary | null {
  if (bytes.length < 20) {
    return null;
  }
  return {
    workoutType: parseWorkoutType(bytes[17]!),
    elapsedTime: uint24(bytes, 4) / 100,
    distance: uint24(bytes, 7) / 10,
    averageStrokeRate: bytes[10]!,
    endingHeartRate: heartRate(bytes[11]!),
    averageHeartRate: heartRate(bytes[12]!),
    minHeartRate: heartRate(bytes[13]!),
    maxHeartRate: heartRate(bytes[14]!),
    dragFactor: bytes[15]!,
    recoveryHeartRate: heartRate(bytes[16]!),
    averagePace: uint16(bytes, 18) / 10,
  };
}

/** Reads the PM5 end of workout additional summary notification (19 bytes). */
export function parseEndOfWorkoutSummary2(
  bytes: Uint8Array,
): EndOfWorkoutSummary2 | null {
  if (bytes.length < 19) {
    return null;
  }
  return {
    intervalCount: bytes[7]!,
    calories: uint16(bytes, 8),
    averagePower: uint16(bytes, 10),
    totalRestDistance: uint24(bytes, 12),
    restTime: uint16(bytes, 15),
  };
}

// Duration type 0 is time in 0.01 s; calories (0x40), distance (0x80) and watt-minutes (0xC0) are whole units.
function parseTarget(duration: number, durationType: number): number | null {
  if (duration === 0) {
    return null;
  }
  return durationType === 0 ? duration / 100 : duration;
}

// The PM5 sends 0 or 255 when it has no heart rate.
function heartRate(value: number): number | null {
  return value === 0 || value === 255 ? null : value;
}

function uint16(bytes: Uint8Array, offset: number): number {
  return bytes[offset]! | (bytes[offset + 1]! << 8);
}

function uint24(bytes: Uint8Array, offset: number): number {
  return uint16(bytes, offset) | (bytes[offset + 2]! << 16);
}
