/* Writes the villa out for Blender. Open explore.html?export on the local server (node serve.js): it waits for every
   level to build, then posts blender/villa.glb (the meshes, one per material per part, named "part:material") and
   blender/villa-extras.json (light positions, garden lights, rooms, trees) back to serve.js. blender/build_scene.py
   turns those into the Blender scene. Coordinates stay in the explorer's frame: x = plan x − 25, y = height, z = plan y − 28. */
(async function(){
'use strict';
const T = THREE, X = window.HX_EXPLORER;
const say = m => { console.log('[export] ' + m); document.title = 'export · ' + m; };
const load = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
await load('https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/exporters/GLTFExporter.js');
say('waiting for the levels');
while(!X.SITE || !X.ROOF || !X.FULLL.G || !X.FULLL.F || !['G', 'F', 'B'].every(k => X.CUTL[k])) await new Promise(r => setTimeout(r, 300));
if(!X.FULLL.B) X.buildFull('B');

/* trees and the landscape beyond the wall are rebuilt in Blender; utility overlays and highlights are web-only */
const SKIP = new Set(['leafA', 'leafB', 'bark', 'world', 'pool', 'glow', 'glowSoft']);
const PARTS = [['site', X.SITE, 0], ['roof', X.ROOF, 0], ['full_G', X.FULLL.G.root, 0], ['full_F', X.FULLL.F.root, 0], ['full_B', X.FULLL.B.root, -3.5],
  ['cut_G', X.CUTL.G.root, 0], ['cut_F', X.CUTL.F.root, 0], ['cut_B', X.CUTL.B.root, 0]];
const plan = v => [+(v.x + 25).toFixed(3), +(v.z + 28).toFixed(3), +v.y.toFixed(3)];   // back to plan x, plan y, height
const mats = new Map();
function plain(m){ // a light copy of each material: its name, colour and finish (Blender rebuilds the surfaces by name)
  if(mats.has(m)) return mats.get(m);
  const c = new T.MeshStandardMaterial({name:m.name || 'unnamed', color:m.color ? m.color.clone() : new T.Color(1, 1, 1), roughness:m.roughness ?? .8, metalness:m.metalness ?? 0});
  if(m.emissive){ c.emissive = m.emissive.clone(); c.emissiveIntensity = m.emissiveIntensity; }
  if(/^(art\d|film|flame)$/.test(m.name) && m.map) c.map = m.map;
  mats.set(m, c); return c; }
const out = new T.Scene(), extras = {pools:[], glows:[], rooms:ROOMS.map(r => ({id:r.id, lvl:r.lvl, n:r.n, k:r.k, r:r.r})),
  levels:Object.fromEntries(Object.entries(LEVELS).map(([k, v]) => [k, {outline:v.outline}])), trees:TREES, plot:PLOT, external:EXTERNAL, garden:GARDEN};
const m4 = new T.Matrix4(), v = new T.Vector3(), q = new T.Quaternion(), s3 = new T.Vector3(), col = new T.Color();
for(const [name, root, dy] of PARTS){ root.updateMatrixWorld(true); const g = new T.Group(); g.name = name; let n = 0;
  root.traverse(o => {
    if(o.isInstancedMesh && o.material.name === 'pool'){ for(let i = 0; i < o.count; i++){ o.getMatrixAt(i, m4); m4.premultiply(o.matrixWorld); m4.decompose(v, q, s3); o.getColorAt(i, col);
        extras.pools.push({part:name, p:plan(v.setY(v.y + dy)), r:+(s3.x / 2).toFixed(3), c:[+col.r.toFixed(4), +col.g.toFixed(4), +col.b.toFixed(4)]}); } return; }
    if(o.isSprite){ o.getWorldPosition(v); extras.glows.push({part:name, p:plan(v.setY(v.y + dy)), s:+o.scale.x.toFixed(3), strong:o.material.name === 'glow'}); return; }
    if(!o.isMesh || o.isInstancedMesh || !o.material || o.material.isShaderMaterial || SKIP.has(o.material.name)) return;
    const m = new T.Mesh(o.geometry, plain(o.material)); m.name = name + ':' + o.material.name;
    o.matrixWorld.decompose(m.position, m.quaternion, m.scale); m.position.y += dy; g.add(m); n++; });
  out.add(g); say(name + ' · ' + n + ' meshes'); }

say('writing glTF');
const glb = await new Promise((ok, no) => new T.GLTFExporter().parse(out, ok, no, {binary:true, onlyVisible:false}));
const post = (name, body) => fetch('/save?name=' + name, {method:'POST', body}).then(r => r.status);
const a = await post('villa.glb', new Blob([glb])), b = await post('villa-extras.json', JSON.stringify(extras));
window.HX_EXPORTED = {glb:a, extras:b, bytes:glb.byteLength, pools:extras.pools.length, glows:extras.glows.length};
say('done ' + JSON.stringify(window.HX_EXPORTED));
})();
