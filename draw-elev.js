/* Four precise elevations generated from the level outlines, glazing, windows and doors. Painter's algorithm, far to near. */
const ELEV = {
  N: { name:'Front Elevation · North', code:'A-301', face:[0,-1], u:(x,y)=>50-x, d:(x,y)=>y,  axes:()=>GRID_X.map(([n,x])=>[n,50-x]) },
  S: { name:'Back Elevation · South (courtyard)', code:'A-302', face:[0,1], u:(x,y)=>x, d:(x,y)=>-y, axes:()=>GRID_X.map(([n,x])=>[n,x]) },
  E: { name:'Right Elevation · East', code:'A-303', face:[1,0], u:(x,y)=>60-y, d:(x,y)=>-x, axes:()=>GRID_Y.map(([n,y])=>[n,60-y]) },
  W: { name:'Left Elevation · West', code:'A-304', face:[-1,0], u:(x,y)=>y, d:(x,y)=>x, axes:()=>GRID_Y.map(([n,y])=>[n,y]) }
};
function elevFaces(v){
  const V=ELEV[v], faces=[];
  const Z = {G:[0,3.5], F:[3.5,EAVE]};
  for(const k of ['G','F']){ const O=LEVELS[k].outline;
    for(let i=0;i<O.length;i++){ const a=O[i], b=O[(i+1)%O.length], dx=Math.sign(b[0]-a[0]), dy=Math.sign(b[1]-a[1]);
      const n=[dy,-dx]; if(n[0]!==V.face[0]||n[1]!==V.face[1]) continue;
      const u1=V.u(...a), u2=V.u(...b);
      faces.push({k, kind:k==='G'?'conc':'metal', u1:Math.min(u1,u2), u2:Math.max(u1,u2), z1:Z[k][0], z2:Z[k][1], depth:V.d(...a), line:{h:a[1]===b[1], c:a[1]===b[1]?a[1]:a[0]}});
    } }
  const boxFace=(x1,x2,y1,y2,z1,z2,kind)=>{ // near face of a box for this view
    const cx = V.face[0]>0?x2:V.face[0]<0?x1:null, cy = V.face[1]>0?y2:V.face[1]<0?y1:null;
    let u1,u2,d; if(cx!==null){ u1=V.u(cx,y1); u2=V.u(cx,y2); d=V.d(cx,0);} else { u1=V.u(x1,cy); u2=V.u(x2,cy); d=V.d(0,cy); }
    faces.push({kind, u1:Math.min(u1,u2), u2:Math.max(u1,u2), z1, z2, depth:d}); };
  for(const r of ROOFS){ const ym=(r.y1+r.y2)/2, xm=(r.x1+r.x2)/2;
    const along = r.axis==='x' ? (v==='N'||v==='S') : (v==='E'||v==='W');
    if(along){ // we see the slope facing us: a band from eaves to ridge
      if(r.axis==='x'){ const yE=v==='N'?r.y1:r.y2; const a=V.u(r.x1,yE), b=V.u(r.x2,yE); faces.push({kind:'roof',u1:Math.min(a,b),u2:Math.max(a,b),z1:EAVE,z2:r.ridge,depth:V.d(0,yE)+.01}); }
      else { const xE=v==='E'?r.x2:r.x1; const a=V.u(xE,r.y1), b=V.u(xE,r.y2); faces.push({kind:'roof',u1:Math.min(a,b),u2:Math.max(a,b),z1:EAVE,z2:r.ridge,depth:V.d(xE,0)+.01}); }
    } else { // gable end triangle
      if(r.axis==='x'){ const xE=v==='E'?r.x2:r.x1; const a=V.u(xE,r.y1), b=V.u(xE,r.y2), m=V.u(xE,ym); faces.push({kind:'gable',poly:[[a,EAVE],[b,EAVE],[m,r.ridge]],u1:Math.min(a,b),u2:Math.max(a,b),z1:EAVE,z2:r.ridge,depth:V.d(xE,0)}); }
      else { const yE=v==='S'?r.y2:r.y1; const a=V.u(r.x1,yE), b=V.u(r.x2,yE), m=V.u(xm,yE); faces.push({kind:'gable',poly:[[a,EAVE],[b,EAVE],[m,r.ridge]],u1:Math.min(a,b),u2:Math.max(a,b),z1:EAVE,z2:r.ridge,depth:V.d(0,yE)}); }
    } }
  boxFace(17,30,3,10,3.35,3.6,'blade'); boxFace(17.9,18.1,8.5,8.7,0,3.35,'blade'); boxFace(28.9,29.1,8.5,8.7,0,3.35,'blade');
  boxFace(31,34,37,46,3.3,3.5,'blade'); boxFace(31,34,37,46,3.5,4.6,'rail');
  return faces.sort((p,q)=>q.depth-p.depth);
}
function openingsOn(k, line, V){ const out=[];
  const onLine=([[x1,y1],[x2,y2]])=> line.h ? (y1===y2 && y1===line.c) : (x1===x2 && x1===line.c);
  const Z0 = k==='G'?0:3.5, top = k==='G'?3.15:6.65;
  for(const g of GLAZING[k]) if(onLine(g)){ const u1=V.u(...g[0]), u2=V.u(...g[1]); out.push({t:'glass', u1:Math.min(u1,u2), u2:Math.max(u1,u2), z1:Z0+.02, z2:top}); }
  for(const w of WINDOWS[k]) if(onLine(w)){ const u1=V.u(...w[0]), u2=V.u(...w[1]); out.push({t:'win', u1:Math.min(u1,u2), u2:Math.max(u1,u2), z1:Z0+w[2], z2:Z0+w[3]}); }
  for(const [x,y,ax,w,type] of DOORS[k]){ const h=ax==='h'; if(h!==line.h || (h?y:x)!==line.c) continue;
    const p1 = h?[x,y]:[x,y], p2 = h?[x+w,y]:[x,y+w]; const u1=V.u(...p1), u2=V.u(...p2);
    out.push({t: type==='piv'?'pivot':'door', u1:Math.min(u1,u2), u2:Math.max(u1,u2), z1:Z0, z2:Z0+(type==='piv'?3.0:2.4)}); }
  return out; }
