import { useCallback, useSyncExternalStore } from 'react';
import type { Pm5Connection } from './connectDevice';
import {
  getConnectionState,
  getConnections,
  onConnectionsChange,
  type ConnectionState,
} from './connections';

/** All machines that are connected right now, on any screen. */
export function useErgConnections(): Pm5Connection[] {
  return useSyncExternalStore(onConnectionsChange, getConnections);
}

/** Connection status, the connection itself and the last error for one device. */
export function useErgConnection(deviceId: string): ConnectionState {
  const getSnapshot = useCallback(
    () => getConnectionState(deviceId),
    [deviceId],
  );
  return useSyncExternalStore(onConnectionsChange, getSnapshot);
}
