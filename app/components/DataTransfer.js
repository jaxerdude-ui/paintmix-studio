"use client";
import { useState } from "react";
async function getData(url,options) {
  const response = await fetch(url,{cache:"no-store",...options});
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Could not transfer your data.");
  return data;
}
export default function DataTransfer() {
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
  async function importBackup(event) {
    const file=event.target.files?.[0]; if (!file) return;
    setBusy(true);setError("");setMessage("");
    try {
      if (file.size > 3_000_000) throw new Error("Choose a PaintMix data backup smaller than 3 MB.");
      const backup=JSON.parse(await file.text());
      if (backup.format !== "paintmix-backup-v1" || !Array.isArray(backup.paints) || !Array.isArray(backup.tests)) throw new Error("Choose a PaintMix data backup JSON file, not the project ZIP.");
      // Imports merge by ID, leaving existing records in place.
      for (const [url,body] of [["/api/inventory",{paints:backup.paints}],["/api/mixing-tests",{tests:backup.tests}],["/api/recipes",{recipes:backup.recipes || []}]]) {
        await getData(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      }
      window.dispatchEvent(new Event("paintmix-data-imported"));
      window.dispatchEvent(new Event("paintmix-inventory-updated"));
      window.dispatchEvent(new Event("paintmix-calibration-updated"));
      setMessage("Backup imported. Your paints, recipes, and tests are now saved online. Existing entries were kept.");
    } catch(error) {setError(error.message || "Could not read the backup file. Your existing data has been kept.");}
    finally {setBusy(false);event.target.value="";}
  }
  async function exportBackup() {
    setBusy(true);setError("");setMessage("");
    try {
      const [paints,tests,recipes]=await Promise.all([getData("/api/inventory"),getData("/api/mixing-tests"),getData("/api/recipes")]);
      const blob=new Blob([JSON.stringify({format:"paintmix-backup-v1",exportedAt:new Date().toISOString(),paints,tests,recipes},null,2)],{type:"application/json"});
      const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="paintmix-data-backup.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      setMessage("Backup downloaded.");
    } catch(error) {setError(error.message);}
    finally {setBusy(false);}
  }
  return <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
    <h3 className="font-semibold">Backups & transfer</h3>
    <p className="mt-2 text-sm text-slate-600">Import a backup from your local PaintMix Studio to bring your existing paints and tests online. Imports merge with your saved data.</p>
    <div className="mt-3 flex flex-wrap gap-3">
      <label className={`rounded-lg bg-slate-800 px-4 py-2 text-white ${busy?"opacity-50":"cursor-pointer"}`}>
        {busy?"Working…":"Import backup"}<input type="file" aria-label="Import PaintMix backup" accept="application/json,.json" className="sr-only" disabled={busy} onChange={importBackup}/>
      </label>
      <button type="button" onClick={exportBackup} disabled={busy} className="rounded-lg border border-slate-300 px-4 py-2 disabled:opacity-50">Download backup</button>
    </div>
    {message&&<p role="status" className="mt-3 text-sm text-green-700">{message}</p>}
    {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </section>;
}
