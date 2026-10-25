/* Hovli Explorer · look: procedural textures, world-scaled (triplanar) materials, detailed furniture, room dressing
   (feature walls, lamps, art, light pools) and a render pipeline with ambient occlusion, bloom and filmic tone mapping.
   Exposes window.HX_LOOK. */
(function(){
'use strict';
const T = THREE;
const lin = c => new T.Color(c).convertSRGBToLinear();
let s = 4242; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
const rr = (a, b) => a + (b - a) * rnd();
const pickR = a => a[Math.floor(rnd() * a.length)];

/* ---------- procedural, seamless textures ---------- */
function cnv(n, m = n){ const c = document.createElement('canvas'); c.width = n; c.height = m; return [c, c.getContext('2d')]; }
function noise(g, n, cells, alpha, op='overlay'){ // seamless value noise: wrap the random grid and upscale with smoothing
  const [c, x] = cnv(cells + 1), id = x.createImageData(cells + 1, cells + 1), v = [];
  for(let i = 0; i < cells * cells; i++) v.push(rnd() * 255);
  for(let j = 0; j <= cells; j++) for(let i = 0; i <= cells; i++){ const k = (j * (cells + 1) + i) * 4, q = v[(j % cells) * cells + (i % cells)]; id.data[k] = id.data[k+1] = id.data[k+2] = q; id.data[k+3] = 255; }
  x.putImageData(id, 0, 0);
  g.save(); g.globalAlpha = alpha; g.globalCompositeOperation = op; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  const sz = n * (cells + 1) / cells; g.drawImage(c, -n / cells / 2, -n / cells / 2, sz, sz); g.restore(); }
function tex(c, aniso=8){ const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.encoding = T.sRGBEncoding; t.anisotropy = aniso; return t; }
const hsl = (h, s, l, a=1) => `hsla(${h},${s}%,${l}%,${a})`;
function grainLines(g, x0, y0, w, h, vertical, count, col){ g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip(); g.strokeStyle = col;
  for(let i = 0; i < count; i++){ const p = rnd(); g.lineWidth = rr(.4, 1.6); g.globalAlpha = rr(.05, .18); g.beginPath();
    const a = rr(0, 6), f = rr(.004, .02), amp = rr(1, 5);
    if(vertical){ const xx = x0 + p * w; for(let y = y0; y <= y0 + h; y += 6) g.lineTo(xx + Math.sin(y * f + a) * amp, y); }
    else { const yy = y0 + p * h; for(let x = x0; x <= x0 + w; x += 6) g.lineTo(x, yy + Math.sin(x * f + a) * amp); }
    g.stroke(); } g.restore(); }
/* marble veins: wandering polylines drawn three times across the tile edges so the pattern stays seamless */
function veins(g, n, count, col, w0, w1, step, wobble){
  g.save(); g.strokeStyle = col;
  for(let i = 0; i < count; i++){ g.lineWidth = rr(w0, w1); const pts = []; let x = rr(0, n), y = rr(0, n), a = rr(0, 6.28);
    for(let k = 0; k < 14; k++){ pts.push([x, y]); a += rr(-wobble, wobble); x += Math.cos(a) * step; y += Math.sin(a) * step; }
    for(const ox of [-n, 0, n]) for(const oy of [-n, 0, n]){ g.beginPath(); pts.forEach(([px, py], k) => k ? g.lineTo(px + ox, py + oy) : g.moveTo(px + ox, py + oy)); g.stroke(); } }
  g.restore(); }
const TX = {};
function makeTextures(){
  { // oak planks: 1024 px = 2.4 m, planks 200 mm wide
    const n = 1024, [c, g] = cnv(n), cols = 12, pw = n / cols;
    for(let i = 0; i < cols; i++){ let y = -rr(0, n * .7); while(y < n){ const L = rr(n * .45, n * .8);
        g.fillStyle = hsl(rr(26, 31), rr(30, 38), rr(40, 48)); g.fillRect(i * pw, y, pw, L);
        grainLines(g, i * pw, y, pw, L, true, 34, '#2a1a0e');
        g.fillStyle = 'rgba(20,12,6,.5)'; g.fillRect(i * pw, y, pw, 1.5); y += L; }
      g.fillStyle = 'rgba(20,12,6,.45)'; g.fillRect(i * pw, 0, 1.2, n); }
    noise(g, n, 16, .08); noise(g, n, 64, .05); TX.oak = tex(c); }
  { // walnut veneer for joinery: 512 px = 1.2 m
    const n = 512, [c, g] = cnv(n); g.fillStyle = hsl(24, 30, 24); g.fillRect(0, 0, n, n); grainLines(g, 0, 0, n, n, false, 160, '#120a05'); noise(g, n, 8, .2); TX.walnut = tex(c); }
  { // light oak veneer for islands and workbench tops: 512 px = 1.2 m
    const n = 512, [c, g] = cnv(n); g.fillStyle = hsl(31, 40, 50); g.fillRect(0, 0, n, n); grainLines(g, 0, 0, n, n, false, 200, '#4a2e15'); noise(g, n, 8, .14);
    g.fillStyle = 'rgba(60,36,16,.25)'; for(let i = 0; i < 6; i++) g.fillRect(0, i * n / 6, n, 1); TX.oakV = tex(c); }
  { // honed limestone, 1200 × 600 tiles: 1024 px = 2.4 m
    const n = 1024, [c, g] = cnv(n), tw = n / 2, th = n / 4;
    for(let j = 0; j < 4; j++) for(let i = 0; i < 2; i++){ g.fillStyle = hsl(rr(36, 42), rr(14, 20), rr(77, 82)); g.fillRect(i * tw, j * th, tw, th); }
    noise(g, n, 12, .25); noise(g, n, 48, .1);
    g.strokeStyle = 'rgba(150,135,115,.25)'; for(let i = 0; i < 18; i++){ g.lineWidth = rr(.5, 1.2); g.beginPath(); let x = rr(0, n), y = rr(0, n); g.moveTo(x, y); for(let k = 0; k < 6; k++){ x += rr(-80, 80); y += rr(-80, 80); g.lineTo(x, y); } g.stroke(); }
    g.fillStyle = 'rgba(120,108,92,.55)'; for(let i = 0; i <= 2; i++) g.fillRect(i * tw - 1, 0, 2, n); for(let j = 0; j <= 4; j++) g.fillRect(0, j * th - 1, n, 2);
    TX.stone = tex(c); }
  { // polished large-format porcelain, 1200 × 1200, soft grey veining: 1024 px = 2.4 m
    const n = 1024, [c, g] = cnv(n), t = n / 2;
    for(let j = 0; j < 2; j++) for(let i = 0; i < 2; i++){ g.fillStyle = hsl(rr(30, 34), rr(6, 9), rr(60, 63)); g.fillRect(i * t, j * t, t, t); }
    noise(g, n, 6, .16); noise(g, n, 24, .08);
    veins(g, n, 8, 'rgba(255,255,255,.12)', 1, 3, 70, .5); veins(g, n, 6, 'rgba(110,100,90,.08)', .6, 1.4, 60, .6);
    g.fillStyle = 'rgba(95,88,80,.4)'; for(let i = 0; i <= 2; i++){ g.fillRect(i * t - 1, 0, 1.5, n); g.fillRect(0, i * t - 1, n, 1.5); }
    TX.porcelain = tex(c, 12); }
  { // dark marble (nero) for feature walls, backsplashes and tables: 1024 px = 2.4 m
    const n = 1024, [c, g] = cnv(n); g.fillStyle = '#2b2927'; g.fillRect(0, 0, n, n); noise(g, n, 6, .3); noise(g, n, 30, .12);
    veins(g, n, 14, 'rgba(215,208,198,.32)', .6, 2.4, 60, .7); veins(g, n, 26, 'rgba(160,152,142,.16)', .4, 1.1, 40, .9);
    g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(n / 2 - 1, 0, 1.5, n); g.fillRect(0, n / 2 - 1, n, 1.5);
    TX.nero = tex(c, 12); }
  { // grey marble, 600 × 600: 1024 px = 1.8 m
    const n = 1024, [c, g] = cnv(n), t = n / 3; g.fillStyle = '#b4b6b5'; g.fillRect(0, 0, n, n); noise(g, n, 10, .3); noise(g, n, 40, .1);
    veins(g, n, 16, 'rgba(250,250,246,.45)', .6, 2.2, 60, .6); veins(g, n, 10, 'rgba(70,72,74,.25)', .5, 1.4, 50, .7);
    g.fillStyle = 'rgba(70,72,74,.45)'; for(let i = 0; i <= 3; i++){ g.fillRect(i * t - 1, 0, 2, n); g.fillRect(0, i * t - 1, n, 2); } TX.marble = tex(c); }
  { // white marble worktops: 512 px = 1.5 m
    const n = 512, [c, g] = cnv(n); g.fillStyle = '#ebe8e2'; g.fillRect(0, 0, n, n); noise(g, n, 8, .12);
    veins(g, n, 9, 'rgba(120,116,110,.3)', .5, 1.6, 40, .6); TX.worktop = tex(c); }
  { // matte black joinery with 600 mm door joints: 512 px = 1.2 m
    const n = 512, [c, g] = cnv(n); g.fillStyle = '#202022'; g.fillRect(0, 0, n, n); noise(g, n, 16, .05);
    for(let i = 0; i < 2; i++){ g.fillStyle = 'rgba(0,0,0,.9)'; g.fillRect(i * n / 2, 0, 3, n); g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(i * n / 2 + 3, 0, 1, n); }
    TX.cabinet = tex(c); }
  { // polished concrete: 512 px = 3 m
    const n = 512, [c, g] = cnv(n); g.fillStyle = '#8f9091'; g.fillRect(0, 0, n, n); noise(g, n, 6, .14); noise(g, n, 24, .1); noise(g, n, 96, .08);
    for(let i = 0; i < 700; i++){ g.fillStyle = `rgba(40,40,40,${rr(.05, .25)})`; g.fillRect(rr(0, n), rr(0, n), 1, 1); } TX.concrete = tex(c); }
  { // exterior board-marked concrete with tie holes: 512 px = 2.4 m
    const n = 512, [c, g] = cnv(n); g.fillStyle = '#c9c3b8'; g.fillRect(0, 0, n, n); noise(g, n, 8, .3); noise(g, n, 40, .14);
    g.fillStyle = 'rgba(90,85,78,.35)'; for(let j = 0; j < 4; j++) g.fillRect(0, j * n / 4, n, 1.5);
    g.fillStyle = 'rgba(60,58,54,.6)'; for(let j = 0; j < 4; j++) for(let i = 0; i < 2; i++){ g.beginPath(); g.arc(i * n / 2 + n / 4, j * n / 4 + n / 8, 3, 0, 7); g.fill(); }
    TX.extConc = tex(c); }
  { // lime plaster: 512 px = 2 m
    const n = 512, [c, g] = cnv(n); g.fillStyle = '#ece6dc'; g.fillRect(0, 0, n, n); noise(g, n, 8, .12); noise(g, n, 40, .08); TX.plaster = tex(c); }
  { // stone pavers outside, 1200 × 600: 1024 px = 2.4 m
    const n = 1024, [c, g] = cnv(n), tw = n / 2, th = n / 4;
    for(let j = 0; j < 4; j++) for(let i = 0; i < 2; i++){ g.fillStyle = hsl(rr(30, 40), rr(4, 8), rr(52, 60)); g.fillRect(i * tw + (j % 2) * tw / 2, j * th, tw, th); g.fillRect(i * tw + (j % 2) * tw / 2 - n, j * th, tw, th); }
    noise(g, n, 16, .12); noise(g, n, 64, .07);
    g.fillStyle = 'rgba(40,38,34,.55)'; for(let j = 0; j <= 4; j++) g.fillRect(0, j * th - 1.5, n, 3); for(let j = 0; j < 4; j++) for(let i = 0; i <= 2; i++) g.fillRect(i * tw + (j % 2) * tw / 2 - 1.5, j * th, 3, th);
    TX.pavers = tex(c); }
  { // woven upholstery: 256 px = .5 m (grey, used with colour tints)
    const n = 256, [c, g] = cnv(n); g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, n, n);
    for(let i = 0; i < n; i += 2){ g.fillStyle = `rgba(0,0,0,${rr(.03, .09)})`; g.fillRect(i, 0, 1, n); g.fillStyle = `rgba(255,255,255,${rr(.03, .08)})`; g.fillRect(0, i, n, 1); }
    noise(g, n, 16, .18); TX.fabric = tex(c, 4); }
  { // boucle: nubbly loops, 256 px = .4 m
    const n = 256, [c, g] = cnv(n); g.fillStyle = '#d6d6d6'; g.fillRect(0, 0, n, n);
    for(let i = 0; i < 2600; i++){ const v = rr(150, 255); g.fillStyle = `rgba(${v},${v},${v},.5)`; g.beginPath(); g.arc(rr(0, n), rr(0, n), rr(.8, 2.2), 0, 7); g.fill(); }
    noise(g, n, 32, .2); TX.boucle = tex(c, 4); }
  { // rug: 512 px = 1.6 m, wool with a tonal abstract pattern (tinted per room)
    const n = 512, [c, g] = cnv(n); g.fillStyle = '#d0cbc3'; g.fillRect(0, 0, n, n); noise(g, n, 64, .25); noise(g, n, 128, .18);
    g.strokeStyle = 'rgba(70,64,58,.22)'; for(let i = 0; i < 9; i++){ g.lineWidth = rr(4, 14); g.beginPath(); const y = rr(0, n), a = rr(20, 60); for(let x = -10; x <= n + 10; x += 16) g.lineTo(x, y + Math.sin(x / n * 6.283 * 2 + i) * a); g.stroke(); }
    TX.rug = tex(c, 4); }
  { // lawn, gravel
    let n = 512, [c, g] = cnv(n); g.fillStyle = '#4f6b3a'; g.fillRect(0, 0, n, n); noise(g, n, 32, .35); noise(g, n, 128, .3); TX.grass = tex(c);
    [c, g] = cnv(n); g.fillStyle = '#6a6b6e'; g.fillRect(0, 0, n, n); for(let i = 0; i < 9000; i++){ const v = rr(70, 170); g.fillStyle = `rgb(${v},${v},${v - 6})`; g.fillRect(rr(0, n), rr(0, n), rr(1, 3), rr(1, 3)); } TX.gravel = tex(c); }
  { // dark stone cladding, 1200 × 600 panels: 1024 px = 3.6 m
    const n = 1024, [c, g] = cnv(n), tw = n / 3, th = n / 6;
    for(let j = 0; j < 6; j++) for(let i = 0; i < 3; i++){ g.fillStyle = hsl(rr(26, 34), rr(3, 6), rr(19, 25)); g.fillRect(i * tw, j * th, tw, th); }
    noise(g, n, 16, .22); noise(g, n, 64, .12);
    g.strokeStyle = 'rgba(200,190,175,.08)'; for(let i = 0; i < 30; i++){ g.lineWidth = rr(.5, 1.4); g.beginPath(); let x = rr(0, n), y = rr(0, n); g.moveTo(x, y); for(let k = 0; k < 6; k++){ x += rr(-70, 70); y += rr(-40, 40); g.lineTo(x, y); } g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,.55)'; for(let i = 0; i <= 3; i++) g.fillRect(i * tw - 1, 0, 2, n); for(let j = 0; j <= 6; j++) g.fillRect(0, j * th - 1, n, 2);
    TX.darkStone = tex(c); }
  { // travertine cladding, 1200 × 600 panels: 1024 px = 3.6 m
    const n = 1024, [c, g] = cnv(n), tw = n / 3, th = n / 6;
    for(let j = 0; j < 6; j++) for(let i = 0; i < 3; i++){ g.fillStyle = hsl(rr(34, 40), rr(10, 16), rr(66, 73)); g.fillRect(i * tw + (j % 2) * tw / 2, j * th, tw, th); g.fillRect(i * tw + (j % 2) * tw / 2 - n, j * th, tw, th); }
    noise(g, n, 12, .18); for(let i = 0; i < 260; i++){ g.fillStyle = 'rgba(120,100,80,' + rr(.05, .14) + ')'; g.fillRect(rr(0, n), rr(0, n), rr(8, 40), rr(1, 2.5)); }
    g.fillStyle = 'rgba(90,80,68,.45)'; for(let j = 0; j <= 6; j++) g.fillRect(0, j * th - 1, n, 2); for(let j = 0; j < 6; j++) for(let i = 0; i <= 3; i++) g.fillRect(i * tw + (j % 2) * tw / 2 - 1, j * th, 2, th);
    TX.travertine = tex(c); }
  { // timber slats, 60 mm: 512 px = 1.2 m
    const n = 512, [c, g] = cnv(n), w = n / 20;
    for(let i = 0; i < 20; i++){ g.fillStyle = hsl(rr(24, 30), rr(38, 46), rr(34, 42)); g.fillRect(i * w, 0, w, n); grainLines(g, i * w, 0, w, n, true, 10, '#2a170b'); g.fillStyle = 'rgba(10,6,3,.7)'; g.fillRect(i * w, 0, 2, n); }
    TX.slats = tex(c); }
  { // pegboard, 25 mm hole grid: 256 px = .6 m
    const n = 256, [c, g] = cnv(n); g.fillStyle = '#d9d5ce'; g.fillRect(0, 0, n, n); noise(g, n, 8, .08); g.fillStyle = 'rgba(40,36,32,.75)';
    const k = 24; for(let j = 0; j < k; j++) for(let i = 0; i < k; i++){ g.beginPath(); g.arc((i + .5) * n / k, (j + .5) * n / k, 1.6, 0, 7); g.fill(); } TX.peg = tex(c); }
  { // pool caustics (scrolled every frame)
    const n = 512, [c, g] = cnv(n); g.fillStyle = '#1f7f99'; g.fillRect(0, 0, n, n); noise(g, n, 8, .3);
    g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(170,240,255,.16)';
    for(let i = 0; i < 260; i++){ g.lineWidth = rr(1, 3); g.beginPath(); const x = rr(0, n), y = rr(0, n), r = rr(8, 26); g.ellipse(x, y, r, r * rr(.5, 1), rr(0, 3), 0, rr(2, 6)); g.stroke(); }
    TX.caustic = tex(c); }
  { // soft dot (glows) and light pool (warm light falling on floors and tables)
    const [c, g] = cnv(128), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); TX.dot = new T.CanvasTexture(c);
    const [c2, g2] = cnv(128), id = g2.createImageData(128, 128);
    for(let j = 0; j < 128; j++) for(let i = 0; i < 128; i++){ const d = Math.hypot(i - 63.5, j - 63.5) / 64, a = d >= 1 ? 0 : Math.pow(1 - d * d, 2.2), k = (j * 128 + i) * 4; id.data[k] = id.data[k+1] = id.data[k+2] = 255; id.data[k+3] = a * 255; }
    g2.putImageData(id, 0, 0); TX.pool = new T.CanvasTexture(c2); }
  { // linear fire: soft tongues on black, drawn additively in front of the fire glass
    const [c, g] = cnv(512, 128); g.filter = 'blur(3px)';
    for(let i = 0; i < 70; i++){ const x = rr(10, 502), w = rr(8, 22), h = rr(40, 118), gr = g.createLinearGradient(0, 128, 0, 128 - h);
      gr.addColorStop(0, 'rgba(255,236,190,.95)'); gr.addColorStop(.35, 'rgba(255,150,60,.75)'); gr.addColorStop(1, 'rgba(200,60,10,0)'); g.fillStyle = gr;
      g.beginPath(); g.moveTo(x - w, 128); g.quadraticCurveTo(x - w * .6, 128 - h * .5, x + rr(-6, 6), 128 - h); g.quadraticCurveTo(x + w * .6, 128 - h * .5, x + w, 128); g.fill(); }
    TX.flame = new T.CanvasTexture(c); TX.flame.encoding = T.sRGBEncoding; }
  TX.art = [artWarm(), artTree(), artDusk(), artInk()];
}
/* four abstract canvases for the walls (UV-mapped, not triplanar) */
function artTex(c){ const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t; }
function artWarm(){ const [c, g] = cnv(256, 320); g.fillStyle = '#e6dccb'; g.fillRect(0, 0, 256, 320); noise(g, 256, 8, .12);
  g.fillStyle = '#c08a4a'; g.beginPath(); g.arc(150, 120, 70, 0, 7); g.fill(); g.fillStyle = '#9c4f33'; g.beginPath(); g.ellipse(90, 210, 80, 40, -.4, 0, 7); g.fill();
  g.strokeStyle = '#2b2622'; g.lineWidth = 14; g.lineCap = 'round'; g.beginPath(); g.moveTo(40, 280); g.bezierCurveTo(100, 150, 170, 260, 220, 60); g.stroke(); noise(g, 256, 32, .1); return artTex(c); }
