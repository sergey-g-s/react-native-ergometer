import type { MachineType } from '@ergometer/core';

/** Service UUID that PM5 monitors advertise. */
export const PM5_SERVICE_UUID = 'ce060000-43e5-11e4-916c-0800200c9a66';

const NAME_MACHINE_TYPES: [string, MachineType][] = [
  ['Row', 'row'],
  ['Ski', 'ski'],
  ['Bike', 'bike'],
];

/** Reads the serial number from a PM5 name like `PM5 430045867`. */
export function parsePm5SerialNumber(name: string | null): string | null {
  return name?.match(/^PM5\s+(\d+)/i)?.[1] ?? null;
}

/**
 * Reads the machine type from a PM5 advertisement: FTMS service data first, then the name.
 * Falls back to `row` when the PM5 doesn't say.
 */
export function parsePm5MachineType(
  name: string | null,
  ftmsServiceData: Uint8Array | null,
): MachineType {
  if (ftmsServiceData && ftmsServiceData.length >= 3) {
    const [flags = 0, low = 0, high = 0] = ftmsServiceData;
    const fitnessMachineType = low | (high << 8);
    if ((flags & 0x01) !== 0) {
      if (fitnessMachineType & (1 << 4)) {
        return 'row';
      }
      if (fitnessMachineType & (1 << 5)) {
        return 'bike';
      }
      if (fitnessMachineType & (1 << 6)) {
        return 'ski';
      }
    }
  }

  const fromName = NAME_MACHINE_TYPES.find(([word]) => name?.includes(word));
  return fromName?.[1] ?? 'row';
}
