/* Precise CAD floor plans and staged (coloured, furnished) floor plans. Depends on data.js, plan-data.js, draw-plans.js helpers. */
const WHITE='#ffffff';
const K = v => (Math.round(v*1000)/1000).toFixed(3);
function mergeIv(list){ const s=list.slice().sort((a,b)=>a[0]-b[0]); const out=[]; for(const [a,b] of s){ const l=out[out.length-1]; if(l && a<=l[1]+1e-6) l[1]=Math.max(l[1],b); else out.push([a,b]); } return out; }
function subIv(list, cuts){ let cur=list; for(const [c0,c1] of cuts){ const nx=[]; for(const [a,b] of cur){ if(c1<=a||c0>=b){nx.push([a,b]);continue;} if(c0>a) nx.push([a,c0]); if(c1<b) nx.push([c1,b]); } cur=nx; } return cur.filter(([a,b])=>b-a>1e-4); }
function wallRuns(k){
  const H={}, V={}, add=(m,c,a,b)=>{ (m[K(c)] ||= []).push([a,b]); };
  for(const r of levelRooms(k)) for(const [x,y,w,h] of r.r){ add(H,y,x,x+w); add(H,y+h,x,x+w); add(V,x,y,y+h); add(V,x+w,y,y+h); }
  const cutH={}, cutV={}, cut=(m,c,a,b)=>{ (m[K(c)] ||= []).push([Math.min(a,b),Math.max(a,b)]); };
  for(const r of levelRooms(k)) for(const p of r.r) for(const q of r.r){ if(p===q) continue;
    if(Math.abs(p[1]+p[3]-q[1])<1e-6){ const a=Math.max(p[0],q[0]), b=Math.min(p[0]+p[2],q[0]+q[2]); if(b>a) cut(cutH,q[1],a,b); }
    if(Math.abs(p[0]+p[2]-q[0])<1e-6){ const a=Math.max(p[1],q[1]), b=Math.min(p[1]+p[3],q[1]+q[3]); if(b>a) cut(cutV,q[0],a,b); } }
  for(const [[x1,y1],[x2,y2]] of OPEN[k]||[]) y1===y2 ? cut(cutH,y1,x1,x2) : cut(cutV,x1,y1,y2);
  const runs=[];
  for(const c in H) for(const [a,b] of subIv(mergeIv(H[c]),cutH[c]||[])) runs.push({h:true,c:+c,a,b});
  for(const c in V) for(const [a,b] of subIv(mergeIv(V[c]),cutV[c]||[])) runs.push({h:false,c:+c,a,b});
  return runs;
}
const wallRect = (h,c,a,b,t,f=INK) => h ? `<rect x="${a-t/2}" y="${c-t/2}" width="${b-a+t}" height="${t}" fill="${f}"/>` : `<rect x="${c-t/2}" y="${a-t/2}" width="${t}" height="${b-a+t}" fill="${f}"/>`;
const eraseRect = (h,c,a,b,t=.38,f=WHITE) => h ? `<rect x="${a}" y="${c-t/2}" width="${b-a}" height="${t}" fill="${f}"/>` : `<rect x="${c-t/2}" y="${a}" width="${t}" height="${b-a}" fill="${f}"/>`;
function glassSym(h,c,a,b,{dash=false}={}){ let s=''; const L=(o,w,x='')=> h ? ln(a,c+o,b,c+o,w,INK,x) : ln(c+o,a,c+o,b,w,INK,x);
  if(dash) return L(0,.6,'stroke-dasharray="3 2"');
  s += L(-.14,.45) + L(.14,.45) + L(0,.9);
  const n=Math.max(1,Math.round((b-a)/2.6)); for(let i=0;i<=n;i++){ const p=a+(b-a)*i/n; s += h ? ln(p,c-.14,p,c+.14,.6) : ln(c-.14,p,c+.14,p,.6); }
  return s; }
