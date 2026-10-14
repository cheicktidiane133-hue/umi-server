import { useEffect, useState } from "react";
import Machines from "./Machines";
import MachineCategory from "./MachineCategory";
import "./LiveMachineSelector.css";

export function getCategoryMachineIds(machines, category) {
  const normalize = (value) => String(value || "")
    .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim();
  const selected = normalize(typeof category === "string" ? category : category?.name || category?.category || category?.categorie);
  if (!selected) return [];
  return [...new Set(machines.filter((machine) => {
    const value = normalize(machine.category || machine.categorie || machine.categoryName || machine.categorieName);
    return value && (value === selected || value.includes(selected) || selected.includes(value));
  }).map((machine) => machine.id).filter(Boolean))];
}

export default function LiveMachineSelector({ machines = [], multiple = false, onSelect, onBack }) {
  const [category, setCategory] = useState(null);
  useEffect(() => {
    const previousScroll = window.scrollY;
    window.scrollTo(0, 0);
    return () => window.scrollTo(0, previousScroll);
  }, []);
  const selectCategory = (value) => {
    if (multiple) onSelect(getCategoryMachineIds(machines, value));
    else setCategory(value);
  };
  const selectMachine = (machine) => {
    if (multiple) selectCategory(machine.category || machine.categorie || machine.categoryName || machine.categorieName);
    else onSelect(machine);
  };
  if (multiple) {
    const normalize = (value) => String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
    const catalogues = new Map();
    for (const machine of machines) {
      const name = machine.category || machine.categorie || machine.categoryName || machine.categorieName || "";
      if (typeof name === "string" && name.trim()) catalogues.set(normalize(name), name.trim());
    }
    const names = [...catalogues.values()].sort((a, b) => a.localeCompare(b, "fr"));
    return <div className="umi-live-catalog-selection">
      <header className="umi-live-catalog-heading"><button type="button" onClick={onBack}>← Retour au live</button><strong>Machines similaires · Catégories</strong></header>
      <main style={{ width: "100%", maxWidth: 720, margin: "0 auto", padding: 16 }}>
        <p style={{ color: "#163a5c" }}>Choisissez une catégorie : toutes ses machines seront sélectionnées automatiquement.</p>
        <div style={{ display: "grid", gap: 12 }}>
          {names.map((name) => <button type="button" key={name} onClick={() => selectCategory(name)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 18, border: "1px solid #c7dced", borderRadius: 12, background: "#fff", color: "#163a5c", textAlign: "left", cursor: "pointer" }}><span><strong>{name}</strong><small style={{ display: "block", marginTop: 6 }}>{getCategoryMachineIds(machines, name).length} machine(s) dans ce catalogue</small></span><span aria-hidden="true">›</span></button>)}
        </div>
        {!names.length && <p>Aucune catégorie de machines disponible.</p>}
      </main>
    </div>;
  }
  return <div className="umi-live-catalog-selection">
    <header className="umi-live-catalog-heading">
      <button type="button" onClick={onBack}>← Retour au live</button>
      <strong>{multiple ? "Choisir le catalogue des machines similaires" : "Machine présentée"}</strong>
    </header>
    {multiple && <p style={{ padding: "12px 16px", margin: 0, color: "#163a5c" }}>Choisissez une catégorie : toutes les machines de ce catalogue seront automatiquement sélectionnées.</p>}
    {category ? <MachineCategory machines={machines} category={category} onBack={() => setCategory(null)} onOpenProduct={selectMachine} /> : <Machines machines={machines} onBack={onBack} onOpenCategory={selectCategory} onOpenProduct={selectMachine} onHome={onBack} onMachines={() => setCategory(null)} onLive={onBack} onCart={onBack} onAccount={onBack} />}
  </div>;
}
