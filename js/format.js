/* The level JSON format, matched to the game's level file (level_demo.json, level L10).
   Every level is written with exactly these keys, in this order. Rows are strings, one character per cell. */

export const KEYS=['Name','Difficulty','Colors','SlotCount','WallRows','WallHp','WallStartVisibleRows','WallDescentPerSecond',
  'WallBoostFactor','WallBoostMinRows','WallBoostMinAnts','WallBoostStopRows','LoseDepthCells','BoardWidth','BoardHeight',
  'BoardRows','BoardElements','TrayBottles','QueenHp','SlotLocks','FireInterval','ShotFlight','SwapSeconds','MatchHold',
  'MatchFlight','FallSeconds','RefillFrontShare'];
// tool keys the game file does not have yet; written only when set
export const OPTIONAL_KEYS=['RefillColors','SlotLockColors'];

/* Cell letters.
   WallRows: a color letter is an ant of that color, Q is a Queen Ant cell (2×2), "." is an empty cell.
   WallHp: shots to defeat the ant in that cell (1 = normal ant, 2+ = Armored Ant, armor = HP − 1). Ignored on Q cells.
   BoardRows: "." is a cell, "#" is no cell, a color letter is a cell whose cube starts with that color
     (under a chocolate: the cube it shows when it breaks).
   BoardElements: "." nothing, a digit 1–9 is a Chocolate Layer with that HP, "X" a Chocolate Layer with the default HP,
     "T" Jelly Bottle tray (2×2).
   Optional key RefillColors (tool field, written only when set, after the game keys): the only colors new cubes can have.
   Optional key SlotLockColors (written only when set): one character per slot, a color letter = that locked slot only
     counts down for matches of this color (GDD 1.4, color lock); "." = any cannon counts (old rule). */
export const PALETTE=[
  {k:'R',name:'Red',hex:'#E5484D'},
  {k:'B',name:'Blue',hex:'#2F6FEB'},
  {k:'G',name:'Green',hex:'#2FB457'},
  {k:'Y',name:'Yellow',hex:'#F5C21A'},
  {k:'O',name:'Orange',hex:'#F27A1A'},
  {k:'P',name:'Purple',hex:'#8B4DDB',unconfirmed:true},
  {k:'K',name:'Pink',hex:'#EE5FAE',unconfirmed:true},
  {k:'C',name:'Cyan',hex:'#1FB5CF',unconfirmed:true},
];
export const COLOR_KEYS=PALETTE.map(p=>p.k);
export const colorHex=k=>(PALETTE.find(p=>p.k===k)||{hex:'#888'}).hex;
export const colorName=k=>k==='Q'?'Queen':(PALETTE.find(p=>p.k===k)||{name:k}).name;
export const QUEEN='Q',EMPTY='.',HOLE='#',CHOCO='X',TRAY='T';
export const CHOCO_DEFAULT_HP=3;
export const isChoco=ch=>ch===CHOCO||/^[1-9]$/.test(ch||'');
export const chocoHp=(ch,def)=>/^[1-9]$/.test(ch||'')?+ch:(def||CHOCO_DEFAULT_HP);
export const DIFFICULTY=[{v:0,name:'Normal'},{v:1,name:'Hard'},{v:2,name:'Super hard'}];

export const TUNING=[
  {k:'WallStartVisibleRows',label:'Rows in view at start',step:1,min:0},
  {k:'WallDescentPerSecond',label:'Descent (cells per second)',step:0.005,min:0},
  {k:'WallBoostFactor',label:'Speed-up factor',step:0.5,min:1},
  {k:'WallBoostMinRows',label:'Speed-up under N rows in view',step:1,min:0},
  {k:'WallBoostMinAnts',label:'Speed-up under N ants in view',step:1,min:0},
  {k:'WallBoostStopRows',label:'No speed-up within N rows of red line',step:0.5,min:0},
  {k:'LoseDepthCells',label:'Red line depth (cells from view top)',step:0.1,min:1},
  {k:'FireInterval',label:'Seconds between shots',step:0.01,min:0.01},
  {k:'ShotFlight',label:'Shot flight (s)',step:0.01,min:0},
  {k:'SwapSeconds',label:'Swap (s)',step:0.01,min:0},
  {k:'MatchHold',label:'Match hold (s)',step:0.01,min:0},
  {k:'MatchFlight',label:'Match flight to slot (s)',step:0.01,min:0},
  {k:'FallSeconds',label:'Fall (s)',step:0.01,min:0},
  {k:'RefillFrontShare',label:'Refill share from bottom-row colors',step:0.05,min:0,max:1},
];

