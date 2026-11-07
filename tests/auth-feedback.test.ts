import assert from "node:assert/strict";
import test from "node:test";

import { getSignupStatus } from "../src/lib/auth-feedback";

test("clasifica una cuenta existente devuelta por Supabase", () => {
  assert.equal(
    getSignupStatus({
      error: { message: "User already registered" },
      user: null,
    }),
    "account_exists",
  );
});

test("clasifica una cuenta existente sin identidades", () => {
  assert.equal(
    getSignupStatus({
      error: null,
      user: { identities: [] },
    }),
    "account_exists",
  );
});

test("clasifica una alta que requiere verificación", () => {
  assert.equal(
    getSignupStatus({
      error: null,
      user: { identities: [{ id: "identity" }] },
    }),
    "verification_sent",
  );
});

test("conserva errores desconocidos como error genérico", () => {
  assert.equal(
    getSignupStatus({
      error: { message: "Unexpected provider failure" },
      user: null,
    }),
    "error",
  );
});
