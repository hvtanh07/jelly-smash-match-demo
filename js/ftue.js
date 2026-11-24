/* Level 1 FTUE: 4 guided steps. Each step plants a ready move on the board, pauses the game,
   dims everything but the cubes to swap (and the target ants on step 1), and shows a text box.
   Only the shown swap is accepted. After it, the game runs until the board and the throws settle,
   then the next step starts. */
import {findGroups,bottomColors,isFront,inView,rowTop} from './engine.js';
import {LW,HEX,cellCenter,antCenter} from './render.js';

const NAME={R:'đỏ',B:'xanh dương',G:'xanh lá',Y:'vàng',O:'cam',P:'tím'};
/* shape after the swap (S), the gap cell b inside it, and the cell a outside it that slides in */
const line=(r,c0,n)=>Array.from({length:n},(_,i)=>[r,c0+i]);
export const STEPS=[
  {id:'match3',S:line(5,2,3),b:[5,3],a:[6,3],
    title:'Bước 1/4: Match 3',
    text:k=>`Kéo khối ${NAME[k]||k} sáng lên vào chỗ trống để xếp 3 khối ${NAME[k]||k} thành hàng. Mỗi hàng 3 tạo 1 pháo ${NAME[k]||k}. Pháo tự bắn những con kiến ${NAME[k]||k} đang ở hàng trước.`},
  {id:'line4',S:line(5,1,4),b:[5,2],a:[4,2],
    title:'Bước 2/4: Hàng 4 = Bom xuyên',
    text:()=>'Xếp 4 khối cùng màu thành hàng thẳng. Bạn ném 3 trái bom xuyên vào 3 cột có kiến thấp nhất. Mỗi trái trúng 3 con kiến, màu nào cũng trúng.'},
  {id:'tshape',S:[[4,2],[4,3],[4,4],[5,3],[6,3]],b:[4,3],a:[3,3],
    title:'Bước 3/4: Chữ T = Bom',
    text:()=>'Xếp 5 khối cùng màu thành hình chữ T. Bạn ném 1 trái bom vào đám kiến gần hàng dưới cùng. Bom nổ một vùng 3×3, màu nào cũng trúng.'},
  {id:'line5',S:line(5,1,5),b:[5,3],a:[4,3],
    title:'Bước 4/4: Hàng 5 = Pháo cầu vồng',
    text:()=>'Xếp 5 khối cùng màu thành hàng thẳng để tạo Pháo cầu vồng. Pháo này vào hàng slot và bắn được kiến mọi màu.'},
];
const key=([r,c])=>r*100+c;

/* Recolor the board so the step's swap makes exactly its shape and nothing matches before it. */
export function plant(G,step){
  const st=STEPS[step],cols=[...String(G.lv.Colors||'RBGY')];
  const bc=[...bottomColors(G)].filter(k=>cols.includes(k));
  const k=bc.length?bc[Math.floor(Math.random()*bc.length)]:cols[0];
  const fixed=new Map();st.S.forEach(p=>fixed.set(key(p),k));fixed.set(key(st.a),k);
  const cube=(r,c)=>{const x=G.cells[r]&&G.cells[r][c];return x&&x.kind==='cube'?x:null;};
  const others=cols.filter(x=>x!==k);
  for(let t=0;t<400;t++){
    fixed.set(key(st.b),others[Math.floor(Math.random()*others.length)]);
    for(let r=0;r<G.BH;r++)for(let c=0;c<G.BW;c++){const x=cube(r,c);if(!x)continue;
      if(fixed.has(key([r,c]))){x.color=fixed.get(key([r,c]));continue;}
      const avoid=new Set();const L1=cube(r,c-1),L2=cube(r,c-2),U1=cube(r-1,c),U2=cube(r-2,c);
      if(L1&&L2&&L1.color===L2.color)avoid.add(L1.color);if(U1&&U2&&U1.color===U2.color)avoid.add(U1.color);
      if(t%2)avoid.add(k);   // half the tries keep the step color off the rest of the board
      const pool=cols.filter(x=>!avoid.has(x));x.color=(pool.length?pool:cols)[Math.floor(Math.random()*(pool.length||cols.length))];}
    if(findGroups(G).length)continue;
    const A=G.cells[st.a[0]][st.a[1]],B=G.cells[st.b[0]][st.b[1]];
    G.cells[st.a[0]][st.a[1]]=B;G.cells[st.b[0]][st.b[1]]=A;
    const g=findGroups(G);
    G.cells[st.a[0]][st.a[1]]=A;G.cells[st.b[0]][st.b[1]]=B;
    const want=new Set(st.S.map(key));
    if(g.length===1&&g[0].cells.length===want.size&&g[0].cells.every(p=>want.has(key(p))))return {k,a:st.a,b:st.b};
  }
  return null;
}
export const isStepSwap=(f,p,q)=>(key(p)===key(f.a)&&key(q)===key(f.b))||(key(p)===key(f.b)&&key(q)===key(f.a));

