"""Hovli villa in Blender, built from the explorer's export.

    1. node serve.js, open http://localhost:4817/explore.html?export  -> blender/villa.glb + blender/villa-extras.json
    2. blender -b -P blender/build_scene.py                               -> blender/hovli.blend
    3. blender -b blender/hovli.blend -P blender/render.py -- [shot ...]  -> blender/renders/<shot>.png

The geometry (walls, glazing, furniture, room dressing) comes from the same data as the drawings and the web explorer.
This script swaps every material for a Cycles one, adds slabs the web model leaves out, a dusk sky, downlights, lamps,
garden lights, trees and a landscape, and the cameras for the concept-board views. Plan coordinates (x east, y south,
h up, metres) map to Blender as X = x - 25, Y = 28 - y, Z = h.
"""
import bpy, bmesh, json, math, os, random
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
GLB, EXTRAS, OUT = (os.path.join(HERE, f) for f in ('villa.glb', 'villa-extras.json', 'hovli.blend'))
B_DROP = .15                       # the basement sits 15 cm lower so its 3.15 m walls stay under the lawn
LEVEL_Z = {'G': 0.0, 'F': 3.5, 'B': -3.5 - B_DROP}
CEIL = {'G': 3.05, 'F': 3.05, 'B': 2.83}
rng = random.Random(7)

def V(x, y, h=0.0): return Vector((x - 25.0, 28.0 - y, h))

# ---------------------------------------------------------------- scene, import, collections
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
ex = json.load(open(EXTRAS, encoding='utf-8'))
bpy.ops.import_scene.gltf(filepath=GLB)

def coll(name, parent=None):
    c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if c.name not in (parent or scene.collection).children: (parent or scene.collection).children.link(c)
    return c
C = {k: coll(k) for k in ('Site', 'House', 'Basement', 'Cutaway', 'Landscape', 'Lights_House', 'Lights_Basement', 'Lights_Site', 'Studio', 'Cameras')}
PART_COLL = {'site': 'Site', 'roof': 'House', 'full_G': 'House', 'full_F': 'House', 'full_B': 'Basement', 'cut_G': 'Cutaway', 'cut_F': 'Cutaway', 'cut_B': 'Cutaway'}

def move_to(obj, c):
    for u in list(obj.users_collection): u.objects.unlink(obj)
    c.objects.link(obj)

parts = {}
for o in list(bpy.data.objects):
    if o.parent is None and o.name.split('.')[0] in PART_COLL: parts[o.name.split('.')[0]] = o
for name, root in parts.items():
    for o in [root] + list(root.children_recursive): move_to(o, C[PART_COLL[name]])
parts['full_B'].location.z -= B_DROP
# the exploded axonometric: basement on the ground, then the 1st and 2nd floors lifted above it
parts['cut_G'].location.z += 6.5
parts['cut_F'].location.z += 9.5

# ---------------------------------------------------------------- material helpers (Cycles, procedural, object space)
def new_mat(name):
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(bsdf.outputs[0], out.inputs['Surface'])
    return m, nt, bsdf

def put(node, name, val):
    s = node.inputs.get(name)
    if s is None: return
    if isinstance(val, bpy.types.NodeSocket): node.id_data.links.new(val, s)
    else: s.default_value = val

def rgba(c): return (c[0], c[1], c[2], 1.0)

def tex_coord(nt, scale=(1, 1, 1), rot=(0, 0, 0)):
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector']); mp.inputs['Scale'].default_value = scale; mp.inputs['Rotation'].default_value = rot
    return mp.outputs['Vector']

def noise(nt, vec, scale=4.0, detail=6.0, rough=.55, distortion=0.0):
    n = nt.nodes.new('ShaderNodeTexNoise'); nt.links.new(vec, n.inputs['Vector'])
    put(n, 'Scale', scale); put(n, 'Detail', detail); put(n, 'Roughness', rough); put(n, 'Distortion', distortion)
    return n.outputs['Fac']

def ramp(nt, fac, stops):
    r = nt.nodes.new('ShaderNodeValToRGB'); nt.links.new(fac, r.inputs['Fac']); els = r.color_ramp.elements
    while len(els) > 1: els.remove(els[-1])
    els[0].position, els[0].color = stops[0][0], rgba(stops[0][1])
    for pos, c in stops[1:]: e = els.new(pos); e.color = rgba(c)
    return r.outputs['Color']

def mix(nt, a, b, fac=1.0, blend='MIX'):
    n = nt.nodes.new('ShaderNodeMix'); n.data_type = 'RGBA'; n.blend_type = blend
    fs = [s for s in n.inputs if s.name == 'Factor' and s.type == 'VALUE'][0]
    sa = [s for s in n.inputs if s.name == 'A' and s.type == 'RGBA'][0]; sb = [s for s in n.inputs if s.name == 'B' and s.type == 'RGBA'][0]
    for sock, v in ((fs, fac), (sa, a), (sb, b)):
        if isinstance(v, bpy.types.NodeSocket): nt.links.new(v, sock)
        else: sock.default_value = rgba(v) if sock is not fs else v
    return [s for s in n.outputs if s.type == 'RGBA'][0]

