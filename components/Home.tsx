"use client";
import {useState,useEffect,useRef} from 'react';
import {useRouter} from 'next/navigation';
import {TROOPS,TROOP_IDS,MAPS,MAP_IDS,type TroopId,type MapId} from '../shared/config';
import {asset,SCENERY,paintTerrain} from './scenery';
export function Brand(){return <span className="brand"><span className="crest">⚔</span><span>TANDEM<small>TACTICS</small></span></span>}
export function MapMini({id}:{id:MapId}){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{const c=ref.current!,g=c.getContext('2d')!;let cancelled=false;
 const paint=()=>{if(cancelled)return;g.setTransform(.3,0,0,.3,0,0);paintTerrain(g,id,true);};paint();
 void Promise.all(SCENERY.map(name=>asset(name).decode().catch(()=>undefined))).then(paint);
 return()=>{cancelled=true;};},[id]);
 return <canvas ref={ref} width={360} height={210} className="map-mini" aria-label={MAPS[id].name}/>;
}
export default function Home(){
 const router=useRouter();const [troop,setTroop]=useState<TroopId>('archer'),[map,setMap]=useState<MapId>('forest'),[team,setTeam]=useState('0'),[role,setRole]=useState('both'),[code,setCode]=useState(''),[name,setName]=useState('');
 useEffect(()=>{const p=new URLSearchParams(location.search);if(p.get('room')){setCode(p.get('room')!.slice(0,6));setTeam(p.get('team')==='0'?'0':'1');}},[]);
 const enter=(join=false)=>{const p=new URLSearchParams({team,role,troop,map,name:name.trim()||'Campus Challenger'});if(join)p.set('room',code.trim().toUpperCase());router.push('/arena?'+p);};
 const selected=TROOPS[troop];
 return <div className="event-page">
  <nav className="event-nav"><Brand/><span className="event-badge">CAMPUS ARENA · 2v2</span><a href="#rules">Quick rules ↗</a></nav>
  <main className="event-main">
   <header className="event-heading"><div><span className="eyebrow">TWO MINDS. ONE HERO.</span><h1>Pick. Pair up. <em>Play.</em></h1></div><p>One teammate moves. One teammate shoots.<br/>120 seconds to claim the arena.</p></header>
   <div className="event-layout">
    <section className="event-selection" aria-label="Choose your troop and arena">
     <h2><span>01</span> Choose your champion</h2>
     <div className="roster">{TROOP_IDS.map(id=><button key={id} className={`roster-card ${troop===id?'chosen':''}`} aria-pressed={troop===id} onClick={()=>setTroop(id)}><img src={TROOPS[id].image} alt=""/><b>{TROOPS[id].name}</b><span>{TROOPS[id].interval}s / shot</span></button>)}</div>
     <article className="selected-champion" aria-live="polite"><img src={selected.image} alt={selected.name}/><div><span className="eyebrow">{selected.label}</span><h3>{selected.name}</h3><div className="event-stats"><span>♥ <b>{selected.health}</b> HP</span><span>✦ <b>{selected.damage}</b> damage</span><span>◷ <b>{selected.interval}s</b> / shot</span><span>» <b>{selected.speed}</b> speed</span><span>⌖ <b>{selected.range}</b> range</span></div><p><strong className="plus">+</strong> {selected.strength}</p><p><strong className="minus">−</strong> {selected.weakness}</p></div></article>
     <div className="map-heading"><h2><span>02</span> Pick an arena</h2><small>Host can change this in the lobby</small></div>
     <div className="event-maps">{MAP_IDS.map(id=><button key={id} className={`event-map ${map===id?'chosen':''}`} aria-pressed={map===id} onClick={()=>setMap(id)}><MapMini id={id}/><b>{MAPS[id].name}</b></button>)}</div>
    </section>
    <aside id="play" className="event-entry"><span className="eyebrow">READY FOR THE NEXT ROUND?</span><h2>Take your side.</h2><p>Two teams. Two people per team. Share a keyboard and mouse, or connect separately.</p>
     <form className="room-form" onSubmit={e=>{e.preventDefault();enter();}}>
      <label>Team / player name<input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Byte Knights" maxLength={20}/></label>
      <label>Your side<select value={team} onChange={e=>setTeam(e.target.value)}><option value="0">Team Blue</option><option value="1">Team Red</option></select></label>
      <label>Device setup<select value={role} onChange={e=>setRole(e.target.value)}><option value="both">Shared device · WASD + mouse</option><option value="move">Separate device · movement</option><option value="shoot">Separate device · aim & fire</option></select></label>
      <button className="gold" type="submit">CREATE ROOM ↗</button>
      <div className="join-divider">HAVE A ROOM CODE?</div><div className="join-row"><input aria-label="Room code" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} maxLength={6} placeholder="6-CHAR CODE"/><button type="button" className="steel" disabled={!/^[A-F0-9]{6}$/.test(code.trim())} onClick={()=>enter(true)}>JOIN →</button></div>
     </form><div className="event-note">The host starts once both teams are ready. No sign-up. No downloads.</div>
    </aside>
   </div>
   <details id="rules" className="event-rules"><summary>30-second briefing · controls, pickups & winning</summary><div><p><b>Work together.</b> WASD moves your hero; mouse aims; hold left-click to fire. One person handles each role.</p><p><b>Play the map.</b> Stone stops shots; timber breaks. Traps glow before activating. Their mirrored positions change each round.</p><p><b>Grab a spell.</b> Haste: +20% speed for 3s. Heal: up to 250 HP. Rage: 45% shorter shooting intervals for 5s. Pickups return after 20s.</p><p><b>Win the round.</b> Eliminate the enemy, or deal the most damage in 120s. Equal damage is a draw. Host can start a rematch or return home for the next teams.</p></div></details>
  </main><footer className="event-footer">Unofficial fan-made college game · Supercell artwork © Supercell · <a href="/credits">Asset credits</a> · Not endorsed by Supercell.</footer>
 </div>;
}
