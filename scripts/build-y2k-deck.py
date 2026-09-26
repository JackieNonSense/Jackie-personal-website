"""Y2K in-dash stack: the Blender 3.5 source for the homepage music deck.

  G:/Blender/blender.exe -b -P scripts/build-y2k-deck.py -- frames [--quick] [--only=open|closed|opening|front]

A 2DIN head unit with a sculpted dark-titanium faceplate - a disc window on the left
ringed by an electrode gauge, a smoked multicolour display, translucent capsule keys
down the right-hand bulge, pill keys along the chin - under a 1DIN motorised screen
that slides out of its slot and tilts up on a chrome hinge bar. Modelled in cm under a
root scaled to metres; faces look at -Y, z up.
"""
import bpy, bmesh, math, sys, random, json
from mathutils import Vector
from pathlib import Path

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
QUICK = '--quick' in ARGS
ONLY = next((a.split('=', 1)[1] for a in ARGS if a.startswith('--only=')), None)
ARGS = [a for a in ARGS if not a.startswith('--')]
MODE = ARGS[0] if ARGS else 'frames'
ROOT = Path(__file__).resolve().parents[1]
FRAMES = ROOT / 'docs/visual/y2k-deck'
FONTS = Path('C:/Windows/Fonts')
BLENDER_WORLD = Path(bpy.utils.resource_path('LOCAL')) / 'datafiles/studiolights/world/studio.exr'

def lin(hex_):
    c = [int(hex_[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in c)

NEON = dict(purple=lin('#b04cff'), magenta=lin('#ff3fb4'), blue=lin('#3d6bff'), cyan=lin('#27e8ff'), green=lin('#58ff6a'),
            yellow=lin('#ffe14a'), orange=lin('#ff8a1f'), white=lin('#e8f4ff'), dim=lin('#1a1438'), dim2=lin('#101a33'))
RAINBOW = ['purple', 'blue', 'cyan', 'green', 'yellow', 'orange']
INK = dict(print_blue=lin('#244aaa'), ivory=lin('#d8d6cd'))

# ---------------------------------------------------------------- layout (cm)
DISC = dict(cx=-4.9, cz=5.3, window=3.5, bezel=4.2, disc=4.0)       # an 8 cm CD single, seen through its window
DISPLAY = dict(x1=6.5, top=9.25, bottom=2.55, arc=4.55)              # left edge is an arc round the disc
UNIT_TOP = 10.3
SCREEN = dict(slot_z=12.35, tray=8.0, w=17.4, h=11.0, gw=15.2, gh=8.55, chin=1.9)
STATE = dict(power=True, open=1.0, progress=.36, volume=.42, title='DIVA', track='02', time='01:12', disc_angle=24)

# ---------------------------------------------------------------- scene
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    FONT_CACHE.clear()
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for kind in ('OPTIX', 'CUDA'):
        try:
            prefs.compute_device_type = kind
            prefs.get_devices()
            if any(d.type == kind for d in prefs.devices):
                for d in prefs.devices:
                    d.use = d.type == kind
                scene.cycles.device = 'GPU'
                break
        except TypeError:
            continue
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = 'OPENIMAGEDENOISE'
    scene.cycles.samples = 48 if QUICK else 320
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.max_bounces = 10
    scene.cycles.glossy_bounces = 6
    scene.cycles.transmission_bounces = 10
    scene.render.film_transparent = True
    scene.view_settings.view_transform = 'Filmic'
    for look in ('Filmic - Medium High Contrast', 'Medium High Contrast'):
        try:
            scene.view_settings.look = look
            break
        except TypeError:
            pass
    scene.view_settings.exposure = 0
    return scene

def root():
    r = bpy.data.objects.new('Deck', None)
    bpy.context.collection.objects.link(r)
    r.scale = (.01, .01, .01)
    return r

MATS = {}
def principled(name, color, metal=0., rough=.5, **kw):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = rough
    for k, v in kw.items():
        p.inputs[k].default_value = (*v, 1) if isinstance(v, tuple) else v
    MATS[name] = m
    return m

def emissive(name, color, strength):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes['Principled BSDF'])
    e = nt.nodes.new('ShaderNodeEmission')
    e.inputs['Color'].default_value = (*color, 1)
    e.inputs['Strength'].default_value = strength
    nt.links.new(e.outputs[0], nt.nodes['Material Output'].inputs[0])
    MATS[name] = m
    return m

def grain(m, scale=900., amount=.08, rough_span=(.34, .5)):
    """Bead-blasted metal: a fine bump and a roughness that wanders a little."""
    nt = m.node_tree
    p = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord')
    n = nt.nodes.new('ShaderNodeTexNoise')
    n.inputs['Scale'].default_value = scale
    n.inputs['Detail'].default_value = 6
    nt.links.new(tc.outputs['Object'], n.inputs['Vector'])
    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = amount
    bump.inputs['Distance'].default_value = .02
    nt.links.new(n.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], p.inputs['Normal'])
    big = nt.nodes.new('ShaderNodeTexNoise')
    big.inputs['Scale'].default_value = 6
    nt.links.new(tc.outputs['Object'], big.inputs['Vector'])
    ramp = nt.nodes.new('ShaderNodeMapRange')
    ramp.inputs['To Min'].default_value, ramp.inputs['To Max'].default_value = rough_span
    nt.links.new(big.outputs['Fac'], ramp.inputs['Value'])
    nt.links.new(ramp.outputs['Result'], p.inputs['Roughness'])
    return m

