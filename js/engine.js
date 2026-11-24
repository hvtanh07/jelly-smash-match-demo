/* Jelly Smash rules for the playable demo. Forked from the level builder engine (same rules as GDD 1.1, 1.2, 1.4),
   plus three test options from the 2026-11-24 fun report, each one can be turned off:
   A power: every match adds to a Power meter; a cannon that would be lost (slots full, no target, color gone) adds its ammo.
            Full meter = Super blast: rainbow shots at the front ants.
   B specials (2026-11-24 v2, user): a straight 4 throws 3 piercing bombs straight up at the columns whose ants are lowest,
            each hits the 3 lowest ants of its column (any color); a T/L shape throws 1 bomb at a random ant near the bottom rows,
            3x3 blast (any color); a straight 5+ makes a Rainbow cannon (hits any color) that goes in the normal slots.
   C combo: cascades add ammo (+1 per step of the chain); the feel part lives in the renderer.
   Original header: Jelly Smash rules for the play test, the bot and the tests. No DOM here.
   Rules follow the GDD (sections 1.1, 1.2, 1.4, 1.5) and the timings in the level file.
   Positions on the ant wall are in cells, measured down from the top of the ant view. */
import {findQueens,findTrays,hpAt,isChoco,chocoHp,parseLocks,QUEEN,EMPTY,HOLE,TRAY} from './format.js';

export function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export const ammoFor=n=>2*n-3;            // GDD 1.2: ammo = 2n − 3
export const BOTTLE_BONUS=5;               // GDD 1.4 Jelly Bottle
export const BOMB_AMMO=15;                 // GDD 1.5 Bomb
export const POWER_MAX=40;                 // A: meter size
export const POWER_PER_MATCH=1;            // A: every match
export const SUPER_SHOTS=8;                // A: Super blast shots
export const LINE_BOMBS=3,LINE_DEPTH=3;    // B: straight 4 = 3 bombs, each hits 3 ants up its column
export const BOMB_ROWS=3;                  // B: T/L bomb lands on an ant in the lowest 3 rows that have ants in view
export const THROW_FLIGHT=0.55;
export const RACK=0;                       // old v1 rack, gone
const specialAmmo={line:n=>0,rainbow:n=>n,bomb:n=>0};
/* B: the kind of cannon a group makes. Straight = all cells in one row or one column. */
export function groupKind(cells){
  const n=cells.length;if(n<4)return null;
  const oneRow=cells.every(([r])=>r===cells[0][0]),oneCol=cells.every(([,c])=>c===cells[0][1]);
  if(oneRow||oneCol)return n>=5?'rainbow':'line';
  return n>=5?'bomb':null;
}
function addPower(G,v,why){if(!G.opt.power||!(v>0))return;G.power+=v;G.stats.powerIn+=v;G.events.push({type:'power',v,why});}
export const praise=n=>n>=10?'Epic':n>=8?'Extreme':n>=6?'Amazing':n>=5?'Great':'';

export function newGame(lv,opt={}){
  const rng=mulberry32(opt.seed==null?(Math.random()*1e9)|0:opt.seed);
  const rows=lv.WallRows||[],R=rows.length,C=Math.max(0,...rows.map(r=>r.length));
  const G={lv,rng,opt:{chocoLayers:3,chocoStarves:true,power:true,specials:true,combo:true,...opt},t:0,started:false,over:null,events:[],
    R,C,wy:+lv.WallStartVisibleRows||0,boost:1,ants:[],cellAnt:[],
    BW:+lv.BoardWidth,BH:+lv.BoardHeight,cells:[],trays:[],state:'idle',timer:0,swapPair:null,holdGroups:null,
    slots:[],flights:[],shots:[],volleys:[],hint:null,goodCols:'',power:0,powerMax:POWER_MAX,chain:0,rack:[],
    stats:{swaps:0,matches:0,cannons:0,lost:0,lostAmmo:0,merges:0,shots:0,reshuffles:0,supers:0,specials:0,powerIn:0,boosters:{hand:0,shuffle:0,bomb:0}}};
  // ant wall
  for(let r=0;r<R;r++)G.cellAnt.push(new Array(C).fill(-1));
  const {queens}=findQueens(rows);
  queens.forEach(q=>{const a={id:G.ants.length,r:q.r,c:q.c,w:2,h:2,color:QUEEN,queen:true,hp:+lv.QueenHp||1,max:+lv.QueenHp||1,pend:0,alive:true};
    G.ants.push(a);for(let y=0;y<2;y++)for(let x=0;x<2;x++)G.cellAnt[q.r+y][q.c+x]=a.id;});
  rows.forEach((row,r)=>{for(let c=0;c<row.length;c++){const k=row[c];if(k===EMPTY||k===QUEEN||k===' ')continue;
    const hp=hpAt(lv,r,c),a={id:G.ants.length,r,c,w:1,h:1,color:k,queen:false,hp,max:hp,pend:0,alive:true};G.ants.push(a);G.cellAnt[r][c]=a.id;}});
  G.totalAnts=G.ants.length;G.totalHp=G.ants.reduce((s,a)=>s+a.hp,0);
  // slots
  const locks=parseLocks(lv.SlotLocks,+lv.SlotCount||0);
  const lockCols=String(lv.SlotLockColors||'');
  for(let i=0;i<(+lv.SlotCount||0);i++){const k=lockCols[i];G.slots.push({lock:locks[i],lockColor:k&&k!=='.'?k:null,cannon:null});}
  // board
  const br=lv.BoardRows||[],be=lv.BoardElements||[];
  const {trays}=findTrays(be);
  trays.forEach((t,i)=>{const s=String((lv.TrayBottles||[])[i]||'');G.trays.push({r:t.r,c:t.c,gone:false,bottles:[...s].map(k=>({color:k,broken:false}))});});
  const trayAt=(r,c)=>G.trays.findIndex(t=>r>=t.r&&r<t.r+2&&c>=t.c&&c<t.c+2);
  for(let r=0;r<G.BH;r++){const row=[];for(let c=0;c<G.BW;c++){
    const b=(br[r]||'')[c],e=(be[r]||'')[c];
    if(b===HOLE||b===undefined){row.push(null);continue;}
    const preset=/^[A-Z]$/.test(b)?b:null;   // BoardRows color letter: the start color of that cell's cube
    if(e===TRAY&&trayAt(r,c)>=0)row.push({kind:'tray',tray:trayAt(r,c)});
    else if(isChoco(e))row.push({kind:'choco',layers:chocoHp(e,G.opt.chocoLayers),max:chocoHp(e,G.opt.chocoLayers),color:preset,preset:!!preset});
    else row.push({kind:'cube',color:preset,preset:!!preset});
  }G.cells.push(row);}
  fillBoard(G);
  return G;
}

