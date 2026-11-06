import {io} from 'socket.io-client';
const cases=[{name:'Express WebSocket endpoint',url:process.env.SMOKE_SERVER_URL||'http://localhost:3001',transport:'websocket'},{name:'Next WebSocket rewrite',url:process.env.SMOKE_FRONTEND_URL||'http://localhost:3000',transport:'websocket'},{name:'Next HTTP polling rewrite',url:process.env.SMOKE_FRONTEND_URL||'http://localhost:3000',transport:'polling'}];
for(const item of cases){const clients=[];try{
 for(let i=0;i<2;i++){const s=io(item.url,{transports:[item.transport],upgrade:false,forceNew:true,reconnection:false,timeout:4000,extraHeaders:{Origin:process.env.SMOKE_FRONTEND_URL||'http://localhost:3000'}});clients.push(s);await new Promise((resolve,reject)=>{s.once('connect',resolve);s.once('connect_error',reject)})}
 const created=await clients[0].timeout(4000).emitWithAck('join',{team:0,role:'both',name:'Transport QA Blue'});if(created.error)throw Error(created.error);
 const joined=await clients[1].timeout(4000).emitWithAck('join',{code:created.code,team:1,role:'both',name:'Transport QA Red'});if(joined.error)throw Error(joined.error);
 const snapshot=new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('No live snapshot: '+item.name)),4000);clients[1].once('snapshot',()=>{clearTimeout(t);resolve()})});clients[0].emit('start');await snapshot;console.log('PASS: '+item.name+' joined two clients and delivered combat snapshots.');
}finally{clients.forEach(s=>s.disconnect())}}

