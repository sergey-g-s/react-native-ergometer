import type { ConnectionStatus } from '@ergometer/core';
import type { Pm5Connection } from './connectDevice';

export interface ConnectionState {
  status: ConnectionStatus;
  connection: Pm5Connection | null;
  error: Error | null;
}

const DISCONNECTED: ConnectionState = {
  status: 'disconnected',
  connection: null,
  error: null,
};

const states = new Map<string, ConnectionState>();
const listeners = new Set<() => void>();
let connections: Pm5Connection[] = [];

/** All machines that are connected right now. */
export function getConnections(): Pm5Connection[] {
  return connections;
}

/** Calls `listener` whenever a machine starts connecting, connects or disconnects. */
export function onConnectionsChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getConnectionState(deviceId: string): ConnectionState {
  return states.get(deviceId) ?? DISCONNECTED;
}

export function setConnectionState(deviceId: string, state: ConnectionState) {
  states.set(deviceId, state);
  connections = [...states.values()].flatMap(entry =>
    entry.connection ? [entry.connection] : [],
  );
  listeners.forEach(listener => listener());
}