function artTree(){ const [c, g] = cnv(256, 320); const gr = g.createLinearGradient(0, 0, 0, 320); gr.addColorStop(0, '#5a4330'); gr.addColorStop(1, '#2a1f17'); g.fillStyle = gr; g.fillRect(0, 0, 256, 320);
  g.strokeStyle = '#d9b77a'; g.lineCap = 'round';
  const br = (x, y, a, L, w, d) => { if(d > 7 || L < 4) return; const x2 = x + Math.cos(a) * L, y2 = y + Math.sin(a) * L; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
    br(x2, y2, a - rr(.25, .55), L * rr(.68, .8), w * .68, d + 1); br(x2, y2, a + rr(.25, .55), L * rr(.68, .8), w * .68, d + 1); };
  br(128, 300, -Math.PI / 2, 70, 9, 0); g.fillStyle = 'rgba(226,190,120,.5)'; for(let i = 0; i < 260; i++){ const a = rr(0, 6.28), r = rr(0, 95); g.beginPath(); g.arc(128 + Math.cos(a) * r * 1.1, 120 + Math.sin(a) * r * .7, rr(1.5, 4), 0, 7); g.fill(); }
  noise(g, 256, 24, .12); return artTex(c); }
function artDusk(){ const [c, g] = cnv(320, 200); const gr = g.createLinearGradient(0, 0, 0, 200); gr.addColorStop(0, '#3d3140'); gr.addColorStop(.45, '#c98b62'); gr.addColorStop(.62, '#e8c49a'); gr.addColorStop(.63, '#3b3430'); gr.addColorStop(1, '#1d1a18');
  g.fillStyle = gr; g.fillRect(0, 0, 320, 200); g.fillStyle = '#2a2523'; g.beginPath(); g.moveTo(0, 130); for(let x = 0; x <= 320; x += 20) g.lineTo(x, 118 + Math.sin(x * .03) * 10 + rr(-4, 4)); g.lineTo(320, 200); g.lineTo(0, 200); g.fill();
  noise(g, 320, 24, .15); return artTex(c); }
