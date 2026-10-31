import { env } from "cloudflare:workers";

type Kind = "inventory" | "mixing-tests" | "recipes";
const hex = /^#[0-9a-f]{6}$/i;
export function validRecord(kind:Kind, item:any): boolean {
  if (!item || typeof item.id !== "string" || !item.id || item.id.length > 200) return false;
  if (kind === "inventory") return typeof item.name === "string" && !!item.name.trim() && item.name.length <= 500 && hex.test(item.color) && typeof item.available === "boolean" && (!item.pigmentCodes || Array.isArray(item.pigmentCodes));
  if (!Array.isArray(item.recipe) || item.recipe.length > 500 || item.recipe.some((p:any) => !p || typeof p.id !== "string" || typeof p.name !== "string" || !Number.isFinite(p.grams) || p.grams < 0 || !hex.test(p.color))) return false;
  if (!Number.isFinite(Date.parse(item.createdAt))) return false;
  if (kind === "recipes") return !!item.recipe.length && hex.test(item.targetColor);
  return hex.test(item.actualColor) && (!item.targetColor || hex.test(item.targetColor)) && typeof item.physicallyTested === "boolean" && (!item.physicallyTested || item.recipe.length > 0);
}

export async function handleRecords(request:Request, kind:Kind) {
  const ownerId = "shared";
  if (request.method !== "GET" && request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) return Response.json({error:"Please save from the PaintMix Studio website."},{status:403});
  const db = env.DB;
  if (!db) return Response.json({error:"Online storage is temporarily unavailable. Please try again."},{status:503});
  try {
    await ensureSharedCollection(db);
    if (request.method === "POST") {
      const text = await request.text();
      if (text.length > 3_000_000) return Response.json({error:"This backup is too large."},{status:413});
      let body;
      try { body = JSON.parse(text); } catch { return Response.json({error:"Could not read the saved data."},{status:400}); }
      const list = kind === "inventory" ? (body?.paint ? [body.paint] : body?.paints) : kind === "recipes" ? body?.recipes : body?.tests;
      if (!Array.isArray(list) || list.length > 5000 || !list.every(item => validRecord(kind,item))) return Response.json({error:"Some entries have missing or invalid paint information. Nothing was imported."},{status:400});
      const conflict = kind === "inventory" && body.paint ? "DO UPDATE SET payload = excluded.payload" : "DO NOTHING";
      for (let offset=0; offset < list.length; offset+=50) {
        await db.batch(list.slice(offset,offset+50).map(item => db.prepare(`INSERT INTO paintmix_records (owner_id, kind, id, payload) VALUES (?, ?, ?, ?) ON CONFLICT (owner_id, kind, id) ${conflict}`).bind(ownerId,kind,item.id,JSON.stringify(item))));
      }
    } else if (request.method === "DELETE") {
      const id = new URL(request.url).searchParams.get("id");
      if (!id) return Response.json({error:"Select an item to delete."},{status:400});
      await db.prepare("DELETE FROM paintmix_records WHERE owner_id = ? AND kind = ? AND id = ?").bind(ownerId,kind,id).run();
    }
    const result = await db.prepare("SELECT payload FROM paintmix_records WHERE owner_id = ? AND kind = ? ORDER BY rowid").bind(ownerId,kind).all<{payload:string}>();
    return Response.json(result.results.map(row => JSON.parse(row.payload)),{headers:{"Cache-Control":"no-store"}});
  } catch (error) {
    console.error("PaintMix storage request failed",error);
    return Response.json({error:"Your data could not be saved or loaded. Please try again; do not close the page until it confirms saving."},{status:500});
  }
}

let sharedCollectionReady: Promise<unknown> | undefined;
async function ensureSharedCollection(db: D1Database) {
  // Copy the former private collection once. Keep the originals as a backup.
  // A durable marker prevents deleted shared entries from being reimported later.
  if (!sharedCollectionReady) {
    sharedCollectionReady = db.batch([
      db.prepare(`INSERT OR IGNORE INTO paintmix_records (owner_id,kind,id,payload)
        SELECT 'shared',kind,id,payload FROM paintmix_records
        WHERE owner_id != 'shared' AND kind IN ('inventory','mixing-tests','recipes')
        AND NOT EXISTS (SELECT 1 FROM paintmix_records WHERE owner_id='shared' AND kind='_migration' AND id='public-v1')`),
      db.prepare(`INSERT OR IGNORE INTO paintmix_records (owner_id,kind,id,payload) VALUES ('shared','_migration','public-v1','{}')`),
    ]).catch(error => {sharedCollectionReady=undefined;throw error;});
  }
  await sharedCollectionReady;
}
