import { describe, it as nodeIt } from "node:test";
import assert from "node:assert/strict";

type TestFn = typeof nodeIt;
type TestWithEach = TestFn & {
  each<T>(cases: T[]): (name: string, fn: (value: T) => void | Promise<void>) => void;
};

function format(value: unknown) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

export function expect<T>(received: T) {
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
    toBeNull() {
      assert.equal(received, null);
    },
    toBeDefined() {
      assert.notEqual(received, undefined);
    },
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
