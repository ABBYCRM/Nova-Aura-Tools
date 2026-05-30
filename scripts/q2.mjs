import pg from "pg";
const c=new pg.Client({connectionString:process.env.VURL});
await c.connect();
const t=await c.query("select count(*)::int n, count(*) filter (where processed)::int p from conversation_turns");
console.log("turns total=",t.rows[0].n,"processed=",t.rows[0].p);
const e=await c.query("select category, title, left(summary,50) s from scratchpad_entries order by updated_at desc limit 5");
console.log("entries=",e.rowCount);
for(const r of e.rows) console.log(" ",JSON.stringify(r));
await c.end();
