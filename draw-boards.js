/* Concept presentation boards: one overview sheet plus one sheet per level. Everything is computed from data.js. */
const LEVEL_LABEL = { B:'Basement', G:'1st floor', F:'2nd floor' };
function footprintArea(){
  const inPoly=(x,y,pts)=>{ let c=false; for(let i=0,j=pts.length-1;i<pts.length;j=i++){ const [xi,yi]=pts[i],[xj,yj]=pts[j]; if(((yi>y)!==(yj>y)) && x<(xj-xi)*(y-yi)/(yj-yi)+xi) c=!c; } return c; };
  let n=0; for(let x=.25;x<PLOT.w;x+=.5) for(let y=.25;y<PLOT.h;y+=.5) if(inPoly(x,y,LEVELS.G.outline)||inPoly(x,y,LEVELS.F.outline)) n++;
  return n*.25;
}
function boardRoomList(k){
  const rs = levelRooms(k);
  return `<ol class="bl-rooms${rs.length>18?' two':''}">${rs.map((r,i)=>`<li><span>${String(i+1).padStart(2,'0')}</span><em>${esc(r.n)}</em><b>${fmt(area(r),0)} m²</b></li>`).join('')}</ol>
    <div class="bl-total"><span>TOTAL · ${LEVEL_LABEL[k].toUpperCase()}</span><b>${fmt(levelTotal(k),0)} m²</b></div>`;
}
function boardStats(){
  const land=PLOT.w*PLOT.h, foot=footprintArea();
  return `<section class="b-stats"><div><h4>PLOT AREA</h4><b>3,000 m²</b><small>50 m × 60 m land</small></div>
    <div><h4>BUILDING FOOTPRINT</h4><b>${fmt(foot,0)} m²</b><small>${fmt(foot/land*100,1)} % of the plot</small></div>
    <div><h4>LANDSCAPING &amp; OPEN AREAS</h4><b>${fmt(land-foot,0)} m²</b><small>gardens, pool, deck, drive</small></div></section>`;
}
const boardHead = (sub) => `<header class="b-head"><div><h3 class="b-title">VILLA CONCEPT</h3><div class="b-sub">${sub}</div></div>
  <div class="b-facts">3,000 m² PLOT <i>|</i> 3 LEVELS <i>|</i> CENTRAL POOL <i>|</i> WALLED COMPOUND</div></header>`;
const stripFig = ([img,cap]) => `<figure><img src="images/${img}.jpg" alt="${esc(cap)}" loading="lazy"><figcaption>${esc(cap)}</figcaption></figure>`;

function boardFloor(k, renders, stripHTML){
  const L=LEVELS[k];
  return `<div class="board-scroll"><article class="board bf" aria-label="Concept board, ${LEVEL_LABEL[k]} plan">
    ${boardHead(`${LEVEL_LABEL[k].toUpperCase()} PLAN`)}
    <div class="b-plan">${planCAD(k,true,{site:true,bare:true})}<div class="b-plan-cap">${L.sheet} · ${L.name.toUpperCase()} · FFL ${zl(L.ffl)} · NET AREA ${fmt(levelTotal(k),0)} m²</div></div>
    <aside class="b-side">
      <section><h4>${LEVEL_LABEL[k].toUpperCase()} · SPACES</h4>${boardRoomList(k)}</section>
      ${boardStats()}
      <section class="b-axo"><h4>VILLA AXONOMETRIC · 3 LEVELS + ROOF</h4><img src="images/axo-${k.toLowerCase()}.jpg" alt="Exploded axonometric of the basement, both floors and the roof, with the ${LEVEL_LABEL[k]} highlighted" loading="lazy"></section>
    </aside>
    <div class="b-strip">${stripHTML || renders.map(stripFig).join('')}</div>
    <footer class="b-foot"><span>MODERN LIVING <i>/</i> PRIVACY <i>/</i> COURTYARD <i>/</i> TIMELESS DESIGN</span><span>VILLA CONCEPT <i>|</i> ${LEVEL_LABEL[k].toUpperCase()} PLAN</span></footer>
  </article></div>`;
}

