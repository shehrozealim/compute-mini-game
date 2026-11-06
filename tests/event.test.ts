import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch,roundLayout,step,idle,blocked,DT} from '../shared/game';
import {MAP_IDS,MAPS,TROOPS} from '../shared/config';
test('water collision follows rounded pool footprints rather than rectangular corners',()=>{
 const m=createMatch('ruins'),p=MAPS.ruins.obstacles.find(o=>o.kind==='water')!;
 assert.equal(blocked(p.x+p.w/2,p.y+p.h/2,2,m),true);
 assert.equal(blocked(p.x,p.y,2,m),false);
 assert.equal(blocked(p.x+p.w/2,p.y+p.h/2,2,m,true),false);
});
test('100 seeded layouts per arena are reproducible, mirrored and clear of obstacles and spawns',()=>{
 for(const map of MAP_IDS)for(let seed=0;seed<100;seed++){
  const m=createMatch(map,undefined,seed);
  assert.deepEqual(roundLayout(map,seed),{traps:m.traps,pickups:m.pickups});
  assert.equal(m.traps.length,6);
  for(let i=0;i<m.traps.length;i+=2){const a=m.traps[i],b=m.traps[i+1];assert.equal(a.x+b.x,1200);assert.equal(a.y+b.y,700);assert.equal(a.offset,b.offset);}
  for(const p of [...m.traps,...m.pickups])assert.equal(blocked(p.x,p.y,22,m),false,`${map}: ${p.x},${p.y}`);
  for(const t of m.traps)assert.ok(Math.hypot(t.x-170,t.y-350)>160&&Math.hypot(t.x-1030,t.y-350)>160);
 }
 assert.notDeepEqual(roundLayout('forest',1),roundLayout('forest',2));
});
test('healing is capped at max HP, consumes one pickup and does not award damage',()=>{
 const m=createMatch(),h=m.heroes[0],p=m.pickups[2];h.x=p.x;h.y=p.y;h.hp=900;
 step(m,[idle(),idle()]);assert.equal(h.hp,1000);assert.equal(m.runes[2],20);assert.deepEqual(m.damage,[0,0]);assert.equal(m.events.find(e=>e.kind==='rune')?.amount,100);
 h.hp=500;step(m,[idle(),idle()]);assert.equal(h.hp,500);
});
test('rage shortens actual shooting intervals, refreshes without stacking and expires',()=>{
 const m=createMatch(),h=m.heroes[0],p=m.pickups[4];h.x=p.x;h.y=p.y;
 step(m,[idle(),idle()]);assert.equal(h.rapid,5);h.x=170;h.y=350;
 step(m,[{...idle(),fire:true},idle()]);assert.equal(h.cd,TROOPS.archer.interval*.55);
 for(let i=0;i<Math.ceil(5.1/DT);i++)step(m,[idle(),idle()]);assert.equal(h.rapid,0);
 h.cd=0;step(m,[{...idle(),fire:true},idle()]);assert.equal(h.cd,TROOPS.archer.interval);
});
