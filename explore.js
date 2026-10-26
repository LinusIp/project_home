/* Hovli Explorer: a dusk exterior of the whole villa, and a furnished cutaway of each level,
   built from data.js / plan-data.js. Utility overlays, daylight tags, room focus and a cost calculator. */
(function(){
'use strict';
const T = THREE;
const $ = id => document.getElementById(id);
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const CX = 25, CY = 28;                                   // model-space centre of the house
const P = (x, h, y) => new T.Vector3(x - CX, h, y - CY);  // plan x/y + height → world
const CUT = 2.0, FULL = 3.15;                             // cutaway wall height · full storey wall height
const CUT_Y = {B:0, G:0, F:3.5};                          // where each cutaway sits (the basement is shown on its own)
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const lin = c => new T.Color(c).convertSRGBToLinear();
const std = (c, r = .8, m = 0) => new T.MeshStandardMaterial({color:lin(c), roughness:r, metalness:m});
const FLAT_ROOF = (typeof ROOF_STYLE === 'undefined' ? 'flat' : ROOF_STYLE) !== 'gable';

/* ---------- materials ---------- */
const L = HX_LOOK.materials(); HX_LOOK.TX.caustic.repeat.set(2.5, 5);
const DOT_TEX = HX_LOOK.TX.dot;
const M = {
  base:std(0x2c2823,.9), plinth:std(0x1d1a17,.8), cap:std(0xf1ede6,.9), conc:L.extConc, darkStone:L.darkStone, trav:L.travertine, slats:L.slats, wall:L.plaster,
  glass:L.glass, glassLit:L.glassLit, deck:L.pavers, grass:L.grass, gravel:L.gravel, tile:L.tile, water:L.water, fire:L.fire, gh:L.gh,
  blk:L.blackMatte, white:L.ceramic, stone:L.worktop, court:L.court, led:L.led, roof:L.extConc,
  world:Object.assign(L.grass.clone(), {color:lin(0x7c8866)}), road:std(0x1c1b1a,.95)
};
for(const [k, m] of Object.entries(M)) if(!m.name) m.name = k;
M.world.name = 'world';   // a clone of the lawn; the export leaves the landscape to Blender
HX_LOOK.MAT.grass.userData.tri &&(M.world.onBeforeCompile = L.grass.onBeforeCompile, M.world.customProgramCacheKey = L.grass.customProgramCacheKey, M.world.userData = {...L.grass.userData});

/* ---------- geometry helpers (add to the current group) ---------- */
let grp;
function box(x1,x2,y1,y2,z1,z2,mat){ if(x2-x1<=0||y2-y1<=0||z2-z1<=0) return;
  const m = new T.Mesh(new T.BoxGeometry(x2-x1, z2-z1, y2-y1), mat); m.position.copy(P((x1+x2)/2,(z1+z2)/2,(y1+y2)/2)); grp.add(m); return m; }
function slab(outline,z1,z2,mat,holes=[]){ const sh = new T.Shape(outline.map(([x,y]) => new T.Vector2(x-CX, -(y-CY))));
  for(const h of holes) sh.holes.push(new T.Path(h.map(([x,y]) => new T.Vector2(x-CX, -(y-CY)))));
  const g = new T.ExtrudeGeometry(sh, {depth:z2-z1, bevelEnabled:false}); g.rotateX(-Math.PI/2); g.translate(0,z1,0); const m = new T.Mesh(g, mat); grp.add(m); return m; }
const along = (h,c,a,b,z1,z2,t,mat) => h ? box(a,b,c-t/2,c+t/2,z1,z2,mat) : box(c-t/2,c+t/2,a,b,z1,z2,mat);
const inPoly = (x,y,pts) => { let c = false; for(let i=0,j=pts.length-1;i<pts.length;j=i++){ const [xi,yi]=pts[i],[xj,yj]=pts[j]; if(((yi>y)!==(yj>y)) && x<(xj-xi)*(y-yi)/(yj-yi)+xi) c=!c; } return c; };
/* a slab band projecting outward from every edge of an outline (roof and floor overhangs) with an LED line under its lip */
function overhang(O, d, z1, z2, mat, led){
  for(let i=0;i<O.length;i++){ const a = O[i], b = O[(i+1)%O.length], hz = a[1]===b[1];
    const mx = (a[0]+b[0])/2, my = (a[1]+b[1])/2; let n = hz ? [0, 1] : [1, 0]; if(inPoly(mx+n[0]*.1, my+n[1]*.1, O)) n = [-n[0], -n[1]];
    if(hz){ const x1 = Math.min(a[0],b[0])-d, x2 = Math.max(a[0],b[0])+d, y1 = n[1]>0 ? a[1] : a[1]-d, y2 = n[1]>0 ? a[1]+d : a[1]; box(x1,x2,y1,y2,z1,z2,mat);
      if(led){ const yy = n[1]>0 ? y2-.12 : y1+.04; box(x1+.1,x2-.1,yy,yy+.08,z1-.025,z1,M.led); } }
    else { const y1 = Math.min(a[1],b[1])-d, y2 = Math.max(a[1],b[1])+d, x1 = n[0]>0 ? a[0] : a[0]-d, x2 = n[0]>0 ? a[0]+d : a[0]; box(x1,x2,y1,y2,z1,z2,mat);
      if(led){ const xx = n[0]>0 ? x2-.12 : x1+.04; box(xx,xx+.08,y1+.1,y2-.1,z1-.025,z1,M.led); } } } }

/* walls with door and window openings (same logic as the drawings). top = CUT for cutaways, FULL for the closed house.
   Exterior walls are cladding outside and plaster inside; cutaways get a pale cap on every cut wall, like a section. */
const RUNS = {}; const runsOf = k => RUNS[k] || (RUNS[k] = wallRuns(k));
function onOutline(k, r){ const O = LEVELS[k].outline;
  return O.some((a,i) => { const b = O[(i+1)%O.length]; const hz = a[1]===b[1]; if(hz!==r.h) return false;
    const c = hz?a[1]:a[0]; if(Math.abs(c-r.c)>1e-6) return false; const lo=Math.min(hz?a[0]:a[1],hz?b[0]:b[1]), hi=Math.max(hz?a[0]:a[1],hz?b[0]:b[1]); return r.a<hi-1e-6 && r.b>lo+1e-6; }); }
function walls(k, {top, ext, glass, mullions, cap}){
  const O = LEVELS[k].outline;
  const ops = [];
  for(const [[x1,y1],[x2,y2]] of GLAZING[k]){ const h=y1===y2; ops.push({h,c:h?y1:x1,a:Math.min(h?x1:y1,h?x2:y2),b:Math.max(h?x1:y1,h?x2:y2),z1:0,z2:top,glass:1}); }
  for(const [[x1,y1],[x2,y2],s,hd] of WINDOWS[k]){ const h=y1===y2; ops.push({h,c:h?y1:x1,a:Math.min(h?x1:y1,h?x2:y2),b:Math.max(h?x1:y1,h?x2:y2),z1:Math.min(s,top),z2:Math.min(hd,top),glass:1}); }
  for(const [x,y,ax,w,type] of DOORS[k]){ const h=ax==='h'; ops.push({h,c:h?y:x,a:h?x:y,b:(h?x:y)+w,z1:0,z2:Math.min(top, type==='piv' ? 3.0 : 2.4),door:type}); }
  for(const r of runsOf(k)){ const isExt = onOutline(k, r), t = isExt?.3:.14;
    const mid = (r.a+r.b)/2, out = isExt && (r.h ? inPoly(mid, r.c+.2, O) : inPoly(r.c+.2, mid, O)) ? -1 : 1;
    const W = (a,b,z1,z2) => { if(z2-z1 <= .001) return; const ea = Math.abs(a-r.a)<1e-6 ? t/2 : 0, eb = Math.abs(b-r.b)<1e-6 ? t/2 : 0;
      if(isExt){ along(r.h,r.c+out*.1,a-ea,b+eb,z1,z2,.1,ext); along(r.h,r.c-out*.05,a,b,z1,z2,.2,M.wall); } else along(r.h,r.c,a,b,z1,z2,t,M.wall);
      if(cap && z2>=top-1e-6) along(r.h,r.c,a-ea,b+eb,top,top+.012,t+.004,M.cap); };
    const mine = ops.filter(p => p.h===r.h && Math.abs(p.c-r.c)<1e-6 && p.b>r.a+1e-6 && p.a<r.b-1e-6);
    for(const [a,b] of subIv([[r.a,r.b]], mine.map(p=>[p.a,p.b]))) W(a,b,0,top);
    for(const p of mine){ const a=Math.max(p.a,r.a), b=Math.min(p.b,r.b);
      if(p.z1>.01) W(a,b,0,p.z1); if(p.z2<top-.01) W(a,b,p.z2,top);
      if(p.glass && p.z2>p.z1){ along(r.h,r.c,a,b,p.z1,p.z2,.03,glass); if(cap && p.z2>=top-.01) along(r.h,r.c,a,b,top-.03,top+.006,.07,M.blk);
        if(mullions){ const n = Math.max(1, Math.round((b-a)/2.4)); for(let i=0;i<=n;i++){ const q = a+(b-a)*i/n; along(r.h,r.c,q-.035,q+.035,p.z1,p.z2,.09,M.blk); } along(r.h,r.c,a,b,p.z2-.06,p.z2,.09,M.blk); } }
      if(mullions && p.door==='piv') along(r.h,r.c,a,b,0,p.z2,.08,M.slats); } }
  for(const [[x1,y1],[x2,y2],t] of EXTRA_WALLS[k]||[]){ const h=y1===y2; along(h,h?y1:x1,h?x1:y1,h?x2:y2,0,top,t,M.wall); }
  for(const [[x1,y1],[x2,y2]] of BALUSTRADE[k]||[]){ const h=y1===y2; along(h,h?y1:x1,h?x1:y1,h?x2:y2,0,1.1,.03,M.glass); }
}
/* merge every static mesh in a group by material: a level becomes a few dozen draw calls */
function merge(g){
  g.updateMatrixWorld(true); const by = new Map();
  for(const m of g.children.slice()){ if(!m.isMesh || m.userData.keep) continue;
    let geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); m.updateMatrix(); geo.applyMatrix4(m.matrix); if(!geo.attributes.normal) geo.computeVertexNormals();
    (by.get(m.material) || by.set(m.material, []).get(m.material)).push(geo); g.remove(m); }
  for(const [mat, geos] of by){ let n = 0; for(const q of geos) n += q.attributes.position.count;
    const pos = new Float32Array(n*3), nor = new Float32Array(n*3); let o = 0;
    for(const q of geos){ pos.set(q.attributes.position.array, o*3); nor.set(q.attributes.normal.array, o*3); o += q.attributes.position.count; q.dispose(); }
    const bg = new T.BufferGeometry(); bg.setAttribute('position', new T.BufferAttribute(pos,3)); bg.setAttribute('normal', new T.BufferAttribute(nor,3)); bg.computeBoundingSphere();
    const mm = new T.Mesh(bg, mat); mm.castShadow = !mat.transparent && mat !== M.fire && mat !== M.led; mm.receiveShadow = true; g.add(mm); }
}
const mainRect = r => r.r.reduce((a,b) => b[2]*b[3] > a[2]*a[3] ? b : a);
const centre = r => { const [x,y,w,h] = mainRect(r); return r.l ? {x:r.l[0], y:r.l[1]} : {x:x+w/2, y:y+h/2}; };
function lightPoints(r){ const [x,y,w,h] = mainRect(r); const nx = Math.max(1, Math.round(w/3.2)), ny = Math.max(1, Math.round(h/3.2)); const out = [];
  for(let i=0;i<nx;i++) for(let j=0;j<ny;j++) out.push({x:x+w*(i+.5)/nx, y:y+h*(j+.5)/ny}); return out.slice(0, 8); }
/* furniture builders know the level being built, so a piece can face into its room and pick its finish */
let LEVEL = null, POOLS = [];
const roomAt = (x, y) => LEVEL ? levelRooms(LEVEL).find(r => r.r.some(([rx,ry,rw,rh]) => x>rx-1e-6 && x<rx+rw+1e-6 && y>ry-1e-6 && y<ry+rh+1e-6)) || null : null;
/* the inner face of a bed's head wall, or null when that stretch has a door, window or glass (no art there) */
function headWall(k, x, y, w, d, hd, a, b, z1, z2){ const cx = x+w/2, cy = y+d/2, r = roomAt(cx, cy); if(!r) return null;
  const q = r.r.find(([rx,ry,rw,rh]) => cx>=rx && cx<=rx+rw && cy>=ry && cy<=ry+rh) || r.r[0], h = hd==='N' || hd==='S';
  const c = hd==='N' ? q[1] : hd==='S' ? q[1]+q[3] : hd==='W' ? q[0] : q[0]+q[2], same = v => Math.abs(v-c) < 1e-6, hits = (s,e) => s < b+.1 && e > a-.1;
  const run = runsOf(k).find(u => u.h===h && same(u.c) && u.a<=a+1e-6 && u.b>=b-1e-6); if(!run) return null;
  for(const [[x1,y1],[x2,y2]] of GLAZING[k]) if((y1===y2)===h && same(h?y1:x1) && hits(Math.min(h?x1:y1,h?x2:y2), Math.max(h?x1:y1,h?x2:y2))) return null;
  for(const [[x1,y1],[x2,y2],sill,head] of WINDOWS[k]) if((y1===y2)===h && same(h?y1:x1) && hits(Math.min(h?x1:y1,h?x2:y2), Math.max(h?x1:y1,h?x2:y2)) && sill<z2 && head>z1) return null;
  for(const [dx,dy,ax,dw] of DOORS[k]) if((ax==='h')===h && same(h?dy:dx) && hits(h?dx:dy, (h?dx:dy)+dw)) return null;
  const t = onOutline(k, run) ? .15 : .07; return hd==='N' || hd==='W' ? c+t : c-t; }
const FCTX = {P, add:m => grp.add(m), roomAt, headWall, pool:(x,y,r,i,z=.045,c) => POOLS.push([x,y,r,i,z,c])};
const furnCut = HX_LOOK.makeFurniture({...FCTX, CUT});
const furnFull = HX_LOOK.makeFurniture({...FCTX, CUT:FULL - .05});
function roomLights(root, k, n, h, intensity){ for(const r of levelRooms(k).filter(r => r.k!=='core' && r.k!=='circ').sort((a,b) => area(b)-area(a)).slice(0,n)){ const c = centre(r); const l = new T.PointLight(0xffc48a, intensity, 11, 2); l.position.copy(P(c.x,h,c.y)); root.add(l); } }
/* recessed downlights: a soft pool of warm light on the floor every couple of metres */
function downlights(k){ for(const r of levelRooms(k)){ if(r.k==='core') continue; const sp = r.k==='circ' ? 2.8 : 2.3, I = r.k==='circ' ? .07 : ['plant','garage','service'].includes(r.k) ? .06 : .1;
  for(const [x,y,w,h] of r.r){ const nx = Math.max(1, Math.round(w/sp)), ny = Math.max(1, Math.round(h/sp)), rad = Math.min(1.3, Math.min(w/nx, h/ny)*.55);
    for(let i=0;i<nx;i++) for(let j=0;j<ny;j++) POOLS.push([x+w*(i+.5)/nx, y+h*(j+.5)/ny, rad, I, .045]); } } }
const VOID = [[16,10],[25,10],[25,14],[16,14]];
const COURT = [[8,10],[42,10],[42,42],[34,42],[34,46],[8,46]], POOL_HOLE = [[19.8,21.8],[30.2,21.8],[30.2,42.2],[19.8,42.2]];
/* 3D-only dressing the plans leave out: feature walls, lamps, pendants, art, cinema risers, a tool wall */
const DRESS = {
  G: [['monolith',24.5,14.95,.45,3.0,'W'], ['arc',17.75,15.25,19.05,16.25], ['pendants',32.1,34.8,13.35,3,1.6], ['pendBar',36.4,39.6,21.95,1.7],
      ['art','N',37.1,39.3,19.07,1.0,1.75,2], ['floorLamp',40.5,26.25]],
  B: [['riser',12.25,15,11.4,16.8,.18], ['riser',13.65,15,11.4,16.8,.36], ['slats','N',9,14.8,10.15,.1,1.95], ['peg','N',36.0,41.2,19.07,1.0,1.9]],
  F: [['monolith',26.5,14.25,.45,3.0,'W'], ['arc',17.25,14.75,18.5,15.8], ['floorLamp',41.15,23.35]]
};
const riserAt = (k, it) => (DRESS[k] || []).filter(d => d[0]==='riser' && it[1]>=d[1]-1e-6 && it[1]<d[2] && it[2]>=d[3] && it[2]<d[4]).reduce((m,d) => Math.max(m, d[5]), 0);
function finish(root){ merge(grp); const pm = HX_LOOK.poolMesh(POOLS, P); if(pm) root.add(pm); POOLS = []; LEVEL = null; }

/* ---------- cutaway of one level (pickable floors), floating on its own plinth like a model ---------- */
const CUTL = {};
function buildCut(k){
  const root = new T.Group(); grp = new T.Group(); root.add(grp); root.position.y = CUT_Y[k]; LEVEL = k; POOLS = [];
  slab(k==='G' ? COURT : LEVELS[k].outline, -.9, -.02, M.plinth, k==='F' ? [VOID] : k==='G' ? [POOL_HOLE] : []);
  walls(k, {top:CUT, ext:k==='F' ? M.trav : k==='G' ? M.darkStone : M.conc, glass:M.glass, cap:true});
  for(const it of FURN[k]) furnCut(it, .02 + riserAt(k, it));
  furnCut.dress(k, .02, DRESS[k]);
  if(k==='G'){ for(let i=0;i<19;i++){ const x = 19.5+i*.29, z = (i+1)*.184; if(z < CUT) box(x,x+.29,12.6,14,z-.06,z,M.stone); }
    courtyard(root); }
  if(k==='F'){ box(31,34,37,46,-.25,0,M.deck); box(31,31.03,37,46,0,1.1,M.glass); box(31,34,45.97,46,0,1.1,M.glass); }
  downlights(k); finish(root);
  const floors = [];
  for(const r of levelRooms(k)){ const mat = HX_LOOK.floorMat(r.k, r.n); mat.emissive = new T.Color(0xfff6e8); mat.emissiveIntensity = 0;
    for(const [x,y,w,h] of r.r){ const m = new T.Mesh(new T.BoxGeometry(w,.02,h), mat); m.position.copy(P(x+w/2,.01,y+h/2)); m.receiveShadow = true; m.userData.room = r; root.add(m); floors.push(m); } }
  roomLights(root, k, 10, 1.9, 1.0);
  CUTL[k] = {root, floors, util:{}}; root.visible = false; scene.add(root); return CUTL[k];
}
/* the pool court inside the U belongs to the 1st floor: deck, pool, loungers and the fire trough */
function courtyard(root){
  for(const e of EXTERNAL.filter(e => e.id==='X.02' || e.id==='X.03')) for(const [x,y,w,h] of e.r) box(x,x+w,y,y+h,-.06,0,M.deck);
  box(20,30,22,42,-.86,-.82,M.tile); for(const [a,b,c,d] of [[19.8,20,21.8,42.2],[30,30.2,21.8,42.2],[20,30,21.8,22],[20,30,42,42.2]]) box(a,b,c,d,-.86,-.02,M.tile);
  for(const [a,b,c,d] of [[19.55,20,21.55,42.45],[30,30.45,21.55,42.45],[19.55,30.45,21.55,22],[19.55,30.45,42,42.45]]) box(a,b,c,d,-.02,.02,M.stone);
  const lv = LEVEL; LEVEL = null; for(const it of FURN.DECK) furnCut(it, 0); LEVEL = lv;
  const water = new T.Mesh(new T.BoxGeometry(10,.05,20), M.water); water.position.copy(P(25,-.12,32)); root.add(water);
  const pl = new T.PointLight(0x7fd0dc, 1.2, 14, 2); pl.position.copy(P(25,-.6,32)); root.add(pl);
}

/* ---------- the closed house: full-height storeys with lit interiors ---------- */
const FULLL = {};
function buildFull(k){
  const root = new T.Group(); grp = new T.Group(); root.add(grp); root.position.y = k==='F' ? 3.5 : 0; LEVEL = k; POOLS = [];
  if(k==='G') slab(LEVELS.G.outline, -.45, -.02, M.base);
  walls(k, {top:FULL, ext:k==='F' ? M.trav : M.darkStone, glass:M.glassLit, mullions:true});
  for(const it of FURN[k]) furnFull(it, .02 + riserAt(k, it));
  furnFull.dress(k, .02, DRESS[k]);
  for(const r of levelRooms(k)) for(const [x,y,w,h] of r.r) box(x,x+w,y,y+h,0,.02,HX_LOOK.floorMat(r.k, r.n));
  if(k==='G'){ for(let i=0;i<19;i++){ const x = 19.5+i*.29, z = (i+1)*.184; box(x,x+.29,12.6,14,z-.06,z,M.stone); }
    slab(LEVELS.G.outline, FULL, 3.5, M.roof, [VOID]); overhang(LEVELS.G.outline, .9, 3.22, 3.5, M.roof, true);
    for(const [a,b,c,d] of [[16.4,33.6,19.2,19.3],[16.2,16.3,24.4,45.6]]) box(a,b,c,d,3.06,3.1,M.led); }
  if(k==='F'){ box(31,34,37,46,-.25,0,M.deck); box(31,31.03,37,46,0,1.1,M.glass); box(31,34,45.97,46,0,1.1,M.glass); }
  downlights(k); finish(root);
  roomLights(root, k, 7, 2.6, 1.15);
  FULLL[k] = {root}; root.visible = false; scene.add(root); return FULLL[k];
}
function buildRoof(){
  const root = new T.Group(); grp = new T.Group(); root.add(grp);
  if(FLAT_ROOF){ slab(LEVELS.F.outline, 6.65, 7.05, M.roof); overhang(LEVELS.F.outline, 1.2, 6.78, 7.05, M.roof, true);
    for(const [x,y,w,d] of [[18,11,5,1.6],[35.5,12,3,2],[10,28,2.6,4],[36,30,2.6,4]]){ box(x,x+w,y,y+d,7.05,7.3,M.glassLit); box(x-.1,x+w+.1,y-.1,y+d+.1,7.05,7.12,M.blk); }
    box(27.2,30.3,10.2,15.3,7.05,8.1,M.trav); }
  else { for(const rf of ROOFS){ const v = [], Q = (x,z,y) => P(x,z,y).toArray(); const tri = (a,b,c) => v.push(...a,...b,...c), quad = (a,b,c,d) => { tri(a,b,c); tri(a,c,d); };
      let A0,B0,C0,A1,B1,C1; const e = EAVE, rg = rf.ridge;
      if(rf.axis==='x'){ const ym=(rf.y1+rf.y2)/2; A0=Q(rf.x1,e,rf.y1);B0=Q(rf.x1,e,rf.y2);C0=Q(rf.x1,rg,ym);A1=Q(rf.x2,e,rf.y1);B1=Q(rf.x2,e,rf.y2);C1=Q(rf.x2,rg,ym); }
      else { const xm=(rf.x1+rf.x2)/2; A0=Q(rf.x1,e,rf.y1);B0=Q(rf.x2,e,rf.y1);C0=Q(xm,rg,rf.y1);A1=Q(rf.x1,e,rf.y2);B1=Q(rf.x2,e,rf.y2);C1=Q(xm,rg,rf.y2); }
      tri(A0,C0,B0); tri(A1,B1,C1); quad(A0,A1,C1,C0); quad(B0,C0,C1,B1); quad(A0,B0,B1,A1);
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(v,3)); g.computeVertexNormals(); grp.add(new T.Mesh(g, M.blk)); }
    slab(LEVELS.F.outline, 6.65, 7.0, M.roof); }
  merge(grp); root.visible = false; scene.add(root); return root;
}

