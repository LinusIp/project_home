"""Renders the concept-board views from blender/hovli.blend.

    blender -b blender/hovli.blend -P blender/render.py -- [--quick] [shot ...]

Shots: exterior pool living kitchen workshop cinema bedroom axo (all of them when none is named).
--quick renders at half size with few samples, for checking framing and light. Output: blender/renders/<shot>.png
"""
import bpy, json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
quick = '--quick' in args
scene = bpy.context.scene
shots = json.loads(scene['shots'])
names = [a for a in args if not a.startswith('--')] or list(shots)
os.makedirs(os.path.join(HERE, 'renders'), exist_ok=True)

# the GPU choice lives in user preferences, not in the .blend, so pick it again here
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for dt in ('OPTIX', 'CUDA'):
        try:
            prefs.compute_device_type = dt; prefs.get_devices()
            if any(d.type == dt for d in prefs.devices): break
        except TypeError: continue
    for d in prefs.devices: d.use = d.type == prefs.compute_device_type
    scene.cycles.device = 'GPU'
    print('render device:', prefs.compute_device_type, [d.name for d in prefs.devices if d.use])
except Exception as e: print('GPU setup skipped:', e)

layer = bpy.context.view_layer
for name in names:
    s = shots[name]
    keep = set(s['collections']) | {'Cameras'}
    for lc in layer.layer_collection.children: lc.exclude = lc.name not in keep
    scene.world = bpy.data.worlds[s['world']]
    scene.camera = bpy.data.objects[name]
    scene.cycles.samples = 48 if quick else s['samples']
    scene.render.resolution_x, scene.render.resolution_y = s['res']
    scene.render.resolution_percentage = 50 if quick else 100
    scene.view_settings.exposure = s['exposure']
    scene.render.filepath = os.path.join(HERE, 'renders', name + ('-quick' if quick else '') + '.png')
    t = time.time(); bpy.ops.render.render(write_still=True)
    print('rendered %s in %ds -> %s' % (name, time.time() - t, scene.render.filepath), flush=True)