function doorSym([x,y,ax,w,type,hinge,sw], bg){
  const h = ax==='h', a = h?x:y, b=a+w, c=h?y:x; let s = eraseRect(h,c,a,b,.4,bg);
  const P=(u,v)=> h?[u,v]:[v,u]; const jamb=(p)=>{ const [x1,y1]=P(p,c-.17),[x2,y2]=P(p,c+.17); return ln(x1,y1,x2,y2,.9); };
  s += jamb(a)+jamb(b);
  const leaf=(hp,len,sg,endp)=>{ const [hx,hy]=P(hp,c), [lx,ly]=P(hp,c+sg*len), [jx,jy]=P(endp,c);
    const cr=(lx-hx)*(jy-hy)-(ly-hy)*(jx-hx);
    return ln(hx,hy,lx,ly,1.1) + `<path d="M${lx} ${ly}A${len} ${len} 0 0 ${cr>0?1:0} ${jx} ${jy}" fill="none" stroke="${INK}" stroke-width=".45" ${NSS}/>`; };
  const sg = sw==='+'?1:-1;
  if(type==='sw'||type==='piv') s += hinge==='s' ? leaf(a,w,sg,b) : leaf(b,w,sg,a);
  if(type==='piv'){ const [px,py]=P(a+w*.18,c); s += `<circle cx="${px}" cy="${py}" r=".06" fill="${INK}"/>`; }
  if(type==='dbl') s += leaf(a,w/2,sg,a+w/2) + leaf(b,w/2,sg,a+w/2);
  if(type==='sl'){ const q=w*.55; const r1=h?rc(a,c-.07,q,.05,{sw:.7}):rc(c-.07,a,.05,q,{sw:.7}); const r2=h?rc(b-q,c+.02,q,.05,{sw:.7}):rc(c+.02,b-q,.05,q,{sw:.7}); s+=r1+r2; }
  if(type==='gar'){ const [x1,y1]=P(a,c),[x2,y2]=P(b,c); s += ln(x1,y1,x2,y2,.7,INK,'stroke-dasharray="4 2"'); }
  if(type==='lift'){ const [x1,y1]=P(a,c-.05),[x2,y2]=P(b,c-.05); s += ln(x1,y1,x2,y2,1.2); }
  return s; }