/* ---------- the site: pool court, garden, wall, lights and the landscape beyond ---------- */
function glowAt(x, y, h, size, mat=L.glow){ const s = new T.Sprite(mat); s.position.copy(P(x,h,y)); s.scale.set(size,size,1); grp.add(s); return s; }
function buildSite(){
  const root = new T.Group(); grp = new T.Group(); root.add(grp);
  const {x0, x1, y1} = PLOT;
  // ground inside the wall: lawn, with paved forecourt, service yard and pool deck flush with the floor
  for(const [a,b,c,d] of [[x0+.3,x1-.3,.3,21.55],[x0+.3,x1-.3,42.45,y1-.3],[x0+.3,19.55,21.55,42.45],[30.45,x1-.3,21.55,42.45]]) box(a,b,c,d,-.5,-.46,M.grass);   // open over the pool
  for(const [x,y,w,h] of [[1.5,.3,7.7,8],[9.2,1.5,21.3,7.5],[42.3,10,x1-.3-42.3,10]]) box(x,x+w,y,y+h,-.46,-.43,M.deck);
  for(const e of EXTERNAL.filter(e => e.id==='X.03' || e.id==='X.02')) for(const [x,y,w,h] of e.r) box(x,x+w,y,y+h,-.46,0,M.deck);
  box(20,30,22,42,-1.5,-1.45,M.tile); for(const [a,b,c,d] of [[19.8,20,22,42],[30,30.2,22,42],[20,30,21.8,22],[20,30,42,42.2]]) box(a,b,c,d,-1.5,-.02,M.tile);
  for(const [a,b,c,d] of [[19.55,20,21.55,42.45],[30,30.45,21.55,42.45],[19.55,30.45,21.55,22],[19.55,30.45,42,42.45]]) box(a,b,c,d,-.02,.02,M.stone);
  for(const it of FURN.DECK) furnCut(it, 0);
  // garden
  const [lx,ly,lw,lh] = GARDEN.lawn, [cx,cy,cw,ch] = GARDEN.court, [hx,hy,hw,hh] = GARDEN.house, [px,py,pw,ph] = GARDEN.pit;
  box(cx,cx+cw,cy,cy+ch,-.46,-.43,M.court);
  for(const [a,b,c,d] of [[cx+.9,cx+.97,cy,cy+ch-1.2],[cx+cw-.97,cx+cw-.9,cy,cy+ch-1.2],[cx+cw/2-2.45,cx+cw/2+2.45,cy+ch-5.8,cy+ch-5.73],[cx,cx+cw,cy+ch-.07,cy+ch],[cx,cx+cw,cy,cy+.07]]) box(a,b,c,d,-.43,-.42,M.white);
  box(hx,hx+hw,hy,hy+hh,-.46,2.1,M.gh); for(let x=hx;x<=hx+hw+.01;x+=1) box(x-.04,x+.04,hy,hy+hh,-.46,2.1,M.blk); box(hx,hx+hw,hy,hy+hh,2.1,2.16,M.blk);
  box(px,px+pw,py,py+ph,-.9,-.86,M.deck);
  for(const [a,b,c,d] of [[px+.2,px+.8,py+.2,py+ph-.2],[px+pw-.8,px+pw-.2,py+.2,py+ph-.2],[px+.8,px+pw-.8,py+ph-.8,py+ph-.2]]) box(a,b,c,d,-.86,-.45,L.sofaLight);
  box(px+pw/2-1.1,px+pw/2+1.1,py+ph/2-.6,py+ph/2+.6,-.86,-.55,M.blk); box(px+pw/2-.9,px+pw/2+.9,py+ph/2-.4,py+ph/2+.4,-.55,-.5,M.fire);
  for(let y=46.8;y<58.6;y+=1.25) box(24.2,25.8,y,y+.6,-.46,-.42,M.deck);
  // perimeter wall in dark stone, gate, canopy, cars, trees
  for(const [a,b,c,d] of [[x0,1.8,0,.3],[9.2,x1,0,.3],[x0,x0+.3,0,y1],[x0,x1,y1-.3,y1],[x1-.3,x1,0,11.5],[x1-.3,x1,15.5,y1]]) box(a,b,c,d,-.5,PLOT.wallH-.5,M.darkStone);
  box(1.8,9.2,-.2,-.05,-.5,2.48,M.slats);
  box(17,30,3,10,3.35,3.6,M.blk); box(17.2,29.8,3.2,3.35,3.32,3.35,M.led); box(17.9,18.1,8.5,8.7,-.46,3.35,M.blk); box(28.9,29.1,8.5,8.7,-.46,3.35,M.blk);
  for(const c of FORECOURT_CARS) furnCut(['car',...c], -.46);
  for(const [x,y] of TREES) HX_LOOK.tree({P, add:m => grp.add(m)}, x, y, 1, -.5);
  // landscape beyond the wall: lawn fading into the dusk, a road and a ring of trees
  const w = new T.Mesh(new T.PlaneGeometry(1600,1600), M.world); w.rotation.x = -Math.PI/2; w.position.y = -.52; w.receiveShadow = false; w.userData.keep = 1; root.add(w);
  box(-80,130,-14,-6,-.515,-.5,M.road);
  for(let i=0;i<70;i++){ const a = i/70*Math.PI*2, r = 58+rnd()*40; HX_LOOK.tree({P, add:m => grp.add(m)}, 23+Math.cos(a)*r, 33+Math.sin(a)*r, 1.7+rnd()*1.2, -.5); }
  merge(grp);
  // garden lights: wall washers, path bollards, tree uplights, pool and fire
  for(let x=4;x<x1-1;x+=4.5){ glowAt(x, .9, .1, 1.1); glowAt(x, y1-.9, .1, 1.1); }
  for(let y=6;y<y1-1;y+=4.5){ glowAt(x0+.9, y, .1, 1.1); glowAt(x1-.9, y, .1, 1.1); }
  for(let y=47;y<59;y+=3){ for(const x of [23.4,26.6]){ box(x-.07,x+.07,y-.07,y+.07,-.46,.2,M.blk); glowAt(x, y, .12, .9); } }
  for(const [x,y] of TREES) glowAt(x, y, .2, 2.2);
  const poolL = new T.PointLight(0x5fd3e6, 2.2, 16, 2); poolL.position.copy(P(25,-.8,32)); root.add(poolL);
  const fireL = new T.PointLight(0xff8a3c, 2.4, 9, 2); fireL.position.copy(P(px+pw/2,.2,py+ph/2)); root.add(fireL);
  const water = new T.Mesh(new T.BoxGeometry(10,.05,20), M.water); water.position.copy(P(25,-.12,32)); root.add(water);
  return root;
}

