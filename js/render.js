/* Draws the demo on a canvas (portrait, 360 logical px wide) in the purple arena look,
   and turns engine events into feel effects (option C): flying jelly, praise, combo text,
   screen shake, ant pops, cannon recoil, ammo bumps, chocolate crumbs, sounds and short vibrations. */
import {rowTop,isFront,inView,RACK} from './engine.js';

export const LW=360;
const PAD=8,HUD=40,POW=22,SLOT_H=58,RACK_H=46;
export const HEX={R:'#ff5470',O:'#ff9f2e',Y:'#ffd93d',G:'#2fd39a',B:'#3d9dff',P:'#a66bff',K:'#ff7ac8',C:'#3fd6e6'};
const hex=k=>HEX[k]||'#999';
export const FONT='Fredoka, ui-rounded, system-ui, sans-serif';

export function layoutOf(G,opt){
  const wc=(LW-PAD*2)/Math.max(1,G.C),viewH=(+G.lv.LoseDepthCells||8)*wc;
  const bc=Math.min(46,(LW-PAD*2)/Math.max(1,G.BW));
  const powTop=HUD+2,viewTop=powTop+(opt.power?POW+6:0);
  const rackTop=viewTop+viewH+6,rackH=0;
  const slotTop=rackTop+4,boardTop=slotTop+SLOT_H+10;
  const bx0=(LW-bc*G.BW)/2;
  const n=Math.max(1,G.slots.length),sg=8,sw=(LW-PAD*2-(n-1)*sg)/n;
  return {wc,viewH,bc,powTop,viewTop,rackTop,rackH,slotTop,boardTop,bx0,sw,sg,H:boardTop+bc*G.BH+PAD+2};
}
const lerp=(a,b,t)=>a+(b-a)*t,ease=t=>1-Math.pow(1-t,3),back=t=>1+2.2*Math.pow(t-1,3)+1.2*Math.pow(t-1,2);
function rr(g,x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function shade(h,f){const n=parseInt(h.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;
  if(f<0){r*=1+f;g*=1+f;b*=1+f;}else{r+=(255-r)*f;g+=(255-g)*f;b+=(255-b)*f;}
  return `rgb(${r|0},${g|0},${b|0})`;}
/* plain jelly cube, no face */
function cube(g,cx,cy,s,h,sx=1,sy=1,alpha=1,crust=false){
  const w=s*sx,hh=s*sy,x=cx-w/2,y=cy-hh/2+(1-sy)*s*0.3;
  g.globalAlpha=alpha;
  rr(g,x,y+hh*0.06,w,hh*0.94,s*0.26);g.fillStyle=shade(h,-0.32);g.fill();
  rr(g,x,y,w,hh*0.9,s*0.26);const gr=g.createLinearGradient(0,y,0,y+hh);gr.addColorStop(0,shade(h,0.45));gr.addColorStop(0.45,h);gr.addColorStop(1,h);g.fillStyle=gr;g.fill();
  g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.ellipse(x+w*0.32,y+hh*0.24,w*0.19,hh*0.09,-0.35,0,Math.PI*2);g.fill();
  g.fillStyle='rgba(255,255,255,.8)';g.beginPath();g.arc(x+w*0.72,y+hh*0.2,s*0.04,0,Math.PI*2);g.fill();
  if(crust){g.strokeStyle='rgba(255,255,255,.3)';g.lineWidth=s*0.05;rr(g,x+w*0.2,y+hh*0.22,w*0.6,hh*0.48,s*0.14);g.stroke();}
  g.globalAlpha=1;
}
function label(g,txt,x,y,size,fill,stroke,weight=700){g.font=`${weight} ${size}px ${FONT}`;g.textAlign='center';g.textBaseline='middle';
  if(stroke){g.lineWidth=Math.max(2.5,size/4.5);g.strokeStyle=stroke;g.lineJoin='round';g.strokeText(txt,x,y);}g.fillStyle=fill;g.fillText(txt,x,y);}
const RAINBOW=['#ff5470','#ff9f2e','#ffd93d','#2fd39a','#3d9dff','#a66bff'];

export function slotCenter(G,L,i){return {x:PAD+i*(L.sw+L.sg)+L.sw/2,y:L.slotTop+SLOT_H/2};}
const RW=70,RG=10;
export function rackCenter(G,L,j){const x0=(LW-(RACK*RW+(RACK-1)*RG))/2;return {x:x0+j*(RW+RG)+RW/2,y:L.rackTop+L.rackH/2};}
export function antCenter(G,L,a){return {x:PAD+(a.c+a.w/2)*L.wc,y:L.viewTop+(rowTop(G,a.r)+a.h/2)*L.wc};}
export function cellCenter(G,L,r,c){return {x:L.bx0+(c+0.5)*L.bc,y:L.boardTop+(r+0.5)*L.bc};}
export function cellAt(G,L,x,y){const c=Math.floor((x-L.bx0)/L.bc),r=Math.floor((y-L.boardTop)/L.bc);return r>=0&&r<G.BH&&c>=0&&c<G.BW?[r,c]:null;}
function powerCenter(L){return {x:LW/2,y:L.powTop+POW/2};}

/* ---------- sound: tiny WebAudio synth, no files ---------- */
export const Sound={ctx:null,on:true,last:{},
  init(){if(this.ctx)return;try{this.ctx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){this.ctx=null;}},
  play(kind,p=0){if(!this.on||!this.ctx)return;const t=this.ctx.currentTime;
    const gap={shot:0.035,kill:0.03}[kind]||0;if(gap&&this.last[kind]&&t-this.last[kind]<gap)return;this.last[kind]=t;
    const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.connect(g);g.connect(this.ctx.destination);
    const env=(a,d,v)=>{g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(v,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+a+d);o.start(t);o.stop(t+a+d+0.02);};
    if(kind==='match'){o.type='sine';const f=520*Math.pow(1.122,p);o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*1.6,t+0.09);env(0.005,0.16,0.22);}
    else if(kind==='shot'){o.type='triangle';o.frequency.setValueAtTime(900,t);o.frequency.exponentialRampToValueAtTime(420,t+0.06);env(0.002,0.06,0.05);}
    else if(kind==='kill'){o.type='sine';o.frequency.setValueAtTime(300+Math.random()*80,t);o.frequency.exponentialRampToValueAtTime(130,t+0.09);env(0.002,0.1,0.09);}
    else if(kind==='cannon'){o.type='square';o.frequency.setValueAtTime(330,t);o.frequency.exponentialRampToValueAtTime(660,t+0.08);env(0.004,0.1,0.05);}
    else if(kind==='special'){o.type='sawtooth';o.frequency.setValueAtTime(440,t);o.frequency.exponentialRampToValueAtTime(1320,t+0.25);env(0.01,0.3,0.08);}
    else if(kind==='boom'){o.type='sawtooth';o.frequency.setValueAtTime(160,t);o.frequency.exponentialRampToValueAtTime(40,t+0.35);env(0.005,0.4,0.2);}
    else if(kind==='super'){o.type='sawtooth';o.frequency.setValueAtTime(220,t);o.frequency.exponentialRampToValueAtTime(1760,t+0.45);env(0.02,0.5,0.14);}
    else if(kind==='lost'){o.type='sine';o.frequency.setValueAtTime(300,t);o.frequency.exponentialRampToValueAtTime(150,t+0.2);env(0.005,0.22,0.08);}
    else if(kind==='choco'){o.type='square';o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(90,t+0.06);env(0.002,0.07,0.06);}
    else if(kind==='unlock'){o.type='triangle';o.frequency.setValueAtTime(660,t);o.frequency.setValueAtTime(990,t+0.08);env(0.005,0.25,0.12);}
    else if(kind==='win'){o.type='triangle';[523,659,784,1047].forEach((f,i)=>o.frequency.setValueAtTime(f,t+i*0.1));env(0.01,0.55,0.14);}
    else if(kind==='lose'){o.type='sine';o.frequency.setValueAtTime(330,t);o.frequency.exponentialRampToValueAtTime(110,t+0.6);env(0.01,0.6,0.12);}
  }};
const buzz=ms=>{try{if(navigator.vibrate)navigator.vibrate(ms);}catch(e){}};

/* ---------- fx state ---------- */
export function newUi(){return {sel:null,hint:null,pops:[],parts:[],blobs:[],deaths:[],rings:[],shake:0,flash:0,flashCol:'#fff',powerBump:0,ammoSeen:new Map(),bumps:new Map(),t:0};}
function burst(ui,x,y,col,n,sp=150,size=3){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=sp*(0.4+Math.random());ui.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-50,life:0.5+Math.random()*0.25,max:0.75,col,r:size+Math.random()*size});}}
function pop(ui,x,y,text,col,opt={}){ui.pops.push({x,y,text,col,age:0,size:opt.size||20,sub:opt.sub||'',life:opt.life||1.1,big:!!opt.big});}