/* ---------- ant wall ---------- */
const bottomRow=a=>a.r+a.h-1;
export const rowTop=(G,r)=>G.wy-(G.R-r);                 // top edge of wall row r, cells below the view top
const antCenterY=(G,a)=>rowTop(G,bottomRow(a))+0.5;      // a queen's bottom row sets how low she is
export const hits=(a,k)=>a.alive&&(a.queen||k==='*'||a.color===k);
export function available(G,k){let n=0;for(const a of G.ants)if(hits(a,k))n+=a.hp-a.pend;return n;}
function frontOfCol(G,c){for(let r=G.R-1;r>=0;r--){const id=G.cellAnt[r][c];if(id>=0&&G.ants[id].alive)return id;}return -1;}
export function isFront(G,a){for(let x=a.c;x<a.c+a.w;x++)if(frontOfCol(G,x)!==a.id)return false;return true;}
export const inView=(G,a)=>antCenterY(G,a)>=0;
export function pickTarget(G,k){
  let best=null;
  for(const a of G.ants){
    if(!hits(a,k)||a.hp-a.pend<=0||!inView(G,a)||!isFront(G,a))continue;
    if(!best||bottomRow(a)>bottomRow(best)||(bottomRow(a)===bottomRow(best)&&a.c<best.c))best=a;
  }
  return best;
}
export function aliveAnts(G){return G.ants.filter(a=>a.alive);}
export function lowestBottom(G){let m=-Infinity;for(const a of G.ants)if(a.alive)m=Math.max(m,rowTop(G,bottomRow(a))+1);return m;}
/* colors of the lowest wall row that still has colored ants; queens have no color of their own */
export function bottomColors(G){
  for(let r=G.R-1;r>=0;r--){const s=new Set();
    for(let c=0;c<G.C;c++){const id=G.cellAnt[r][c];if(id<0)continue;const a=G.ants[id];if(a.alive&&!a.queen)s.add(a.color);}
    if(s.size)return s;}
  return new Set();
}
function bottomRowShare(G){
  for(let r=G.R-1;r>=0;r--){const m=new Map();let n=0;
    for(let c=0;c<G.C;c++){const id=G.cellAnt[r][c];if(id<0)continue;const a=G.ants[id];if(a.alive&&!a.queen){m.set(a.color,(m.get(a.color)||0)+1);n++;}}
    if(n)return {m,n};}
  return {m:new Map(),n:0};
}
export function viewStats(G){
  const depth=+G.lv.LoseDepthCells;let vis=0;
  for(const a of G.ants)if(a.alive){const y=antCenterY(G,a);if(y>=0&&y<=depth)vis++;}
  const low=lowestBottom(G);
  return {vis,depthRows:low===-Infinity?0:Math.max(0,low),gapRows:low===-Infinity?99:depth-low,moreAbove:rowTop(G,0)<0};
}

