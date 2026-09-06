import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from '../output/qa-postgres-runtime/node_modules/pg/lib/index.js';

// Deliberately no environment/database URL override: this test can only use local QA.
const config = { host: '127.0.0.1', port: 55422, user: 'postgres', password: 'QA-local-only-2026', database: 'postgres' };
const db = new pg.Client(config);
let groups = 0;
const pass = (name) => { groups++; console.log('PASS', name); };
async function store(tier = 'oshi_pro', age = 40) {
  const id = randomUUID(), user = randomUUID();
  await db.query("INSERT INTO auth.users(id,email,aud,role) VALUES ($1,$2,'authenticated','authenticated')", [user, `${user}@example.test`]);
  await db.query("INSERT INTO merchants(id,user_id,store_name,store_slug,whatsapp_number,created_at) VALUES ($1,$2,'Local QA Store',$3,'264810000000',now()-$4*interval '1 day')", [id,user,`local-qa-${id}`,age]);
  await db.query("INSERT INTO subscriptions(merchant_id,tier,status,current_period_start) VALUES ($1,$2,'active',date_trunc('month',now()))", [id,tier]);
  return {id,user};
}
async function product(m, options = {}) {
  const values = {merchant_id:m.id,name:'Local QA Item',price_nad:10000,track_inventory:true,stock_quantity:20,...options};
  const keys = Object.keys(values);
  return (await db.query(`INSERT INTO products(${keys.join(',')}) VALUES (${keys.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`,Object.values(values))).rows[0];
}
function rpc(m,p, options = {}) {
  const args = {p_merchant_id:m.id,p_customer_name:'Synthetic QA Buyer',p_customer_whatsapp:'264810000001',p_delivery_method:'pickup',p_subtotal_nad:1,p_items:JSON.stringify([{productId:p.id,name:p.name,quantity:1,...options.item}]),...options.args};
  const types={p_merchant_id:'uuid',p_subtotal_nad:'integer',p_items:'jsonb',p_delivery_date:'date'};
  return {text:`SELECT * FROM public.place_order(${Object.keys(args).map((k,i)=>`${k} => $${i+1}::${types[k]||'text'}`).join(',')})`,values:Object.values(args)};
}
async function order(m,p,options={},client=db){ return (await client.query(rpc(m,p,options))).rows[0]; }
async function details(id) { return (await db.query('SELECT * FROM orders WHERE id=$1',[id])).rows[0]; }
async function stock(id) { return (await db.query('SELECT stock_quantity FROM products WHERE id=$1',[id])).rows[0].stock_quantity; }
async function race(m,p,options={}) {
  const a=new pg.Client(config),b=new pg.Client(config);
  await Promise.all([a.connect(),b.connect()]);
  try {
    await a.query('BEGIN');
    await a.query('SELECT id FROM merchants WHERE id=$1 FOR UPDATE',[m.id]);
    const first=await order(m,p,options,a);
    const pending=order(m,p,options,b).then(value=>({value}),error=>({error}));
    // Observe the actual second backend waiting on the first transaction, not a timing assumption.
    let blocked=false;
    for(let i=0;i<30;i++) {
      const r=await db.query('SELECT cardinality(pg_blocking_pids($1)) AS blockers',[b.processID]);
      if(r.rows[0].blockers>0){blocked=true;break;}
      await new Promise(resolve=>setTimeout(resolve,20));
    }
    assert.equal(blocked,true,'second connection must wait for the merchant lock');
    await a.query('COMMIT');
    return {first,second:await pending};
  } finally {await a.query('ROLLBACK');await Promise.all([a.end(),b.end()]);}
}

