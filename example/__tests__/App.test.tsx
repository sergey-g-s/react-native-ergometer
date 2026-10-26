/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

// The real provider renders nothing until it measures the screen, which never happens in Jest.
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

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

test('renders the latest firmware', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });

  const text = JSON.stringify(renderer?.toJSON());
  expect(text).toContain('459.069');
});