def bump(nt, height, strength=.2, distance=.01):
    b = nt.nodes.new('ShaderNodeBump'); nt.links.new(height, b.inputs['Height']); put(b, 'Strength', strength); put(b, 'Distance', distance)
    return b.outputs['Normal']

def brick(nt, vec, width, row, c1, c2, mortar, msize=.003, offset=.5, bias=0.0):
    b = nt.nodes.new('ShaderNodeTexBrick'); nt.links.new(vec, b.inputs['Vector']); b.offset = offset
    put(b, 'Scale', 1.0); put(b, 'Brick Width', width); put(b, 'Row Height', row); put(b, 'Mortar Size', msize); put(b, 'Mortar Smooth', .2); put(b, 'Bias', bias)
    put(b, 'Color1', rgba(c1)); put(b, 'Color2', rgba(c2)); put(b, 'Mortar', rgba(mortar))
    return b.outputs['Color'], b.outputs['Fac']

LIB = {}
def simple(name, color, rough=.6, metal=0.0, **kw):
    m, nt, p = new_mat(name); put(p, 'Base Color', rgba(color)); put(p, 'Roughness', rough); put(p, 'Metallic', metal)
    for k, v in kw.items(): put(p, k, v)
    LIB[name] = m; return m, nt, p

def emissive(name, color, strength):
    m, nt, p = simple(name, (0, 0, 0), 1.0); put(p, 'Emission Color', rgba(color)); put(p, 'Emission Strength', strength); return m

def fabric(name, color, sheen=.6, scale=180.0):
    m, nt, p = simple(name, color, .95, **{'Sheen Weight': sheen})
    v = tex_coord(nt); put(p, 'Normal', bump(nt, noise(nt, v, scale, 2, .5), .15, .004))
    put(p, 'Base Color', mix(nt, color, [c * .88 for c in color], noise(nt, v, 9, 2), 'MIX'))
    return m

def wood(name, a, b, rough=.45, grain=40.0, planks=None):
    m, nt, p = simple(name, a, rough); v = tex_coord(nt)
    w = nt.nodes.new('ShaderNodeTexWave'); nt.links.new(tex_coord(nt, (1, 6, 6)), w.inputs['Vector']); w.wave_type = 'BANDS'; w.bands_direction = 'X'
    put(w, 'Scale', grain * .5); put(w, 'Distortion', 2.5); put(w, 'Detail', 4.0); put(w, 'Detail Scale', 2.0)
    tone = ramp(nt, w.outputs['Fac'], [(0, a), (.55, [(x + y) / 2 for x, y in zip(a, b)]), (1, b)])
    tone = mix(nt, tone, [c * .8 for c in a], noise(nt, v, 1.5, 4), 'MIX')
    if planks:
        col, fac = brick(nt, v, planks[0], planks[1], (1, 1, 1), (.78, .74, .7), (.08, .06, .04), .0015, .37, 0.0)
        tone = mix(nt, tone, col, 1.0, 'MULTIPLY')
        put(p, 'Normal', bump(nt, fac, .25, .002))
    put(p, 'Base Color', tone); return m

def stone(name, base, vein, rough, vein_w=.02, tile=None, mortar=(.2, .2, .2), scale=1.2, dark_veins=False):
    m, nt, p = simple(name, base, rough); v = tex_coord(nt)
    f = noise(nt, v, scale, 8, .6, 5.0)
    col = ramp(nt, f, [(0, base), (.5 - vein_w, base), (.5, vein), (.5 + vein_w, base), (1, [c * .94 for c in base])])
    col = mix(nt, col, [c * .9 for c in base], noise(nt, v, 3, 4), 'MIX')
    if tile:
        t, fac = brick(nt, v, tile[0], tile[1], (1, 1, 1), (.96, .96, .96), mortar, .0018, tile[2] if len(tile) > 2 else 0.0)
        col = mix(nt, col, t, 1.0, 'MULTIPLY'); put(p, 'Normal', bump(nt, fac, .2, .002))
    put(p, 'Base Color', col); return m

def wall_uv(nt):
    """(x + y, z): panel courses run level and joints line up on walls facing any way."""
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); add = nt.nodes.new('ShaderNodeMath'); comb = nt.nodes.new('ShaderNodeCombineXYZ')
    add.operation = 'ADD'; nt.links.new(tc.outputs['Object'], sep.inputs[0]); nt.links.new(sep.outputs['X'], add.inputs[0]); nt.links.new(sep.outputs['Y'], add.inputs[1])
    nt.links.new(add.outputs[0], comb.inputs['X']); nt.links.new(sep.outputs['Z'], comb.inputs['Y'])
    return comb.outputs[0]