/* ---------- utility overlays ---------- */
const tUniform = {value:0};
function flowMat(color, len){ return new T.ShaderMaterial({ transparent:true, depthTest:false, depthWrite:false,
  uniforms:{uTime:tUniform, uColor:{value:new T.Color(color)}, uLen:{value:len}},
  vertexShader:'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader:'uniform float uTime, uLen; uniform vec3 uColor; varying vec2 vUv; void main(){ float d = fract(vUv.x*uLen/1.3 - uTime*.8); float k = smoothstep(0.,.12,d)*(1.-smoothstep(.42,.56,d)); vec3 c = mix(uColor*uColor*.55, uColor*1.15, k); gl_FragColor = vec4(c, .85 + .15*k); }' }); }
function tube(pts, h, color){ const q = []; for(const p of pts){ const l = q[q.length-1]; if(!l || Math.hypot(l.x-p.x, l.y-p.y) > .05) q.push(p); }
  if(q.length < 2) return null; const path = new T.CurvePath(); for(let i=0;i<q.length-1;i++) path.add(new T.LineCurve3(P(q[i].x,h,q[i].y), P(q[i+1].x,h,q[i+1].y)));
  const len = path.getLength(); const m = new T.Mesh(new T.TubeGeometry(path, Math.max(12, Math.round(len*4)), .17, 8, false), flowMat(color, len)); m.renderOrder = 20; return m; }
function glowDot(x, y, h, color, size=.55){ const s = new T.Sprite(new T.SpriteMaterial({map:DOT_TEX, color, transparent:true, depthTest:false, depthWrite:false})); s.position.copy(P(x,h,y)); s.scale.set(size,size,1); s.renderOrder = 21; return s; }
const ROUTE = { B:{rx:30.3, ry:15.2, trunk:20, west:14.5, east:34.75}, G:{rx:30.3, ry:15.2, trunk:18.2, west:15.25, east:34.6}, F:{rx:30.3, ry:15.2, trunk:18.3, west:15.25, east:41.3} };
function route(k, c){ const R = ROUTE[k], S = {x:R.rx, y:R.ry};
  if(c.y < 19.5) return [S, {x:R.rx, y:R.trunk}, {x:c.x, y:R.trunk}, c];
  if(c.x < 20) return [S, {x:R.rx, y:R.trunk}, {x:R.west, y:R.trunk}, {x:R.west, y:c.y}, c];
  if(c.x > 30) return [S, {x:R.rx, y:R.trunk}, {x:R.east, y:R.trunk}, {x:R.east, y:c.y}, c];
  return [S, {x:R.rx, y:R.trunk}, {x:c.x, y:R.trunk}, c]; }
const COLORS = {water:0x5ad1ff, elec:0xffd36b, gas:0xff8a4c, ac:0x7cf0d0};
const isWater = r => r.k==='wet' || /Kitchen|Pantry|Laundry|Water Tank|Pool Plant/.test(r.n);
const isAC = r => ['live','sleep','staff'].includes(r.k) || /Server|Lab|Workshop|Office/.test(r.n);
const FIXTURES = ['wc','basin','vanity','shower','bath','wd'];
function buildUtility(k, u){
  const C = CUTL[k]; if(C.util[u]) return C.util[u];
  const g = new T.Group(), rooms = levelRooms(k), R = ROUTE[k]; let info = [];
  const fmt0 = v => Math.round(v).toLocaleString('en-US');
  if(u==='water'){ const t = rooms.filter(isWater);
    for(const r of t){ const c = centre(r); const m = tube(route(k,c), .25, COLORS.water); if(m) g.add(m); g.add(glowDot(c.x,c.y,.3,COLORS.water,.9)); }
    g.add(glowDot(R.rx,R.ry,.3,0xffffff,1.4));
    const fx = FURN[k].filter(i => FIXTURES.includes(i[0]) || (i[0]==='counter' && i[5]==='sink')).length;
    info = [['Wet rooms on this level', t.length], ['Plumbing fixtures', fx], ['Supply', k==='B' ? 'Two tanks + booster set, UV' : 'From the basement tanks via the core riser']]; }
  if(u==='elec'){ let pts = 0;
    for(const r of rooms){ if(r.k==='core') continue; const c = centre(r); const m = tube(route(k,c), 1.55, COLORS.elec); if(m) g.add(m);
      for(const p of lightPoints(r)){ g.add(glowDot(p.x,p.y,1.6,COLORS.elec,.75)); pts++; } }
    g.add(glowDot(R.rx,R.ry,1.6,0xffffff,1.4));
    info = [['Light points', pts], ['Room circuits', rooms.filter(r => r.k!=='core').length], ['Board', k==='B' ? 'Main LV + 250 kVA standby' : 'Floor sub-board in the core']]; }
  if(u==='ac'){ const t = rooms.filter(isAC); let a = 0;
    for(const r of t){ const c = centre(r); const m = tube(route(k,c), 1.75, COLORS.ac); if(m) g.add(m); a += area(r);
      const fc = new T.Mesh(new T.BoxGeometry(1.1,.18,.5), new T.MeshBasicMaterial({color:COLORS.ac, transparent:true, opacity:.85, depthTest:false})); fc.position.copy(P(c.x,1.75,c.y)); fc.renderOrder = 21; g.add(fc); }
    info = [['Fan-coil units', t.length], ['Conditioned area', fmt0(a) + ' m²'], ['Plant', 'Chilled water from the basement, 6/12 °C']]; }
  if(u==='gas'){
    if(k==='G'){ const meter = {x:PLOT.x1-.7, y:13.5}, trough = {x:25, y:44.7}, kitchen = {x:16.7, y:33};
      for(const pts of [[meter,{x:44.4,y:13.5},{x:44.4,y:44.7},trough], [trough,{x:16.7,y:44.7},kitchen]]){ const m = tube(pts,.3,COLORS.gas); if(m) g.add(m); }
      for(const p of [trough, kitchen]) g.add(glowDot(p.x,p.y,.35,COLORS.gas,1)); g.add(glowDot(meter.x,meter.y,.35,0xffffff,1.3));
      info = [['Gas points', 3], ['Serves', 'Fire trough, outdoor kitchen, fire pit'], ['Indoors', 'None: induction cooking, heat-pump hot water']]; }
    else info = [['Gas points', 0], ['Indoors', 'No gas on this level. Cooking is induction and hot water comes from heat pumps.']]; }
  C.util[u] = {group:g, info}; g.visible = false; C.root.add(g); return C.util[u];
}
function daylight(k, r){ let glazed = 0; const faces = new Set();
  for(const [x,y,w,h] of r.r){ const edges = [{h:true,c:y,a:x,b:x+w,f:'N'},{h:true,c:y+h,a:x,b:x+w,f:'S'},{h:false,c:x,a:y,b:y+h,f:'W'},{h:false,c:x+w,a:y,b:y+h,f:'E'}];
    const segs = [...GLAZING[k].map(([p,q]) => [p,q,3.1]), ...WINDOWS[k].map(([p,q,s,hd]) => [p,q,hd-s])];
    for(const e of edges) for(const [[x1,y1],[x2,y2],hgt] of segs){ const hz = y1===y2;
      if(hz!==e.h || Math.abs((hz?y1:x1)-e.c) > 1e-6) continue;
      const lo = Math.max(e.a, Math.min(hz?x1:y1, hz?x2:y2)), hi = Math.min(e.b, Math.max(hz?x1:y1, hz?x2:y2));
      if(hi-lo > .05){ glazed += (hi-lo)*hgt; faces.add(e.f); } } }
  return {wfr: glazed/area(r)*100, faces}; }

/* ---------- renderer, scene, sky, camera ---------- */
const canvas = $('c');
const renderer = new T.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputEncoding = T.sRGBEncoding;
renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
const scene = new T.Scene();
const skyMat = new T.ShaderMaterial({side:T.BackSide, depthWrite:false, fog:false,
  vertexShader:'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader:'varying vec3 vD; void main(){ float h = vD.y; vec3 hor = vec3(1.0,.52,.26), mid = vec3(.36,.27,.26), top = vec3(.07,.07,.085), low = vec3(.06,.05,.045);'
   + ' vec3 c = mix(hor, mid, smoothstep(.0,.16,h)); c = mix(c, top, smoothstep(.16,.62,h)); c = mix(c, low, smoothstep(.0,-.06,h)); gl_FragColor = vec4(c,1.); }'});
const sky = new T.Mesh(new T.SphereGeometry(700,48,24), skyMat); scene.add(sky);
scene.fog = new T.Fog(0x4d3c30, 240, 900);
/* two looks: the dusk sky outside, and a studio for the cutaways (soft room reflections on a dark backdrop) */
const ENV = {};
{ const pm = new T.PMREMGenerator(renderer), es = new T.Scene(); es.add(new T.Mesh(sky.geometry, skyMat)); ENV.dusk = pm.fromScene(es, .03).texture;
  ENV.studio = pm.fromScene(studioRoom(), .04).texture; pm.dispose(); scene.environment = ENV.dusk; }
/* a dim room with a warm softbox overhead and two side panels: soft reflections without washing the model out */
function studioRoom(){ const s = new T.Scene(), basic = c => new T.MeshBasicMaterial({color:c, side:T.DoubleSide});
  const room = new T.Mesh(new T.BoxGeometry(24, 12, 24), new T.MeshBasicMaterial({color:new T.Color(.06,.052,.045), side:T.BackSide})); room.position.y = 5; s.add(room);
  const panel = (w, h, c, pos, rot) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), basic(c)); m.position.set(...pos); m.rotation.set(...rot); s.add(m); };
  panel(10, 10, new T.Color(1.5,1.32,1.12), [0, 10.9, 0], [Math.PI/2, 0, 0]);
  panel(8, 4, new T.Color(.9,.68,.45), [-11.9, 5, 2], [0, Math.PI/2, 0]);
  panel(8, 4, new T.Color(.32,.32,.34), [11.9, 5, -3], [0, -Math.PI/2, 0]);
  return s; }
const BACKDROP = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
  const g = x.createRadialGradient(215, 230, 0, 256, 256, 420); g.addColorStop(0, '#5a4f45'); g.addColorStop(.55, '#2c2621'); g.addColorStop(1, '#0f0d0b');
  x.fillStyle = g; x.fillRect(0, 0, 512, 512); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t; })();
