
"use client";

import { useEffect, useState } from "react";


export default function PaintInventory() {
  const [paints, setPaints] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [addPaintOpen, setAddPaintOpen] = useState(false);
  const [editingPaintId, setEditingPaintId] = useState(null);

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [color, setColor] = useState("#4287f5");
const [pigmentCount, setPigmentCount] = useState(1);
const [pigmentCodes, setPigmentCodes] = useState([""]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/inventory", {cache:"no-store"});
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load paint inventory.");
        if (active) {setPaints(data);setLoaded(true);setError("");}
      } catch(error) {if (active) setError(error.message);}
    }
    load();
    window.addEventListener("paintmix-data-imported",load);
    window.addEventListener("focus",load);
    return () => {active=false;window.removeEventListener("paintmix-data-imported",load);window.removeEventListener("focus",load);};
  }, []);

  async function updateInventory(options, query = "") {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/inventory${query}`, {headers:{"Content-Type":"application/json"},...options});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save your paint inventory.");
      setPaints(data);
      window.dispatchEvent(new Event("paintmix-inventory-updated"));
      return true;
    } catch(error) {setError(error.message);return false;}
    finally {setBusy(false);}
  }
  async function addPaint(event) {
    event.preventDefault();
    if (!name.trim() || busy || !loaded) return;
    const existing = paints.find(paint => paint.id === editingPaintId);
    const paint = {
      ...(existing || {id:crypto.randomUUID(),available:true}),
      name:name.trim(), brand:brand.trim(), color,
      pigmentCodes:pigmentCodes.map(code=>code.trim().toUpperCase()).filter(Boolean),
    };
    if (await updateInventory({method:"POST",body:JSON.stringify({paint})})) {
      setEditingPaintId(null);setName("");setBrand("");setColor("#4287f5");setPigmentCount(1);setPigmentCodes([""]);
    }
  }
  async function removePaint(id) {
    if (window.confirm("Remove this paint from your online inventory?")) await updateInventory({method:"DELETE"},`?id=${encodeURIComponent(id)}`);
  }
function startEditing(paint) {
  setEditingPaintId(paint.id);
  setName(paint.name);
  setBrand(paint.brand || "");
  setColor(paint.color);

  const codes = paint.pigmentCodes?.length
    ? paint.pigmentCodes
    : [""];

  setPigmentCount(codes.length);
  setPigmentCodes([...codes]);

  setAddPaintOpen(true);
  setInventoryOpen(false);
}
  async function toggleAvailability(id) {
    const paint = paints.find(paint=>paint.id===id);
    if (paint) await updateInventory({method:"POST",body:JSON.stringify({paint:{...paint,available:!paint.available}})});
  }

  return (
    <div className="mt-5 space-y-5">
      <p className="text-sm text-slate-500">Shared paint inventory · Saved online.</p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {busy && <p role="status" className="text-sm text-slate-500">Saving inventory…</p>}
      <button
  disabled={busy || !loaded}
  type="button"
  onClick={() => {
  setInventoryOpen(!inventoryOpen);
  setAddPaintOpen(false);
}}
  className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-slate-50 p-4 text-left font-semibold"
  aria-expanded={inventoryOpen}
>
  <span>🎨 My Paint Inventory ({paints.length} paints)</span>
  <span>{inventoryOpen ? "▲" : "▼"}</span>
</button>
<button
  disabled={busy || !loaded}
  type="button"
  onClick={() => {
  setAddPaintOpen(!addPaintOpen);
  setInventoryOpen(false);
}}
  className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-slate-50 p-4 font-semibold"
  aria-expanded={addPaintOpen}
>
  <span>➕ Add New Paint</span>
  <span>{addPaintOpen ? "▲" : "▼"}</span>
</button>
{addPaintOpen && (
  <div className="space-y-5">
      <form onSubmit={addPaint} className="space-y-3">
        <input
          type="text"
          placeholder="Paint name (e.g. Titanium White)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-lg border border-slate-300 p-3"
        />

        <input
          type="text"
          placeholder="Brand (e.g. Liquitex)"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          className="w-full rounded-lg border border-slate-300 p-3"
        />

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">
            Paint color:
          </label>

          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-11 w-16 cursor-pointer"
          />

          <span className="font-mono text-sm uppercase">
            {color}
          </span>
        </div>
<div className="space-y-3">
  <label className="block text-sm font-medium">
    Number of pigments
  </label>

  <select
    value={pigmentCount}
    onChange={(e) => {
      const count = Number(e.target.value);
      setPigmentCount(count);
      setPigmentCodes((current) =>
        Array.from({ length: count }, (_, i) => current[i] || "")
      );
    }}
    className="w-full rounded-lg border border-slate-300 p-3"
  >
    {[1, 2, 3, 4, 5, 6].map((count) => (
      <option key={count} value={count}>
        {count} {count === 1 ? "pigment" : "pigments"}
      </option>
    ))}
  </select>

  {pigmentCodes.map((code, index) => (
    <input
      key={index}
      type="text"
      placeholder={`Pigment ${index + 1} code (e.g. PY74)`}
      value={code}
      onChange={(e) => {
        const updated = [...pigmentCodes];
        updated[index] = e.target.value.toUpperCase();
        setPigmentCodes(updated);
      }}
      className="w-full rounded-lg border border-slate-300 p-3"
    />
  ))}
</div>
        <button
  disabled={busy || !loaded}
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {editingPaintId !== null ? "Save Changes" : "+ Add Paint"}
        </button>
      </form>
      </div>
)}

{inventoryOpen && (
      <div className="border-t border-slate-200 pt-4">
        <h3 className="mb-3 font-semibold">
          Your Paint Collection ({paints.length})
        </h3>

        {!loaded ? (
          <p className="text-sm text-slate-500">
            Loading inventory...
          </p>
        ) : paints.length === 0 ? (
          <p className="text-sm text-slate-500">
            No paints added yet. Add your first acrylic paint above.
          </p>
        ) : (
          <div className="space-y-2">
            {paints.map((paint) => (
              <div
                key={paint.id}
                className="flex items-center gap-3 rounded-lg border border-slate-200 p-3"
              >
                <div
                  className="h-10 w-10 shrink-0 rounded-lg border border-slate-200"
                  style={{ backgroundColor: paint.color }}
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {paint.name}
                  </p>

                  <p className="truncate text-xs text-slate-500">
                    {paint.brand || "No brand"}
                  </p>
                </div>

                <button
  disabled={busy || !loaded}
                  type="button"
                  onClick={() => toggleAvailability(paint.id)}
                  className={`rounded-md px-2 py-1 text-xs ${
                    paint.available
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {paint.available ? "Available" : "Unavailable"}
                </button>
<button
  disabled={busy || !loaded}
  type="button"
  onClick={() => startEditing(paint)}
  className="rounded-md px-2 py-1 text-sm text-blue-600 hover:bg-blue-50"
>
  Edit
</button>
                <button
  disabled={busy || !loaded}
                  type="button"
                  onClick={() => removePaint(paint.id)}
                  className="rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                  aria-label={`Remove ${paint.name}`}
                >
                  Remove
                </button>
              </div>
                                           ))}
      </div>
    )}
  </div>
)}
</div>
);
}