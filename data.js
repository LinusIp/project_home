/* HOVLI — single source of truth. Metres. x → east, y → south. Origin = NW corner of plot. */
const PLOT = { w: 50, h: 60, wall: 0.3, wallH: 3.0 };
const LEVELS = {
  B: { key:'B', name:'Basement', sheet:'A-101', ffl:-3.5, h:3.5,
       outline:[[8,10],[42,10],[42,42],[34,42],[34,32],[30.5,32],[30.5,21],[16,21],[16,42],[1.5,42],[1.5,26],[8,26]] },
  G: { key:'G', name:'Ground Floor · 1st floor', sheet:'A-102', ffl:0, h:3.5,
       outline:[[8,10],[42,10],[42,42],[34,42],[34,24],[30,24],[30,19],[20,19],[20,24],[16,24],[16,46],[8,46]] },
  F: { key:'F', name:'Upper Floor · 2nd floor', sheet:'A-103', ffl:3.5, h:3.5,
       outline:[[8,10],[42,10],[42,46],[34,46],[34,19],[16,19],[16,42],[8,42]] }
};
/* three sharp gables, one per bar (after SoNo's Mountain Villa). Eaves +7.00, 35° pitch.
   Wing ridges start at y=15 so they run into the north roof and form true valleys. */
const EAVE = 7.0;
const ROOFS = [
  {name:'North bar', axis:'x', x1:8,  x2:42, y1:10, y2:19, ridge:10.15},
  {name:'West wing', axis:'y', x1:8,  x2:16, y1:15, y2:42, ridge:9.8},
  {name:'East wing', axis:'y', x1:34, x2:42, y1:15, y2:46, ridge:9.8}
];
/* frameless floor-to-ceiling glazing runs, drawn over the wall line */
const GLAZING = {
  B: [],
  G: [[[17,10],[27,10]], [[20,19],[30,19]], [[16,24],[20,24]], [[20,19],[20,24]], [[30,19],[30,24]], [[30,24],[34,24]],
      [[16,24],[16,46]], [[34,24],[34,42]], [[8.5,46],[15.5,46]], [[35,42],[41,42]], [[42,26],[42,31]], [[42,37],[42,41]]],
  F: [[[17,10],[27,10]], [[16,19],[34,19]], [[16,20],[16,41]], [[34,20],[34,45]], [[35,46],[41,46]], [[8,11],[8,14]], [[42,38],[42,45]], [[9,42],[14,42]]]
};
/* k = kind (plan tint). d = description for the room-by-room breakdown. l = optional label point. */
const ROOMS = [
  /* BASEMENT  FFL -3.50 */
  {id:'B.01', lvl:'B', n:'Home Cinema', k:'live', r:[[8,10,9,9]],
   d:'Black-box room with a 4 m acoustically transparent screen, stepped seating for 9 and fabric-wrapped absorber walls. Built room-in-room on neoprene isolators so a 105 dB soundtrack never reaches the bedrooms.'},
  {id:'B.02', lvl:'B', n:'Gym', k:'live', r:[[17,10,10,9]],
   d:'Rubber and microcement floor, a smoked-glass mirror wall and a dedicated fresh-air supply at 6 air changes per hour. Linear LED coves run on a circadian lighting scene.'},
  {id:'B.03', lvl:'B', n:'Lift + Service Stair', k:'core', r:[[27,10,3.5,5.5]],
   d:'Concrete core from basement to roof: an 8-person machine-room-less lift and an enclosed service stair, the fire-rated escape route from the basement.'},
  {id:'B.04', lvl:'B', n:'Basement Lobby', k:'circ', r:[[27,15.5,3.5,3.5]],
   d:'Pressurised lift lobby that keeps smoke out of the stair core.'},
  {id:'B.05', lvl:'B', n:'Engineering Room', k:'plant', r:[[30.5,10,11.5,9]],
   d:'The technical heart of the house: chilled-water plant and air-handling unit, 2 × 15 m³ water tanks with booster pumps, the main LV switchboard, a 250 kVA standby generator and the automation racks. Louvred up to the service yard.'},
  {id:'B.06', lvl:'B', n:'Wine Cellar', k:'store', r:[[8,19,5,7]],
   d:'Held at 13 °C and 65 % RH by its own split unit, with floor-to-ceiling black steel racking behind a smoked-glass wall.'},
  {id:'B.07', lvl:'B', n:'Car Lobby', k:'circ', r:[[13,21,3,5]],
   d:'Fire-rated airlock between garage and house, with a bench and shoe store.'},
  {id:'B.08', lvl:'B', n:'Garage · 6 Cars', k:'garage', r:[[1.5,26,14.5,16]],
   d:'Six 2.7 m bays off a straight 6 m aisle that continues the ramp, so no car reverses on the slope. Polished power-floated concrete, flush trench drains, a 7 kW EV charger per bay and linear LED recessed into the soffit.'},
  {id:'B.09', lvl:'B', n:'Service Corridor', k:'circ', r:[[13,19,21,2]],
   d:'Runs under the main terrace to link garage, core, pool plant and staff wing without crossing family space. Services ride on an exposed cable tray for easy maintenance.'},
  {id:'B.10', lvl:'B', n:'Pool Plant Room', k:'plant', r:[[30.5,21,3.5,11]],
   d:'Hidden beneath the east pool deck: 12 m³ balance tank, variable-speed pumps, glass-media filters, UV steriliser, salt chlorinator and heat pump. Reached from the corridor or a flush hatch in the deck.'},
  {id:'B.11', lvl:'B', n:'Server Room', k:'plant', r:[[35.5,19,6.5,5]],
   d:'Two 42U racks with N+1 in-row precision cooling, a 10 kVA online UPS, overhead ladder tray and clean-agent gas suppression on its own detection loop.'},
  {id:'B.12', lvl:'B', n:'Storage', k:'store', r:[[35.5,24,6.5,4]],
   d:'Next to the server room for spares, AV equipment and archive boxes. It shares the server room’s controlled atmosphere.'},
  {id:'B.13', lvl:'B', n:'Staff Spine', k:'circ', r:[[34,19,1.5,23]],
   d:'Private corridor for the staff wing and technical rooms.'},
  {id:'B.14', lvl:'B', n:'Staff Room A', k:'staff', r:[[35.5,28,6.5,4]],
   d:'Staff bedroom with a daylight tube, built-in wardrobe and its own climate zone.'},
  {id:'B.15', lvl:'B', n:'Staff Room B', k:'staff', r:[[35.5,32,6.5,4]],
   d:'Second staff bedroom, same specification as Room A.'},
  {id:'B.16', lvl:'B', n:'Staff Pantry', k:'staff', r:[[35.5,36,6.5,3]],
   d:'Kitchenette and dining counter for household staff, opening off the staff spine.'},
  {id:'B.17', lvl:'B', n:'Staff Bathroom', k:'wet', r:[[35.5,39,3,3]],
   d:'Shower, WC and basin in grey microcement, with humidity-sensing extract.'},
  {id:'B.18', lvl:'B', n:'General Storage', k:'store', r:[[38.5,39,3.5,3]],
   d:'Household bulk storage on adjustable steel shelving, reached through the pantry.'},

  /* GROUND FLOOR  FFL +/-0.00 — every room of the reference plan, rearranged around the pool */
  {id:'G.01', lvl:'G', n:'Circulation', k:'circ', r:[[14.5,10,12.5,4.5],[14.5,14.5,2,4.5],[25,14.5,2,4.5],[27,15.5,3.5,3.5]], l:[17.3,11.4],
   d:'The entrance lobby: a 7 m double-height space behind a 10 m frameless glass front. The floating stair has a folded-steel stringer and honed stone treads, and the lift sits in the concrete core beside it.'},
  {id:'G.02', lvl:'G', n:'Lift + Service Stair', k:'core', r:[[27,10,3.5,5.5]], d:'The core continues up from the basement.'},
  {id:'G.03', lvl:'G', n:'Garage', k:'garage', r:[[8,10,6.5,6.5]],
   d:'Two-car garage opening to the forecourt through a flush 5.3 m sectional door, with EV charging and a door straight into the lobby. The 6-car basement garage takes the rest of the fleet.'},
  {id:'G.04', lvl:'G', n:'Closet', k:'store', r:[[8,16.5,3,2.5]], d:'Mudroom closet between the garage and the house for coats, shoes and bags.'},
  {id:'G.05', lvl:'G', n:'Storage', k:'store', r:[[11,16.5,3.5,2.5]], d:'Household storage off the garage on steel shelving.'},
  {id:'G.06', lvl:'G', n:'Living', k:'live', r:[[16.5,14.5,8.5,4.5]], l:[22.6,17.9],
   d:'Formal living room open to the lobby, with a glass wall that slides away onto the pool terrace.'},
  {id:'G.07', lvl:'G', n:'Den', k:'live', r:[[16,19,4,5]], l:[18,22.4],
   d:'Glass pavilion at the north-west corner of the pool: a quiet reading and TV room with a wall of shelving.'},
  {id:'G.08', lvl:'G', n:'Kitchen', k:'live', r:[[30.5,10,6,6.5]], l:[33.5,15.6],
   d:'Handleless kitchen with a 4.4 m stone island, matte black tall units and an induction cooking run.'},
  {id:'G.09', lvl:'G', n:'Nook', k:'live', r:[[30.5,16.5,6,2.5]], l:[35.4,17.6], d:'Breakfast nook between the kitchen and the sunroom, with a table for six.'},
  {id:'G.10', lvl:'G', n:'Sunroom', k:'live', r:[[30,19,4,5]], l:[32,21.9], d:'Frameless glass pavilion at the north-east corner of the pool, with lounge seating and planting.'},
  {id:'G.11', lvl:'G', n:'Office', k:'live', r:[[36.5,10,5.5,4.5]], l:[39.3,13.9], d:'Home office off the kitchen, with windows east and north, a 2.4 m desk and full-height shelving.'},
  {id:'G.12', lvl:'G', n:'Pantry', k:'store', r:[[36.5,14.5,2.5,4.5]], d:'Walk-in pantry off the kitchen, shelved on both sides.'},
  {id:'G.13', lvl:'G', n:'Bathroom', k:'wet', r:[[39,14.5,3,4.5]], d:'Guest bathroom off the dining room with shower, WC and a monolithic basin.'},
  {id:'G.14', lvl:'G', n:'Dining', k:'live', r:[[34,19,8,6]], l:[38,24.2], d:'Dining for ten, open to the family room and the nook.'},
  {id:'G.15', lvl:'G', n:'Family Room', k:'live', r:[[34,25,8,7]], l:[38,31.3],
   d:'The everyday living room: a sofa and lounge chairs facing an 18 m glass wall onto the pool that slides into wall pockets.'},
  {id:'G.16', lvl:'G', n:'Circulation', k:'circ', r:[[34,32,1.5,4]], d:'Private hall into the primary suite, with the two primary closets opening off it.'},
  {id:'G.17', lvl:'G', n:'Primary Closet', k:'store', r:[[35.5,32,2,2]], d:'First of two walk-in closets for the primary suite, lit by integrated LED rails.'},
  {id:'G.18', lvl:'G', n:'Primary Closet', k:'store', r:[[35.5,34,2,2]], d:'Second walk-in closet for the primary suite.'},
  {id:'G.19', lvl:'G', n:'Primary Bathroom', k:'wet', r:[[37.5,32,4.5,4]], d:'Freestanding stone bath, walk-in shower, double vanity and WC, with a high window to the east.'},
  {id:'G.20', lvl:'G', n:'Primary Bedroom', k:'sleep', r:[[34,36,8,6]], l:[38,41.1],
   d:'At the quiet south end of the east wing, with frameless glass on three sides onto the pool and the garden.'},
  {id:'G.21', lvl:'G', n:'Circulation', k:'circ', r:[[14.5,19,1.5,27]], d:'Glass gallery along the west wing serving the six bedrooms and two bathrooms.'},
  {id:'G.22', lvl:'G', n:'Bedroom', k:'sleep', r:[[8,19,5,3.6],[13,21,1.5,1.6]], l:[10.5,21.8], d:'Bedroom with a queen bed, desk and a window to the west garden.'},
  {id:'G.23', lvl:'G', n:'Closet', k:'store', r:[[13,19,1.5,2]], d:'Walk-in closet for the bedroom beside it.'},
  {id:'G.24', lvl:'G', n:'Bathroom', k:'wet', r:[[8,22.6,6.5,2.4]], l:[11.5,24.2], d:'Shared bathroom with bath, shower, WC and vanity, reached from the gallery.'},
  {id:'G.25', lvl:'G', n:'Bedroom', k:'sleep', r:[[8,25,5,3.6],[13,27,1.5,1.6]], l:[10.5,27.8], d:'Bedroom with a queen bed, desk and a window to the west garden.'},
  {id:'G.26', lvl:'G', n:'Closet', k:'store', r:[[13,25,1.5,2]], d:'Walk-in closet for the bedroom beside it.'},
  {id:'G.27', lvl:'G', n:'Bedroom', k:'sleep', r:[[8,28.6,5,3.6],[13,30.6,1.5,1.6]], l:[10.5,31.4], d:'Bedroom with a queen bed, desk and a window to the west garden.'},
  {id:'G.28', lvl:'G', n:'Closet', k:'store', r:[[13,28.6,1.5,2]], d:'Walk-in closet for the bedroom beside it.'},
  {id:'G.29', lvl:'G', n:'Bathroom', k:'wet', r:[[8,32.2,6.5,2.4]], l:[11.5,33.8], d:'Shared bathroom with bath, shower, WC and vanity, reached from the gallery.'},
  {id:'G.30', lvl:'G', n:'Bedroom', k:'sleep', r:[[8,34.6,5,3.6],[13,36.6,1.5,1.6]], l:[10.5,37.4], d:'Bedroom with a queen bed, desk and a window to the west garden.'},
  {id:'G.31', lvl:'G', n:'Closet', k:'store', r:[[13,34.6,1.5,2]], d:'Walk-in closet for the bedroom beside it.'},
  {id:'G.32', lvl:'G', n:'Bedroom', k:'sleep', r:[[8,38.2,5,3.8],[13,40.2,1.5,1.8]], l:[10.5,41.1], d:'Bedroom with a queen bed, desk and a window to the west garden.'},
  {id:'G.33', lvl:'G', n:'Closet', k:'store', r:[[13,38.2,1.5,2]], d:'Walk-in closet for the bedroom beside it.'},
  {id:'G.34', lvl:'G', n:'Bedroom', k:'sleep', r:[[8,42,5,4],[13,44,1.5,2]], l:[10.5,45.1], d:'Corner bedroom at the south end of the west wing, with glass to the west and south gardens.'},
  {id:'G.35', lvl:'G', n:'Closet', k:'store', r:[[13,42,1.5,2]], d:'Walk-in closet for the corner bedroom.'},

  /* FIRST FLOOR  FFL +3.50 */
  {id:'F.01', lvl:'F', n:'Bedroom 2', k:'sleep', r:[[8,10,6.5,5.5],[14.5,10,1.5,4]], l:[11.2,12.8], d:'North-west suite with a corner glass slot and a window seat.'},
  {id:'F.02', lvl:'F', n:'En-suite 2', k:'wet', r:[[8,15.5,3.5,3.5]], d:'Shower, WC and double basin.'},
  {id:'F.03', lvl:'F', n:'Closet 2', k:'store', r:[[11.5,15.5,3,3.5]], d:'Walk-in wardrobe.'},
  {id:'F.04', lvl:'F', n:'Family Lounge', k:'live', r:[[16,14,11,5],[25,10,2,4]], l:[21,16.8],
   d:'Informal lounge at the top of the floating stair, open to the lobby void on one side and the pool on the other.'},
  {id:'F.05', lvl:'F', n:'Lift + Service Stair', k:'core', r:[[27,10,3.5,5.5]], d:'The core continues to the roof plant deck.'},
  {id:'F.06', lvl:'F', n:'Lift Landing', k:'circ', r:[[27,15.5,3.5,2]], d:'Landing in front of the lift, linking the family lounge to the east gallery.'},
  {id:'F.07', lvl:'F', n:'Gallery', k:'circ', r:[[27,17.5,8.5,1.5]], d:'Glazed walkway on the courtyard face leading to Bedroom 3 and the master suite.'},
  {id:'F.08', lvl:'F', n:'Bedroom 3', k:'sleep', r:[[30.5,10,6,7.5]], d:'North-east suite with morning light.'},
  {id:'F.09', lvl:'F', n:'En-suite 3', k:'wet', r:[[36.5,10,5.5,3.75]], d:'Shower, freestanding stone bath and WC.'},
  {id:'F.10', lvl:'F', n:'Closet 3', k:'store', r:[[36.5,13.75,5.5,3.75]], d:'Walk-in wardrobe.'},
  {id:'F.11', lvl:'F', n:'West Gallery', k:'circ', r:[[14.5,14,1.5,28]], d:'Frameless glass corridor over the pool serving the west-wing bedrooms.'},
  {id:'F.12', lvl:'F', n:'Bedroom 4', k:'sleep', r:[[8,19,6.5,7]], d:'West-wing suite facing the sunset over the west garden.'},
  {id:'F.13', lvl:'F', n:'En-suite 4', k:'wet', r:[[8,26,6.5,3.5]], d:'Shower, WC and basin.'},
  {id:'F.14', lvl:'F', n:'Bedroom 5', k:'sleep', r:[[8,29.5,6.5,7]], d:'West-wing suite, a mirror of Bedroom 4.'},
  {id:'F.15', lvl:'F', n:'En-suite 5', k:'wet', r:[[8,36.5,6.5,3.5]], d:'Shower, WC and basin.'},
  {id:'F.16', lvl:'F', n:'Laundry', k:'service', r:[[8,40,6.5,2]], d:'Washer-dryer stack, folding counter and a linen chute to the basement.'},
  {id:'F.17', lvl:'F', n:'Master Lounge', k:'live', r:[[34,19,8,5],[35.5,17.5,6.5,1.5]], l:[38,21.8],
   d:'Private sitting room and entry to the master suite, with a coffee station hidden in handleless joinery.'},
  {id:'F.18', lvl:'F', n:'Master Bathroom', k:'wet', r:[[34,24,6.6,7]],
   d:'Book-matched grey stone, a freestanding stone bath under a slot skylight, twin rain showers behind low-iron glass and heated floors.'},
  {id:'F.21', lvl:'F', n:'Master Passage', k:'circ', r:[[40.6,24,1.4,13]], d:'Private passage from the master lounge to the bedroom, with the bathroom and closet opening off it.'},
  {id:'F.19', lvl:'F', n:'Walk-in Closet', k:'store', r:[[34,31,6.6,6]],
   d:'Smoked-glass wardrobe fronts lit from inside by LED rails that switch on as the doors open, around a central island in anodised aluminium.'},
  {id:'F.20', lvl:'F', n:'Master Bedroom', k:'sleep', r:[[34,37,8,9]],
   d:'Cantilevers 4 m past the wing on post-tensioned beams, floating over the south garden. A frameless west glass wall frames the pool and opens onto the private terrace.'}
];
/* external areas, not counted in gross floor area */
const EXTERNAL = [
  {id:'X.01', n:'Central Pool', r:[[20,22,10,20]], d:'10 × 20 m overflow pool, 1.2–1.8 m deep.'},
  {id:'X.02', n:'Main Terrace', r:[[20,19,10,3]], d:'Covered, flush with the living floor, between the den and sunroom pavilions.'},
  {id:'X.03', n:'Pool Deck', r:[[16,24,4,18],[30,24,4,18],[16,42,18,4]], d:'1200 × 600 mm grey stone pavers.'},
  {id:'X.04', n:'Master Terrace (FF)', r:[[31,37,3,9]], d:'Cantilevered steel and glass.'},
  {id:'X.05', n:'Entrance Canopy', r:[[17,3,13,7]], d:'250 mm steel blade on two columns.'}
];
const area = o => o.r.reduce((s,[,,w,h]) => s + w*h, 0);
const levelRooms = k => ROOMS.filter(r => r.lvl === k);
const levelTotal = k => levelRooms(k).reduce((s,r) => s + area(r), 0);
const fmt = (n, d=1) => n.toLocaleString('en-US', {minimumFractionDigits:d, maximumFractionDigits:d});