const hemi = new T.HemisphereLight(0x9a8f86, 0x2a2219, .42); scene.add(hemi);
const sun = new T.DirectionalLight(0xffa565, 1); sun.castShadow = true;
Object.assign(sun.shadow.camera, {left:-48, right:48, top:48, bottom:-48, near:1, far:260}); sun.shadow.mapSize.set(4096,4096); sun.shadow.bias = -.0004; sun.shadow.normalBias = .03;
scene.add(sun, sun.target);
const SUN = { dusk:{p:P(-55,40,62), c:0xffa766, i:1.15, hi:.6}, studio:{p:P(0,75,64), c:0xffe9d2, i:.9, hc:0xf0e6da, hg:0x2e2620, hi:.25},
  morning:{p:P(80,40,46), c:0xfff0dc, i:1.7}, afternoon:{p:P(-36,36,52), c:0xffe0b8, i:1.6} };
function setSun(k){ const s = SUN[k]; sun.position.copy(s.p); sun.color.set(s.c); sun.intensity = s.i;
  hemi.color.set(s.hc || 0x9a8f86); hemi.groundColor.set(s.hg || 0x2a2219); hemi.intensity = s.hi || .75; }
setSun('dusk');
const CUT_EXPOSURE = .95;
const camera = new T.PerspectiveCamera(32, 1, .5, 1600);
const controls = new T.OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = .08; controls.maxPolarAngle = 1.53; controls.minDistance = 6; controls.maxDistance = 300; controls.screenSpacePanning = true;

