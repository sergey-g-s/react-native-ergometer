import type { Workout } from '@ergometer/core';

const FRAME_START = 0xf1;
const FRAME_STOP = 0xf2;
const FRAME_STUFF = 0xf3;

const GET_ERROR_CODE = 0x9c;
const PROPRIETARY_WRAPPER = 0x76;
const SET_WORKOUT_TYPE = 0x01;
const SET_WORKOUT_DURATION = 0x03;
const SET_SPLIT_DURATION = 0x05;
const SET_SCREEN_STATE = 0x13;
const CONFIGURE_WORKOUT = 0x14;

const WORKOUT_TYPE_FIXED_DISTANCE_WITH_SPLITS = 3;
const WORKOUT_TYPE_FIXED_TIME_WITH_SPLITS = 5;
const WORKOUT_TYPE_FIXED_CALORIES_WITH_SPLITS = 0x0a;
const DURATION_TYPE_TIME = 0x00;
const DURATION_TYPE_CALORIES = 0x40;
const DURATION_TYPE_DISTANCE = 0x80;
const SCREEN_TYPE_WORKOUT = 1;
const SCREEN_VALUE_PREPARE_TO_ROW = 1;
const PROGRAMMING_MODE_ENABLE = 1;

// PM5 limits for a programmed workout and its splits.
const MIN_DISTANCE = 100;
const MIN_DURATION = 20;
const MAX_DURATION = 9 * 3600 + 59 * 60 + 59;
const MAX_TIME_SPLIT = 90 * 60;
const MIN_CALORIES = 5;
const MAX_CALORIES = 65535;

/** Wraps CSAFE command bytes in a frame: start flag, contents and checksum (byte-stuffed), stop flag. */
export function frameCsafe(contents: number[]): number[] {
  const checksum = contents.reduce((xor, byte) => xor ^ byte, 0);
  const stuffed = [...contents, checksum].flatMap(byte =>
    byte >= 0xf0 && byte <= 0xf3 ? [FRAME_STUFF, byte - 0xf0] : [byte],
  );
  return [FRAME_START, ...stuffed, FRAME_STOP];
}

/** CSAFE frames that set up a fixed distance, time or calories workout and bring up its screen on the PM5. */
export function workoutFrames(workout: Workout): number[][] {
  const { type, durationType, duration, split } = workoutSetup(workout);

  return [
    [GET_ERROR_CODE],
    proprietary(SET_WORKOUT_TYPE, [type]),
    proprietary(SET_WORKOUT_DURATION, [durationType, ...uint32(duration)]),
    proprietary(SET_SPLIT_DURATION, [durationType, ...uint32(split)]),
    proprietary(CONFIGURE_WORKOUT, [PROGRAMMING_MODE_ENABLE]),
    proprietary(SET_SCREEN_STATE, [
      SCREEN_TYPE_WORKOUT,
      SCREEN_VALUE_PREPARE_TO_ROW,
    ]),
  ].map(frameCsafe);
}

// The split is the largest the PM5 allows, up to the whole workout.
// Time is sent in hundredths of a second.
function workoutSetup(workout: Workout) {
  if ('distance' in workout) {
    const meters = workout.distance;
    if (!Number.isInteger(meters) || meters < MIN_DISTANCE) {
      throw new RangeError(
        `Workout distance must be a whole number of meters, at least ${MIN_DISTANCE}`,
      );
    }
    return {
      type: WORKOUT_TYPE_FIXED_DISTANCE_WITH_SPLITS,
      durationType: DURATION_TYPE_DISTANCE,
      duration: meters,
      split: Math.floor(meters / 100) * 100,
    };
  }
  if ('duration' in workout) {
    const seconds = workout.duration;
    if (
      !Number.isInteger(seconds) ||
      seconds < MIN_DURATION ||
      seconds > MAX_DURATION
    ) {
      throw new RangeError(
        `Workout duration must be a whole number of seconds, from ${MIN_DURATION} to ${MAX_DURATION}`,
      );
    }
    return {
      type: WORKOUT_TYPE_FIXED_TIME_WITH_SPLITS,
      durationType: DURATION_TYPE_TIME,
      duration: seconds * 100,
      split: Math.min(seconds, MAX_TIME_SPLIT) * 100,
    };
  }
  const calories = workout.calories;
  if (
    !Number.isInteger(calories) ||
    calories < MIN_CALORIES ||
    calories > MAX_CALORIES
  ) {
    throw new RangeError(
      `Workout calories must be a whole number from ${MIN_CALORIES} to ${MAX_CALORIES}`,
    );
  }
  return {
    type: WORKOUT_TYPE_FIXED_CALORIES_WITH_SPLITS,
    durationType: DURATION_TYPE_CALORIES,
    duration: calories,
    split: calories,
  };
}

function proprietary(command: number, data: number[]): number[] {
  return [PROPRIETARY_WRAPPER, data.length + 2, command, data.length, ...data];
}

function uint32(value: number): number[] {
  return [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ];
}