function artInk(){ const [c, g] = cnv(256, 320); g.fillStyle = '#efebe3'; g.fillRect(0, 0, 256, 320); g.strokeStyle = '#1b1a19'; g.lineCap = 'round';
  for(let i = 0; i < 5; i++){ g.lineWidth = rr(2, 9); g.globalAlpha = rr(.5, .95); g.beginPath(); g.moveTo(rr(20, 236), rr(20, 300)); g.bezierCurveTo(rr(0, 256), rr(0, 320), rr(0, 256), rr(0, 320), rr(20, 236), rr(20, 300)); g.stroke(); }
  g.globalAlpha = 1; g.fillStyle = '#a5643f'; g.beginPath(); g.arc(rr(70, 190), rr(80, 240), 16, 0, 7); g.fill(); return artTex(c); }

/* ---------- triplanar mapping: textures follow world metres on any face, merged or not ---------- */
function triplanar(mat, metres){
  mat.userData.tri = 1 / metres;
  mat.customProgramCacheKey = () => 'tri';
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTri = {value:mat.userData.tri};
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vTriP; varying vec3 vTriN;')
      .replace('#include <fog_vertex>', '#include <fog_vertex>\nvTriP = (modelMatrix * vec4(transformed, 1.0)).xyz; vTriN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTriP; varying vec3 vTriN; uniform float uTri;')
      .replace('#include <map_fragment>', `#ifdef USE_MAP
        vec3 tb = pow(abs(normalize(vTriN)), vec3(4.0)); tb /= (tb.x + tb.y + tb.z);
        vec4 sampledDiffuseColor = texture2D(map, vTriP.zy * uTri) * tb.x + texture2D(map, vTriP.xz * uTri) * tb.y + texture2D(map, vTriP.xy * uTri) * tb.z;
        diffuseColor *= sampledDiffuseColor;
      #endif`);
  };
  return mat;
}
const stdM = (o) => new T.MeshStandardMaterial(o);
function texMat(map, metres, {color=0xffffff, rough=.7, metal=0, env=.5}={}){ const m = stdM({map, color:lin(color), roughness:rough, metalness:metal}); m.envMapIntensity = env; return triplanar(m, metres); }
function flat(color, {rough=.7, metal=0, env=.5, emissive, ei=1}={}){ const m = stdM({color:lin(color), roughness:rough, metalness:metal, ...(emissive ? {emissive:lin(emissive), emissiveIntensity:ei} : {})}); m.envMapIntensity = env; return m; }

let MAT = null;
function materials(){
  makeTextures();
  const fab = (c, sc = .5) => texMat(TX.fabric, sc, {color:c, rough:.95, env:.3});
  MAT = {
    oak:texMat(TX.oak, 2.4, {rough:.45, env:.6}), walnut:texMat(TX.walnut, 1.2, {rough:.5}), oakV:texMat(TX.oakV, 1.2, {rough:.5, env:.45}), stone:texMat(TX.stone, 2.4, {rough:.45, env:.6}),
    porcelain:texMat(TX.porcelain, 2.4, {rough:.14, env:.9}), porcelainDark:texMat(TX.porcelain, 2.4, {color:0x6d6965, rough:.28, env:.8}),
    nero:texMat(TX.nero, 2.4, {rough:.2, env:.85}), cabinet:texMat(TX.cabinet, 1.2, {rough:.55, env:.4}),
    marble:texMat(TX.marble, 1.8, {rough:.25, env:.8}), worktop:texMat(TX.worktop, 1.5, {rough:.2, env:.8}), concrete:texMat(TX.concrete, 3, {rough:.45, env:.6}),
    extConc:texMat(TX.extConc, 2.4, {rough:.85}), plaster:texMat(TX.plaster, 2, {rough:.92, env:.35}), pavers:texMat(TX.pavers, 2.4, {rough:.85}),
    grass:texMat(TX.grass, 3, {rough:1, env:.2}), gravel:texMat(TX.gravel, 2, {rough:1, env:.2}),
    linen:fab(0xf2efe8), duvet:fab(0xe4dfd6), sofa:fab(0xb9b0a2), sofaLight:fab(0xcfc7ba), charcoal:fab(0x4a4a4c), olive:fab(0x7d8566), rust:fab(0xa86b4c),
    cinema:fab(0x34363b), greyFab:fab(0x77726c), taupe:fab(0x8c8178),
    boucle:texMat(TX.boucle, .4, {color:0xdcd4c6, rough:1, env:.25}), boucleDark:texMat(TX.boucle, .4, {color:0x6e6862, rough:1, env:.25}),
    rug:texMat(TX.rug, 1.6, {color:0xe2dbd0, rough:1, env:.2}), rugDark:texMat(TX.rug, 1.6, {color:0x6a645e, rough:1, env:.2}), carpet:fab(0x2b2d31, .5),
    ceramic:flat(0xf6f4f0, {rough:.18, env:.9}), bathIn:flat(0xdcdedd, {rough:.1, env:1}), blackMatte:flat(0x1c1d1f, {rough:.55, metal:.2}), metal:flat(0x9a9ea2, {rough:.35, metal:.8, env:.9}),
    steel:flat(0xc6cacd, {rough:.24, metal:.95, env:1.2}), chest:flat(0x2a2c2f, {rough:.38, metal:.6, env:.8}),
    brass:flat(0xb08d57, {rough:.3, metal:.9, env:1}), blkExt:flat(0x2a2c30, {rough:.55, metal:.3}),
    glass:Object.assign(stdM({color:lin(0xc9d6d8), roughness:.05, metalness:.1, transparent:true, opacity:.18, side:T.DoubleSide, depthWrite:false}), {envMapIntensity:1.2}),
    mirror:flat(0xdfe3e4, {rough:.03, metal:1, env:1.4}),
    smoked:flat(0x2c3236, {rough:.15, metal:.4, env:1}), tvGlass:flat(0x0b0c0e, {rough:.06, metal:.5, env:1.3}),
    shade:flat(0xfff1d6, {rough:.9, emissive:0xffc78a, ei:1.6}), bulb:flat(0xfff3dc, {emissive:0xffd29a, ei:4}), led:flat(0xffd9a8, {emissive:0xffc070, ei:2.2}), ledBlue:flat(0x6fb6ff, {emissive:0x4f9dff, ei:2}),
    screen:flat(0xd8d2c8, {rough:.6, emissive:0x5c564e, ei:.6}), equip:flat(0xb3b7ba, {rough:.45, metal:.5}), cnc:flat(0xd9dad7, {rough:.4, metal:.2}),
    robot:flat(0xe8e6e1, {rough:.35}), orange:flat(0xd8762b, {rough:.45}), red:flat(0xb5342b, {rough:.45}), kraft:flat(0x9b7d5a, {rough:.85}),
    water:Object.assign(stdM({map:TX.caustic, color:0xffffff, roughness:.05, metalness:.1, transparent:true, opacity:.9, emissive:lin(0x0e5b6e), emissiveMap:TX.caustic, emissiveIntensity:.6}), {envMapIntensity:1.4}),
    tile:flat(0x0e4452, {rough:.3, emissive:0x072a33, ei:.6}), fire:new T.MeshBasicMaterial({color:new T.Color(2.4, 1.1, .35)}),
    leafA:new T.MeshStandardMaterial({color:lin(0x56713f), roughness:.9, flatShading:true}), leafB:new T.MeshStandardMaterial({color:lin(0x6f8a4e), roughness:.9, flatShading:true}),
    olea:new T.MeshStandardMaterial({color:lin(0x66725a), roughness:.85, flatShading:true}),
    bark:flat(0x4a3b2c, {rough:1}), pot:texMat(TX.concrete, 1, {color:0xd8d4cc, rough:.8}), potDark:texMat(TX.concrete, 1, {color:0x5a5753, rough:.7}),
    car:flat(0x7d8288, {rough:.25, metal:.75, env:1.1}), tyre:flat(0x151515, {rough:.9}),
    court:flat(0x3a5868, {rough:.75}), darkStone:texMat(TX.darkStone, 3.6, {rough:.55, env:.6}), travertine:texMat(TX.travertine, 3.6, {rough:.7, env:.45}), slats:texMat(TX.slats, 1.2, {rough:.6}),
    peg:texMat(TX.peg, .6, {rough:.8}),
    glassLit:Object.assign(stdM({color:lin(0xd8c9b0), roughness:.04, metalness:.2, transparent:true, opacity:.32, side:T.DoubleSide, depthWrite:false, emissive:lin(0x3a2410), emissiveIntensity:.5}), {envMapIntensity:1.6}),
    glow:new T.SpriteMaterial({map:TX.dot, color:new T.Color(1.9, 1.25, .62), transparent:true, depthWrite:false, blending:T.AdditiveBlending}),
    glowSoft:new T.SpriteMaterial({map:TX.dot, color:new T.Color(.9, .58, .28), transparent:true, depthWrite:false, blending:T.AdditiveBlending}),
    pool:new T.MeshBasicMaterial({map:TX.pool, transparent:true, depthWrite:false, blending:T.AdditiveBlending}),
    flame:new T.MeshBasicMaterial({map:TX.flame, color:new T.Color(2.2, 1.3, .6), transparent:true, depthWrite:false, blending:T.AdditiveBlending}),
    gh:Object.assign(stdM({color:lin(0xe4efe9), roughness:.1, transparent:true, opacity:.28, side:T.DoubleSide, depthWrite:false}), {envMapIntensity:1}),
    art:TX.art.map(map => Object.assign(stdM({map, roughness:.85}), {envMapIntensity:.3})),
    film:Object.assign(stdM({map:TX.art[2], color:lin(0x333333), roughness:.9, emissive:0xffffff, emissiveMap:TX.art[2], emissiveIntensity:.75}), {envMapIntensity:.1})
  };
  return MAT;
}
const FLOOR_OF = k => ({sleep:'oak', store:'oak', staff:'oak', live:'porcelain', circ:'porcelain', core:'porcelain', wet:'marble', service:'porcelainDark', garage:'concrete', plant:'concrete'})[k] || 'porcelain';
function floorMat(kind, name){ // a fresh material per room (shares the texture) so a room can be highlighted on its own
  const key = /Cinema/.test(name) ? 'carpet' : /Gym/.test(name) ? 'concrete' : FLOOR_OF(kind);
  const src = MAT[key]; const m = stdM({map:src.map, color:src.color.clone(), roughness:src.roughness, metalness:src.metalness}); m.envMapIntensity = src.envMapIntensity; return triplanar(m, 1 / src.userData.tri);
}

