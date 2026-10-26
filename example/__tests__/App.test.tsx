/**
 * @format
 */

import React from 'react';
import { Button, Text } from 'react-native';
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
    async connectToDevice(id: string) {
      return { id };
    }
    async discoverAllServicesAndCharacteristicsForDevice() {}
    async readCharacteristicForDevice(
      _id: string,
      _service: string,
      characteristic: string,
    ) {
      // Base64 values as ble-plx returns them: serial, hardware, firmware, erg machine type 128 (ski).
      const values: Record<string, string> = {
        'ce060012-43e5-11e4-916c-0800200c9a66': 'NDMxODYxNTAz',
        'ce060013-43e5-11e4-916c-0800200c9a66': 'Mw==',
        'ce060014-43e5-11e4-916c-0800200c9a66': 'ODIwMC0wMDAzMjAtOTE3LjA2OQ==',
        'ce060016-43e5-11e4-916c-0800200c9a66': 'gA==',
      };
      return { value: values[characteristic] ?? null };
    }
    async writeCharacteristicWithResponseForDevice(
      _id: string,
      _service: string,
      _characteristic: string,
      value: string,
    ) {
      mockWrites.push(value);
    }
    onDeviceDisconnected() {
      return { remove() {} };
    }
    async cancelDeviceConnection() {}
  },
}));

const mockWrites: string[] = [];

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

async function pressButton(title: string) {
  const button = renderer?.root
    .findAllByType(Button)
    .find(node => node.props.title === title);
  await ReactTestRenderer.act(async () => {
    button?.props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
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

test('connects to a machine and reads its info', async () => {
  await renderApp();

  await pressButton('Connect');
  expect(textLines()).toContain('machineType: ski');
  expect(textLines()).toContain('firmwareVersion: 917.069');

  await pressButton('Disconnect');
  expect(textLines()).not.toContain('machineType: ski');
  expect(textLines()).toContain('None');
});

test('starts a distance workout', async () => {
  await renderApp();
  await pressButton('Connect');

  await pressButton('Start 2000 m');

  expect(mockWrites).toHaveLength(6);
  // F1 9C 9C F2: get error code
  expect(mockWrites[0]).toBe('8Zyc8g==');
  // F1 76 07 03 05 80 00 00 07 D0 20 F2: workout duration 2000 m
  expect(mockWrites[2]).toBe('8XYHAwWAAAAH0CDy');

  await pressButton('Disconnect');
});
