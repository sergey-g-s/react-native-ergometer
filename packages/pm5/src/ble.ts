import type { MachineType } from '@ergometer/core';

/** Service UUID that PM5 monitors advertise. */
export const PM5_SERVICE_UUID = 'ce060000-43e5-11e4-916c-0800200c9a66';

/** PM5 device information service and the characteristics read after connecting. */
export const PM5_INFO = {
  service: 'ce060010-43e5-11e4-916c-0800200c9a66',
  serialNumber: 'ce060012-43e5-11e4-916c-0800200c9a66',
  hardwareRevision: 'ce060013-43e5-11e4-916c-0800200c9a66',
  firmwareRevision: 'ce060014-43e5-11e4-916c-0800200c9a66',
  ergMachineType: 'ce060016-43e5-11e4-916c-0800200c9a66',
};

/** PM5 control service and the characteristic that receives CSAFE commands. */
export const PM5_CONTROL = {
  service: 'ce060020-43e5-11e4-916c-0800200c9a66',
  command: 'ce060021-43e5-11e4-916c-0800200c9a66',
};

/** PM5 rowing service and the characteristics that notify workout data. */
export const PM5_ROWING = {
  service: 'ce060030-43e5-11e4-916c-0800200c9a66',
  generalStatus: 'ce060031-43e5-11e4-916c-0800200c9a66',
  additionalStatus1: 'ce060032-43e5-11e4-916c-0800200c9a66',
  additionalStatus2: 'ce060033-43e5-11e4-916c-0800200c9a66',
  strokeData: 'ce060035-43e5-11e4-916c-0800200c9a66',
  additionalStrokeData: 'ce060036-43e5-11e4-916c-0800200c9a66',
  endOfWorkoutSummary: 'ce060039-43e5-11e4-916c-0800200c9a66',
  endOfWorkoutSummary2: 'ce06003a-43e5-11e4-916c-0800200c9a66',
};

// Erg machine type codes from the PM5 device information service, grouped by machine.
const ERG_MACHINE_TYPES: [MachineType, number[]][] = [
  ['row', [0, 1, 2, 3, 5, 7, 8, 16, 17, 18, 19, 20, 32, 224]],
  ['ski', [128, 143, 225]],
  ['bike', [192, 193, 194, 207, 226]],
];

/** Maps the PM5 erg machine type code to a machine type. */
export function parseErgMachineType(code: number): MachineType | null {
  return (
    ERG_MACHINE_TYPES.find(([, codes]) => codes.includes(code))?.[0] ?? null
  );
}

const NAME_MACHINE_TYPES: [string, MachineType][] = [
  ['Row', 'row'],
  ['Ski', 'ski'],
  ['Bike', 'bike'],
];

/** Reads the serial number from a PM5 name like `PM5 430045867`. */
export function parsePm5SerialNumber(name: string | null): string | null {
  return name?.match(/^PM5\s+(\d+)/i)?.[1] ?? null;
}

/** Reads the version from a PM5 firmware revision like `8200-000320-037.000`, giving `37.000`. */
export function parsePm5FirmwareVersion(
  revision: string | null,
): string | null {
  const [, major, minor] = revision?.match(/-(\d+)\.(\d+)$/) ?? [];
  return major && minor ? `${Number(major)}.${minor}` : revision;
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
