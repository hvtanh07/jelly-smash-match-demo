const {chromium}=require('playwright');
const [stuck,nslot]=process.argv.slice(2);
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:420,height:860}});
await p.goto('file://'+require('path').resolve(__dirname,'../index.html'));await p.waitForTimeout(500);
await p.evaluate(([stuck,n])=>{const s=document.getElementById('stuck');s.value=stuck;s.dispatchEvent(new Event('change'));const r=document.getElementById('rule');r.value='queue';r.dispatchEvent(new Event('change'));window.__jelly.setSlots(+n)},[stuck,nslot]);
const rows=[];
for(const pace of [1.5,3])for(const lv of [0,1,2,3])for(let k=0;k<5;k++){
 const r=await p.evaluate(async([lv,pace,stuck])=>{const J=window.__jelly;J.loadLevel(lv);J.timeScale=12;
  let lastSwap=-9,jam=0,firstJam=null,lastT=0;
  return await new Promise(res=>{const iv=setInterval(()=>{const G=J.G;
    const all=G.slots.every(s=>s&&s.waiting&&s.ammo>0); if(all){jam+=G.time-lastT; if(firstJam==null)firstJam=G.time} lastT=G.time;
    if(stuck==='tap') G.slots.forEach((k,i)=>{if(k&&k.waitT>1.5) J.discardCannon(i)});
    if(G.state==='idle'&&!G.over&&G.time-lastSwap>=pace){const m=J.findMove(); if(m){J.trySwap(m[0],m[1]);lastSwap=G.time}}
    if(G.over||G.time>400){clearInterval(iv);res({win:G.over==='win',t:G.time,jam,firstJam,left:G.tgrid.flat().filter(t=>t&&t.alive).length/G.total})}
  },20)});},[lv,pace,stuck]);
 rows.push({pace,lv,...r});
}
const fmt=x=>x==null?'-':x.toFixed(0);
for(const pace of [1.5,3])for(const lv of [0,1,2,3]){const R=rows.filter(r=>r.pace===pace&&r.lv===lv);
 const wins=R.filter(r=>r.win).length, jams=R.filter(r=>r.firstJam!=null);
 const jamShare=R.reduce((a,r)=>a+r.jam/r.t,0)/R.length;
 const fj=jams.length?jams.reduce((a,r)=>a+r.firstJam,0)/jams.length:null;
 console.log(`${stuck} slots=${nslot} pace=${pace} L${lv+1}: win ${wins}/5, jammed ${jams.length}/5, first jam avg ${fmt(fj)}s, jam ${(jamShare*100).toFixed(0)}% of time, left ${(R.reduce((a,r)=>a+r.left,0)/R.length*100).toFixed(0)}%`);}
await b.close();})();