/* ---------- board colors ---------- */
const palette=G=>[...String(G.lv.Colors||'')];
/* RefillColors (level field): the only colors new cubes may have; empty = no limit */
export const refillLimit=G=>{const s=String(G.lv.RefillColors||'');return s?new Set(s):null;};
const allowedCols=(G,cols)=>{const lim=refillLimit(G);return lim?new Set([...cols].filter(k=>lim.has(k))):cols;};
export function spawnWeights(G){
  const lim=refillLimit(G);
  const onGrid=new Set();for(const a of G.ants)if(a.alive&&!a.queen)onGrid.add(a.color);
  let cols;
  if(lim)cols=[...lim];
  else{cols=palette(G).filter(k=>onGrid.has(k));
    for(const k of palette(G))if(cols.length<4&&!cols.includes(k))cols.push(k);}   // at least 4 colors on the board
  if(!cols.length)cols.push('R','B','G','Y');
  const share=Math.min(1,Math.max(0,+G.lv.RefillFrontShare||0)),w=new Map();
  cols.forEach(k=>w.set(k,(1-share)/cols.length));
  const {m,n}=bottomRowShare(G);
  const hit=n?[...m].filter(([k])=>!lim||lim.has(k)):[],hn=hit.reduce((s,[,v])=>s+v,0);
  if(hn)for(const [k,v] of hit)if(w.has(k))w.set(k,w.get(k)+share*v/hn);else w.set(k,share*v/hn);
  else cols.forEach(k=>w.set(k,w.get(k)+share/cols.length));
  return w;
}
function pickColor(G,w,avoid){
  let tot=0;for(const [k,v] of w)if(!avoid.has(k))tot+=v;
  if(tot<=0){avoid=new Set();tot=0;for(const [,v] of w)tot+=v;}
  let x=G.rng()*tot;for(const [k,v] of w){if(avoid.has(k))continue;x-=v;if(x<=0)return k;}
  return [...w.keys()][0];
}
export const colorAt=(G,r,c)=>{const x=G.cells[r]&&G.cells[r][c];return x&&x.kind==='cube'?x.color:null;};
const swappable=(G,r,c)=>{const x=G.cells[r]&&G.cells[r][c];return !!(x&&x.kind==='cube');};
function avoidAt(G,r,c){
  const a=new Set(),k1=colorAt(G,r,c-1);if(k1&&k1===colorAt(G,r,c-2))a.add(k1);
  const k2=colorAt(G,r-1,c);if(k2&&k2===colorAt(G,r-2,c))a.add(k2);return a;
}
function fillBoard(G){
  const w=spawnWeights(G);
  for(let r=0;r<G.BH;r++)for(let c=0;c<G.BW;c++){const x=G.cells[r][c];if(!x)continue;
    if(x.kind==='cube'){if(!x.preset)x.color=pickColor(G,w,avoidAt(G,r,c));x.from=r-G.BH-1;}
    else if(x.kind==='choco'&&!x.preset)x.color=pickColor(G,w,new Set());}
  // random cubes next to fixed ones can still line up: re-roll only the random cubes in a ready match
  for(let k=0;k<30;k++){const gs=findGroups(G);if(!gs.length)break;
    gs.forEach(g=>g.cells.forEach(([r,c])=>{const x=G.cells[r][c];if(!x.preset)x.color=pickColor(G,w,new Set([g.color]));}));}
  if(!findMove(G))reshuffle(G);
  ensureGoodMove(G,false);
  G.state='fall';G.timer=+G.lv.FallSeconds||0;G.initialFall=true;
}

/* ---------- matching ---------- */
export function findGroups(G){
  const {BW,BH}=G,mark=[...Array(BH)].map(()=>new Array(BW).fill(false));
  for(let r=0;r<BH;r++){let s=0;for(let c=1;c<=BW;c++){const k=colorAt(G,r,s);if(c<BW&&k&&colorAt(G,r,c)===k)continue;if(c-s>=3&&k)for(let x=s;x<c;x++)mark[r][x]=true;s=c;}}
  for(let c=0;c<BW;c++){let s=0;for(let r=1;r<=BH;r++){const k=colorAt(G,s,c);if(r<BH&&k&&colorAt(G,r,c)===k)continue;if(r-s>=3&&k)for(let y=s;y<r;y++)mark[y][c]=true;s=r;}}
  const seen=[...Array(BH)].map(()=>new Array(BW).fill(false)),groups=[];
  for(let r=0;r<BH;r++)for(let c=0;c<BW;c++){
    if(!mark[r][c]||seen[r][c])continue;
    const color=colorAt(G,r,c),cells=[],st=[[r,c]];seen[r][c]=true;
    while(st.length){const [a,b]=st.pop();cells.push([a,b]);
      for(const [da,db] of [[1,0],[-1,0],[0,1],[0,-1]]){const na=a+da,nb=b+db;
        if(na>=0&&na<BH&&nb>=0&&nb<BW&&mark[na][nb]&&!seen[na][nb]&&colorAt(G,na,nb)===color){seen[na][nb]=true;st.push([na,nb]);}}}
    groups.push({color,cells});
  }
  return groups;
}
function lineAt(G,r,c){
  const k=colorAt(G,r,c);if(!k)return false;
  let h=1;for(let x=c-1;colorAt(G,r,x)===k;x--)h++;for(let x=c+1;colorAt(G,r,x)===k;x++)h++;
  let v=1;for(let y=r-1;colorAt(G,y,c)===k;y--)v++;for(let y=r+1;colorAt(G,y,c)===k;y++)v++;
  return h>=3||v>=3;
}
function swapCells(G,a,b){const t=G.cells[a[0]][a[1]];G.cells[a[0]][a[1]]=G.cells[b[0]][b[1]];G.cells[b[0]][b[1]]=t;}
export function allSwaps(G){
  const out=[];
  for(let r=0;r<G.BH;r++)for(let c=0;c<G.BW;c++){if(!swappable(G,r,c))continue;
    if(swappable(G,r,c+1))out.push([[r,c],[r,c+1]]);if(swappable(G,r+1,c))out.push([[r,c],[r+1,c]]);}
  return out;
}
export function validMoves(G){
  return allSwaps(G).filter(([a,b])=>{swapCells(G,a,b);const ok=lineAt(G,a[0],a[1])||lineAt(G,b[0],b[1]);swapCells(G,a,b);return ok;});
}
export function findMove(G){
  for(const [a,b] of allSwaps(G)){swapCells(G,a,b);const ok=lineAt(G,a[0],a[1])||lineAt(G,b[0],b[1]);swapCells(G,a,b);if(ok)return [a,b];}
  return null;
}
export function hasGoodMove(G,cols){
  for(const [a,b] of allSwaps(G)){swapCells(G,a,b);
    const ok=(lineAt(G,a[0],a[1])&&cols.has(colorAt(G,a[0],a[1])))||(lineAt(G,b[0],b[1])&&cols.has(colorAt(G,b[0],b[1])));
    swapCells(G,a,b);if(ok)return true;}
  return false;
}
/* recolor a few allowed cubes so one swap makes a line of 3 in one of `cols`, with no match on the board right away */
function plantMove(G,cols,allowed,mustKeep){
  const ks=[...cols];if(!ks.length)return null;
  const pool=[...spawnWeights(G).keys()];
  const ok=(r,c)=>swappable(G,r,c);
  for(let tries=0;tries<400;tries++){
    const k=ks[Math.floor(G.rng()*ks.length)],horiz=G.rng()<.5;
    const r0=Math.floor(G.rng()*G.BH),c0=Math.floor(G.rng()*G.BW);
    const line=horiz?[[r0,c0],[r0,c0+1],[r0,c0+2]]:[[r0,c0],[r0+1,c0],[r0+2,c0]];
    if(line.some(([r,c])=>!ok(r,c)))continue;
    const gi=Math.floor(G.rng()*3),[gr,gc]=line[gi];
    const nbs=horiz?[[gr-1,gc],[gr+1,gc]]:[[gr,gc-1],[gr,gc+1]];
    if(gi===0)nbs.push(horiz?[gr,gc-1]:[gr-1,gc]);if(gi===2)nbs.push(horiz?[gr,gc+1]:[gr+1,gc]);
    const [yr,yc]=nbs[Math.floor(G.rng()*nbs.length)];
    if(!ok(yr,yc))continue;
    const cells=[...line.filter((_,i)=>i!==gi),[yr,yc]];
    const gapK=colorAt(G,gr,gc)===k;
    const touched=[...cells.filter(([r,c])=>colorAt(G,r,c)!==k),...(gapK?[[gr,gc]]:[])];
    if(touched.some(([r,c])=>!allowed(r,c)))continue;
    const saved=[...cells,[gr,gc]].map(([r,c])=>[r,c,colorAt(G,r,c)]);
    cells.forEach(([r,c])=>G.cells[r][c].color=k);
    if(gapK){const o=pool.filter(x=>x!==k);G.cells[gr][gc].color=o[Math.floor(G.rng()*o.length)]||k;}
    if(findGroups(G).length===0&&hasGoodMove(G,cols)&&(!mustKeep||mustKeep.every(x=>hasGoodMove(G,new Set([x])))))return touched;
    saved.forEach(([r,c,v])=>G.cells[r][c].color=v);
  }
  return null;
}
function ensureGoodMove(G,visible){
  const cols=allowedCols(G,bottomColors(G));G.goodCols=[...cols].sort().join();
  if(!cols.size||hasGoodMove(G,cols))return;
  const done=plantMove(G,cols,(r,c)=>!G.cells[r][c].preset);
  if(done&&visible){done.forEach(([r,c])=>{G.cells[r][c].glow=1;});G.events.push({type:'glow'});}
}
function reshuffle(G){
  const cubes=[];for(let r=0;r<G.BH;r++)for(let c=0;c<G.BW;c++)if(swappable(G,r,c)&&!G.cells[r][c].preset)cubes.push(G.cells[r][c]);
  for(let tries=0;tries<80;tries++){
    for(let i=cubes.length-1;i>0;i--){const j=Math.floor(G.rng()*(i+1));const x=cubes[i].color;cubes[i].color=cubes[j].color;cubes[j].color=x;}
    if(findGroups(G).length===0&&findMove(G))return true;
  }
  for(let tries=0;tries<40;tries++){
    const w=spawnWeights(G);
    for(let r=0;r<G.BH;r++)for(let c=0;c<G.BW;c++)if(swappable(G,r,c)&&!G.cells[r][c].preset)G.cells[r][c].color=pickColor(G,w,avoidAt(G,r,c));
    if(findGroups(G).length===0&&findMove(G))return true;
  }
  return false;   // board too small or too few colors for a move
}

