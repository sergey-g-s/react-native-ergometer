import type {
  ErgConnection,
  ErgDevice,
  Workout,
  WorkoutData,
  WorkoutSummary,
} from '@ergometer/core';
import {
  PM5_CONTROL,
  PM5_INFO,
  PM5_ROWING,
  distanceWorkoutFrames,
  NO_STROKE_DATA,
  parseAdditionalStatus1,
  parseAdditionalStatus2,
  parseAdditionalStrokeData,
  parseEndOfWorkoutSummary,
  parseEndOfWorkoutSummary2,
  parseErgMachineType,
  parseGeneralStatus,
  parsePm5FirmwareVersion,
  parseStrokeData,
  type AdditionalStatus1,
  type AdditionalStatus2,
  type AdditionalStrokeData,
  type EndOfWorkoutSummary,
  type EndOfWorkoutSummary2,
  type GeneralStatus,
  type StrokeData,
} from '@ergometer/pm5';
import type { BleError, BleManager, Subscription } from 'react-native-ble-plx';
import {
  base64ToBytes,
  bytesToBase64,
  bytesToText,
  getReadyBleManager,
} from './ble';
import { getConnectionState, setConnectionState } from './connections';

const CONNECT_TIMEOUT_MS = 20_000;

const pending = new Map<string, Promise<Pm5Connection>>();

type Pm5Details = Pick<
  ErgConnection,
  | 'id'
  | 'name'
  | 'serialNumber'
  | 'machineType'
  | 'hardwareRevision'
  | 'firmwareVersion'
>;

/** Thrown when connecting to a machine fails or the connection drops. */
export class ConnectionError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ConnectionError';
  }
}

/** An open connection to a PM5 monitor. */
export class Pm5Connection implements ErgConnection {
  readonly id: string;
  readonly name: string | null;
  readonly serialNumber: string | null;
  readonly machineType: ErgConnection['machineType'];
  readonly hardwareRevision: string | null;
  readonly firmwareVersion: string | null;
  private readonly bleManager: BleManager;
  private readonly subscription: Subscription;
  private readonly workoutSubscriptions: Subscription[];
  private readonly listeners = new Set<(error: Error | null) => void>();
  private readonly dataListeners = new Set<(data: WorkoutData) => void>();
  private readonly endListeners = new Set<(summary: WorkoutSummary) => void>();
  private general: GeneralStatus | null = null;
  private additional1: AdditionalStatus1 | null = null;
  private additional2: AdditionalStatus2 | null = null;
  private stroke: StrokeData = NO_STROKE_DATA;
  private additionalStroke: AdditionalStrokeData = NO_STROKE_DATA;
  private summary: EndOfWorkoutSummary | null = null;
  private summary2: EndOfWorkoutSummary2 | null = null;
  private connected = true;

  constructor(bleManager: BleManager, details: Pm5Details) {
    this.id = details.id;
    this.name = details.name;
    this.serialNumber = details.serialNumber;
    this.machineType = details.machineType;
    this.hardwareRevision = details.hardwareRevision;
    this.firmwareVersion = details.firmwareVersion;
    this.bleManager = bleManager;
    this.subscription = bleManager.onDeviceDisconnected(this.id, error =>
      this.handleDisconnect(error),
    );
    this.workoutSubscriptions = [
      this.monitor(PM5_ROWING.generalStatus, bytes => {
        const previousState = this.general?.workoutState;
        this.general = parseGeneralStatus(bytes) ?? this.general;
        const state = this.general?.workoutState;
        if (state === 'waiting') {
          this.stroke = NO_STROKE_DATA;
          this.additionalStroke = NO_STROKE_DATA;
        }
        // Keep the last summary through the wait after a workout: the PM5 revises it a minute later.
        if (state === 'working' && previousState !== 'working') {
          this.summary = null;
          this.summary2 = null;
        }
        this.emitData();
      }),
      this.monitor(PM5_ROWING.additionalStatus1, bytes => {
        this.additional1 = parseAdditionalStatus1(bytes) ?? this.additional1;
        this.emitData();
      }),
      this.monitor(PM5_ROWING.additionalStatus2, bytes => {
        this.additional2 = parseAdditionalStatus2(bytes) ?? this.additional2;
        this.emitData();
      }),
      this.monitor(PM5_ROWING.strokeData, bytes => {
        this.stroke = parseStrokeData(bytes) ?? this.stroke;
        this.emitData();
      }),
      this.monitor(PM5_ROWING.additionalStrokeData, bytes => {
        this.additionalStroke =
          parseAdditionalStrokeData(bytes) ?? this.additionalStroke;
        this.emitData();
      }),
      this.monitor(PM5_ROWING.endOfWorkoutSummary, bytes => {
        this.summary = parseEndOfWorkoutSummary(bytes) ?? this.summary;
        this.emitEnd();
      }),
      this.monitor(PM5_ROWING.endOfWorkoutSummary2, bytes => {
        this.summary2 = parseEndOfWorkoutSummary2(bytes) ?? this.summary2;
        this.emitEnd();
      }),
    ];
  }

  get isConnected(): boolean {
    return this.connected;
  }

