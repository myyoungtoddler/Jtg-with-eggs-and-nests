import assert from "assert";
import { canAccessServer, hasServerPermission } from "../../src/server/utils/serverAccess.js";

const server = {
  id: "server-1",
  owner: "owner-1",
  subUsers: [
    { userId: "console-user", permissions: ["console", "start"] },
    { userId: "files-user", permissions: ["files"] }
  ]
};

assert.strictEqual(canAccessServer(server, { id: "console-user", role: "user" }), true);
assert.strictEqual(hasServerPermission(server, { id: "console-user", role: "user" }, "console"), true);
assert.strictEqual(hasServerPermission(server, { id: "console-user", role: "user" }, "stop"), false);
assert.strictEqual(hasServerPermission(server, { id: "files-user", role: "user" }, "console"), false);
assert.strictEqual(canAccessServer(server, { id: "outsider", role: "user" }), false);
assert.strictEqual(hasServerPermission(server, { id: "admin", role: "admin" }, "console"), true);

console.log("Server access permission checks passed.");