/* ---------- furniture ---------- */
const BACK = {N:'S', S:'N', E:'W', W:'E'};
function makeFurniture(ctx){
  const {P, add} = ctx, CUT = ctx.CUT;
  const geo = new Map(); const rgeo = (w, h, d, r) => { const k = [w, h, d, r].map(v => v.toFixed(3)).join(); if(!geo.has(k)) geo.set(k, new T.RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001))); return geo.get(k); };
  const clampZ = (z1, z2) => [z1, Math.min(z2, CUT)];
  const pool = (x, y, r, i, z, c) => ctx.pool && ctx.pool(x, y, r, i, z, c);
  const room = (x, y) => (ctx.roomAt && ctx.roomAt(x, y)) || null;
  const roomName = (x, y) => (room(x, y) || {n:''}).n;
  function rb(x1, x2, y1, y2, z1, z2, mat, r = .04){ [z1, z2] = clampZ(z1, z2); if(x2 - x1 <= .005 || y2 - y1 <= .005 || z2 - z1 <= .005) return;
    const m = new T.Mesh(r > 0 ? rgeo(x2 - x1, z2 - z1, y2 - y1, r) : new T.BoxGeometry(x2 - x1, z2 - z1, y2 - y1), mat); m.position.copy(P((x1 + x2) / 2, (z1 + z2) / 2, (y1 + y2) / 2)); add(m); return m; }
  function cyl(x, y, r1, r2, z1, z2, mat, seg = 20){ [z1, z2] = clampZ(z1, z2); if(z2 - z1 <= .005) return; const m = new T.Mesh(new T.CylinderGeometry(r1, r2, z2 - z1, seg), mat); m.position.copy(P(x, (z1 + z2) / 2, y)); add(m); return m; }
  function ball(x, y, z, r, mat, sy = 1, det = 2){ if(z + r * sy > CUT) return; const m = new T.Mesh(new T.IcosahedronGeometry(r, det), mat); m.scale.y = sy; m.position.copy(P(x, z, y)); add(m); return m; }
  const leaf = (x, y, z, r, mat) => { const m = ball(x, y, z, r, mat, rr(.6, .85), 1); if(m) m.rotation.set(rr(0, 3), rr(0, 3), rr(0, 3)); return m; };
  /* a cylinder between two plan points [x, y, z] (robot arms, lamp stems) */
  function seg(a, b, r, mat){ if(Math.max(a[2], b[2]) > CUT) return; const A = P(a[0], a[2], a[1]), B = P(b[0], b[2], b[1]);
    const m = new T.Mesh(new T.CylinderGeometry(r, r, A.distanceTo(B), 14), mat); m.position.copy(A).add(B).multiplyScalar(.5);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), B.clone().sub(A).normalize()); add(m); return m; }
  function glow(x, y, z, size, mat = MAT.glowSoft){ if(z > CUT + .05) return; const sp = new T.Sprite(mat); sp.position.copy(P(x, z, y)); sp.scale.set(size, size, 1); add(sp); }
  /* map a local rectangle (u along the piece from its back/head, v across) into plan space */
  function frame(x, y, w, d, side){ const L = (side === 'N' || side === 'S') ? d : w, W = (side === 'N' || side === 'S') ? w : d;
    return {L, W, R:(u1, u2, v1, v2) => side === 'W' ? [x + u1, x + u2, y + v1, y + v2] : side === 'E' ? [x + w - u2, x + w - u1, y + v1, y + v2] : side === 'N' ? [x + v1, x + v2, y + u1, y + u2] : [x + v1, x + v2, y + d - u2, y + d - u1]}; }
  const at = (F, u1, u2, v1, v2, z1, z2, mat, r) => { const [a, b, c, e] = F.R(u1, u2, v1, v2); return rb(a, b, c, e, z1, z2, mat, r); };
  const pt = (F, u, v) => { const [a, , c] = F.R(u, u, v, v); return [a, c]; };
  /* which way a wall-hung run faces: towards the middle of the room it stands in */
  function facing(x, y, w, d){ const cx = x + w / 2, cy = y + d / 2, r = room(cx, cy);
    const q = r && (r.r.find(([a, b, c, e]) => cx >= a - 1e-6 && cx <= a + c + 1e-6 && cy >= b - 1e-6 && cy <= b + e + 1e-6) || r.r[0]);
    if(!q) return w >= d ? 'S' : 'E';
    return w >= d ? (q[1] + q[3] / 2 >= cy ? 'S' : 'N') : (q[0] + q[2] / 2 >= cx ? 'E' : 'W'); }

  function chair(x, y, back, z){ const w = .5; for(const [dx, dy] of [[.05, .05], [w - .08, .05], [.05, w - .08], [w - .08, w - .08]]) rb(x + dx, x + dx + .03, y + dy, y + dy + .03, z, z + .42, MAT.blackMatte, 0);
    rb(x + .01, x + w - .01, y + .01, y + w - .01, z + .4, z + .5, MAT.greyFab, .04);
    const F = frame(x, y, w, w, back); at(F, 0, .07, .02, w - .02, z + .46, z + .92, MAT.greyFab, .03); }
  function lamp(x, y, z){ cyl(x, y, .06, .08, z, z + .3, MAT.brass); cyl(x, y, .13, .16, z + .3, z + .52, MAT.shade); glow(x, y, z + .42, .9); pool(x, y, 1.3, .32, .045); }
  function plant(x, y, d, z, tall = 1){ cyl(x, y, d / 2, d / 2 * .82, z, z + .55, MAT.pot, 24);
    for(let i = 0; i < 16; i++){ const r = d * rr(.12, .22); leaf(x + rr(-.3, .3) * d, y + rr(-.3, .3) * d, z + .55 + rr(.15, 1.0) * d * tall, r, rnd() < .5 ? MAT.leafA : MAT.leafB); } }
  /* an olive tree in a tall pot: trunk, a few limbs and a cloud of small leaf clusters */
  function olive(x, y, d, z){ cyl(x, y, d / 2, d / 2 * .86, z, z + .62, MAT.potDark, 28); cyl(x, y, d / 2 - .03, d / 2 - .03, z + .62, z + .64, MAT.bark, 24);
    const top = Math.min(CUT - .1, z + 2.3), base = [x, y, z + .64], fork = [x + rr(-.08, .08), y + rr(-.08, .08), z + 1.1]; seg(base, fork, .045, MAT.bark);
    for(let i = 0; i < 4; i++){ const a = i * 1.6 + rr(0, .8), e = [x + Math.cos(a) * .32, y + Math.sin(a) * .32, Math.min(top - .2, z + rr(1.4, 1.7))]; seg(fork, e, .025, MAT.bark);
      for(let k = 0; k < 14; k++) leaf(e[0] + rr(-.3, .3), e[1] + rr(-.3, .3), Math.min(top - .1, e[2] + rr(-.12, .3)), rr(.07, .13), rnd() < .65 ? MAT.olea : MAT.leafA); } }
  function books(x, y, along, z, len){ let p = 0; while(p < len - .05){ const t = rr(.03, .06), h = rr(.18, .27); const m = pickR([MAT.rust, MAT.sofaLight, MAT.charcoal, MAT.olive, MAT.taupe]);
      along ? rb(x + p, x + p + t, y, y + .2, z, z + h, m, 0) : rb(x, x + .2, y + p, y + p + t, z, z + h, m, 0); p += t + .003; if(rnd() < .12) p += rr(.08, .2); } }

  /* ---- kitchens, workshops and bars: runs of joinery against a wall ---- */
  function tallKitchen(F, z){ const D = F.L, Lw = F.W, top = z + 2.3;
    const f2 = Math.min(.92, Lw * .2);                                                                          // fridge-freezer
    at(F, 0, D, 0, f2, z, z + 2.0, MAT.steel, .01); at(F, 0, D, 0, f2, z + 2.0, top, MAT.cabinet, 0);
    at(F, D, D + .006, f2 / 2 - .004, f2 / 2 + .004, z + .05, z + 1.96, MAT.blackMatte, 0);
    for(const sg of [-1, 1]) at(F, D + .02, D + .045, f2 / 2 + sg * .07 - .012, f2 / 2 + sg * .07 + .012, z + .85, z + 1.6, MAT.steel, .006);
    at(F, D, D + .008, .12, .32, z + 1.12, z + 1.42, MAT.tvGlass, 0);
    const o1 = f2 + .01, o2 = o1 + .62;                                                                        // oven tower
    at(F, 0, D, o1, o2, z, top, MAT.cabinet, 0);
    for(const [a, b] of [[.78, 1.36], [1.4, 1.98]]){ at(F, D, D + .012, o1 + .02, o2 - .02, z + a, z + b, MAT.steel, .004); at(F, D + .012, D + .018, o1 + .06, o2 - .06, z + a + .08, z + b - .1, MAT.tvGlass, 0); at(F, D + .03, D + .05, o1 + .08, o2 - .08, z + b - .06, z + b - .04, MAT.steel, .008); }
    const n1 = o2 + .01, n2 = Lw - .62;                                                                        // niche: base run, marble splash, lit shelves
    at(F, .03, D - .06, n1, n2, z, z + .1, MAT.blackMatte, 0); at(F, 0, D, n1, n2, z + .1, z + .86, MAT.cabinet, .005); at(F, 0, D + .02, n1, n2, z + .86, z + .9, MAT.worktop, .004);
    at(F, 0, .03, n1, n2, z + .9, top, MAT.nero, 0);
    for(const h of [1.48, 1.86]){ at(F, .03, .34, n1, n2, z + h, z + h + .03, MAT.walnut, 0); at(F, .26, .31, n1 + .05, n2 - .05, z + h - .008, z + h, MAT.led, 0);
      for(let v = n1 + .15; v < n2 - .12; v += rr(.16, .3)){ const [px, py] = pt(F, rr(.12, .22), v); cyl(px, py, rr(.035, .06), rr(.035, .06), z + h + .03, z + h + .03 + rr(.1, .26), pickR([MAT.ceramic, MAT.smoked, MAT.brass, MAT.oakV]), 14); } }
    pool(...pt(F, .5, (n1 + n2) / 2), .9, .25, z + .905);
    { const [px, py] = pt(F, .3, n1 + .4); rb(px - .17, px + .17, py - .15, py + .15, z + .9, z + 1.25, MAT.steel, .03); }                      // coffee machine
    { const [px, py] = pt(F, .3, n2 - .45); cyl(px, py, .07, .06, z + .9, z + 1.15, MAT.ceramic, 18); for(let i = 0; i < 5; i++) ball(px + rr(-.1, .1), py + rr(-.1, .1), z + 1.2 + rr(0, .18), rr(.06, .1), MAT.leafA); }
    at(F, 0, D, n2 + .01, Lw, z, top, MAT.cabinet, 0); at(F, D, D + .02, Lw - .08, Lw - .06, z + .9, z + 1.4, MAT.steel, 0);                     // larder
  }
  function baseRun(F, z, o){ const D = F.L, Lw = F.W;
    at(F, .03, D - .06, 0, Lw, z, z + .1, MAT.blackMatte, 0); at(F, 0, D, 0, Lw, z + .1, z + .86, MAT.cabinet, .005); at(F, 0, D + .02, -.01, Lw + .01, z + .86, z + .9, MAT.worktop, .004);
    if(o === 'hob'){ at(F, D * .15, D * .85, Lw * .3, Lw * .7, z + .9, z + .905, MAT.tvGlass, 0); }
    if(o === 'sink'){ at(F, .12, D - .1, Lw * .25, Lw * .25 + .6, z + .9, z + .905, MAT.blackMatte, 0); const [px, py] = pt(F, .06, Lw * .25 + .3); cyl(px, py, .015, .015, z + .9, z + 1.2, MAT.steel, 8); }
    if(o === 'plain' && Lw > 1.4){ const [px, py] = pt(F, D / 2, Lw * .7); cyl(px, py, .08, .06, z + .9, z + 1.2, MAT.ceramic, 18); ball(px, py, z + 1.3, .12, MAT.leafB); lampAt(F, D / 2, Lw * .25, z + .9); }
  }
  function lampAt(F, u, v, z){ const [px, py] = pt(F, u, v); cyl(px, py, .05, .07, z, z + .28, MAT.ceramic); cyl(px, py, .11, .14, z + .28, z + .46, MAT.shade); glow(px, py, z + .38, .8); pool(px, py, 1.1, .22, .045); }
  function chestRun(F, z){ const D = F.L, Lw = F.W, n = Math.max(1, Math.round(Lw / .76)), cw = Lw / n;
    for(let i = 0; i < n; i++){ const v1 = i * cw + .01, v2 = (i + 1) * cw - .01;
      at(F, .02, D - .02, v1, v2, z, z + .1, MAT.blackMatte, 0); at(F, 0, D, v1, v2, z + .1, z + .86, MAT.chest, .006);
      for(const h of [.3, .46, .58, .68, .77]){ at(F, D, D + .004, v1 + .02, v2 - .02, z + h - .004, z + h, MAT.blackMatte, 0); at(F, D + .004, D + .02, v1 + .08, v2 - .08, z + h + .03, z + h + .045, MAT.steel, 0); } }
    at(F, 0, D + .03, 0, Lw, z + .86, z + .93, MAT.oakV, .006);
    for(let v = .2; v < Lw - .3; v += rr(.6, 1.1)){ const [px, py] = pt(F, rr(.15, D - .15), v), k = rnd();
      if(k < .35) rb(px - .2, px + .2, py - .12, py + .12, z + .93, z + 1.13, MAT.red, .02);
      else if(k < .65) rb(px - .1, px + .1, py - .1, py + .1, z + .93, z + 1.25, MAT.blackMatte, .02);
      else cyl(px, py, .09, .09, z + .93, z + 1.05, MAT.steel, 16); } }
  function workbench(x, y, w, d, z){ const along = w >= d, F = frame(x, y, w, d, along ? 'N' : 'W'), D = F.L, Lw = F.W;
    for(const [u1, u2] of [[.02, D / 2 - .01], [D / 2 + .01, D - .02]]){ const n = Math.max(1, Math.round(Lw / .76)), cw = (Lw - .1) / n;
      for(let i = 0; i < n; i++){ const v1 = .05 + i * cw + .01, v2 = .05 + (i + 1) * cw - .01; at(F, u1, u2, v1, v2, z + .1, z + .86, MAT.chest, .006);
        for(const h of [.36, .56, .72]){ const uf = u1 < D / 2 ? u1 - .004 : u2, ub = u1 < D / 2 ? u1 : u2 + .004; at(F, uf, ub, v1 + .02, v2 - .02, z + h - .004, z + h, MAT.blackMatte, 0); } } }
    at(F, .06, D - .06, .08, Lw - .08, z, z + .1, MAT.blackMatte, 0); at(F, -.03, D + .03, -.03, Lw + .03, z + .86, z + .95, MAT.oakV, .008);
    { const [px, py] = pt(F, D * .25, Lw - .25); rb(px - .12, px + .12, py - .1, py + .1, z + .95, z + 1.1, MAT.metal, .02); }                       // vice
    { const [px, py] = pt(F, D / 2, Lw * .4); cyl(px, py, .2, .14, z + .95, z + 1.03, MAT.blackMatte, 22); for(let i = 0; i < 6; i++) rb(px + rr(-.12, .1), px + rr(.02, .14), py + rr(-.12, .1), py + rr(.02, .1), z + 1.02, z + 1.05, MAT.steel, 0); }
    pool(x + w / 2, y + d / 2, Math.max(w, d) * .5, .22, z + .955); }
  function kIsland(x, y, w, d, z){
    rb(x + .06, x + w - .06, y + .06, y + d - .32, z, z + .07, MAT.blackMatte, 0); rb(x + .02, x + w - .02, y + .02, y + d - .3, z + .07, z + .87, MAT.oakV, .01);
    rb(x, x + w, y, y + d, z + .87, z + .93, MAT.worktop, .012); rb(x, x + .06, y, y + d, z, z + .87, MAT.worktop, .006); rb(x + w - .06, x + w, y, y + d, z, z + .87, MAT.worktop, .006);
    rb(x + w * .18, x + w * .18 + .7, y + d / 2 - .25, y + d / 2 + .15, z + .93, z + .934, MAT.blackMatte, 0); cyl(x + w * .18 + .35, y + .14, .016, .016, z + .93, z + 1.24, MAT.blackMatte, 8);
    rb(x + w * .18 + .34, x + w * .18 + .36, y + .14, y + .34, z + 1.22, z + 1.24, MAT.blackMatte, 0);
    rb(x + w * .62 - .06, x + w * .62 + .36, y + d / 2 - .27, y + d / 2 + .27, z + .93, z + .934, MAT.tvGlass, 0);
    cyl(x + w * .88, y + d * .4, .17, .1, z + .93, z + 1.0, MAT.blackMatte, 24); for(let i = 0; i < 5; i++) ball(x + w * .88 + rr(-.08, .08), y + d * .4 + rr(-.08, .08), z + 1.03, .045, MAT.orange);
    cyl(x + w * .08 + .1, y + d * .35, .07, .06, z + .93, z + 1.2, MAT.ceramic, 18); for(let i = 0; i < 6; i++) ball(x + w * .08 + .1 + rr(-.12, .12), y + d * .35 + rr(-.12, .12), z + 1.25 + rr(0, .2), rr(.05, .09), MAT.leafA);
  }

  /* ---- machines in the engineering lab ---- */
  function cncMachine(x, y, w, d, z){ const F = frame(x, y, w, d, BACK[facing(x, y, w, d)]), D = F.L, Lv = F.W;
    at(F, 0, D, 0, Lv, z, z + .82, MAT.chest, .02); at(F, .02, D - .02, .02, Lv - .02, z + .82, z + 1.92, MAT.cnc, .04);
    at(F, D - .02, D + .006, .15, Lv - .5, z + .98, z + 1.74, MAT.smoked, .01); at(F, .01, D - .01, .01, Lv - .01, z + 1.78, z + 1.83, MAT.orange, 0);
    at(F, .25, D - .25, .006, .03, z + 1.0, z + 1.6, MAT.smoked, 0); at(F, .25, D - .25, Lv - .03, Lv - .006, z + 1.0, z + 1.6, MAT.smoked, 0);
    at(F, .15, D - .15, .15, Lv - .15, z + 1.92, z + 1.97, MAT.chest, .01);
    at(F, D - .1, D + .07, Lv - .42, Lv - .08, z + 1.18, z + 1.76, MAT.blackMatte, .02); at(F, D + .07, D + .074, Lv - .38, Lv - .12, z + 1.46, z + 1.68, MAT.screen, 0); }
  function robotArm(x, y, w, d, z){ const cx = x + w / 2, cy = y + d / 2; rb(x + .1, x + w - .1, y + .1, y + d - .1, z, z + .74, MAT.chest, .02); rb(x + .08, x + w - .08, y + .08, y + d - .08, z + .74, z + .78, MAT.steel, .01);
    cyl(cx, cy, .2, .24, z + .78, z + .98, MAT.robot, 28); ball(cx, cy, z + 1.06, .13, MAT.orange);
    const el = [cx + .22, cy - .14, z + 1.6], wr = [cx + .55, cy - .02, z + 1.36];
    seg([cx, cy, z + 1.06], el, .075, MAT.robot); ball(...el.slice(0, 2), el[2], .095, MAT.orange); seg(el, wr, .06, MAT.robot); ball(wr[0], wr[1], wr[2], .07, MAT.orange);
    seg(wr, [wr[0] + .05, wr[1], wr[2] - .16], .035, MAT.blackMatte); rb(wr[0] + .01, wr[0] + .09, wr[1] - .06, wr[1] + .06, wr[2] - .26, wr[2] - .18, MAT.blackMatte, .01); }

  function furn(it, z){ const t = it[0];
    switch(t){
      case 'bedK': case 'bedS': { const [, x, y, w, d, hd] = it; const F = frame(x, y, w, d, hd), L = F.L, W = F.W;
        at(F, 0, L, 0, W, z + .08, z + .32, MAT.boucleDark, .03); at(F, .06, L - .06, .06, W - .06, z, z + .08, MAT.blackMatte, 0);
        at(F, .04, L - .04, .05, W - .05, z + .32, z + .56, MAT.linen, .07);
        at(F, .55, L - .02, -.03, W + .03, z + .5, z + .62, MAT.duvet, .06); at(F, L * .68, L * .9, -.05, W + .05, z + .6, z + .66, MAT.charcoal, .025);
        const n = t === 'bedK' ? 2 : 1; for(let i = 0; i < n; i++){ const v1 = .1 + i * (W - .2) / n, v2 = v1 + (W - .2) / n - .06; at(F, .08, .5, v1, v2, z + .55, z + .76, MAT.linen, .08); at(F, .4, .62, v1 + .08, v2 - .08, z + .56, z + .72, i ? MAT.taupe : MAT.sofaLight, .07); }
        at(F, -.1, 0, -.18, W + .18, z, z + 1.2, MAT.boucleDark, .05); return; }
      case 'ns': { const [, x, y] = it; rb(x, x + .5, y, y + .45, z, z + .5, MAT.walnut, .02); rb(x + .04, x + .46, y + .44, y + .452, z + .3, z + .32, MAT.brass, 0); lamp(x + .25, y + .22, z + .5); return; }
      case 'sofa': { const [, x, y, w, d, bk] = it; const F = frame(x, y, w, d, bk), D = F.L, Lv = F.W, ch = Lv >= 4 ? 1.75 : 0, end = ch ? Lv - .95 : Lv - .22;
        at(F, .06, D - .06, .06, Lv - .06, z, z + .08, MAT.blackMatte, 0);
        at(F, 0, D, 0, ch ? Lv - .95 : Lv, z + .08, z + .36, MAT.boucle, .05); at(F, 0, .24, 0, Lv, z + .36, z + .7, MAT.boucle, .08);
        at(F, 0, D, 0, .22, z + .08, z + .58, MAT.boucle, .07); if(!ch) at(F, 0, D, Lv - .22, Lv, z + .08, z + .58, MAT.boucle, .07);
        if(ch){ at(F, 0, ch, Lv - .95, Lv, z + .08, z + .36, MAT.boucle, .05); at(F, .24, ch - .03, Lv - .93, Lv - .2, z + .36, z + .5, MAT.boucle, .08); at(F, 0, ch, Lv - .2, Lv, z + .08, z + .56, MAT.boucle, .07); }
        const n = Math.max(1, Math.round((end - .22) / .9)); for(let i = 0; i < n; i++){ const v1 = .23 + i * (end - .23) / n, v2 = v1 + (end - .23) / n - .02;
          at(F, .24, D - .03, v1, v2, z + .36, z + .5, MAT.boucle, .08); at(F, .2, .42, v1, v2, z + .44, z + .86, MAT.boucle, .1); }
        const cm = [MAT.charcoal, MAT.taupe, MAT.rust]; for(let i = 0; i < 3; i++){ const v = .3 + i * (end - .8) / 2; at(F, .4, .54, v, v + .44, z + .5, z + .9, cm[i], .08); }
        at(F, .08, D - .12, .02, .3, z + .58, z + .61, MAT.charcoal, .02); return; }
      case 'armchair': { const [, x, y] = it; rb(x + .06, x + .79, y + .06, y + .79, z, z + .06, MAT.blackMatte, 0); rb(x, x + .85, y, y + .85, z + .06, z + .4, MAT.charcoal, .07); rb(x + .12, x + .73, y + .15, y + .82, z + .38, z + .5, MAT.greyFab, .07);
        rb(x, x + .85, y, y + .16, z + .38, z + .82, MAT.charcoal, .07); rb(x, x + .12, y, y + .85, z + .38, z + .6, MAT.charcoal, .05); rb(x + .73, x + .85, y, y + .85, z + .38, z + .6, MAT.charcoal, .05); return; }
      case 'chair': chair(it[1], it[2], 'S', z); return; // every loose chair in the plans sits south of its desk
      case 'seat': { const [, x, y] = it;  // home-cinema recliner facing the screen to the west
        rb(x + .04, x + .9, y + .04, y + .91, z, z + .08, MAT.blackMatte, 0); rb(x, x + .95, y, y + .95, z + .08, z + .42, MAT.cinema, .07);
        rb(x + .06, x + .74, y + .12, y + .83, z + .42, z + .54, MAT.cinema, .08); rb(x + .72, x + .95, y + .04, y + .91, z + .42, z + 1.02, MAT.cinema, .09);
        rb(x + .02, x + .82, y, y + .12, z + .42, z + .66, MAT.cinema, .05); rb(x + .02, x + .82, y + .83, y + .95, z + .42, z + .66, MAT.cinema, .05);
        rb(x - .01, x + .01, y + .12, y + .83, z + .02, z + .05, MAT.led, 0); return; }
      case 'stool': { const [, x, y] = it; rb(x - .21, x + .21, y - .2, y + .2, z + .66, z + .76, MAT.greyFab, .04); rb(x - .2, x + .2, y + .14, y + .2, z + .76, z + 1.0, MAT.greyFab, .03);
        for(const [dx, dy] of [[-.15, -.15], [.15, -.15], [-.15, .15], [.15, .15]]) seg([x + dx * .8, y + dy * .8, z + .66], [x + dx, y + dy, z], .012, MAT.blackMatte); rb(x - .16, x + .16, y - .17, y - .15, z + .25, z + .27, MAT.blackMatte, 0); return; }
      case 'stable': cyl(it[1], it[2], it[3], it[3], z + .44, z + .48, MAT.nero, 28); cyl(it[1], it[2], .05, .05, z, z + .44, MAT.blackMatte, 12); cyl(it[1], it[2], it[3] * .6, it[3] * .6, z, z + .02, MAT.blackMatte, 24); return;
      case 'filter': cyl(it[1], it[2], it[3], it[3], z, z + 1.5, MAT.metal, 20); return;
      case 'ctable': { const [, x, y, w, d] = it; rb(x + .08, x + w - .08, y + .08, y + d - .08, z, z + .06, MAT.blackMatte, 0); rb(x, x + w, y, y + d, z + .06, z + .36, MAT.nero, .02);
        if(w > 1 || d > 1){ const cx = x + w * .3, cy = y + d / 2; rb(cx - .16, cx + .16, cy - .12, cy + .12, z + .36, z + .4, MAT.sofaLight, .005); rb(cx - .13, cx + .13, cy - .1, cy + .1, z + .4, z + .43, MAT.rust, .005);
          cyl(x + w * .7, y + d / 2, .14, .08, z + .36, z + .43, MAT.ceramic, 22); ball(x + w * .52, y + d * .3, z + .45, .06, MAT.leafB); } return; }
      case 'table': case 'dtable': { const [, x, y, w, d, n] = it; rb(x, x + w, y, y + d, z + .72, z + .76, MAT.oakV, .015);
        rb(x + .25, x + .35, y + .1, y + d - .1, z, z + .72, MAT.blackMatte, 0); rb(x + w - .35, x + w - .25, y + .1, y + d - .1, z, z + .72, MAT.blackMatte, 0);
        if(t === 'dtable'){ const side = Math.max(1, Math.floor((n - 2) / 2)); for(let i = 0; i < side; i++){ const cx = x + w * (i + .5) / side - .25; chair(cx, y - .62, 'N', z); chair(cx, y + d + .12, 'S', z); }
          if(n > side * 2){ chair(x - .62, y + d / 2 - .25, 'W', z); chair(x + w + .12, y + d / 2 - .25, 'E', z); }
          cyl(x + w / 2, y + d / 2, .1, .07, z + .76, z + .96, MAT.ceramic, 18); for(let i = 0; i < 5; i++) ball(x + w / 2 + rr(-.1, .1), y + d / 2 + rr(-.1, .1), z + 1.0 + rr(0, .14), rr(.05, .08), MAT.olea); } return; }
      case 'desk': { const [, x, y, w, d] = it; rb(x, x + w, y, y + d, z + .72, z + .76, MAT.walnut, .01); rb(x, x + .04, y, y + d, z, z + .72, MAT.walnut, 0); rb(x + w - .04, x + w, y, y + d, z, z + .72, MAT.walnut, 0);
        if(/Office|Lab/.test(roomName(x + w / 2, y + d / 2)) && w > 1.6){ const F = frame(x, y, w, d, BACK[facing(x, y, w, d)]); at(F, .08, .12, w / 2 - .45, w / 2 + .45, z + .86, z + 1.36, MAT.tvGlass, .01); at(F, .1, .14, w / 2 - .05, w / 2 + .05, z + .76, z + .88, MAT.blackMatte, 0); at(F, .35, .5, w / 2 - .22, w / 2 + .22, z + .76, z + .78, MAT.blackMatte, .005); }
        lamp(x + w - .2, y + .2, z + .76); return; }
      case 'rug': { const [, x, y, w, d] = it; const r = room(x + w / 2, y + d / 2); rb(x, x + w, y, y + d, z, z + .018, r && r.k === 'sleep' ? MAT.rug : MAT.rugDark, .005); return; }
      case 'wardrobe': { const [, x, y, w, d] = it; rb(x, x + w, y, y + d, z, z + 2.3, MAT.walnut, .01);
        const along = w > d; const n = Math.max(1, Math.round((along ? w : d) / .6)); for(let i = 1; i < n; i++){ const p = (along ? x : y) + (along ? w : d) * i / n; along ? rb(p - .006, p + .006, y - .005, y + d + .005, z + .02, z + 2.3, MAT.blackMatte, 0) : rb(x - .005, x + w + .005, p - .006, p + .006, z + .02, z + 2.3, MAT.blackMatte, 0); } return; }
      case 'shelf': { const [, x, y, w, d] = it; const nm = roomName(x + w / 2, y + d / 2), along = w > d, len = along ? w : d;
        if(/Workshop|Lab|Storage|Garage|Plant|Server|Equipment/.test(nm)){ for(let h = .02; h < 2.1; h += .5) rb(x, x + w, y, y + d, z + h, z + h + .025, MAT.chest, 0);
          for(const [a, b] of [[0, .04], [len - .04, len]]) along ? rb(x + a, x + b, y, y + d, z, z + 2.1, MAT.blackMatte, 0) : rb(x, x + w, y + a, y + b, z, z + 2.1, MAT.blackMatte, 0);
          for(let h = .045; h < 2.0; h += .5) for(let p = .06; p < len - .35; p += rr(.34, .5)){ if(rnd() < .2) continue; const m = rnd() < .1 ? MAT.orange : pickR([MAT.blackMatte, MAT.equip, MAT.chest, MAT.kraft]), bh = rr(.16, .3), bd = Math.min(.32, (along ? d : w) - .08);
            along ? rb(x + p, x + p + .3, y + .04, y + .04 + bd, z + h + .025, z + h + .025 + bh, m, .012) : rb(x + .04, x + .04 + bd, y + p, y + p + .3, z + h + .025, z + h + .025 + bh, m, .012); }
          return; }
        if(/Pantry|Wine/.test(nm)){ for(let h = .02; h < 2.1; h += .4) rb(x, x + w, y, y + d, z + h, z + h + .025, MAT.walnut, 0);
          for(let h = .045; h < 2.0; h += .4) for(let p = .08; p < len - .1; p += rr(.09, .16)){ const r = rr(.035, .06), hh = rr(.12, .28), m = pickR([MAT.ceramic, MAT.smoked, MAT.kraft, MAT.glass]);
            along ? cyl(x + p, y + d / 2, r, r, z + h, z + h + hh, m, 12) : cyl(x + w / 2, y + p, r, r, z + h, z + h + hh, m, 12); }
          return; }
        for(let h = .02; h < 2.1; h += .38){ rb(x, x + w, y, y + d, z + h, z + h + .03, MAT.walnut, 0); if(h > .3) along ? rb(x + .05, x + w - .05, y + d - .04, y + d - .02, z + h - .006, z + h, MAT.led, 0) : rb(x + w - .04, x + w - .02, y + .05, y + d - .05, z + h - .006, z + h, MAT.led, 0); }
        rb(x, x + .03, y, y + d, z, z + 2.1, MAT.blackMatte, 0); rb(x + w - .03, x + w, y, y + d, z, z + 2.1, MAT.blackMatte, 0);
        for(let h = .43; h < 2.0; h += .38){ if(rnd() < .55) along ? books(x + .08, y + (d - .2) / 2, true, z + h, w - .16) : books(x + (w - .2) / 2, y + .08, false, z + h, d - .16);
          else { const p = rr(.15, len - .2); along ? cyl(x + p, y + d / 2, .06, .05, z + h, z + h + rr(.12, .26), pickR([MAT.ceramic, MAT.blackMatte, MAT.brass]), 16) : cyl(x + w / 2, y + p, .06, .05, z + h, z + h + rr(.12, .26), pickR([MAT.ceramic, MAT.blackMatte, MAT.brass]), 16); } }
        return; }
      case 'counter': { const [, x, y, w, d, o] = it; const nm = roomName(x + w / 2, y + d / 2), F = frame(x, y, w, d, BACK[facing(x, y, w, d)]);
        if(o === 'tall'){ if(/Kitchen/.test(nm) && F.W >= 3.5) tallKitchen(F, z); else rb(x, x + w, y, y + d, z, z + 2.3, MAT.cabinet, .01); return; }
        if(/Workshop|Lab/.test(nm)) chestRun(F, z); else baseRun(F, z, o);
        return; }
      case 'counterOut': { const [, x, y, w, d] = it; rb(x, x + w, y, y + d, z, z + .86, MAT.blackMatte, .01); rb(x - .02, x + w + .02, y - .02, y + d + .02, z + .86, z + .92, MAT.worktop, .005); return; }
      case 'island': { const [, x, y, w, d] = it; const nm = roomName(x + w / 2, y + d / 2);
        if(/Workshop|Lab/.test(nm)) return workbench(x, y, w, d, z);
        if(/Closet/.test(nm)){ rb(x, x + w, y, y + d, z, z + .9, MAT.walnut, .01); rb(x - .02, x + w + .02, y - .02, y + d + .02, z + .9, z + .94, MAT.smoked, .005); return; }
        return kIsland(x, y, w, d, z); }
      case 'media': { const [, x, y, w, d] = it; rb(x, x + w, y, y + d, z + .2, z + .55, MAT.walnut, .01); const a = w > d; a ? rb(x + .1, x + w - .1, y + d / 2 - .02, y + d / 2 + .02, z + .6, z + 1.8, MAT.tvGlass, .01) : rb(x + w / 2 - .02, x + w / 2 + .02, y + .1, y + d - .1, z + .6, z + 1.8, MAT.tvGlass, .01); return; }
      case 'bath': { const [, x, y, w, d] = it; rb(x, x + w, y, y + d, z, z + .56, MAT.ceramic, .18); rb(x + .1, x + w - .1, y + .1, y + d - .1, z + .5, z + .52, MAT.bathIn, .1); return; }
      case 'vanity': { const [, x, y, w, d, side] = it; rb(x, x + w, y, y + d, z + .45, z + .82, MAT.walnut, .01); rb(x - .01, x + w + .01, y - .01, y + d + .01, z + .82, z + .86, MAT.worktop, .005);
        const a = w > d, n = (a ? w : d) > 1.4 ? 2 : 1; for(let i = 0; i < n; i++){ const p = (i + .5) / n; const bx = a ? x + w * p : x + w / 2, by = a ? y + d / 2 : y + d * p; rb(bx - .22, bx + .22, by - .17, by + .17, z + .86, z + 1.0, MAT.ceramic, .06); }
        const M = {S:[x + .05, x + w - .05, y + d, y + d + .02], N:[x + .05, x + w - .05, y - .02, y], E:[x + w, x + w + .02, y + .05, y + d - .05], W:[x - .02, x, y + .05, y + d - .05]}[side];
        if(M){ const [a1, a2, b1, b2] = M; rb(a1 - .015, a2 + .015, b1, b2, z + 1.03, z + 1.87, MAT.led, 0); const g = side === 'S' ? -.006 : side === 'N' ? .006 : 0, gx = side === 'E' ? -.006 : side === 'W' ? .006 : 0;
          rb(a1 + gx, a2 + gx, b1 + g, b2 + g, z + 1.05, z + 1.85, MAT.mirror, 0); }
        pool(x + w / 2, y + d / 2, 1.2, .2, .045); return; }
      case 'basin': { const [, x, y] = it; rb(x - .25, x + .25, y - .22, y + .22, z + .78, z + .92, MAT.ceramic, .06); cyl(x, y, .06, .06, z, z + .78, MAT.ceramic, 16); return; }
      case 'wc': { const [, x, y] = it; rb(x - .19, x + .19, y - .3, y + .3, z, z + .42, MAT.ceramic, .14); rb(x - .2, x + .2, y - .32, y - .14, z + .3, z + .82, MAT.ceramic, .05); return; }
      case 'shower': { const [, x, y, w, d] = it; rb(x, x + w, y, y + d, z, z + .03, MAT.marble, 0); rb(x, x + w, y + d - .02, y + d, z, z + 2.1, MAT.glass, 0); rb(x, x + w, y + d - .025, y + d + .005, z + 2.06, z + 2.1, MAT.blackMatte, 0); return; }
      case 'lounger': { const [, x, y] = it; rb(x, x + 2, y, y + .72, z + .12, z + .3, MAT.ceramic, .04); rb(x + .45, x + 2, y + .04, y + .68, z + .3, z + .38, MAT.linen, .05);
        const b = rb(x, x + .55, y + .04, y + .68, z + .3, z + .38, MAT.linen, .05); if(b){ b.rotation.z = -.55; b.position.y += .2; b.position.x += .05; } return; }
      case 'bench': { const [, x, y, w, d] = it; rb(x, x + w, y, y + d, z, z + .42, MAT.pavers, .02); return; }
      case 'fire': { const [, x, y, w, d] = it; rb(x, x + w, y, y + d, z - .05, z + .02, MAT.blackMatte, 0); rb(x + .05, x + w - .05, y + .08, y + d - .08, z + .02, z + .1, MAT.fire, 0); return; }
      case 'equip': { const [, x, y, w, d, l] = it;
        if(l === 'CNC') return cncMachine(x, y, w, d, z); if(l === 'ROBOT') return robotArm(x, y, w, d, z);
        rb(x, x + w, y, y + d, z, z + 1.9, MAT.equip, .02); rb(x + .1, x + Math.min(w, .6), y - .005, y + .01, z + 1.1, z + 1.4, MAT.blackMatte, 0); return; }
      case 'rack': { const [, x, y, w, d] = it; rb(x, x + w, y, y + d, z, z + 2, MAT.blackMatte, .01); for(let h = .2; h < 1.3; h += .12) rb(x + .05, x + w - .05, y - .005, y + .005, z + h, z + h + .01, MAT.ledBlue, 0); return; }
      case 'treadmill': { const [, x, y, w, d] = it; rb(x, x + w, y, y + d, z, z + .22, MAT.blackMatte, .04); rb(x + .1, x + w - .1, y + .3, y + d - .1, z + .22, z + .24, MAT.charcoal, 0); rb(x + .05, x + w - .05, y, y + .12, z, z + 1.25, MAT.blackMatte, .02); return; }
      case 'screen': { const [, x, y, w, d] = it; const top = Math.min(CUT, z + 2.6), m = new T.Mesh(new T.BoxGeometry(w, top - z - .35, d), MAT.film);   // a still on the screen
        m.position.copy(P(x + w / 2, (z + .35 + top) / 2, y + d / 2)); m.userData.keep = 1; add(m); rb(x - .02, x + w + .02, y - .06, y + d + .06, z + .3, z + .35, MAT.blackMatte, 0);
        rb(x - .02, x + w + .1, y - .05, y + d + .05, z, z + .03, MAT.led, 0); return; }
      case 'mat': { const [, x, y, w, d] = it; rb(x, x + w, y, y + d, z, z + .015, MAT.charcoal, .005); return; }
      case 'wd': { const [, x, y] = it; rb(x, x + .62, y, y + .6, z, z + .85, MAT.ceramic, .03); return; }
      case 'car': { const [, x, y, w, d] = it; const along = w > d, L = along ? w : d, W = along ? d : w; const F = frame(x, y, w, d, along ? 'W' : 'N');
        at(F, .05, L - .05, .02, W - .02, z + .25, z + .78, MAT.car, .22); at(F, L * .3, L * .82, .12, W - .12, z + .75, z + 1.3, MAT.smoked, .2);
        for(const [u, v] of [[.75, .02], [.75, W - .2], [L - .8, .02], [L - .8, W - .2]]){ const [a, b, c, e] = F.R(u - .32, u + .32, v, v + .18); const m = new T.Mesh(new T.CylinderGeometry(.33, .33, .18, 20), MAT.tyre);
          m.rotation[along ? 'x' : 'z'] = Math.PI / 2; m.position.copy(P((a + b) / 2, z + .33, (c + e) / 2)); add(m); } return; }
      case 'planter': { const [, x, y, d] = it; d >= .6 || room(x, y) ? olive(x, y, Math.max(d, .55), z) : plant(x, y, d, z); return; }
    }
  }

  /* ---------- 3D-only dressing: feature walls, lamps, pendants, art and risers that the plans leave out ---------- */
  const W_OFF = (side, face, s, off) => side === 'N' ? [s, face + off] : side === 'S' ? [s, face - off] : side === 'W' ? [face + off, s] : [face - off, s];
  function onWall(side, face, a, b, o1, o2, z1, z2, mat, r = 0){ const [x1, y1] = W_OFF(side, face, a, o1), [x2, y2] = W_OFF(side, face, b, o2); return rb(Math.min(x1, x2), Math.max(x1, x2), Math.min(y1, y2), Math.max(y1, y2), z1, z2, mat, r); }
  function art(side, a, b, face, z1, z2, i){ if(z2 > CUT) return; onWall(side, face, a, b, 0, .035, z1, z2, MAT.blackMatte, 0);
    const [x1, y1] = W_OFF(side, face, a + .03, .035), [x2, y2] = W_OFF(side, face, b - .03, .045);
    const g = new T.BoxGeometry(Math.abs(x2 - x1), z2 - z1 - .06, Math.abs(y2 - y1)), m = new T.Mesh(g, MAT.art[i % MAT.art.length]);
    m.position.copy(P((x1 + x2) / 2, (z1 + z2) / 2, (y1 + y2) / 2)); m.userData.keep = 1; add(m); }
  function monolith(x, y, w, d, front, z){ const F = frame(x, y, w, d, BACK[front]), D = F.L, Lv = F.W;
    at(F, 0, D, 0, Lv, z, z + 2.7, MAT.nero, .006);
    at(F, D, D + .006, Lv * .14, Lv * .86, z + .3, z + .66, MAT.tvGlass, 0); at(F, D + .006, D + .03, Lv * .14 + .04, Lv * .86 - .04, z + .33, z + .37, MAT.fire, 0);   // fire box behind glass, ember bed
    { const [a, b, c, e] = F.R(D + .012, D + .014, Lv * .15, Lv * .85), m = new T.Mesh(new T.BoxGeometry(b - a, .28, e - c), MAT.flame);
      m.position.copy(P((a + b) / 2, z + .5, (c + e) / 2)); m.userData.keep = 1; m.renderOrder = 3; add(m); }
    pool(...pt(F, D + 1.2, Lv / 2), 1.9, .38, .045, 0xff9a52);
    at(F, D, D + .035, Lv / 2 - .82, Lv / 2 + .82, z + 1.0, z + 1.93, MAT.tvGlass, .01);
    at(F, D, D + .02, 0, Lv, z, z + .025, MAT.led, 0); }
  function arcLamp(x, y, x2, y2, z){ cyl(x, y, .2, .2, z, z + .05, MAT.nero, 28);
    const c = new T.CubicBezierCurve3(P(x, z + .05, y), P(x, z + 1.9, y), P(x + (x2 - x) * .3, z + 2.0, y + (y2 - y) * .3), P(x2, z + 1.78, y2));
    add(new T.Mesh(new T.TubeGeometry(c, 32, .014, 8, false), MAT.steel));
    const sh = new T.Mesh(new T.SphereGeometry(.2, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), MAT.blackMatte); sh.position.copy(P(x2, z + 1.6, y2)); add(sh);
    glow(x2, y2, z + 1.56, .6); pool(x2, y2, 1.4, .35, .045); }
  function floorLamp(x, y, z){ cyl(x, y, .16, .16, z, z + .03, MAT.blackMatte, 24); cyl(x, y, .012, .012, z + .03, z + 1.42, MAT.blackMatte, 8); cyl(x, y, .19, .22, z + 1.4, z + 1.72, MAT.shade, 28);
    glow(x, y, z + 1.56, 1.1); pool(x, y, 1.5, .32, .045); }
  function pendants(x1, x2, y, n, h, z){ for(let i = 0; i < n; i++){ const x = n > 1 ? x1 + (x2 - x1) * i / (n - 1) : (x1 + x2) / 2;
      cyl(x, y, .006, .006, z + h + .22, CUT, MAT.blackMatte, 6); cyl(x, y, .05, .2, z + h, z + h + .22, MAT.blackMatte, 28); ball(x, y, z + h + .01, .05, MAT.bulb);
      glow(x, y, z + h - .02, .4); pool(x, y, .5, .3, z + .94); pool(x, y, 1.2, .14, .045); } }
  function pendBar(x1, x2, y, h, z){ rb(x1, x2, y - .03, y + .03, z + h, z + h + .05, MAT.blackMatte, .01); rb(x1 + .05, x2 - .05, y - .015, y + .015, z + h - .004, z + h, MAT.led, 0);
    for(const x of [x1 + .2, x2 - .2]) cyl(x, y, .004, .004, z + h + .05, CUT, MAT.blackMatte, 6);
    for(let i = 0; i < 4; i++){ const x = x1 + (x2 - x1) * (i + .5) / 4; glow(x, y, z + h - .04, .35); pool(x, y, .75, .26, z + .77); } pool((x1 + x2) / 2, y, 2.2, .12, .045); }
  function pegboard(side, a, b, face, z1, z2, z){ onWall(side, face, a, b, 0, .02, z + z1, z + z2, MAT.peg, 0); onWall(side, face, a, b, .2, .5, z + z2 + .05, z + z2 + .08, MAT.chest, 0);
    for(let s2 = a + .12; s2 < b - .12; s2 += rr(.12, .2)){ const row = rnd() < .5 ? 0 : 1, zc = z + z1 + .25 + row * (z2 - z1 - .5) * rr(.6, 1), k = rnd();
      if(k < .3){ onWall(side, face, s2, s2 + .03, .02, .05, zc - .2, zc + .1, MAT.oakV, 0); onWall(side, face, s2 - .04, s2 + .07, .02, .06, zc + .1, zc + .14, MAT.steel, 0); }        // hammer
      else if(k < .6){ onWall(side, face, s2, s2 + .025, .02, .04, zc - .14, zc, MAT.steel, 0); onWall(side, face, s2 - .005, s2 + .03, .02, .05, zc, zc + .12, pickR([MAT.red, MAT.orange]), .008); } // screwdriver
      else if(k < .85) onWall(side, face, s2, s2 + .035, .02, .035, zc - .15, zc + .15, MAT.steel, 0);                                                                                     // spanner
      else onWall(side, face, s2, s2 + .14, .02, .04, zc - .06, zc + .06, MAT.red, .01); } }
  /* art above every bed whose head wall is solid there */
  function bedArt(k, z){ if(!ctx.headWall) return; for(const it of FURN[k]){ if(it[0] !== 'bedK' && it[0] !== 'bedS') continue; const [, x, y, w, d, hd] = it, along = hd === 'N' || hd === 'S', len = along ? w : d;
      const a = (along ? x : y) + len * .15, b = (along ? x : y) + len * .85, face = ctx.headWall(k, x, y, w, d, hd, a, b, 1.25, 1.9);
      if(face !== null) art(hd, a, b, face, z + 1.3, z + 1.88, Math.round(x * 7 + y * 3)); } }
  furn.dress = function(k, z, list){ for(const d of list || []){ const [t] = d;
      if(t === 'monolith') monolith(d[1], d[2], d[3], d[4], d[5], z);
      else if(t === 'arc') arcLamp(d[1], d[2], d[3], d[4], z);
      else if(t === 'floorLamp') floorLamp(d[1], d[2], z);
      else if(t === 'pendants') pendants(d[1], d[2], d[3], d[4], d[5], z);
      else if(t === 'pendBar') pendBar(d[1], d[2], d[3], d[4], z);
      else if(t === 'art') art(d[1], d[2], d[3], d[4], z + d[5], z + d[6], d[7]);
      else if(t === 'peg') pegboard(d[1], d[2], d[3], d[4], d[5], d[6], z);
      else if(t === 'slats') onWall(d[1], d[4], d[2], d[3], 0, .04, z + d[5], z + d[6], MAT.slats, 0);
      else if(t === 'riser'){ const [, x1, x2, y1, y2, h] = d; rb(x1, x2, y1, y2, z, z + h, MAT.carpet, 0); rb(x1, x1 + .02, y1 + .05, y2 - .05, z + h - .03, z + h - .01, MAT.led, 0); } }
    bedArt(k, z); };
  return furn;
}

