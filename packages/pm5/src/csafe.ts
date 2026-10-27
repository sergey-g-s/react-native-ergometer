import type { Interval, Workout } from '@ergometer/core';

const FRAME_START = 0xf1;
const FRAME_STOP = 0xf2;
const FRAME_STUFF = 0xf3;

const GET_ERROR_CODE = 0x9c;
const PROPRIETARY_WRAPPER = 0x76;
const SET_WORKOUT_TYPE = 0x01;
const SET_WORKOUT_DURATION = 0x03;
const SET_REST_DURATION = 0x04;
const SET_SPLIT_DURATION = 0x05;
const SET_SCREEN_STATE = 0x13;
const CONFIGURE_WORKOUT = 0x14;
const SET_INTERVAL_TYPE = 0x17;
const SET_WORKOUT_INTERVAL_COUNT = 0x18;

const WORKOUT_TYPE_FIXED_DISTANCE_WITH_SPLITS = 3;
const WORKOUT_TYPE_FIXED_TIME_WITH_SPLITS = 5;
const WORKOUT_TYPE_FIXED_CALORIES_WITH_SPLITS = 0x0a;
const WORKOUT_TYPE_VARIABLE_INTERVAL = 8;
const WORKOUT_TYPE_VARIABLE_UNDEFINED_REST_INTERVAL = 9;
const INTERVAL_TYPE_TIME = 0;
const INTERVAL_TYPE_DISTANCE = 1;
const INTERVAL_TYPE_TIME_REST_UNDEFINED = 3;
const INTERVAL_TYPE_DISTANCE_REST_UNDEFINED = 4;
const INTERVAL_TYPE_CALORIES = 6;
const INTERVAL_TYPE_CALORIES_REST_UNDEFINED = 7;
const DURATION_TYPE_TIME = 0x00;
const DURATION_TYPE_CALORIES = 0x40;
const DURATION_TYPE_DISTANCE = 0x80;
const SCREEN_TYPE_WORKOUT = 1;
const SCREEN_VALUE_PREPARE_TO_ROW = 1;
const SCREEN_VALUE_VIRTUAL_KEY_D = 50;
const PROGRAMMING_MODE_ENABLE = 1;

// PM5 limits for a programmed workout and its splits.
const MIN_DISTANCE = 100;
const MIN_DURATION = 20;
const MAX_DURATION = 9 * 3600 + 59 * 60 + 59;
const MAX_TIME_SPLIT = 90 * 60;
const MIN_CALORIES = 5;
const MAX_CALORIES = 65535;
const MAX_INTERVALS = 50;
const MAX_INTERVAL_DISTANCE = 999999;
const MAX_INTERVAL_DURATION = 99 * 3600 + 59 * 60 + 59;
const MAX_INTERVAL_CALORIES = 999;
const MAX_REST = 9 * 60 + 55;

/** Wraps CSAFE command bytes in a frame: start flag, contents and checksum (byte-stuffed), stop flag. */
export function frameCsafe(contents: number[]): number[] {
  const checksum = contents.reduce((xor, byte) => xor ^ byte, 0);
  const stuffed = [...contents, checksum].flatMap(byte =>
    byte >= 0xf0 && byte <= 0xf3 ? [FRAME_STUFF, byte - 0xf0] : [byte],
  );
  return [FRAME_START, ...stuffed, FRAME_STOP];
}

/** CSAFE frame that presses the PM5's continue key, which ends a rest that has no set length. */
export function continueFrame(): number[] {
  return frameCsafe(
    proprietary(SET_SCREEN_STATE, [
      SCREEN_TYPE_WORKOUT,
      SCREEN_VALUE_VIRTUAL_KEY_D,
    ]),
  );
}

