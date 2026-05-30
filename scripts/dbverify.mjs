import pg from "pg";
const c=new pg.Client({connectionString:process.env.VURL});
await c.connect();
const t=await c.query("select table_name from information_schema.tables where table_schema='public' order by table_name");
console.log("TABLES:", t.rows.map(r=>r.table_name).join(", ")||"(none)");
await c.end();