/* ---------- player actions ---------- */
export function canSwap(G,a,b){
  if(G.over||G.state!=='idle')return false;
  if(Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])!==1)return false;
  return swappable(G,a[0],a[1])&&swappable(G,b[0],b[1]);
}
export function trySwap(G,a,b){
  if(!canSwap(G,a,b))return false;
  if(!G.started)for(const row of G.cells)for(const x of row)if(x&&x.kind==='cube')x.preset=false;
  G.started=true;G.hint=null;G.stats.swaps++;G.chain=0;
  swapCells(G,a,b);G.swapPair=[a,b];G.state='swap';G.timer=+G.lv.SwapSeconds||0;
  return true;
}

/* ---------- match resolution ---------- */
function startHold(G,groups){G.holdGroups=groups;G.state='hold';G.timer=+G.lv.MatchHold||0;
  groups.forEach(g=>g.cells.forEach(([r,c])=>{G.cells[r][c].dying=true;}));}
function neighbors(G,cells){
  const out=new Set();
  for(const [r,c] of cells)for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){const nr=r+dr,nc=c+dc;
    if(nr>=0&&nr<G.BH&&nc>=0&&nc<G.BW)out.add(nr*1000+nc);}
  return [...out].map(v=>[Math.floor(v/1000),v%1000]);
}
function clearGroups(G){
  const groups=G.holdGroups||[];G.holdGroups=null;G.chain++;
  for(const g of groups){
    const n=g.cells.length;let bonus=0;const hitTrays=new Set(),hitChoco=[];
    for(const [r,c] of neighbors(G,g.cells)){const x=G.cells[r][c];if(!x)continue;
      if(x.kind==='choco'&&!hitChoco.includes(x)){hitChoco.push(x);x._rc=[r,c];}
      if(x.kind==='tray')hitTrays.add(x.tray);}
    hitChoco.forEach(x=>{x.layers--;G.events.push({type:'choco',r:x._rc[0],c:x._rc[1],left:x.layers});if(x.layers<=0){x.kind='cube';delete x.layers;delete x.preset;x.glow=1;G.events.push({type:'choco-open'});}});
    for(const ti of hitTrays){const t=G.trays[ti];if(t.gone)continue;
      const b=t.bottles.find(b=>!b.broken&&b.color===g.color);
      if(b){b.broken=true;bonus+=BOTTLE_BONUS;G.events.push({type:'bottle',tray:ti,color:g.color});
        if(t.bottles.every(b=>b.broken)){t.gone=true;
          for(let y=0;y<2;y++)for(let x=0;x<2;x++)G.cells[t.r+y][t.c+x]={kind:'empty'};}}}
    const special=G.opt.specials?groupKind(g.cells):null;
    let sr=0,sc=0;g.cells.forEach(([r,c])=>{sr+=r;sc+=c;G.cells[r][c]={kind:'empty'};});
    G.stats.matches++;
    const combo=G.opt.combo&&G.chain>1?G.chain-1:0;
    const ammo=(special?specialAmmo[special](n):ammoFor(n))+bonus+combo,at={r:sr/n,c:sc/n};
    addPower(G,POWER_PER_MATCH,'match');
    const tcol=special?'*':g.color;
    if(available(G,tcol)<=0){G.events.push({type:'notarget',color:g.color,at});countLocks(G,g.color,'match');addPower(G,ammo,'notarget');continue;}
    if(special==='line'||special==='bomb'){
      countLocks(G,g.color,'match');G.stats.specials++;
      const n2=special==='line'?throwLine(G,at):throwBomb(G,at);
      G.events.push({type:'match',color:g.color,n,ammo:0,bonus,combo,chain:G.chain,special,throws:n2,at,praise:praise(n),cells:g.cells.map(x=>x.slice())});
      continue;
    }
    G.flights.push({color:g.color,ammo,n,special,t:+G.lv.MatchFlight||0,dur:+G.lv.MatchFlight||0,at});
    G.events.push({type:'match',color:g.color,n,ammo,bonus,combo,chain:G.chain,special,at,praise:praise(n),cells:g.cells.map(x=>x.slice())});
  }
  gravity(G);
  G.state='fall';G.timer=+G.lv.FallSeconds||0;
}
/* Cubes fall inside each column, through missing cells (#) above the column's first cell.
   Chocolate, trays and holes (#) with cells above them are blockers: nothing falls through them.
   chocoStarves on (GDD rule): no new cubes enter below a blocker; instead the cells there are filled the Candy Crush way,
   a cube slides in diagonally from the upper-left or upper-right cell, and its own column then falls and refills.
   chocoStarves off (old tool option): the cells under a blocker refill on their own. */
