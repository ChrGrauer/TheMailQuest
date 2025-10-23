import { vi } from 'vitest';

// Mock $app/environment for tests
vi.mock('$app/environment', () => ({
  dev: true,
  building: false,
  version: 'test'
}));