/** CSAFE frames that set up a fixed distance, time, calories or interval workout and bring up its screen on the PM5. */
export function workoutFrames(workout: Workout): number[][] {
  if ('intervals' in workout) {
    return intervalFrames(workout.intervals);
  }
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
function workoutSetup(workout: Exclude<Workout, { intervals: Interval[] }>) {
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

// Every interval is a variable interval of its own, sent as one frame so none outgrows the PM5's
// 120 byte frame limit. The last frame carries the workout type fix for manual rest and the screen.
function intervalFrames(intervals: Interval[]): number[][] {
  if (intervals.length < 1 || intervals.length > MAX_INTERVALS) {
    throw new RangeError(
      `A workout needs from 1 to ${MAX_INTERVALS} intervals`,
    );
  }
  const setups = intervals.map(intervalSetup);
  const manualRest = setups.some(setup => setup.manualRest);

  const frames = setups.map((setup, index) => [
    commandBytes(SET_WORKOUT_INTERVAL_COUNT, [index]),
    ...(index === 0
      ? [commandBytes(SET_WORKOUT_TYPE, [WORKOUT_TYPE_VARIABLE_INTERVAL])]
      : []),
    commandBytes(SET_INTERVAL_TYPE, [setup.intervalType]),
    commandBytes(SET_WORKOUT_DURATION, [
      setup.durationType,
      ...uint32(setup.duration),
    ]),
    commandBytes(SET_REST_DURATION, [setup.rest >> 8, setup.rest & 0xff]),
    commandBytes(CONFIGURE_WORKOUT, [PROGRAMMING_MODE_ENABLE]),
  ]);

  // Manual rest needs the undefined rest workout type and a zero split, or the PM5 treats it as a biathlon.
  if (manualRest) {
    frames[frames.length - 1]!.push(
      commandBytes(SET_WORKOUT_TYPE, [
        WORKOUT_TYPE_VARIABLE_UNDEFINED_REST_INTERVAL,
      ]),
      commandBytes(SET_SPLIT_DURATION, [DURATION_TYPE_DISTANCE, ...uint32(0)]),
    );
  }
  frames[frames.length - 1]!.push(
    commandBytes(SET_SCREEN_STATE, [
      SCREEN_TYPE_WORKOUT,
      SCREEN_VALUE_PREPARE_TO_ROW,
    ]),
  );

  return [[GET_ERROR_CODE], ...frames.map(wrap)].map(frameCsafe);
}

function intervalSetup(interval: Interval, index: number) {
  const number = index + 1;
  const manualRest = interval.rest === undefined;
  const rest = interval.rest ?? 0;
  if (!Number.isInteger(rest) || rest < 0 || rest > MAX_REST) {
    throw new RangeError(
      `Rest of interval ${number} must be a whole number of seconds, from 0 to ${MAX_REST}`,
    );
  }

  if ('distance' in interval) {
    const meters = interval.distance;
    if (
      !Number.isInteger(meters) ||
      meters < MIN_DISTANCE ||
      meters > MAX_INTERVAL_DISTANCE
    ) {
      throw new RangeError(
        `Distance of interval ${number} must be a whole number of meters, from ${MIN_DISTANCE} to ${MAX_INTERVAL_DISTANCE}`,
      );
    }
    return {
      intervalType: manualRest
        ? INTERVAL_TYPE_DISTANCE_REST_UNDEFINED
        : INTERVAL_TYPE_DISTANCE,
      durationType: DURATION_TYPE_DISTANCE,
      duration: meters,
      rest,
      manualRest,
    };
  }
  if ('duration' in interval) {
    const seconds = interval.duration;
    if (
      !Number.isInteger(seconds) ||
      seconds < MIN_DURATION ||
      seconds > MAX_INTERVAL_DURATION
    ) {
      throw new RangeError(
        `Duration of interval ${number} must be a whole number of seconds, from ${MIN_DURATION} to ${MAX_INTERVAL_DURATION}`,
      );
    }
    return {
      intervalType: manualRest
        ? INTERVAL_TYPE_TIME_REST_UNDEFINED
        : INTERVAL_TYPE_TIME,
      durationType: DURATION_TYPE_TIME,
      duration: seconds * 100,
      rest,
      manualRest,
    };
  }
  const calories = interval.calories;
  if (
    !Number.isInteger(calories) ||
    calories < MIN_CALORIES ||
    calories > MAX_INTERVAL_CALORIES
  ) {
    throw new RangeError(
      `Calories of interval ${number} must be a whole number from ${MIN_CALORIES} to ${MAX_INTERVAL_CALORIES}`,
    );
  }
  return {
    intervalType: manualRest
      ? INTERVAL_TYPE_CALORIES_REST_UNDEFINED
      : INTERVAL_TYPE_CALORIES,
    durationType: DURATION_TYPE_CALORIES,
    duration: calories,
    rest,
    manualRest,
  };
}

function proprietary(command: number, data: number[]): number[] {
  return wrap([commandBytes(command, data)]);
}

// A command is its id, the length of its data and the data.
function commandBytes(id: number, data: number[]): number[] {
  return [id, data.length, ...data];
}

// The wrapper holds one or more commands behind its byte count.
function wrap(commands: number[][]): number[] {
  const contents = commands.flat();
  return [PROPRIETARY_WRAPPER, contents.length, ...contents];
}

function uint32(value: number): number[] {
  return [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ];
}
