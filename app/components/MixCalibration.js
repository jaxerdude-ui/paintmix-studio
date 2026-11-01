"use client";

import { useEffect, useState } from "react";


async function requestTests(options, url = "/api/mixing-tests") {
  const response = await fetch(url, { cache: "no-store", ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Could not save the mixing tests. Please try again.");
  return data;
}

export default function MixCalibration({ targetColor, recipe }) {
  const [tests, setTests] = useState([]);
  const [actualColor, setActualColor] = useState("#808080");
  const [physicallyTested, setPhysicallyTested] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        let saved = await requestTests();
        if (active) { setTests(saved); setLoaded(true); }
      } catch (error) {
        if (active) setError(error.message);
      }
    }
    load();
    const reload = () => load();
    window.addEventListener("paintmix-data-imported", reload);
    window.addEventListener("focus", reload);
    return () => { active = false; window.removeEventListener("paintmix-data-imported", reload); window.removeEventListener("focus", reload); };
  }, []);

  async function saveTest() {
    if (physicallyTested && !recipe?.length) {
      setError("Generate a paint recipe before saving an actual test.");
      return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const test = {
        id: crypto.randomUUID(), targetColor, recipe: structuredClone(recipe || []),
        actualColor, physicallyTested, createdAt: new Date().toISOString(),
      };
      const saved = await requestTests({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tests: [test] }) });
      setTests(saved); setPhysicallyTested(false);
      setNotice("Mixing test saved online.");
      window.dispatchEvent(new Event("paintmix-calibration-updated"));
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }

  async function deleteTest(id) {
    if (!window.confirm("Delete this saved mixing test?")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      setTests(await requestTests({ method: "DELETE" }, `/api/mixing-tests?id=${encodeURIComponent(id)}`));
      setNotice("Mixing test deleted online.");
      window.dispatchEvent(new Event("paintmix-calibration-updated"));
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }

  return (
    <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="mb-2 text-lg font-semibold">🧪 Paint Mixing Tests</h3>
      <p className="mb-4 text-sm text-slate-600">Record real paint mixing results to help PaintMix Studio improve future recipes.</p>
      <p className="text-sm text-slate-500">Shared mixing tests · Saved online and available on every computer.</p>
      <p className="mt-1 text-sm text-slate-500">{loaded ? `Saved mixing tests: ${tests.length}` : error ? "Tests could not be loaded." : "Loading saved tests…"}</p>
      {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
      {notice && <p role="status" className="mt-3 text-green-700">{notice}</p>}
      <div className="mt-4">
        <label htmlFor="actual-mixed-color" className="mb-2 block text-sm font-medium">Actual Mixed Color</label>
        <div className="flex items-center gap-4">
          <input id="actual-mixed-color" type="color" value={actualColor} onChange={event => setActualColor(event.target.value)} className="h-12 w-20 cursor-pointer" />
          <span className="font-medium">{actualColor.toUpperCase()}</span>
        </div>
      </div>
      <button type="button" onClick={saveTest} disabled={!loaded || busy} className="mt-4 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
        {busy ? "Saving…" : "Save Mixing Test"}
      </button>
      <label className="mt-4 flex items-center gap-3 text-sm">
        <input type="checkbox" checked={physicallyTested} onChange={event => setPhysicallyTested(event.target.checked)} className="h-5 w-5 cursor-pointer" /> Actual test
      </label>
 <details className="group mt-6">
       <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg bg-slate-100 p-3 text-lg font-semibold [&::-webkit-details-marker]:hidden">
  <span>Mixing Test History ({tests.length})</span>
  <span aria-hidden="true" className="transition-transform group-open:rotate-180">⌄</span>
</summary>
        {loaded && tests.length === 0 && <p className="text-sm text-slate-500">No mixing tests saved yet. Import a backup or record your first test.</p>}
        {tests.map(test => (
          <div key={test.id} className="rounded-lg border border-slate-200 p-4">
            <p className="mb-2 text-sm font-semibold">{test.physicallyTested ? "✅ Actual Test" : "🧪 Practice Test"}</p>
            <div className="mt-3 flex gap-4">
              {[{ label: "Target", color: test.targetColor }, { label: "Actual", color: test.actualColor }].map(({ label, color }) => (
                <div key={label}>
                  <div className="h-16 w-24 rounded border border-slate-300" style={{ backgroundColor: color || "transparent" }} />
                  <p className="mt-1 text-xs text-slate-500">{label}: {color || "Not recorded"}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm">Paints in recipe: {test.recipe.length}</p>
            {test.recipe.map((paint, index) => <p key={index} className="ml-4 text-sm text-slate-600">{paint.name}: {paint.grams.toFixed(2)} g</p>)}
            <p className="mt-2 text-xs text-slate-500">{new Date(test.createdAt).toLocaleString()}</p>
            <button type="button" onClick={() => deleteTest(test.id)} disabled={busy} className="mt-3 text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50">Delete Test</button>
          </div>
         ))}
      </details>
    </section>
  );
}
