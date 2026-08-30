import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_COLLECTION_PAGE_SIZE,
  buildAdminCollectionPage,
  getAdminCollectionRange,
  normalizeAdminCollectionSearch,
  normalizeAdminOrSearch,
} from "./admin-collection-pagination";

test("admin collection range requests one lookahead row", () => {
  assert.deepEqual(getAdminCollectionRange(0), {
    page: 0,
    pageSize: ADMIN_COLLECTION_PAGE_SIZE,
    from: 0,
    to: ADMIN_COLLECTION_PAGE_SIZE,
  });
  assert.deepEqual(getAdminCollectionRange(2, 25), {
    page: 2,
    pageSize: 25,
    from: 50,
    to: 75,
  });
});

test("admin collection page exposes a deterministic next page", () => {
  const rows = Array.from({ length: 31 }, (_, index) => ({ id: index }));
  const page = buildAdminCollectionPage(rows, 4, 30);

  assert.equal(page.items.length, 30);
  assert.equal(page.page, 4);
  assert.equal(page.hasNext, true);
  assert.equal(page.nextPage, 5);
  assert.deepEqual(page.items.at(-1), { id: 29 });
});

test("admin collection page stops when no lookahead row exists", () => {
  const page = buildAdminCollectionPage([{ id: 1 }, { id: 2 }], 0, 30);
  assert.equal(page.hasNext, false);
  assert.equal(page.nextPage, null);
});

test("admin search normalization is bounded and whitespace-stable", () => {
  assert.equal(normalizeAdminCollectionSearch("  blue   shirt  "), "blue shirt");
  assert.equal(normalizeAdminCollectionSearch("abcdef", 4), "abcd");
});

test("PostgREST OR search removes filter-grammar delimiters while preserving Unicode", () => {
  assert.equal(normalizeAdminOrSearch("  রাহিম,(#123).*  "), "রাহিম #123");
});