function rr(g,x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function wrap(g,text,w){const out=[];let line='';for(const word of text.split(' ')){const t=line?line+' '+word:word;if(g.measureText(t).width>w&&line){out.push(line);line=word;}else line=t;}if(line)out.push(line);return out;}
const FONT='Fredoka, ui-rounded, system-ui, sans-serif';

/* draws the dim layer, the highlight holes, the hand and the text box; returns the skip button rect */
export function drawFtue(g,G,L,f,t){
  const st=STEPS[f.step];
  const holes=[];
  const cellR=p=>{const c=cellCenter(G,L,p[0],p[1]);return [c.x-L.bc/2,c.y-L.bc/2,L.bc,L.bc];};
  st.S.forEach(p=>{if(p[0]!==f.b[0]||p[1]!==f.b[1])holes.push(cellR(p));});holes.push(cellR(f.a));holes.push(cellR(f.b));
  if(f.step===0){for(const a of G.ants)if(a.alive&&a.color===f.k&&isFront(G,a)&&inView(G,a)){const c=antCenter(G,L,a);holes.push([c.x-L.wc/2,c.y-L.wc/2,L.wc,L.wc]);}}
  g.save();g.beginPath();g.rect(-20,-20,LW+40,L.H+40);holes.forEach(([x,y,w,h])=>rr(g,x-1,y-1,w+2,h+2,8));
  g.fillStyle='rgba(8,3,20,.72)';g.fill('evenodd');
  // pulse the cells to swap
  const pulse=0.5+0.5*Math.sin(t*6);
  g.strokeStyle=`rgba(255,217,61,${0.55+0.45*pulse})`;g.lineWidth=3;
  [f.a,f.b].forEach(p=>{const [x,y,w,h]=cellR(p);g.beginPath();rr(g,x+1,y+1,w-2,h-2,9);g.stroke();});
  if(f.step===0){g.strokeStyle=`rgba(255,255,255,${0.4+0.4*pulse})`;g.lineWidth=2;holes.slice(st.S.length+1).forEach(([x,y,w,h])=>{g.beginPath();rr(g,x+1,y+1,w-2,h-2,6);g.stroke();});}
  // hand: slides from a to b
  const A=cellCenter(G,L,f.a[0],f.a[1]),B=cellCenter(G,L,f.b[0],f.b[1]),q=(t*0.8)%1,e=q<0.6?q/0.6:1,hx=A.x+(B.x-A.x)*e,hy=A.y+(B.y-A.y)*e;
  g.globalAlpha=q<0.85?1:Math.max(0,1-(q-0.85)/0.15);
  g.fillStyle='#fff';g.strokeStyle='#2a1846';g.lineWidth=2.5;
  g.beginPath();g.arc(hx+8,hy+10,9,0,Math.PI*2);g.fill();g.stroke();
  g.beginPath();rr(g,hx+4,hy-6,8,16,4);g.fill();g.stroke();
  g.globalAlpha=1;
  // text box above the board, over the slot row
  const bw=LW-24,x=12;g.font=`600 13px ${FONT}`;const lines=wrap(g,st.text(f.k),bw-28);
  const bh=34+lines.length*18+6,y=Math.max(L.viewTop+8,L.boardTop-bh-8);
  g.beginPath();rr(g,x,y,bw,bh,14);g.fillStyle='#fff7dc';g.fill();g.lineWidth=3;g.strokeStyle='#ffd93d';g.stroke();
  g.fillStyle='#2a1846';g.textAlign='left';g.textBaseline='middle';g.font=`700 15px ${FONT}`;g.fillText(st.title,x+14,y+17);
  g.font=`600 13px ${FONT}`;lines.forEach((ln,i)=>g.fillText(ln,x+14,y+38+i*18));
  if(f.step===0){g.fillStyle=HEX[f.k]||'#999';g.beginPath();g.arc(x+bw-22,y+17,7,0,Math.PI*2);g.fill();}
  // skip
  const sk={x:x+bw-78,y:y+bh+4,w:78,h:22};
  g.font=`600 12px ${FONT}`;g.textAlign='right';g.fillStyle='rgba(255,255,255,.75)';g.fillText('Bỏ qua hướng dẫn',sk.x+sk.w,sk.y+11);
  g.restore();
  void rowTop;
  return sk;
}
