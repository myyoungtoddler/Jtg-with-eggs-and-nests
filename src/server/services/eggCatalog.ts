import { DEFAULT_EGG_NESTS, EggNest } from "../../utils/eggCatalog.js";
import { readJSON, writeJSON } from "./db.js";

const cloneDefaults = (): EggNest[] => JSON.parse(JSON.stringify(DEFAULT_EGG_NESTS));

export const getEggNests = async (): Promise<EggNest[]> => {
  const nests = await readJSON("egg_nests.json");
  if (Array.isArray(nests)) return nests;

  const defaults = cloneDefaults();
  await writeJSON("egg_nests.json", defaults);
  return defaults;
};

export const saveEggNests = async (nests: EggNest[]) => {
  await writeJSON("egg_nests.json", nests);
};