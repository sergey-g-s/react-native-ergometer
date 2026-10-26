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
