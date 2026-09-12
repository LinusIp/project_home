/* One-off bake: builds the villa from the plan data and renders concept images + exploded axonometrics, uploaded as JPEGs to serve.js. */
(async function(){
const T = THREE, log = m => { document.getElementById('log').textContent += '\n' + m; };
const P = (x,h,y) => new T.Vector3(x-25, h, y-30);
let seed = 11; const rnd = () => ((seed = (seed*16807) % 2147483647) / 2147483647);
const std = (c,r=.8,m=0,e) => new T.MeshStandardMaterial({color:c, roughness:r, metalness:m, ...(e?{emissive:e.c, emissiveIntensity:e.i}:{})});
const M = {
  conc:std(0xb3b1aa,.9), blk:std(0x222427,.5,.4), floor:std(0xd6d2c8,.45), deck:std(0x9e9c96,.85), gravel:std(0x77766f,1), road:std(0x2a2c2e,.95),
  glass:new T.MeshStandardMaterial({color:0x1a2a30, roughness:.05, metalness:.8, transparent:true, opacity:.32, side:T.DoubleSide, depthWrite:false}),
  tile:std(0x0d3a44,.3,0,{c:0x0e5566,i:.6}), water:new T.MeshStandardMaterial({color:0x0a3440, roughness:.05, metalness:.85, transparent:true, opacity:.78}),
  led:new T.MeshBasicMaterial({color:0xffcf94}), fire:new T.MeshBasicMaterial({color:0xff9a4a}),
  leaf:new T.MeshStandardMaterial({color:0x61704f, roughness:1, flatShading:true}), bark:std(0x4a4036,1), grass:std(0x9c9563,1),
  white:std(0xf1efea,.9), fabric:std(0xa39c91,.95), wood:std(0x8b6a4b,.7), stone:std(0xdcd7cd,.4), smoke:std(0x2c3336,.3,.3), rug:std(0xbfb39c,1),
  plant:new T.MeshStandardMaterial({color:0x5d7a4a, roughness:1, flatShading:true}), carB:std(0x8d9296,.35,.6), fin:std(0xefefeb,.45,.15),
  roof:new T.MeshStandardMaterial({color:0x2b2e31, roughness:.5, metalness:.5, side:T.DoubleSide}), equip:std(0xa9aeb2,.6,.2),
  axoSlab:std(0xd9d9d5,1), axoWall:std(0xf2f2ef,1), axoHL:std(0x8fbfdc,.9), axoHLWall:std(0xbfdcee,.9), axoPool:std(0x7fb8cf,.6),
  axoRoof:new T.MeshStandardMaterial({color:0x55595d, roughness:.8, side:T.DoubleSide})
};
const mainGrp = new T.Group(); let grp = mainGrp;
const scene = new T.Scene(); scene.add(mainGrp);
function box(x1,x2,y1,y2,z1,z2,mat,cast=true){ if(x2-x1<=0||y2-y1<=0||z2-z1<=0) return; const m=new T.Mesh(new T.BoxGeometry(x2-x1,z2-z1,y2-y1),mat);
  m.position.copy(P((x1+x2)/2,(z1+z2)/2,(y1+y2)/2)); m.castShadow=cast && mat!==M.glass; m.receiveShadow=true; grp.add(m); return m; }
function slab(outline,z1,z2,mat,holes=[]){ const sh=new T.Shape(outline.map(([x,y])=>new T.Vector2(x-25,-(y-30))));
  for(const h of holes) sh.holes.push(new T.Path(h.map(([x,y])=>new T.Vector2(x-25,-(y-30)))));
  const g=new T.ExtrudeGeometry(sh,{depth:z2-z1,bevelEnabled:false}); g.rotateX(-Math.PI/2); g.translate(0,z1,0); const m=new T.Mesh(g,mat); m.castShadow=m.receiveShadow=true; grp.add(m); }
const along = (h,c,a,b,z1,z2,t,mat) => h ? box(a,b,c-t/2,c+t/2,z1,z2,mat) : box(c-t/2,c+t/2,a,b,z1,z2,mat);

/* walls from the CAD wall runs, with doors, glazing and windows cut in. o.z0 overrides the floor level, o.cut makes a cutaway */
function level(k, extMat, o={}){
  const z0 = o.z0 ?? LEVELS[k].ffl, top = z0 + (o.cut || 3.15), inner = o.inner || M.white, O = LEVELS[k].outline;
  const onOutline = r => O.some((a,i)=>{ const b=O[(i+1)%O.length]; const hz=a[1]===b[1]; if(hz!==r.h) return false;
    const c=hz?a[1]:a[0]; if(Math.abs(c-r.c)>1e-6) return false; const lo=Math.min(hz?a[0]:a[1],hz?b[0]:b[1]), hi=Math.max(hz?a[0]:a[1],hz?b[0]:b[1]); return r.a<hi-1e-6 && r.b>lo+1e-6; });
  const ops = [];
  for(const [[x1,y1],[x2,y2]] of GLAZING[k]){ const h=y1===y2; ops.push({h,c:h?y1:x1,a:Math.min(h?x1:y1,h?x2:y2),b:Math.max(h?x1:y1,h?x2:y2),z1:z0,z2:top,glass:1}); }
  for(const [[x1,y1],[x2,y2],s,hd] of WINDOWS[k]){ const h=y1===y2; ops.push({h,c:h?y1:x1,a:Math.min(h?x1:y1,h?x2:y2),b:Math.max(h?x1:y1,h?x2:y2),z1:Math.min(z0+s,top),z2:Math.min(z0+hd,top),glass:1}); }
  for(const [x,y,ax,w,type] of DOORS[k]){ const h=ax==='h'; ops.push({h,c:h?y:x,a:h?x:y,b:(h?x:y)+w,z1:z0,z2:Math.min(top,z0+(type==='piv'?3.0:2.5)),door:type}); }
  for(const r of wallRuns(k)){ const ext=onOutline(r), t=ext?.3:.15, mat=ext?extMat:inner;
    const mine = ops.filter(p=>p.h===r.h && Math.abs(p.c-r.c)<1e-6 && p.b>r.a+1e-6 && p.a<r.b-1e-6);
    for(const [a,b] of subIv([[r.a,r.b]], mine.map(p=>[p.a,p.b]))) along(r.h,r.c,a,b,z0,top,t,mat);
    for(const p of mine){ const a=Math.max(p.a,r.a), b=Math.min(p.b,r.b);
      if(p.z1>z0+.01) along(r.h,r.c,a,b,z0,p.z1,t,mat); if(p.z2<top-.01) along(r.h,r.c,a,b,p.z2,top,t,mat);
      if(p.glass && p.z2>p.z1) along(r.h,r.c,a,b,p.z1,p.z2,.03,M.glass);
      if(p.glass && !o.cut){ const n=Math.max(1,Math.round((b-a)/2.6)); for(let i=1;i<n;i++){ const q=a+(b-a)*i/n; along(r.h,r.c,q-.02,q+.02,p.z1,p.z2,.06,M.blk); } }
      if(!o.cut && (p.door==='piv' || (ext && p.door==='sw'))) along(r.h,r.c,a,b,p.z1,p.z2,.07,M.blk); } }
  for(const [[x1,y1],[x2,y2],t] of EXTRA_WALLS[k]||[]){ const h=y1===y2, feature=k==='G'&&t>.16&&!o.cut; along(h,h?y1:x1,h?x1:y1,h?x2:y2,z0,feature?z0+7:top,t,feature?M.conc:inner); }
  for(const [[x1,y1],[x2,y2]] of BALUSTRADE[k]||[]){ const h=y1===y2; along(h,h?y1:x1,h?x1:y1,h?x2:y2,z0,z0+1.1,.03,M.glass); }
}
function furn(it, z){ const t=it[0];
  const B=(x,y,w,d,h1,h2,m)=>box(x,x+w,y,y+d,z+h1,z+h2,m);
  switch(t){
    case 'bedK': case 'bedS': { const [,x,y,w,d,hd]=it; B(x,y,w,d,0,.3,M.wood); B(x+.05,y+.05,w-.1,d-.1,.3,.55,M.white);
      if(hd==='W') B(x-.02,y,.08,d,0,1.1,M.fabric); if(hd==='N') B(x,y-.02,w,.08,0,1.1,M.fabric); if(hd==='E') B(x+w-.06,y,.08,d,0,1.1,M.fabric);
      if(hd==='W') B(x+w*.62,y+.02,w*.3,d-.04,.55,.6,M.fabric); if(hd==='N') B(x+.02,y+d*.62,w-.04,d*.3,.55,.6,M.fabric); return; }
    case 'ns': B(it[1],it[2],.5,.45,0,.5,M.wood); return;
    case 'sofa': { const [,x,y,w,d,bk]=it; B(x,y,w,d,0,.42,M.fabric); const k=.22;
      if(bk==='N') B(x,y,w,k,.42,.8,M.fabric); if(bk==='S') B(x,y+d-k,w,k,.42,.8,M.fabric); if(bk==='W') B(x,y,k,d,.42,.8,M.fabric); if(bk==='E') B(x+w-k,y,k,d,.42,.8,M.fabric); return; }
    case 'armchair': B(it[1],it[2],.85,.85,0,.45,M.fabric); return;
    case 'chair': B(it[1],it[2],.5,.5,0,.46,M.blk); return;
    case 'seat': B(it[1],it[2],.95,.95,0,.6,M.fabric); return;
    case 'stool': { const m=new T.Mesh(new T.CylinderGeometry(.2,.2,.75,16),M.blk); m.position.copy(P(it[1],z+.375,it[2])); m.castShadow=true; grp.add(m); return; }
    case 'stable': { const m=new T.Mesh(new T.CylinderGeometry(it[3],it[3],.5,20),M.wood); m.position.copy(P(it[1],z+.25,it[2])); grp.add(m); return; }
    case 'filter': { const m=new T.Mesh(new T.CylinderGeometry(it[3],it[3],1.5,20),M.equip); m.position.copy(P(it[1],z+.75,it[2])); grp.add(m); return; }
    case 'ctable': B(it[1],it[2],it[3],it[4],0,.38,M.stone); return;
    case 'table': case 'dtable': { const [,x,y,w,d,n]=it; B(x,y,w,d,.72,.76,M.wood); B(x+w/2-.2,y+d/2-.2,.4,.4,0,.72,M.blk);
      if(t==='dtable'){ const side=Math.max(1,Math.floor((n-2)/2)); for(let i=0;i<side;i++){ const cx=x+w*(i+.5)/side-.23; B(cx,y-.58,.46,.46,0,.46,M.blk); B(cx,y+d+.12,.46,.46,0,.46,M.blk); } } return; }
    case 'desk': B(it[1],it[2],it[3],it[4],.72,.76,M.blk); B(it[1],it[2],.04,it[4],0,.72,M.blk); B(it[1]+it[3]-.04,it[2],.04,it[4],0,.72,M.blk); return;
    case 'rug': B(it[1],it[2],it[3],it[4],0,.012,M.rug); return;
    case 'wardrobe': B(it[1],it[2],it[3],it[4],0,2.6,M.smoke); return;
    case 'shelf': B(it[1],it[2],it[3],it[4],0,2.2,M.blk); return;
    case 'counter': B(it[1],it[2],it[3],it[4],0,it[5]==='tall'?2.7:.9,it[5]==='tall'?M.blk:M.stone); return;
    case 'counterOut': B(it[1],it[2],it[3],it[4],0,.92,M.blk); return;
    case 'island': B(it[1],it[2],it[3],it[4],0,.92,M.stone); return;
    case 'media': B(it[1],it[2],it[3],it[4],.3,1.7,M.blk); return;
    case 'bath': B(it[1],it[2],it[3],it[4],0,.55,M.white); return;
    case 'vanity': B(it[1],it[2],it[3],it[4],.5,.85,M.stone); return;
    case 'lounger': B(it[1],it[2],2,.72,0,.34,M.white); return;
    case 'bench': B(it[1],it[2],it[3],it[4],0,.42,M.conc); return;
    case 'fire': B(it[1],it[2],it[3],it[4],0,.07,M.fire); return;
    case 'equip': B(it[1],it[2],it[3],it[4],0,1.9,M.equip); return;
    case 'rack': B(it[1],it[2],it[3],it[4],0,2.0,M.blk); return;
    case 'treadmill': B(it[1],it[2],it[3],it[4],0,.35,M.blk); return;
    case 'screen': B(it[1],it[2],it[3],it[4],.4,2.8,M.white); return;
    case 'wd': B(it[1],it[2],.65,.6,0,.85,M.white); return;
    case 'car': { const [,x,y,w,d]=it; B(x,y,w,d,.15,.8,M.carB); if(w>d) B(x+1.2,y+.15,2.2,d-.3,.8,1.35,M.smoke); else B(x+.15,y+1.2,w-.3,2.2,.8,1.35,M.smoke); return; }
    case 'shower': B(it[1],it[2],it[3],it[4],0,.02,M.stone); return;
    case 'wc': B(it[1]-.2,it[2]-.3,.4,.6,0,.42,M.white); return;
    case 'planter': { const [,x,y,d]=it; const c=new T.Mesh(new T.CylinderGeometry(d/2,d/2*.85,.6,20),M.conc); c.position.copy(P(x,z+.3,y)); grp.add(c);
      const p=new T.Mesh(new T.IcosahedronGeometry(d*.7,1),M.plant); p.position.copy(P(x,z+1.2,y)); p.castShadow=true; grp.add(p); return; }
  }
}
function prism(axis,x1,x2,y1,y2,eave,ridge,mat){ const v=[], Q=(x,z,y)=>P(x,z,y).toArray(); const tri=(a,b,c)=>v.push(...a,...b,...c), quad=(a,b,c,d)=>{tri(a,b,c);tri(a,c,d);};
  let A0,B0,C0,A1,B1,C1;
  if(axis==='x'){ const ym=(y1+y2)/2; A0=Q(x1,eave,y1);B0=Q(x1,eave,y2);C0=Q(x1,ridge,ym);A1=Q(x2,eave,y1);B1=Q(x2,eave,y2);C1=Q(x2,ridge,ym); }
  else { const xm=(x1+x2)/2; A0=Q(x1,eave,y1);B0=Q(x2,eave,y1);C0=Q(xm,ridge,y1);A1=Q(x1,eave,y2);B1=Q(x2,eave,y2);C1=Q(xm,ridge,y2); }
  tri(A0,C0,B0); tri(A1,B1,C1); quad(A0,A1,C1,C0); quad(B0,C0,C1,B1); quad(A0,B0,B1,A1);
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(v,3)); g.computeVertexNormals(); const m=new T.Mesh(g,mat); m.castShadow=m.receiveShadow=true; grp.add(m); }
function fins(){ const O=LEVELS.F.outline, segs=[...GLAZING.F.map(g=>[g[0],g[1],3.52,6.65]), ...WINDOWS.F.map(w=>[w[0],w[1],3.5+w[2],3.5+w[3]])];
  for(let i=0;i<O.length;i++){ const a=O[i], b=O[(i+1)%O.length], hz=a[1]===b[1], n=[Math.sign(b[1]-a[1]), -Math.sign(b[0]-a[0])];
    const lo0=Math.min(hz?a[0]:a[1],hz?b[0]:b[1]), hi0=Math.max(hz?a[0]:a[1],hz?b[0]:b[1]);
    for(const [p,q,z1,z2] of segs){ if(hz ? !(p[1]===a[1]&&q[1]===a[1]) : !(p[0]===a[0]&&q[0]===a[0])) continue;
      const lo=Math.max(lo0,Math.min(hz?p[0]:p[1],hz?q[0]:q[1])), hi=Math.min(hi0,Math.max(hz?p[0]:p[1],hz?q[0]:q[1])); if(hi<=lo) continue;
      for(let t=lo+.15;t<hi;t+=.3){ if(hz){ const c=a[1]+n[1]*.3; box(t-.022,t+.022,c-.12,c+.12,z1,z2,M.fin); } else { const c=a[0]+n[0]*.3; box(c-.12,c+.12,t-.022,t+.022,z1,z2,M.fin); } } } } }
const tree=(x,y,s=1)=>{ const t=new T.Mesh(new T.CylinderGeometry(.12*s,.2*s,2.2*s,7),M.bark); t.position.copy(P(x,1.1*s,y)); t.castShadow=true; grp.add(t);
  const c=new T.Mesh(new T.IcosahedronGeometry(1.5*s,1),M.leaf); c.scale.set(1,.72,1); c.position.copy(P(x,2.9*s,y)); c.rotation.y=rnd()*6; c.castShadow=true; grp.add(c); };

/* ---------- main scene ---------- */
box(-90,140,-80,140,-.4,-.03,M.road,false);
for(const [a,b,c,d] of [[.3,49.7,.3,21.8],[.3,49.7,42.2,59.7],[.3,19.8,21.8,42.2],[30.2,49.7,21.8,42.2]]) box(a,b,c,d,-.4,0,M.gravel,false);
for(const [x,y,w,h] of [[1.5,.3,7.7,8],[9.2,1.5,21.3,7.5],[42.3,10,7.4,10]]) box(x,x+w,y,y+h,-.39,.004,M.deck,false);
for(const e of EXTERNAL.filter(e=>e.id==='X.03'||e.id==='X.02')) for(const [x,y,w,h] of e.r) box(x,x+w,y,y+h,-.39,.01,M.deck,false);
box(20,30,22,42,-1.55,-1.5,M.tile,false); for(const [a,b,c,d] of [[19.8,20,22,42],[30,30.2,22,42],[20,30,21.8,22],[20,30,42,42.2]]) box(a,b,c,d,-1.5,-.02,M.tile,false);
box(20,30,22,42,-.06,-.03,M.water,false);
for(const [a,b,c,d] of [[0,1.8,0,.3],[9.2,50,0,.3],[0,.3,0,60],[0,50,59.7,60],[49.7,50,0,11.5],[49.7,50,15.5,60]]) box(a,b,c,d,0,PLOT.wallH,M.conc);
box(1.8,9.2,-.2,-.05,0,2.98,M.blk); box(49.85,50.05,11.5,15.5,0,2.98,M.conc);
{ const ramp=new T.Mesh(new T.PlaneGeometry(6,18.4),M.conc); ramp.rotation.x=-Math.PI/2+Math.atan2(3.6,18); ramp.position.copy(P(4.5,-1.8,17)); grp.add(ramp); }
const VOID=[[16,10],[25,10],[25,14],[16,14]];
slab(LEVELS.B.outline,-3.85,-3.5,M.floor); level('B',M.conc);
slab(LEVELS.G.outline,-.3,0,M.floor); level('G',M.conc);
slab(LEVELS.F.outline,3.15,3.5,M.conc,[VOID]); slab(LEVELS.F.outline,3.5,3.52,M.floor,[VOID]); level('F',M.blk);
slab(LEVELS.F.outline,6.65,7.0,M.blk);
for(const rf of ROOFS) prism(rf.axis,rf.x1,rf.x2,rf.y1,rf.y2,EAVE,rf.ridge,M.roof);
fins();
box(16,20,19,24,3.15,3.5,M.blk); box(30,34,19,24,3.15,3.5,M.blk); box(7.85,16.15,42,46.15,3.15,3.5,M.blk);
box(16.1,19.9,23.75,23.9,3.1,3.13,M.led,false); box(30.1,33.9,23.75,23.9,3.1,3.13,M.led,false);
for(const [a,b,c,d] of [[16,34,19.25,19.4],[16.25,16.4,19,42],[33.6,33.75,19,42],[34,42,45.6,45.75]]) box(a,b,c,d,3.1,3.13,M.led,false);
box(17,30,3,10,3.35,3.6,M.blk); box(17.2,29.8,3.2,3.35,3.32,3.35,M.led,false); box(17.9,18.1,8.5,8.7,0,3.35,M.blk); box(28.9,29.1,8.5,8.7,0,3.35,M.blk);
for(let i=0;i<19;i++){ const x=19.5+i*.29, z=(i+1)*.184; box(x,x+.29,12.6,14,z-.06,z,M.stone); box(x+.02,x+.27,12.62,12.7,z-.066,z-.06,M.led,false); }
box(31,34,37,46,3.3,3.5,M.blk); box(31,31.03,37,46,3.5,4.6,M.glass); box(31,34,45.97,46,3.5,4.6,M.glass);
for(const it of FURN.B) furn(it,-3.5); for(const it of FURN.G) furn(it,0); for(const it of FURN.F) furn(it,3.52); for(const it of FURN.DECK) furn(it,0);
for(const c of FORECOURT_CARS) furn(['car',...c],0);
for(const [x,y] of TREES) tree(x,y);
for(let i=0;i<40;i++){ const a=i/40*Math.PI*2, r=64+rnd()*16; tree(25+Math.cos(a)*r,30+Math.sin(a)*r,2.2+rnd()*1.4); }
{ const gg=new T.ConeGeometry(.05,1.1,4); gg.translate(0,.55,0); const im=new T.InstancedMesh(gg,M.grass,1400), d=new T.Object3D();
  for(let i=0;i<1400;i++){ d.position.copy(P(.6+rnd()*48.8,0,57.8+rnd()*1.8)); d.rotation.set((rnd()-.5)*.35,rnd()*3,(rnd()-.5)*.35); d.scale.setScalar(.7+rnd()*.7); d.updateMatrix(); im.setMatrixAt(i,d.matrix); } grp.add(im); }
scene.add(new T.HemisphereLight(0x93a6cc,0x2a2219,.7));
{ const sun=new T.DirectionalLight(0xffb27a,1.0); sun.position.copy(P(-40,16,24)); sun.target.position.copy(P(25,0,30)); sun.castShadow=true;
  Object.assign(sun.shadow.camera,{left:-45,right:45,top:45,bottom:-45,near:1,far:150}); sun.shadow.mapSize.set(2048,2048); sun.shadow.bias=-.0004; scene.add(sun,sun.target); }
for(const r of ROOMS){ if(area(r)<10) continue; const b=r.r[0]; const l=new T.PointLight(0xffc995, r.lvl==='B'?.4:.8, 10, 2); l.position.copy(P(b[0]+b[2]/2, LEVELS[r.lvl].ffl+2.7, b[1]+b[3]/2)); scene.add(l); }
for(const [x,y,h,i] of [[25,45,.9,1.8],[25,32,-1.1,1.2],[23.5,6.5,3.0,1.2]]){ const l=new T.PointLight(0xffc48a,i,12,2); l.position.copy(P(x,h,y)); scene.add(l); }
const skyMat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,vertexShader:'varying vec3 v;void main(){v=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec3 v;void main(){float h=v.y;vec3 hor=vec3(.96,.66,.45),mid=vec3(.42,.49,.66),top=vec3(.13,.18,.32);vec3 c=mix(hor,mid,smoothstep(0.,.22,h));c=mix(c,top,smoothstep(.22,.8,h));if(h<0.)c=vec3(.2,.2,.21);gl_FragColor=vec4(c,1.);}'});
const sky=new T.Mesh(new T.SphereGeometry(420,48,24),skyMat); scene.add(sky);

