/* Section A–A, elevations, and systems diagrams. Vertical axis: z (m) mapped to y = −z. */
const CONC='#e0e1dd', BLK='#353a3e', GLS='#c5d0d3';
function datums(x1,x2,lblX,list){ let s='';
  for(const [z,t,strong] of list){ s += ln(x1,-z,x2,-z,.45,MUTE,'stroke-dasharray="3 3"');
    s += `<path d="M${lblX-.35} ${-z-.45}L${lblX+.35} ${-z-.45}L${lblX} ${-z}Z" fill="${strong?INK:'none'}" stroke="${INK}" stroke-width=".6" ${NSS}/>` + tx(lblX+.7,-z-.12,t,{size:.42,a:'start',cls:'m'}); }
  return s; }
const zl = z => (z>0?'+':z<0?'−':'±') + Math.abs(z).toFixed(2);
const LEVEL_DATUMS = [[7.6,'+7.60 PARAPET'],[7.0,'+7.00 ROOF SSL'],[3.5,'+3.50 FIRST FLOOR',1],[0,'±0.00 GROUND FLOOR',1],[-3.5,'−3.50 BASEMENT',1]];
function tree(x,s=1){ return ln(x,0,x,-1.9*s,.7) + `<ellipse cx="${x}" cy="${-3*s}" rx="${1.6*s}" ry="${1.25*s}" fill="none" stroke="${MUTE}" stroke-width=".6" ${NSS}/>`; }
function glassV(x,z1,z2){ return rc(x-.06,-z2,.12,z2-z1,{f:GLS,sw:.45}); }

function sectionSVG(){
  const p='sec', vb=[-4,-10.2,62,17.2];
  let s = `<svg viewBox="${vb.join(' ')}" class="dwg" role="img" aria-label="Section A–A through the pool courtyard">${defs(p)}${gridBg(p,vb)}`;
  s += rc(-3,0,56,6.8,{f:`url(#${p}-soil)`,s:'none'});
  // excavations + basement structure
  const pit=(x1,x2)=> rc(x1,0,x2-x1,3.85,{f:PAPER,s:'none'}) + rc(x1,3.5,x2-x1,.35,{f:INK,s:'none'}) + rc(x1,0,.3,3.5,{f:INK,s:'none'}) + rc(x2-.3,0,.3,3.5,{f:INK,s:'none'}) + rc(x1,0,x2-x1,.35,{f:INK,s:'none'});
  s += pit(1.2,16.3) + pit(30.2,42.3) + ln(34,0,34,3.5,.6);
  s += rc(1.5,-.5,6.5,.5,{f:`url(#${p}-grav)`,sw:.4}) ;
  // pool
  s += rc(20,0,10,1.8,{f:PAPER,s:'none'}) + rc(19.7,0,.3,1.8,{f:INK,s:'none'}) + rc(30,0,.3,1.8,{f:INK,s:'none'}) + rc(19.7,1.5,10.6,.3,{f:INK,s:'none'}) + rc(20,.05,10,1.45,{f:`url(#${p}-water)`,s:'none'}) + ln(20,.05,30,.05,1.2,WATER);
  // ground line
  s += ln(-3,0,1.2,0,1.4) + ln(16.3,0,19.7,0,1.4) + ln(30.3,0,30.2,0,1.4) + ln(42.3,0,53,0,1.4);
  // perimeter walls
  s += rc(0,-3,.3,3.9,{f:INK,s:'none'}) + rc(49.7,-3,.3,3.9,{f:INK,s:'none'});
  // north bar beyond
  s += rc(16,-7.6,18,7.6,{f:'#e7e8e5',sw:.5,s:MUTE}) + ln(16,-3.5,34,-3.5,.4,MUTE); for(let x=19;x<34;x+=3) s += ln(x,-7,x,0,.3,MUTE);
  s += tx(25,-5.3,'NORTH BAR BEYOND · GLASS FACE',{size:.34,cls:'m',fill:MUTE});
  // wings cut
  const wing=(x1,x2,glassGF,glassFF)=>{ let w='';
    w += rc(x1-.2,-3.5,x2-x1+.4,.35,{f:INK,s:'none'}) + rc(x1-.2,-7,x2-x1+.4,.35,{f:INK,s:'none'}) + rc(x1-.2,-7.6,.3,.6,{f:INK,s:'none'}) + rc(x2-.1,-7.6,.3,.6,{f:INK,s:'none'});
    for(const [x,g,z1,z2] of [[x1,glassGF[0],0,3.15],[x2,glassGF[1],0,3.15],[x1,glassFF[0],3.5,6.65],[x2,glassFF[1],3.5,6.65]])
      w += g ? glassV(x,z1,z2) : rc(x-.15,-z2,.3,z2-z1,{f:INK,s:'none'});
    w += ln(x1+.4,-6.62,x2-.4,-6.62,1.2,LEDC) + ln(x1+.4,-3.12,x2-.4,-3.12,1.2,LEDC);
    return w; };
  s += rc(7.8,-.35,8.4,.35,{f:INK,s:'none'}) + rc(33.8,-.35,8.4,.35,{f:INK,s:'none'});
  s += wing(8,16,[1,1],[0,1]) + wing(34,42,[1,1],[1,0]);
  // rooms
  const lab=(x,z,t,sub)=> tx(x,-z,t,{size:.4,w:500,cls:'m'}) + (sub?tx(x,-z+.6,sub,{size:.32,fill:MUTE,cls:'m'}):'');
  s += lab(12,5.6,'BEDROOM 5','F.14') + lab(12,1.9,'MAJLIS','G.06') + lab(8.7,-1.6,'GARAGE · 6 CARS','B.08') + lab(38,5.6,'MASTER BATH','F.18') + lab(38,1.9,'FAMILY LIVING','G.15') + lab(38.9,-1.6,'STAFF ROOM A','B.14') + lab(32.25,-1.2,'POOL','') + lab(32.25,-1.75,'PLANT','') + lab(25,-.9,'POOL · 1.5 m WATER','');
  s += lab(18,.45,'TERRACE',''); s += tree(46,.9) + tree(4.3,.7);
  s += datums(-3,53,53.3,LEVEL_DATUMS);
  s += dimChain([-3.5,0,3.5,7],-2.3,false,{off:.55});
  s += tx(-3.4,6.4,'A-201 · SECTION A–A · CUT E–W THROUGH POOL AT y = 30 m · 1:200',{size:.45,a:'start',w:500,cls:'m'});
  return s + '</svg>';
}

