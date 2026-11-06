import express from "express";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth.js";
import { EggDefinition, EggNest } from "../../utils/eggCatalog.js";
import { getEggNests, saveEggNests } from "../services/eggCatalog.js";
import { readJSON } from "../services/db.js";

const router = express.Router();
router.use(requireAuth);

const requireAdmin = (req: express.Request, res: express.Response) => {
  const user = (req as any).user;
  if (user.role === "admin" || user.role === "owner") return true;
  res.status(403).json({ error: "Admin access required" });
  return false;
};

const normalizeVariables = (variables: any[]): EggDefinition["variables"] => {
  if (!Array.isArray(variables)) return [];
  return variables.map(variable => ({
    name: String(variable.name || variable.env_variable || "Variable").trim(),
    envVariable: String(variable.envVariable || variable.env_variable || "").trim(),
    defaultValue: String(variable.defaultValue ?? variable.default_value ?? ""),
    userViewable: variable.userViewable ?? variable.user_viewable ?? true,
    userEditable: variable.userEditable ?? variable.user_editable ?? true,
    rules: Array.isArray(variable.rules) ? variable.rules.join("|") : String(variable.rules || ""),
    fieldType: variable.fieldType === "boolean" || variable.field_type === "boolean" ? "boolean" : "text"
  }));
};

const makeEgg = (body: any, nestId: string, id: string = crypto.randomUUID()): EggDefinition | string => {
  const name = String(body.name || "").trim();
  const runtime = ["minecraft", "generic", "custom"].includes(body.runtime) ? body.runtime as EggDefinition["runtime"] : null;
  if (!name) return "Egg name is required.";
  if (!runtime) return "Egg runtime must be Minecraft, Generic, or Custom host process.";

  const dockerImages = Array.isArray(body.dockerImages)
    ? body.dockerImages
    : Array.isArray(body.docker_images)
      ? Object.values(body.docker_images)
      : body.dockerImage || body.image
        ? [body.dockerImage || body.image]
        : [];
  const type = String(body.type || body.serverType || (runtime === "minecraft" ? "paper" : "custom")).trim().toLowerCase();
  if (runtime === "generic" && !["nodejs", "python"].includes(type) && dockerImages.length === 0) {
    return "Generic egg requires at least one Docker image.";
  }
  const startup = String(body.startup || body.startupCommand || "").trim();
  if (runtime === "custom" && !startup) {
    return "Custom runtime egg requires a startup command.";
  }
  const variables = normalizeVariables(body.variables || []);
  if (variables.some(variable => !/^[A-Z_][A-Z0-9_]*$/.test(variable.envVariable))) {
    return "Environment variable names must use uppercase letters, numbers, and underscores.";
  }

  return {
    id,
    nestId,
    name,
    description: String(body.description || "").trim(),
    runtime,
    type,
    dockerImages: dockerImages.map((image: unknown) => String(image).trim()).filter(Boolean),
    startup,
    variables
  };
};

router.get("/", async (_req, res) => {
  res.json(await getEggNests());
});

router.post("/nests", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const name = String(req.body.name || "").trim();
  if (!name) return res.status(400).json({ error: "Nest name is required." });
  const nests = await getEggNests();
  const nest: EggNest = {
    id: crypto.randomUUID(),
    name,
    description: String(req.body.description || "").trim(),
    eggs: []
  };
  nests.push(nest);
  await saveEggNests(nests);
  res.status(201).json(nest);
});

router.put("/nests/:nestId", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const nests = await getEggNests();
  const nest = nests.find(item => item.id === req.params.nestId);
  if (!nest) return res.status(404).json({ error: "Nest not found." });
  const name = String(req.body.name || "").trim();
  if (!name) return res.status(400).json({ error: "Nest name is required." });
  nest.name = name;
  nest.description = String(req.body.description || "").trim();
  await saveEggNests(nests);
  res.json(nest);
});

router.delete("/nests/:nestId", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const nests = await getEggNests();
  const index = nests.findIndex(item => item.id === req.params.nestId);
  if (index === -1) return res.status(404).json({ error: "Nest not found." });
  const eggIds = new Set(nests[index].eggs.map(egg => egg.id));
  const servers = await readJSON("servers.json") || [];
  if (servers.some((server: any) => eggIds.has(server.eggId))) {
    return res.status(409).json({ error: "This nest contains eggs used by existing servers." });
  }
  nests.splice(index, 1);
  await saveEggNests(nests);
  res.json({ success: true });
});

router.post("/nests/:nestId/eggs", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const nests = await getEggNests();
  const nest = nests.find(item => item.id === req.params.nestId);
  if (!nest) return res.status(404).json({ error: "Nest not found." });
  const egg = makeEgg(req.body, nest.id);
  if (typeof egg === "string") return res.status(400).json({ error: egg });
  nest.eggs.push(egg);
  await saveEggNests(nests);
  res.status(201).json(egg);
});

router.post("/nests/:nestId/import", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const nests = await getEggNests();
  const nest = nests.find(item => item.id === req.params.nestId);
  if (!nest) return res.status(404).json({ error: "Nest not found." });

  const source = req.body.egg && typeof req.body.egg === "object" ? req.body.egg : req.body;
  const imported = makeEgg({
    ...source,
    runtime: req.body.runtime || source.runtime,
    docker_images: source.docker_images || source.dockerImages,
    variables: source.variables
  }, nest.id);
  if (typeof imported === "string") return res.status(400).json({ error: imported });
  nest.eggs.push(imported);
  await saveEggNests(nests);
  res.status(201).json(imported);
});

router.put("/nests/:nestId/eggs/:eggId", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const nests = await getEggNests();
  const nest = nests.find(item => item.id === req.params.nestId);
  if (!nest) return res.status(404).json({ error: "Nest not found." });
  const index = nest.eggs.findIndex(egg => egg.id === req.params.eggId);
  if (index === -1) return res.status(404).json({ error: "Egg not found." });
  const egg = makeEgg(req.body, nest.id, req.params.eggId);
  if (typeof egg === "string") return res.status(400).json({ error: egg });
  nest.eggs[index] = egg;
  await saveEggNests(nests);
  res.json(egg);
});

router.delete("/nests/:nestId/eggs/:eggId", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const nests = await getEggNests();
  const nest = nests.find(item => item.id === req.params.nestId);
  if (!nest) return res.status(404).json({ error: "Nest not found." });
  const index = nest.eggs.findIndex(egg => egg.id === req.params.eggId);
  if (index === -1) return res.status(404).json({ error: "Egg not found." });
  const servers = await readJSON("servers.json") || [];
  if (servers.some((server: any) => server.eggId === req.params.eggId)) {
    return res.status(409).json({ error: "This egg is used by an existing server." });
  }
  nest.eggs.splice(index, 1);
  await saveEggNests(nests);
  res.json({ success: true });
});

export default router;