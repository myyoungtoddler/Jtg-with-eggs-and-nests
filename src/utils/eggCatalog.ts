export interface EggDefinition {
  id: string;
  nestId: string;
  name: string;
  description: string;
  runtime: "minecraft" | "generic" | "custom";
  type: string;
  dockerImages: string[];
  startup: string;
  variables: EggVariable[];
  pterodactylJson?: Record<string, unknown>;
}

export interface EggVariable {
  name: string;
  envVariable: string;
  defaultValue: string;
  userViewable: boolean;
  userEditable: boolean;
  rules?: string;
  fieldType?: "text" | "boolean";
}

export interface EggNest {
  id: string;
  name: string;
  description: string;
  eggs: EggDefinition[];
}

const makeEgg = (nestId: string, id: string, name: string, description: string, runtime: EggDefinition["runtime"], type = id): EggDefinition => ({
  id,
  nestId,
  name,
  description,
  runtime,
  type,
  dockerImages: [],
  startup: "",
  variables: []
});

export const DEFAULT_EGG_NESTS: EggNest[] = [
  {
    id: "minecraft",
    name: "Minecraft",
    description: "Minecraft servers and proxies",
    eggs: [
      makeEgg("minecraft", "paper", "Paper", "High-performance plugin server", "minecraft"),
      makeEgg("minecraft", "spigot", "Spigot", "Classic plugin server", "minecraft"),
      makeEgg("minecraft", "fabric", "Fabric", "Lightweight modded server", "minecraft"),
      makeEgg("minecraft", "forge", "Forge", "Classic modded server", "minecraft"),
      makeEgg("minecraft", "bungeecord", "BungeeCord", "Minecraft proxy server", "minecraft"),
      makeEgg("minecraft", "velocity", "Velocity", "Modern Minecraft proxy", "minecraft")
    ]
  },
  {
    id: "generic",
    name: "Generic",
    description: "Application and script runtimes",
    eggs: [
      makeEgg("generic", "nodejs", "Node.js", "JavaScript and TypeScript applications", "generic"),
      makeEgg("generic", "python", "Python", "Python applications and scripts", "generic")
    ]
  }
];

export const EGG_NESTS = DEFAULT_EGG_NESTS.map(nest => ({
  id: nest.id,
  name: nest.name,
  eggIds: nest.eggs.map(egg => egg.id)
}));

export const EGG_DEFINITIONS: Record<string, EggDefinition> = Object.fromEntries(
  DEFAULT_EGG_NESTS.flatMap(nest => nest.eggs.map(egg => [egg.id, egg]))
);

export const getEggDefinition = (eggId: string) => EGG_DEFINITIONS[eggId];

export const findEgg = (nests: EggNest[], eggId: string) =>
  nests.flatMap(nest => nest.eggs).find(egg => egg.id === eggId);