const PANEL = 360;
let FX = null;
function resize(){ const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w/h; if(FX) FX.setSize(w, h);
  if(innerWidth > 1000) camera.setViewOffset(w, h, PANEL/2, 0, w, h); else camera.setViewOffset(w, h, 0, Math.round(h*.19), w, h);
  camera.updateProjectionMatrix(); }
addEventListener('resize', resize);

/* camera flights in spherical coordinates around a target */
let flight = null;
function frameRadius(span){ const vfov = camera.fov*Math.PI/180, w = canvas.clientWidth, free = innerWidth > 1000 ? (w-PANEL)/w : 1, hfov = 2*Math.atan(Math.tan(vfov/2)*camera.aspect*free); return span/2/Math.tan(Math.min(vfov, hfov)/2)*1.1; }
function flyTo({target, radius, phi, theta}, dur=1.5){
  const from = new T.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
  let dTheta = theta - from.theta; dTheta = Math.atan2(Math.sin(dTheta), Math.cos(dTheta));
  flight = {t0:performance.now(), dur:REDUCE ? 1 : dur*1000, fromT:controls.target.clone(), toT:target.clone(), fr:from.radius, tr:radius, fp:from.phi, tp:Math.max(.001, phi), fth:from.theta, dth:dTheta};
  controls.autoRotate = false; }
