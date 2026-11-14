// 1000 bölümü önceden üretir -> levels.js
const g=require('./gen.js');const Lg=require('./logic.js');
const out=[];let max=0,maxL=0;
for(let L=1;L<=1000;L++){const t=Date.now();const lv=g.generate(L);const dt=Date.now()-t;if(dt>max){max=dt;maxL=L}
 if(!lv) throw new Error('fail '+L);
 if(g.solve(lv.N,lv.regions,2).length!==1) throw new Error('not unique '+L);
 if(!Lg.logicSolve(lv.N,lv.regions,g.maxKFor(L)).ok) throw new Error('not logical '+L);
 out.push(lv.regions.map(x=>x.toString(36)).join(''));}
require('fs').writeFileSync('levels.js','// Miyav Doku - 1000 hazır bölüm (her biri tek çözümlü ve tahminsiz, mantıkla çözülür)\nwindow.MIYAV_LEVELS='+JSON.stringify(out)+';\n');
console.log('ok, en yavaş',maxL,max+'ms');
