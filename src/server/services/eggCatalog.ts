import { DEFAULT_EGG_NESTS, EggNest, VPS_EGG_NEST } from "../../utils/eggCatalog.js";
import { readJSON, writeJSON } from "./db.js";

const cloneDefaults = (): EggNest[] => JSON.parse(JSON.stringify(DEFAULT_EGG_NESTS));

const ensureVpsDefault = (nests: EggNest[]) => {
  const defaultNest = JSON.parse(JSON.stringify(VPS_EGG_NEST)) as EggNest;
  let nest = nests.find(item => item.id === defaultNest.id);
  if (!nest) {
    nests.push(defaultNest);
    return true;
  }
  if (!Array.isArray(nest.eggs)) nest.eggs = [];
  const defaultEgg = defaultNest.eggs[0];
  const existingEgg = nest.eggs.find(egg => egg.id === defaultEgg.id);
  if (!existingEgg) {
    nest.eggs.push(defaultEgg);
    return true;
  }

  if (!Array.isArray(existingEgg.variables)) existingEgg.variables = [];
  let changed = false;
  for (const variable of defaultEgg.variables) {
    if (existingEgg.variables.some(item => item.envVariable === variable.envVariable)) continue;
    existingEgg.variables.push(variable);
    changed = true;
  }
  return changed;
};

export const getEggNests = async (): Promise<EggNest[]> => {
  const nests = await readJSON("egg_nests.json");
  if (Array.isArray(nests)) {
    if (ensureVpsDefault(nests)) await writeJSON("egg_nests.json", nests);
    return nests;
  }

  const defaults = cloneDefaults();
  await writeJSON("egg_nests.json", defaults);
  return defaults;
};

export const saveEggNests = async (nests: EggNest[]) => {
  await writeJSON("egg_nests.json", nests);
};