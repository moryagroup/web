// Test Helper & Assertion Framework for Morya Group Web App Unit/E2E Tests

// Mock browser globals (localStorage, window) if executing in Node/tsx environment
if (typeof globalThis.localStorage === 'undefined' || !globalThis.localStorage.setItem) {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
      (globalThis.localStorage as any).length = store.size;
    },
    removeItem: (key: string) => {
      store.delete(key);
      (globalThis.localStorage as any).length = store.size;
    },
    clear: () => {
      store.clear();
      (globalThis.localStorage as any).length = 0;
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    length: 0,
  } as Storage;
}

if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {
    location: {
      origin: 'http://localhost:3000',
    },
  };
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

export class TestGroup {
  name: string;
  results: TestResult[] = [];

  constructor(name: string) {
    this.name = name;
  }

  async test(description: string, fn: () => void | Promise<void>) {
    const start = Date.now();
    try {
      await fn();
      const durationMs = Date.now() - start;
      this.results.push({ name: description, passed: true, durationMs });
      console.log(`  ✓ ${description} (${durationMs}ms)`);
    } catch (err: any) {
      const durationMs = Date.now() - start;
      const errorMsg = err?.message || String(err);
      this.results.push({ name: description, passed: false, error: errorMsg, durationMs });
      console.error(`  ✗ ${description} (${durationMs}ms)`);
      console.error(`    Error: ${errorMsg}`);
    }
  }

  summary() {
    const total = this.results.length;
    const passed = this.results.filter((r) => r.passed).length;
    const failed = total - passed;
    return { name: this.name, total, passed, failed, results: this.results };
  }
}

export function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

export function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(
      `${message ? message + ': ' : ''}Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

export function assertDeepEqual<T>(actual: T, expected: T, message?: string) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(
      `${message ? message + ': ' : ''}Expected ${expectedStr}, got ${actualStr}`
    );
  }
}

export function assertThrows(fn: () => void, expectedErrorSubstring?: string, message?: string) {
  let threw = false;
  try {
    fn();
  } catch (err: any) {
    threw = true;
    if (expectedErrorSubstring && !err.message?.includes(expectedErrorSubstring)) {
      throw new Error(
        `${message ? message + ': ' : ''}Expected error containing "${expectedErrorSubstring}", got "${err.message}"`
      );
    }
  }
  if (!threw) {
    throw new Error(`${message ? message + ': ' : ''}Expected function to throw an error, but it succeeded.`);
  }
}
