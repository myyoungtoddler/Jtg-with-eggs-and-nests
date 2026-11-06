import assert from "assert";
import fs from "fs-extra";
import path from "path";
import { createLocalServer, getLocalServerLogs, startLocalServer, stopLocalServer } from "../../src/server/services/local.js";

const id = `custom-runtime-test-${Date.now()}`;
const serverPath = path.join(process.cwd(), ".data", "servers", id);
const previousJwtSecret = process.env.JWT_SECRET;

async function run() {
  process.env.JWT_SECRET = "panel-secret-must-not-leak";
  const server = {
    id,
    name: "Custom Runtime Test",
    port: 25565,
    ram: 1,
    type: "custom",
    eggRuntime: "custom",
    startupCommand: `printf "CUSTOM=%s;SECRET=%s\\n" "{{CUSTOM_VALUE}}" "$JWT_SECRET"`,
    eggEnvironment: { CUSTOM_VALUE: "available" }
  };

  try {
    assert.strictEqual(await createLocalServer(server), `local-${id}`);
    assert.strictEqual(await fs.pathExists(path.join(serverPath, "server.jar")), false);

    await startLocalServer(id, server);
    const logs = await getLocalServerLogs(id);
    assert.match(logs, /CUSTOM=available;SECRET=/);
    assert.doesNotMatch(logs, /panel-secret-must-not-leak/);
    console.log("Custom runtime checks passed.");
  } finally {
    await stopLocalServer(id);
    await fs.remove(serverPath);
    if (previousJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousJwtSecret;
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});