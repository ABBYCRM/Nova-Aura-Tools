import net from "node:net";
import pg from "pg";
const url = new URL(process.env.BASE);
const host = url.hostname, port = Number(url.port||5432);
console.log("host_suffix=", host.split('.').slice(-2).join('.'), "| port=", port);
// raw TCP
await new Promise((res)=>{ const s=net.connect({host,port,timeout:8000});
  s.on("connect",()=>{console.log("TCP: connected"); s.destroy(); res();});
  s.on("timeout",()=>{console.log("TCP: timeout"); s.destroy(); res();});
  s.on("error",(e)=>{console.log("TCP: error", e.code); res();}); });
// pg with explicit ssl
for (const ssl of [{rejectUnauthorized:false}, false]){
  const c=new pg.Client({host,port,user:url.username,password:decodeURIComponent(url.password),database:url.pathname.slice(1),ssl,connectionTimeoutMillis:8000});
  c.on("error",()=>{});
  try{ await c.connect(); const r=await c.query("select 1 ok"); console.log("PG ssl="+JSON.stringify(ssl)+": OK", r.rows[0].ok); await c.end(); break;}
  catch(e){ console.log("PG ssl="+JSON.stringify(ssl)+": ERR", e.code||"", String(e.message).slice(0,120)); try{await c.end();}catch{} }
}