export function handleEvent(G,L,ui,ev,opt){
  const fx=opt.feel;
  if(ev.type==='match'){
    const c=cellCenter(G,L,ev.at.r,ev.at.c),col=hex(ev.color);
    // where the jelly goes
    let to;
    const thrown=ev.special==='line'||ev.special==='bomb';
    if(thrown)to=null;
    else if(ev.special){const j=G.slots.findIndex(s=>s.lock===0&&!s.cannon);to=j>=0?slotCenter(G,L,j):(opt.power?powerCenter(L):{x:LW/2,y:L.slotTop+SLOT_H/2});}
    else{const same=G.slots.findIndex(s=>s.cannon&&!s.cannon.special&&s.cannon.color===ev.color),free=same>=0?same:G.slots.findIndex(s=>s.lock===0&&!s.cannon);
      to=free>=0?slotCenter(G,L,free):(opt.power?powerCenter(L):{x:LW/2,y:L.slotTop+SLOT_H/2});}
    const dur=+G.lv.MatchFlight||0.45;
    if(to){if(fx){ev.cells.forEach(([r,cc],i)=>{const p=cellCenter(G,L,r,cc);ui.blobs.push({x0:p.x,y0:p.y,x1:to.x,y1:to.y,t:-i*0.025,dur,col,special:ev.special});burst(ui,p.x,p.y,col,4,90,2.5);});}
      else ui.blobs.push({x0:c.x,y0:c.y,x1:to.x,y1:to.y,t:0,dur,col});}
    else{ev.cells.forEach(([r,cc])=>{const p=cellCenter(G,L,r,cc);burst(ui,p.x,p.y,col,fx?7:2,140,3);});}
    const kindName={line:'Bom xuyên ×3!',rainbow:'Pháo cầu vồng!',bomb:'Bom!'}[ev.special];
    const text=kindName||(fx?ev.praise:'');
    pop(ui,c.x,c.y,text,shade(col,0.45),{sub:thrown?(ev.combo?`combo ×${ev.chain}`:''):'+'+ev.ammo+(ev.combo?`  (combo +${ev.combo})`:''),size:kindName?20:(ev.n>=6?26:22),big:!!(kindName||ev.n>=5)});
    if(thrown&&fx){Sound.play('special');}
    if(fx&&ev.chain>1)pop(ui,LW/2,L.boardTop+30,'Combo ×'+ev.chain,'#ffd93d',{size:16+Math.min(10,ev.chain*2),life:0.9});
    if(fx){if(ev.n>=5||ev.special)ui.shake=Math.max(ui.shake,ev.special?7:5);Sound.play('match',Math.min(8,(ev.chain-1)*2+(ev.n-3)));buzz(ev.n>=5?25:8);}
  }
  else if(ev.type==='notarget'){const c=cellCenter(G,L,ev.at.r,ev.at.c);pop(ui,c.x,c.y,opt.power?'Không có mục tiêu → Power':'Không có mục tiêu','#c9b8e8',{size:13});}
  else if(ev.type==='lost'){pop(ui,LW/2,L.slotTop+SLOT_H/2,opt.power?`Slot đầy → +${ev.ammo} Power`:'Slot đầy: mất pháo',opt.power?'#ffd93d':'#ff8aa0',{size:14});if(fx)Sound.play(opt.power?'cannon':'lost');}
  else if(ev.type==='cannon'||ev.type==='merge'){if(fx){const q=slotCenter(G,L,ev.slot);burst(ui,q.x,q.y,hex(ev.color),8,110,2.5);ui.rings.push({x:q.x,y:q.y,t:0,col:hex(ev.color),r0:12,r1:34});Sound.play('cannon');}
    if(ev.type==='merge'){const q=slotCenter(G,L,ev.slot);pop(ui,q.x,q.y-30,'Gộp',shade(hex(ev.color),0.45),{size:14,life:0.7});}}
  else if(ev.type==='special'){const q=slotCenter(G,L,ev.slot);if(fx){burst(ui,q.x,q.y,'#fff',16,170,3);ui.rings.push({x:q.x,y:q.y,t:0,col:'#fff',r0:10,r1:46});ui.flash=0.25;ui.flashCol=hex(ev.color);Sound.play('special');}}
  else if(ev.type==='fire'){if(fx)Sound.play('shot');}
  else if(ev.type==='kill'){const a=G.ants[ev.ant],p=antCenter(G,L,a),col=hex(a.color);
    ui.deaths.push({x:p.x,y:p.y,col,t:0,s:L.wc*0.88});if(fx){burst(ui,p.x,p.y,col,ev.how?10:7,ev.how?190:140,2.5);Sound.play('kill');}}
  else if(ev.type==='blast'){const a=G.ants[ev.ant],p=antCenter(G,L,a);if(fx){ui.rings.push({x:p.x,y:p.y,t:0,col:'#ffd93d',r0:6,r1:L.wc*1.8});burst(ui,p.x,p.y,'#ffd93d',14,230,3);ui.shake=Math.max(ui.shake,5);Sound.play('boom');buzz(20);}}
  else if(ev.type==='pierce'){if(fx&&ev.n){const a=G.ants[ev.ant],p=antCenter(G,L,a);ui.rings.push({x:p.x,y:p.y-ev.n*L.wc/2,t:0,col:'#fff',r0:4,r1:L.wc,line:ev.n*L.wc});}}
  else if(ev.type==='power'){ui.powerBump=1;}
  else if(ev.type==='super'){const p=powerCenter(L);pop(ui,LW/2,L.viewTop+L.viewH*0.55,'SUPER!','#ffd93d',{size:40,life:1.2,big:true});
    if(fx){ui.flash=0.45;ui.flashCol='#ffd93d';ui.shake=Math.max(ui.shake,9);burst(ui,p.x,p.y,'#ffd93d',30,260,3.5);Sound.play('super');buzz([30,40,30]);}}
  else if(ev.type==='choco'){const p=cellCenter(G,L,ev.r,ev.c);if(fx){burst(ui,p.x,p.y,'#8a5432',ev.left<=0?14:7,ev.left<=0?170:110,3);Sound.play('choco');}
    if(ev.left<=0)pop(ui,p.x,p.y,'','#fff',{life:0.1});}
  else if(ev.type==='unlock'){const q=slotCenter(G,L,ev.slot);pop(ui,q.x,q.y-28,'Mở slot!','#9fe8b5',{size:16});if(fx){burst(ui,q.x,q.y,'#c9d2e8',16,160,3);ui.rings.push({x:q.x,y:q.y,t:0,col:'#9fe8b5',r0:10,r1:40});Sound.play('unlock');buzz(15);}}
  else if(ev.type==='reshuffle'){pop(ui,LW/2,L.boardTop+L.bc*G.BH/2,'Hết nước: xáo bàn','#fff',{size:16});}
  else if(ev.type==='win'){Sound.play('win');}
  else if(ev.type==='lose'){Sound.play('lose');}
}

