/* HOVLI — single source of truth. Metres. x → east, y → south. Origin = NW corner of plot. */
const PLOT = { w: 50, h: 60, wall: 0.3, wallH: 3.0 };
const LEVELS = {
  B: { key:'B', name:'Basement', sheet:'A-101', ffl:-3.5, h:3.5,
       outline:[[8,10],[42,10],[42,42],[34,42],[34,32],[30.5,32],[30.5,21],[16,21],[16,42],[1.5,42],[1.5,26],[8,26]] },
  G: { key:'G', name:'Ground Floor', sheet:'A-102', ffl:0, h:3.5,
       outline:[[8,10],[42,10],[42,42],[34,42],[34,19],[16,19],[16,42],[8,42]] },
  F: { key:'F', name:'First Floor', sheet:'A-103', ffl:3.5, h:3.5,
       outline:[[8,10],[42,10],[42,46],[34,46],[34,19],[16,19],[16,42],[8,42]] }
};
/* frameless floor-to-ceiling glazing runs, drawn over the wall line */
const GLAZING = {
  B: [],
  G: [[[17,10],[27,10]], [[16,19],[34,19]], [[16,20],[16,41]], [[34,20],[34,41]], [[9,42],[15,42]], [[35,42],[41,42]], [[8,21],[8,31]], [[42,29],[42,40]]],
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
  {id:'B.16', lvl:'B', n:'Staff Bathroom', k:'wet', r:[[35.5,36,3,3]],
   d:'Shower, WC and basin in grey microcement, with humidity-sensing extract.'},
  {id:'B.17', lvl:'B', n:'Staff Pantry', k:'staff', r:[[38.5,36,3.5,3]],
   d:'Kitchenette and dining counter for household staff.'},
  {id:'B.18', lvl:'B', n:'General Storage', k:'store', r:[[35.5,39,6.5,3]],
   d:'Household bulk storage on adjustable steel shelving.'},

  /* GROUND FLOOR  FFL +/-0.00 */
  {id:'G.01', lvl:'G', n:'Entrance Lobby', k:'circ', r:[[17,10,10,9],[27,15.5,3.5,3.5],[14,16.5,3,2.5]], l:[22,16.8],
   d:'A 7 m double-height volume behind a 10 m frameless glass front. The floating stair has an 80 mm folded-steel stringer and 60 mm honed stone treads and rises through the void. The lift sits in the concrete core beside it.'},
  {id:'G.02', lvl:'G', n:'Lift + Service Stair', k:'core', r:[[27,10,3.5,5.5]], d:'The core continues up from the basement.'},
  {id:'G.03', lvl:'G', n:'Study', k:'live', r:[[8,10,6,9]],
   d:'A quiet room off the lobby with a 4 m black steel desk and a smoked-glass slot to the west garden.'},
  {id:'G.04', lvl:'G', n:'Guest WC', k:'wet', r:[[14,10,3,4.5]],
   d:'Monolithic stone basin, wall-hung WC and a back-lit mirror recessed flush into the wall.'},
  {id:'G.05', lvl:'G', n:'Coats', k:'store', r:[[14,14.5,3,2]], d:'Handleless push-latch storage for coats and shoes.'},
  {id:'G.06', lvl:'G', n:'Majlis', k:'live', r:[[8,19,6.5,13]],
   d:'Formal guest reception for 14, reached from the lobby by its own glass gallery so guests never pass family rooms. Low linear seating faces a 13 m glass wall to the west garden.'},
  {id:'G.07', lvl:'G', n:'Glass Gallery', k:'circ', r:[[14.5,19,1.5,17.5]],
   d:'Frameless glass corridor on the courtyard edge and the spine of the guest wing. It slides fully open onto the pool deck.'},
  {id:'G.08', lvl:'G', n:'Guest En-suite', k:'wet', r:[[8,32,4,4.5]], d:'Walk-in rain shower and floating grey stone vanity.'},
  {id:'G.09', lvl:'G', n:'Guest Wardrobe', k:'store', r:[[12,32,2.5,4.5]], d:'Walk-through wardrobe with integrated LED rails.'},
  {id:'G.10', lvl:'G', n:'Guest Bedroom', k:'sleep', r:[[8,36.5,8,5.5]],
   d:'At the quiet south end of the west wing, with its own glass wall to the olive grove.'},
  {id:'G.11', lvl:'G', n:'Kitchen', k:'live', r:[[30.5,10,6.5,9]],
   d:'Handleless show kitchen: a 5 m monolithic island in honed stone, matte black tall units with integrated appliances, and downdraft extraction so no hood breaks the ceiling.'},
  {id:'G.12', lvl:'G', n:'Back Kitchen + Pantry', k:'service', r:[[37,10,5,5]],
   d:'The working kitchen behind a hidden pivot door, with a second cooker, dishwashers, cold room and walk-in pantry.'},
  {id:'G.13', lvl:'G', n:'Service Entry', k:'service', r:[[37,15,5,4]],
   d:'Deliveries arrive here from the hidden service gate without touching the formal entrance.'},
  {id:'G.14', lvl:'G', n:'Dining', k:'live', r:[[34,19,8,8]],
   d:'Dining for 12 under a recessed linear light slot. The west glass wall retracts fully, putting the table 4 m from the water.'},
  {id:'G.15', lvl:'G', n:'Family Living', k:'live', r:[[34,27,8,15]],
   d:'A 15 m glass wall slides into wall pockets and the floor runs out to the terrace with no threshold. Concealed speakers, a recessed media wall and motorised sheers hide in the ceiling reveal.'},

  /* FIRST FLOOR  FFL +3.50 */
  {id:'F.01', lvl:'F', n:'Bedroom 2', k:'sleep', r:[[8,10,6.5,5.5],[14.5,10,1.5,4]], l:[11.2,12.8], d:'North-west suite with a corner glass slot and a window seat.'},
  {id:'F.02', lvl:'F', n:'En-suite 2', k:'wet', r:[[8,15.5,3.5,3.5]], d:'Shower, WC and double basin.'},
  {id:'F.03', lvl:'F', n:'Closet 2', k:'store', r:[[11.5,15.5,3,3.5]], d:'Walk-in wardrobe.'},
  {id:'F.04', lvl:'F', n:'Family Lounge', k:'live', r:[[16,14,11,5],[25,10,2,4]], l:[21,16.8],
   d:'Informal lounge at the top of the floating stair, open to the lobby void on one side and the pool on the other.'},
  {id:'F.05', lvl:'F', n:'Lift + Service Stair', k:'core', r:[[27,10,3.5,5.5]], d:'The core continues to the roof plant deck.'},
  {id:'F.06', lvl:'F', n:'Linen + Riser', k:'service', r:[[27,15.5,3.5,2]], d:'Linen store beside the main vertical service riser.'},
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
  {id:'F.18', lvl:'F', n:'Master Bathroom', k:'wet', r:[[34,24,8,7]],
   d:'Book-matched grey stone, a freestanding stone bath under a slot skylight, twin rain showers behind low-iron glass and heated floors.'},
  {id:'F.19', lvl:'F', n:'Walk-in Closet', k:'store', r:[[34,31,8,6]],
   d:'Smoked-glass wardrobe fronts lit from inside by LED rails that switch on as the doors open, around a central island in anodised aluminium.'},
  {id:'F.20', lvl:'F', n:'Master Bedroom', k:'sleep', r:[[34,37,8,9]],
   d:'Cantilevers 4 m past the wing on post-tensioned beams, floating over the south garden. A frameless west glass wall frames the pool and opens onto the private terrace.'}
];
/* external areas, not counted in gross floor area */
const EXTERNAL = [
  {id:'X.01', n:'Central Pool', r:[[20,22,10,20]], d:'10 × 20 m overflow pool, 1.2–1.8 m deep.'},
  {id:'X.02', n:'Main Terrace', r:[[16,19,18,3]], d:'Covered, flush with the living floor.'},
  {id:'X.03', n:'Pool Deck', r:[[16,22,4,20],[30,22,4,20],[16,42,18,4]], d:'1200 × 600 mm grey stone pavers.'},
  {id:'X.04', n:'Master Terrace (FF)', r:[[31,37,3,9]], d:'Cantilevered steel and glass.'},
  {id:'X.05', n:'Entrance Canopy', r:[[17,3,13,7]], d:'250 mm steel blade on two columns.'}
];
const area = o => o.r.reduce((s,[,,w,h]) => s + w*h, 0);
const levelRooms = k => ROOMS.filter(r => r.lvl === k);
const levelTotal = k => levelRooms(k).reduce((s,r) => s + area(r), 0);
const fmt = (n, d=1) => n.toLocaleString('en-US', {minimumFractionDigits:d, maximumFractionDigits:d});
