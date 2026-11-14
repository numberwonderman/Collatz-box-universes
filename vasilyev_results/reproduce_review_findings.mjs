// Reproduces each suspected bug against the UNMODIFIED code. Run from repo root.
import { spawnSync } from 'node:child_process';
const R = process.argv[2];
function probe(label, code, ms = 4000) {
  const r = spawnSync('node', ['--input-type=module', '-e', code], { cwd: R, timeout: ms, encoding: 'utf8' });
  const out = r.error?.code === 'ETIMEDOUT' ? 'HANG (killed after ' + ms + ' ms)' : (r.stdout + r.stderr).trim().split('\n').slice(0, 4).join(' | ');
  console.log(`\n[${label}]\n  ${out}`);
}
probe('A1 slicer.js imports names utils.js does not export (native ESM)',
  `globalThis.document={addEventListener(){},getElementById(){return null}};globalThis.window={};
   try{await import('./js/slicer.js');console.log('loaded')}catch(e){console.log(e.name+': '+e.message)}`);
probe('A2 slicer.js call order vs collatzLogic signature (n,p,q,r)',
  `import {calculateCollatzSequence as f} from './js/collatzLogic.js';
   const r=f(27,1000,2,3,1); console.log('slicer-style call f(27,1000,2,3,1):',JSON.stringify(r.sequence.slice(0,6)),r.status,'type=',r.type,'steps=',r.steps);
   console.log('intended 3n+1 f(27,2,3,1) length',f(27,2,3,1).sequence.length)`);
probe('E collatzLogic precision past 2^53 (5n+1 from 7)',
  `import {calculateCollatzSequence as f} from './js/collatzLogic.js';
   const r=f(7,2,5,1); let n=7n,i=0,bad=-1; for(const v of r.sequence){ if(BigInt(v)!==n&&bad<0){bad=i;} n=n%2n===0n?n/2n:5n*n+1n;i++; }
   console.log('status:',r.status,'| len',r.sequence.length,'| first index where float != exact:',bad,'| max',Math.max(...r.sequence))`);
probe('E2 collatzLogic 3n+2 from 5 (pinned by existing test)',
  `import {calculateCollatzSequence as f} from './js/collatzLogic.js';
   const r=f(5,2,3,2); console.log(r.status,'| last value',r.sequence.at(-1),'| #Infinity',r.sequence.filter(v=>v===Infinity).length,'| first unsafe index',r.sequence.findIndex(v=>v>Number.MAX_SAFE_INTEGER))`);
probe('G1 generalizedPrimeCollatz.generalizedCollatz(5n,3n,-1n)',
  `import {generalizedCollatz as g} from './js/generalizedPrimeCollatz.js'; console.log(g(5n,3n,-1n).length)`);
probe('G2 generalizedCollatz(13n,5n,1n)',
  `import {generalizedCollatz as g} from './js/generalizedPrimeCollatz.js'; console.log(g(13n,5n,1n).length)`);
probe('G3 simplifyByPrimesLessThanP(0n,5n)',
  `import {simplifyByPrimesLessThanP as s} from './js/generalizedPrimeCollatz.js'; console.log(s(0n,5n))`);
probe('G4 iterateP steps field: cycle vs hit_1',
  `import {iterateP} from './js/generalizedPrimeCollatz.js';
   for(const [n,p] of [[7n,3n],[13n,5n],[5n,7n],[17n,5n]]){const r=iterateP(n,p,2000);console.log(n,p,r.type,'steps',r.steps,'transitions',r.sequence.length-1)}`);
probe('C radial-animator generalizedCollatz on a cycle (3n-1 from 5) and divergence',
  `globalThis.document={addEventListener(){},getElementById(){return null}};globalThis.window={location:{search:''}};
   const m=await import('./js/radial-animator.js'); let t=Date.now(); const r=m.generalizedCollatz(5,2,3,-1);
   console.log('type',r.type,'steps',r.steps,'ms',Date.now()-t,'distinct values',new Set(r.sequence).size);`, 20000);
probe('F drawNecklaceCanvas colouring on a cycle with a tail (3n-1 from 9)',
  `globalThis.localStorage={getItem(){return null}};
   const u=await import('./js/utils.js'); const d=u.calculateCollatzSequence(9,2,3,-1);
   const fills=[]; const ctx={clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fillText(){},fill(){fills.push(this.fillStyle)},fillStyle:''};
   u.drawNecklaceCanvas({width:800,height:200,getContext(){return ctx}},d);
   console.log('type',d.type,'seq',d.sequence.join(','),'| repeat value',d.paradoxicalOccurrences[0].value);
   console.log('node colours',fills.map(f=>f==='#34d399'?'G':'o').join(''))`);
probe('B DOMEElements typo',
  `import fs from 'node:fs'; for(const f of ['js/radial-animator.js','js/radial-viewer.js']){const s=fs.readFileSync(f,'utf8');console.log(f,'uses DOMEElements:',/DOMEElements\\./.test(s),'declares it:',/(const|let|var)\\s+DOMEElements/.test(s))}`);
probe('H worker.js generalizedCollatz non-integer values',
  `import fs from 'node:fs'; const src=fs.readFileSync('js/worker.js','utf8').split('// === Chaos Metric')[0].split('// === Generalized Collatz Logic ===')[1];
   const g=new Function(src+';return generalizedCollatz')(); const r=g(7,3,1,2); console.log(r.type, r.sequence.slice(0,8).join(', '));
   const r2=g(6,3,1,1); console.log('3n+1 from 6 ->',r2.type, r2.sequence.join(','))`);
