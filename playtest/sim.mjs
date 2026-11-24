// Headless bot run of the demo engine: win % per level, with the A+B+C options on and off.
// node playtest/sim.mjs [runs]
import {simulate} from '../js/engine.js';
import {LEVELS} from '../js/levels.js';
const runs=+process.argv[2]||30;
const modes=JSON.parse(process.env.MODES||'{"off":{"power":false,"specials":false,"combo":false},"on":{}}');
console.log('level  '+Object.keys(modes).map(m=>m.padStart(18)).join(''));
for(const lv of LEVELS){
  const out=[];
  for(const [m,o] of Object.entries(modes)){
    let w=0,t=0,sup=0,spec=0,lost=0;
    for(let s=1;s<=runs;s++){const r=simulate(lv,{seed:s,...o});if(r.result==='win'){w++;t+=r.time;}sup+=r.stats.supers;spec+=r.stats.specials;lost+=r.stats.lost;}
    out.push(`${String(Math.round(w/runs*100)).padStart(3)}% ${w?String(Math.round(t/w)).padStart(3)+'s':'   -'} S${(sup/runs).toFixed(1)} P${(spec/runs).toFixed(1)}`);
  }
  console.log(lv.Name.padEnd(6),out.map(x=>x.padStart(18)).join(''));
}