function blockerAt(G,r,c){const x=G.cells[r]&&G.cells[r][c];return !x||x.kind==='choco'||x.kind==='tray';}
function columnSegments(G,c){
  let seg=[],fed=true,top=true;const segs=[];
  for(let r=0;r<G.BH;r++){const x=G.cells[r][c];
    if(!x){if(top)continue;if(seg.length)segs.push({rows:seg,fed});seg=[];if(G.opt.chocoStarves)fed=false;continue;}
    top=false;
    if(x.kind==='choco'||x.kind==='tray'){if(seg.length)segs.push({rows:seg,fed});seg=[];if(G.opt.chocoStarves)fed=false;continue;}
    seg.push(r);}
  if(seg.length)segs.push({rows:seg,fed});
  return segs;
}
function fallColumns(G,w){
  for(let c=0;c<G.BW;c++)for(const {rows:s,fed:f} of columnSegments(G,c)){
    const keep=[];for(let i=s.length-1;i>=0;i--){const x=G.cells[s[i]][c];if(x.kind==='cube')keep.push(x);}
    for(let i=s.length-1,j=0;i>=0;i--,j++){const r=s[i];
      if(j<keep.length){G.cells[r][c]=keep[j];}
      else if(!f){G.cells[r][c]={kind:'empty'};}
      else{const k=j-keep.length;G.cells[r][c]={kind:'cube',color:pickColor(G,w,new Set()),from:s[0]-1-k,fromC:c,fresh:true};}}
  }
}
/* one diagonal slide: the lowest empty cell whose cell above is a blocker or empty takes a cube from above-left or above-right */
function slideDiagonal(G){
  for(let r=G.BH-1;r>=1;r--)for(let c=0;c<G.BW;c++){const x=G.cells[r][c];if(!x||x.kind!=='empty')continue;
    const up=G.cells[r-1][c];if(!(blockerAt(G,r-1,c)||up.kind==='empty'))continue;
    for(const dc of (G.rng()<.5?[-1,1]:[1,-1])){const y=G.cells[r-1]&&G.cells[r-1][c+dc];
      if(y&&y.kind==='cube'){G.cells[r][c]=y;if(y.from==null)y.from=r-1;y.fromC=y.fromC!=null?y.fromC:c+dc;G.cells[r-1][c+dc]={kind:'empty'};return true;}}}
  return false;
}
function gravity(G){
  const w=spawnWeights(G);
  for(let r=0;r<G.BH;r++)for(let c=0;c<G.BW;c++){const x=G.cells[r][c];if(x&&x.kind==='cube'){x.from=r;x.fromC=c;}}
  fallColumns(G,w);
  if(G.opt.chocoStarves)for(let it=0;it<G.BW*G.BH*2&&slideDiagonal(G);it++)fallColumns(G,w);
  // GDD 1.2 Help: after each match, color the new cubes so each bottom-row color gets a swap that makes a line of 3
  const cols=allowedCols(G,bottomColors(G));
  if(cols.size&&findGroups(G).length===0){
    const order=[...cols].sort(()=>G.rng()-.5),ok=order.filter(k=>hasGoodMove(G,new Set([k])));
    for(const k of order){if(ok.includes(k))continue;
      if(plantMove(G,new Set([k]),(r,c)=>!!G.cells[r][c].fresh,ok))ok.push(k);}
  }
  for(const row of G.cells)for(const x of row)if(x)delete x.fresh;
}