export const DEFAULTS={
  Name:'New level',Difficulty:0,Colors:'RBGY',SlotCount:5,
  WallStartVisibleRows:4,WallDescentPerSecond:0.135,WallBoostFactor:5,WallBoostMinRows:4,WallBoostMinAnts:8,WallBoostStopRows:2,
  LoseDepthCells:8.3,QueenHp:20,FireInterval:0.15,ShotFlight:0.3,SwapSeconds:0.16,MatchHold:0.3,MatchFlight:0.45,FallSeconds:0.28,RefillFrontShare:0.4
};

export function blankLevel(name){
  const W=9,H=9,WC=10,WR=16,cols='RBGY';
  const wall=[],hp=[];
  for(let r=0;r<WR;r++){let s='';for(let c=0;c<WC;c++)s+=cols[(Math.floor(r/2)+Math.floor(c/3))%cols.length];wall.push(s);hp.push('1'.repeat(WC));}
  return normalize({...DEFAULTS,Name:name||DEFAULTS.Name,Colors:cols,WallRows:wall,WallHp:hp,BoardWidth:W,BoardHeight:H,
    BoardRows:Array(H).fill('.'.repeat(W)),BoardElements:Array(H).fill('.'.repeat(W)),TrayBottles:[],SlotLocks:'00000'});
}

const isNum=v=>typeof v==='number'&&isFinite(v);
/* Fill in anything missing and put the keys in the game's order. Unknown keys are kept at the end so nothing is lost. */
export function normalize(o){
  const out={};
  const src=o&&typeof o==='object'?o:{};
  for(const k of KEYS){
    let v=src[k];
    if(v===undefined){
      if(k in DEFAULTS)v=DEFAULTS[k];
      else if(k==='WallRows'||k==='WallHp'||k==='BoardRows'||k==='BoardElements'||k==='TrayBottles')v=[];
      else if(k==='BoardWidth')v=(src.BoardRows&&src.BoardRows[0]||'').length||9;
      else if(k==='BoardHeight')v=(src.BoardRows||[]).length||9;
      else if(k==='SlotLocks')v='0'.repeat(src.SlotCount||5);
    }
    out[k]=v;
  }
  for(const k of Object.keys(src))if(!(k in out))out[k]=src[k];
  return out;
}
/* Same layout as the game file: 2-space indent, one row string per line. */
export const serialize=lv=>JSON.stringify(normalize(lv),null,2);
export const serializeAll=list=>JSON.stringify(list.map(normalize),null,2);

export function looksLikeLevel(o){return !!(o&&typeof o==='object'&&!Array.isArray(o)&&(Array.isArray(o.WallRows)||Array.isArray(o.BoardRows)));}
export function parseLevels(text){
  text=String(text||'').trim();if(!text)return [];
  // rows copied from the sheet: quoted cells with "" for each quote
  if(/\t"\{/.test(text)||/^"\{/.test(text)){
    const got=[];for(const m of text.matchAll(/"((?:[^"]|"")*)"/g)){try{const x=JSON.parse(m[1].replace(/""/g,'"'));if(looksLikeLevel(x))got.push(normalize(x));}catch(e){}}
    if(got.length)return got;
  }
  let o;try{o=JSON.parse(text);}catch(e){
    // several objects pasted one after another
    const parts=[];let depth=0,start=-1,q=false,esc=false;
    for(let i=0;i<text.length;i++){const ch=text[i];
      if(q){if(esc)esc=false;else if(ch==='\\')esc=true;else if(ch==='"')q=false;continue;}
      if(ch==='"')q=true;else if(ch==='{'){if(!depth)start=i;depth++;}else if(ch==='}'){depth--;if(!depth&&start>=0){parts.push(text.slice(start,i+1));start=-1;}}}
    const got=[];parts.forEach(p=>{try{const x=JSON.parse(p);if(looksLikeLevel(x))got.push(normalize(x));}catch(e2){}});
    return got;
  }
  if(Array.isArray(o))return o.filter(looksLikeLevel).map(normalize);
  if(looksLikeLevel(o))return [normalize(o)];
  if(o&&Array.isArray(o.levels))return o.levels.filter(looksLikeLevel).map(normalize);
  if(o&&Array.isArray(o.Levels))return o.Levels.filter(looksLikeLevel).map(normalize);
  return [];
}

