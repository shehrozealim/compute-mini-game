import test from 'node:test';import assert from 'node:assert/strict';import {createMatch,step,idle,valid} from '../shared/game.js';
test('rooms are isolated',()=>{const a=createMatch(),b=createMatch();step(a,[{...idle(),x:1},idle()]);assert.equal(b.heroes[0].x,170);assert.ok(a.heroes[0].x>170)});
test('reject unbounded inputs',()=>{assert.equal(valid({...idle(),x:Infinity}),false);assert.equal(valid({...idle(),x:2}),false)});
test('timeout draw',()=>{const m=createMatch();m.time=.001;step(m,[idle(),idle()]);assert.equal(m.winner,-1)});
test('held fire respects cooldown and bounded projectiles',()=>{const m=createMatch();for(let i=0;i<300;i++)step(m,[{...idle(),fire:true},idle()]);assert.ok(m.shots.length<5);assert.equal(m.damage[0],0)});