/* ---------- cannons ---------- */
/* GDD 1.4 Locked Slot.
   Color lock (lockColor set): each match of that color counts it down by 1, even when its cannon is lost or has no target.
   Plain lock (no color, old rule): each cannon that reaches the slots counts it down by 1. */
function countLocks(G,color,kind){
  G.slots.forEach((s,j)=>{if(!(s.lock>0))return;
    if(s.lockColor?(kind==='match'&&s.lockColor===color):kind==='enter'){s.lock--;if(s.lock===0)G.events.push({type:'unlock',slot:j});}});
}
/* A cannon of a color already in the slots merges into that cannon at once (ammo added), even when the slots are full.
   Otherwise it takes the leftmost free slot; slots full: it is lost. */
function placeCannon(G,f){
  countLocks(G,f.color,'match');
  const tcol=f.special==='rainbow'?'*':f.color;
  if(available(G,tcol)<=0){G.events.push({type:'notarget',color:f.color,at:f.at});addPower(G,f.ammo,'notarget');return;}
  if(f.special){   // Rainbow cannon: own slot, never merges
    const j=G.slots.findIndex(s=>s.lock===0&&!s.cannon);
    if(j<0){G.stats.lost++;G.stats.lostAmmo+=f.ammo;G.events.push({type:'lost',color:f.color,ammo:f.ammo});addPower(G,f.ammo,'lost');return;}
    G.slots[j].cannon={color:f.color,ammo:f.ammo,cd:0,id:++G.stats.cannons,pop:1,special:f.special};G.stats.specials++;
    G.events.push({type:'special',slot:j,kind:f.special,color:f.color});
    countLocks(G,f.color,'enter');return;
  }
  const m=G.slots.findIndex(s=>s.cannon&&!s.cannon.special&&s.cannon.color===f.color&&s.cannon.ammo>0);
  if(m>=0){const k=G.slots[m].cannon;k.ammo+=f.ammo;k.pop=1;G.stats.merges++;G.events.push({type:'merge',slot:m,color:f.color});countLocks(G,f.color,'enter');return;}
  const i=G.slots.findIndex(s=>s.lock===0&&!s.cannon);
  if(i<0){G.stats.lost++;G.stats.lostAmmo+=f.ammo;G.events.push({type:'lost',color:f.color,ammo:f.ammo});addPower(G,f.ammo,'lost');return;}
  G.slots[i].cannon={color:f.color,ammo:f.ammo,cd:0,id:++G.stats.cannons,pop:1};
  G.events.push({type:'cannon',slot:i,color:f.color});
  countLocks(G,f.color,'enter');
}
// safety net: two cannons of one color in the slots merge into the leftmost
function mergeSame(G){
  const first=new Map();
  G.slots.forEach((s,i)=>{const k=s.cannon;if(!k||k.ammo<=0||k.special)return;
    if(!first.has(k.color)){first.set(k.color,i);return;}
    const keep=G.slots[first.get(k.color)].cannon;keep.ammo+=k.ammo;keep.pop=1;s.cannon=null;G.stats.merges++;
    G.events.push({type:'merge',slot:first.get(k.color),color:k.color});});
}
function fireShot(G,a,color,origin,delay,kind){
  a.pend++;G.stats.shots++;
  G.shots.push({ant:a.id,color,kind:kind||null,t:(+G.lv.ShotFlight||0)+(delay||0),dur:+G.lv.ShotFlight||0,delay:delay||0,origin});
}
function updateCannons(G,dt){
  mergeSame(G);
  const fire=+G.lv.FireInterval||0.15;
  G.slots.forEach((s,i)=>{const k=s.cannon;if(!k)return;
    k.pop=Math.max(0,(k.pop||0)-dt*3.5);
    const tc=k.special==='rainbow'?'*':k.color;
    if(available(G,tc)<=0){G.stats.lostAmmo+=k.ammo;addPower(G,k.ammo,'gone');G.events.push({type:'gone',slot:i,color:k.color});s.cannon=null;return;}   // its color is gone from the wall
    k.cd-=dt;
    if(k.cd<=0){const a=pickTarget(G,tc);
      if(a){fireShot(G,a,k.special==='rainbow'?a.color:k.color,{slot:i},0,k.special);k.ammo--;k.recoil=1;G.events.push({type:'fire',slot:i});k.cd+=fire;if(k.cd<0)k.cd=0;k.waiting=false;}
      else{k.cd=0;k.waiting=true;}}
    if(k.ammo<=0)s.cannon=null;   // leaves at 0 ammo
  });
}
function updateShots(G,dt){
  for(let i=G.shots.length-1;i>=0;i--){const s=G.shots[i];s.t-=dt;
    if(s.t<=0){const a=G.ants[s.ant];a.pend--;
      hitAnt(G,a,s.color,s.kind==='line'?'pierce':s.kind==='bomb'?'blast':null);
      if(s.kind==='line'){let n=0;   // the target took the first hit; go up the column
        for(let r=a.r-1;r>=0&&n<LINE_DEPTH-1;r--){const id=G.cellAnt[r][a.c];if(id<0)continue;const b=G.ants[id];if(!b.alive)continue;hitAnt(G,b,b.color,'pierce');n++;}
        G.events.push({type:'pierce',ant:a.id,n:n+1});}
      if(s.kind==='bomb'){
        for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const id=(G.cellAnt[a.r+dr]||[])[a.c+dc];if(id==null||id<0)continue;const b=G.ants[id];if(b.alive&&b!==a)hitAnt(G,b,b.color,'blast');}
        G.events.push({type:'blast',ant:a.id});}
      G.shots.splice(i,1);}}
}
/* B: thrown bombs fly from the match straight up to the ants (any color, front or not) */
function throwShot(G,a,kind,at,delay){a.pend++;G.stats.shots++;
  G.shots.push({ant:a.id,color:a.color,kind,t:THROW_FLIGHT+(delay||0),dur:THROW_FLIGHT,delay:delay||0,origin:{board:at},throw:true});}
