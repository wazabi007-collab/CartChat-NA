import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {createClient} from '@supabase/supabase-js';
import pg from '../output/qa-postgres-runtime/node_modules/pg/lib/index.js';
const require=createRequire(import.meta.url);
function load(path,mocks={}){const code=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const mod={exports:{}};new Function('require','module','exports',code)(id=>mocks[id]??require(id),mod,mod.exports);return mod.exports;}
const secret='oshicart-local-qa-only-jwt-secret-minimum-32-characters';
const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
const p=Buffer.from(JSON.stringify({role:'service_role',iss:'supabase',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');
const key=`${h}.${p}.${createHmac('sha256',secret).update(`${h}.${p}`).digest('base64url')}`;
const supabase=createClient('http://127.0.0.1:55421',key,{auth:{persistSession:false}});
let sends=0;
const templates=load('src/lib/whatsapp-templates.ts');
const messaging=load('src/lib/whatsapp-events.ts',{
  '@/lib/supabase/service':{createServiceClient:()=>supabase},
  '@/lib/whatsapp-templates':templates,'@/lib/date':load('src/lib/date.ts'),
  // Only the Meta transport is replaced. Eligibility/history/claim/update use real PostgREST/Postgres.
  '@/lib/whatsapp':{isWhatsAppEnabled:()=>true,sendWhatsAppTemplate:async()=>{sends++;return {success:true,messageId:`local-transport-${randomUUID()}`};}},
});
const db=new pg.Client({host:'127.0.0.1',port:55422,user:'postgres',password:'QA-local-only-2026',database:'postgres'});await db.connect();
async function merchant(demo=false){const id=randomUUID(),user=randomUUID();await db.query('INSERT INTO auth.users(id) VALUES ($1)',[user]);await db.query("INSERT INTO merchants(id,user_id,store_name,store_slug,whatsapp_number,is_demo) VALUES ($1,$2,'Local stock QA',$3,'264810000000',$4)",[id,user,`qa-stock-${id}`,demo]);return id;}
const input=(id,day)=>({supabase,merchantId:id,eventKey:`legacy-daily:${id}:${day}`,templateName:'low_stock_alert',recipientPhone:'264810000000',variables:['Local QA','QA item','1']});
try{
const id=await merchant();const results=await Promise.all(Array.from({length:8},()=>messaging.sendWhatsAppEvent(input(id,'first'))));
assert.equal(results.filter(r=>r.ok&&!r.skipped).length,1,JSON.stringify(results));assert.equal(sends,1);
for(const day of ['tomorrow','next-week','after-restock'])await messaging.sendWhatsAppEvent(input(id,day));
assert.equal(sends,1);
assert.equal((await db.query('SELECT event_key FROM whatsapp_messages WHERE merchant_id=$1',[id])).rows[0].event_key,`low_stock_alert:${id}:${load('src/lib/date.ts').namibianMonthKey()}`);
for(const status of ['queued','sent','delivered','read','failed']){const old=await merchant();await db.query("INSERT INTO whatsapp_messages(merchant_id,event_key,template_name,recipient_phone,recipient_type,category,status) VALUES ($1,$2,'low_stock_alert','264810000000','merchant','utility',$3)",[old,`old-product-day-${old}`,status]);await messaging.sendWhatsAppEvent(input(old,'new-day'));}
await messaging.sendWhatsAppEvent(input(await merchant(true),'demo'));
assert.equal(sends,1);
console.log('PASS real PostgREST/Postgres: eight concurrent attempts claim once; later days/restock/legacy statuses/demo send nothing. Meta transport mocked; zero external messages.');
}catch(error){console.error('FAIL',error.message);process.exitCode=1;}finally{await db.end();}