function stepFlight(now){ if(!flight) return; const k = Math.min(1, (now-flight.t0)/flight.dur), e = k<.5 ? 4*k*k*k : 1-Math.pow(-2*k+2,3)/2;
  controls.target.lerpVectors(flight.fromT, flight.toT, e);
  const s = new T.Spherical(flight.fr+(flight.tr-flight.fr)*e, flight.fp+(flight.tp-flight.fp)*e, flight.fth+flight.dth*e);
  camera.position.copy(controls.target).add(new T.Vector3().setFromSpherical(s)); camera.lookAt(controls.target);
  if(k>=1) flight = null; }

/* ---------- state + views ---------- */
const state = {mode:'ext', ext:'aerial', level:'G', util:null, view:'d3', roomView:false, focus:null, hover:null, sunMode:'morning'};
let SITE = null, ROOF = null;
const LV_ORDER = ['B','G','F'], LEVEL_NAME = {B:'Basement', G:'1st floor', F:'2nd floor'};
const levelCentre = k => { const O = LEVELS[k].outline; const xs = O.map(p=>p[0]), ys = O.map(p=>p[1]); return {x:(Math.min(...xs)+Math.max(...xs))/2, y:(Math.min(...ys)+Math.max(...ys))/2, span:Math.max(Math.max(...xs)-Math.min(...xs), Math.max(...ys)-Math.min(...ys))}; };
const D3 = {phi:.82, theta:-.72};
function overview(dur){
  if(state.mode==='ext'){
    if(state.ext==='court') return flyTo({target:P(25,3.4,27), radius:31, phi:1.5, theta:.02}, dur);
    return flyTo({target:P(23.5,1.5,33), radius:frameRadius(PLOT.h*.92), phi:.98, theta:.6}, dur); }
  const c = levelCentre(state.level), top = state.view==='top';
  flyTo({target:P(c.x,CUT_Y[state.level],c.y), radius:frameRadius(c.span*(top ? 1.04 : 1.18)), phi:top ? .001 : D3.phi, theta:top ? 0 : D3.theta}, dur); }
function applyVisibility(){
  const ext = state.mode==='ext', k = state.level;
  SITE.visible = ext; FULLL.G.root.visible = ext; FULLL.F.root.visible = ext; ROOF.visible = ext;
  for(const key of Object.keys(CUTL)) CUTL[key].root.visible = !ext && key===k;
  sky.visible = ext; scene.background = ext ? null : BACKDROP; scene.environment = ext ? ENV.dusk : ENV.studio;
  scene.fog.near = ext ? 240 : 1e5; scene.fog.far = ext ? 900 : 2e5;
  setSun(ext ? 'dusk' : state.util==='daylight' ? state.sunMode : 'studio');
  document.querySelectorAll('.levels button').forEach(b => b.setAttribute('aria-pressed', String(!ext && b.dataset.l===k)));
  $('bExt').setAttribute('aria-pressed', String(ext && state.ext==='aerial')); $('bCourt').setAttribute('aria-pressed', String(ext && state.ext==='court'));
}
function showExterior(which){ state.mode = 'ext'; state.ext = which; state.focus = null; state.util = null; state.roomView = false; $('bRoom').setAttribute('aria-pressed','false');
  setHover(null); applyVisibility(); applyUtility(); renderRooms(); renderMini(); overview(1.8); }
function showLevel(k, fly=true){
  const entering = state.mode!=='cut' || state.level!==k; state.mode = 'cut'; state.level = k; state.focus = null;
  if(!CUTL[k]) buildCut(k);
  applyVisibility();
  if(entering && !REDUCE){ const r = CUTL[k].root; anims.push({obj:r, from:CUT_Y[k]+3, to:CUT_Y[k], dur:700}); r.position.y = CUT_Y[k]+3; }
  applyUtility(); renderRooms(); renderMini(); if(fly) overview(1.4);
}
const anims = [];
function stepAnims(now){ for(let i=anims.length-1;i>=0;i--){ const a = anims[i]; a.t0 = a.t0 || now; const k = Math.min(1,(now-a.t0)/a.dur), e = 1-Math.pow(1-k,3);
  a.obj.position.y = a.from + (a.to-a.from)*e; if(k>=1) anims.splice(i,1); } }

/* ---------- utilities UI ---------- */
function applyUtility(){
  const C = CUTL[state.level]; if(C) for(const key of Object.keys(C.util)) C.util[key].group.visible = false;
  document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.u===state.util)));
  let html = '';
  if(state.mode==='ext') html = `<div class="note">Dusk view of the whole villa. Choose a level or a utility to open the cutaway.</div>`;
  else if(state.util && state.util!=='daylight'){ const U = buildUtility(state.level, state.util); U.group.visible = true;
    html = U.info.map(([a,b]) => typeof b === 'number' || String(b).length < 26 ? `<div class="row"><span>${a}</span><b>${b}</b></div>` : `<div class="row"><span>${a}</span><div class="note">${b}</div></div>`).join(''); }
  else if(state.util==='daylight'){
    const rooms = levelRooms(state.level).filter(r => r.k!=='circ' && r.k!=='core').map(r => ({r, d:daylight(state.level, r)})).filter(o => o.d.wfr > .5);
    const avg = rooms.length ? rooms.reduce((s,o) => s+o.d.wfr, 0)/rooms.length : 0;
    html = rooms.length ? `<div class="row"><span>Rooms with glazing</span><b>${rooms.length}</b></div><div class="row"><span>Average glazing-to-floor ratio</span><b>${Math.round(avg)} %</b></div>
      <div class="switch" role="radiogroup" aria-label="Time of day"><label><input type="radio" name="sun" value="morning" ${state.sunMode==='morning'?'checked':''}> Morning · east sun</label><label><input type="radio" name="sun" value="afternoon" ${state.sunMode==='afternoon'?'checked':''}> Afternoon · west sun</label></div>`
      : `<div class="note">The basement has no windows. Staff rooms get daylight tubes; everything else is artificially lit.</div>`; }
  $('uInfo').innerHTML = html;
  $('uInfo').querySelectorAll('input[name=sun]').forEach(i => i.addEventListener('change', () => { state.sunMode = i.value; applyVisibility(); applyUtility(); }));
  if(state.mode==='cut') setSun(state.util==='daylight' ? state.sunMode : 'studio');
  if(FX && FX.tone) FX.tone.uniforms.exposure.value = state.mode!=='cut' ? 1 : state.util && state.util!=='daylight' ? .72 : CUT_EXPOSURE;
  buildTags();
}
document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
  state.util = state.util===b.dataset.u ? null : b.dataset.u;
  if(state.mode==='ext'){ const u = state.util; showLevel(state.level || 'G'); state.util = u; }
  applyUtility(); }));