/* ---------- renderer + passes ---------- */
const r = new T.WebGLRenderer({antialias:true, preserveDrawingBuffer:true}); r.setPixelRatio(1);
r.outputEncoding=T.sRGBEncoding; r.shadowMap.enabled=true; r.shadowMap.type=T.PCFSoftShadowMap;
document.body.appendChild(r.domElement); r.domElement.style.width='600px';
{ const pm=new T.PMREMGenerator(r), es=new T.Scene(); es.add(new T.Mesh(sky.geometry,skyMat)); scene.environment=pm.fromScene(es,.02).texture; }
const normMat=new T.MeshNormalMaterial({side:T.DoubleSide});
const depMat=new T.ShaderMaterial({side:T.DoubleSide, uniforms:{uFar:{value:140}},
  vertexShader:'varying float vD;void main(){vec4 mv=vec4(position,1.);\n#ifdef USE_INSTANCING\nmv=instanceMatrix*mv;\n#endif\nmv=modelViewMatrix*mv;vD=-mv.z;gl_Position=projectionMatrix*mv;}',
  fragmentShader:'uniform float uFar;varying float vD;void main(){float d=clamp(vD/uFar,0.,1.);gl_FragColor=vec4(floor(d*255.)/255.,fract(d*255.),0.,1.);}'});