await db.connect();
try {
  const hasMigration=(await db.query("SELECT to_regclass('public.funnel_events') AS marker")).rows[0].marker;
  assert.ok(hasMigration,'Apply the QA migration to the matching local schema first');
  await db.query("INSERT INTO tier_limits(tier,max_products,max_orders_per_month,has_inventory,has_coupons,has_branding,price_nad) VALUES ('oshi_start',20,20,true,true,true,0),('oshi_basic',50,50,true,true,false,14900),('oshi_grow',200,300,true,true,false,39900),('oshi_pro',-1,-1,true,true,false,79900) ON CONFLICT(tier) DO NOTHING");
  const m=await store(),p=await product(m);
  const first=await order(m,p);
  assert.equal((await details(first.order_id)).subtotal_nad,10000);
  assert.equal(await stock(p.id),19);
  const wrapped=await order(m,p,{args:{p_delivery_method:'delivery',p_delivery_provider:'yango',p_delivery_address:'Local QA address'}});
  assert.equal((await details(wrapped.order_id)).delivery_provider,'yango');
  assert.equal((await details(wrapped.order_id)).delivery_fee_nad,0);
  pass('Both complete RPC overloads execute; server pricing and courier fee are authoritative');

  const q=await product(m,{price_nad:0});
  const before=(await db.query('SELECT count(*) FROM orders WHERE merchant_id=$1',[m.id])).rows[0].count;
  await assert.rejects(()=>order(m,q),/requires a quote/);
  assert.equal(await stock(q.id),20);
  assert.equal((await db.query('SELECT count(*) FROM orders WHERE merchant_id=$1',[m.id])).rows[0].count,before);
  await db.query('UPDATE merchants SET enabled_delivery_providers=ARRAY[]::text[] WHERE id=$1',[m.id]);
  await assert.rejects(()=>order(m,p,{args:{p_delivery_method:'delivery'}}),/does not offer/);
  await db.query("UPDATE merchants SET pickup_enabled=false,enabled_delivery_providers=ARRAY['yango'] WHERE id=$1",[m.id]);
  await assert.rejects(()=>order(m,p),/does not offer pickup/);
  await order(m,p,{args:{p_delivery_method:'delivery',p_delivery_provider:'yango'}});
  pass('Quote-only and unavailable fulfilment roll back orders and inventory; courier-only succeeds');

  const limited=await store('oshi_start'),lp=await product(limited,{track_inventory:false});
  for(let i=0;i<19;i++)await order(limited,lp);
  const quota=await race(limited,lp);
  assert.match(quota.second.error?.message||'',/order allowance/);
  assert.equal((await db.query("SELECT count(*)::int n FROM orders WHERE merchant_id=$1 AND status<>'cancelled'",[limited.id])).rows[0].n,20);
  await db.query("UPDATE orders SET status='cancelled' WHERE id=$1",[quota.first.order_id]);
  await order(limited,lp);
  assert.equal((await db.query('SELECT ordering_available FROM get_store_orderability(ARRAY[$1::uuid])',[limited.id])).rows[0].ordering_available,false);
  pass('Real concurrent final-allowance checkout: one success, one rejection; cancellation restores allowance');

  const sm=await store(),sp=await product(sm,{stock_quantity:1});
  const last=await race(sm,sp);
  assert.match(last.second.error?.message||'',/Insufficient stock/);
  assert.equal(await stock(sp.id),0);
  await db.query("UPDATE orders SET status='cancelled' WHERE id=$1",[last.first.order_id]);
  assert.equal(await stock(sp.id),1);
  await db.query("UPDATE orders SET status='cancelled' WHERE id=$1",[last.first.order_id]);
  assert.equal(await stock(sp.id),1);
  pass('Real concurrent last-stock checkout cannot oversell; repeated cancellation does not double-restock');

  const service=await product(m,{item_type:'service',service_mode:'at_client',track_inventory:false,price_nad:30000});
  await db.query("UPDATE merchants SET callout_fee_nad=5000,vat_number='QA-VAT',vat_inclusive=false WHERE id=$1",[m.id]);
  const sv=await order(m,service);
  const sd=await details(sv.order_id);
  assert.equal(sd.callout_fee_nad,5000);assert.equal(sd.vat_nad,5250);assert.equal(sd.subtotal_nad,30000);
  pass('Service checkout bypasses goods pickup restriction; callout and exclusive VAT compute correctly');

  const rm=await store(),rp=await product(rm,{item_type:'rental',stock_quantity:1,price_nad:10000,deposit_nad:50000});
  await db.query("UPDATE merchants SET vat_number='QA-VAT' WHERE id=$1",[rm.id]);
  const date=(await db.query("SELECT (current_date+1)::text d,(current_date+3)::text e")).rows[0];
  const rental=await order(rm,rp,{item:{rentalStart:date.d,rentalEnd:date.e}});
  const rd=await details(rental.order_id);
  assert.equal(rd.subtotal_nad,30000);assert.equal(rd.deposit_nad,50000);assert.equal(rd.vat_nad,4500);
  assert.equal(await stock(rp.id),1);
  await assert.rejects(()=>order(rm,rp,{item:{rentalStart:date.d,rentalEnd:date.e}}),/available for those dates/);
  pass('Rental multi-day price, untaxed deposit and overlapping capacity are enforced by full RPC');

  await db.query('BEGIN');await db.query('SET LOCAL ROLE anon');
  await assert.rejects(()=>db.query('SELECT * FROM funnel_events'),/permission denied/);await db.query('ROLLBACK');
  await db.query('BEGIN');await db.query('SET LOCAL ROLE authenticated');
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[m.user]);
  assert.equal((await db.query('UPDATE merchants SET pickup_enabled=true WHERE id=$1 RETURNING id',[sm.id])).rowCount,0);
  assert.equal((await db.query('UPDATE merchants SET pickup_enabled=true WHERE id=$1 RETURNING id',[m.id])).rowCount,1);
  await db.query('ROLLBACK');
  pass('Anonymous analytics access denied; authenticated pickup updates are restricted to owning merchant');
  console.log(`PASS: ${groups} PostgreSQL integration groups; synthetic local records only.`);
} catch(error) {console.error('FAIL',error.message,error.detail||'',error.where||'');process.exitCode=1;}
finally {await db.end();}