def cladding(name, a, b, joint, w, h, rough, offset=0.0, pits=False, vertical=True):
    m, nt, p = simple(name, a, rough); v = wall_uv(nt) if vertical else tex_coord(nt)
    col, fac = brick(nt, v, w, h, a, b, joint, .006, offset, .2)
    col = mix(nt, col, [c * .85 for c in a], noise(nt, tex_coord(nt), 6, 6), 'MIX')
    put(p, 'Base Color', col)
    hgt = fac
    if pits:
        mth = nt.nodes.new('ShaderNodeMath'); mth.operation = 'ADD'; nt.links.new(fac, mth.inputs[0]); nt.links.new(noise(nt, tex_coord(nt), 40, 2), mth.inputs[1]); hgt = mth.outputs[0]
    put(p, 'Normal', bump(nt, hgt, .35, .004)); return m

# walls, structure, outside
m, nt, p = simple('plaster', (.80, .77, .72), .9); put(p, 'Normal', bump(nt, noise(nt, tex_coord(nt), 25, 3), .05, .004))
m, nt, p = simple('cap', (.86, .84, .80), .9)
m, nt, p = simple('extConc', (.42, .41, .39), .85); v = tex_coord(nt); put(p, 'Base Color', mix(nt, (.42, .41, .39), (.33, .32, .3), noise(nt, v, 3, 6))); put(p, 'Normal', bump(nt, noise(nt, v, 30, 4), .1))
cladding('darkStone', (.055, .05, .046), (.075, .07, .064), (.02, .02, .02), 1.2, .6, .5)
cladding('travertine', (.58, .51, .41), (.66, .59, .48), (.33, .29, .24), 1.2, .6, .7, .5, pits=True)
wood('slats', (.20, .11, .055), (.32, .19, .10), .55, 60, (2.4, .06))
cladding('pavers', (.33, .31, .29), (.40, .38, .35), (.08, .075, .07), 1.2, .6, .85, .5, vertical=False)
m, nt, p = simple('base', (.05, .045, .04), .8); simple('plinth', (.045, .04, .036), .8)
m, nt, p = simple('road', (.025, .025, .027), .9); put(p, 'Normal', bump(nt, noise(nt, tex_coord(nt), 80, 3), .3))
m, nt, p = simple('grass', (.06, .10, .035), .95); v = tex_coord(nt)
put(p, 'Base Color', mix(nt, (.05, .085, .03), (.10, .14, .05), noise(nt, v, 2.5, 6))); put(p, 'Normal', bump(nt, noise(nt, v, 300, 2), .5, .01))
simple('court', (.09, .12, .11), .8)
m, nt, p = simple('tile', (.6, .82, .85), .15); v = tex_coord(nt)
t, fac = brick(nt, v, .1, .1, (.6, .82, .85), (.52, .76, .8), (.88, .9, .9), .002, 0.0); put(p, 'Base Color', t); put(p, 'Normal', bump(nt, fac, .2, .001))
m, nt, p = simple('water', (.62, .88, .9), .02, **{'Transmission Weight': 1.0, 'IOR': 1.333})
put(p, 'Normal', bump(nt, noise(nt, tex_coord(nt, (1, 1, 4)), 1.2, 3, .5), .15, .05))
for g in ('glass', 'glassLit', 'gh'): simple(g, (.92, .95, .94), 0.0, **{'Transmission Weight': 1.0, 'IOR': 1.45})