function sunPathSVG(){
  const X=x=>31+x*.72, Y=y=>18+y*.72;
  const poly = pts => pts.map(([x,y])=>`${X(x)},${Y(y)}`).join(' ');
  let s = `<svg viewBox="0 0 100 82" class="dwg" role="img" aria-label="Indicative site analysis: sun path and winds">`;
  s += `<rect x="${X(0)}" y="${Y(0)}" width="${50*.72}" height="${60*.72}" fill="#f3f3f0" stroke="${INK}" stroke-width=".5"/>`;
  for(const [x,y] of TREES) s += `<circle cx="${X(x)}" cy="${Y(y)}" r=".9" fill="#b9c3a6"/>`;
  s += `<polygon points="${poly(LEVELS.G.outline)}" fill="#dcdedd" stroke="${INK}" stroke-width=".35"/><polygon points="${poly(LEVELS.F.outline)}" fill="#c9ccce" stroke="${INK}" stroke-width=".35"/>`;
  s += `<rect x="${X(20)}" y="${Y(22)}" width="${10*.72}" height="${20*.72}" fill="#8fc3d0"/>`;
  const sun = (x,y) => `<circle cx="${x}" cy="${y}" r="2.1" fill="#f0b43c"/>` + Array.from({length:8},(_,i)=>{ const a=i*Math.PI/4; return `<line x1="${x+Math.cos(a)*2.9}" y1="${y+Math.sin(a)*2.9}" x2="${x+Math.cos(a)*4}" y2="${y+Math.sin(a)*4}" stroke="#f0b43c" stroke-width=".5"/>`; }).join('');
  s += `<path d="M14 66 Q50 -6 86 66" fill="none" stroke="#e0a040" stroke-width=".6" stroke-dasharray="1.6 1.2"/>` + sun(50,12) + `<text x="36" y="9" font-size="2.4" class="m">SUMMER SUN</text>`;
  s += `<path d="M24 70 Q50 24 76 70" fill="none" stroke="#e0a040" stroke-width=".6" stroke-dasharray="1.6 1.2"/>` + sun(72,50) + `<text x="77" y="46" font-size="2.4" class="m">WINTER SUN</text>`;
  const arrow=(x1,y1,x2,y2,c)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width=".7"/><path d="M${x2} ${y2} l${(x1-x2)*.18-(y1-y2)*.1} ${(y1-y2)*.18+(x1-x2)*.1} M${x2} ${y2} l${(x1-x2)*.18+(y1-y2)*.1} ${(y1-y2)*.18-(x1-x2)*.1}" stroke="${c}" stroke-width=".7" fill="none"/>`;
  for(const d of [0,4,8]) s += arrow(3,20+d,16,26+d,'#2f76b8');
  for(const d of [0,4,8]) s += arrow(97,62+d,86,56+d,'#2f76b8');
  s += `<text x="2" y="42" font-size="2.3" class="m">PREVAILING</text><text x="2" y="45" font-size="2.3" class="m">WINDS (NW)</text><text x="82" y="79" font-size="2.3" class="m">SECONDARY</text><text x="82" y="82" font-size="0" class="m"></text><text x="70" y="79" font-size="2.3" class="m" text-anchor="end">WINDS (SE)</text>`;
  s += `<text x="50" y="80" font-size="2" class="m" text-anchor="middle" fill="${MUTE}">INDICATIVE · CONFIRM WITH LOCAL CLIMATE DATA</text>`;
  s += `<path d="M93 8 L94.6 13 L93 12 L91.4 13 Z" fill="${INK}"/><text x="93" y="17" font-size="2.4" class="m" text-anchor="middle">N</text>`;
  return s + '</svg>';
}

function boardOverview(){
  const bedsG = levelRooms('G').filter(r=>r.n==='Bedroom').length;
  const legend = {
    B: ['Garage · 6 cars','Engineering room','Server room','Home cinema + gym','Staff quarters'],
    G: ['Entrance lobby','Garage · 2 cars','Living, dining, family room','Kitchen, nook, sunroom, den',`Primary suite + ${bedsG} bedrooms`],
    F: ['Master suite + terrace','Bedrooms 2–5, en-suite','Family lounge','Laundry']
  };
  const fp = k => `<div class="bo-fp"><div class="bo-fp-h"><b>${LEVEL_LABEL[k].toUpperCase()}</b><span>FFL ${zl(LEVELS[k].ffl)}</span></div><div class="bo-fp-b">${planCAD(k)}<ol>${legend[k].map(t=>`<li>${esc(t)}</li>`).join('')}</ol></div></div>`;
  const sw = [['sw-conc noise','EXPOSED CONCRETE'],['sw-seam','BLACK STANDING SEAM'],['sw-fin','WHITE FINS'],['sw-smoke','SMOKED GLASS'],['sw-micro noise','GREY MICROCEMENT'],['sw-tile','DARK POOL TILE']];
  return `<div class="board-scroll"><article class="board bo" aria-label="Concept board, overview">
    <div class="p bo-hero"><img src="images/c03.jpg" alt="Concept render of the pool courtyard at dusk"></div>
    <div class="p bo-facts"><h3 class="b-title sm">VILLA CONCEPT</h3>
      <p class="bo-list">3,000 m² PLOT<br>3 LEVELS<br>CENTRAL POOL<br>WALLED COMPOUND</p>
      <h4>MATERIALS</h4><div class="bo-sw">${sw.map(([c,t])=>`<div><span class="sw ${c}"></span><small>${t}</small></div>`).join('')}</div></div>
    <div class="p bo-axo"><img src="images/axo-all.jpg" alt="Exploded axonometric of all levels and the roof"></div>
    <div class="p bo-site"><h4>SITE PLAN <small>(50 m × 60 m)</small></h4><p class="bo-sm">PLOT AREA: 3,000 m²</p>${sitePlanSVG()}</div>
    <div class="p bo-plans"><h4>FLOOR PLANS</h4>${fp('B')}${fp('G')}${fp('F')}</div>
    <div class="p bo-sec"><h4>SECTION A–A</h4>${sectionSVG()}<h4 style="margin-top:14px">COURTYARD ELEVATION</h4>${elevationPrecise('S')}</div>
    <div class="bo-renders">${[['c02','ARRIVAL · FORECOURT'],['c04','DOUBLE-HEIGHT LOBBY'],['c05','MASTER BEDROOM TERRACE']].map(stripFig).join('')}</div>
    <div class="p bo-sun"><h4>SITE ANALYSIS</h4>${sunPathSVG()}</div>
  </article></div>`;
}