/* ---------- trees with layered canopies ---------- */
function tree(ctx, x, y, sc = 1, z = 0){ const {P, add} = ctx;
  const tr = new T.Mesh(new T.CylinderGeometry(.11 * sc, .2 * sc, 2.4 * sc, 8), MAT.bark); tr.position.copy(P(x, z + 1.2 * sc, y)); add(tr);
  for(let i = 0; i < 5; i++){ const r = rr(.7, 1.15) * sc, m = new T.Mesh(new T.IcosahedronGeometry(r, 1), rnd() < .5 ? MAT.leafA : MAT.leafB); m.scale.y = .78;
    m.position.copy(P(x + rr(-.8, .8) * sc, z + rr(2.4, 3.4) * sc, y + rr(-.8, .8) * sc)); add(m); } }

/* ---------- light pools: warm light on floors and tables, one instanced draw ---------- */
function poolMesh(list, P){ if(!list.length) return null; const geo = new T.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
  const m = new T.InstancedMesh(geo, MAT.pool, list.length), o = new T.Object3D(), c = new T.Color();
  list.forEach(([x, y, r, i, z, col], j) => { o.position.copy(P(x, z, y)); o.scale.set(r * 2, 1, r * 2); o.updateMatrix(); m.setMatrixAt(j, o.matrix); c.set(col || 0xffc68e).convertSRGBToLinear().multiplyScalar(i); m.setColorAt(j, c); });
  m.frustumCulled = false; m.renderOrder = 2; m.userData.keep = 1; return m; }

