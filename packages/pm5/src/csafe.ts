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
const DURATION_TYPE_DISTANCE = 0x80;
const SCREEN_TYPE_WORKOUT = 1;
const SCREEN_VALUE_PREPARE_TO_ROW = 1;
const PROGRAMMING_MODE_ENABLE = 1;

/** Wraps CSAFE command bytes in a frame: start flag, contents and checksum (byte-stuffed), stop flag. */
export function frameCsafe(contents: number[]): number[] {
  const checksum = contents.reduce((xor, byte) => xor ^ byte, 0);
  const stuffed = [...contents, checksum].flatMap(byte =>
    byte >= 0xf0 && byte <= 0xf3 ? [FRAME_STUFF, byte - 0xf0] : [byte],
  );
  return [FRAME_START, ...stuffed, FRAME_STOP];
}

/** CSAFE frames that set up a fixed-distance workout and bring up its screen on the PM5. */
export function distanceWorkoutFrames(meters: number): number[][] {
  if (!Number.isInteger(meters) || meters < 100) {
    throw new RangeError(
      'Workout distance must be a whole number of meters, at least 100',
    );
  }
  const split = Math.floor(meters / 100) * 100;

  return [
    [GET_ERROR_CODE],
    proprietary(SET_WORKOUT_TYPE, [WORKOUT_TYPE_FIXED_DISTANCE_WITH_SPLITS]),
    proprietary(SET_WORKOUT_DURATION, [
      DURATION_TYPE_DISTANCE,
      ...uint32(meters),
    ]),
    proprietary(SET_SPLIT_DURATION, [DURATION_TYPE_DISTANCE, ...uint32(split)]),
    proprietary(CONFIGURE_WORKOUT, [PROGRAMMING_MODE_ENABLE]),
    proprietary(SET_SCREEN_STATE, [
      SCREEN_TYPE_WORKOUT,
      SCREEN_VALUE_PREPARE_TO_ROW,
    ]),
  ].map(frameCsafe);
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
