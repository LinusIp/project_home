/* Live WebGL renders of the villa, built from the same data as the drawings (three.js r147). */
function buildVilla(){
  const T = THREE, scene = new T.Scene();
  const P = (x, h, y) => new T.Vector3(x - 25, h, y - 30);           // plan (x,y) + height → world
  const grp = new T.Group(); scene.add(grp);
  function tex(draw, size=256, rep=[1,1]){ const c=document.createElement('canvas'); c.width=c.height=size; draw(c.getContext('2d'),size);
    const t=new T.CanvasTexture(c); t.wrapS=t.wrapT=T.RepeatWrapping; t.repeat.set(...rep); t.encoding=T.sRGBEncoding; t.anisotropy=8; return t; }
  let seed=7; const rnd=()=>((seed=(seed*16807)%2147483647)/2147483647);
  const noise=(base,amp)=>(g,s)=>{ g.fillStyle=base; g.fillRect(0,0,s,s); for(let i=0;i<s*s/3;i++){ const v=(rnd()-.5)*amp; g.fillStyle=`rgba(${v>0?255:0},${v>0?255:0},${v>0?255:0},${Math.abs(v)})`; g.fillRect(rnd()*s,rnd()*s,1.5,1.5);} };
  const M = {
    conc: new T.MeshStandardMaterial({color:0xa3a29c, roughness:.88, map:tex(noise('#b5b4ae',.12),256,[.25,.25])}),
    blk:  new T.MeshStandardMaterial({color:0x1b1d1f, roughness:.42, metalness:.55}),
    alu:  new T.MeshStandardMaterial({color:0x2a2d30, roughness:.3, metalness:.85}),
    glass:new T.MeshStandardMaterial({color:0x0b1418, roughness:.04, metalness:.9, transparent:true, opacity:.38, side:T.DoubleSide, depthWrite:false}),
    floor:new T.MeshStandardMaterial({color:0xc9c6be, roughness:.35, map:tex(noise('#d0cdc5',.06),256,[.5,.5])}),
    deck: new T.MeshStandardMaterial({color:0x8a8a86, roughness:.8, map:tex((g,s)=>{noise('#9a9994',.1)(g,s); g.strokeStyle='rgba(30,30,30,.55)'; g.lineWidth=2; for(let i=0;i<=s;i+=s/2){g.beginPath();g.moveTo(0,i);g.lineTo(s,i);g.stroke();} g.beginPath();g.moveTo(0,0);g.lineTo(0,s);g.stroke();},256,[1/1.2,1/1.2])}),
    gravel:new T.MeshStandardMaterial({color:0x5b5a55, roughness:1, map:tex(noise('#6a6963',.35),256,[4,4])}),
    road: new T.MeshStandardMaterial({color:0x161819, roughness:.9}),
    tile: new T.MeshStandardMaterial({color:0x0c2a31, roughness:.3, emissive:0x0b4a57, emissiveIntensity:.55}),
    water:new T.MeshStandardMaterial({color:0x04161c, roughness:.03, metalness:1, transparent:true, opacity:.8}),
    led:  new T.MeshBasicMaterial({color:0xffc98a}),
    fire: new T.MeshBasicMaterial({color:0xff8a3a}),
    leaf: new T.MeshStandardMaterial({color:0x4d5a45, roughness:.95, flatShading:true}),
    bark: new T.MeshStandardMaterial({color:0x3a332c, roughness:1}),
    grass:new T.MeshStandardMaterial({color:0x8a8458, roughness:1}),
    fabric:new T.MeshStandardMaterial({color:0xd9d6cf, roughness:.95}),
    stone:new T.MeshStandardMaterial({color:0xd8d4cb, roughness:.4})
  };
  M.deck.map.encoding=T.sRGBEncoding;
  function box(x1,x2,y1,y2,z1,z2,mat,cast=true){ const g=new T.BoxGeometry(Math.abs(x2-x1),Math.abs(z2-z1),Math.abs(y2-y1)); const m=new T.Mesh(g,mat);
    m.position.copy(P((x1+x2)/2,(z1+z2)/2,(y1+y2)/2)); m.castShadow=cast; m.receiveShadow=true; grp.add(m); return m; }
  function slab(outline,z1,z2,mat,holes=[]){ const sh=new T.Shape(outline.map(([x,y])=>new T.Vector2(x-25,-(y-30))));
    for(const h of holes) sh.holes.push(new T.Path(h.map(([x,y])=>new T.Vector2(x-25,-(y-30)))));
    const g=new T.ExtrudeGeometry(sh,{depth:z2-z1,bevelEnabled:false}); g.rotateX(-Math.PI/2); g.translate(0,z1,0);
    const m=new T.Mesh(g,mat); m.castShadow=m.receiveShadow=true; grp.add(m); return m; }
  function walls(k,z1,z2,mat){ const O=LEVELS[k].outline, G=GLAZING[k];
    for(let i=0;i<O.length;i++){ const a=O[i], b=O[(i+1)%O.length], hz=a[1]===b[1]; const lo=Math.min(hz?a[0]:a[1],hz?b[0]:b[1]), hi=Math.max(hz?a[0]:a[1],hz?b[0]:b[1]), c=hz?a[1]:a[0];
      const gl=G.filter(([p,q])=>hz ? (p[1]===q[1]&&p[1]===c) : (p[0]===q[0]&&p[0]===c)).map(([p,q])=>hz?[Math.min(p[0],q[0]),Math.max(p[0],q[0])]:[Math.min(p[1],q[1]),Math.max(p[1],q[1])])
        .map(([s,e])=>[Math.max(s,lo),Math.min(e,hi)]).filter(([s,e])=>e>s).sort((u,v)=>u[0]-v[0]);
      let cur=lo; const seg=(s,e,m,th)=> hz ? box(s,e,c-th/2,c+th/2,z1,z2,m,m!==M.glass) : box(c-th/2,c+th/2,s,e,z1,z2,m,m!==M.glass);
      for(const [s,e] of gl){ if(s>cur) seg(cur,s,mat,.3); seg(s,e,M.glass,.03); cur=e; } if(hi>cur) seg(cur,hi,mat,.3); } }
  // ground, plot, road
  box(-80,130,-70,130,-.3,-.02,M.road,false);
  box(.3,49.7,.3,59.7,-.3,0,M.gravel,false);
  for(const [x,y,w,h] of [[1.5,.3,7.7,8],[9.2,1.5,21.3,7.5],[42.3,10,7.4,10]]) box(x,x+w,y,y+h,-.29,.005,M.deck,false);
  for(const r of EXTERNAL.filter(e=>e.id==='X.03'||e.id==='X.02')) for(const [x,y,w,h] of r.r) box(x,x+w,y,y+h,-.29,.01,M.deck,false);
  // pool
  box(20,30,22,42,-1.55,-1.5,M.tile,false); for(const [x1,x2,y1,y2] of [[19.8,20,22,42],[30,30.2,22,42],[20,30,21.8,22],[20,30,42,42.2]]) box(x1,x2,y1,y2,-1.5,-.02,M.tile,false);
  const water=box(20,30,22,42,-.06,-.03,M.water,false); water.renderOrder=2;
  // perimeter wall + gates
  const WH=PLOT.wallH; for(const [x1,x2,y1,y2] of [[0,1.8,0,.3],[9.2,50,0,.3],[0,.3,0,60],[0,50,59.7,60],[49.7,50,0,11.5],[49.7,50,15.5,60]]) box(x1,x2,y1,y2,0,WH,M.conc);
  box(1.8,9.2,-.2,-.05,0,WH-.02,M.blk); box(49.85,50.05,11.5,15.5,0,WH-.02,M.conc);
  box(1.8,9.2,-.26,-.2,WH-.35,WH-.32,M.led,false);
  // ramp down
  const ramp=new T.Mesh(new T.PlaneGeometry(6,18.4),M.conc); ramp.rotation.x=-Math.PI/2+Math.atan2(3.6,18); ramp.position.copy(P(4.5,-1.8,17)); ramp.receiveShadow=true; grp.add(ramp);
  // levels
  const VOID=[[16,10],[25,10],[25,14],[16,14]];
  slab(LEVELS.G.outline,-.3,0,M.floor);
  walls('G',0,3.15,M.conc);
  slab(LEVELS.F.outline,3.15,3.5,M.conc,[VOID]); slab(LEVELS.F.outline,3.5,3.52,M.floor,[VOID]);
  walls('F',3.52,6.65,M.blk);
  slab(LEVELS.F.outline,6.65,7.0,M.blk);
  const O=LEVELS.F.outline; for(let i=0;i<O.length;i++){ const a=O[i],b=O[(i+1)%O.length]; if(a[1]===b[1]) box(Math.min(a[0],b[0]),Math.max(a[0],b[0]),a[1]-.15,a[1]+.15,7,7.6,M.blk); else box(a[0]-.15,a[0]+.15,Math.min(a[1],b[1]),Math.max(a[1],b[1]),7,7.6,M.blk); }
  box(27,30.5,10,15.5,0,8.4,M.conc);
  // soffit LEDs along courtyard edges + cantilever + canopy
  for(const [x1,x2,y1,y2] of [[16,34,19.25,19.4],[16.25,16.4,19,42],[33.6,33.75,19,42],[34,42,45.6,45.75],[8,42,10.25,10.4]]) box(x1,x2,y1,y2,3.1,3.13,M.led,false);
  for(const [x1,x2,y1,y2] of [[16,34,19.2,19.35],[34,42,45.75,45.9]]) box(x1,x2,y1,y2,6.6,6.63,M.led,false);
  box(17,30,3,10,3.35,3.6,M.blk); box(17.2,29.8,3.2,3.35,3.32,3.35,M.led,false); box(17.2,29.8,9.65,9.8,3.32,3.35,M.led,false);
  box(17.9,18.1,8.5,8.7,0,3.35,M.blk); box(28.9,29.1,8.5,8.7,0,3.35,M.blk);
  // lobby: feature wall + floating stair with under-tread LED
  box(18.8,25.6,12.45,12.6,0,7,M.conc);
  for(let i=0;i<19;i++){ const x=19.5+i*.29, z=(i+1)*.184; box(x,x+.29,12.6,14,z-.06,z,M.stone); box(x+.02,x+.27,12.62,12.7,z-.065,z-.06,M.led,false); }
  box(16,25,12.3,12.45,6.6,6.63,M.led,false);
  // interiors: key furniture
  box(31.8,36.8,14.2,15.4,0,.92,M.stone); box(30.8,36.8,10.3,10.9,0,2.9,M.blk);
  box(36,40,22.3,23.7,.72,.76,M.blk); box(36.3,39.7,35,35.9,0,.42,M.fabric); box(39.6,40.5,31.8,35.9,0,.42,M.fabric);
  box(39.4,41.6,40.4,42.6,3.52,3.85,M.blk); box(39.45,41.55,40.45,42.55,3.85,4.05,M.fabric); box(41.75,41.9,39.4,43.6,3.52,5.1,M.blk); box(41.7,41.75,39.4,43.6,5.1,5.13,M.led,false); box(39.3,41.7,40.3,42.7,3.53,3.55,M.led,false);
  box(36.2,38.6,40.2,42.8,3.52,3.53,new T.MeshStandardMaterial({color:0x6c6760,roughness:1}),false);
  // master terrace (cantilevered)
  box(31,34,37,46,3.3,3.5,M.blk); box(31,31.03,37,46,3.5,4.6,M.glass); box(31,34,45.97,46,3.5,4.6,M.glass);
  // outdoor kitchen, benches, fire
  box(16.3,17.1,29,37,0,.92,M.blk); box(17.2,20.2,44.4,44.9,0,.42,M.conc); box(29.8,32.8,44.4,44.9,0,.42,M.conc); box(21,29,44.5,44.85,0,.06,M.fire,false);
  // trees + grass
  const tree=(x,y,s=1)=>{ const t=new T.Mesh(new T.CylinderGeometry(.12*s,.18*s,2.2*s,6),M.bark); t.position.copy(P(x,1.1*s,y)); t.castShadow=true; grp.add(t);
    const c=new T.Mesh(new T.IcosahedronGeometry(1.5*s,1),M.leaf); c.scale.set(1,.75,1); c.position.copy(P(x,2.9*s,y)); c.rotation.y=rnd()*6; c.castShadow=true; grp.add(c); };
  for(let x=4;x<=46;x+=6) for(const y of [50.5,55]) if(x<22||x>28) tree(x,y);
  for(let y=23;y<=43;y+=5) tree(46,y); for(const y of [29,35,41]) tree(4.2,y,.9);
  for(let i=0;i<46;i++){ const a=i/46*Math.PI*2, r=62+rnd()*18; tree(25+Math.cos(a)*r, 30+Math.sin(a)*r, 2.2+rnd()*1.4); }
  const gg=new T.ConeGeometry(.05,1.1,4); gg.translate(0,.55,0); const im=new T.InstancedMesh(gg,M.grass,1400); const d=new T.Object3D();
  for(let i=0;i<1400;i++){ const x=.6+rnd()*48.8, y=57.8+rnd()*1.8; d.position.copy(P(x,0,y)); d.rotation.set((rnd()-.5)*.35,rnd()*3,(rnd()-.5)*.35); d.scale.setScalar(.7+rnd()*.7); d.updateMatrix(); im.setMatrixAt(i,d.matrix); }
  grp.add(im);
  // lights
  scene.add(new T.HemisphereLight(0x7486ad,0x1c1712,.55));
  const sun=new T.DirectionalLight(0xffa36b,.9); sun.position.copy(P(-40,14,20)); sun.target.position.copy(P(25,0,30)); sun.castShadow=true;
  Object.assign(sun.shadow.camera,{left:-45,right:45,top:45,bottom:-45,near:1,far:140}); sun.shadow.mapSize.set(2048,2048); sun.shadow.bias=-.0004; scene.add(sun,sun.target);
  const warm=(x,y,h,i=1.1,dist=11)=>{ const l=new T.PointLight(0xffc48a,i,dist,2); l.position.copy(P(x,h,y)); scene.add(l); };
  [[38,23,2.7],[38,34,2.7],[38,39,2.7],[33.7,14.5,2.7],[11,25,2.7],[11,38,2.6],[21,16,2.8,1.4],[21,13,6.3,1.2],[21,16.5,6.2],[38,41,6.2,1.3],[38,34,6.2],[38,21,6.2],[11,22.5,6.2],[11,33,6.2],[11,12.5,6.2],[33.5,13.5,6.2]].forEach(a=>warm(...a));
  warm(25,45.5,.9,1.6,8); warm(25,32,-1.2,.9,14);
  // dusk sky
  const sky=new T.Mesh(new T.SphereGeometry(400,48,24),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,vertexShader:'varying vec3 v;void main(){v=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec3 v;void main(){float h=v.y;vec3 hor=vec3(.93,.52,.30),mid=vec3(.19,.22,.36),top=vec3(.025,.04,.085);vec3 c=mix(hor,mid,smoothstep(0.,.2,h));c=mix(c,top,smoothstep(.2,.75,h));float w=pow(max(0.,dot(v,normalize(vec3(-1.,.06,-.15)))),10.);c+=vec3(1.,.5,.22)*w*.5;if(h<0.)c=vec3(.03,.03,.035);gl_FragColor=vec4(c,1.);}'}));
  scene.add(sky);
  return {scene,P};
}
const VIEWS = {
  'V-01': {pos:[68,10.5,-24], look:[23,2.6,22], fov:32},
  'V-02': {pos:[25.6,1.65,57.4], look:[25,3.4,22], fov:52},
  'V-03': {pos:[26.4,1.6,18.3], look:[19.6,3.6,11.6], fov:62},
  'V-04': {pos:[41.3,5.15,45.2], look:[26,4.2,33.5], fov:60}
};
async function renderAll(){
  const imgs = [...document.querySelectorAll('img[data-view]')];
  if(!window.THREE){ imgs.forEach(i=>i.closest('figure')?.classList.add('fail')); return; }
  let r; try { r = new THREE.WebGLRenderer({antialias:true, preserveDrawingBuffer:true}); } catch(e){ imgs.forEach(i=>i.closest('figure')?.classList.add('fail')); return; }
  const W=1800, H=1000; r.setSize(W,H,false); r.setPixelRatio(1); r.shadowMap.enabled=true; r.shadowMap.type=THREE.PCFSoftShadowMap;
  r.outputEncoding=THREE.sRGBEncoding; r.toneMapping=THREE.ACESFilmicToneMapping; r.toneMappingExposure=1.05;
  const {scene,P} = buildVilla();
  const pm = new THREE.PMREMGenerator(r); const envScene = new THREE.Scene(); envScene.add(scene.children.find(o=>o.material&&o.material.isShaderMaterial).clone());
  scene.environment = pm.fromScene(envScene,.02).texture;
  const cache = {};
  for(const id of Object.keys(VIEWS)){
    await new Promise(res=>requestAnimationFrame(res));
    const v=VIEWS[id], cam=new THREE.PerspectiveCamera(v.fov,W/H,.1,900); cam.position.copy(P(...v.pos)); cam.lookAt(P(...v.look));
    r.render(scene,cam); cache[id]=r.domElement.toDataURL('image/jpeg',.9);
    imgs.filter(i=>i.dataset.view===id).forEach(i=>{ i.src=cache[id]; i.closest('figure')?.classList.add('done'); });
  }
  r.dispose();
}
