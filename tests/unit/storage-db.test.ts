import "fake-indexeddb/auto";

import { afterEach, describe, expect, it } from "vitest";

import { createAttiDatabase } from "../../src/storage/db";
import {
  ATTI_DB_NAME,
  ATTI_DB_STORES,
  ATTI_DB_VERSION,
  type AttiDbStoreName
} from "../../src/storage/schema";

afterEach(async () => {
  const db = createAttiDatabase(ATTI_DB_NAME);
  db.close();
  await db.delete();
});

describe("storage database shell", () => {
  it("opens successfully", async () => {
    const db = createAttiDatabase(ATTI_DB_NAME);

    await db.open();

    expect(db.isOpen()).toBe(true);

    db.close();
  });

  it("registers all expected stores", async () => {
    const db = createAttiDatabase(ATTI_DB_NAME);

    await db.open();

    const actualStoreNames = db.tables.map((table) => table.name).sort();
    const expectedStoreNames = Object.keys(ATTI_DB_STORES).sort();

    expect(actualStoreNames).toEqual(expectedStoreNames);

    db.close();
  });

  it("keeps schema version explicit and stable", async () => {
    const db = createAttiDatabase(ATTI_DB_NAME);

    await db.open();

    expect(db.verno).toBe(ATTI_DB_VERSION);

    const storeNames = Object.keys(ATTI_DB_STORES) as AttiDbStoreName[];

    for (const storeName of storeNames) {
      expect(ATTI_DB_STORES[storeName]).toContain("id");
    }

    db.close();
  });
});