/* elevation from a list of panels: [u1,u2,z1,z2,type] */
function panel(u1,u2,z1,z2,t){
  if(t==='conc') return rc(u1,-z2,u2-u1,z2-z1,{f:CONC,sw:.7});
  if(t==='blk'){ let s=rc(u1,-z2,u2-u1,z2-z1,{f:BLK,sw:.7}); for(let u=u1+1.2;u<u2-.1;u+=1.2) s+=ln(u,-z2,u,-z1,.3,'#5b6166'); return s; }
  if(t==='glass'){ let s=rc(u1,-z2,u2-u1,z2-z1,{f:GLS,sw:.6}); const n=Math.max(1,Math.round((u2-u1)/2.5)); for(let i=1;i<n;i++){const u=u1+(u2-u1)*i/n; s+=ln(u,-z2,u,-z1,.3,MUTE);} return s; }
  if(t==='dark') return rc(u1,-z2,u2-u1,z2-z1,{f:'#5a6266',sw:.5});
  if(t==='led') return ln(u1,-z1,u2,-z1,1.6,LEDC);
  if(t==='hid') return rc(u1,-z2,u2-u1,z2-z1,{sw:.45,s:MUTE,x:'stroke-dasharray="2 1.5"'});
  return ''; }
function elevationSVG(kind){
  const p='el'+kind, vb=[-4,-10.2,kind==='N'?62:72,13.4];
  let s = `<svg viewBox="${vb.join(' ')}" class="dwg" role="img" aria-label="${kind==='N'?'North (front)':'East (side)'} elevation">${defs(p)}${gridBg(p,vb)}`;
  s += rc(-3,0,vb[2]-1,3,{f:`url(#${p}-soil)`,s:'none'});
  const P = kind==='N' ? [
    [8,42,0,3.5,'conc'],[8,42,3.5,7.6,'blk'],[27,30.5,0,8.4,'conc'],[17,27,0,7,'glass'],[9,13,1,2.6,'dark'],[31,36.5,2.3,3.2,'dark'],
    [9.5,14,3.9,6.8,'glass'],[31.5,36,3.9,6.8,'glass'],[8,17,3.5,3.5,'led'],[30.5,42,3.5,3.5,'led'],
    [17,30,3.35,3.6,'blk'],[18,18.15,0,3.35,'blk'],[28.85,29,0,3.35,'blk'],[17.2,29.8,3.33,3.33,'led'],
    [8,42,-3.85,0,'hid'],[1.5,8,-3.85,0,'hid']
  ] : [
    [60-42,60-10,0,3.5,'conc'],[60-46,60-10,3.5,7.6,'blk'],[60-15.5,60-10,7.6,8.4,'conc'],[60-40,60-29,0,3.5,'glass'],[60-19,60-15,0,2.6,'dark'],
    [60-14,60-11,1,2.4,'dark'],[60-45,60-38,3.5,7,'glass'],[60-13.5,60-10.5,6,6.8,'dark'],[60-46,60-42,3.5,3.5,'led'],[60-29,60-19,3.5,3.5,'led'],
    [60-42,60-10,-3.85,0,'hid']
  ];
  for(const q of P) s += panel(...q);
  // perimeter wall (dashed, in front) + gate
  const W = kind==='N' ? [[0,1.8],[9.2,50]] : [[60-60,60-15.5],[60-11.5,60]];
  for(const [a,b] of W) s += rc(a,-3,b-a,3,{sw:.55,s:MUTE,x:'stroke-dasharray="4 2"'});
  s += kind==='N' ? rc(1.8,-3,7.4,3,{sw:.5,s:INK,x:'stroke-dasharray="1 1"'}) + tx(5.5,-1.3,'MAIN GATE',{size:.34,cls:'m'}) : rc(60-15.5,-3,4,3,{sw:.5,s:INK,x:'stroke-dasharray="1 1"'}) + tx(60-13.5,-1.3,'SERVICE',{size:.3,cls:'m'});
  s += ln(-3,0,vb[2]-4,0,1.4);
  s += tree(kind==='N'?46:8,.85) + tree(kind==='N'?4:3,.7);
  const labs = kind==='N' ? [[22,-8.6,'DOUBLE-HEIGHT LOBBY GLASS'],[28.75,-8.9,'LIFT OVERRUN'],[23.5,-3.95,'BLADE CANOPY'],[11.75,-7.95,'MATTE BLACK METAL · FF'],[38,-.5,'ARCHITECTURAL CONCRETE · GF']]
                          : [[60-41.5,-7.95,'MASTER · 4 m CANTILEVER'],[60-34.5,-.5,'LIVING · POCKET GLASS'],[60-26,-7.95,'MATTE BLACK METAL · FF'],[60-17,-3.95,'SERVICE ENTRY']];
  for(const [u,y,t] of labs) s += tx(u,y,t,{size:.32,cls:'m'});
  s += tx(kind==='N'?18:60-14,-1.1,'B · BELOW GRADE',{size:.3,fill:MUTE,cls:'m'});
  s += datums(-3,vb[2]-4,vb[2]-3.7,LEVEL_DATUMS.slice(0,4)) + tx(-3.4,2.7,kind==='N'?'A-301 · NORTH (FRONT) ELEVATION · 1:200 · PERIMETER WALL DASHED':'A-302 · EAST (SIDE) ELEVATION · 1:200 · NORTH TO THE RIGHT',{size:.45,a:'start',w:500,cls:'m'});
  if(kind==='E') s += tx(60-60+.3,-3.4,'S',{size:.45,w:600,cls:'m'}) + tx(60-.3,-3.4,'N',{size:.45,w:600,cls:'m'});
  return s + '</svg>';
}

