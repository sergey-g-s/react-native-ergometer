/**
 * @format
 */

import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

// The real provider renders nothing until it measures the screen, which never happens in Jest.
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('react-native-ble-plx', () => ({
  State: {
    PoweredOn: 'PoweredOn',
    PoweredOff: 'PoweredOff',
    Unauthorized: 'Unauthorized',
    Unsupported: 'Unsupported',
  },
  BleManager: class {
    onStateChange(listener: (state: string) => void) {
      Promise.resolve().then(() => listener('PoweredOn'));
      return { remove() {} };
    }
    async startDeviceScan(
      _uuids: unknown,
      _options: unknown,
      listener: (error: null, device: object) => void,
    ) {
      listener(null, {
        id: 'pm5-1',
        localName: 'PM5 431861503 Ski',
        name: null,
        rssi: -60,
      });
    }
    async stopDeviceScan() {}
  },
}));

const firmwareResponse = {
  data: [
    {
      version: 459.069,
      major_version: 459,
      minor_version: 69,
      monitor: 'pm5v6',
      machine: 'rower',
      pm: 5,
      hardware: 6,
      status: 'public',
      description: '<p>Release notes</p>',
      short_description: 'PM5 Version 459.069',
      release_date: '2026-06-27',
    },
  ],
};

beforeEach(() => {
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => firmwareResponse,
  });
});

let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

async function renderApp() {
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
}

function textLines() {
  return renderer?.root
    .findAllByType(Text)
    .map(node => [node.props.children].flat().join(''));
}

afterEach(async () => {
  await ReactTestRenderer.act(async () => renderer?.unmount());
  jest.useRealTimers();
});

test('renders nearby machines and the latest firmware', async () => {
  await renderApp();

  expect(textLines()).toContain('ski · 431861503 · -60 dBm');
  expect(textLines()).toContain('row · hw 6 · 459.069 · 2026-06-27');
});

test('drops a machine that stops advertising', async () => {
  jest.useFakeTimers();
  await renderApp();
  expect(textLines()).toContain('ski · 431861503 · -60 dBm');

  await ReactTestRenderer.act(async () => {
    jest.advanceTimersByTime(11_000);
  });

  expect(textLines()).not.toContain('ski · 431861503 · -60 dBm');
  expect(textLines()).toContain('Searching…');
});