/* ---------- render pipeline: SSAO → bloom → filmic tone mapping → sRGB ---------- */
function pipeline(renderer, scene, camera){
  const ok = renderer.capabilities.isWebGL2 && T.EffectComposer && T.SSAOPass && T.UnrealBloomPass && innerWidth > 760;
  if(!ok){ renderer.toneMapping = T.ACESFilmicToneMapping; return {enabled:false, render:() => renderer.render(scene, camera), setSize(){}}; }
  renderer.toneMapping = T.NoToneMapping;
  const size = new T.Vector2(); renderer.getSize(size); const pr = renderer.getPixelRatio();
  const rt = new T.WebGLRenderTarget(size.x * pr, size.y * pr, {type:T.HalfFloatType});
  const composer = new T.EffectComposer(renderer, rt);
  const ssao = new T.SSAOPass(scene, camera, size.x, size.y);
  ssao.beautyRenderTarget.dispose(); ssao.beautyRenderTarget = new T.WebGLRenderTarget(size.x, size.y, {type:T.HalfFloatType, samples:4});
  ssao.kernelRadius = 1.1; ssao.minDistance = .0004; ssao.maxDistance = .02;
  const base = ssao.renderOverride.bind(ssao);
  ssao.renderOverride = (r, m, t, cc, ca) => { const hidden = []; scene.traverse(o => { if(o.visible && (o.isSprite || (o.material && (o.material.transparent || o.material.isShaderMaterial || o.material.isShadowMaterial)))){ o.visible = false; hidden.push(o); } });
    base(r, m, t, cc, ca); for(const o of hidden) o.visible = true; };
  const bloom = new T.UnrealBloomPass(new T.Vector2(size.x, size.y), .28, .5, 1.6);
  const tone = new T.ShaderPass(T.ACESFilmicToneMappingShader); tone.uniforms.exposure.value = 1.0;
  const gamma = new T.ShaderPass(T.GammaCorrectionShader);
  composer.addPass(ssao); composer.addPass(bloom); composer.addPass(tone); composer.addPass(gamma);
  return {enabled:true, composer, ssao, bloom, tone, render:() => composer.render(),
    setSize(w, h){ composer.setSize(w, h); ssao.setSize(w, h); bloom.setSize(w, h); }};
}

window.HX_LOOK = {materials, floorMat, makeFurniture, tree, poolMesh, pipeline, TX, get MAT(){ return MAT; }};
})();
