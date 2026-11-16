const {chromium}=require('playwright');
const mode=process.argv[2]||'random', ammo=process.argv[3]||'n';
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:420,height:860}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+require('path').resolve(__dirname,'../index.html'));await p.waitForTimeout(500);
await p.evaluate((a)=>{window.__jelly.setAmmo(a);const r=document.getElementById('rule');r.value='queue';r.dispatchEvent(new Event('change'));},ammo);
const rows=[];
for(const pace of [1.5,3])for(const lv of [0,1,2,3])for(let k=0;k<6;k++){
 const r=await p.evaluate(async([lv,pace,mode])=>{const J=window.__jelly;J.loadLevel(lv);J.timeScale=12;
  let lastSwap=-9,jam=0,lastT=0,boostT=0,emptyT=0,idleChecks=0,noGood=0,shotsChecked=0,hidden=0;const seen=new Set();
  const sw=(G,a,b)=>{const t=G.board[a[0]][a[1]];G.board[a[0]][a[1]]=G.board[b[0]][b[1]];G.board[b[0]][b[1]]=t};
  function goodMove(G){const cols=J.bottomColors();const moves=[];
    for(let r=0;r<7;r++)for(let c=0;c<7;c++)for(const [dr,dc] of [[0,1],[1,0]]){const r2=r+dr,c2=c+dc;if(r2>=7||c2>=7)continue;
      sw(G,[r,c],[r2,c2]);const one=new Set([[r,c]]);const ok=J.hasGoodMove(cols)&&false;sw(G,[r,c],[r2,c2]);}
    return null}
  return await new Promise(res=>{const iv=setInterval(()=>{const G=J.G;
    const dT=G.time-lastT; if(G.slots.every(s=>s&&s.waiting&&s.ammo>0)) jam+=dT; if(G.boost>1) boostT+=dT; if(G.started&&J.visibleStats().cubes===0) emptyT+=dT; lastT=G.time;
    for(const s of G.shots){ if(!seen.has(s)){seen.add(s);shotsChecked++; if(J.tcy(s.r)<J.T_TOP-0.01) hidden++;} }
    if(G.state==='idle'&&!G.over){idleChecks++; if(!J.hasGoodMove(J.bottomColors())) noGood++;}
    if(G.state==='idle'&&!G.over&&G.time-lastSwap>=pace){
      let m=null;
      if(mode==='smart'){ // pick a swap that lines up a bottom-row color
        const cols=J.bottomColors();
        outer: for(let r=0;r<7;r++)for(let c=0;c<7;c++)for(const [dr,dc] of [[0,1],[1,0]]){const r2=r+dr,c2=c+dc;if(r2>=7||c2>=7)continue;
          sw(G,[r,c],[r2,c2]);
          const lineAt=(rr,cc)=>{const k=G.board[rr][cc].color;let h=1;for(let x=cc-1;x>=0&&G.board[rr][x].color===k;x--)h++;for(let x=cc+1;x<7&&G.board[rr][x].color===k;x++)h++;let v=1;for(let y=rr-1;y>=0&&G.board[y][cc].color===k;y--)v++;for(let y=rr+1;y<7&&G.board[y][cc].color===k;y++)v++;return h>=3||v>=3};
          const ok=(lineAt(r,c)&&cols.has(G.board[r][c].color))||(lineAt(r2,c2)&&cols.has(G.board[r2][c2].color));
          sw(G,[r,c],[r2,c2]); if(ok){m=[[r,c],[r2,c2]];break outer;}}
      }
      if(!m) m=J.findMove();
      if(m){J.trySwap(m[0],m[1]);lastSwap=G.time}}
    if(G.over||G.time>400){clearInterval(iv);res({win:G.over==='win',t:G.time,jam,boostT,emptyT,left:G.tgrid.flat().filter(t=>t&&t.alive).length/G.total,idleChecks,noGood,shotsChecked,hidden})}
  },20)});},[lv,pace,mode]);
 rows.push({pace,lv,...r});
}
for(const pace of [1.5,3])for(const lv of [0,1,2,3]){const R=rows.filter(r=>r.pace===pace&&r.lv===lv);
 const s=k=>R.reduce((a,r)=>a+r[k],0);
 console.log(`${mode}/${ammo} pace=${pace} L${lv+1}: win ${R.filter(r=>r.win).length}/6, jam ${(R.reduce((a,r)=>a+r.jam/r.t,0)/R.length*100).toFixed(0)}% of time, avg ${(s('t')/6).toFixed(0)}s, left ${(s('left')/6*100).toFixed(0)}% | boost ${(R.reduce((a,r)=>a+r.boostT/r.t,0)/R.length*100).toFixed(0)}% empty view ${(R.reduce((a,r)=>a+r.emptyT/r.t,0)/R.length*100).toFixed(0)}% | idle checks ${s('idleChecks')} without good move ${s('noGood')} | shots ${s('shotsChecked')} at hidden cubes ${s('hidden')}`);}
console.log('errors',errs);await b.close();})();