const grab = (w,h,near) => { const c=document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d').drawImage(r.domElement,0,0); const t=new T.CanvasTexture(c); t.minFilter=t.magFilter=near?T.NearestFilter:T.LinearFilter; t.generateMipmaps=false; return t; };
const post = new T.ShaderMaterial({ uniforms:{tC:{value:null},tN:{value:null},tD:{value:null},res:{value:new T.Vector2(1,1)},seed:{value:1},mode:{value:1}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:`uniform sampler2D tC,tN,tD;uniform vec2 res;uniform float seed,mode;varying vec2 vUv;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+seed)*43758.5453);}
  float eN(vec2 uv){vec2 px=1./res;vec3 c=texture2D(tN,uv).rgb;return length(texture2D(tN,uv+vec2(px.x,0.)).rgb-c)+length(texture2D(tN,uv+vec2(0.,px.y)).rgb-c)+length(texture2D(tN,uv-vec2(px.x,0.)).rgb-c)+length(texture2D(tN,uv-vec2(0.,px.y)).rgb-c);}
  float dd(vec2 uv){vec4 t=texture2D(tD,uv);return t.r+t.g/255.;}
  float eD(vec2 uv){vec2 px=1./res;float c=max(dd(uv),.002);float a=dd(uv+vec2(px.x,0.)),b=dd(uv-vec2(px.x,0.)),u=dd(uv+vec2(0.,px.y)),v=dd(uv-vec2(0.,px.y));return max(abs(a+b-2.*c),abs(u+v-2.*c))/c;}
  void main(){vec2 uv=vUv;vec2 px=1./res;
    float ink=clamp(smoothstep(.45,1.1,eN(uv))+smoothstep(.05,.14,eD(uv)),0.,1.);
    vec3 col=texture2D(tC,uv).rgb;
    if(mode<1.5){
      vec3 b=vec3(0.);for(int i=-3;i<=3;i++)for(int j=-3;j<=3;j++){vec3 s=texture2D(tC,uv+vec2(float(i),float(j))*px*5.).rgb;b+=max(s-vec3(.8),0.);}b/=49.;
      col+=b*1.6; col=mix(col,col*col*(3.-2.*col),.3); col*=1.-ink*.16;
      vec2 c=uv-.5; col*=1.-dot(c,c)*.6; col+=(hash(uv*res)-.5)*.018;
    } else { col=mix(col,vec3(.13,.14,.15),ink*.92); }
    gl_FragColor=vec4(col,1.);}`});
const quad=new T.Mesh(new T.PlaneGeometry(2,2),post), pScene=new T.Scene(); pScene.add(quad); const pCam=new T.Camera();
async function renderImage(scn, cam, w, h, mode, skyObj, far, exp=1.05){
  await new Promise(res=>setTimeout(res,30));
  r.setSize(w,h,false);
  scn.overrideMaterial=null; if(skyObj) skyObj.visible=true;
  r.toneMapping = mode===2 ? T.NoToneMapping : T.ACESFilmicToneMapping; r.toneMappingExposure = exp;
  r.setClearColor(mode===2?0xffffff:0x202225); r.render(scn,cam); const tC=grab(w,h);
  scn.overrideMaterial=normMat; if(skyObj) skyObj.visible=false; r.toneMapping=T.NoToneMapping; r.setClearColor(0x808080); r.render(scn,cam); const tN=grab(w,h);
  depMat.uniforms.uFar.value=far; scn.overrideMaterial=depMat; r.setClearColor(0xffffff); r.render(scn,cam); const tD=grab(w,h,true);
  scn.overrideMaterial=null; if(skyObj) skyObj.visible=true;
  Object.assign(post.uniforms,{tC:{value:tC},tN:{value:tN},tD:{value:tD},res:{value:new T.Vector2(w,h)},mode:{value:mode},seed:{value:Math.random()*10}});
  r.render(pScene,pCam);
  const out=document.createElement('canvas'); out.width=w; out.height=h; out.getContext('2d').drawImage(r.domElement,0,0); return out;
}
const upload = async (name, canvas) => { const blob=await new Promise(res=>canvas.toBlob(res,'image/jpeg',.9)); const resp=await fetch('/save?name='+name+'.jpg',{method:'POST',body:blob}); log(name+' → '+resp.status+' '+blob.size); };

/* ---------- concept renders ---------- */
const VIEWS = [ /* name, camera, target, fov, exposure */
  ['c01',[72,30,80],[25,0,31],34,1.05], ['c02',[10.5,1.7,1.4],[23,3.1,10.5],56,.95], ['c03',[25.5,1.65,57.2],[25,3.4,22],52,.9],
  ['c04',[26.4,1.6,18.3],[19.6,3.6,11.6],64,.85], ['c05',[41.4,5.1,45.4],[30,4.3,36],62,.85], ['c06',[41.3,1.6,31.4],[26,1.5,25.5],62,.85],
  ['c07',[40.2,5.1,36.6],[34.5,4.2,32],66,.8], ['c08',[26.6,5.1,18.7],[16.5,4.3,15.2],64,.85], ['c09',[33.4,5.2,45.6],[24,3.4,33],60,.95],
  ['c10',[3.2,-1.9,36.4],[11,-2.5,27.5],64,.7], ['c11',[36.1,-1.8,19.7],[40.5,-2.7,27.6],68,.7], ['c12',[14.6,-1.9,18.6],[8.3,-2.2,13.5],64,.75], ['c13',[21.6,-1.9,18.6],[15.5,-2.4,11],66,.7]
];
for(const [name,pos,look,fov,exp] of VIEWS){ log('rendering '+name+' …');
  const cam=new T.PerspectiveCamera(fov,1800/1000,.3,900); cam.position.copy(P(...pos)); cam.lookAt(P(...look));
  await upload(name, await renderImage(scene,cam,1800,1000,1,sky,140,exp)); }

/* ---------- exploded axonometrics ---------- */
const OFF = {B:0, G:17, F:34, R:50};
const AXO_LABEL = {B:['BASEMENT','(−3.50 m)'], G:['GROUND · 1ST FLOOR','(±0.00 m)'], F:['UPPER · 2ND FLOOR','(+3.50 m)'], R:['ROOF · 3 GABLES','(+10.15 m)']};
function buildAxo(hl){
  const s=new T.Scene(); grp=new T.Group(); s.add(grp);
  const mats = k => k===hl ? [M.axoHL,M.axoHLWall] : [M.axoSlab,M.axoWall];
  for(const k of ['B','G','F']){ const [sm,wm]=mats(k), z=OFF[k];
    slab(LEVELS[k].outline, z-.35, z, sm, k==='F'?[VOID]:[]);
    if(k==='G'){ box(16,34,19,46,z-.35,z-.02,M.axoSlab,false); box(20,30,22,42,z-.3,z+.01,M.axoPool,false); for(const it of FURN.DECK) furn(it,z); }
    if(k==='F') box(31,34,37,46,z-.2,z,sm);
    level(k, wm, {z0:z, cut:2.4, inner:wm});
    for(const it of FURN[k]) furn(it, z);
  }
  for(const rf of ROOFS) prism(rf.axis,rf.x1,rf.x2,rf.y1,rf.y2,OFF.R,OFF.R+(rf.ridge-EAVE),hl==='R'?M.axoHL:M.axoRoof);
  s.add(new T.HemisphereLight(0xffffff,0x9a9a9a,1.05)); const d=new T.DirectionalLight(0xffffff,.55); d.position.set(-60,120,80); s.add(d);
  grp = mainGrp; return s;
}
for(const hl of ['b','g','f','all']){ log('rendering axo-'+hl+' …');
  const key = hl==='all' ? 'none' : hl.toUpperCase(); const s = buildAxo(key);
  const bb = new T.Box3().setFromObject(s); const ctr = bb.getCenter(new T.Vector3());
  const dir = new T.Vector3(1,1.05,1.25).normalize(); const cam=new T.OrthographicCamera(-1,1,1,-1,.1,1000);
  cam.position.copy(ctr.clone().add(dir.multiplyScalar(260))); cam.lookAt(ctr); cam.updateMatrixWorld();
  let mn=[1e9,1e9], mx=[-1e9,-1e9]; for(let i=0;i<8;i++){ const p=new T.Vector3(i&1?bb.max.x:bb.min.x, i&2?bb.max.y:bb.min.y, i&4?bb.max.z:bb.min.z).applyMatrix4(cam.matrixWorldInverse); mn=[Math.min(mn[0],p.x),Math.min(mn[1],p.y)]; mx=[Math.max(mx[0],p.x),Math.max(mx[1],p.y)]; }
  const padX=(mx[0]-mn[0])*.05, padY=(mx[1]-mn[1])*.04, extraR=(mx[0]-mn[0])*.42;
  cam.left=mn[0]-padX; cam.right=mx[0]+padX+extraR; cam.bottom=mn[1]-padY; cam.top=mx[1]+padY; cam.updateProjectionMatrix();
  const w=1000, h=Math.round(w*(cam.top-cam.bottom)/(cam.right-cam.left));
  const cv = await renderImage(s,cam,w,h,2,null,420);
  const g2=cv.getContext('2d'); const toPx = v => { const p=v.clone().project(cam); return [(p.x+1)/2*w, (1-p.y)/2*h]; };
  g2.font='600 21px Consolas, "IBM Plex Mono", monospace'; g2.lineWidth=1.2;
  const levels=['R','F','G','B'];
  for(const k of levels){ const z = k==='R' ? OFF.R+1.5 : OFF[k]+1.2; const [ax,ay] = toPx(P(42,z,30)); const lx = w*.73;
    const on = key===k; g2.strokeStyle = on ? '#2d7fb3' : '#5c6166'; g2.fillStyle = on ? '#1f6d9f' : '#2a2d30';
    g2.beginPath(); g2.moveTo(ax+8,ay); g2.lineTo(lx-10,ay); g2.stroke(); g2.beginPath(); g2.arc(ax+8,ay,3,0,7); g2.fill();
    g2.fillText(AXO_LABEL[k][0], lx, ay-4); g2.font='400 18px Consolas, monospace'; g2.fillText(AXO_LABEL[k][1], lx, ay+20); g2.font='600 21px Consolas, "IBM Plex Mono", monospace'; }
  g2.setLineDash([6,6]); g2.strokeStyle='#8a8f94';
  for(const [x,y] of [[8,10],[42,10],[8,42],[42,42]]){ g2.beginPath(); const [x1,y1]=toPx(P(x,OFF.B,y)), [x2,y2]=toPx(P(x,OFF.R,y)); g2.moveTo(x1,y1); g2.lineTo(x2,y2); g2.stroke(); }
  g2.setLineDash([]);
  await upload('axo-'+hl, cv);
}
log('DONE'); document.title='DONE';
})().catch(e=>{ document.getElementById('log').textContent += '\nERROR ' + (e.stack||e); document.title='ERROR'; });
