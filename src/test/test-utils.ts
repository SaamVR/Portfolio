import { describe, it as nodeIt } from "node:test";
import assert from "node:assert/strict";

type TestFn = typeof nodeIt;
type TestWithEach = TestFn & {
  each<T>(cases: T[]): (name: string, fn: (value: T) => void | Promise<void>) => void;
};

function format(value: unknown) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function includesValue(received: unknown, expected: unknown) {
  if (typeof received === "string") return received.includes(String(expected));
  if (Array.isArray(received)) return received.includes(expected);
  assert.fail(`Expected an includable string or array, received ${format(received)}`);
}

function matchPattern(received: unknown, expected: string | RegExp) {
  assert.equal(typeof received, "string", `Expected a string, received ${format(received)}`);
  return expected instanceof RegExp ? expected : new RegExp(expected);
}

function assertPartialMatch(received: unknown, expected: unknown): void {
  if (Array.isArray(expected)) {
    assert.ok(Array.isArray(received), `Expected an array, received ${format(received)}`);
    assert.ok(received.length >= expected.length, `Expected ${format(received)} to contain ${format(expected)}`);
    expected.forEach((value, index) => assertPartialMatch(received[index], value));
    return;
  }

  if (expected !== null && typeof expected === "object") {
    assert.ok(received !== null && typeof received === "object", `Expected an object, received ${format(received)}`);
    for (const [key, value] of Object.entries(expected as Record<string, unknown>)) {
      assert.ok(Object.prototype.hasOwnProperty.call(received, key), `Expected object to contain key ${key}`);
      assertPartialMatch((received as Record<string, unknown>)[key], value);
    }
    return;
  }

  assert.deepEqual(received, expected);
}

export function expect<T>(received: T) {
  const not = {
    toContain(expected: unknown) {
      assert.equal(includesValue(received, expected), false, `Expected ${format(received)} not to contain ${format(expected)}`);
    },
    toMatch(expected: string | RegExp) {
      assert.doesNotMatch(received as string, matchPattern(received, expected));
    },
  };

  return {
    toBe(expected: unknown) {
      assert.equal(received, expected);
    },
    toEqual(expected: unknown) {
      assert.deepEqual(received, expected);
    },
    toHaveLength(length: number) {
      assert.equal((received as { length?: number }).length, length);
    },
    toBeGreaterThan(value: number) {
      assert.equal(typeof received, "number", `Expected a number, received ${format(received)}`);
      assert.ok((received as number) > value, `Expected ${received} to be greater than ${value}`);
    },
    toBeGreaterThanOrEqual(value: number) {
      assert.equal(typeof received, "number", `Expected a number, received ${format(received)}`);
      assert.ok((received as number) >= value, `Expected ${received} to be greater than or equal to ${value}`);
    },
    toBeNull() {
      assert.equal(received, null);
    },
    toBeDefined() {
      assert.notEqual(received, undefined);
    },
    toBeTruthy() {
      assert.ok(received);
    },
    toContain(expected: unknown) {
      assert.equal(includesValue(received, expected), true, `Expected ${format(received)} to contain ${format(expected)}`);
    },
    toMatch(expected: string | RegExp) {
      assert.match(received as string, matchPattern(received, expected));
    },
    toMatchObject(expected: unknown) {
      assertPartialMatch(received, expected);
    },
    not,
  };
}

export const it = nodeIt as TestWithEach;

it.each = function each<T>(cases: T[]) {
  return (name: string, fn: (value: T) => void | Promise<void>) => {
    for (const value of cases) {
      it(name.replace("%s", String(value)), () => fn(value));
    }
  };
};

export { describe };
