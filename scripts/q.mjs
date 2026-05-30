import pg from "pg";
const c=new pg.Client({connectionString:process.env.VURL});
await c.connect();
const r=await c.query("select id, model, left(user_text,60) ut, left(assistant_text,40) at, processed, created_at from conversation_turns where user_text like $1 order by created_at desc limit 3",["%"+process.env.NONCE+"%"]);
console.log("rows_found:", r.rowCount);
for(const x of r.rows) console.log(JSON.stringify(x));
const tot=await c.query("select count(*)::int n from conversation_turns");
console.log("total_turns:", tot.rows[0].n);
await c.end();
