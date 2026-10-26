import type { ErgDevice } from '@ergometer/core';
import { useEffect, useState } from 'react';
import { scanDevices, type ScanError } from './scanDevices';

/** Scans for supported machines while the component is mounted. */
export function useErgScanner() {
  const [devices, setDevices] = useState<ErgDevice[]>([]);
  const [error, setError] = useState<ScanError | null>(null);

  useEffect(() => {
    let stop: (() => void) | undefined;
    let unmounted = false;

    scanDevices(setDevices, setError).then(stopScan => {
      // The component may unmount before the scan starts.
      if (unmounted) {
        stopScan();
      } else {
        stop = stopScan;
      }
    }, setError);

    return () => {
      unmounted = true;
      stop?.();
    };
  }, []);

  return { devices, error };
}
