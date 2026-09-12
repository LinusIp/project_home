/* Technical drawings as SVG, generated from data.js. Units: metres (user space). */
const INK='#15181b', PAPER='#ecedea', GRID='#d9dcda', GRID2='#c3c8c8', MUTE='#6d7479', WATER='#3d6b78', LEDC='#b87a22';
const NSS='vector-effect="non-scaling-stroke"';
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const ln = (x1,y1,x2,y2,w=.8,c=INK,x='') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" ${NSS} ${x}/>`;
const rc = (x,y,w,h,{f='none',s=INK,sw=.8,x:ex=''}={}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}" stroke="${s}" stroke-width="${sw}" ${NSS} ${ex}/>`;
const pg = (pts,{f='none',s=INK,sw=.8,x:ex=''}={}) => `<polygon points="${pts.map(p=>p.join(',')).join(' ')}" fill="${f}" stroke="${s}" stroke-width="${sw}" ${NSS} stroke-linejoin="miter" ${ex}/>`;
function tx(x,y,str,{size=.5,a='middle',fill=INK,w=400,ls=.06,rot=0,cls=''}={}){
  const tr = rot ? ` transform="rotate(${rot} ${x} ${y})"` : '';
  return `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${a}" fill="${fill}" font-weight="${w}" letter-spacing="${ls}" class="${cls}"${tr}>${esc(str)}</text>`;
}
function defs(p){
  return `<defs>
  <pattern id="${p}-g1" width="1" height="1" patternUnits="userSpaceOnUse"><path d="M1 0H0V1" fill="none" stroke="${GRID}" stroke-width=".02"/></pattern>
  <pattern id="${p}-g5" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M5 0H0V5" fill="none" stroke="${GRID2}" stroke-width=".035"/></pattern>
  <pattern id="${p}-water" width=".7" height=".7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2=".7" stroke="${WATER}" stroke-width=".035"/></pattern>
  <pattern id="${p}-core" width=".45" height=".45" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V.45M0 0H.45" stroke="${INK}" stroke-width=".02" opacity=".55"/></pattern>
  <pattern id="${p}-soil" width="1.2" height="1.2" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><line x1="0" y1="0" x2="0" y2="1.2" stroke="${MUTE}" stroke-width=".025" opacity=".6"/></pattern>
  <pattern id="${p}-pav" width="1.2" height=".6" patternUnits="userSpaceOnUse"><path d="M1.2 0H0V.6" fill="none" stroke="${GRID2}" stroke-width=".02"/></pattern>
  <pattern id="${p}-grav" width="1" height="1" patternUnits="userSpaceOnUse"><g fill="${MUTE}" opacity=".55"><circle cx=".15" cy=".2" r=".035"/><circle cx=".6" cy=".1" r=".03"/><circle cx=".42" cy=".55" r=".04"/><circle cx=".85" cy=".62" r=".03"/><circle cx=".2" cy=".85" r=".03"/><circle cx=".7" cy=".92" r=".035"/></g></pattern>
  <pattern id="${p}-grass" width=".5" height=".6" patternUnits="userSpaceOnUse"><path d="M.1 .55L.05 .1M.25 .55L.25 .05M.4 .55L.45 .15" stroke="${MUTE}" stroke-width=".02" fill="none"/></pattern>
  <pattern id="${p}-ramp" width="1" height="1" patternUnits="userSpaceOnUse"><path d="M0 0H1" stroke="${MUTE}" stroke-width=".03"/></pattern>
  </defs>`;
}
const gridBg = (p,[x,y,w,h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${PAPER}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${p}-g1)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${p}-g5)"/>`;