# floors and stone
stone('porcelain', (.56, .53, .49), (.72, .70, .67), .12, .015, (1.2, 1.2), (.32, .3, .28))
stone('porcelainDark', (.12, .115, .11), (.24, .23, .22), .22, .012, (1.2, 1.2), (.05, .05, .05))
stone('marble', (.58, .59, .59), (.82, .82, .80), .2, .02, (.6, .6), (.35, .35, .35))
stone('stone', (.62, .58, .52), (.7, .66, .6), .4, .01, (1.2, .6, .5), (.4, .37, .33))
stone('worktop', (.80, .79, .76), (.45, .44, .42), .12, .008)
stone('nero', (.03, .029, .027), (.55, .53, .5), .1, .006)
m, nt, p = simple('concrete', (.40, .40, .39), .45); v = tex_coord(nt); put(p, 'Base Color', mix(nt, (.42, .42, .41), (.33, .33, .32), noise(nt, v, 1.5, 6)))
wood('oak', (.33, .2, .1), (.45, .3, .16), .38, 45, (2.0, .2))
wood('oakV', (.42, .27, .14), (.55, .38, .21), .45, 50)
wood('walnut', (.12, .065, .035), (.2, .12, .065), .4, 50)
# joinery, metals, glass items
simple('cabinet', (.022, .022, .024), .45); simple('blackMatte', (.018, .018, .02), .5, .2); simple('blkExt', (.03, .03, .033), .5, .3)
simple('steel', (.72, .73, .74), .22, 1.0); simple('metal', (.55, .56, .58), .35, .9); simple('brass', (.75, .55, .3), .28, 1.0)
simple('chest', (.035, .037, .04), .32, .6); simple('equip', (.5, .52, .53), .45, .4); simple('cnc', (.72, .72, .7), .4)
simple('robot', (.82, .81, .78), .35); simple('orange', (.8, .3, .06), .45); simple('red', (.55, .05, .035), .45); simple('kraft', (.4, .28, .16), .85)
simple('ceramic', (.86, .85, .83), .08, **{'Coat Weight': .5}); simple('bathIn', (.8, .82, .82), .05); simple('mirror', (.95, .95, .95), .02, 1.0)
simple('tvGlass', (.004, .004, .005), .04, **{'Coat Weight': 1.0}); simple('smoked', (.02, .025, .028), .05, .3)
simple('car', (.035, .035, .04), .3, .9, **{'Coat Weight': 1.0}); simple('tyre', (.015, .015, .015), .9)
m, nt, p = simple('peg', (.68, .66, .62), .8); v = tex_coord(nt)
t, fac = brick(nt, v, .025, .025, (.68, .66, .62), (.68, .66, .62), (.05, .05, .05), .006, 0.0); put(p, 'Base Color', t)
m, nt, p = simple('pot', (.6, .58, .55), .8); put(p, 'Normal', bump(nt, noise(nt, tex_coord(nt), 40, 3), .2))
simple('potDark', (.12, .115, .11), .7)
# fabrics
for n, c in (('linen', (.80, .78, .74)), ('duvet', (.72, .69, .64)), ('sofa', (.48, .44, .39)), ('sofaLight', (.6, .56, .5)), ('charcoal', (.055, .055, .06)),
             ('olive', (.22, .24, .15)), ('rust', (.42, .17, .08)), ('cinema', (.03, .032, .036)), ('greyFab', (.16, .15, .14)), ('taupe', (.26, .22, .18))):
    fabric(n, c)
fabric('boucle', (.70, .66, .58), .8, 90); fabric('boucleDark', (.16, .15, .135), .6, 90)
fabric('rug', (.62, .58, .52), .4, 120); fabric('rugDark', (.12, .11, .1), .4, 120); fabric('carpet', (.025, .025, .03), .4, 200)
for n, c in (('olea', (.10, .13, .07)), ('leafA', (.06, .11, .035)), ('leafB', (.09, .14, .05))):
    m, nt, p = simple(n, c, .55, **{'Subsurface Weight': .15})
m, nt, p = simple('bark', (.10, .08, .065), .9); put(p, 'Normal', bump(nt, noise(nt, tex_coord(nt, (8, 8, 1)), 6, 4), .6, .01))
# light sources
emissive('led', (1.0, .72, .42), 14.0); emissive('bulb', (1.0, .8, .55), 30.0); emissive('fire', (1.0, .42, .1), 22.0)
emissive('ledBlue', (.6, .75, 1.0), 4.0)
m, nt, p = simple('shade', (.95, .88, .76), .9, **{'Transmission Weight': .6}); put(p, 'Emission Color', rgba((1, .74, .45))); put(p, 'Emission Strength', 2.5)
m, nt, p = simple('screen', (.6, .6, .6), .6)

def image_mat(src, name, emission=0.0, alpha=False):
    """Art, the film still and the fire keep the image the explorer painted; Blender re-lights them."""
    img = next((n.image for n in src.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image), None) if src and src.node_tree else None
    m, nt, p = new_mat(name); put(p, 'Roughness', .85)
    if img:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = img
        put(p, 'Base Color', t.outputs['Color'])
        if emission: put(p, 'Emission Color', t.outputs['Color']); put(p, 'Emission Strength', emission)
        if alpha: put(p, 'Alpha', t.outputs['Alpha'])
    return m

# ---------------------------------------------------------------- swap the imported materials
cache = {}
for o in bpy.data.objects:
    if o.type != 'MESH': continue
    for slot in o.material_slots:
        src = slot.material
        if not src: continue
        base = src.name.split('.')[0]
        if base.startswith('floor_'): base = base[6:]
        if base in ('art0', 'art1', 'art2', 'art3', 'film', 'flame'):
            key = base
            if key not in cache:
                cache[key] = image_mat(src, 'img_' + key, emission={'film': 2.0, 'flame': 25.0}.get(key, 0.0), alpha=key == 'flame')
            slot.material = cache[key]
        elif base in LIB:
            slot.material = LIB[base]
        else:
            print('no Cycles material for', base)
keep = set(LIB.values()) | set(cache.values())
for mat in list(bpy.data.materials):   # drop the imported placeholders, keep the library
    if mat.users == 0 and mat not in keep: bpy.data.materials.remove(mat)
for k, mat in LIB.items(): mat.name = k   # names were taken by the placeholders while they existed

