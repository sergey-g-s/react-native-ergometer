import type { WorkoutData, WorkoutSummary } from 'react-native-ergometer';

export type Metric = [label: string, value: string];

const NONE = '—';

// Seconds as m:ss.s, used for time and pace.
function clock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds - minutes * 60).toFixed(1).padStart(4, '0')}`;
}

function bpm(value: number | null): string {
  return value === null ? NONE : `${value} bpm`;
}

function target(data: WorkoutData): string {
  if (data.target === null) {
    return NONE;
  }
  switch (data.workoutType) {
    case 'distance':
      return `${data.target} m`;
    case 'time':
      return clock(data.target);
    case 'calories':
      return `${data.target} cal`;
    case 'wattMinutes':
      return `${data.target} W·min`;
    default:
      return String(data.target);
  }
}

export function liveMetrics(data: WorkoutData): Metric[] {
  return [
    ['Workout type', data.workoutType ?? NONE],
    ['Workout state', data.workoutState ?? NONE],
    ['Target', target(data)],
    ['Time', clock(data.elapsedTime)],
    ['Distance', `${data.distance.toFixed(1)} m`],
    ['Pace /500 m', clock(data.pace)],
    ['Avg pace /500 m', clock(data.averagePace)],
    ['Speed', `${data.speed.toFixed(2)} m/s`],
    ['Power', `${data.power} W`],
    ['Stroke rate', `${data.strokeRate} spm`],
    ['Heart rate', bpm(data.heartRate)],
    ['Calories', `${data.calories} cal`],
    ['Drag factor', String(data.dragFactor)],
    ['Stroke count', String(data.strokeCount)],
    ['Stroke distance', `${data.strokeDistance.toFixed(2)} m`],
    ['Stroke power', `${data.strokePower} W`],
    ['Stroke calories', `${data.strokeCalories} cal/h`],
    ['Drive length', `${data.driveLength.toFixed(2)} m`],
    ['Drive time', `${data.driveTime.toFixed(2)} s`],
    ['Recovery time', `${data.recoveryTime.toFixed(2)} s`],
    ['Peak drive force', `${data.peakDriveForce.toFixed(1)} lbf`],
    ['Avg drive force', `${data.averageDriveForce.toFixed(1)} lbf`],
    ['Work per stroke', `${data.workPerStroke.toFixed(1)} J`],
    ['Projected time', clock(data.projectedTime)],
    ['Projected distance', `${data.projectedDistance} m`],
    ['Interval count', String(data.intervalCount)],
    ['Rest time', clock(data.restTime)],
    ['Rest distance', `${data.restDistance} m`],
  ];
}

export function summaryMetrics(summary: WorkoutSummary): Metric[] {
  return [
    ['Workout type', summary.workoutType ?? NONE],
    ['Time', clock(summary.elapsedTime)],
    ['Distance', `${summary.distance.toFixed(1)} m`],
    ['Avg pace /500 m', clock(summary.averagePace)],
    ['Avg power', `${summary.averagePower} W`],
    ['Avg stroke rate', `${summary.averageStrokeRate} spm`],
    ['Calories', `${summary.calories} cal`],
    ['Drag factor', String(summary.dragFactor)],
    ['Interval count', String(summary.intervalCount)],
    ['Total rest distance', `${summary.totalRestDistance} m`],
    ['Rest time', clock(summary.restTime)],
    ['Avg heart rate', bpm(summary.averageHeartRate)],
    ['Min heart rate', bpm(summary.minHeartRate)],
    ['Max heart rate', bpm(summary.maxHeartRate)],
    ['Ending heart rate', bpm(summary.endingHeartRate)],
    ['Recovery heart rate', bpm(summary.recoveryHeartRate)],
  ];
}