function throwLine(G,at){
  const fronts=[];
  for(let c=0;c<G.C;c++){const id=frontOfCol(G,c);if(id<0)continue;const a=G.ants[id];if(!inView(G,a))continue;fronts.push({a,c,y:bottomRow(a),k:G.rng()});}
  fronts.sort((p,q)=>q.y-p.y||p.k-q.k);
  const pick=fronts.slice(0,LINE_BOMBS);
  pick.forEach((f,i)=>throwShot(G,f.a,'line',at,i*0.08));
  return pick.length;
}
function throwBomb(G,at){
  const vis=G.ants.filter(a=>a.alive&&inView(G,a));if(!vis.length)return 0;
  const low=Math.max(...vis.map(bottomRow));
  const cand=vis.filter(a=>bottomRow(a)>=low-(BOMB_ROWS-1));
  const a=cand[Math.floor(G.rng()*cand.length)];
  throwShot(G,a,'bomb',at,0);return 1;
}
function hitAnt(G,a,color,how){
  if(!a.alive)return;a.hp--;
  if(a.hp<=0){a.alive=false;G.events.push({type:'kill',ant:a.id,color:a.color,how:how||null});}
  else if(!a.queen&&a.hp===1&&a.max>1)G.events.push({type:'armor',ant:a.id});
}
/* A: Super blast, rainbow shots at the front ants in view, lowest first */
function superBlast(G){
  G.power-=G.powerMax;G.stats.supers++;let n=0;
  for(;n<SUPER_SHOTS;n++){const a=pickTarget(G,'*');if(!a)break;fireShot(G,a,a.color,{super:true,i:n},n*0.05,'super');}
  G.events.push({type:'super',n});
}
/* Hand and Bomb shots: any ant of the color, front or not, in view or not, nearest first */
function volley(G,color,ammo,originX,origin){
  const list=G.ants.filter(a=>hits(a,color)&&a.hp-a.pend>0)
    .sort((p,q)=>bottomRow(q)-bottomRow(p)||Math.abs(p.c+p.w/2-originX)-Math.abs(q.c+q.w/2-originX));
  let n=0;
  for(const a of list){while(ammo>0&&a.hp-a.pend>0){fireShot(G,a,color,origin,n*0.04);ammo--;n++;}if(!ammo)break;}
  if(ammo>0)G.stats.lostAmmo+=ammo;
  return n;
}
export function canBooster(G,kind){
  if(G.over)return false;
  if(kind==='hand')return G.slots.some(s=>s.cannon&&s.cannon.ammo>0);
  if(kind==='shuffle')return G.state==='idle';
  if(kind==='bomb')return aliveAnts(G).length>0;
  return false;
}
export function useBooster(G,kind){
  if(!canBooster(G,kind))return false;
  G.started=true;G.stats.boosters[kind]++;
  if(kind==='hand'){
    let best=-1;G.slots.forEach((s,i)=>{if(s.cannon&&s.cannon.ammo>0&&(best<0||s.cannon.ammo>G.slots[best].cannon.ammo))best=i;});
    const k=G.slots[best].cannon,x=(best+0.5)/G.slots.length*G.C;
    volley(G,k.color,k.ammo,x,{slot:best});G.slots[best].cannon=null;
    G.events.push({type:'hand',slot:best,color:k.color});
  }else if(kind==='bomb'){
    const cols=[];
    for(let r=G.R-1;r>=0&&cols.length<3;r--)for(let c=0;c<G.C&&cols.length<3;c++){const id=G.cellAnt[r][c];if(id<0)continue;const a=G.ants[id];
      if(a.alive&&!a.queen&&!cols.includes(a.color))cols.push(a.color);}
    if(!cols.length){const q=aliveAnts(G)[0];if(q)cols.push(palette(G)[0]||'R');}
    cols.forEach((k,i)=>volley(G,k,BOMB_AMMO,(i+0.5)/cols.length*G.C,{bomb:i,of:cols.length}));
    G.events.push({type:'bomb',colors:cols});
  }else if(kind==='shuffle'){
    // new board: normal cubes only (chocolate and trays stay), no ready match, a swap for each bottom-row color
    const w=spawnWeights(G),cols=allowedCols(G,bottomColors(G));
    for(let tries=0;tries<30;tries++){
      for(let r=0;r<G.BH;r++)for(let c=0;c<G.BW;c++)if(swappable(G,r,c)){const x=G.cells[r][c];x.color=pickColor(G,w,avoidAt(G,r,c));x.from=r-G.BH-1;}
      const ok=[];for(const k of cols){if(hasGoodMove(G,new Set([k]))){ok.push(k);continue;}if(plantMove(G,new Set([k]),()=>true,ok))ok.push(k);}
      if(findGroups(G).length===0&&findMove(G)&&ok.length===cols.size)break;
    }
    if(findGroups(G).length||!findMove(G))reshuffle(G);
    G.goodCols=[...cols].sort().join();
    G.state='fall';G.timer=+G.lv.FallSeconds||0;
    G.events.push({type:'shuffle'});
  }
  return true;
}

