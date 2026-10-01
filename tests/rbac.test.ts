import test from "node:test";
import assert from "node:assert/strict";
import { hasStoreAccess, scopedStoreIds, isSuperAdminEmail } from "../lib/auth";
import { SessionUser } from "../lib/types";

const superAdmin: SessionUser = {
  email: "owner@platform.test",
  role: "super_admin",
  storeIds: [],
  isSuperAdmin: true,
};

const storeAdmin: SessionUser = {
  email: "gm@bistro.test",
  role: "store_admin",
  storeIds: ["store_1", "store_2"],
  isSuperAdmin: false,
};

test("hasStoreAccess lets super admins reach every location", () => {
  assert.equal(hasStoreAccess(superAdmin, "any_store"), true);
  assert.equal(hasStoreAccess(superAdmin, "store_1"), true);
});

test("hasStoreAccess blocks store admins from unassigned locations", () => {
  assert.equal(hasStoreAccess(storeAdmin, "store_1"), true);
  assert.equal(hasStoreAccess(storeAdmin, "store_2"), true);
  assert.equal(hasStoreAccess(storeAdmin, "store_3"), false);
});

test("scopedStoreIds returns null for super admins and the assignment list for store admins", () => {
  assert.equal(scopedStoreIds(superAdmin), null);
  assert.deepEqual(scopedStoreIds(storeAdmin), ["store_1", "store_2"]);
});

test("isSuperAdminEmail matches the configured platform owner case-insensitively", () => {
  const previous = process.env.ADMIN_ALLOWED_EMAIL;
  process.env.ADMIN_ALLOWED_EMAIL = "Owner@Platform.test";

  try {
    assert.equal(isSuperAdminEmail("owner@platform.test"), true);
    assert.equal(isSuperAdminEmail("  OWNER@PLATFORM.TEST  "), true);
    assert.equal(isSuperAdminEmail("gm@bistro.test"), false);
  } finally {
    if (previous === undefined) {
      delete process.env.ADMIN_ALLOWED_EMAIL;
    } else {
      process.env.ADMIN_ALLOWED_EMAIL = previous;
    }
  }
});