# ---------------------------------------------------------------- geometry the web model leaves out
def prism(name, outline, z1, z2, mat, c, holes=()):
    bm = bmesh.new()
    vs = [bm.verts.new(V(x, y, z1)) for x, y in outline]
    f = bm.faces.new(vs)
    if f.normal.z > 0: f.normal_flip()
    ext = bmesh.ops.extrude_face_region(bm, geom=[f]); top = [e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, 0, z2 - z1), verts=top)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); me.materials.append(LIB[mat]); c.objects.link(ob); return ob

def box(name, x1, x2, y1, y2, z1, z2, mat, c):
    return prism(name, [(x1, y1), (x2, y1), (x2, y2), (x1, y2)], z1, z2, mat, c)

BZ = LEVEL_Z['B']
prism('B floor slab', ex['levels']['B']['outline'], BZ - .3, BZ, 'concrete', C['Basement'])
prism('B ceiling slab', ex['levels']['B']['outline'], BZ + CEIL['B'] + .02, -.5, 'plaster', C['Basement'])
# LED coves in the main living spaces, a warm line just under the ceiling like the board's interiors
for r in ex['rooms']:
    if r['lvl'] not in ('G', 'F') or r['k'] != 'live': continue
    z = LEVEL_Z[r['lvl']] + CEIL[r['lvl']] - .06
    for (x, y, w, h) in r['r']:
        if w < 3 or h < 3: continue
        i = .12
        for a in ((x + i, x + w - i, y + i, y + i + .03), (x + i, x + w - i, y + h - i - .03, y + h - i), (x + i, x + i + .03, y + i, y + h - i), (x + w - i - .03, x + w - i, y + i, y + h - i)):
            box('cove ' + r['id'], a[0], a[1], a[2], a[3], z, z + .03, 'led', C['House'])

# ---------------------------------------------------------------- lights
def light(name, kind, loc, energy, color=(1, .78, .55), radius=.05, c=None, spot=None, aim=None):
    ld = bpy.data.lights.new(name, kind); ld.energy = energy; ld.color = color
    try: ld.shadow_soft_size = radius
    except Exception: pass
    if spot: ld.spot_size, ld.spot_blend = spot
    ob = bpy.data.objects.new(name, ld); ob.location = loc; (c or C['Lights_House']).objects.link(ob)
    if aim is not None: ob.rotation_euler = (aim - loc).to_track_quat('-Z', 'Y').to_euler()
    return ob

def level_of(part):
    return {'full_G': 'G', 'full_F': 'F', 'full_B': 'B'}.get(part)

for pl in ex['pools']:
    lv = level_of(pl['part'])
    if not lv: continue
    x, y, h = pl['p']; h -= B_DROP if lv == 'B' else 0.0; rel = h - LEVEL_Z[lv]; i = pl['c'][0]
    if rel < .2 and i <= .105:   # a recessed downlight: a warm spot just under the ceiling
        loc = V(x, y, LEVEL_Z[lv] + CEIL[lv] - .03)
        light('downlight', 'SPOT', loc, 85.0 if i > .08 else 55.0, (1, .8, .6), .04, C['Lights_Basement' if lv == 'B' else 'Lights_House'], (math.radians(100), .7), loc - Vector((0, 0, 1)))
for g in ex['glows']:
    x, y, h = g['p']
    if g['part'] == 'site':   # wall washers, path bollards and tree uplights
        if g['s'] > 2: light('tree uplight', 'SPOT', V(x, y, h), 150.0, (1, .8, .55), .05, C['Lights_Site'], (math.radians(40), .5), V(x, y, h + 3))
        else: light('garden light', 'POINT', V(x, y, h + .05), 25.0, (1, .76, .5), .03, C['Lights_Site'])
        continue
    lv = level_of(g['part'])
    if not lv: continue
    h -= B_DROP if lv == 'B' else 0.0
    light('lamp', 'POINT', V(x, y, h), 60.0 if g['s'] >= .6 else 30.0, (1, .72, .45), .04, C['Lights_Basement' if lv == 'B' else 'Lights_House'])
# the pool: lights in the walls below the water line
for yy in range(24, 42, 3):
    for xx in (20.2, 29.8): light('pool light', 'POINT', V(xx, yy, -.8), 180.0, (.7, .95, 1.0), .06, C['Lights_Site'])
# dusk sun, low in the west-south-west
sun = light('dusk sun', 'SUN', V(-60, 70, 12), 1.6, (1.0, .55, .3), 0.0, C['Lights_Site'], None, V(25, 28, 0))
sun.data.angle = math.radians(2.5)
# studio lights for the exploded axonometric
light('studio key', 'AREA', V(-5, 70, 45), 9000.0, (1, .95, .9), 0.0, C['Studio'], None, V(25, 28, 4)).data.size = 25.0
light('studio fill', 'AREA', V(70, 60, 25), 2500.0, (.9, .9, 1.0), 0.0, C['Studio'], None, V(25, 28, 4)).data.size = 20.0