function elevPattern(p){ return `<defs>
  <pattern id="${p}-tie" width="1.2" height=".6" patternUnits="userSpaceOnUse" x=".6" y=".3"><rect width="1.2" height=".6" fill="#f6f6f3"/><circle cx=".6" cy=".3" r=".028" fill="#7b8084"/><path d="M1.2 0V.6" stroke="#dcddda" stroke-width=".012"/></pattern>
  <pattern id="${p}-met" width="1.2" height="10" patternUnits="userSpaceOnUse"><rect width="1.2" height="10" fill="#d4d6d7"/><path d="M0 0V10" stroke="#8e9398" stroke-width=".02"/></pattern>
  </defs>`; }
function elevationPrecise(v){
  const V=ELEV[v], p='ev'+v; const W = (v==='N'||v==='S') ? 50 : 60;
  const vb=[-4.5,-12.8,W+11,17.4];
  let s = `<svg viewBox="${vb.join(' ')}" class="dwg" role="img" aria-label="${V.name}">${elevPattern(p)}<rect x="${vb[0]}" y="${vb[1]}" width="${vb[2]}" height="${vb[3]}" fill="${WHITE}"/>`;
  // basement outline below grade (dashed)
  const Bo = LEVELS.B.outline; let bu=[1e9,-1e9]; for(const q of Bo){ const u=V.u(...q); bu=[Math.min(bu[0],u),Math.max(bu[1],u)]; }
  s += rc(bu[0],0,bu[1]-bu[0],3.85,{sw:.45,s:MUTE,x:'stroke-dasharray="3 2"'}) + tx((bu[0]+bu[1])/2,2.3,'BASEMENT BELOW GRADE · FFL −3.50',{size:.34,cls:'m',fill:MUTE});
  for(const f of elevFaces(v)){
    const w=f.u2-f.u1, h=f.z2-f.z1, y=-f.z2;
    if(f.kind==='conc') s += `<rect x="${f.u1}" y="${y}" width="${w}" height="${h}" fill="url(#${p}-tie)" stroke="${INK}" stroke-width=".9" ${NSS}/>` + (f.k? ln(f.u1,-3.15,f.u2,-3.15,.5):'');
    if(f.kind==='metal') s += `<rect x="${f.u1}" y="${y}" width="${w}" height="${h}" fill="url(#${p}-met)" stroke="${INK}" stroke-width=".9" ${NSS}/>`;
    if(f.kind==='roof'){ s += `<rect x="${f.u1}" y="${y}" width="${w}" height="${h}" fill="#565b60" stroke="${INK}" stroke-width=".9" ${NSS}/>`; for(let u=f.u1+.5;u<f.u2-.05;u+=.5) s += ln(u,y,u,-f.z1,.3,'#8b9297'); s += ln(f.u1,y,f.u2,y,1.3); }
    if(f.kind==='gable') s += `<polygon points="${f.poly.map(([u,z])=>u+','+(-z)).join(' ')}" fill="url(#${p}-met)" stroke="${INK}" stroke-width=".9" ${NSS} stroke-linejoin="miter"/>`;
    if(f.kind==='blade') s += `<rect x="${f.u1}" y="${y}" width="${w}" height="${h}" fill="#3a3e42" stroke="${INK}" stroke-width=".7" ${NSS}/>`;
    if(f.kind==='rail') s += `<rect x="${f.u1}" y="${y}" width="${w}" height="${h}" fill="#e9eff0" fill-opacity=".6" stroke="${INK}" stroke-width=".5" ${NSS}/>`;
    if(!f.k) continue;
    for(const o of openingsOn(f.k,f.line,V)){ const ow=o.u2-o.u1, oh=o.z2-o.z1, oy=-o.z2;
      if(o.t==='glass'||o.t==='win'){ s += `<rect x="${o.u1}" y="${oy}" width="${ow}" height="${oh}" fill="#e6edef" stroke="${INK}" stroke-width=".8" ${NSS}/>`;
        s += rc(o.u1+.06,oy+.06,ow-.12,oh-.12,{sw:.3});
        const n=Math.max(1,Math.round(ow/(o.t==='glass'?2.6:1.6))); for(let i=1;i<n;i++){ const u=o.u1+ow*i/n; s += ln(u,oy,u,-o.z1,.45); }
        if(f.k==='F'){ for(let u=o.u1+.15;u<o.u2;u+=.3) s += ln(u,oy-.08,u,-o.z1+.08,.55,'#59616a'); s += ln(o.u1,oy-.08,o.u2,oy-.08,.6) + ln(o.u1,-o.z1+.08,o.u2,-o.z1+.08,.6); }
        else for(let i=0;i<n;i++){ const u0=o.u1+ow*i/n, pw=ow/n; const a=Math.min(.55*pw,.9); s += ln(u0+pw*.2,oy+oh*.35,u0+pw*.2+a,oy+oh*.35-a*.9,.3,MUTE) + ln(u0+pw*.32,oy+oh*.42,u0+pw*.32+a*.7,oy+oh*.42-a*.63,.3,MUTE); } }
      if(o.t==='door'){ s += `<rect x="${o.u1}" y="${oy}" width="${ow}" height="${oh}" fill="#3a3e42" stroke="${INK}" stroke-width=".8" ${NSS}/>` + ln(o.u1+.08,oy,o.u1+.08,-o.z1,.3,'#9aa0a4'); }
      if(o.t==='pivot'){ s += `<rect x="${o.u1}" y="${oy}" width="${ow}" height="${oh}" fill="#2b2e31" stroke="${INK}" stroke-width="1.1" ${NSS}/>` + ln(o.u1+ow*.18,oy,o.u1+ow*.18,-o.z1,.35,'#9aa0a4'); }
    }
  }
  // ground, soffit LED, human scale
  s += ln(vb[0]+.5,0,W+2.5,0,1.8);
  const man = u => `<g fill="none" stroke="${INK}"><circle cx="${u}" cy="-1.6" r=".12" stroke-width=".6" ${NSS}/><path d="M${u} -1.48V-.85M${u} -.85L${u-.16} 0M${u} -.85L${u+.16} 0M${u-.22} -1.3L${u} -1.38L${u+.22} -1.3" stroke-width=".6" ${NSS}/></g>`;
  s += man(v==='N'?24:v==='S'?22:v==='E'?40:22) ;
  // grid bubbles
  for(const [n,u] of V.axes()){ s += ln(u,.2,u,1.6,.45,'#9aa0a4','stroke-dasharray="3 1.5"') + `<circle cx="${u}" cy="2.2" r=".58" fill="${WHITE}" stroke="${INK}" stroke-width=".7" ${NSS}/>` + tx(u,2.4,n,{size:.5,w:600,cls:'m'}); }
  // level datums
  s += datums(-3.5,W+2.5,W+2.8,[[10.15,'+10.15 RIDGE · NORTH'],[9.8,'+9.80 RIDGE · WINGS'],[7.0,'+7.00 EAVES'],[3.5,'+3.50 UPPER FLOOR · 2ND',1],[0,'±0.00 GROUND FLOOR · 1ST',1]]);
  s += dimChain([0,3.5,7.0,10.15],-3.3,false,{off:.55,size:.34}).replace(/y="(-?[\d.]+)"/g,(m,y)=>m) ;
  // overall width dimension
  let uu=[1e9,-1e9]; for(const f of elevFaces(v)){ if(f.k){ uu=[Math.min(uu[0],f.u1),Math.max(uu[1],f.u2)]; } }
  s += dim(uu[0],3.5,uu[1],3.5,Math.round((uu[1]-uu[0])*1000).toLocaleString('en-US').replace(/,/g,' '),{size:.38});
  s += tx(vb[0]+.6,-11.9,`${V.code} · ${V.name.toUpperCase()} · 1:200`,{size:.5,a:'start',w:600,cls:'m'}) + tx(vb[0]+.6,-11.3,'Perimeter wall omitted · concrete ground floor · black metal upper floor with white fins · three 35° black standing-seam gables · low-iron glass',{size:.3,a:'start',cls:'m',fill:MUTE});
  return s + '</svg>';
}