/* ---------- main step ---------- */
export function step(G,dt){
  if(G.over)return;
  G.t+=dt;
  for(const row of G.cells)for(const x of row)if(x&&x.glow)x.glow=Math.max(0,x.glow-dt*1.5);
  // board
  if(G.state!=='idle'){
    G.timer-=dt;
    if(G.timer<=0){
      if(G.state==='swap'){
        const g=findGroups(G);
        if(g.length)startHold(G,g);
        else{const [a,b]=G.swapPair;swapCells(G,a,b);G.state='swapback';G.timer=+G.lv.SwapSeconds||0;}
      }else if(G.state==='swapback')G.state='idle';
      else if(G.state==='hold')clearGroups(G);
      else if(G.state==='fall'){
        for(const row of G.cells)for(const x of row)if(x){delete x.from;delete x.fromC;}
        const g=findGroups(G);
        if(g.length&&!G.initialFall)startHold(G,g);
        else{G.initialFall=false;
          if(!findMove(G)){reshuffle(G);G.stats.reshuffles++;G.events.push({type:'reshuffle'});}
          ensureGoodMove(G,true);G.state='idle';}
      }
    }
  }
  // match flights land in slots
  for(let i=G.flights.length-1;i>=0;i--){const f=G.flights[i];f.t-=dt;if(f.t<=0){G.flights.splice(i,1);placeCannon(G,f);}}
  updateCannons(G,dt);updateShots(G,dt);
  if(G.opt.power&&G.power>=G.powerMax&&G.started&&pickTarget(G,'*'))superBlast(G);
  if(G.state==='idle'&&[...bottomColors(G)].sort().join()!==G.goodCols)ensureGoodMove(G,true);
  // the wall marches down from the first swap
  if(G.started){
    const v=viewStats(G);
    G.boost=(v.moreAbove&&(v.vis<+G.lv.WallBoostMinAnts||v.depthRows<+G.lv.WallBoostMinRows)&&v.gapRows>+G.lv.WallBoostStopRows)?(+G.lv.WallBoostFactor||1):1;
    G.wy+=(+G.lv.WallDescentPerSecond||0)*(G.opt.speedMul||1)*G.boost*dt;
  }
  if(!G.ants.some(a=>a.alive)&&!G.shots.length){G.over='win';G.events.push({type:'win'});}
  else if(lowestBottom(G)>=+G.lv.LoseDepthCells){G.over='lose';G.events.push({type:'lose'});}
}

/* ---------- bot ---------- */
/* Greedy: picks the swap whose matches feed the most useful ammo now. Useful = ammo its color can still spend,
   minus what cannons of that color already hold, and only if a slot can take the cannon. */
export function botMove(G){
  const moves=validMoves(G);if(!moves.length)return null;
  const held=new Map();
  G.slots.forEach(s=>{if(s.cannon)held.set(s.cannon.color,(held.get(s.cannon.color)||0)+s.cannon.ammo);});
  G.flights.forEach(f=>held.set(f.color,(held.get(f.color)||0)+f.ammo));
  const free=G.slots.filter(s=>s.lock===0&&!s.cannon).length-G.flights.length;
  const sameIn=k=>G.slots.filter(s=>s.cannon&&s.cannon.color===k).length;
  let best=null,bs=-Infinity;
  for(const [a,b] of moves){
    swapCells(G,a,b);const groups=findGroups(G);
    let s=0;
    for(const g of groups){
      const n=g.cells.length,ammo=ammoFor(n),need=available(G,g.color)-(held.get(g.color)||0);
      let bonus=0;for(const [r,c] of neighbors(G,g.cells)){const x=G.cells[r][c];if(!x)continue;
        if(x.kind==='choco')bonus+=1.5;
        if(x.kind==='tray'){const t=G.trays[x.tray];if(t.bottles.some(q=>!q.broken&&q.color===g.color))bonus+=4;}}
      const sp=G.opt.specials&&groupKind(g.cells);
      const room=sp==='rainbow'?free>0:sp?true:(free>0||sameIn(g.color)>=1);
      if(sp)s+=2;
      const front=pickTarget(G,g.color)?3:0;
      const unlock=G.slots.some(q=>q.lock>0&&q.lockColor===g.color)?4:0;   // a match of a color lock's color counts it down
      s+=(room&&need>0?Math.min(ammo+bonus,need)+front:(G.opt.power?0.5:-2))+bonus*0.5+unlock;
    }
    // lower matches shake more cubes loose
    s+=Math.max(a[0],b[0])*0.05+G.rng()*0.3;
    swapCells(G,a,b);
    if(s>bs){bs=s;best=[a,b];}
  }
  // nothing useful (slots full or no color needs ammo): wait instead of wasting a cannon
  return bs<0?null:best;
}
export function simulate(lv,opt={}){
  const G=newGame(lv,{seed:opt.seed,chocoLayers:opt.chocoLayers,chocoStarves:opt.chocoStarves!==false,power:opt.power!==false,specials:opt.specials!==false,combo:opt.combo!==false,speedMul:opt.speedMul||1});
  const dt=opt.dt||1/30,maxT=opt.maxTime||900,think=opt.think==null?0.5:opt.think;
  let wait=think;
  while(!G.over&&G.t<maxT){
    if(G.state==='idle'){wait-=dt;if(wait<=0){const m=botMove(G);if(m)trySwap(G,m[0],m[1]);wait=think;}}
    step(G,dt);G.events.length=0;
  }
  const left=G.ants.filter(a=>a.alive).length;
  return {result:G.over||'timeout',time:G.t,left,total:G.totalAnts,cleared:1-left/(G.totalAnts||1),stats:G.stats};
}
