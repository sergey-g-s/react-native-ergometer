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

/** An open connection to a machine. Once it closes, connect again to get a new one. */
export interface ErgConnection {
  readonly id: string;
  readonly name: string | null;
  readonly serialNumber: string | null;
  readonly machineType: MachineType | null;
  readonly hardwareRevision: string | null;
  readonly firmwareVersion: string | null;
  readonly isConnected: boolean;
  disconnect(): Promise<void>;
  onDisconnect(listener: (error: Error | null) => void): () => void;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';