/* ---------- room tags ---------- */
let tags = [];
const hoverTag = document.createElement('div'); hoverTag.className = 'tag hover'; hoverTag.style.opacity = 0; $('tags').appendChild(hoverTag);
function buildTags(){ tags.forEach(t => t.el.remove()); tags = [];
  if(state.mode!=='cut' || state.util!=='daylight') return;
  for(const r of levelRooms(state.level).filter(r => r.k!=='circ' && r.k!=='core').sort((a,b) => area(b)-area(a))){ const d = daylight(state.level, r); if(d.wfr < .5) continue;
    const lit = state.sunMode==='morning' ? (d.faces.has('E') || d.faces.has('S')) : (d.faces.has('W') || d.faces.has('S'));
    const el = document.createElement('div'); el.className = 'tag'; const c = centre(r);
    el.innerHTML = `<b>${r.n}</b><span class="${lit?'sun':'dim'}">${lit?'☀':'◐'}</span> <span>${Math.round(d.wfr)} % glass</span>`;
    $('tags').appendChild(el); tags.push({el, p:P(c.x,1.4,c.y), w:el.offsetWidth, h:el.offsetHeight}); } }
const v3 = new T.Vector3();
const cutY = () => CUTL[state.level] ? CUTL[state.level].root.position.y : 0;
function placeTag(el, p, w, h){ v3.copy(p); v3.y += cutY(); v3.project(camera);
  if(v3.z > 1){ el.style.opacity = 0; return; } el.style.transform = `translate(${(v3.x+1)/2*w}px,${(1-v3.y)/2*h - 18}px) translate(-50%,-100%)`; }

/* ---------- picking ---------- */
const ray = new T.Raycaster(), ndc = new T.Vector2(); let downAt = null;
function pick(e){ if(state.mode!=='cut' || !CUTL[state.level]) return null; const r = canvas.getBoundingClientRect(); ndc.set((e.clientX-r.left)/r.width*2-1, -(e.clientY-r.top)/r.height*2+1); ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(CUTL[state.level].floors, false)[0]; return hit ? hit.object.userData.room : null; }
function setHover(r){ if(state.hover===r && r!==null) return; const C = CUTL[state.level];
  if(C) for(const f of C.floors) f.material.emissiveIntensity = (f.userData.room===r || f.userData.room===state.focus) ? .16 : 0;
  state.hover = r; canvas.style.cursor = r ? 'pointer' : 'grab';
  if(r){ hoverTag.innerHTML = `<b>${r.n}</b><span>${fmt(area(r),1)} m²</span>`; hoverTag.style.opacity = 1; } else hoverTag.style.opacity = 0;
  document.querySelectorAll('.room').forEach(b => b.classList.toggle('on', b.dataset.id===(r||state.focus||{}).id)); renderMini(); }
canvas.addEventListener('pointermove', e => { if(e.buttons) return; const r = pick(e); if(r!==state.hover) setHover(r); });
canvas.addEventListener('pointerleave', () => setHover(null));
canvas.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; controls.autoRotate = false; idleT = performance.now(); flight = null; });
canvas.addEventListener('pointerup', e => { if(!downAt || Math.hypot(e.clientX-downAt[0], e.clientY-downAt[1]) > 5) return; const r = pick(e); if(r) focusRoom(r); else if(state.focus){ state.focus = null; setHover(null); overview(1.1); } });
function focusRoom(r, low=state.roomView){ if(state.mode!=='cut' || state.level!==r.lvl) showLevel(r.lvl, false);
  state.focus = r; const c = centre(r), [, , w, h] = mainRect(r), y = CUT_Y[r.lvl];
  flyTo({target:P(c.x,y+.6,c.y), radius:low ? Math.max(11, Math.max(w,h)*1.6) : Math.max(24, Math.max(w,h)*3.6), phi:low ? 1.12 : .85, theta:D3.theta + (low ? .35 : .1)}, 1.3);
  state.hover = undefined; setHover(r); state.hover = null; }

/* ---------- panel ---------- */
const PHOTO = {Kitchen:'img/kit-main.jpg', Living:'img/liv-main.jpg', 'Family Room':'img/liv-tv.jpg', Dining:'img/kit-dining.jpg', 'Master Bedroom':'img/bed-main.jpg', 'Walk-in Closet':'img/bed-closet.jpg',
  'Master Bathroom':'img/bed-vanity.jpg', Cinema:'img/cin-main.jpg', 'Engineering Workshop':'img/ws-main.jpg', 'Electronics Lab':'img/ws-test.jpg', 'Garage (4 Cars)':'img/ext-front.jpg', 'Pantry':'img/kit-pantry.jpg', 'Primary Bedroom':'img/bed-angle.jpg'};
function shapeIcon(r){ const xs = r.r.flatMap(([x,,w]) => [x,x+w]), ys = r.r.flatMap(([,y,,h]) => [y,y+h]); const x0 = Math.min(...xs), y0 = Math.min(...ys), s = Math.max(Math.max(...xs)-x0, Math.max(...ys)-y0);
  return `<svg viewBox="-1 -1 ${s+2} ${s+2}" aria-hidden="true">${r.r.map(([x,y,w,h]) => `<rect x="${x-x0}" y="${y-y0}" width="${w}" height="${h}" fill="rgba(255,248,235,.08)" stroke="#c9bfae" stroke-width="${s/22}"/>`).join('')}</svg>`; }
function renderRooms(){ const rooms = levelRooms(state.level).filter(r => r.k!=='core').slice().sort((a,b) => area(b)-area(a));
  $('roomsT').textContent = `${LEVEL_NAME[state.level]} · ${rooms.length} rooms · ${fmt(levelTotal(state.level),1)} m²`;
  $('rooms').innerHTML = rooms.map(r => `<button type="button" class="room" data-id="${r.id}"><span class="th">${PHOTO[r.n] ? `<img src="${PHOTO[r.n]}" alt="" loading="lazy">` : shapeIcon(r)}</span><span><b>${r.n}</b><span>${fmt(area(r),1)} m² · ${r.id}</span></span></button>`).join('');
  $('rooms').querySelectorAll('.room').forEach(b => b.addEventListener('click', () => focusRoom(ROOMS.find(r => r.id===b.dataset.id)))); }
function renderMini(){ const k = state.level, ext = state.mode==='ext';
  const O = ext ? [[PLOT.x0,0],[PLOT.x1,0],[PLOT.x1,PLOT.y1],[PLOT.x0,PLOT.y1]] : LEVELS[k].outline, xs = O.map(p=>p[0]), ys = O.map(p=>p[1]);
  const x0 = Math.min(...xs)-1, y0 = Math.min(...ys)-1, w = Math.max(...xs)-x0+1, h = Math.max(...ys)-y0+1, s = Math.max(w,h), hl = state.hover || state.focus;
  const rooms = ext ? `<polygon points="${LEVELS.G.outline.map(p => p.join(',')).join(' ')}" fill="rgba(201,165,116,.25)" stroke="#c9a574" stroke-width=".5"/><rect x="20" y="22" width="10" height="20" fill="rgba(120,200,215,.45)"/>`
    : levelRooms(k).map(r => r.r.map(([x,y,rw,rh]) => `<rect x="${x}" y="${y}" width="${rw}" height="${rh}" fill="${r===hl ? 'rgba(201,165,116,.6)' : 'none'}" stroke="rgba(255,248,235,.55)" stroke-width=".25"/>`).join('')).join('');
  $('mini').innerHTML = `<svg viewBox="${x0-(s-w)/2} ${y0-(s-h)/2} ${s} ${s}" aria-hidden="true">${rooms}<polygon points="${O.map(p => p.join(',')).join(' ')}" fill="none" stroke="#f2ece2" stroke-width=".6"/></svg>`;
  $('viewName').textContent = ext ? (state.ext==='court' ? 'Courtyard' : 'Exterior · dusk') : state.view==='top' ? 'Floor plan' : '3D cutaway'; }