# ---------------------------------------------------------------- worlds: dusk sky and a dark studio
def gradient_world(name, stops, strength=1.0, light=None):
    """A sky graded by height. With light=(colour, strength) the camera still sees the gradient but the scene is lit
    by an even, brighter dome: a dark studio backdrop with soft model lighting."""
    w = bpy.data.worlds.new(name)
    try: w.use_nodes = True
    except Exception: pass
    nt = w.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputWorld'); bg = nt.nodes.new('ShaderNodeBackground'); tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); mr = nt.nodes.new('ShaderNodeMapRange')
    nt.links.new(tc.outputs['Generated'], sep.inputs[0]); nt.links.new(sep.outputs['Z'], mr.inputs['Value'])
    mr.inputs['From Min'].default_value = -.05; mr.inputs['From Max'].default_value = .65
    nt.links.new(ramp(nt, mr.outputs['Result'], stops), bg.inputs['Color']); bg.inputs['Strength'].default_value = strength
    if not light: nt.links.new(bg.outputs[0], out.inputs['Surface']); return w
    dome = nt.nodes.new('ShaderNodeBackground'); dome.inputs['Color'].default_value = rgba(light[0]); dome.inputs['Strength'].default_value = light[1]
    lp = nt.nodes.new('ShaderNodeLightPath'); mx = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(lp.outputs['Is Camera Ray'], mx.inputs[0]); nt.links.new(dome.outputs[0], mx.inputs[1]); nt.links.new(bg.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], out.inputs['Surface']); return w
DUSK = gradient_world('Dusk', [(0, (.02, .018, .016)), (.06, (1.0, .5, .26)), (.16, (.85, .45, .4)), (.38, (.3, .25, .38)), (1, (.035, .045, .11))], 1.2)
STUDIO = gradient_world('Studio', [(0, (.012, .011, .01)), (.5, (.02, .018, .016)), (1, (.03, .028, .025))], 1.0, ((1, .96, .9), .8))
DUSK.use_fake_user = STUDIO.use_fake_user = True   # render.py switches between them; keep both in the file
scene.world = DUSK

# ---------------------------------------------------------------- foliage: the explorer's leaf blobs become clouds of real leaves
def leafy(bm, centre, rx, ry, rz, n, size, mat_index):
    """n small leaf cards, randomly turned, filling an ellipsoid around centre (denser towards the outside)."""
    for _ in range(n):
        u = Vector((rng.gauss(0, 1), rng.gauss(0, 1), rng.gauss(0, 1))).normalized() * (rng.random() ** .35)
        p = centre + Vector((u.x * rx, u.y * ry, u.z * rz)); s = size * rng.uniform(.6, 1.3)
        a = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))).normalized(); b = a.orthogonal().normalized(); c2 = a.cross(b)
        q = [bm.verts.new(p + (b * sx + c2 * sy) * s) for sx, sy in ((-.5, 0), (0, -.17), (.5, 0), (0, .17))]   # a narrow, pointed leaf
        bm.faces.new(q).material_index = mat_index

def refoliate(o, size):
    bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=.0005); bm.verts.ensure_lookup_table()
    seen, blobs = set(), []
    for v in bm.verts:
        if v.index in seen: continue
        stack, pts = [v], []; seen.add(v.index)
        while stack:
            a = stack.pop(); pts.append(a.co.copy())
            for e in a.link_edges:
                b = e.other_vert(a)
                if b.index not in seen: seen.add(b.index); stack.append(b)
        c = sum(pts, Vector()) / len(pts); blobs.append((c, max((p - c).length for p in pts)))
    bm.free(); out = bmesh.new()
    for c, r in blobs: leafy(out, c, r * 1.15, r * 1.15, r * .95, max(30, min(700, int(200 * (r / .12) ** 2))), size, 0)
    out.to_mesh(o.data); out.free()
LEAVES = {'olea': .085, 'leafA': .075, 'leafB': .075}
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.material_slots and o.material_slots[0].material and o.material_slots[0].material.name in LEAVES and o.users_collection[0].name in ('Site', 'House', 'Basement', 'Cutaway'):
        refoliate(o, LEAVES[o.material_slots[0].material.name])

# ---------------------------------------------------------------- the workshop and lab: linear lights across the ceiling, as on the board
for r in ex['rooms']:
    if r['lvl'] != 'B' or not any(w in r['n'] for w in ('Workshop', 'Lab', 'Gym')): continue
    z = LEVEL_Z['B'] + CEIL['B'] - .02
    for (x, y, w, h) in r['r']:
        n = max(1, int(w / 1.6))
        for i in range(n):
            xx = x + w * (i + .5) / n; box('track light', xx - .025, xx + .025, y + .5, y + h - .5, z - .04, z, 'led', C['Basement'])
            for j in range(int((h - 1) / 1.4)):
                yy = y + .7 + j * 1.4; light('track spot', 'SPOT', V(xx, yy, z - .06), 45.0, (1, .86, .7), .03, C['Lights_Basement'], (math.radians(70), .4), V(xx, yy, z - 2))