export function updateFx(ui,dt){
  ui.t+=dt;
  for(const p of ui.parts){p.life-=dt;p.vy+=520*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}ui.parts=ui.parts.filter(p=>p.life>0);
  for(const b of ui.blobs)b.t+=dt/b.dur;ui.blobs=ui.blobs.filter(b=>b.t<1);
  for(const d of ui.deaths)d.t+=dt/0.28;ui.deaths=ui.deaths.filter(d=>d.t<1);
  for(const r of ui.rings)r.t+=dt/0.4;ui.rings=ui.rings.filter(r=>r.t<1);
  for(const p of ui.pops)p.age+=dt;ui.pops=ui.pops.filter(p=>p.age<p.life);
  ui.shake=Math.max(0,ui.shake-dt*30);ui.flash=Math.max(0,ui.flash-dt*1.6);ui.powerBump=Math.max(0,ui.powerBump-dt*4);
  for(const [k,v] of ui.bumps){const nv=v-dt*5;if(nv<=0)ui.bumps.delete(k);else ui.bumps.set(k,nv);}
}

/* ---------- cannons ---------- */
function drawCannon(g,k,cx,cy,w,ui,fx){
  const col=hex(k.color),bump=ui.bumps.get(k.id)||0;
  let s=1+0.28*Math.sin((k.pop||0)*Math.PI);s*=Math.min(1,(w-4)/56);
  const rec=fx?(k.recoil||0):0;k.recoil=Math.max(0,(k.recoil||0)-0.12);
  g.save();g.translate(cx,cy+4);g.scale(s,s);g.globalAlpha=k.waiting&&k.ammo>0?0.72:1;
  const ry=rec*5;
  if(k.special==='rainbow'){const gr=g.createLinearGradient(-12,0,12,0);RAINBOW.forEach((c,i)=>gr.addColorStop(i/5,c));
    rr(g,-9,-30+ry,18,30,7);g.fillStyle='#3b2560';g.fill();rr(g,-7,-30+ry,14,26,6);g.fillStyle=gr;g.fill();rr(g,-11,-33+ry,22,8,4);g.fillStyle='#fff';g.fill();}
  else if(k.special==='bomb'){g.fillStyle='#2a1846';g.beginPath();g.arc(0,-20+ry,12,0,Math.PI*2);g.fill();g.fillStyle=col;g.beginPath();g.arc(0,-20+ry,8,0,Math.PI*2);g.fill();
    g.strokeStyle='#ffd93d';g.lineWidth=2;g.beginPath();g.moveTo(6,-30+ry);g.quadraticCurveTo(12,-38+ry,8,-42+ry);g.stroke();
    if(Math.floor(ui.t*8)%2){g.fillStyle='#fff';g.beginPath();g.arc(8,-43+ry,2.6,0,Math.PI*2);g.fill();}}
  else{rr(g,-9,-30+ry,18,30,7);g.fillStyle=shade(col,-0.35);g.fill();rr(g,-7,-30+ry,14,26,6);g.fillStyle=col;g.fill();rr(g,-11,-33+ry,22,8,4);g.fillStyle=shade(col,0.45);g.fill();
    if(k.special==='line'){g.strokeStyle='#fff';g.lineWidth=2;for(const yy of [-24,-17,-10]){g.beginPath();g.moveTo(-6,yy+ry);g.lineTo(6,yy+ry);g.stroke();}}}
  if(fx&&rec>0.4){g.globalAlpha=rec;g.fillStyle='#fff';g.beginPath();g.arc(0,-38+ry,7*rec+2,0,Math.PI*2);g.fill();g.globalAlpha=1;}
  rr(g,-28,-6,56,26,12);g.fillStyle=shade(col,-0.35);g.fill();
  rr(g,-28,-8,56,24,12);const gr=g.createLinearGradient(0,-8,0,16);gr.addColorStop(0,shade(col,0.45));gr.addColorStop(1,col);g.fillStyle=gr;g.fill();
  g.fillStyle='rgba(23,12,40,.85)';rr(g,-17,-3,34,16,8);g.fill();
  g.save();g.translate(0,5.5);const bs=1+bump*0.45;g.scale(bs,bs);label(g,String(k.ammo),0,0,13,bump>0.3?'#ffd93d':'#fff');g.restore();
  g.restore();
}