$('mini').addEventListener('click', () => { if(state.mode==='ext'){ state.view = 'top'; showLevel('G'); return; } state.view = state.view==='top' ? 'd3' : 'top'; state.focus = null; renderMini(); overview(1.4); });
document.querySelectorAll('.levels button').forEach(b => b.addEventListener('click', () => { state.view = 'd3'; showLevel(b.dataset.l); }));
$('bExt').addEventListener('click', () => showExterior('aerial'));
$('bCourt').addEventListener('click', () => showExterior('court'));
$('bRoom').addEventListener('click', () => { state.roomView = !state.roomView; $('bRoom').setAttribute('aria-pressed', String(state.roomView));
  if(state.roomView){ const r = state.focus || levelRooms(state.level).filter(r => r.k!=='circ' && r.k!=='core').sort((a,b) => area(b)-area(a))[0]; focusRoom(r, true); }
  else { state.focus = null; setHover(null); overview(1.2); } });

/* gallery */
const GALLERY = [['img/ext-front.jpg','Front at dusk'],['img/ext-aerial.jpg','Aerial'],['img/ext-poolside.jpg','Pool side'],['img/ext-back.jpg','Garden facade'],['img/liv-main.jpg','Living room'],
  ['img/kit-main.jpg','Kitchen'],['img/bed-main.jpg','Bedroom suite'],['img/cin-main.jpg','Cinema'],['img/ws-main.jpg','Engineering lab'],['img/gar-main.jpg','Garden']];
let gi = 0; const lb = $('lightbox');
const showLB = i => { gi = (i+GALLERY.length)%GALLERY.length; $('lbImg').src = GALLERY[gi][0]; $('lbImg').alt = GALLERY[gi][1]; $('lbCap').textContent = `${GALLERY[gi][1]} · ${gi+1} / ${GALLERY.length}`; };
$('bGallery').addEventListener('click', () => { showLB(gi); lb.classList.add('on'); $('lbClose').focus(); });
$('lbPrev').addEventListener('click', () => showLB(gi-1)); $('lbNext').addEventListener('click', () => showLB(gi+1));
$('lbClose').addEventListener('click', () => { lb.classList.remove('on'); $('bGallery').focus(); });
addEventListener('keydown', e => { if(!lb.classList.contains('on')) return; if(e.key==='Escape') $('lbClose').click(); if(e.key==='ArrowLeft') showLB(gi-1); if(e.key==='ArrowRight') showLB(gi+1); });

/* figures + calculator */
const gfa = LV_ORDER.reduce((s,k) => s+levelTotal(k), 0);
let cells = 0; for(let x=PLOT.x0+.25;x<PLOT.x1;x+=.5) for(let y=.25;y<PLOT.y1;y+=.5) if(inPoly(x,y,LEVELS.G.outline)||inPoly(x,y,LEVELS.F.outline)) cells++;
const foot = cells*.25, open = PLOT.area - foot;
document.querySelectorAll('[data-plot]').forEach(e => e.textContent = plotDims());
$('sBeds').textContent = ROOMS.filter(r => /Bedroom/.test(r.n)).length;
$('sBaths').textContent = ROOMS.filter(r => /Bath|En-suite|WC/.test(r.n)).length;
$('sGfa').textContent = Math.round(gfa).toLocaleString('en-US');
$('cFoot').textContent = `Footprint ${Math.round(foot)} m²`;
for(const k of LV_ORDER) $('l'+k).textContent = `${fmt(levelTotal(k),0)} m²`;
$('fineAreas').textContent = `${Math.round(gfa).toLocaleString('en-US')} m² of floor and ${Math.round(open).toLocaleString('en-US')} m² of open land`;
const money = v => '$' + Math.round(v).toLocaleString('en-US');
function calc(){ const rate = +$('iRate').value, land = +$('iLand').value, down = +$('iDown').value, term = +$('iTerm').value, int = +$('iInt').value;
  for(const i of ['iRate','iLand','iDown','iTerm','iInt']){ const el = $(i); el.style.setProperty('--p', ((el.value-el.min)/(el.max-el.min)*100) + '%'); }
  const cost = gfa*rate + open*land, loan = cost*(1-down/100), r = int/1200, n = term*12, m = r ? loan*r/(1-Math.pow(1+r,-n)) : loan/n;
  $('oRate').textContent = `$${rate.toLocaleString('en-US')} / m²`; $('oLand').textContent = `$${land} / m²`; $('oDown').textContent = `${down} % · ${money(cost*down/100)}`;
  $('oTerm').textContent = `${term} yrs · ${int.toFixed(2)} %`; $('oCost').textContent = money(cost); $('oMonth').textContent = money(m); }
document.querySelectorAll('.calc input').forEach(i => i.addEventListener('input', calc)); calc();

/* ---------- loop ---------- */
let idleT = performance.now();
controls.addEventListener('start', () => { flight = null; controls.autoRotate = false; idleT = performance.now(); });
function frame(now){
  tUniform.value = now/1000; stepFlight(now); stepAnims(now);
  const canSpin = state.mode==='ext' ? state.ext==='aerial' : (state.view==='d3' && !state.focus);
  if(!flight && !REDUCE && canSpin && now-idleT > 14000){ controls.autoRotate = true; controls.autoRotateSpeed = .3; }
  controls.update(); HX_LOOK.TX.caustic.offset.set(now*.000012, now*.000007); FX.render();
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const boxes = []; for(const t of tags){ v3.copy(t.p); v3.y += cutY(); v3.project(camera);
    const x = (v3.x+1)/2*w - t.w/2, y = (1-v3.y)/2*h - 18 - t.h; let vis = v3.z <= 1;
    if(vis && boxes.some(b => x < b[2]+4 && x+t.w > b[0]-4 && y < b[3]+4 && y+t.h > b[1]-4)) vis = false;
    if(vis) boxes.push([x,y,x+t.w,y+t.h]); const o = vis ? '1' : '0'; if(t.el.style.opacity !== o) t.el.style.opacity = o;
    t.el.style.transform = 'translate(' + (x + t.w/2) + 'px,' + (y + t.h) + 'px) translate(-50%,-100%)'; }
  const hr = state.hover; if(hr){ const c = centre(hr); placeTag(hoverTag, P(c.x,1.2,c.y), w, h); }
  requestAnimationFrame(frame); }

/* ---------- start: build the exterior first, then the cutaways in the background ---------- */
resize();
FX = HX_LOOK.pipeline(renderer, scene, camera);
const steps = [() => { SITE = buildSite(); scene.add(SITE); }, () => buildFull('G'), () => buildFull('F'), () => { ROOF = buildRoof(); }];
function boot(i){ if(i < steps.length){ steps[i](); return setTimeout(() => boot(i+1), 0); }
  controls.target.copy(P(23.5,1.5,32));
  camera.position.copy(controls.target).add(new T.Vector3().setFromSpherical(new T.Spherical(frameRadius(PLOT.h)*1.5, .55, -.2)));
  applyVisibility(); renderRooms(); renderMini(); applyUtility();
  requestAnimationFrame(frame);
  setTimeout(() => { $('loader').classList.add('done'); overview(3); }, 200);
  setTimeout(() => { $('hint').style.opacity = 0; }, 8000);
  for(const [k, t] of [['G',1200],['F',2200],['B',3200]]) setTimeout(() => { if(!CUTL[k]) buildCut(k); }, t); }
/* the built model, for blender/gltf-export.js (explore.html?export writes the villa out for Blender) */
window.HX_EXPLORER = {scene, CUTL, FULLL, CUT_Y, buildCut, buildFull, get SITE(){ return SITE; }, get ROOF(){ return ROOF; }};
if(/[?&]export\b/.test(location.search)){ const s = document.createElement('script'); s.src = 'blender/gltf-export.js'; document.body.appendChild(s); }
boot(0);
})();