/* ---------- symbols ---------- */
function symbol(it, mode){
  const cad = mode==='cad', t = it[0];
  const F = (staged, x='') => cad ? `fill="${WHITE}" stroke="${INK}" stroke-width=".6" ${NSS} ${x}` : `fill="${staged}" stroke="#6f6c66" stroke-width=".45" ${NSS} ${x}`;
  const R = (x,y,w,h,f,rx=0,x2='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" ${F(f,x2)}/>`;
  const C = (x,y,r,f) => `<circle cx="${x}" cy="${y}" r="${r}" ${F(f)}/>`;
  const E = (x,y,rx,ry,f) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" ${F(f)}/>`;
  const Lx = (x1,y1,x2,y2,w=.4) => ln(x1,y1,x2,y2,w,cad?INK:'#6f6c66');
  const shadow = cad ? '' : ' filter="url(#shd)"';
  const g = s => `<g${shadow}>${s}</g>`;
  switch(t){
    case 'bedK': case 'bedS': { const [,x,y,w,h,hd]=it; let s=R(x,y,w,h,'#fbfaf7',.08);
      const pillow = (px,py,pw,ph)=>R(px,py,pw,ph,'#ffffff',.12);
      if(hd==='W'){ s+=Lx(x+.5,y,x+.5,y+h,.3); s+= t==='bedK' ? pillow(x+.1,y+.12,.35,h/2-.2)+pillow(x+.1,y+h/2+.08,.35,h/2-.2) : pillow(x+.1,y+.15,.35,h-.3); s+= R(x+w*.62,y,w*.3,h,cad?WHITE:'#9aa0a3'); }
      if(hd==='N'){ s+=Lx(x,y+.5,x+w,y+.5,.3); s+= t==='bedK' ? pillow(x+.12,y+.1,w/2-.2,.35)+pillow(x+w/2+.08,y+.1,w/2-.2,.35) : pillow(x+.15,y+.1,w-.3,.35); s+= R(x,y+h*.62,w,h*.3,cad?WHITE:'#9aa0a3'); }
      if(hd==='E'){ s+=Lx(x+w-.5,y,x+w-.5,y+h,.3); s+= R(x+.08*w,y,w*.3,h,cad?WHITE:'#9aa0a3'); }
      return g(s); }
    case 'ns': return g(R(it[1],it[2],.5,.45,'#a88461'));
    case 'sofa': { const [,x,y,w,h,bk]=it; let s=R(x,y,w,h,'#b9b2a6',.1); const d=.22;
      if(bk==='N') s+=R(x+.08,y+d,w-.16,h-d-.06,'#cdc7bc',.08); if(bk==='S') s+=R(x+.08,y+.06,w-.16,h-d-.06,'#cdc7bc',.08);
      if(bk==='W') s+=R(x+d,y+.08,w-d-.06,h-.16,'#cdc7bc',.08); if(bk==='E') s+=R(x+.06,y+.08,w-d-.06,h-.16,'#cdc7bc',.08);
      const n=Math.max(1,Math.round((bk==='N'||bk==='S'?w:h)/1.4)); for(let i=1;i<n;i++){ if(bk==='N'||bk==='S'){const px=x+w*i/n; s+=Lx(px,y+.25,px,y+h-.1,.3);} else {const py=y+h*i/n; s+=Lx(x+.25,py,x+w-.1,py,.3);} }
      return g(s); }
    case 'armchair': { const [,x,y]=it; return g(R(x,y,.85,.85,'#b9b2a6',.12)+R(x+.14,y+.14,.57,.57,'#cdc7bc',.08)); }
    case 'chair': { const [,x,y]=it; return g(R(x,y,.5,.5,'#3a3d40',.06)); }
    case 'stool': { const [,x,y]=it; return g(C(x,y,.21,'#3a3d40')); }
    case 'stable': { const [,x,y,r]=it; return g(C(x,y,r,'#a88461')); }
    case 'ctable': case 'table': { const [,x,y,w,h]=it; return g(R(x,y,w,h,t==='ctable'?'#e7e4de':'#a88461',.04)); }
    case 'dtable': { const [,x,y,w,h,n]=it; let s=''; const side=Math.max(1,Math.floor((n-2)/2)), cw=.46;
      for(let i=0;i<side;i++){ const cx=x+w*(i+.5)/side-cw/2; s+=R(cx,y-.58,cw,.46,'#3a3d40',.05)+R(cx,y+h+.12,cw,.46,'#3a3d40',.05); }
      if(n>side*2){ s+=R(x-.58,y+h/2-cw/2,.46,cw,'#3a3d40',.05)+R(x+w+.12,y+h/2-cw/2,.46,cw,'#3a3d40',.05); }
      return g(s+R(x,y,w,h,'#a88461',.03)); }
    case 'desk': { const [,x,y,w,h]=it; return g(R(x,y,w,h,'#2b2e31')); }
    case 'rug': { const [,x,y,w,h]=it; return cad ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${INK}" stroke-width=".35" ${NSS} stroke-dasharray="2 2"/>` : `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#c9bea9" stroke="#b1a58e" stroke-width=".6" ${NSS}/><rect x="${x+.15}" y="${y+.15}" width="${w-.3}" height="${h-.3}" fill="none" stroke="#b1a58e" stroke-width=".35" ${NSS}/>`; }
    case 'wardrobe': { const [,x,y,w,h]=it; const s=R(x,y,w,h,'#d8d4cc'); const hz=w>h; return s + (hz? Lx(x+.05,y+h/2,x+w-.05,y+h/2,.3):Lx(x+w/2,y+.05,x+w/2,y+h-.05,.3)) + (hz?Lx(x,y,x+w,y+h,.25):Lx(x,y,x+w,y+h,.25)); }
    case 'shelf': { const [,x,y,w,h]=it; return R(x,y,w,h,'#cfcac1') + Lx(x,y,x+w,y+h,.25) + Lx(x+w,y,x,y+h,.25); }
    case 'wc': { const [,x,y,d]=it; const o={N:[0,1],S:[0,-1],W:[1,0],E:[-1,0]}[d]; const [ox,oy]=o; const tw=.4, td=.18;
      const tx0 = ox? x+(ox>0?0:-td) : x-tw/2, ty0 = oy? y+(oy>0?0:-td) : y-tw/2;
      const tank = ox? R(tx0,ty0,td,tw,'#ffffff',.03) : R(tx0,ty0,tw,td,'#ffffff',.03);
      const bx = x+ox*(td+.26), by = y+oy*(td+.26); return g(tank + E(bx,by,ox?.28:.19,ox?.19:.28,'#ffffff')); }
    case 'basin': { const [,x,y,d]=it; if(d==='W'||d==='E'){ const x0=d==='W'?x:x-.5; return g(R(x0,y-.6,.5,1.2,'#e6e3dc')+E(x0+.25,y,.16,.32,'#ffffff')); } const y0=d==='N'?y:y-.45; return g(R(x-.3,y0,.6,.45,'#e6e3dc')+E(x,y0+.22,.2,.14,'#ffffff')); }
    case 'vanity': { const [,x,y,w,h,d]=it; let s=R(x,y,w,h,'#e6e3dc'); const hz=w>h, n=(hz?w:h)>1.4?2:1;
      for(let i=0;i<n;i++){ const p=(i+.5)/n; s+= hz? E(x+w*p,y+h/2,.2,.14,'#ffffff') : E(x+w/2,y+h*p,.14,.2,'#ffffff'); } return g(s); }
    case 'shower': { const [,x,y,w,h]=it; return R(x,y,w,h,cad?WHITE:'#c4ccce') + Lx(x,y,x+w,y+h,.3) + (cad?'':'') + `<circle cx="${x+w/2}" cy="${y+h/2}" r=".05" fill="${INK}"/>`; }
    case 'bath': { const [,x,y,w,h]=it; return g(R(x,y,w,h,'#ffffff',.2)+R(x+.1,y+.1,w-.2,h-.2,cad?WHITE:'#dfe6e8',.3)); }
    case 'counter': { const [,x,y,w,h,o]=it; let s=R(x,y,w,h,o==='tall'?'#2b2e31':'#e6e3dc'); const hz=w>h;
      if(o==='sink'){ const cx=hz?x+w*.3:x+w/2, cy=hz?y+h/2:y+h*.3; s+= hz? R(cx-.35,cy-.18,.7,.36,'#ffffff',.05) : R(cx-.18,cy-.35,.36,.7,'#ffffff',.05); }
      if(o==='hob'){ const cx=x+w/2, cy=y+h*.55; for(const [dx,dy] of [[-.12,-.2],[.12,-.2],[-.12,.2],[.12,.2]]) s+=`<circle cx="${cx+dx}" cy="${cy+dy}" r=".09" fill="none" stroke="${cad?INK:'#6f6c66'}" stroke-width=".4" ${NSS}/>`; }
      if(o==='tall') s += Lx(x,y+h-.08,x+w,y+h-.08,.3);
      return s; }
    case 'counterOut': { const [,x,y,w,h]=it; return g(R(x,y,w,h,'#2b2e31')); }
    case 'island': { const [,x,y,w,h]=it; return g(R(x,y,w,h,'#e9e6df') + R(x+w*.18,y+h/2-.2,.7,.4,'#ffffff',.05) + [0,1,2,3].map(i=>`<circle cx="${x+w*.62+(i%2)*.24}" cy="${y+h/2+(i<2?-.14:.14)}" r=".08" fill="none" stroke="${cad?INK:'#6f6c66'}" stroke-width=".4" ${NSS}/>`).join('')); }
    case 'media': { const [,x,y,w,h]=it; return R(x,y,w,h,'#2b2e31'); }
    case 'planter': { const [,x,y,d]=it; return cad ? C(x,y,d/2,WHITE)+C(x,y,d/4,WHITE) : g(`<circle cx="${x}" cy="${y}" r="${d/2}" fill="#6f8f5a" stroke="#56724a" stroke-width=".5" ${NSS}/><circle cx="${x-.08}" cy="${y-.08}" r="${d/4}" fill="#86a56c"/>`); }
    case 'lounger': { const [,x,y]=it; return g(R(x,y,2,.72,'#f2f0ea',.08)+R(x,y,.55,.72,cad?WHITE:'#dcd8cf',.08)); }
    case 'bench': { const [,x,y,w,h]=it; return g(R(x,y,w,h,'#bdbab3')); }
    case 'fire': { const [,x,y,w,h]=it; return cad ? R(x,y,w,h,WHITE)+Lx(x,y+h/2,x+w,y+h/2,.6) : `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#e08a3c" stroke="#9a5a22" stroke-width=".5" ${NSS}/>`; }
    case 'screen': { const [,x,y,w,h]=it; return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${cad?INK:'#e8e8e8'}" stroke="${INK}" stroke-width=".5" ${NSS}/>`; }
    case 'seat': { const [,x,y]=it; return g(R(x,y,.95,.95,'#5a5e62',.15)+R(x+.18,y+.12,.6,.62,cad?WHITE:'#6e7377',.1)); }
    case 'treadmill': { const [,x,y,w,h]=it; return g(R(x,y,w,h,'#3a3d40',.05)+R(x+.15,y+.3,w-.3,h-.45,cad?WHITE:'#55595d')); }
    case 'mat': { const [,x,y,w,h]=it; return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${cad?'none':'#6b7074'}" stroke="${INK}" stroke-width=".35" ${NSS} stroke-dasharray="2 1.5"/>`; }
    case 'car': { const [,x,y,w,h]=it; return g(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx=".6" ${F('#a4a8ac')}/>` + (w>h ? R(x+1.3,y+.2,1.9,h-.4,cad?WHITE:'#6d7378',.25) : R(x+.2,y+1.3,w-.4,1.9,cad?WHITE:'#6d7378',.25))); }
    case 'equip': { const [,x,y,w,h,l]=it; return R(x,y,w,h,'#b7bcc0') + (cad? Lx(x,y,x+w,y+h,.25):'') + (l? tx(x+w/2,y+h/2+.1,l,{size:Math.min(.28,w/(l.length*.62)),cls:'m',fill:INK}):''); }
    case 'rack': { const [,x,y,w,h]=it; return R(x,y,w,h,'#2b2e31') + Lx(x,y,x+w,y+h,.3) + Lx(x+w,y,x,y+h,.3); }
    case 'filter': { const [,x,y,r]=it; return C(x,y,r,'#b7bcc0') + `<circle cx="${x}" cy="${y}" r="${r*.4}" fill="none" stroke="${INK}" stroke-width=".35" ${NSS}/>`; }
    case 'wd': { const [,x,y]=it; return R(x,y,.65,.6,'#ffffff') + `<circle cx="${x+.325}" cy="${y+.3}" r=".2" fill="none" stroke="${cad?INK:'#6f6c66'}" stroke-width=".4" ${NSS}/>`; }
  }
  return '';
}
/* floor finishes for the staged plan */
function floorDefs(){
  return `<defs>
  <pattern id="fl-stone" width="1.2" height=".6" patternUnits="userSpaceOnUse"><rect width="1.2" height=".6" fill="#e3e0d9"/><path d="M1.2 0H0V.6" fill="none" stroke="#cfcbc2" stroke-width=".02"/></pattern>
  <pattern id="fl-oak" width="2.4" height=".4" patternUnits="userSpaceOnUse"><rect width="2.4" height=".4" fill="#d9c3a0"/><path d="M0 0H2.4M0 .2H2.4M.9 0V.2M2.0 .2V.4" stroke="#c4aa82" stroke-width=".015"/></pattern>
  <pattern id="fl-tile" width=".6" height=".6" patternUnits="userSpaceOnUse"><rect width=".6" height=".6" fill="#ccd2d2"/><path d="M.6 0H0V.6" fill="none" stroke="#b6bdbd" stroke-width=".015"/></pattern>
  <pattern id="fl-conc" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="#c3c2bd"/><path d="M3 0H0V3" fill="none" stroke="#b2b1ab" stroke-width=".02"/></pattern>
  <pattern id="fl-carpet" width=".2" height=".2" patternUnits="userSpaceOnUse"><rect width=".2" height=".2" fill="#3f4246"/><circle cx=".1" cy=".1" r=".02" fill="#4a4e52"/></pattern>
  <pattern id="fl-rubber" width=".5" height=".5" patternUnits="userSpaceOnUse"><rect width=".5" height=".5" fill="#5a5e61"/><path d="M.5 0H0V.5" fill="none" stroke="#4d5154" stroke-width=".015"/></pattern>
  <pattern id="fl-deck" width="1.2" height=".6" patternUnits="userSpaceOnUse"><rect width="1.2" height=".6" fill="#c9c7c1"/><path d="M1.2 0H0V.6" fill="none" stroke="#b3b0a9" stroke-width=".02"/></pattern>
  <linearGradient id="fl-water" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6fb0bd"/><stop offset=".55" stop-color="#3f8797"/><stop offset="1" stop-color="#2b6977"/></linearGradient>
  <pattern id="fl-ripple" width="2" height="1.2" patternUnits="userSpaceOnUse"><path d="M0 .6Q.5 .45 1 .6T2 .6" fill="none" stroke="#9fd0da" stroke-width=".03" opacity=".6"/></pattern>
  <pattern id="fl-grav" width="1" height="1" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="#dcd8ce"/><g fill="#b9b4a8"><circle cx=".15" cy=".2" r=".05"/><circle cx=".6" cy=".1" r=".04"/><circle cx=".42" cy=".55" r=".05"/><circle cx=".85" cy=".62" r=".04"/><circle cx=".2" cy=".85" r=".04"/><circle cx=".7" cy=".92" r=".05"/></g></pattern>
  <pattern id="fl-grass" width=".5" height=".6" patternUnits="userSpaceOnUse"><rect width=".5" height=".6" fill="#b7bd93"/><path d="M.1 .55L.05 .1M.25 .55L.25 .05M.4 .55L.45 .15" stroke="#7f8a5c" stroke-width=".03" fill="none"/></pattern>
  <radialGradient id="fl-tree" cx=".38" cy=".35" r=".72"><stop offset="0" stop-color="#95b37b"/><stop offset=".6" stop-color="#60804f"/><stop offset="1" stop-color="#3e5936"/></radialGradient>
  <filter id="shd" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx=".07" dy=".09" stdDeviation=".06" flood-color="#000" flood-opacity=".28"/></filter>
  </defs>`;
}
function floorFor(r){ if(r.n==='Cinema') return 'fl-carpet'; if(r.n==='Gym') return 'fl-rubber'; if(r.n==='Sauna') return 'fl-oak';
  return {live:'fl-stone',circ:'fl-stone',core:'fl-stone',sleep:'fl-oak',store:'fl-oak',staff:'fl-oak',wet:'fl-tile',service:'fl-tile',garage:'fl-conc',plant:'fl-conc'}[r.k] || 'fl-stone'; }

function cadLabel(r, staged){
  const big = r.r.reduce((a,b)=> (b[2]*b[3]>a[2]*a[3]?b:a)); const [x,y,w,h]=big; const [cx,cy] = r.l || [x+w/2,y+h/2];
  const vertical = w<2.2 && h>w*2.2, span=(vertical?h:w)-.5, name=r.n;
  const fs=Math.max(.2,Math.min(.46,span/(name.length*.58)));
  const dims = r.r.length===1 ? `${fmt(w,2)} × ${fmt(h,2)}` : 'L-shaped';
  const halo = staged ? `paint-order="stroke" stroke="rgba(255,255,255,.75)" stroke-width="3" ${NSS}` : '';
  const T=(xx,yy,s,o)=>`<text x="${xx}" y="${yy}" font-size="${o.size}" text-anchor="middle" fill="${o.fill||INK}" font-weight="${o.w||400}" class="${o.cls||''}" ${halo}>${esc(s)}</text>`;
  if(staged){ const inner = T(cx,cy+fs*.35,name,{size:fs,w:500}); return vertical?`<g transform="rotate(-90 ${cx} ${cy})">${inner}</g>`:inner; }
  const inner = T(cx,cy-fs*.15,name,{size:fs,w:500}) + T(cx,cy+fs*.95,`${fmt(area(r))} m²`,{size:fs*.72,cls:'m'}) + (vertical||h<2.6?'':T(cx,cy+fs*1.85,dims,{size:fs*.62,cls:'m',fill:MUTE}));
  return vertical ? `<g transform="rotate(-90 ${cx} ${cy})">${inner}</g>` : inner;
}
function gridAxes(x0,x1,y0,y1,maxY){ let s='';
  for(const [n,x] of GRID_X){ s += ln(x,y0,x,y1,.45,'#9aa0a4','stroke-dasharray="8 2 1.5 2"') + `<circle cx="${x}" cy="${y0-.7}" r=".62" fill="${WHITE}" stroke="${INK}" stroke-width=".7" ${NSS}/>` + tx(x,y0-.52,n,{size:.55,w:600,cls:'m'}); }
  for(const [n,y] of GRID_Y){ if(y>maxY) continue; s += ln(x0,y,x1,y,.45,'#9aa0a4','stroke-dasharray="8 2 1.5 2"') + `<circle cx="${x0-.7}" cy="${y}" r=".62" fill="${WHITE}" stroke="${INK}" stroke-width=".7" ${NSS}/>` + tx(x0-.7,y+.19,n,{size:.55,w:600,cls:'m'}); }
  return s; }
function stairs(k){ let s='';
  if(k!=='B'){ s += rc(19.5,12.6,5.5,1.4,{f:WHITE,sw:.6}); for(let x=19.5+.29;x<25;x+=.29) s+=ln(x,12.6,x,14,.45);
    s += ln(19.7,13.3,24.7,13.3,.6) + `<path d="M24.4 13.05L24.8 13.3L24.4 13.55" fill="none" stroke="${INK}" stroke-width=".6" ${NSS}/>` + tx(k==='G'?19.3:25.4,13.45,k==='G'?'UP':'DN',{size:.3,a:k==='G'?'end':'start',cls:'m'});
    if(k==='G') s += ln(22.6,12.6,22.2,14,1.6,WHITE) + ln(22.75,12.6,22.35,14,.5) + ln(22.45,12.6,22.05,14,.5); }
  // core: lift + dogleg service stair
  s += rc(27.3,13.3,1.95,2.1,{f:WHITE,sw:.6}) + ln(27.3,13.3,29.25,15.4,.4) + ln(29.25,13.3,27.3,15.4,.4) + tx(28.27,14.45,'LIFT',{size:.26,cls:'m',fill:MUTE});
  s += rc(27.2,10.2,3.1,2.9,{f:WHITE,sw:.5}); for(let y=11.35;y<13.05;y+=.28){ s+=ln(27.2,y,28.7,y,.4)+ln(28.8,y,30.3,y,.4); } s += ln(28.75,11.35,28.75,13.1,.6) + ln(27.2,11.35,30.3,11.35,.5);
  return s; }

function planCAD(k, staged=false, opts={}){
  const L=LEVELS[k], vb=opts.site?[-3.8,-3.4,57.6,67.4]:[-3.5,0.4,57.5,50.6], bg = staged ? '#f3f2ee' : WHITE, maxY = k==='F'?46:42;
  let s = `<svg viewBox="${vb.join(' ')}" class="dwg" role="img" aria-label="${L.name} ${staged?'staged':''} floor plan">${defs('c'+k+(staged?'s':''))}${staged?floorDefs():''}<rect x="${vb[0]}" y="${vb[1]}" width="${vb[2]}" height="${vb[3]}" fill="${bg}"/>`;
  if(!staged && !opts.site) s += gridAxes(0.4,46.8,2.2,maxY+1.2,maxY);
  if(opts.site) s += siteContext(k, staged);
  if(staged){
    if(k==='G'){ s += `<rect x="16" y="19" width="18" height="27" fill="url(#fl-deck)"/><rect x="19.7" y="21.7" width="10.6" height="20.6" fill="#8d9a9c"/><rect x="20" y="22" width="10" height="20" fill="url(#fl-water)"/><rect x="20" y="22" width="10" height="20" fill="url(#fl-ripple)"/>` + tx(25,32.2,'POOL',{size:.7,w:600,fill:'#e8f4f6',cls:'m'});
      for(const it of FURN.DECK) s += symbol(it,'staged'); }
    if(k==='F') s += `<rect x="31" y="37" width="3" height="9" fill="url(#fl-deck)"/>` + `<rect x="20" y="22" width="10" height="20" fill="#dfe9eb" stroke="#9fb4b8" stroke-width=".5" ${NSS} stroke-dasharray="3 2"/>`;
    for(const r of levelRooms(k)) for(const [x,y,w,h] of r.r) s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${floorFor(r)})"/>`;
  } else {
    if(k==='G') s += rc(20,22,10,20,{sw:1.1}) + rc(20.3,22.3,9.4,19.4,{sw:.4}) + rc(19.7,21.7,10.6,20.6,{sw:.35,x:'stroke-dasharray="2 1.5"'}) + tx(25,32.2,'POOL 10.00 × 20.00',{size:.45,cls:'m'}) + FURN.DECK.map(it=>symbol(it,'cad')).join('');
    if(k==='F') s += rc(31,37,3,9,{sw:.8}) + rc(20,22,10,20,{sw:.45,x:'stroke-dasharray="3 2"'}) + tx(25,32.2,'POOL BELOW',{size:.4,cls:'m',fill:MUTE});
    if(k==='B') s += rc(1.5,8,6,18,{sw:.6}) + Array.from({length:17},(_,i)=>ln(1.5,9+i,7.5,9+i,.35)).join('') + ln(4.5,10,4.5,24.8,.6) + `<path d="M4.15 24.1L4.5 24.9L4.85 24.1" fill="none" stroke="${INK}" stroke-width=".6" ${NSS}/>` + tx(3.4,17,'RAMP DN ≤ 20 %',{size:.32,rot:-90,cls:'m'});
  }
  if(k==='F') s += ln(16,10,25,14,.35,MUTE) + ln(25,10,16,14,.35,MUTE) + tx(20.5,11.6,'VOID',{size:.34,cls:'m',fill:MUTE});
  for(const it of FURN[k]) s += symbol(it, staged?'staged':'cad');
  s += stairs(k);
  // walls
  for(const w of wallRuns(k)) s += wallRect(w.h,w.c,w.a,w.b,.15);
  for(const [[x1,y1],[x2,y2],t] of EXTRA_WALLS[k]||[]) s += wallRect(y1===y2,y1===y2?y1:x1,y1===y2?x1:y1,y1===y2?x2:y2,t);
  s += `<polygon points="${L.outline.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${INK}" stroke-width=".3" stroke-linejoin="miter"/>`;
  for(const [[x1,y1],[x2,y2]] of GLAZING[k]){ const h=y1===y2, c=h?y1:x1, a=h?Math.min(x1,x2):Math.min(y1,y2), b=h?Math.max(x1,x2):Math.max(y1,y2); s += eraseRect(h,c,a,b,.4,bg) + glassSym(h,c,a,b); }
  for(const [[x1,y1],[x2,y2],sill] of WINDOWS[k]){ const h=y1===y2, c=h?y1:x1, a=h?x1:y1, b=h?x2:y2; s += sill>=1.8 ? glassSym(h,c,a,b,{dash:true}) : eraseRect(h,c,a,b,.4,bg) + glassSym(h,c,a,b); }
  for(const [[x1,y1],[x2,y2]] of (BALUSTRADE[k]||[])) s += ln(x1,y1,x2,y2,.5) + (y1===y2? ln(x1,y1+.08,x2,y2+.08,.5) : ln(x1+.08,y1,x2+.08,y2,.5));
  for(const d of DOORS[k]) s += doorSym(d,bg);
  for(const r of levelRooms(k)) s += cadLabel(r, staged);
  if(!staged && !opts.bare){
    const xs = GRID_X.map(g=>g[1]); const ext = k==='B' ? [1.5,...xs] : xs;
    s += dimChain(ext,1.35,true,{size:.36}) ;
    const ys = GRID_Y.map(g=>g[1]).filter(y=>y<=maxY); s += dimChain(ys,48.3,false,{off:-.5,size:.36}) + dim(49.6,ys[0],49.6,ys[ys.length-1],Math.round((ys[ys.length-1]-ys[0])*1000).toLocaleString('en-US').replace(/,/g,' '),{off:-.5,size:.36});
  }
  if(opts.site) s += dim(0,-1.7,50,-1.7,'50.00 m',{size:.62,off:.55}) + dim(-1.7,0,-1.7,60,'60.00 m',{size:.62,off:.7}) + north(52.4,1.6,1.1) + scaleBar(29,61.6,20,5,.55);
  if(!opts.bare) s += north(51.6,6) + scaleBar(0,49.5,10,1,.34);
  if(!opts.bare) s += tx(53.8,49.9,`${L.sheet}${staged?'S':''} · ${L.name.toUpperCase()} · FFL ${zl(L.ffl)} · ${staged?'STAGED PLAN':'FLOOR PLAN'} · 1:200`,{size:.42,a:'end',w:500,cls:'m'});
  return s + '</svg>';
}
const planStaged = k => planCAD(k,true);

/* site context for the board plans: gravel, grass, forecourt, ramp, trees, perimeter wall and gates */
function siteContext(k, staged){
  let s='<g opacity="'+(k==='B'?.4:1)+'">';
  if(staged){
    s += '<rect x="0" y="0" width="50" height="60" fill="url(#fl-grav)"/><rect x=".3" y="57.6" width="49.4" height="2.1" fill="url(#fl-grass)"/><rect x=".3" y="26" width="7.7" height="16" fill="url(#fl-grass)"/>';
    s += '<rect x="1.5" y=".3" width="7.7" height="8" fill="url(#fl-deck)"/><rect x="9.2" y="1.5" width="21.3" height="7.5" fill="url(#fl-deck)"/><rect x="42.3" y="10" width="7.4" height="10" fill="url(#fl-deck)"/>';
    s += '<rect x="1.5" y="8" width="6" height="18" fill="#b8b6af"/>' + Array.from({length:17},(_,i)=>'<line x1="1.5" y1="'+(9+i)+'" x2="7.5" y2="'+(9+i)+'" stroke="#9d9b94" stroke-width=".05"/>').join('');
    if(k!=='G') s += '<rect x="16" y="19" width="18" height="27" fill="url(#fl-deck)"/><rect x="20" y="22" width="10" height="20" fill="url(#fl-water)"/>';
    if(k==='F') s += pg(LEVELS.G.outline,{f:'#b9bdbf',s:'#8d9194',sw:.5});
    s += '<rect x="17" y="3" width="13" height="7" fill="#2f3336" opacity=".18"/>';
    for(const c of FORECOURT_CARS) s += symbol(['car',...c],'staged');
  }
  s += '<rect x=".15" y=".15" width="49.7" height="59.7" fill="none" stroke="'+INK+'" stroke-width=".3"/>';
  s += '<rect x="1.8" y="-.1" width="7.4" height=".5" fill="'+(staged?'#5b6064':WHITE)+'"/><rect x="49.6" y="11.5" width=".5" height="4" fill="'+(staged?'#5b6064':WHITE)+'"/>';
  s += tx(5.5,-.6,'MAIN GATE',{size:.5,cls:'m'}) + tx(51.2,13.5,'SERVICE',{size:.42,cls:'m',rot:90});
  for(const [x,y] of TREES) s += staged ? '<circle cx="'+x+'" cy="'+y+'" r="1.65" fill="url(#fl-tree)" filter="url(#shd)"/>' : '<circle cx="'+x+'" cy="'+y+'" r="1.5" fill="none" stroke="'+INK+'" stroke-width=".5" '+NSS+'/>';
  return s + '</g>';
}
