// Types and utilities shared by every supported machine.
// Machine-specific protocols (CSAFE, FTMS) live in their own packages.

export type MachineType = 'row' | 'ski' | 'bike' | 'strength' | (string & {});

/** A fitness machine found by a Bluetooth scan. */
export interface ErgDevice {
  id: string;
  name: string | null;
  rssi: number | null;
  machineType: MachineType | null;
  serialNumber: string | null;
}

/** A workout to program on the machine. Distance is in meters. */
export interface Workout {
  distance: number;
}

export type WorkoutType =
  'justRow' | 'distance' | 'time' | 'calories' | 'wattMinutes' | 'interval';

export type WorkoutState = 'waiting' | 'working' | 'rest' | 'ended';

/** Live readings during a workout. Time in seconds, distance in meters, pace in seconds per 500 m. */
export interface WorkoutData {
  /** Null when the machine reports a type this library doesn't know. */
  workoutType: WorkoutType | null;
  /** Null when the machine reports a state this library doesn't know. */
  workoutState: WorkoutState | null;
  /** What the workout runs to: meters, seconds, calories or watt-minutes by type. Null for just row. */
  target: number | null;
  elapsedTime: number;
  distance: number;
  /** Meters per second. */
  speed: number;
  pace: number;
  averagePace: number;
  /** Average watts. */
  power: number;
  strokeRate: number;
  heartRate: number | null;
  calories: number;
  dragFactor: number;
  /** Strokes since the workout began. Stroke readings below hold zeros until the first stroke. */
  strokeCount: number;
  /** Meters. */
  driveLength: number;
  /** Seconds. */
  driveTime: number;
  /** Seconds. */
  recoveryTime: number;
  /** Meters per stroke. */
  strokeDistance: number;
  /** Pounds of force. */
  peakDriveForce: number;
  /** Pounds of force. */
  averageDriveForce: number;
  /** Joules per stroke. */
  workPerStroke: number;
  /** Watts of the last stroke. */
  strokePower: number;
  /** Calories per hour at the last stroke's effort. */
  strokeCalories: number;
  /** Projected total workout time at the current effort, in seconds. */
  projectedTime: number;
  /** Projected total workout distance at the current effort, in meters. */
  projectedDistance: number;
}

/** Final numbers a machine reports when a workout ends. Units match `WorkoutData`. */
export interface WorkoutSummary {
  workoutType: WorkoutType | null;
  elapsedTime: number;
  distance: number;
  averagePace: number;
  averageStrokeRate: number;
  endingHeartRate: number | null;
  averageHeartRate: number | null;
  minHeartRate: number | null;
  maxHeartRate: number | null;
  /** Heart rate after a minute of rest, reported by a second summary a minute after the workout ends. */
  recoveryHeartRate: number | null;
  dragFactor: number;
  calories: number;
  /** Average watts. */
  averagePower: number;
}

/** An open connection to a machine. Once it closes, connect again to get a new one. */
export interface ErgConnection {
  readonly id: string;
  readonly name: string | null;
  readonly serialNumber: string | null;
  readonly machineType: MachineType | null;
  readonly hardwareRevision: string | null;
  readonly firmwareVersion: string | null;
  readonly isConnected: boolean;
  startWorkout(workout: Workout): Promise<void>;
  /** Calls the listener with the latest readings as the machine reports them. */
  onWorkoutData(listener: (data: WorkoutData) => void): () => void;
  /** Calls the listener with the final numbers when a workout ends. */
  onWorkoutEnd(listener: (summary: WorkoutSummary) => void): () => void;
  disconnect(): Promise<void>;
  onDisconnect(listener: (error: Error | null) => void): () => void;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';
