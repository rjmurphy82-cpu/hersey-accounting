// Bank Rec Live: class-game backend for Vercel.
// Needs an Upstash Redis database connected to this Vercel project
// (Vercel dashboard > Storage > Upstash for Redis > Connect). Nothing else to configure.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const TTL = 60 * 60 * 4; // games erase themselves after 4 hours

async function r(cmd) {
  const res = await fetch(URL_, { method: "POST", headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" }, body: JSON.stringify(cmd) });
  const j = await res.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}
const J = s => (s == null ? null : JSON.parse(s));
const keys = c => ({ meta: `brl:${c}:meta`, state: `brl:${c}:state`, players: `brl:${c}:players` });
function hashToObj(arr) { const o = {}; for (let i = 0; i < (arr || []).length; i += 2) o[arr[i]] = J(arr[i + 1]); return o; }
function setDeep(o, path, v) { const ks = path.split("/"); let t = o; ks.slice(0, -1).forEach(k => { if (typeof t[k] !== "object" || t[k] === null) t[k] = {}; t = t[k]; }); t[ks[ks.length - 1]] = v; }

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  if (b.op === "ping") return res.json({ ok: !!(URL_ && TOKEN) });
  if (!URL_ || !TOKEN) return res.status(503).json({ error: "No database connected" });
  const parts = String(b.path || "").split("/").filter(Boolean);
  const code = parts[1], rest = parts.slice(2);
  if (parts[0] !== "games" || !/^\d{4}$/.test(code || "")) return res.status(400).json({ error: "Bad path" });
  const K = keys(code);
  try {
    if (b.op === "get") {
      if (!rest.length) {
        const meta = J(await r(["GET", K.meta]));
        if (!meta) return res.json({ v: null });
        const state = J(await r(["GET", K.state]));
        return res.json({ v: { ...meta, state, players: hashToObj(await r(["HGETALL", K.players])) } });
      }
      if (rest[0] === "state") return res.json({ v: J(await r(["GET", K.state])) });
      if (rest[0] === "players" && rest.length === 1) { const a = await r(["HGETALL", K.players]); return res.json({ v: a && a.length ? hashToObj(a) : null }); }
      if (rest[0] === "players" && rest[1]) return res.json({ v: J(await r(["HGET", K.players, rest[1]])) });
    }
    if (b.op === "set") {
      if (!rest.length) {
        const { state, players, ...meta } = b.v || {};
        const ok = await r(["SET", K.meta, JSON.stringify(meta), "EX", TTL, "NX"]);
        if (!ok) return res.status(409).json({ error: "Code in use" });
        await r(["SET", K.state, JSON.stringify(state || null), "EX", TTL]);
        return res.json({ ok: true });
      }
      if (rest[0] === "state") { await r(["SET", K.state, JSON.stringify(b.v), "EX", TTL]); return res.json({ ok: true }); }
      if (rest[0] === "players" && rest[1]) {
        if (!(await r(["EXISTS", K.meta]))) return res.status(404).json({ error: "No game" });
        await r(["HSET", K.players, rest[1], JSON.stringify(b.v)]); await r(["EXPIRE", K.players, TTL]);
        return res.json({ ok: true });
      }
    }
    if (b.op === "update" && rest[0] === "players" && rest[1]) {
      const cur = J(await r(["HGET", K.players, rest[1]])) || {};
      Object.entries(b.v || {}).forEach(([k, v]) => setDeep(cur, k, v));
      await r(["HSET", K.players, rest[1], JSON.stringify(cur)]);
      return res.json({ ok: true });
    }
    if (b.op === "remove" && !rest.length) { await r(["DEL", K.meta, K.state, K.players]); return res.json({ ok: true }); }
    return res.status(400).json({ error: "Unsupported" });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
};
