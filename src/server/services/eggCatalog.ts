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
  if (nest.eggs.some(egg => egg.id === defaultNest.eggs[0].id)) return false;
  nest.eggs.push(defaultNest.eggs[0]);
  return true;
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