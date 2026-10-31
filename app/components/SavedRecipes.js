"use client";
import {useEffect,useState} from "react";
export default function SavedRecipes({targetColor,recipe,onLoad}) {
  const [saved,setSaved]=useState([]),[name,setName]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  async function request(options,query="") {
    const response=await fetch(`/api/recipes${query}`,{cache:"no-store",headers:{"Content-Type":"application/json"},...options});
    const data=await response.json();if(!response.ok)throw new Error(data.error||"Could not save recipes.");return data;
  }
  useEffect(()=>{let active=true;const load=()=>request().then(data=>{if(active)setSaved(data)}).catch(e=>{if(active)setError(e.message)});load();window.addEventListener("paintmix-data-imported",load);window.addEventListener("focus",load);return()=>{active=false;window.removeEventListener("paintmix-data-imported",load);window.removeEventListener("focus",load)}},[]);
  async function save() {
    setBusy(true);setError("");
    try {setSaved(await request({method:"POST",body:JSON.stringify({recipes:[{id:crypto.randomUUID(),name:name.trim()||`Mix ${targetColor}`,targetColor,recipe,createdAt:new Date().toISOString()}]})}));setName("");}
    catch(e){setError(e.message)}finally{setBusy(false)}
  }
  async function remove(id) {
    if(!window.confirm("Delete this saved recipe?"))return;setBusy(true);setError("");
    try{setSaved(await request({method:"DELETE"},`?id=${encodeURIComponent(id)}`))}catch(e){setError(e.message)}finally{setBusy(false)}
  }
  return <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
    <h3 className="text-lg font-semibold">Saved Recipes</h3>
    <p className="mt-1 text-sm text-slate-600">Save a generated recipe to reopen it on any computer.</p>
    <div className="mt-3 flex flex-wrap gap-2"><input aria-label="Recipe name" placeholder="Recipe name" value={name} onChange={e=>setName(e.target.value)} className="rounded-lg border border-slate-300 p-2"/><button type="button" onClick={save} disabled={busy||!recipe?.length} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">Save current recipe</button></div>
    {error&&<p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    <div className="mt-4 space-y-2">{saved.map(item=><div key={item.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3"><span className="h-10 w-10 rounded border border-black/10" style={{backgroundColor:item.targetColor}}/><div className="flex-1"><p className="font-semibold">{item.name}</p><p className="text-sm text-slate-500">{item.recipe.reduce((n,p)=>n+p.grams,0).toFixed(1)} g · {item.recipe.length} paints</p></div><button onClick={()=>onLoad(item)} className="rounded-lg bg-slate-100 px-3 py-2">Load recipe</button><button disabled={busy} onClick={()=>remove(item.id)} className="px-2 py-2 text-red-700">Delete</button></div>)}</div>
  </section>;
}