/* ---------- reading the rows ---------- */
export const wallSize=lv=>({rows:(lv.WallRows||[]).length,cols:Math.max(0,...(lv.WallRows||['']).map(r=>r.length))});
export const hpAt=(lv,r,c)=>{const d=((lv.WallHp||[])[r]||'')[c];const n=parseInt(d,36);return isFinite(n)&&n>0?n:1;};

/* Queens: each 2×2 block of Q, found top-left first. Q cells that don't form a full block are returned as stray. */
export function findQueens(rows){
  const R=rows.length,used=new Set(),queens=[],stray=[];
  const at=(r,c)=>(rows[r]||'')[c];
  for(let r=0;r<R;r++)for(let c=0;c<(rows[r]||'').length;c++){
    if(at(r,c)!==QUEEN||used.has(r+','+c))continue;
    if(at(r,c+1)===QUEEN&&at(r+1,c)===QUEEN&&at(r+1,c+1)===QUEEN&&![[r,c+1],[r+1,c],[r+1,c+1]].some(([a,b])=>used.has(a+','+b))){
      [[r,c],[r,c+1],[r+1,c],[r+1,c+1]].forEach(([a,b])=>used.add(a+','+b));queens.push({r,c});
    }else{stray.push({r,c});used.add(r+','+c);}
  }
  return {queens,stray};
}
/* Trays: each 2×2 block of T on the board, in reading order. That order matches TrayBottles. */
export function findTrays(rows){
  const used=new Set(),trays=[],stray=[];
  const at=(r,c)=>(rows[r]||'')[c];
  for(let r=0;r<rows.length;r++)for(let c=0;c<(rows[r]||'').length;c++){
    if(at(r,c)!==TRAY||used.has(r+','+c))continue;
    if(at(r,c+1)===TRAY&&at(r+1,c)===TRAY&&at(r+1,c+1)===TRAY&&![[r,c+1],[r+1,c],[r+1,c+1]].some(([a,b])=>used.has(a+','+b))){
      [[r,c],[r,c+1],[r+1,c],[r+1,c+1]].forEach(([a,b])=>used.add(a+','+b));trays.push({r,c});
    }else{stray.push({r,c});used.add(r+','+c);}
  }
  return {trays,stray};
}

/* SlotLocks: one digit per slot ("0003"), or comma-separated when a lock needs 10+ ("0,0,2,10"). */
export function parseLocks(v,n){const s=String(v==null?'':v);const a=s.includes(',')?s.split(',').map(x=>x.trim()):s.split('');
  const out=a.map(x=>parseInt(x,10)||0);if(n!=null){while(out.length<n)out.push(0);out.length=n;}return out;}
export function formatLocks(a){return a.some(x=>x>9)?a.join(','):a.join('');}
/* ---------- summary numbers ---------- */
export function tally(lv){
  const rows=lv.WallRows||[],by={};let ants=0,armored=0,hp=0;
  rows.forEach((row,r)=>{for(let c=0;c<row.length;c++){const k=row[c];if(k===EMPTY||k===QUEEN)continue;
    const h=hpAt(lv,r,c);ants++;hp+=h;if(h>1)armored++;by[k]=by[k]||{ants:0,hp:0};by[k].ants++;by[k].hp+=h;}});
  const q=findQueens(rows).queens.length,qhp=q*(+lv.QueenHp||0);
  const {trays}=findTrays(lv.BoardElements||[]);
  let choco=0;(lv.BoardElements||[]).forEach(r=>{for(const ch of r)if(isChoco(ch))choco++;});
  const locks=parseLocks(lv.SlotLocks).filter(d=>d>0).length;
  return {ants,armored,hp,by,queens:q,queenHp:qhp,shots:hp+qhp,trays:trays.length,choco,locks};
}

