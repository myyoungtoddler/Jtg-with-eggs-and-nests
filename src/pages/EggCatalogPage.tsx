import React, { useEffect, useState } from "react";
import axios from "axios";
import { Download, FileUp, FolderTree, Package, Plus, Save, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import { EggDefinition, EggNest } from "../utils/eggCatalog";

const emptyEgg = (): Partial<EggDefinition> => ({
  name: "",
  description: "",
  runtime: "custom",
  type: "custom",
  dockerImages: [],
  startup: "",
  variables: []
});

export default function EggCatalogPage() {
  const { user } = useAuth();
  const [nests, setNests] = useState<EggNest[]>([]);
  const [selectedNestId, setSelectedNestId] = useState("");
  const [selectedEggId, setSelectedEggId] = useState("");
  const [eggForm, setEggForm] = useState<Partial<EggDefinition>>(emptyEgg());
  const [newNestName, setNewNestName] = useState("");
  const [nestDescription, setNestDescription] = useState("");
  const [nestName, setNestName] = useState("");
  const [imagesText, setImagesText] = useState("");
  const [variablesText, setVariablesText] = useState("[]");
  const [importRuntime, setImportRuntime] = useState<"minecraft" | "generic" | "custom">("generic");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const selectedNest = nests.find(nest => nest.id === selectedNestId);
  const selectedEgg = selectedNest?.eggs.find(egg => egg.id === selectedEggId);

  const fetchNests = async (preferredNestId?: string) => {
    const { data } = await axios.get<EggNest[]>("/api/eggs");
    setNests(data);
    const nextNestId = preferredNestId || selectedNestId || data[0]?.id || "";
    setSelectedNestId(data.some(nest => nest.id === nextNestId) ? nextNestId : data[0]?.id || "");
  };

  useEffect(() => {
    fetchNests().catch(() => setNotice("Could not load egg catalog."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setNestName(selectedNest?.name || "");
    setNestDescription(selectedNest?.description || "");
    if (!selectedNest?.eggs.some(egg => egg.id === selectedEggId)) {
      setSelectedEggId(selectedNest?.eggs[0]?.id || "");
    }
  }, [selectedNestId, nests]);

  useEffect(() => {
    if (!selectedEgg) {
      setEggForm(emptyEgg());
      setImagesText("");
      setVariablesText("[]");
      return;
    }
    setEggForm({ ...selectedEgg });
    setImagesText(selectedEgg.dockerImages.join("\n"));
    setVariablesText(JSON.stringify(selectedEgg.variables, null, 2));
  }, [selectedEggId, nests]);

  const runAction = async (action: () => Promise<void>) => {
    setBusy(true);
    setNotice("");
    try {
      await action();
    } catch (error: any) {
      setNotice(error.response?.data?.error || error.message || "Request failed.");
    } finally {
      setBusy(false);
    }
  };

  const createNest = () => runAction(async () => {
    const { data } = await axios.post("/api/eggs/nests", { name: newNestName });
    setNewNestName("");
    await fetchNests(data.id);
    setSelectedEggId("");
    setNotice("Nest created.");
  });

  const saveNest = () => selectedNest && runAction(async () => {
    await axios.put(`/api/eggs/nests/${selectedNest.id}`, { name: nestName, description: nestDescription });
    await fetchNests(selectedNest.id);
    setNotice("Nest saved.");
  });

  const deleteNest = () => selectedNest && runAction(async () => {
    await axios.delete(`/api/eggs/nests/${selectedNest.id}`);
    setSelectedEggId("");
    await fetchNests(nests.find(nest => nest.id !== selectedNest.id)?.id || "");
    setNotice("Nest deleted.");
  });

  const startNewEgg = () => {
    setSelectedEggId("");
    setEggForm(emptyEgg());
    setImagesText("");
    setVariablesText("[]");
  };

  const saveEgg = () => selectedNest && runAction(async () => {
    const variables = JSON.parse(variablesText);
    const payload = {
      ...eggForm,
      dockerImages: imagesText.split(/\r?\n/).map(image => image.trim()).filter(Boolean),
      variables
    };
    if (selectedEggId) {
      await axios.put(`/api/eggs/nests/${selectedNest.id}/eggs/${selectedEggId}`, payload);
    } else {
      const { data } = await axios.post(`/api/eggs/nests/${selectedNest.id}/eggs`, payload);
      setSelectedEggId(data.id);
    }
    await fetchNests(selectedNest.id);
    setNotice("Egg saved.");
  });

  const deleteEgg = () => selectedNest && selectedEgg && runAction(async () => {
    await axios.delete(`/api/eggs/nests/${selectedNest.id}/eggs/${selectedEgg.id}`);
    setSelectedEggId("");
    await fetchNests(selectedNest.id);
    setNotice("Egg deleted.");
  });

  const importEgg = (file: File) => selectedNest && runAction(async () => {
    const parsed = JSON.parse(await file.text());
    const { data } = await axios.post(`/api/eggs/nests/${selectedNest.id}/import`, {
      egg: parsed,
      runtime: importRuntime
    });
    await fetchNests(selectedNest.id);
    setSelectedEggId(data.id);
    setNotice(`Imported ${data.name}.`);
  });

  const exportEgg = () => {
    if (!selectedEgg) return;
    const contents = JSON.stringify({
      ...(selectedEgg.pterodactylJson || {}),
      name: selectedEgg.name,
      description: selectedEgg.description,
      docker_images: selectedEgg.dockerImages,
      startup: selectedEgg.startup,
      variables: selectedEgg.variables.map(variable => ({
        name: variable.name,
        env_variable: variable.envVariable,
        default_value: variable.defaultValue,
        user_viewable: variable.userViewable,
        user_editable: variable.userEditable,
        rules: variable.rules,
        field_type: variable.fieldType || "text"
      }))
    }, null, 2);
    const url = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedEgg.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-egg.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (user?.role !== "admin" && user?.role !== "owner") {
    return <div className="p-8 text-foreground">Admin access required.</div>;
  }

  return (
    <div className="min-h-full text-foreground">
      <PageHeader title="Nests & Eggs" subtitle="SERVER TEMPLATES" />
      <div className="max-w-7xl mx-auto px-5 md:px-8 pb-12">
        {notice && <div role="status" className="mb-5 border border-border-subtle bg-card px-4 py-3 text-sm">{notice}</div>}
        {loading ? (
          <div className="py-16 text-center text-muted-foreground">Loading catalog...</div>
        ) : (
          <div className="grid lg:grid-cols-[270px_minmax(0,1fr)] gap-8">
            <aside className="border-r border-border-subtle pr-5">
              <div className="flex items-center gap-2 mb-4 text-sm font-semibold"><FolderTree size={17} /> Nests</div>
              <div className="space-y-1 mb-5">
                {nests.map(nest => (
                  <button key={nest.id} type="button" onClick={() => setSelectedNestId(nest.id)}
                    className={`w-full text-left px-3 py-2.5 border-l-2 transition-colors ${selectedNestId === nest.id ? "border-theme-500 bg-card text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                    <span className="block text-sm">{nest.name}</span>
                    <span className="block text-xs opacity-70">{nest.eggs.length} eggs</span>
                  </button>
                ))}
              </div>
              <form className="border-t border-border-subtle pt-4" onSubmit={event => { event.preventDefault(); createNest(); }}>
                <label className="block text-xs text-muted-foreground mb-2">Create nest</label>
                <input value={newNestName} onChange={event => setNewNestName(event.target.value)} required maxLength={80}
                  className="w-full bg-card border border-border-subtle px-3 py-2 text-sm outline-none focus:border-theme-500" placeholder="e.g. Source games" />
                <button disabled={busy} className="mt-2 w-full inline-flex justify-center items-center gap-2 bg-theme-600 hover:bg-theme-700 px-3 py-2 text-sm font-medium disabled:opacity-50"><Plus size={16} /> Create nest</button>
              </form>
            </aside>

            {selectedNest ? (
              <section className="min-w-0">
                <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)] gap-8 border-b border-border-subtle pb-7 mb-7">
                  <div>
                    <h2 className="text-lg font-semibold mb-4">Nest settings</h2>
                    <label className="block text-xs text-muted-foreground mb-1.5">Name</label>
                    <input value={nestName} onChange={event => setNestName(event.target.value)} className="w-full bg-card border border-border-subtle px-3 py-2.5 text-sm mb-3" />
                    <label className="block text-xs text-muted-foreground mb-1.5">Description</label>
                    <input value={nestDescription} onChange={event => setNestDescription(event.target.value)} className="w-full bg-card border border-border-subtle px-3 py-2.5 text-sm" />
                    <div className="flex gap-2 mt-3">
                      <button onClick={saveNest} disabled={busy || !nestName.trim()} className="inline-flex items-center gap-2 bg-theme-600 hover:bg-theme-700 px-3 py-2 text-sm disabled:opacity-50"><Save size={15} /> Save nest</button>
                      <button onClick={deleteNest} disabled={busy || selectedNest.eggs.length > 0} title={selectedNest.eggs.length ? "Remove eggs before deleting this nest" : "Delete nest"} className="inline-flex items-center gap-2 border border-border-subtle px-3 py-2 text-sm text-rose-400 disabled:opacity-40"><Trash2 size={15} /> Delete</button>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold mb-4">Eggs</h2>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {selectedNest.eggs.map(egg => (
                        <button key={egg.id} onClick={() => setSelectedEggId(egg.id)} className={`border px-3 py-2 text-sm ${selectedEggId === egg.id ? "border-theme-500 bg-theme-500/10" : "border-border-subtle hover:border-muted-foreground"}`}>
                          <Package className="inline w-4 h-4 mr-2" />{egg.name}
                        </button>
                      ))}
                    </div>
                    <button onClick={startNewEgg} className="inline-flex items-center gap-2 border border-border-subtle px-3 py-2 text-sm"><Plus size={15} /> New egg</button>
                    <div className="mt-5 border-t border-border-subtle pt-4">
                      <label className="block text-xs text-muted-foreground mb-2">Import Pterodactyl egg JSON</label>
                      <div className="flex items-center gap-2 mb-2">
                        <select value={importRuntime} onChange={event => setImportRuntime(event.target.value as "minecraft" | "generic" | "custom")} className="bg-card border border-border-subtle px-2 py-2 text-sm">
                          <option value="generic">Generic runtime</option>
                          <option value="minecraft">Minecraft runtime</option>
                          <option value="custom">Custom host process</option>
                        </select>
                        <label className="inline-flex items-center gap-2 border border-border-subtle px-3 py-2 text-sm cursor-pointer hover:bg-card">
                          <FileUp size={15} /> Import JSON
                          <input type="file" accept=".json,application/json" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) importEgg(file); event.currentTarget.value = ""; }} />
                        </label>
                      </div>
                      <p className="text-xs text-muted-foreground">Pterodactyl metadata is retained on export. Egg install scripts are not executed by this panel.</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-lg font-semibold">{selectedEgg ? `Edit ${selectedEgg.name}` : "Create egg"}</h2>
                    <p className="text-xs text-muted-foreground mt-1">Custom eggs run a startup command on the panel host without a container image.</p>
                  </div>
                  {selectedEgg && <button onClick={exportEgg} className="inline-flex items-center gap-2 border border-border-subtle px-3 py-2 text-sm"><Download size={15} /> Export JSON</button>}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Egg name</label>
                    <input value={eggForm.name || ""} onChange={event => setEggForm(form => ({ ...form, name: event.target.value }))} className="w-full bg-card border border-border-subtle px-3 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Egg runtime</label>
                    <select value={eggForm.runtime || "generic"} onChange={event => setEggForm(form => ({ ...form, runtime: event.target.value as EggDefinition["runtime"] }))} className="w-full bg-card border border-border-subtle px-3 py-2.5 text-sm">
                      <option value="minecraft">Minecraft</option><option value="generic">Generic container</option><option value="custom">Custom host process</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Software type</label>
                    <input value={eggForm.type || "custom"} onChange={event => setEggForm(form => ({ ...form, type: event.target.value }))} className="w-full bg-card border border-border-subtle px-3 py-2.5 text-sm font-mono" placeholder="custom" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Description</label>
                    <input value={eggForm.description || ""} onChange={event => setEggForm(form => ({ ...form, description: event.target.value }))} className="w-full bg-card border border-border-subtle px-3 py-2.5 text-sm" />
                  </div>
                  {eggForm.runtime === "custom" ? (
                    <div className="border border-border-subtle bg-card px-3 py-3 text-sm text-muted-foreground">No Docker image is used. This command runs directly on the panel host.</div>
                  ) : (
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">Docker images (one per line)</label>
                      <textarea value={imagesText} onChange={event => setImagesText(event.target.value)} rows={4} className="w-full bg-card border border-border-subtle px-3 py-2.5 text-sm font-mono" placeholder="ghcr.io/pterodactyl/yolks:java_21" />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Startup command</label>
                    <textarea value={eggForm.startup || ""} onChange={event => setEggForm(form => ({ ...form, startup: event.target.value }))} rows={4} className="w-full bg-card border border-border-subtle px-3 py-2.5 text-sm font-mono" placeholder="java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-muted-foreground mb-1.5">Variables JSON</label>
                    <textarea value={variablesText} onChange={event => setVariablesText(event.target.value)} rows={7} className="w-full bg-card border border-border-subtle px-3 py-2.5 text-sm font-mono" spellCheck={false} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <button onClick={saveEgg} disabled={busy || !String(eggForm.name || "").trim()} className="inline-flex items-center gap-2 bg-theme-600 hover:bg-theme-700 px-4 py-2.5 text-sm font-medium disabled:opacity-50"><Save size={16} /> Save egg</button>
                  {selectedEgg && <button onClick={deleteEgg} disabled={busy} className="inline-flex items-center gap-2 border border-border-subtle px-4 py-2.5 text-sm text-rose-400 disabled:opacity-50"><Trash2 size={16} /> Delete egg</button>}
                </div>
              </section>
            ) : (
              <div className="py-12 text-muted-foreground">Create or select a nest to manage its eggs.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}