/* architectural dimension string: ticks are 45° slashes, text in millimetres */
function dim(x1,y1,x2,y2,label,{off=.45,size=.42}={}){
  const hz = y1===y2; let s = ln(x1,y1,x2,y2,.6);
  for(const [x,y] of [[x1,y1],[x2,y2]]){ s += ln(x-.25,y+.25,x+.25,y-.25,1.1); s += hz ? ln(x,y-.5,x,y+.5,.5) : ln(x-.5,y,x+.5,y,.5); }
  const mx=(x1+x2)/2, my=(y1+y2)/2;
  s += hz ? tx(mx,my-off+.1,label,{size,cls:'m'}) : tx(mx-off,my,label,{size,rot:-90,cls:'m'});
  return s;
}
function dimChain(pts,fixed,horizontal,opts){ let s=''; for(let i=0;i<pts.length-1;i++){ const a=pts[i],b=pts[i+1]; const L=Math.round((b-a)*1000).toLocaleString('en-US').replace(/,/g,' ');
  s += horizontal ? dim(a,fixed,b,fixed,L,opts) : dim(fixed,a,fixed,b,L,opts);} return s; }
function north(x,y,r=1.4){ return `<g>${`<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${INK}" stroke-width=".7" ${NSS}/>`}<path d="M${x} ${y-r*1.35}L${x+r*.45} ${y+r*.55}L${x} ${y+r*.2}Z" fill="${INK}"/>${tx(x,y+r+.85,'N',{size:.6,w:600,cls:'m'})}</g>`; }
function scaleBar(x,y,len,step,unitSize=.4){ let s=''; for(let i=0;i<len;i+=step) s += rc(x+i,y,step,.3,{f:(i/step)%2?PAPER:INK,sw:.6});
  for(let i=0;i<=len;i+=step) s += tx(x+i,y+1,String(i),{size:unitSize,cls:'m'}); s += tx(x+len+.4,y+1,'m',{size:unitSize,a:'start',cls:'m'}); return s; }
const TINT = {live:'#f5f6f3', sleep:'#f5f6f3', circ:'#eff0ed', wet:'#dfe7e9', plant:'#e5e0d6', service:'#e5e0d6', store:'#e8e9e4', staff:'#f1f2ee', garage:'#e4e5e1', core:'none'};

function labelRoom(r){
  const big = r.r.reduce((a,b)=> (b[2]*b[3]>a[2]*a[3]?b:a));
  const [x,y,w,h] = big; const [cx,cy] = r.l || [x+w/2, y+h/2];
  const vertical = w < 2.2 && h > w*2.2; const span = (vertical ? h : w) - .5;
  const name = r.n.toUpperCase();
  const fs = Math.max(.22, Math.min(.5, span/(name.length*.64)));
  const small = Math.min(.36, fs*.85); const rot = vertical ? -90 : 0;
  const A = `${fmt(area(r))} m²`;
  if (vertical) return `<g transform="rotate(-90 ${cx} ${cy})">${tx(cx,cy-fs*.25,r.id+'  '+name,{size:Math.min(fs,.32),cls:'m'})}${tx(cx,cy+fs*.95,A,{size:Math.min(small,.3),fill:MUTE,cls:'m'})}</g>`;
  const tight = h < 2.4;
  return tx(cx,cy-fs*(tight?.55:1.1),r.id,{size:small*.9,fill:MUTE,cls:'m'})
       + tx(cx,cy+fs*(tight?.35:.15),name,{size:fs,w:500,cls:'m'})
       + tx(cx,cy+fs*(tight?1.3:1.35),A,{size:small,fill:MUTE,cls:'m'});
}
function glass(seg){ const [[x1,y1],[x2,y2]] = seg; const hz = y1===y2, o=.09;
  return ln(x1,y1,x2,y2,4,PAPER) + (hz ? ln(x1,y1-o,x2,y2-o,.55)+ln(x1,y1+o,x2,y2+o,.55) : ln(x1-o,y1,x2-o,y2,.55)+ln(x1+o,y1,x2+o,y2,.55))
       + (hz ? ln(x1,y1-.2,x1,y1+.2,1)+ln(x2,y2-.2,x2,y2+.2,1) : ln(x1-.2,y1,x1+.2,y1,1)+ln(x2-.2,y2,x2+.2,y2,1)); }
function bed(x,y,w,h,head){ let s=rc(x,y,w,h,{sw:.6,f:'#fbfbf9'});
  if(head==='W') s+=ln(x+.45,y,x+.45,y+h,.5); if(head==='E') s+=ln(x+w-.45,y,x+w-.45,y+h,.5); if(head==='N') s+=ln(x,y+.45,x+w,y+.45,.5); return s; }
function stairRun(x1,x2,y1,y2,step=.29){ let s=rc(x1,y1,x2-x1,y2-y1,{sw:.6,f:'#fbfbf9'}); for(let x=x1+step;x<x2;x+=step) s+=ln(x,y1,x,y2,.45); return s; }
function coreSymbols(){ let s = rc(27.25,10.25,2,2,{sw:.6}) + ln(27.25,10.25,29.25,12.25,.45) + ln(29.25,10.25,27.25,12.25,.45) + tx(28.25,12.85,'LIFT',{size:.3,cls:'m',fill:MUTE});
  s += rc(27.25,13.1,3,2.2,{sw:.5}); for(let y=13.1+.28;y<15.3;y+=.28){ s+=ln(27.25,y,28.7,y,.4)+ln(28.8,y,30.25,y,.4);} s+=ln(28.75,13.1,28.75,15.3,.6); return s; }

function planSVG(k){
  const L = LEVELS[k], p='pl'+k, vb=[-3.5,4,57,48.5];
  let s = `<svg viewBox="${vb.join(' ')}" class="dwg" role="img" aria-label="${L.name} plan, scale 1:200">${defs(p)}${gridBg(p,vb)}`;
  s += rc(0,0,50,60,{s:MUTE,sw:.6,x:'stroke-dasharray="6 4"'}) + tx(49.4,51.6,'PLOT BOUNDARY / PERIMETER WALL',{size:.3,a:'end',fill:MUTE,cls:'m'});
  if(k==='G'){ s += rc(16,22,18,24,{f:`url(#${p}-pav)`,s:'none'}) + rc(19.7,21.7,10.6,20.6,{s:INK,sw:.5,x:'stroke-dasharray="2 2"'}) + rc(20,22,10,20,{f:`url(#${p}-water)`,sw:1.4});
    s += tx(25,31.6,'CENTRAL POOL',{size:.62,w:600,cls:'m'})+tx(25,32.5,'10 000 × 20 000 · 200 m²',{size:.36,cls:'m',fill:MUTE})+tx(25,21.35,'OVERFLOW CHANNEL + GRATE',{size:.28,cls:'m',fill:MUTE});
    s += tx(25,20.6,'MAIN TERRACE  ±0.00  FLUSH THRESHOLD',{size:.32,cls:'m'});
    s += rc(16.3,29,.8,8,{f:INK,s:'none'}) + tx(17.6,33,'OUTDOOR KITCHEN',{size:.28,rot:-90,cls:'m'}) + rc(21,44.5,8,.35,{f:LEDC,s:'none'}) + tx(25,45.4,'RECESSED FIRE TROUGH',{size:.28,cls:'m'});
    s += rc(17,5,13,5,{sw:.6,x:'stroke-dasharray="3 2"'})+tx(23.5,6.2,'ENTRANCE CANOPY OVER',{size:.3,cls:'m',fill:MUTE}) + rc(18,8.6,.2,.2,{f:INK})+rc(28.8,8.6,.2,.2,{f:INK});
  }
  if(k==='B'){ s += rc(20,22,10,20,{f:`url(#${p}-soil)`,sw:.8,x:'stroke-dasharray="4 2"'})+tx(25,32,'POOL TANK · RC SHELL',{size:.38,cls:'m',fill:MUTE});
    s += rc(1.5,8,6,18,{f:`url(#${p}-ramp)`,sw:.8}) + ln(4.5,10,4.5,24.5,.8)+`<path d="M4.1 23.8L4.5 24.8L4.9 23.8" fill="none" stroke="${INK}" stroke-width=".8" ${NSS}/>` + tx(3.2,17,'RAMP DN ≤ 20 % · HEATED',{size:.34,rot:-90,cls:'m'});
  }
  if(k==='F'){ s += rc(20,22,10,20,{sw:.6,x:'stroke-dasharray="3 3"'})+tx(25,32,'POOL BELOW',{size:.4,cls:'m',fill:MUTE});
    s += rc(31,37,3,9,{f:`url(#${p}-pav)`,sw:1}) + tx(32.5,41.5,'MASTER TERRACE',{size:.3,rot:-90,cls:'m'}) + rc(16,10,9,4,{sw:.6}) + ln(16,10,25,14,.4)+ln(25,10,16,14,.4) + tx(20.5,11.4,'VOID OVER LOBBY',{size:.3,cls:'m',fill:MUTE});
    s += rc(34,42,8,4,{sw:.5,x:'stroke-dasharray="1 1.5"'}) + tx(38,45.2,'CANTILEVER 4 000',{size:.28,cls:'m',fill:MUTE});
    s += rc(16,19,18,3,{sw:.4,x:'stroke-dasharray="1 2"'});
  }
  for(const r of levelRooms(k)) for(const [x,y,w,h] of r.r) s += rc(x,y,w,h,{f: r.k==='core' ? `url(#${p}-core)` : TINT[r.k], sw:.7});
  s += pg(L.outline,{sw:2.6});
  for(const g of GLAZING[k]) s += glass(g);
  s += coreSymbols();
  if(k==='G'){ s += stairRun(19.5,25,12.6,14) + tx(19.2,13.5,'UP',{size:.3,a:'end',cls:'m'});
    s += rc(31.8,14.2,5,1.2,{sw:.6,f:'#fbfbf9'}) + rc(30.8,10.25,6,.6,{sw:.5}) + rc(36,22.3,4,1.4,{sw:.6,f:'#fbfbf9'}) + rc(36.2,35,3.6,.9,{sw:.5}) + rc(39.6,32,.9,3.9,{sw:.5});
    s += rc(9,24,1,5,{sw:.5})+rc(12.5,24,1,5,{sw:.5}) + bed(8.3,38.2,2.2,2,'W'); }
  if(k==='F'){ s += stairRun(19.5,25,12.6,14) + tx(25.3,13.5,'DN',{size:.3,a:'start',cls:'m'});
    s += bed(8.3,11.8,2.2,2,'W') + bed(32.5,10.3,2,2.2,'N') + bed(8.3,21.5,2.2,2,'W') + bed(8.3,32,2.2,2,'W') + bed(39.4,40.4,2.2,2.2,'E'); }
  if(k==='B'){ for(let i=0;i<=6;i++) s += ln(7.6,26.3+i*2.6,13,26.3+i*2.6,.5);
    for(let i=0;i<6;i++) s += `<rect x="7.9" y="${26.3+i*2.6+.35}" width="4.8" height="1.9" rx=".55" fill="none" stroke="${MUTE}" stroke-width=".55" ${NSS}/>` + rc(12.75,26.3+i*2.6+1.1,.18,.35,{f:LEDC,s:'none'});
    s += ln(4.5,27,4.5,40.5,.6,MUTE,'stroke-dasharray="2 2"') + tx(3.4,34,'6 000 AISLE',{size:.3,rot:-90,cls:'m',fill:MUTE});
    for(let row=0;row<3;row++) for(let c=0;c<3;c++) s += rc(10.6+c*1.1+row*.2,13+row*1.4,.9,.8,{sw:.4}); s += ln(9,10.6,16.2,10.6,1.4) + tx(12.6,10.35+.05,'',{size:.1}); }
  for(const r of levelRooms(k)) s += labelRoom(r);
  // dimensions
  const xs = k==='B' ? [1.5,8,16,30.5,34,42] : [8,16,34,42];
  s += dimChain(xs,6.2,true) + dim(xs[0],5,xs[xs.length-1],5,Math.round((xs[xs.length-1]-xs[0])*1000).toLocaleString('en-US').replace(/,/g,' '));
  const ys = k==='F' ? [10,19,42,46] : k==='B' ? [10,19,26,42] : [10,19,42];
  s += dimChain(ys,45.6,false,{off:-.55}) ;
  // section marker A–A at y = 30
  s += ln(-2.2,30,52.2,30,.9,INK,'stroke-dasharray="6 2 1 2"');
  for(const x of [-2.6,52.6]) s += `<circle cx="${x}" cy="30" r=".75" fill="${PAPER}" stroke="${INK}" stroke-width=".9" ${NSS}/>` + tx(x,30.22,'A',{size:.6,w:600,cls:'m'});
  s += north(50.6,8.5) + scaleBar(0,49.4,10,2) + tx(0,48.7,`${L.sheet} · ${L.name.toUpperCase()} · FFL ${L.ffl>0?'+':L.ffl<0?'−':'±'}${Math.abs(L.ffl).toFixed(2)} · 1:200`,{size:.42,a:'start',w:500,cls:'m'});
  return s + '</svg>';
}

function sitePlanSVG(){
  const p='site', vb=[-4.5,-7,59,73.5];
  let s = `<svg viewBox="${vb.join(' ')}" class="dwg" role="img" aria-label="Master site plan, scale 1:500">${defs(p)}${gridBg(p,vb)}`;
  s += tx(25,-5.2,'ACCESS ROAD',{size:.6,cls:'m',fill:MUTE,ls:.3}) + ln(-4.5,-4.2,54.5,-4.2,.6,MUTE);
  // landscape grounds
  s += rc(.3,46,49.4,13.7,{f:`url(#${p}-grav)`,s:'none'}) + rc(.3,57.6,49.4,2.1,{f:`url(#${p}-grass)`,s:'none'}) + rc(42.3,20,7.4,26,{f:`url(#${p}-grav)`,s:'none'}) + rc(.3,26,7.7,16,{f:`url(#${p}-grass)`,s:'none'}) + rc(.3,42,7.7,4,{f:`url(#${p}-grav)`,s:'none'});
  s += rc(1.5,.3,7.7,8,{f:'#e1e2df',s:'none'}) + rc(9.2,1.5,21.3,7.5,{f:'#e1e2df',s:'none'}) + rc(42.3,10,7.4,10,{f:'#e1e2df',s:'none'});
  s += rc(1.5,8,6,18,{f:`url(#${p}-ramp)`,sw:.7});
  s += rc(16,19,18,27,{f:`url(#${p}-pav)`,s:'none'}) + rc(20,22,10,20,{f:`url(#${p}-water)`,sw:1.3});
  for(let y=46.8;y<57;y+=1.25) s += rc(24.2,y,1.6,.6,{f:'#dcdedb',sw:.4});
  // building roof
  s += pg(LEVELS.G.outline,{f:'#dcdfde',sw:1.2}) + pg(LEVELS.F.outline,{f:'#d4d7d6',sw:2}) + `<polygon points="${LEVELS.F.outline.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${INK}" stroke-width=".4" ${NSS} transform="translate(0 0)"/>`;
  const rl=(a,b,c,d,dash)=>ln(a,b,c,d,dash?.7:1.1,INK,dash?'stroke-dasharray="4 2"':'');
  s += rl(8,14.5,42,14.5) + rl(12,15,12,42) + rl(8,19,12,15,1) + rl(16,19,12,15,1) + rl(38,15,38,46) + rl(34,19,38,15,1) + rl(42,19,38,15,1);
  s += rc(17,10.5,7,1.5,{sw:.6,f:'#e6e8e7'}) + tx(20.5,11.45,'ROOFLIGHT',{size:.28,cls:'m'}) + rc(24,15.4,9,2.8,{sw:.5,f:'#c2c6c7'}) + tx(28.5,17.05,'PV IN SOUTH SLOPE',{size:.28,cls:'m'});
  s += rc(17,3,13,7,{sw:.7,x:'stroke-dasharray="3 2"'}) + rc(18,8.6,.25,.25,{f:INK})+rc(28.8,8.6,.25,.25,{f:INK});
  // perimeter wall with gate openings
  const W=.3; s += rc(0,0,1.8,W,{f:INK,s:'none'}) + rc(9.2,0,40.8,W,{f:INK,s:'none'}) + rc(0,0,W,60,{f:INK,s:'none'}) + rc(0,60-W,50,W,{f:INK,s:'none'}) + rc(50-W,0,W,11.5,{f:INK,s:'none'}) + rc(50-W,15.5,W,44.5,{f:INK,s:'none'});
  s += rc(1.8,-.35,7.4,.2,{f:'#555b60',s:'none'}) + ln(9.2,-.25,16.8,-.25,.6,MUTE,'stroke-dasharray="1.5 1"') + rc(50.15,11.5,.2,4,{f:'#555b60',s:'none'});
  // trees: olive grid
  const trees=TREES;
  for(const [x,y] of trees) s += `<circle cx="${x}" cy="${y}" r="1.5" fill="none" stroke="${INK}" stroke-width=".5" ${NSS}/><circle cx="${x}" cy="${y}" r=".12" fill="${INK}"/>`;
  s += rc(21,44.5,8,.35,{f:LEDC,s:'none'}) + rc(17.2,44.4,3,.5,{f:'#bfc3c2',sw:.4}) + rc(29.8,44.4,3,.5,{f:'#bfc3c2',sw:.4}) + rc(16.3,29,.8,8,{f:INK,s:'none'});
  s += rc(31,37,3,9,{sw:.8,f:'#cfd3d2'});
  // labels
  const lab = (x,y,t,o={}) => tx(x,y,t,{size:.5,cls:'m',...o});
  s += lab(25,31.2,'CENTRAL POOL',{w:600,size:.7}) + lab(25,32.3,'10 × 20 m · OVERFLOW EDGE',{size:.4,fill:MUTE});
  s += lab(15,13.9,'RIDGE +10.15',{size:.36}) + lab(12,31,'WEST WING',{size:.42,rot:-90}) + lab(38,30,'EAST WING',{size:.42,rot:-90}) + lab(38,44.8,'CANTILEVER',{size:.34,fill:MUTE});
  s += lab(5.5,-1.1,'MAIN GATE · AUTOMATED',{size:.36}) + lab(5.5,-.5,'',{}) + lab(47,16.8,'SERVICE',{size:.34}) + lab(47,17.4,'GATE',{size:.34}) + lab(46,12.6,'SERVICE YARD',{size:.34});
  s += lab(4.5,17,'RAMP TO GARAGE −3.50',{size:.36,rot:-90}) + lab(20,6.6,'FORECOURT + CANOPY',{size:.38}) + lab(25,44.1,'FIRE TROUGH',{size:.3}) + lab(17.8,33,'OUTDOOR KITCHEN',{size:.3,rot:-90});
  s += lab(14,52.8,'GRAVEL + OLIVE GROVE',{size:.4,fill:MUTE}) + lab(36,52.8,'GRAVEL + OLIVE GROVE',{size:.4,fill:MUTE}) + lab(25,58.9,'TALL GRASS BAND',{size:.34,fill:MUTE}) + lab(4.1,34,'LANDSCAPED GARAGE ROOF',{size:.3,rot:-90,fill:MUTE});
  s += lab(32.5,41.5,'MASTER TERRACE',{size:.28,rot:-90});
  s += dim(0,-2.6,50,-2.6,'50 000') + dim(-2.6,0,-2.6,60,'60 000') + dimChain([0,20,30,50],61.6,true) + dimChain([0,22,42,60],52.2,false,{off:-.55});
  s += tx(0,64.2,'A-100 · MASTER SITE PLAN · PLOT 3 000 m² · 1:500',{size:.55,a:'start',w:500,cls:'m'}) + scaleBar(30,63.3,20,5,.45) + north(53,4);
  return s + '</svg>';
}