/* ---------- checks ---------- */
export function check(lv){
  const out=[];
  const bad=t=>out.push({lvl:'bad',t}),warn=t=>out.push({lvl:'warn',t});
  for(const k of KEYS)if(lv[k]===undefined)bad(`Missing key ${k}.`);
  const extra=Object.keys(lv).filter(k=>!KEYS.includes(k)&&!OPTIONAL_KEYS.includes(k));if(extra.length)warn(`Keys the game file doesn't have: ${extra.join(', ')}. They are exported as they are.`);
  const colors=String(lv.Colors||'');
  if(!colors.length)bad('Colors is empty.');
  [...colors].forEach(k=>{if(!COLOR_KEYS.includes(k))bad(`Colors has "${k}", which is not a known color letter.`);});
  if(new Set(colors).size!==colors.length)warn('Colors lists a color twice.');
  // wall
  const rows=lv.WallRows||[],hp=lv.WallHp||[];
  if(!rows.length)bad('The ant wall has no rows.');
  const W=rows.length?rows[0].length:0;
  rows.forEach((row,r)=>{
    if(row.length!==W)bad(`Wall row ${r+1} has ${row.length} cells, row 1 has ${W}.`);
    [...row].forEach((k,c)=>{if(k!==EMPTY&&k!==QUEEN&&!colors.includes(k))bad(`Wall row ${r+1}, cell ${c+1}: "${k}" is not in Colors.`);});
  });
  if(hp.length!==rows.length)bad(`WallHp has ${hp.length} rows, WallRows has ${rows.length}.`);
  hp.forEach((row,r)=>{if(rows[r]&&row.length!==rows[r].length)bad(`WallHp row ${r+1} has ${row.length} digits, WallRows row has ${rows[r].length}.`);
    [...row].forEach((d,c)=>{if(!/^[1-9]$/.test(d)&&!((rows[r]||'')[c]===EMPTY&&d==='0'))bad(`WallHp row ${r+1}, cell ${c+1}: "${d}" is not a digit 1–9.`);});});
  const q=findQueens(rows);
  q.stray.forEach(s=>bad(`Wall row ${s.r+1}, cell ${s.c+1}: a Q cell that is not part of a full 2×2 queen.`));
  if(q.queens.length&&!(+lv.QueenHp>0))bad('There is a Queen Ant but QueenHp is not above 0.');
  // board
  const BW=+lv.BoardWidth,BH=+lv.BoardHeight,br=lv.BoardRows||[],be=lv.BoardElements||[];
  if(!(BW>0&&BH>0))bad('BoardWidth and BoardHeight must be above 0.');
  if(br.length!==BH)bad(`BoardRows has ${br.length} rows, BoardHeight is ${BH}.`);
  if(be.length!==BH)bad(`BoardElements has ${be.length} rows, BoardHeight is ${BH}.`);
  br.forEach((row,r)=>{if(row.length!==BW)bad(`BoardRows row ${r+1} has ${row.length} cells, BoardWidth is ${BW}.`);
    [...row].forEach((ch,c)=>{if(ch!=='.'&&ch!==HOLE&&!colors.includes(ch))bad(`BoardRows row ${r+1}, cell ${c+1}: "${ch}" (use ".", "#" or a color from Colors).`);});});
  be.forEach((row,r)=>{if(row.length!==BW)bad(`BoardElements row ${r+1} has ${row.length} cells, BoardWidth is ${BW}.`);
    [...row].forEach((ch,c)=>{
      if(ch!=='.'&&!isChoco(ch)&&ch!==TRAY)bad(`BoardElements row ${r+1}, cell ${c+1}: "${ch}" (use ".", a chocolate HP 1–9, "X" or "T").`);
      if(ch===TRAY&&/[A-Z]/.test((br[r]||'')[c]||''))warn(`Board row ${r+1}, cell ${c+1}: a start color under a tray is ignored.`);
      if(ch!=='.'&&(br[r]||'')[c]===HOLE)bad(`BoardElements row ${r+1}, cell ${c+1}: an element on a cell that doesn't exist (#).`);});});
  const tr=findTrays(be);
  tr.stray.forEach(s=>bad(`Board row ${s.r+1}, cell ${s.c+1}: a T cell that is not part of a full 2×2 tray.`));
  const tb=lv.TrayBottles||[];
  if(tb.length!==tr.trays.length)bad(`The board has ${tr.trays.length} Jelly Bottle tray${tr.trays.length===1?'':'s'}, TrayBottles lists ${tb.length}.`);
  tb.forEach((s,i)=>{if(s.length!==4)bad(`TrayBottles ${i+1} has ${s.length} bottles, a tray holds 4.`);
    if(new Set(s).size!==s.length)warn(`TrayBottles ${i+1}: two bottles share a color (the GDD says each is a different color).`);
    [...s].forEach(k=>{if(!colors.includes(k))bad(`TrayBottles ${i+1}: "${k}" is not in Colors.`);});});
  const fixed=(r,c)=>{const k=(br[r]||'')[c];return /^[A-Z]$/.test(k||'')&&(be[r]||'')[c]==='.'?k:null;};
  br.forEach((row,r)=>{for(let c=0;c<row.length;c++){const k=fixed(r,c);if(!k)continue;
    if(k===fixed(r,c+1)&&k===fixed(r,c+2))warn(`Board row ${r+1}, cells ${c+1}–${c+3}: fixed cubes already make a line of 3 at the start.`);
    if(k===fixed(r+1,c)&&k===fixed(r+2,c))warn(`Board column ${c+1}, rows ${r+1}–${r+3}: fixed cubes already make a line of 3 at the start.`);}});
  let cells=0;br.forEach((row,r)=>{for(let c=0;c<row.length;c++)if(row[c]!==HOLE&&(be[r]||'')[c]==='.')cells++;});
  if(cells<9)warn(`Only ${cells} free board cells.`);
  // slots
  const n=+lv.SlotCount,locks=String(lv.SlotLocks||''),comma=locks.includes(',');
  if(!(n>0))bad('SlotCount must be above 0.');
  // an empty SlotLocks ("") means no locked slot, as in the game file
  if(comma?!/^\d+(,\d+)*$/.test(locks):!/^[0-9]*$/.test(locks))bad('SlotLocks must be digits (0 = open), or numbers split by commas when a lock is 10 or more.');
  else{const ls=parseLocks(locks);
    if(locks.length&&ls.length!==n)bad(`SlotLocks has ${ls.length} ${comma?'values':'digits'}, SlotCount is ${n}.`);
    if(locks.length&&!ls.includes(0))bad('Every slot is locked: no cannon can ever enter, so no lock can open.');}
  // tuning
  for(const t of TUNING)if(!isNum(lv[t.k]))bad(`${t.k} must be a number.`);
  if(isNum(lv.RefillFrontShare)&&(lv.RefillFrontShare<0||lv.RefillFrontShare>1))bad('RefillFrontShare must be between 0 and 1.');
  {const lc=String(lv.SlotLockColors||''),ls=parseLocks(lv.SlotLocks,n);
   if(lc){if(lc.length!==n)bad(`SlotLockColors has ${lc.length} characters, SlotCount is ${n}.`);
     [...lc].forEach((k,i)=>{if(k!=='.'&&!colors.includes(k))bad(`SlotLockColors slot ${i+1}: "${k}" is not in Colors.`);
       if(k!=='.'&&!(ls[i]>0))warn(`SlotLockColors slot ${i+1}: a color on an open slot does nothing.`);});}}
  {const rc=String(lv.RefillColors||'');[...rc].forEach(k=>{if(!colors.includes(k))bad(`RefillColors: "${k}" is not in Colors.`);});
   if(rc&&rc.length<2)warn('RefillColors has fewer than 2 colors: new cubes cannot make lines of 3 without a ready match.');}
  if(isNum(lv.WallStartVisibleRows)&&isNum(lv.LoseDepthCells)&&lv.WallStartVisibleRows>=lv.LoseDepthCells)bad('The wall starts at or past the red line.');
  if(colors.length<4)warn('Fewer than 4 colors: the GDD keeps at least 4 colors on the board.');
  if(![0,1,2].includes(lv.Difficulty))warn(`Difficulty is ${lv.Difficulty}; the tool knows 0 Normal, 1 Hard, 2 Super hard.`);
  return out;
}
export const statusOf=issues=>issues.some(i=>i.lvl==='bad')?'bad':issues.some(i=>i.lvl==='warn')?'warn':'ok';