# ---------------------------------------------------------------- landscape: ground, trees inside the walls, forest beyond
def mesh_obj(name, bm, mats, c):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for m in mats: me.materials.append(LIB[m])
    ob = bpy.data.objects.new(name, me); c.objects.link(ob); return ob

lib = bpy.data.collections.new('Tree models')   # instanced, never linked to the scene itself

def deciduous(name, height=6.0, spread=2.4):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=10, radius1=.16, radius2=.07, depth=height * .55, matrix=Matrix.Translation((0, 0, height * .275)))
    for i in range(5):
        a = i * 1.26 + rng.uniform(0, .5); top = Vector((math.cos(a) * spread * .45, math.sin(a) * spread * .45, height * rng.uniform(.62, .78)))
        base = Vector((0, 0, height * .45)); d = top - base
        cone = bmesh.ops.create_cone(bm, cap_ends=True, segments=6, radius1=.06, radius2=.025, depth=d.length)
        rot = d.to_track_quat('Z', 'Y').to_matrix().to_4x4()
        bmesh.ops.transform(bm, matrix=Matrix.Translation((base + top) / 2) @ rot, verts=cone['verts'])
    for f in bm.faces: f.material_index = 0
    for i in range(6):
        a = i * 1.05 + rng.uniform(0, .4); r = spread * rng.uniform(.25, .5)
        leafy(bm, Vector((math.cos(a) * r, math.sin(a) * r, height * rng.uniform(.68, .86))), spread * .55, spread * .55, height * .16, 550, .16, 1 + i % 2)
    ob = mesh_obj(name, bm, ('bark', 'leafA', 'leafB'), lib)
    return ob

def fir(name, height=14.0):
    bm = bmesh.new(); Mx = Matrix
    bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=.25, radius2=.08, depth=height * .3, matrix=Mx.Translation((0, 0, height * .15)))
    for f in bm.faces: f.material_index = 0
    tiers = 9
    for i in range(tiers):   # drooping, ragged skirts of branches, narrowing to the tip
        z = height * (.16 + .8 * i / tiers); r = height * .19 * (1 - i / tiers) ** .9 + .3
        cone = bmesh.ops.create_cone(bm, cap_ends=False, segments=22, radius1=r, radius2=.04, depth=height * .2, matrix=Mx.Translation((0, 0, z + height * .1)))
        for v in cone['verts']:
            if v.co.z < z + height * .05:
                k = rng.uniform(.65, 1.15); v.co.x *= k; v.co.y *= k; v.co.z -= rng.uniform(0, .35) * r
        for f in {f for v in cone['verts'] for f in v.link_faces}: f.material_index = 1
        leafy(bm, Vector((0, 0, z + height * .04)), r * .95, r * .95, height * .05, int(90 * r), .35, 1)
    return mesh_obj(name, bm, ('bark', 'leafA'), lib)

tree_models = [deciduous('olive tree %d' % i, rng.uniform(5.0, 6.5), rng.uniform(2.0, 2.8)) for i in range(3)]
fir_models = [fir('fir %d' % i, rng.uniform(12, 18)) for i in range(3)]
shrub_bm = bmesh.new(); leafy(shrub_bm, Vector((0, 0, .7)), .8, .8, .6, 700, .12, 0); shrub = mesh_obj('shrub', shrub_bm, ('leafB',), lib)

def place(model, loc, scale=1.0, c=None):
    cl = bpy.data.collections.get('inst ' + model.name)
    if not cl: cl = bpy.data.collections.new('inst ' + model.name); cl.objects.link(model)
    ob = bpy.data.objects.new(model.name + ' inst', None); ob.instance_type = 'COLLECTION'; ob.instance_collection = cl
    ob.location = loc; ob.scale = (scale, scale, scale); ob.rotation_euler.z = rng.uniform(0, math.tau); (c or C['Landscape']).objects.link(ob); return ob

P = ex['plot']
for x, y in ex['trees']: place(rng.choice(tree_models), V(x, y, -.5), rng.uniform(.85, 1.1))
# shrubs along the inside of the perimeter wall, leaving the gate and the garden rooms clear
gate = (1.8, 9.2)
for t in range(0, int(P['w'] * 2 + P['h'] * 2), 3):
    t += rng.uniform(-.6, .6); x0, x1, y1 = P['x0'] + .9, P['x1'] - .9, P['y1'] - .9
    if t < P['w']: x, y = P['x0'] + t, .9
    elif t < P['w'] + P['h']: x, y = x1, t - P['w']
    elif t < 2 * P['w'] + P['h']: x, y = P['x1'] - (t - P['w'] - P['h']), y1
    else: x, y = x0, P['h'] - (t - 2 * P['w'] - P['h'])
    if y < 1.5 and gate[0] - 1 < x < gate[1] + 1: continue
    if x > P['x1'] - 2 and 10 < y < 17: continue
    place(shrub, V(x, y, -.5), rng.uniform(.8, 1.3))