/* ---------- frame ---------- */
export function draw(g,G,L,ui,opt){
  const fx=opt.feel;
  g.save();
  if(fx&&ui.shake>0)g.translate((Math.random()-.5)*ui.shake,(Math.random()-.5)*ui.shake);
  const bg=g.createLinearGradient(0,0,0,L.H);bg.addColorStop(0,'#2b1650');bg.addColorStop(1,'#1a0d2e');g.fillStyle=bg;g.fillRect(-20,-20,LW+40,L.H+40);
  // HUD: level pill + progress
  const left=G.ants.filter(a=>a.alive).length;
  rr(g,PAD,8,86,28,14);g.fillStyle='#ffd93d';g.fill();label(g,'LEVEL '+opt.levelNo,PAD+43,22.5,14,'#2a1846');
  const bx=PAD+94,bw=LW-PAD-bx;rr(g,bx,10,bw,24,12);g.fillStyle='rgba(10,4,24,.55)';g.fill();
  const pct=1-left/(G.totalAnts||1);if(pct>0){rr(g,bx+3,13,Math.max(18,(bw-6)*pct),18,9);g.fillStyle='#2fd39a';g.fill();}
  label(g,`Còn ${left} khối`,bx+bw/2,22.5,12,'#fff',null,600);
  // power meter (A)
  if(opt.power){const y=L.powTop,w=LW-PAD*2,f=Math.min(1,G.power/G.powerMax),full=f>=0.85;
    rr(g,PAD,y,w,POW,POW/2);g.fillStyle='rgba(10,4,24,.6)';g.fill();
    if(f>0){rr(g,PAD+2,y+2,Math.max(POW-4,(w-4)*f),POW-4,(POW-4)/2);const gr=g.createLinearGradient(PAD,0,PAD+w,0);RAINBOW.forEach((c,i)=>gr.addColorStop(i/5,c));g.fillStyle=gr;g.fill();
      if(full&&fx){g.globalAlpha=0.35+0.35*Math.sin(ui.t*12);g.fillStyle='#fff';g.fill();g.globalAlpha=1;}}
    if(ui.powerBump&&fx){rr(g,PAD-1,y-1,w+2,POW+2,POW/2+1);g.strokeStyle=`rgba(255,217,61,${ui.powerBump})`;g.lineWidth=2;g.stroke();}
    label(g,`POWER ${Math.floor(G.power)}/${G.powerMax}`,LW/2,y+POW/2+0.5,11,'#fff','rgba(23,12,40,.85)');}
  // ant view
  g.save();rr(g,PAD-4,L.viewTop,LW-PAD*2+8,L.viewH,14);g.fillStyle='rgba(10,4,24,.45)';g.fill();g.clip();
  const s=L.wc*0.88;
  for(const a of G.ants){if(!a.alive)continue;
    const y=L.viewTop+rowTop(G,a.r)*L.wc;if(y>L.viewTop+L.viewH+L.wc||y+a.h*L.wc<L.viewTop-L.wc)continue;
    const cx=PAD+(a.c+a.w/2)*L.wc,cy=y+a.h*L.wc/2,front=isFront(G,a)&&inView(G,a);
    cube(g,cx,cy,s,hex(a.color),1,1,front?1:0.8,true);
    if(a.hp>1){label(g,String(a.hp-1),cx,cy,Math.max(9,L.wc*0.45),'#fff','rgba(0,0,0,.6)');}
    if(a.pend>0){rr(g,cx-s/2+1,cy-s/2+1,s-2,s*0.9-2,s*0.24);g.lineWidth=2;g.strokeStyle='rgba(255,255,255,.85)';g.stroke();}
  }
  for(const d of ui.deaths){const k=d.t<0.4?1+d.t*0.8:1.32*(1-(d.t-0.4)/0.6);cube(g,d.x,d.y,d.s,d.col,k,k,Math.max(0,1-d.t*0.6),true);}
  g.restore();
  if(G.boost>1&&!G.over){label(g,'▼ tăng tốc',LW-PAD-34,L.viewTop+12,11,'#ffd93d','rgba(23,12,40,.8)',600);}
  // red line
  const lows=G.ants.filter(a=>a.alive).map(a=>rowTop(G,a.r+a.h-1)+1),low=lows.length?Math.max(...lows):-99,gap=(+G.lv.LoseDepthCells)-low;
  const warn=gap<1.2&&!G.over;
  g.strokeStyle=warn&&Math.floor(ui.t*4)%2?'#ff3d5f':'rgba(255,90,120,.75)';g.lineWidth=3;g.setLineDash([8,6]);
  g.beginPath();g.moveTo(PAD-4,L.viewTop+L.viewH);g.lineTo(LW-PAD+4,L.viewTop+L.viewH);g.stroke();g.setLineDash([]);
  // slots
  G.slots.forEach((sl,i)=>{const x=PAD+i*(L.sw+L.sg),y=L.slotTop;
    rr(g,x,y,L.sw,SLOT_H,14);g.fillStyle='rgba(10,4,24,.45)';g.fill();
    if(sl.lock>0){const cx=x+L.sw/2,cy=y+SLOT_H/2,lc=sl.lockColor?hex(sl.lockColor):'#c9d2e8';
      g.fillStyle='rgba(255,255,255,.08)';rr(g,x,y,L.sw,SLOT_H,14);g.fill();
      if(sl.lockColor){g.strokeStyle=lc;g.lineWidth=2.5;rr(g,x+1.5,y+1.5,L.sw-3,SLOT_H-3,13);g.stroke();}
      g.strokeStyle='#c9d2e8';g.lineWidth=3.5;g.beginPath();g.arc(cx,cy-6,8,Math.PI,0);g.stroke();
      rr(g,cx-13,cy-6,26,20,5);g.fillStyle=lc;g.fill();label(g,String(sl.lock),cx,cy+4,13,'#2a1846');return;}
    const k=sl.cannon;
    if(!k){g.setLineDash([5,5]);g.strokeStyle='rgba(182,163,214,.45)';g.lineWidth=1.5;rr(g,x+.75,y+.75,L.sw-1.5,SLOT_H-1.5,14);g.stroke();g.setLineDash([]);
      label(g,'trống',x+L.sw/2,y+SLOT_H/2,11,'rgba(182,163,214,.5)',null,500);return;}
    drawCannon(g,k,x+L.sw/2,y+SLOT_H/2,L.sw,ui,fx);
    if(k.waiting&&k.ammo>0)label(g,'chờ',x+L.sw/2,y+SLOT_H-7,9,'rgba(255,255,255,.75)',null,500);
  });
  // board
  rr(g,L.bx0-6,L.boardTop-6,L.bc*G.BW+12,L.bc*G.BH+12,16);g.fillStyle='rgba(10,4,24,.5)';g.fill();
  for(let r=0;r<G.BH;r++)for(let c=0;c<G.BW;c++){const x=G.cells[r][c];if(!x)continue;
    g.fillStyle=(r+c)%2?'rgba(255,255,255,.05)':'rgba(255,255,255,.09)';g.fillRect(L.bx0+c*L.bc,L.boardTop+r*L.bc,L.bc,L.bc);}
  // holes: show the cut-in as arena color so the shape reads
  for(let r=0;r<G.BH;r++)for(let c=0;c<G.BW;c++)if(!G.cells[r][c]){g.fillStyle='#21123b';g.fillRect(L.bx0+c*L.bc-0.5,L.boardTop+r*L.bc-0.5,L.bc+1,L.bc+1);}
  const bs=L.bc*0.9;
  const swapT=G.state==='swap'||G.state==='swapback'?1-Math.max(0,G.timer)/(+G.lv.SwapSeconds||1):1;
  const fallT=G.state==='fall'?1-Math.max(0,G.timer)/(+G.lv.FallSeconds||1):1;
  g.save();g.beginPath();g.rect(L.bx0-6,L.boardTop,L.bc*G.BW+12,L.bc*G.BH+6);g.clip();
  const hintOn=ui.hint&&Math.floor(ui.t*2.5)%2;
  for(let r=0;r<G.BH;r++)for(let c=0;c<G.BW;c++){const x=G.cells[r][c];if(!x||x.kind==='empty')continue;
    let px=L.bx0+(c+0.5)*L.bc,py=L.boardTop+(r+0.5)*L.bc,sx=1,sy=1;
    if(x.kind==='cube'){
      if(x.from!=null&&G.state==='fall'){const e=fx?Math.min(1,fallT*fallT*1.15):ease(fallT);py=L.boardTop+(lerp(x.from,r,Math.min(1,e))+0.5)*L.bc;if(x.fromC!=null&&x.fromC!==c)px=L.bx0+(lerp(x.fromC,c,e)+0.5)*L.bc;
        if(fx&&e>=1&&x.from<r){x.land=1;}}
      if(fx&&x.land){x.land=Math.max(0,x.land-0.08);sx=1+0.14*x.land;sy=1-0.14*x.land;}
      if(G.swapPair&&swapT<1){const [a,b]=G.swapPair;const me=a[0]===r&&a[1]===c?b:b[0]===r&&b[1]===c?a:null;
        if(me){px=lerp(L.bx0+(me[1]+0.5)*L.bc,px,ease(swapT));py=lerp(L.boardTop+(me[0]+0.5)*L.bc,py,ease(swapT));}}
      let k=1;if(x.dying){k=fx?1+0.12*Math.sin(ui.t*40):0.9;}
      if(x.glow){g.globalAlpha=x.glow*0.6;g.fillStyle='#fff';rr(g,px-L.bc/2,py-L.bc/2,L.bc,L.bc,L.bc*0.28);g.fill();g.globalAlpha=1;}
      const sel=ui.sel&&ui.sel[0]===r&&ui.sel[1]===c,hint=hintOn&&ui.hint.some(([a,b])=>a===r&&b===c);
      if(sel||hint){g.fillStyle=sel?'rgba(255,255,255,.22)':'rgba(255,217,61,.28)';rr(g,px-L.bc/2+1,py-L.bc/2+1,L.bc-2,L.bc-2,L.bc*0.26);g.fill();}
      cube(g,px,py,bs*k*(sel?1.08:1),hex(x.color),sx,sy);
    }else if(x.kind==='choco'){
      const x0=px-bs/2,y0=py-bs/2;
      rr(g,x0,y0+2,bs,bs-2,bs*0.18);g.fillStyle='#3e2210';g.fill();
      rr(g,x0,y0,bs,bs-3,bs*0.18);const gr=g.createLinearGradient(0,y0,0,y0+bs);gr.addColorStop(0,'#9a6238');gr.addColorStop(1,'#6b3e22');g.fillStyle=gr;g.fill();
      g.strokeStyle='rgba(40,20,8,.6)';g.lineWidth=1.6;g.beginPath();g.moveTo(px,y0+4);g.lineTo(px,y0+bs-6);g.moveTo(x0+4,py-1);g.lineTo(x0+bs-4,py-1);g.stroke();
      if(x.layers>1){g.fillStyle='rgba(255,255,255,.12)';for(let i=1;i<x.layers;i++){rr(g,x0+2+i*2,y0+2+i*2,bs-4-i*4,bs-7-i*4,bs*0.14);g.fill();}}
      label(g,String(x.layers),px,py,L.bc*0.4,'#fff','rgba(30,14,4,.7)');
    }
  }
  g.restore();
  // shots
  for(const sh of G.shots){if(sh.t>sh.dur)continue;const a=G.ants[sh.ant],to=antCenter(G,L,a);
    const from=sh.origin.slot!=null?slotCenter(G,L,sh.origin.slot):sh.origin.board?cellCenter(G,L,sh.origin.board.r,sh.origin.board.c):powerCenter(L);
    if(sh.throw){const p=sh.dur?1-Math.max(0,sh.t)/sh.dur:1,e=p*p*(3-2*p),x=lerp(from.x,to.x,e),y=lerp(from.y,to.y,e);
      if(fx)for(let i=4;i>=1;i--){const q=Math.max(0,p-i*0.05),ee=q*q*(3-2*q);g.globalAlpha=0.12*(5-i);g.fillStyle='#ffd93d';g.beginPath();g.arc(lerp(from.x,to.x,ee),lerp(from.y,to.y,ee),5-i*0.7,0,Math.PI*2);g.fill();}
      g.globalAlpha=1;const rot=ui.t*10;g.save();g.translate(x,y);g.rotate(rot);
      g.fillStyle='#2a1846';g.beginPath();g.arc(0,0,sh.kind==='bomb'?10:8,0,Math.PI*2);g.fill();g.strokeStyle='#fff';g.lineWidth=1.5;g.stroke();
      g.fillStyle=sh.kind==='bomb'?'#ff5470':'#ffd93d';g.beginPath();g.arc(0,0,sh.kind==='bomb'?5:4,0,Math.PI*2);g.fill();
      g.strokeStyle='#ffd93d';g.lineWidth=2;g.beginPath();g.moveTo(0,-8);g.lineTo(3,-13);g.stroke();g.restore();continue;}
    const p=sh.dur?1-Math.max(0,sh.t)/sh.dur:1,col=sh.kind==='super'||sh.kind==='rainbow'?RAINBOW[(sh.ant+Math.floor(ui.t*10))%6]:hex(sh.color);
    const at=q=>{const e=ease(q);return [lerp(from.x,to.x,e),lerp(from.y-6,to.y,e)-Math.sin(q*Math.PI)*16];};
    if(fx)for(let i=3;i>=1;i--){const [tx,ty]=at(Math.max(0,p-i*0.07));g.globalAlpha=0.18*(4-i);g.fillStyle=col;g.beginPath();g.arc(tx,ty,4-i*0.6,0,Math.PI*2);g.fill();}
    g.globalAlpha=1;const [x,y]=at(p),rad=sh.kind==='bomb'?7:sh.kind?6:5;
    g.fillStyle=col;g.beginPath();g.arc(x,y,rad,0,Math.PI*2);g.fill();g.strokeStyle='#fff';g.lineWidth=1.5;g.stroke();}
  // jelly flying to the slots
  for(const b of ui.blobs){if(b.t<0)continue;const e=ease(b.t);const x=lerp(b.x0,b.x1,e),y=lerp(b.y0,b.y1,e)-Math.sin(b.t*Math.PI)*40;
    g.fillStyle=b.special?RAINBOW[Math.floor(b.t*12+b.x0)%6]:b.col;g.beginPath();g.arc(x,y,6*(1-b.t*0.45),0,Math.PI*2);g.fill();}
  for(const p of ui.parts){g.globalAlpha=Math.max(0,p.life/p.max);g.fillStyle=p.col;g.beginPath();g.arc(p.x,p.y,p.r,0,Math.PI*2);g.fill();}g.globalAlpha=1;
  for(const r of ui.rings){g.globalAlpha=1-r.t;g.strokeStyle=r.col;g.lineWidth=3*(1-r.t)+1;
    if(r.line){g.beginPath();g.moveTo(r.x,r.y+r.line/2);g.lineTo(r.x,r.y-r.line/2);g.stroke();}
    else{g.beginPath();g.arc(r.x,r.y,lerp(r.r0,r.r1,ease(r.t)),0,Math.PI*2);g.stroke();}}g.globalAlpha=1;
  // popups
  for(const p of ui.pops){if(!p.text&&!p.sub)continue;const a=p.age<p.life-0.3?1:Math.max(0,(p.life-p.age)/0.3);g.globalAlpha=a;
    const y=p.y-18-p.age*24,sc=fx&&p.big?(p.age<0.25?back(p.age/0.25):1):1;
    g.save();g.translate(p.x,y);g.scale(sc,sc);
    if(p.text)label(g,p.text,0,0,p.text.length>16?13:p.size,p.col,'rgba(23,12,40,.92)');
    if(p.sub)label(g,p.sub,0,p.text?p.size*0.85:0,14,'#fff','rgba(23,12,40,.92)');
    g.restore();g.globalAlpha=1;}
  if(!G.started&&!G.over&&!opt.ftue){const y=L.boardTop+L.bc*G.BH/2;rr(g,LW/2-125,y-20,250,40,20);g.fillStyle='rgba(23,12,40,.82)';g.fill();
    label(g,'Đổi chỗ 2 khối để tạo hàng 3',LW/2,y,14,'#fff',null,600);}
  if(fx&&ui.flash>0){g.globalAlpha=ui.flash*0.5;g.fillStyle=ui.flashCol;g.fillRect(-20,-20,LW+40,L.H+40);g.globalAlpha=1;}
  g.restore();
}
