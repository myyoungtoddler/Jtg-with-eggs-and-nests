import vpsEggJson from "../../egg-vps.json";

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

export const VPS_INSTALL_DISTROS = [
  { selection: "1", name: "Debian", slug: "debian", custom: false },
  { selection: "2", name: "Ubuntu", slug: "ubuntu", custom: false },
  { selection: "3", name: "Void Linux", slug: "voidlinux", custom: true },
  { selection: "4", name: "Alpine Linux", slug: "alpine", custom: false },
  { selection: "5", name: "CentOS", slug: "centos", custom: false },
  { selection: "6", name: "Rocky Linux", slug: "rockylinux", custom: false },
  { selection: "7", name: "Fedora", slug: "fedora", custom: false },
  { selection: "8", name: "AlmaLinux", slug: "almalinux", custom: false },
  { selection: "9", name: "Slackware Linux", slug: "slackware", custom: false },
  { selection: "10", name: "Kali Linux", slug: "kali", custom: false },
  { selection: "11", name: "openSUSE", slug: "opensuse", custom: false },
  { selection: "12", name: "Gentoo Linux", slug: "gentoo", custom: true },
  { selection: "13", name: "Arch Linux", slug: "archlinux", custom: false },
  { selection: "14", name: "Devuan Linux", slug: "devuan", custom: false },
  { selection: "15", name: "Chimera Linux", slug: "chimera", custom: true, customHandler: true },
  { selection: "16", name: "Oracle Linux", slug: "oracle", custom: false },
  { selection: "17", name: "Amazon Linux", slug: "amazonlinux", custom: false },
  { selection: "18", name: "Plamo Linux", slug: "plamo", custom: false },
  { selection: "19", name: "Linux Mint", slug: "mint", custom: false },
  { selection: "20", name: "Alt Linux", slug: "alt", custom: false },
  { selection: "21", name: "Funtoo Linux", slug: "funtoo", custom: false },
  { selection: "22", name: "openEuler", slug: "openeuler", custom: false },
  { selection: "23", name: "Springdale Linux", slug: "springdalelinux", custom: false }
];

const vpsEgg: EggDefinition = {
  id: "vps-egg",
  nestId: "vps",
  name: vpsEggJson.name,
  description: vpsEggJson.description,
  runtime: "generic",
  type: "vps",
  dockerImages: Object.values(vpsEggJson.docker_images),
  startup: vpsEggJson.startup,
  variables: [
    ...vpsEggJson.variables.map<EggVariable>(variable => ({
    name: variable.name,
    envVariable: variable.env_variable,
    defaultValue: variable.default_value,
    userViewable: variable.user_viewable,
    userEditable: variable.user_editable,
    rules: variable.rules,
    fieldType: variable.field_type === "boolean" ? "boolean" : "text"
    })),
    { name: "VPS distribution selection", envVariable: "VPS_DISTRO_SELECTION", defaultValue: "2", userViewable: false, userEditable: true },
    { name: "VPS release selection", envVariable: "VPS_RELEASE_SELECTION", defaultValue: "1", userViewable: false, userEditable: true },
    { name: "VPS release prompt required", envVariable: "VPS_RELEASE_REQUIRED", defaultValue: "true", userViewable: false, userEditable: true }
  ],
  pterodactylJson: vpsEggJson
};

export const VPS_EGG_NEST: EggNest = {
  id: "vps",
  name: "VPS",
  description: "Virtual private server eggs",
  eggs: [vpsEgg]
};

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
  },
  VPS_EGG_NEST
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