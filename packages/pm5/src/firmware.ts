const FIRMWARE_URL = 'https://tech.concept2.com/api/firmware/latest/public';

export type Pm5Machine =
  'rower' | 'skierg' | 'bike' | 'strengtherg' | (string & {});

/** Latest public firmware for one PM5 hardware revision on one machine type. */
export interface Pm5Firmware {
  monitor: string;
  machine: Pm5Machine;
  hardware: number;
  majorVersion: number;
  minorVersion: number;
  version: string;
  releaseDate: string;
  shortDescription: string;
  descriptionHtml: string;
}

export interface FetchLatestPm5FirmwareOptions {
  machine?: Pm5Machine;
}

/** Thrown when the latest firmware list can't be fetched or parsed. */
export class FirmwareFetchError extends Error {
  readonly status: number | undefined;

  constructor(message: string, status?: number, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'FirmwareFetchError';
    this.status = status;
  }
}

interface RawFirmware {
  major_version: number;
  minor_version: number;
  monitor: string;
  machine: string;
  pm: number;
  hardware: number;
  description: string;
  short_description: string;
  release_date: string;
}

/** Fetches the latest public PM5 firmware, one entry per hardware revision and machine. */
export async function fetchLatestPm5Firmware(
  options: FetchLatestPm5FirmwareOptions = {},
): Promise<Pm5Firmware[]> {
  let response: Response;
  try {
    response = await fetch(FIRMWARE_URL, {
      headers: { Accept: 'application/json' },
    });
  } catch (error) {
    throw new FirmwareFetchError(
      'Could not reach the firmware service',
      undefined,
      { cause: error },
    );
  }

  if (!response.ok) {
    throw new FirmwareFetchError(
      `Firmware service responded with ${response.status}`,
      response.status,
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new FirmwareFetchError(
      'Firmware service returned invalid JSON',
      response.status,
      { cause: error },
    );
  }

  const items = (body as { data?: unknown } | null)?.data;
  if (!Array.isArray(items)) {
    throw new FirmwareFetchError(
      'Firmware service returned an unexpected response',
      response.status,
    );
  }

  const wantedMachine = options.machine?.toLowerCase();
  return items
    .filter(isRawFirmware)
    .filter(item => item.pm === 5)
    .map(toPm5Firmware)
    .filter(item => !wantedMachine || item.machine === wantedMachine);
}

function isRawFirmware(value: unknown): value is RawFirmware {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    typeof item.major_version === 'number' &&
    typeof item.minor_version === 'number' &&
    typeof item.monitor === 'string' &&
    typeof item.machine === 'string' &&
    typeof item.pm === 'number' &&
    typeof item.hardware === 'number' &&
    typeof item.description === 'string' &&
    typeof item.short_description === 'string' &&
    typeof item.release_date === 'string'
  );
}

function toPm5Firmware(item: RawFirmware): Pm5Firmware {
  return {
    monitor: item.monitor.toLowerCase(),
    machine: item.machine.toLowerCase(),
    hardware: item.hardware,
    majorVersion: item.major_version,
    minorVersion: item.minor_version,
    version: `${item.major_version}.${String(item.minor_version).padStart(3, '0')}`,
    releaseDate: item.release_date,
    shortDescription: item.short_description,
    descriptionHtml: item.description,
  };
}