def wear(m, edge=(.42, .43, .44), grime=.5):
    """Handled edges catch bare metal; crevices collect grime."""
    nt = m.node_tree
    p = nt.nodes['Principled BSDF']
    base = p.inputs['Base Color'].default_value[:]
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    bev = nt.nodes.new('ShaderNodeBevel'); bev.samples = 8; bev.inputs['Radius'].default_value = .0012
    dot = nt.nodes.new('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'
    nt.links.new(bev.outputs[0], dot.inputs[0]); nt.links.new(geo.outputs['Normal'], dot.inputs[1])
    noise = nt.nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 140; noise.inputs['Detail'].default_value = 8
    tc = nt.nodes.new('ShaderNodeTexCoord'); nt.links.new(tc.outputs['Object'], noise.inputs['Vector'])
    edge_mask = nt.nodes.new('ShaderNodeMapRange')
    edge_mask.inputs['From Min'].default_value, edge_mask.inputs['From Max'].default_value = .985, .93
    nt.links.new(dot.outputs['Value'], edge_mask.inputs['Value'])
    chip = nt.nodes.new('ShaderNodeMath'); chip.operation = 'MULTIPLY'
    nt.links.new(edge_mask.outputs['Result'], chip.inputs[0])
    ramp = nt.nodes.new('ShaderNodeMapRange'); ramp.inputs['From Min'].default_value, ramp.inputs['From Max'].default_value = .42, .6
    nt.links.new(noise.outputs['Fac'], ramp.inputs['Value']); nt.links.new(ramp.outputs['Result'], chip.inputs[1])
    mix = nt.nodes.new('ShaderNodeMixRGB'); mix.inputs[1].default_value = base; mix.inputs[2].default_value = (*edge, 1)
    nt.links.new(chip.outputs[0], mix.inputs[0])
    ao = nt.nodes.new('ShaderNodeAmbientOcclusion'); ao.samples = 12; ao.inputs['Distance'].default_value = .006
    dirt = nt.nodes.new('ShaderNodeMapRange'); dirt.inputs['To Min'].default_value = 1 - grime
    nt.links.new(ao.outputs['AO'], dirt.inputs['Value'])
    mul = nt.nodes.new('ShaderNodeMixRGB'); mul.blend_type = 'MULTIPLY'; mul.inputs[0].default_value = 1
    nt.links.new(mix.outputs[0], mul.inputs[1])
    gray = nt.nodes.new('ShaderNodeCombineColor')
    for i in range(3):
        nt.links.new(dirt.outputs['Result'], gray.inputs[i])
    nt.links.new(gray.outputs[0], mul.inputs[2])
    nt.links.new(mul.outputs[0], p.inputs['Base Color'])
    return m

def smudged(m, lo=.02, hi=.16, scale=9.):
    nt = m.node_tree
    p = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord')
    n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = 10; n.inputs['Roughness'].default_value = .7
    nt.links.new(tc.outputs['Object'], n.inputs['Vector'])
    r = nt.nodes.new('ShaderNodeMapRange'); r.inputs['From Min'].default_value, r.inputs['From Max'].default_value = .45, .75
    r.inputs['To Min'].default_value, r.inputs['To Max'].default_value = lo, hi
    nt.links.new(n.outputs['Fac'], r.inputs['Value']); nt.links.new(r.outputs['Result'], p.inputs['Roughness'])
    return m

def brushed_radial(m):
    nt = m.node_tree
    p = nt.nodes['Principled BSDF']
    p.inputs['Anisotropic'].default_value = .85
    t = nt.nodes.new('ShaderNodeTangent')
    t.direction_type = 'RADIAL'
    t.axis = 'Y'
    nt.links.new(t.outputs[0], p.inputs['Tangent'])
    return m

def stripes(m, a, b, freq=.9):
    """Diagonal hazard stripes in object space."""
    nt = m.node_tree
    p = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Object'], sep.inputs[0])
    add = nt.nodes.new('ShaderNodeMath'); add.operation = 'ADD'
    nt.links.new(sep.outputs['X'], add.inputs[0]); nt.links.new(sep.outputs['Z'], add.inputs[1])
    mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = freq
    nt.links.new(add.outputs[0], mul.inputs[0])
    fr = nt.nodes.new('ShaderNodeMath'); fr.operation = 'FRACT'
    nt.links.new(mul.outputs[0], fr.inputs[0])
    st = nt.nodes.new('ShaderNodeMath'); st.operation = 'GREATER_THAN'; st.inputs[1].default_value = .5
    nt.links.new(fr.outputs[0], st.inputs[0])
    mix = nt.nodes.new('ShaderNodeMixRGB')
    mix.inputs[1].default_value = (*a, 1); mix.inputs[2].default_value = (*b, 1)
    nt.links.new(st.outputs[0], mix.inputs[0])
    nt.links.new(mix.outputs[0], p.inputs['Base Color'])
    return m



# ---------------------------------------------------------------- geometry helpers
PARENT = [None]

def finish(obj, material, bevel=0., seg=3, angle=35, smooth=True):
    obj.parent = PARENT[0]
    bpy.context.collection.objects.link(obj)
    if material:
        obj.data.materials.append(MATS[material] if isinstance(material, str) else material)
    if obj.type == 'MESH':
        if smooth:
            for p in obj.data.polygons:
                p.use_smooth = True
        obj.data.use_auto_smooth = True
        obj.data.auto_smooth_angle = math.radians(angle)
        if bevel:
            b = obj.modifiers.new('Machined', 'BEVEL')
            b.width = bevel; b.segments = seg; b.limit_method = 'ANGLE'
            b.angle_limit = math.radians(angle); b.harden_normals = True
            obj.modifiers.new('Normals', 'WEIGHTED_NORMAL').keep_sharp = True
    return obj

def rrect(w, h, r, cx=0., cz=0., seg=6):
    r = min(r, w / 2 - 1e-4, h / 2 - 1e-4)
    pts = []
    for ox, oz, a in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
        for i in range(seg + 1):
            t = math.radians(a + 90 * i / seg)
            pts.append((cx + ox + r * math.cos(t), cz + oz + r * math.sin(t)))
    return pts

def circle(r, n=96, cx=0., cz=0., start=0.):
    return [(cx + r * math.cos(start + 2 * math.pi * i / n), cz + r * math.sin(start + 2 * math.pi * i / n)) for i in range(n)]

def prism(name, pts, y0, y1, material, bevel=0., seg=3, angle=35):
    bm = bmesh.new()
    f = [bm.verts.new((x, y0, z)) for x, z in pts]
    b = [bm.verts.new((x, y1, z)) for x, z in pts]
    n = len(pts)
    bm.faces.new(f); bm.faces.new(list(reversed(b)))
    for i in range(n):
        bm.faces.new((f[i], f[(i + 1) % n], b[(i + 1) % n], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    return finish(bpy.data.objects.new(name, me), material, bevel, seg, angle)

def loft(name, loops, material, closed_back=False, smooth=True):
    """Stitch same-length outlines [(pts, y), ...] into one continuous skin."""
    bm = bmesh.new()
    rings = [[bm.verts.new((x, y, z)) for x, z in pts] for pts, y in loops]
    n = len(rings[0])
    for a, b in zip(rings, rings[1:]):
        for i in range(n):
            bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    if closed_back:
        bm.faces.new(list(reversed(rings[-1])))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    return finish(bpy.data.objects.new(name, me), material, smooth=smooth, angle=60)

def cyl(name, r, y0, y1, material, cx, cz, n=48, bevel=0.):
    return prism(name, circle(r, n, cx, cz), y0, y1, material, bevel)

def cutter(name, pts, y0, y1):
    o = prism(name, pts, y0, y1, None)
    o.hide_render = True; o.display_type = 'WIRE'
    return o

def carve(target, *cutters):
    for c in cutters:
        m = target.modifiers.new('Cut', 'BOOLEAN')
        m.operation = 'DIFFERENCE'; m.solver = 'EXACT'; m.object = c
        target.modifiers.move(len(target.modifiers) - 1, 0)

def joined_cutter(name, shapes, y0, y1):
    bm = bmesh.new()
    for pts in shapes:
        f = [bm.verts.new((x, y0, z)) for x, z in pts]
        b = [bm.verts.new((x, y1, z)) for x, z in pts]
        n = len(pts)
        bm.faces.new(f); bm.faces.new(list(reversed(b)))
        for i in range(n):
            bm.faces.new((f[i], f[(i + 1) % n], b[(i + 1) % n], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me)
    o.parent = PARENT[0]; bpy.context.collection.objects.link(o)
    o.hide_render = True; o.display_type = 'WIRE'
    return o

FONT_CACHE = {}
def text(name, body, x, z, y, size, material, font='TCCB____.TTF', align='CENTER', rot=0., spacing=1.0):
    if font not in FONT_CACHE:
        FONT_CACHE[font] = bpy.data.fonts.load(str(FONTS / font))
    cu = bpy.data.curves.new(name, 'FONT')
    cu.body = body; cu.font = FONT_CACHE[font]; cu.size = size; cu.extrude = .006
    cu.align_x = align; cu.align_y = 'CENTER'; cu.space_character = spacing
    o = bpy.data.objects.new(name, cu)
    o.location = (x, y, z); o.rotation_euler = (math.radians(90), math.radians(rot), 0)
    return finish(o, material, smooth=False)

def screw(x, z, y, r=.3, kind='hex', angle=None):
    cyl('ScrewHead', r, y - .16, y + .05, 'Oxide', x, z, 32, .07)
    a = random.uniform(0, math.pi) if angle is None else angle
    if kind == 'hex':
        prism('ScrewSocket', circle(r * .46, 6, x, z, a), y - .17, y - .08, 'Rubber')
    else:
        pts = [(x + math.cos(a) * s * r * .8 - math.sin(a) * t * .05, z + math.sin(a) * s * r * .8 + math.cos(a) * t * .05) for s, t in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        prism('ScrewSlot', pts, y - .17, y - .1, 'Rubber')

def curve_line(name, pts, material, radius=.02):
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'; cu.bevel_depth = radius; cu.bevel_resolution = 2
    sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for p, (x, y, z) in zip(sp.points, pts):
        p.co = (x, y, z, 1)
    o = bpy.data.objects.new(name, cu)
    return finish(o, material, smooth=False)

def tube(name, pts, material, radius):
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'; cu.bevel_depth = radius; cu.bevel_resolution = 6; cu.use_fill_caps = True
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(pts) - 1)
    for bp, co in zip(sp.bezier_points, pts):
        bp.co = co; bp.handle_left_type = bp.handle_right_type = 'AUTO'
    return finish(bpy.data.objects.new(name, cu), material, smooth=True)

def ribbon(name, pts, width, material):
    """A flat flex cable laid along a path in a plane of constant y."""
    bm = bmesh.new(); left, right = [], []
    for i, (x, y, z) in enumerate(pts):
        ax, az = pts[min(i + 1, len(pts) - 1)][0] - pts[max(i - 1, 0)][0], pts[min(i + 1, len(pts) - 1)][2] - pts[max(i - 1, 0)][2]
        l = math.hypot(ax, az) or 1
        nx, nz = -az / l * width / 2, ax / l * width / 2
        left.append(bm.verts.new((x + nx, y, z + nz))); right.append(bm.verts.new((x - nx, y, z - nz)))
    for i in range(len(pts) - 1):
        bm.faces.new((left[i], left[i + 1], right[i + 1], right[i]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = finish(bpy.data.objects.new(name, me), material)
    o.modifiers.new('Thick', 'SOLIDIFY').thickness = .03
    return o



# ---------------------------------------------------------------- motion helpers
def ease(t):
    t = max(0., min(1., t))
    return t * t * (3 - 2 * t)

def group(name, loc=(0, 0, 0), rot=(0, 0, 0)):
    g = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(g); g.parent = PARENT[0]
    g.location = loc; g.rotation_euler = tuple(math.radians(a) for a in rot)
    return g

class inside:
    """Build the next objects as children of a moving group."""
    def __init__(self, g): self.g = g
    def __enter__(self): self.prev = PARENT[0]; PARENT[0] = self.g
    def __exit__(self, *a): PARENT[0] = self.prev

def prism_x(name, pts, x0, x1, material, bevel=0., seg=3, angle=35):
    """A side profile [(y, z), ...] extruded across x."""
    bm = bmesh.new()
    a = [bm.verts.new((x0, y, z)) for y, z in pts]
    b = [bm.verts.new((x1, y, z)) for y, z in pts]
    n = len(pts)
    bm.faces.new(a); bm.faces.new(list(reversed(b)))
    for i in range(n):
        bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    return finish(bpy.data.objects.new(name, me), material, bevel, seg, angle)

def prism_z(name, pts, z0, z1, material, bevel=0., seg=3, angle=35):
    """A plan outline [(x, y), ...] extruded up z."""
    bm = bmesh.new()
    a = [bm.verts.new((x, y, z0)) for x, y in pts]
    b = [bm.verts.new((x, y, z1)) for x, y in pts]
    n = len(pts)
    bm.faces.new(a); bm.faces.new(list(reversed(b)))
    for i in range(n):
        bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    return finish(bpy.data.objects.new(name, me), material, bevel, seg, angle)



# Fourteen-segment glyphs, in a 1 x 2 cell before the italic slant.
SEG = dict(a=((0, 2), (1, 2)), b=((1, 2), (1, 1)), c=((1, 1), (1, 0)), d=((0, 0), (1, 0)), e=((0, 1), (0, 0)), f=((0, 2), (0, 1)),
           g=((0, 1), (.5, 1)), G=((.5, 1), (1, 1)), h=((0, 2), (.5, 1)), i=((.5, 2), (.5, 1)), j=((1, 2), (.5, 1)),
           k=((0, 0), (.5, 1)), l=((.5, 0), (.5, 1)), m=((1, 0), (.5, 1)))
GLYPH = {'0': 'abcdef', '1': 'bc', '2': 'abgGed', '3': 'abcdG', '4': 'fgGbc', '5': 'afgGcd', '6': 'afedcgG', '7': 'abc', '8': 'abcdefgG',
         '9': 'abcdfgG', 'A': 'abcefgG', 'B': 'abcdilG', 'C': 'adef', 'D': 'abcdil', 'E': 'adefg', 'F': 'aefg', 'G': 'acdefG', 'H': 'bcefgG',
         'I': 'adil', 'J': 'bcde', 'K': 'efgjm', 'L': 'def', 'M': 'bcefhj', 'N': 'bcefhm', 'O': 'abcdef', 'P': 'abefgG', 'Q': 'abcdefm',
         'R': 'abefgGm', 'S': 'afgGcd', 'T': 'ail', 'U': 'bcdef', 'V': 'efkj', 'W': 'bcefkm', 'X': 'hjkm', 'Y': 'hjl', 'Z': 'adjk',
         '/': 'jk', '-': 'gG', ' ': ''}

def segment_bar(p, q, t):
    (x0, z0), (x1, z1) = p, q
    L = math.hypot(x1 - x0, z1 - z0); ux, uz = (x1 - x0) / L, (z1 - z0) / L
    nx, nz = -uz * t / 2, ux * t / 2
    s = t * .9
    a = (x0 + ux * s, z0 + uz * s); b = (x1 - ux * s, z1 - uz * s)
    return [a, (a[0] + ux * t * .5 + nx, a[1] + uz * t * .5 + nz), (b[0] - ux * t * .5 + nx, b[1] - uz * t * .5 + nz), b,
            (b[0] - ux * t * .5 - nx, b[1] - uz * t * .5 - nz), (a[0] + ux * t * .5 - nx, a[1] + uz * t * .5 - nz)]



def gear_profile(r, teeth, depth=.14, cx=0., cy=0.):
    pts = []
    for i in range(teeth * 4):
        a = 2 * math.pi * i / (teeth * 4)
        rr = r if i % 4 in (1, 2) else r - depth
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return pts



def materials():
    MATS.clear()
    on = STATE['power']
    ti = brushed_radial(principled('Titanium', (.085, .088, .095), 1, .3))
    ti.node_tree.nodes['Principled BSDF'].inputs['Anisotropic'].default_value = .55
    ti.node_tree.nodes['Tangent'].axis = 'Z'  # brushed across the face, not in circles
    wear(ti, edge=(.3, .31, .33), grime=.25)
    principled('TitaniumDark', (.03, .031, .034), .9, .38)
    principled('InkGreen', lin('#1d3b31'), .7, .3, **{'Clearcoat': .6, 'Clearcoat Roughness': .15})
    principled('Chrome', (.92, .92, .94), 1, .035)
    principled('Satin', (.55, .56, .57), 1, .18)
    principled('Black', (.006, .006, .008), .2, .4)
    principled('Rubber', (.01, .01, .012), 0, .8)
    principled('Lens', (.26, .3, .28), 0, .06, **{'Transmission': 1., 'IOR': 1.25})
    principled('DisplayBlack', (.002, .003, .0025), 0, .6)
    principled('Lcd', (.002, .0025, .0022), 0, .35, **{'Specular': .15})
    principled('KeyCap', (.05, .052, .056), .85, .3, **{'Clearcoat': .5, 'Clearcoat Roughness': .12})
    principled('PowerGlass', lin('#2f6b52'), 0, .25, **{'Transmission': .75, 'IOR': 1.45, 'Emission': lin('#3fae7e'), 'Emission Strength': 1.6 if on else 0})
    principled('Legend', (.5, .52, .5), 0, .45)
    principled('IconDark', (.12, .13, .12), 0, .5)
    emissive('Amber', lin('#e8a74f'), 10)
    principled('DiscMirror', (.9, .9, .92), 1, .06)
    principled('DiscLabel', INK['print_blue'], 0, .5)
    principled('DiscClear', (.9, .9, .95), 0, .02, **{'Transmission': 1., 'IOR': 1.58})
    emissive('LampOff', (.01, .012, .01), .2)
    for name, hexv, strength in (('deep', '#1f7a52', 4.), ('jade', '#34c98a', 6.), ('mint', '#8ff5c4', 6.5), ('pale', '#d8ffe9', 7.),
                                 ('dim', '#0e2a1f', 1.), ('amber', '#f0b25a', 6.), ('amber_dim', '#2e2210', 1.2), ('violet', '#6f6bff', 6.),
                                 ('violet_hi', '#b4a8ff', 7.), ('violet_dim', '#1d1a45', 1.1), ('cyan', '#3fc8ef', 5.), ('cyan_dim', '#0c2a36', 1.),
                                 ('coral', '#ff8457', 6.), ('coral_dim', '#35170e', 1.1)):
        emissive('N_' + name, lin(hexv), strength)

# ---------------------------------------------------------------- 2D paths and sheets
def path(start, segs, n=24):
    """A closed outline from lines and cubic curves, sampled to points."""
    pts, cur = [start], start
    for s in segs:
        if s[0] == 'L':
            pts.append(s[1]); cur = s[1]
        elif s[0] == 'B':
            c0, c1, p1 = s[1], s[2], s[3]
            for i in range(1, n + 1):
                t = i / n; u = 1 - t
                pts.append((u ** 3 * cur[0] + 3 * u * u * t * c0[0] + 3 * u * t * t * c1[0] + t ** 3 * p1[0],
                            u ** 3 * cur[1] + 3 * u * u * t * c0[1] + 3 * u * t * t * c1[1] + t ** 3 * p1[1]))
            cur = p1
        elif s[0] == 'A':
            cx, cz, r, a0, a1 = s[1:]
            for i in range(1, n + 1):
                a = math.radians(a0 + (a1 - a0) * i / n)
                pts.append((cx + r * math.cos(a), cz + r * math.sin(a)))
            cur = pts[-1]
    if math.dist(pts[0], pts[-1]) < 1e-4:
        pts.pop()
    return pts

def offset(poly, d):
    """Push a closed outline out by d along its averaged normals."""
    n = len(poly); area = sum(poly[i][0] * poly[(i + 1) % n][1] - poly[(i + 1) % n][0] * poly[i][1] for i in range(n))
    sgn = 1 if area > 0 else -1
    out = []
    for i in range(n):
        (x0, z0), (x1, z1), (x2, z2) = poly[i - 1], poly[i], poly[(i + 1) % n]
        tx, tz = x2 - x0, z2 - z0; l = math.hypot(tx, tz) or 1
        out.append((x1 + sgn * tz / l * d, z1 - sgn * tx / l * d))
    return out

def sheet(name, outer, holes=(), y_front=0., depth=.5, material=None, bevel=.1, res=4):
    """A flat outline (x, z) with holes, extruded back from y_front with rounded edges."""
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '2D'; cu.fill_mode = 'BOTH'
    cu.extrude = max(0., depth / 2 - bevel); cu.bevel_depth = bevel; cu.bevel_resolution = res
    for loop in [outer, *holes]:
        sp = cu.splines.new('POLY'); sp.points.add(len(loop) - 1)
        for p, (x, z) in zip(sp.points, loop):
            p.co = (x, z, 0, 1)
        sp.use_cyclic_u = True; sp.use_smooth = True
    o = bpy.data.objects.new(name, cu)
    o.rotation_euler = (math.radians(90), 0, 0)
    o.location = (0, y_front + depth / 2, 0)
    return finish(o, material, smooth=True)

def quads(name, shapes, y0, y1, material):
    """Many small flat prisms (each a list of (x, z) corners) as one mesh."""
    if not shapes:
        return None
    bm = bmesh.new()
    for pts in shapes:
        f = [bm.verts.new((x, y0, z)) for x, z in pts]
        b = [bm.verts.new((x, y1, z)) for x, z in pts]
        n = len(pts)
        bm.faces.new(f); bm.faces.new(list(reversed(b)))
        for i in range(n):
            bm.faces.new((f[i], f[(i + 1) % n], b[(i + 1) % n], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    return finish(bpy.data.objects.new(name, me), material, smooth=False)

def rect(x0, z0, x1, z1):
    return [(x0, z0), (x1, z0), (x1, z1), (x0, z1)]

def polar_cell(cx, cz, r0, r1, a0, a1):
    return [(cx + r0 * math.cos(a0), cz + r0 * math.sin(a0)), (cx + r1 * math.cos(a0), cz + r1 * math.sin(a0)),
            (cx + r1 * math.cos(a1), cz + r1 * math.sin(a1)), (cx + r0 * math.cos(a1), cz + r0 * math.sin(a1))]

def capsule(w, h, cx, cz, rot=0.):
    pts = rrect(w, h, h / 2 - .001, 0, 0, 10)
    c, s = math.cos(math.radians(rot)), math.sin(math.radians(rot))
    return [(cx + x * c - z * s, cz + x * s + z * c) for x, z in pts]

# ---------------------------------------------------------------- the machine (v4, from Jackie's sketch)
# A long head unit: a wide display (an arc gauge holding the track info, the live
# waveform beside it), a slot-loading CD mouth under it, keys at the right-hand end.
# Screen 1 rises out of the deck on two telescoping posts; screen 2 - the avatar
# screen - swings out from the left end on parallel arms and turns to face you.

BODY = dict(w=30.0, h=12.4, d=12.0)
DISP = dict(x0=-13.6, x1=7.0, z0=2.8, z1=11.6)
SLOT = dict(x0=-11.9, x1=1.9, z=1.45)
ARC_KEYS = [('prev', .14), ('play', .38), ('stop', .62), ('next', .86)]
ROCKER = dict(x=13.35, z=7.0, w=1.6, h=5.4)
SCREEN1 = dict(w=29.0, h=13.2, gw=26.8, gh=10.6, lift=15.0, posts=(-9.5, 9.5), y=7.4, hump=1.9)
SCREEN2 = dict(w=9.6, h=19.2, gw=8.2, gh=15.4, z0=-3.9, gap=1.0, pivot=(-16.7, -.6))

def body():
    w, h = BODY['w'], BODY['h']
    outline = [(-w / 2 + 1.8, 0), (w / 2 - 3.2, 0), (w / 2 + .7, 2.9), (w / 2 + .7, 9.1), (w / 2 - 1.4, h), (-w / 2 + 6.2, h),
               (-w / 2 + 5.6, h - .45), (-w / 2 + .8, h - .45), (-w / 2, h - 1.25), (-w / 2, 1.8)]
    slot = chamfer(SLOT['x1'] - SLOT['x0'], .5, (SLOT['x0'] + SLOT['x1']) / 2, SLOT['z'], .2, .2, .2, .2)
    sheet('Faceplate', outline, [slot], -1.0, 1.1, 'Titanium', .09, 2)
    # Shell behind the faceplate, with the slot screen 1 rises through.
    shell = prism('Shell', chamfer(w - .6, h - .4, 0, h / 2, .8, .8, .8, .8), .05, BODY['d'], 'TitaniumDark', .08)
    hump = prism_x('Hump', [(3.2, h - .6), (3.2, h + 1.1), (4.4, h + SCREEN1['hump']), (10.8, h + SCREEN1['hump']), (11.9, h + 1.1), (11.9, h - .6)],
                   -w / 2 + .7, w / 2 - .7, 'TitaniumDark', .08)
    for part in (shell, hump):
        carve(part, cutter('LiftSlot', chamfer(SCREEN1['w'] + .4, h + 8, 0, h, .1, .1, .1, .1), SCREEN1['y'] - .85, SCREEN1['y'] + .85))
    sheet('HumpLine', rrect(w - 3, .1, .05, 0, h + SCREEN1['hump'] - .02, 4), [], 3.1, .1, 'InkGreen', .03) if False else None
    carve(shell, cutter('SlotCut', slot, -2, 3))
    # The CD mouth: chrome lips and a dark throat, a lamp that says a disc is in.
    # The disc mouth: a cut-cornered brushed frame, chrome lips, a deep dark throat,
    # an eject key beside it and a lamp that says a disc is in.
    scx, sw = (SLOT['x0'] + SLOT['x1']) / 2, SLOT['x1'] - SLOT['x0']
    mouth = chamfer(sw, .5, scx, SLOT['z'], .2, .2, .2, .2)
    sheet('SlotFrame', chamfer(sw + .9, 1.25, scx, SLOT['z'], .45, .45, .45, .45), [mouth], -1.22, .26, 'Satin', .03, 2)
    sheet('SlotLipTop', chamfer(sw - .3, .07, scx, SLOT['z'] + .2, .03, .03, .03, .03), [], -1.26, .06, 'Chrome', 0.)
    sheet('SlotLipLow', chamfer(sw - .3, .07, scx, SLOT['z'] - .2, .03, .03, .03, .03), [], -1.26, .06, 'Chrome', 0.)
    prism('SlotThroat', chamfer(sw - .1, .46, scx, SLOT['z'], .18, .18, .18, .18), .2, 6.5, 'Black')
    ex = SLOT['x1'] + 2.0
    eject = sheet('EjectCap', slat(2.1, .5, ex, SLOT['z'], .14), [], -1.4, .4, 'KeyCap', .04, 2)
    ei = quads('EjectIcon', [[(ex - .2, SLOT['z'] - .02), (ex + .2, SLOT['z'] - .02), (ex, SLOT['z'] + .17)], rect(ex - .2, SLOT['z'] - .14, ex + .2, SLOT['z'] - .08)],
               -1.43, -1.4, 'N_mint' if STATE['power'] else 'IconDark')
    bundle('Key_eject', [eject, ei], (ex, -1.4, SLOT['z']))
    text('LegDisc', 'DISC', ex - 1.0, SLOT['z'] + .52, -1.02, .2, 'Legend', 'TCCB____.TTF', align='LEFT', spacing=1.5)
    cyl('DiscLamp', .07, -1.08, -1.0, 'Amber' if STATE['power'] else 'LampOff', ex + 1.55, SLOT['z'], 16)
    # A 12 cm disc half out of the mouth, the way it waits before it is taken in.
    if STATE.get('disc_out', True):
        g = group('Disc', (scx, -1.0 - 3.2 + 6.0, SLOT['z']))
        with inside(g):
            for name, r0, r1, z0, z1, m in (('DiscBase', .75, 6.0, -.06, .05, 'DiscMirror'), ('DiscLabel', 1.9, 5.75, .05, .07, 'DiscLabel'),
                                             ('DiscHub', .75, 1.9, .05, .06, 'DiscClear')):
                loft(name, [(circle(r1, 128), z0), (circle(r0, 128), z0), (circle(r0, 128), z1), (circle(r1, 128), z1), (circle(r1, 128), z0)], m)
        # The discs above were built facing -y; lay them flat in the mouth.
        g.rotation_euler = (math.radians(90), 0, 0)
    display()
    arc_keys()
    # One ink-green anodised sweep ties the face together: down the display's left
    # edge, along under it, and up into the curve the keys follow.
    x0, x1, z0, z1 = DISP['x0'], DISP['x1'], DISP['z0'], DISP['z1']
    sweep = [(x0 - .45, z1 - 2.4), (x0 - .45, z0 + .9), (x0 + .7, z0 - .42), (x1 - 1.6, z0 - .42), (x1 + 1.1, z0 + 1.9), (x1 + 1.1, z0 + 3.4)]
    fine = []
    for a, b in zip(sweep, sweep[1:]):
        for k in range(8):
            fine.append((a[0] + (b[0] - a[0]) * k / 8, a[1] + (b[1] - a[1]) * k / 8))
    fine.append(sweep[-1])
    sheet('Sweep', band(fine, .16), [], -1.1, .12, 'InkGreen', .02)
    text('Maker', 'PERSONAL SOUNDTRACK', DISP['x0'] + .1, .35, -1.02, .26, 'Legend', 'TCCB____.TTF', align='LEFT', spacing=1.5)

def display_outline():
    x0, x1, z0, z1 = DISP['x0'], DISP['x1'], DISP['z0'], DISP['z1']
    return [(x0 + 1.1, z0), (x1 - 1.3, z0), (x1 + .6, z0 + 1.9), (x1 + .6, z1 - 1.9), (x1 - 1.3, z1), (x0 + 5.6, z1),
            (x0 + 4.85, z1 - .75), (x0 + .8, z1 - .75), (x0, z1 - 1.55), (x0, z0 + 1.1)]

def key_arc(s):
    """The curve the transport keys ride: parallel to the display's right-hand sweep."""
    x1, z0, z1 = DISP['x1'], DISP['z0'], DISP['z1']
    p0, c0, c1, p1 = (x1 + .2, z1 - .15), (x1 + 3.1, z1 - 2.2), (x1 + 3.1, z0 + 2.2), (x1 + .2, z0 + .15)
    u = 1 - s
    pt = tuple(u ** 3 * p0[i] + 3 * u * u * s * c0[i] + 3 * u * s * s * c1[i] + s ** 3 * p1[i] for i in range(2))
    tg = tuple(3 * u * u * (c0[i] - p0[i]) + 6 * u * s * (c1[i] - c0[i]) + 3 * s * s * (p1[i] - c1[i]) for i in range(2))
    return pt, math.degrees(math.atan2(tg[1], tg[0])) + 90

def chamfer(w, h, cx=0., cz=0., bl=.5, br=.5, tr=.5, tl=.5):
    """A rectangle with its corners cut off at 45 degrees (each cut sized on its own)."""
    x0, x1, z0, z1 = cx - w / 2, cx + w / 2, cz - h / 2, cz + h / 2
    return [(x0 + bl, z0), (x1 - br, z0), (x1, z0 + br), (x1, z1 - tr), (x1 - tr, z1), (x0 + tl, z1), (x0, z1 - tl), (x0, z0 + bl)]

def band(center, width):
    """A strip of constant width along a polyline, as a closed outline."""
    left, right = [], []
    for i, (x, z) in enumerate(center):
        a, b = center[max(i - 1, 0)], center[min(i + 1, len(center) - 1)]
        tx, tz = b[0] - a[0], b[1] - a[1]; l = math.hypot(tx, tz) or 1
        nx, nz = -tz / l * width / 2, tx / l * width / 2
        left.append((x + nx, z + nz)); right.append((x - nx, z - nz))
    return left + right[::-1]

def display():
    x0, x1, z0, z1 = DISP['x0'], DISP['x1'], DISP['z0'], DISP['z1']
    cz = (z0 + z1) / 2
    win = display_outline()
    sheet('DisplaySurround', offset(win, .2), [win], -1.3, .36, 'Satin', .03, 2)
    brow = [(x0 - .1, z1 - .52), (x0 + 4.7, z1 - .52), (x0 + 5.45, z1 + .22), (x0 + 11.6, z1 + .22), (x0 + 11.3, z1 + .46),
            (x0 + 5.35, z1 + .46), (x0 + 4.6, z1 - .28), (x0 - .1, z1 - .28)]
    sheet('DisplayBrow', brow, [], -1.36, .3, 'Chrome', .03, 2)
    sheet('DisplayBack', win, [], -1.06, .1, 'DisplayBlack', 0.)
    sheet('DisplayLens', win, [], -1.24, .05, 'Lens', 0.)
    if STATE['power'] and STATE.get('art', True):
        display_art()

def key_icon(name, x, z, y):
    tri = lambda ox, d: [(x + ox - .15 * d, z - .17), (x + ox - .15 * d, z + .17), (x + ox + .15 * d, z)]
    shapes = []
    if name == 'power':
        pts = [(x + .2 * math.cos(math.radians(a)), z + .2 * math.sin(math.radians(a))) for a in range(-60, 241, 15)]
        shapes += [segment_bar(a, b, .05) for a, b in zip(pts, pts[1:])] + [rect(x - .03, z, x + .03, z + .26)]
    elif name == 'mute':
        shapes += [[(x - .26, z - .09), (x - .14, z - .09), (x, z - .21), (x, z + .21), (x - .14, z + .09), (x - .26, z + .09)],
                   segment_bar((x + .08, z - .12), (x + .3, z + .12), .05), segment_bar((x + .08, z + .12), (x + .3, z - .12), .05)]
    elif name in ('volup', 'voldown'):
        shapes.append(rect(x - .22, z - .04, x + .22, z + .04))
        if name == 'volup':
            shapes.append(rect(x - .04, z - .22, x + .04, z + .22))
    elif name == 'prev':
        shapes += [tri(-.15, -1), tri(.15, -1)]
    elif name == 'next':
        shapes += [tri(-.15, 1), tri(.15, 1)]
    elif name == 'play':
        shapes += [tri(-.16, 1), rect(x + .08, z - .16, x + .14, z + .16), rect(x + .2, z - .16, x + .26, z + .16)]
    elif name == 'stop':
        shapes.append(rect(x - .15, z - .15, x + .15, z + .15))
    return shapes

def bundle(name, objs, center):
    """Gather a key's parts under one empty at its face, keeping where they are."""
    g = group(name, center)
    bpy.context.view_layer.update()
    for o in objs:
        if o is None:
            continue
        m = o.matrix_world.copy()
        o.parent = g
        o.matrix_world = m
    return g

KEY_COL = dict(x=9.55, w=3.2, h=.62, skew=.22)
KEY_ROWS = [('prev', 9.35, 'PREV'), ('play', 7.65, 'PLAY/PAUSE'), ('stop', 5.95, 'STOP'), ('next', 4.25, 'NEXT')]

def slat(w, h, cx, cz, skew):
    """A thin key cut as a parallelogram: the top edge leans right."""
    return [(cx - w / 2, cz - h / 2), (cx + w / 2 - skew, cz - h / 2), (cx + w / 2, cz + h / 2), (cx - w / 2 + skew, cz + h / 2)]

def arc_keys():
    lit = STATE['power']
    ink = 'N_mint' if lit else 'IconDark'
    kx, kw, kh, sk = KEY_COL['x'], KEY_COL['w'], KEY_COL['h'], KEY_COL['skew']
    # A machined channel the four keys sit in.
    sheet('KeyChannel', slat(kw + .5, KEY_ROWS[0][1] - KEY_ROWS[-1][1] + kh + 1.1, kx, (KEY_ROWS[0][1] + KEY_ROWS[-1][1]) / 2 + .2, sk + .15), [], -1.06, .08, 'Black', 0.)
    for name, z, legend in KEY_ROWS:
        cap = sheet('KeyCap_' + name, slat(kw, kh, kx, z, sk), [], -1.46, .44, 'KeyCap', .05, 2)
        edge = sheet('KeyEdge_' + name, slat(kw - .1, .06, kx - .02, z - kh / 2 + .05, sk * .1), [], -1.48, .05, 'Chrome', 0.)
        ic = quads('KeyIcon_' + name, [[(x * .62 + (kx - kw / 2 + .7) * .38, zz * .62 + z * .38) for x, zz in poly] for poly in key_icon(name, kx - kw / 2 + .7, z, -1.5)],
                   -1.49, -1.46, ink)
        bundle('Key_' + name, [cap, edge, ic], (kx, -1.46, z))
        text('Leg_' + name, legend, kx - kw / 2 + sk + .05, z + kh / 2 + .2, -1.02, .2, 'Legend', 'TCCB____.TTF', align='LEFT', spacing=1.5)
    # A slim VOL rocker, chevrons at each end.
    rx, rz = 13.2, 7.1
    well = chamfer(1.25, 5.3, rx, rz, .3, .3, .3, .3)
    sheet('RockerLip', offset(well, .12), [well], -1.2, .24, 'Chrome', .02, 2)
    sheet('RockerWell', well, [], -1.0, .1, 'Black', 0.)
    rocker = sheet('RockerCap', chamfer(.85, 4.9, rx, rz, .22, .22, .22, .22), [], -1.46, .46, 'KeyCap', .05, 2)
    chevron = lambda z, d: [segment_bar((rx - .2, z - .09 * d), (rx, z + .09 * d), .05), segment_bar((rx, z + .09 * d), (rx + .2, z - .09 * d), .05)]
    ri = quads('RockerIcons', chevron(rz + 1.9, 1) + chevron(rz - 1.9, -1), -1.49, -1.46, ink)
    rv = text('RockerVol', 'VOL', rx, rz, -1.49, .3, ink, 'TCCB____.TTF', rot=90, spacing=1.3)
    bundle('Key_rocker', [rocker, ri, rv], (rx, -1.46, rz))
    # Mute: a small square key; power: a long thin translucent green bar.
    sheet('MuteLip', chamfer(.95, .95, rx, 3.55, .2, .2, .2, .2), [], -1.15, .14, 'Chrome', .02, 2)
    mute = sheet('MuteCap', chamfer(.72, .72, rx, 3.55, .15, .15, .15, .15), [], -1.4, .4, 'KeyCap', .04, 2)
    mi = quads('MuteIcon', [[(x * .5 + rx * .5, zz * .5 + 3.55 * .5) for x, zz in poly] for poly in key_icon('mute', rx + .02, 3.55, -1.43)], -1.43, -1.4, ink)
    bundle('Key_mute', [mute, mi], (rx, -1.4, 3.55))
    power = sheet('PowerCap', slat(3.4, .34, 11.0, 1.55, .18), [], -1.38, .38, 'PowerGlass', .04, 2)
    bundle('Key_power', [power], (11.0, -1.38, 1.55))
    text('LegPower', 'POWER', 9.35, 1.02, -1.02, .2, 'Legend', 'TCCB____.TTF', align='LEFT', spacing=1.6)
    text('LegMute', 'MUTE', rx, 2.75, -1.02, .2, 'Legend', 'TCCB____.TTF', spacing=1.5)

def screen_face(name, gw, gh, cx, cz, y_front, module_w, module_h, mcx, mcz, chin=None):
    """A bezelled module in local coords: shell, chrome frame, dark glass; returns a
    mapper from screen units (-1..1) to points just in front of the glass."""
    outline = chamfer(module_w, module_h, mcx, mcz, .5, .5, 1.4, 1.4)
    window = chamfer(gw + .1, gh + .1, cx, cz, .25, .25, .6, .6)
    sheet(name + 'Bezel', outline, [window], y_front, 1.5, 'Titanium', .08, 2)
    loft(name + 'Frame', [(chamfer(gw + .36, gh + .36, cx, cz, .35, .35, .72, .72), y_front - .02), (chamfer(gw + .16, gh + .16, cx, cz, .3, .3, .66, .66), y_front - .08),
                          (chamfer(gw + .06, gh + .06, cx, cz, .27, .27, .62, .62), y_front + .15)], 'Satin')
    prism(name + 'Glass', chamfer(gw + .1, gh + .1, cx, cz, .25, .25, .6, .6), y_front + .3, y_front + .6, 'Lcd')
    return lambda u, v: (cx + u * gw / 2, cz + v * gh / 2)

MECH = dict(extend=5.6, stage1=2.8, tilt=12.)

def screen1(t):
    """The top screen, built as the page animates it: two clamshell covers over the
    slot in the hump, a first telescoping stage, the screen carriage on the second
    stage, and the screen itself on a hinge bar so it can lean forward at the top.
    t is 0 housed .. 1 up; the covers are open whenever t > 0."""
    H, Y, hump = BODY['h'], SCREEN1['y'], SCREEN1['hump']
    hump_top = H + hump
    closed = hump_top - (SCREEN1['h'] + .45)
    ext, s1 = MECH['extend'], MECH['stage1']
    lift = hump_top + ext - closed
    rise = lift * ease(t)
    bottom = closed + rise
    e = max(0., bottom - hump_top)
    open_ = 1. if t > 0 else 0.
    w, h = SCREEN1['w'], SCREEN1['h']
    # Clamshell covers hinge on the slot's long edges and swing apart.
    half = .85
    for name, y_hinge, sign in (('CoverFront', Y - half, -1), ('CoverBack', Y + half, 1)):
        g = group(name, (0, y_hinge, H + hump), (-sign * 105 * open_, 0, 0))
        with inside(g):
            y0, y1 = sorted((0, -sign * half))
            prism_x(name + 'Plate', [(y0, -.16), (y1, -.16), (y1, 0), (y0, 0)], -w / 2 - .15, w / 2 + .15, 'TitaniumDark', .03, 2)
            yy = -sign * (half - .18)
            prism_x(name + 'Stripe', [(yy - .04, .0), (yy + .04, .0), (yy + .04, .02), (yy - .04, .02)], -w / 2 + .6, w / 2 - .6, 'InkGreen')
        # A chrome hinge pin runs the length of each cover.
        pin = [(y_hinge + .09 * math.cos(2 * math.pi * k / 16), H + hump - .08 + .09 * math.sin(2 * math.pi * k / 16)) for k in range(16)]
        prism_x(name + 'Pin', pin, -w / 2 - .2, w / 2 + .2, 'Chrome')
    # Stage one: the thicker tubes, riding the first part of the travel.
    st1 = group('PostStage1', (0, 0, min(e, s1) - s1))
    with inside(st1):
        for x in SCREEN1['posts']:
            tube = [(x + .46 * math.cos(2 * math.pi * k / 32), Y + .46 * math.sin(2 * math.pi * k / 32)) for k in range(32)]
            prism_z('Stage1Tube', tube, hump_top - 3.0, hump_top + s1 - .25, 'Satin', .05)
            ring = [(x + .52 * math.cos(2 * math.pi * k / 32), Y + .52 * math.sin(2 * math.pi * k / 32)) for k in range(32)]
            prism_z('Stage1Collar', ring, hump_top + s1 - .3, hump_top + s1, 'InkGreen', .03)
    # Stage two: the carriage - chrome rods, a hinge bar - carrying the screen.
    lift_g = group('ScreenLift', (0, Y, bottom))
    with inside(lift_g):
        for x in SCREEN1['posts']:
            rod = [(x + .34 * math.cos(2 * math.pi * k / 32), .34 * math.sin(2 * math.pi * k / 32)) for k in range(32)]
            prism_z('PostRod', rod, -ext - .3, -.2, 'Chrome', .04)
            prism_z('RodCap', chamfer(1.3, .9, x, 0, .2, .2, .2, .2), -.45, 0., 'TitaniumDark', .05)
        bar = [(.26 * math.cos(2 * math.pi * k / 24), .15 + .26 * math.sin(2 * math.pi * k / 24)) for k in range(24)]
        prism_x('HingeBar', bar, -w / 2 + 1.2, w / 2 - 1.2, 'Chrome', .03)
        for x in (-w / 2 + .9, w / 2 - .9):
            prism_x('HingeCap', [(.34 * math.cos(2 * math.pi * k / 24), .15 + .34 * math.sin(2 * math.pi * k / 24)) for k in range(24)], x - .3, x + .3, 'Satin', .05)
        tilt = group('Screen1', (0, 0, .15), (-MECH['tilt'] * ease((t - .85) / .15) if t > .85 else 0, 0, 0))
        with inside(tilt):
            at = screen_face('S1', SCREEN1['gw'], SCREEN1['gh'], 0, h / 2 + .1, -.75, w, h, 0, h / 2 + .1)
            if STATE['power'] and t >= 1 and STATE.get('art', True):
                screen1_art(at, -.47)
    # Sleeves and collars stay in the hump.
    for x in SCREEN1['posts']:
        cz = [(x + .7 * math.cos(2 * math.pi * k / 32), Y + .7 * math.sin(2 * math.pi * k / 32)) for k in range(32)]
        prism_z('PostSleeve', cz, H + hump - .3, H + hump + .5, 'TitaniumDark', .08)

def screen2(t):
    """Folded flat against the left end, face out; swung out and turned to face front."""
    turn = ease((t - .2) / .8) if t > .2 else 0.
    px, py = SCREEN2['pivot']
    angle = -90 + 90 * turn
    g = group('Screen2', (px, py, 0), (0, 0, angle))
    w, h, z0, gap = SCREEN2['w'], SCREEN2['h'], SCREEN2['z0'], SCREEN2['gap']
    with inside(g):
        mcx, mcz = -gap - w / 2, z0 + h / 2
        chin = 1.8
        at = screen_face('S2', SCREEN2['gw'], SCREEN2['gh'], mcx, z0 + chin + SCREEN2['gh'] / 2 + .2, -.75, w, h, mcx, mcz)
        for sx, d in ((-1.6, -1), (1.6, 1)):
            sheet('S2Key', rrect(2.2, .8, .4, mcx + sx, z0 + 1.0, 8), [], -1.0, .35, 'KeyCap', .12)
            quads('S2KeyIcon', [[(mcx + sx - .18 * d, z0 + .82), (mcx + sx - .18 * d, z0 + 1.18), (mcx + sx + .18 * d, z0 + 1.0)]], -1.02, -.98,
                  'N_mint' if STATE['power'] else 'IconDark')
        if STATE['power'] and t >= 1:
            avatar_art(at, -.47)
    # Parallel arms from the left end of the body to the screen's inner edge.
    la = math.radians(angle)
    for i, z in enumerate((9.3, 8.4, 5.5, 4.6)):
        lx, ly = -gap + .3, -.35
        wx = px + lx * math.cos(la) - ly * math.sin(la)
        wy = py + lx * math.sin(la) + ly * math.cos(la)
        bx, by = -BODY['w'] / 2 + .05, 1.3 + (i % 2) * 1.6
        tube('Arm', [(bx, by, z), (wx, wy, z)], 'Chrome', .14)
        for p in ((bx, by, z), (wx, wy, z)):
            bpy.ops.mesh.primitive_uv_sphere_add(radius=.24, location=p, segments=16, ring_count=8)
            sp = bpy.context.object; bpy.context.collection.objects.unlink(sp); finish(sp, 'Satin')
    for z in (8.85, 5.05):
        prism_x('ArmMount', [(.8, z - .8), (3.6, z - .8), (3.6, z + .8), (.8, z + .8)], -BODY['w'] / 2 - .3, -BODY['w'] / 2 + .1, 'TitaniumDark', .12)

# ---------------------------------------------------------------- what the screens show (one green family, a touch of amber)
DOTFONT = {'A': [14, 17, 17, 31, 17, 17, 17], 'D': [30, 17, 17, 17, 17, 17, 30], 'I': [31, 4, 4, 4, 4, 4, 31], 'V': [17, 17, 17, 17, 17, 10, 4],
           'Z': [31, 1, 2, 4, 8, 16, 31], ' ': [0] * 7, '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8]}
SEVEN = {'a': (5, 0, 25, 0), 'b': (29, 4, 29, 23), 'c': (29, 31, 29, 50), 'd': (5, 54, 25, 54), 'e': (1, 31, 1, 50), 'f': (1, 4, 1, 23), 'g': (5, 27, 25, 27)}
SEVEN_PAT = ['abcdef', 'bc', 'abged', 'abgcd', 'fgbc', 'afgcd', 'afgecd', 'abc', 'abcdefg', 'abfgcd']

def levels(n, seed=4):
    random.seed(seed)
    return [max(0, min(1, .92 - .62 * (i / n) ** .8 + .17 * math.sin(i * .9 + 1.2) + random.uniform(-.12, .12))) for i in range(n)]

def seven_seg(msg, x, z, scale, y, material, t=.05):
    shapes = []
    for i, ch in enumerate(msg):
        if ch == ':':
            for yy in (17, 38):
                shapes.append(rect(x + (i * 39 + 10) * scale, z - (yy + 4) * scale, x + (i * 39 + 14) * scale, z - yy * scale))
            continue
        if ch == '/':
            shapes.append(segment_bar((x + (i * 39 + 4) * scale, z - 52 * scale), (x + (i * 39 + 26) * scale, z - 2 * scale), t))
            continue
        for key, (x1, y1, x2, y2) in SEVEN.items():
            if key in SEVEN_PAT[int(ch)]:
                shapes.append(segment_bar((x + (i * 39 + x1) * scale, z - y1 * scale), (x + (i * 39 + x2) * scale, z - y2 * scale), t))
    quads('Seven', shapes, y - .01, y, material)

def display_art():
    y = -1.12
    x0, x1, z0, z1 = DISP['x0'], DISP['x1'], DISP['z0'], DISP['z1']
    by = {k: [] for k in ('deep', 'jade', 'mint', 'pale', 'dim', 'amber', 'amber_dim', 'violet', 'violet_hi', 'violet_dim', 'cyan', 'cyan_dim', 'coral', 'coral_dim')}
    # Title band: amber characters, one to a cell, across the top.
    msg = '<<' + STATE['title'] + '>>'
    cw, gap = .62, .08
    tx = x0 + 6.2
    for i, ch in enumerate(msg.center(12)):
        cx0 = tx + i * (cw + gap)
        by['amber_dim'].append(rect(cx0, z1 - 1.05, cx0 + cw, z1 - .2))
        for row, bits in enumerate(DOTFONT.get(ch, DOTFONT[' ']) if ch in DOTFONT or ch == ' ' else CELLFONT.get(ch, [0] * 7)):
            for col in range(5):
                if bits & (1 << (4 - col)):
                    px, pz = cx0 + .09 + col * .092, z1 - .3 - row * .1
                    by['amber'].append(rect(px, pz - .075, px + .075, pz))
    # Twin ring gauges, left and right channel, like a 2002 unit's 'human equalizer'.
    lv = levels(14, 7)
    for ring, (gz, level, name) in enumerate(((z0 + 5.25, .82, 'L'), (z0 + 2.45, .66, 'R'))):
        gx = x0 + 2.35
        for i in range(12):
            a0 = math.radians(95 + i * 14.2); a1 = a0 + math.radians(11)
            lit = i < level * 12
            by['amber' if lit and i > 9 else 'coral' if lit else 'coral_dim'].append(polar_cell(gx, gz, .92, 1.34, a0, a1))
        by['deep'] += [segment_bar((gx + .72 * math.cos(math.radians(a)), gz + .72 * math.sin(math.radians(a))),
                                   (gx + .72 * math.cos(math.radians(a + 10)), gz + .72 * math.sin(math.radians(a + 10))), .04) for a in range(95, 265, 10)]
        text('Chan' + name, name, gx + .35, gz, y - .012, .5, 'N_jade', 'TCCB____.TTF')
    # Sweeping corner arcs, the display's own furniture.
    for (cx, cz, a0, a1) in ((x0 + 3.2, z1 - 2.2, 120, 175), (x0 + 3.0, z0 + 2.2, 185, 245)):
        arc = [(cx + 2.6 * math.cos(math.radians(a)), cz + 2.6 * math.sin(math.radians(a))) for a in range(a0, a1 + 1, 4)]
        by['deep'] += [segment_bar(p, q, .12) for p, q in zip(arc, arc[1:])]
    # Tunnel spectrum: two rows of bars folding away to a vanishing point, the live
    # waveform running down the seam between them.
    xa, xb = x0 + 5.0, x1 - 2.6
    zc = z0 + 4.15
    lv = levels(22, 9)
    for i in range(22):
        u = i / 21
        k = 1 - (1 - u) ** 1.5
        x = xa + (xb - xa) * k
        w = .4 * (1 - .6 * k)
        seam = zc + .35 * math.sin(math.pi * k)
        span = 3.3 * (1 - .66 * k)
        n = 9
        for j in range(n):
            h0 = .12 + j * span / n
            cell = span / n * .74
            lit = j < lv[i] * n
            ink = ('violet_hi' if j > 6 else 'violet') if lit else 'violet_dim'
            by[ink].append(rect(x, seam + h0, x + w, seam + h0 + cell))
            by['cyan' if lit else 'cyan_dim'].append(rect(x, seam - h0 - cell * .8, x + w, seam - h0))
    wave = []
    for q in range(200):
        u = q / 199
        k = 1 - (1 - u) ** 1.5
        env = math.sin(math.pi * u) ** 1.4 * (1 - .6 * k)
        v = env * (.28 * math.sin(2 * math.pi * 11 * u) + .12 * math.sin(2 * math.pi * 27 * u + 1))
        wave.append((xa + (xb - xa) * k + .1, zc + .35 * math.sin(math.pi * k) + v))
    by['mint'] += [segment_bar(p, q, .05) for p, q in zip(wave, wave[1:])]
    # Band labels under the tunnel, the readout on the right.
    for k in by:
        # Unlit cells sit a hair behind the lit ones, so the two never fight.
        back = .006 if k.endswith('dim') else 0.
        quads('Disp_' + k, by[k], y - .01 + back, y + back, 'N_' + k)
    for label, u in (('60', 0.), ('150', .2), ('400', .38), ('1K', .55), ('2.5K', .7), ('6K', .84), ('15K', .97)):
        k = 1 - (1 - u) ** 1.5
        text('Band', label, xa + (xb - xa) * k + .1, z0 + .45, y - .012, .3, 'N_amber', 'TCCB____.TTF', spacing=1.1)
    seven_seg('02', x1 - 2.05, z1 - 2.1, .017, y, 'N_jade', .065)
    seven_seg(STATE['time'][:2], x1 - 2.05, z0 + 3.35, .017, y, 'N_mint', .065)
    seven_seg(STATE['time'][3:], x1 - 2.05, z0 + 2.15, .017, y, 'N_mint', .065)

CELLFONT = {'<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8]}

def screen1_art(at, y):
    """A jade vector landscape rolling towards the viewer, an amber moon on the horizon."""
    shapes = {'deep': [], 'jade': [], 'mint': [], 'amber': [], 'dim': []}
    hz = .15
    def P(u, v):
        return at(max(-1, min(1, u)), max(-1, min(1, v)))
    for j in range(16):
        d = 1 + j * .6 + j * j * .05
        v = hz - 1.1 / d
        if v < -1:
            continue
        k = 'mint' if j < 4 else 'jade' if j < 9 else 'deep'
        pts = [P(-1 + i / 60 * 2, v + .05 * math.sin(i * .5 + j) / d) for i in range(61)]
        shapes[k] += [segment_bar(a, b, .06) for a, b in zip(pts, pts[1:])]
    for i in range(-16, 17):
        xf, xn = i * .04, i * .36
        t = 1.
        if abs(xn) > 1:
            t = (math.copysign(1, xn) - xf) / (xn - xf)
        shapes['deep' if abs(i) > 8 else 'jade'].append(segment_bar(P(xf, hz), P(xf + (xn - xf) * t, hz + (-1 - hz) * t), .055))
    ridge = [(-1 + k / 60 * 2, hz + .04 + .22 * abs(math.sin(k * .37)) * (1 - abs(k - 30) / 40) + .06 * math.sin(k * 1.3)) for k in range(61)]
    shapes['mint'] += [segment_bar(P(*a), P(*b), .07) for a, b in zip(ridge, ridge[1:])]
    moon = [P(.45 + .07 * math.cos(math.radians(a)), hz + .32 + .19 * math.sin(math.radians(a))) for a in range(0, 361, 12)]
    shapes['amber'].append(moon)
    for k, s in shapes.items():
        quads('S1_' + k, s, y - .01, y, 'N_' + k)

def avatar_art(at, y):
    """Placeholder for Jackie's own 3D figure: a jade wireframe mannequin on a turntable."""
    shapes = {'jade': [], 'mint': [], 'deep': []}
    def P(u, v):
        return at(u, v)
    # Turntable rings.
    for r, k in ((.62, 'deep'), (.46, 'jade')):
        ring = [P(r * math.cos(math.radians(a)), -.78 + r * .18 * math.sin(math.radians(a))) for a in range(0, 361, 8)]
        shapes[k] += [segment_bar(a, b, .035) for a, b in zip(ring, ring[1:])]
    # Mannequin outline.
    head = [P(.13 * math.cos(math.radians(a)), .52 + .075 * math.sin(math.radians(a))) for a in range(0, 361, 10)]
    shapes['mint'] += [segment_bar(a, b, .045) for a, b in zip(head, head[1:])]
    body = [(-.06, .43), (-.28, .33), (-.34, .02), (-.28, .0), (-.22, .28), (-.18, .02), (-.2, -.72), (-.06, -.72), (0, -.18),
            (.06, -.72), (.2, -.72), (.18, .02), (.22, .28), (.28, .0), (.34, .02), (.28, .33), (.06, .43)]
    shapes['mint'] += [segment_bar(P(*a), P(*b), .045) for a, b in zip(body, body[1:])]
    for v in (.2, 0, -.2, -.4):
        shapes['deep'].append(segment_bar(P(-.19, v), P(.19, v), .025))
    for k, s in shapes.items():
        quads('Av_' + k, s, y - .01, y, 'N_' + k)

def camera(name, target, width, lens=200, tilt=12):
    cam = bpy.data.cameras.new(name); cam.lens = lens; cam.sensor_width = 36; cam.clip_end = 50
    o = bpy.data.objects.new(name, cam); bpy.context.collection.objects.link(o)
    d = width * lens / 36
    t = math.radians(tilt)
    o.location = (target[0], target[1] - d * math.cos(t), target[2] + d * math.sin(t))
    o.rotation_euler = (math.radians(90 - tilt), 0, 0)
    return o

def compositor(bg=(.004, .004, .004)):
    scene = bpy.context.scene; scene.use_nodes = True
    nt = scene.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    rl = nt.nodes.new('CompositorNodeRLayers')
    glare = nt.nodes.new('CompositorNodeGlare'); glare.glare_type = 'FOG_GLOW'; glare.quality = 'HIGH'; glare.threshold = 1.6; glare.size = 7; glare.mix = -.15
    over = nt.nodes.new('CompositorNodeAlphaOver')
    rgb = nt.nodes.new('CompositorNodeRGB'); rgb.outputs[0].default_value = (*bg, 1)
    out = nt.nodes.new('CompositorNodeComposite')
    nt.links.new(rl.outputs['Image'], glare.inputs[0])
    nt.links.new(rgb.outputs[0], over.inputs[1]); nt.links.new(glare.outputs[0], over.inputs[2])
    nt.links.new(over.outputs[0], out.inputs[0])
    cut = nt.nodes.new('CompositorNodeSetAlpha'); cut.mode = 'REPLACE_ALPHA'
    nt.links.new(glare.outputs[0], cut.inputs[0]); nt.links.new(rl.outputs['Alpha'], cut.inputs[1])
    save = nt.nodes.new('CompositorNodeOutputFile'); save.name = 'Cutout'
    save.format.file_format = 'PNG'; save.format.color_mode = 'RGBA'
    nt.links.new(cut.outputs[0], save.inputs[0])

def render(cam, path, res):
    scene = bpy.context.scene
    scene.camera = cam
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.resolution_percentage = 50 if QUICK else 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.filepath = str(path)
    save = scene.node_tree.nodes.get('Cutout')
    if save:
        save.base_path = str(path.parent)
        save.file_slots[0].path = path.stem + '-cutout'
    bpy.ops.render.render(write_still=True)
    print('RENDERED', path)


# ---------------------------------------------------------------- light, camera, render
def stage():
    world = bpy.data.worlds.new('Studio'); bpy.context.scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    env = nt.nodes.new('ShaderNodeTexEnvironment')
    env.image = bpy.data.images.load(str(BLENDER_WORLD))
    mapping = nt.nodes.new('ShaderNodeMapping'); coord = nt.nodes.new('ShaderNodeTexCoord')
    mapping.inputs['Rotation'].default_value = (0, 0, math.radians(200))
    nt.links.new(coord.outputs['Generated'], mapping.inputs['Vector']); nt.links.new(mapping.outputs[0], env.inputs['Vector'])
    bg = nt.nodes['Background']; bg.inputs['Strength'].default_value = .28
    nt.links.new(env.outputs[0], bg.inputs[0])
    def area(name, loc, size, energy, target, color=(1, 1, 1)):
        d = bpy.data.lights.new(name, 'AREA'); d.shape = 'RECTANGLE'; d.size, d.size_y = size; d.energy = energy; d.color = color
        o = bpy.data.objects.new(name, d); bpy.context.collection.objects.link(o); o.location = loc
        o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    # Softboxes placed for the chrome: a big key up and left, a strip overhead that
    # draws a line along every top edge, a cool rim behind on the right.
    area('Key', (-.9, -.8, .9), (.9, .6), 60, (0, 0, .1), (1, .97, .93))
    area('Strip', (-.05, -.1, .8), (1.2, .05), 12, (-.06, .02, .1))
    area('Rim', (.7, .6, .45), (.08, .9), 70, (0, 0, .1), (.8, .88, 1))
    area('Fill', (.6, -.9, .1), (.8, .8), 6, (0, 0, .08), (.85, .9, 1))

def camera3q(name, target, height, yaw=-32, elev=12, lens=70):
    cam = bpy.data.cameras.new(name); cam.lens = lens; cam.sensor_fit = 'VERTICAL'; cam.sensor_height = 24; cam.clip_end = 50
    o = bpy.data.objects.new(name, cam); bpy.context.collection.objects.link(o)
    d = (height / 2) / (12 / lens)
    y, e = math.radians(yaw), math.radians(elev)
    loc = Vector(target) + Vector((math.sin(y) * math.cos(e), -math.cos(y) * math.cos(e), math.sin(e))) * d
    o.location = loc
    o.rotation_euler = (Vector(target) - loc).to_track_quat('-Z', 'Y').to_euler()
    return o

def build(t, power, art=True):
    STATE['open'] = t; STATE['power'] = power; STATE['art'] = art
    reset()
    random.seed(3)
    materials()
    PARENT[0] = root()
    body(); screen1(t)
    stage(); compositor()

if MODE == 'frames':
    FRAMES.mkdir(parents=True, exist_ok=True)
    shots = [('open', 1.0, True), ('closed', 0.0, False), ('opening', .55, True)]
    for name, t, power in shots:
        if ONLY and name != ONLY:
            continue
        build(t, power)
        # The same camera the page starts from (components/portfolio/y2k-deck/stage.ts FRAME).
        cam = camera3q('Front', (0, 0, .168), .37, 0, 4, 110)
        render(cam, FRAMES / f'v6-{name}.png', (1080, 1200))

PUBLIC = ROOT / 'public/portfolio/y2k-deck'

def planar_uv(obj, u0, u1, v0, v1, axis_u=0, axis_v=1):
    me = obj.data
    uv = me.uv_layers.new(name='ScreenUV') if not me.uv_layers else me.uv_layers[0]
    for poly in me.polygons:
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv = ((co[axis_u] - u0) / (u1 - u0), (co[axis_v] - v0) / (v1 - v0))

def export():
    build(1.0, True, art=False)
    bpy.context.view_layer.update()
    cutters = [o for o in bpy.data.objects if o.type == 'MESH' and o.hide_render]
    solid = [o for o in bpy.data.objects if o.type in ('MESH', 'CURVE', 'FONT') and not o.hide_render]
    for o in bpy.data.objects:
        o.select_set(False)
    for o in solid:
        o.select_set(True)
    bpy.context.view_layer.objects.active = solid[0]
    bpy.ops.object.convert(target='MESH')
    for o in cutters:
        bpy.data.objects.remove(o)
    for o in [o for o in bpy.data.objects if o.type in ('LIGHT', 'CAMERA')]:
        bpy.data.objects.remove(o)
    # The two faces the page paints onto, with UVs spanning their glass.
    x0, x1, z0, z1 = DISP['x0'], DISP['x1'] + .75, DISP['z0'], DISP['z1']
    disp = bpy.data.objects['DisplayBack']; disp.name = 'DisplayScreen'
    planar_uv(disp, x0, x1, z0, z1, 0, 1)
    glass = bpy.data.objects['S1Glass']; glass.name = 'Screen1Screen'
    gw, gh, h = SCREEN1['gw'], SCREEN1['gh'], SCREEN1['h']
    planar_uv(glass, -gw / 2 - .05, gw / 2 + .05, h / 2 - gh / 2 - .05, h / 2 + gh / 2 + .05, 0, 2)
    # Where each key sits, in the page's (y-up) metres, for the no-WebGL fallback.
    keys = {}
    for name in ('prev', 'play', 'stop', 'next', 'rocker', 'mute', 'power', 'eject'):
        g = bpy.data.objects['Key_' + name]
        pts = [child.matrix_world @ Vector(c) for child in g.children for c in child.bound_box]
        xs, ys, zs = [p.x for p in pts], [p.y for p in pts], [p.z for p in pts]
        keys[name] = dict(center=[round((min(xs) + max(xs)) / 2, 5), round((min(zs) + max(zs)) / 2, 5), round(-min(ys), 5)],
                          size=[round(max(xs) - min(xs), 5), round(max(zs) - min(zs), 5)])
    (ROOT / 'components/portfolio/y2k-deck/keys.json').write_text(json.dumps(keys, indent=1), encoding='utf8')
    (ROOT / 'components/portfolio/y2k-deck/mechanism.json').write_text(json.dumps(dict(
        clear=SCREEN1['h'] + .45, extend=MECH['extend'], stage1=MECH['stage1'], tilt=MECH['tilt'], coverAngle=105, discTravel=6.0), indent=1), encoding='utf8')
    PUBLIC.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(PUBLIC / 'deck.glb'), export_format='GLB', export_apply=True, export_cameras=False,
                              export_lights=False, export_yup=True, export_draco_mesh_compression_enable=True,
                              export_draco_mesh_compression_level=6)
    tris = 0
    for o in bpy.data.objects:
        if o.type == 'MESH':
            o.data.calc_loop_triangles(); tris += len(o.data.loop_triangles)
    print('EXPORTED', PUBLIC / 'deck.glb', 'triangles', tris, 'display aspect', round((x1 - x0) / (z1 - z0), 3), 'screen aspect', round((gw + .1) / (gh + .1), 3))

if MODE == 'export':
    export()