# the world outside: rolling lawn, a road to the north, a forest ring and a soft horizon
ground = bmesh.new()   # a ring around the plot: inside the walls the site's own lawn takes over (and leaves the pool open)
ox1, ox2, oy1, oy2, ix1, ix2, iy1, iy2 = -900, 950, -900, 950, P['x0'] + .3, P['x1'] - .3, .3, P['y1'] - .3
o4 = [ground.verts.new(V(x, y, -.53)) for x, y in ((ox1, oy1), (ox2, oy1), (ox2, oy2), (ox1, oy2))]
i4 = [ground.verts.new(V(x, y, -.53)) for x, y in ((ix1, iy1), (ix2, iy1), (ix2, iy2), (ix1, iy2))]
for k in range(4): ground.faces.new((o4[k], o4[(k + 1) % 4], i4[(k + 1) % 4], i4[k]))
bmesh.ops.recalc_face_normals(ground, faces=ground.faces)
for f in ground.faces:
    if f.normal.z < 0: f.normal_flip()
mesh_obj('ground', ground, ('grass',), C['Landscape'])
box('road', -80, 130, -14, -6, -.53, -.51, 'road', C['Landscape'])
for i in range(260):
    a = rng.uniform(0, math.tau); r = rng.uniform(52, 190)
    x, y = 23 + math.cos(a) * r * 1.1, 33 + math.sin(a) * r
    if -16 < y < -4 and -80 < x < 130: continue
    place(rng.choice(fir_models) if rng.random() < .65 else rng.choice(tree_models), V(x, y, -.55), rng.uniform(.8, 1.5) if r > 80 else rng.uniform(.7, 1.1))

# ---------------------------------------------------------------- cameras: the concept-board views
SHOTS = {}
def cam(name, pos, target, lens=24.0, collections=('Site', 'House', 'Basement', 'Landscape', 'Lights_House', 'Lights_Basement', 'Lights_Site'),
        world='Dusk', samples=256, res=(1920, 1080), ortho=None, exposure=0.0):
    cd = bpy.data.cameras.new(name); cd.lens = lens; cd.clip_start = .05; cd.clip_end = 2000
    if ortho: cd.type = 'ORTHO'; cd.ortho_scale = ortho
    ob = bpy.data.objects.new(name, cd); ob.location = pos; ob.rotation_euler = (target - pos).to_track_quat('-Z', 'Y').to_euler(); C['Cameras'].objects.link(ob)
    SHOTS[name] = {'collections': list(collections), 'world': world, 'samples': samples, 'res': list(res), 'exposure': exposure}
cam('exterior', V(60, 84, 36), V(24, 29, 0), 30, samples=192, exposure=1.3)
cam('pool', V(31.8, 45.2, 1.65), V(22.5, 19.0, 2.6), 18, exposure=.9)
cam('living', V(16.9, 14.75, 1.45), V(25.5, 20.0, .9), 16, exposure=.3)
cam('kitchen', V(36.1, 18.6, 1.55), V(31.0, 10.6, 1.05), 18, exposure=.3)
cam('workshop', V(41.3, 28.15, BZ + 1.7), V(37.2, 19.6, BZ + .9), 17, exposure=.4)
cam('cinema', V(14.75, 17.9, BZ + 1.95), V(8.4, 13.6, BZ + 1.0), 18, exposure=.4)
cam('bedroom', V(41.6, 45.6, 3.5 + 1.5), V(36.6, 37.6, 3.5 + .8), 18, exposure=.3)
cam('axo', V(-34, 98, 62), V(25, 28, 9.5), 50, ('Cutaway', 'Studio'), 'Studio', 192, (1600, 1600), 62, -.2)
scene['shots'] = json.dumps(SHOTS)

# ---------------------------------------------------------------- render settings
scene.render.engine = 'CYCLES'
cy = scene.cycles
cy.samples = 256; cy.use_denoising = True; cy.max_bounces = 8; cy.diffuse_bounces = 4; cy.glossy_bounces = 4; cy.transmission_bounces = 8
cy.caustics_reflective = False; cy.caustics_refractive = False; cy.sample_clamp_indirect = 8.0
try: cy.adaptive_threshold = .02
except Exception: pass
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for dt in ('OPTIX', 'CUDA'):
        try:
            prefs.compute_device_type = dt; prefs.get_devices()
            if any(d.type == dt for d in prefs.devices): break
        except TypeError: continue
    for d in prefs.devices: d.use = d.type == prefs.compute_device_type
    cy.device = 'GPU'
except Exception as e: print('GPU setup skipped:', e)
scene.render.resolution_x, scene.render.resolution_y = 1920, 1080
scene.render.image_settings.file_format = 'PNG'
try:
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Medium High Contrast'
except TypeError: pass
scene.camera = bpy.data.objects['exterior']
bpy.ops.wm.save_as_mainfile(filepath=OUT, compress=True)
print('saved', OUT, 'objects', len(bpy.data.objects), 'lights', len(bpy.data.lights))