  /** Programs a fixed-distance workout and opens its screen on the PM5, ready to row. */
  async startWorkout(workout: Workout): Promise<void> {
    if (!this.connected) {
      throw new ConnectionError('PM5 is not connected');
    }
    for (const frame of distanceWorkoutFrames(workout.distance)) {
      await this.bleManager.writeCharacteristicWithResponseForDevice(
        this.id,
        PM5_CONTROL.service,
        PM5_CONTROL.command,
        bytesToBase64(frame),
      );
    }
  }

  onWorkoutData(listener: (data: WorkoutData) => void): () => void {
    this.dataListeners.add(listener);
    return () => {
      this.dataListeners.delete(listener);
    };
  }

  onWorkoutEnd(listener: (summary: WorkoutSummary) => void): () => void {
    this.endListeners.add(listener);
    return () => {
      this.endListeners.delete(listener);
    };
  }

  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }
    await this.bleManager.cancelDeviceConnection(this.id);
    this.handleDisconnect(null);
  }

  onDisconnect(listener: (error: Error | null) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private monitor(
    characteristic: string,
    handle: (bytes: Uint8Array) => void,
  ): Subscription {
    return this.bleManager.monitorCharacteristicForDevice(
      this.id,
      PM5_ROWING.service,
      characteristic,
      (error, result) => {
        if (!error && result?.value) {
          handle(base64ToBytes(result.value));
        }
      },
    );
  }

  // Each status packet holds part of the readings; listeners hear once all three have arrived.
  private emitData() {
    if (this.general && this.additional1 && this.additional2) {
      const data = {
        ...this.general,
        ...this.additional1,
        ...this.additional2,
        ...this.stroke,
        ...this.additionalStroke,
      };
      this.dataListeners.forEach(listener => listener(data));
    }
  }

  private emitEnd() {
    if (this.summary && this.summary2) {
      const summary = { ...this.summary, ...this.summary2 };
      this.endListeners.forEach(listener => listener(summary));
    }
  }

  private handleDisconnect(bleError: BleError | null) {
    if (!this.connected) {
      return;
    }
    this.connected = false;
    this.subscription.remove();
    this.workoutSubscriptions.forEach(subscription => subscription.remove());
    const error = bleError
      ? new ConnectionError('Connection lost', { cause: bleError })
      : null;
    setConnectionState(this.id, {
      status: 'disconnected',
      connection: null,
      error,
    });
    this.listeners.forEach(listener => listener(error));
  }
}

/**
 * Connects to a PM5 found by a scan and reads its device information.
 * Returns the existing connection when the device is already connected or connecting.
 */
export function connectDevice(device: ErgDevice): Promise<Pm5Connection> {
  const existing = getConnectionState(device.id).connection;
  if (existing) {
    return Promise.resolve(existing);
  }
  let attempt = pending.get(device.id);
  if (!attempt) {
    attempt = openConnection(device).finally(() => pending.delete(device.id));
    pending.set(device.id, attempt);
  }
  return attempt;
}

async function openConnection(device: ErgDevice): Promise<Pm5Connection> {
  setConnectionState(device.id, {
    status: 'connecting',
    connection: null,
    error: null,
  });

  let bleManager: BleManager | undefined;
  try {
    bleManager = await getReadyBleManager();
    await bleManager.connectToDevice(device.id, {
      timeout: CONNECT_TIMEOUT_MS,
    });
    await bleManager.discoverAllServicesAndCharacteristicsForDevice(device.id);
    const details = await readDetails(bleManager, device);
    const connection = new Pm5Connection(bleManager, details);
    setConnectionState(device.id, {
      status: 'connected',
      connection,
      error: null,
    });
    return connection;
  } catch (cause) {
    await bleManager?.cancelDeviceConnection(device.id).catch(() => {});
    const error = new ConnectionError(
      cause instanceof Error ? cause.message : 'Could not connect',
      { cause },
    );
    setConnectionState(device.id, {
      status: 'disconnected',
      connection: null,
      error,
    });
    throw error;
  }
}

// Reads one characteristic at a time: Android allows only one GATT operation at once.
async function readDetails(
  bleManager: BleManager,
  device: ErgDevice,
): Promise<Pm5Details> {
  const read = async (characteristic: string) => {
    try {
      const result = await bleManager.readCharacteristicForDevice(
        device.id,
        PM5_INFO.service,
        characteristic,
      );
      return result.value ? base64ToBytes(result.value) : null;
    } catch {
      return null;
    }
  };

  const serialNumber = bytesToText(await read(PM5_INFO.serialNumber));
  const hardwareRevision = bytesToText(await read(PM5_INFO.hardwareRevision));
  const firmwareVersion = parsePm5FirmwareVersion(
    bytesToText(await read(PM5_INFO.firmwareRevision)),
  );
  const machineCode = (await read(PM5_INFO.ergMachineType))?.[0];

  return {
    id: device.id,
    name: device.name,
    serialNumber: serialNumber ?? device.serialNumber,
    machineType:
      (machineCode === undefined ? null : parseErgMachineType(machineCode)) ??
      device.machineType,
    hardwareRevision,
    firmwareVersion,
  };
}
