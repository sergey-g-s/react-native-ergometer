import type { ErgConnection, ErgDevice } from '@ergometer/core';
import {
  PM5_INFO,
  parseErgMachineType,
  parsePm5FirmwareVersion,
} from '@ergometer/pm5';
import type { BleError, BleManager, Subscription } from 'react-native-ble-plx';
import { base64ToBytes, bytesToText, getReadyBleManager } from './ble';
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
  private readonly listeners = new Set<(error: Error | null) => void>();
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
  }

  get isConnected(): boolean {
    return this.connected;
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

  private handleDisconnect(bleError: BleError | null) {
    if (!this.connected) {
      return;
    }
    this.connected = false;
    this.subscription.remove();
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