/* M/E/P riser schematic — dark UI style, linetype legend */
function riserSVG(){
  const W='#e8eaec', D='#8b9196', A='#e0a458';
  const L = (x1,y1,x2,y2,st,c=W,w=1.2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" ${NSS} ${st}/>`;
  const B = (x,y,w,h,t,sub) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#111416" stroke="${W}" stroke-width=".8" ${NSS}/>` + `<text x="${x+.8}" y="${y+2.1}" font-size="1.35" fill="${W}" class="m" letter-spacing=".1">${t}</text>` + (sub?`<text x="${x+.8}" y="${y+3.8}" font-size="1.05" fill="${D}" class="m">${sub}</text>`:'');
  const ST = {chw:'', dw:'stroke-dasharray="3 1.6"', pw:'', data:'stroke-dasharray=".6 1.2"'};
  let s = `<svg viewBox="0 0 120 74" class="diag" role="img" aria-label="Building services riser diagram">`;
  const bands = [['ROOF +7.60',2,11],['FIRST FLOOR +3.50',13,25],['GROUND FLOOR ±0.00',27,39],['BASEMENT −3.50',41,70]];
  for(const [t,y1,y2] of bands) s += `<rect x="0" y="${y1}" width="120" height="${y2-y1}" fill="#15191b" stroke="#2a2f33" stroke-width=".6" ${NSS}/><text x="1" y="${y1+1.8}" font-size="1.15" fill="${D}" class="m" letter-spacing=".12">${t}</text>`;
  s += `<rect x="88" y="2" width="8" height="68" fill="none" stroke="${D}" stroke-width=".7" ${NSS} stroke-dasharray="2 1.2"/><text x="92" y="72.6" font-size="1.1" fill="${D}" text-anchor="middle" class="m">CORE RISER</text>`;
  s += B(3,44,40,24,'ENGINEERING ROOM  B.05','') + B(5,49,17,7,'CHW PLANT + AHU','chiller · 2 pumps') + B(24,49,17,7,'WATER 2×15 m³','booster set · UV') + B(5,58,17,8,'MAIN LV BOARD','250 kVA gen · ATS') + B(24,58,17,8,'BMS / KNX RACK','controller · PoE');
  s += B(46,49,18,11,'SERVER ROOM  B.11','2×42U · UPS 10 kVA') + B(67,49,17,11,'POOL PLANT  B.10','filter · UV · heat pump');
  s += B(40,3,24,7,'DRY COOLERS + PV','roof plant deck') + B(100,15,18,8,'FCUs · FF','bed + bath zones') + B(100,29,18,8,'FCUs · GF','living · kitchen') + B(66,3,18,7,'CCTV · GATE LPR','perimeter + gate');
  // chilled water: CHW plant → riser → FCUs; roof dry cooler
  s += L(13.5,49,13.5,46,ST.chw,W,1.4) + L(13.5,46,89.5,46,ST.chw,W,1.4) + L(89.5,46,89.5,19,ST.chw,W,1.4) + L(89.5,19,100,19,ST.chw,W,1.4) + L(89.5,33,100,33,ST.chw,W,1.4);
  s += L(52,10,52,12,ST.chw,W,1.4) + L(52,12,89.5,12,ST.chw,W,1.4) + L(89.5,12,89.5,19,ST.chw,W,1.4);
  // water
  s += L(32.5,49,32.5,47.3,ST.dw) + L(32.5,47.3,91.5,47.3,ST.dw) + L(91.5,47.3,91.5,21,ST.dw) + L(91.5,21,100,21,ST.dw) + L(91.5,35,100,35,ST.dw) + L(75.5,49,75.5,47.3,ST.dw);
  // power (accent)
  s += L(13.5,66,13.5,68.5,ST.pw,A) + L(13.5,68.5,93.5,68.5,ST.pw,A) + L(93.5,68.5,93.5,17,ST.pw,A) + L(93.5,17,100,17,ST.pw,A) + L(93.5,31,100,31,ST.pw,A) + L(55,60,55,68.5,ST.pw,A) + L(75.5,60,75.5,68.5,ST.pw,A);
  // data
  s += L(41,62,46,62,ST.data,W,1) + L(55,49,55,44,ST.data,W,1) + L(55,44,95.5,44,ST.data,W,1) + L(95.5,44,95.5,23,ST.data,W,1) + L(95.5,25,100,25,ST.data,W,1) + L(95.5,37,100,37,ST.data,W,1) + L(95.5,23,95.5,8,ST.data,W,1) + L(95.5,8,84,8,ST.data,W,1);
  // legend
  const lg=[['CHILLED WATER',ST.chw,W,1.4],['DOMESTIC WATER',ST.dw,W,1.2],['POWER',ST.pw,A,1.2],['DATA / CONTROL',ST.data,W,1]];
  lg.forEach(([t,st,c,w],i)=>{ const x=3+i*21; s += L(x,40.2,x+5,40.2,st,c,w) + `<text x="${x+6}" y="40.6" font-size="1.05" fill="${D}" class="m">${t}</text>`; });
  return s + '</svg>';
}
function poolLoopSVG(){
  const W='#e8eaec', D='#8b9196', C='#7fb3bf';
  const steps=['OVERFLOW GRATE','BALANCE TANK 12 m³','VS PUMPS ×2','GLASS-MEDIA FILTER','UV STERILISER','HEAT PUMP','SALT CHLORINATOR','FLOOR RETURN JETS'];
  let s=`<svg viewBox="0 0 120 22" class="diag" role="img" aria-label="Pool water treatment loop">`;
  steps.forEach((t,i)=>{ const x=1+i*14.8; s += `<rect x="${x}" y="3" width="12.6" height="7" fill="#111416" stroke="${i===0||i===7?C:W}" stroke-width=".8" ${NSS}/><text x="${x+6.3}" y="7.2" font-size="1" text-anchor="middle" fill="${W}" class="m">${t}</text>`;
    if(i<7) s += `<line x1="${x+12.6}" y1="6.5" x2="${x+14.8}" y2="6.5" stroke="${W}" stroke-width="1" ${NSS}/><path d="M${x+14.1} 5.9L${x+14.8} 6.5L${x+14.1} 7.1" fill="none" stroke="${W}" stroke-width="1" ${NSS}/>`; });
  s += `<path d="M112.5 10V16H7.3V10" fill="none" stroke="${C}" stroke-width="1" ${NSS} stroke-dasharray="3 1.5"/><text x="60" y="19.4" font-size="1.1" text-anchor="middle" fill="${D}" class="m">POOL VOLUME ≈ 300 m³ · FULL TURNOVER EVERY 4 h · WATER SHEETS OVER THE EDGE INTO THE GRATE</text>`;
  return s+'</svg>';
}
