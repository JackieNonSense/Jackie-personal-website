"""Build the editable A / Flip Cockpit master and deterministic web export.

Run with the pinned Blender 4.5.13 portable binary in background mode.
Coordinates intentionally use web axes (X right, Y up, Z toward viewer),
export_yup=False preserves these axes and the named articulation pivots.
One world unit = 10 mm. No image-generated product picture is used as a map.
"""
import bpy
import math
import json
import hashlib
from pathlib import Path
from mathutils import Vector
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "app/reference/production/cd-deck-v06-refinement"
PUBLIC = ROOT / "public/portfolio"
SOURCE.mkdir(parents=True, exist_ok=True)
PUBLIC.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for material in list(bpy.data.materials):
    bpy.data.materials.remove(material)

def mat(name, color, metal=0, rough=.4, coat=0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = (*color, 1)
    p.inputs["Metallic"].default_value = metal
    p.inputs["Roughness"].default_value = rough
    p.inputs["Coat Weight"].default_value = coat
    return m

silver = mat("SatinSilver", (.52, .54, .55), 1, .31)
chrome = mat("MachinedChrome", (.74, .77, .8), 1, .19)
dark_metal = mat("DarkTitanium", (.12, .135, .145), .85, .36)
black = mat("RecessPolymer", (.009, .012, .015), .05, .47)
rubber = mat("KnobGrip", (.014, .017, .019), 0, .72)
blue = mat("IceBlueEdge", (.035, .28, .56), .15, .22, .65)
blue.node_tree.nodes.get("Principled BSDF").inputs["Emission Color"].default_value = (.025, .19, .48, 1)
blue.node_tree.nodes.get("Principled BSDF").inputs["Emission Strength"].default_value = .6
key_silver = mat("KeyIceSilver", (.30,.48,.65), .75,.24,.5)
ink = mat("EtchedInk", (.08, .1, .11), .2, .7)
glass_material = mat("SmokedGlass", (.04, .055, .065), 0, .1, .4)
screen_material = mat("DisplaySurface", (.002, .005, .007), 0, .6)
disc_material = mat("OpticalSilver", (.7, .72, .76), 1, .15)

def parent_to(obj, parent):
    if parent:
        bpy.context.view_layer.update()
        world = obj.matrix_world.copy()
        obj.parent = parent
        obj.matrix_world = world
    return obj

def empty(name, at=(0, 0, 0), parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.location = at
    return parent_to(obj, parent)

def finish(obj, name, material, parent=None, bevel=0, smooth=False):
    obj.name = name
    if material:
        obj.data.materials.append(material)
    if bevel:
        modifier = obj.modifiers.new("Machined edge radius", "BEVEL")
        modifier.width = bevel
        modifier.segments = 3
        modifier.affect = "EDGES"
        modifier = obj.modifiers.new("Weighted corner normals", "WEIGHTED_NORMAL")
        modifier.keep_sharp = True
        modifier.weight = 40
    if smooth:
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
    return parent_to(obj, parent)

def box(name, at, size, material, parent=None, bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1, location=at)
    obj = bpy.context.object
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, material, parent, bevel)

def prism(name, points, front, depth, material, parent=None, bevel=.018):
    # points are XY outline; per-vertex front depth produces true folded facets.
    n = len(points)
    front = [front] * n if isinstance(front, (float, int)) else front
    verts = [(x, y, z) for (x, y), z in zip(points, front)]
    verts += [(x, y, z - depth) for (x, y), z in zip(points, front)]
    faces = [tuple(range(n)), tuple(reversed(range(n, 2*n)))]
    faces += [(i, (i+1) % n, (i+1) % n+n, i+n) for i in range(n)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    # Consistent outward normals on custom solids.
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    obj.select_set(False)
    return finish(obj, name, material, parent, bevel)

def cylinder(name, at, radius, depth, material, parent=None, vertices=96):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=at)
    return finish(bpy.context.object, name, material, parent, .018, True)

def ring(name, at, outer, inner, depth, material, parent=None, segments=128):
    verts = []
    for z, radius in [(depth/2, outer), (depth/2, inner), (-depth/2, outer), (-depth/2, inner)]:
        verts += [(radius*math.cos(i*2*math.pi/segments), radius*math.sin(i*2*math.pi/segments), z) for i in range(segments)]
    faces = []
    for i in range(segments):
        j = (i+1) % segments
        faces += [(i,j,j+segments,i+segments), (i+2*segments,i+3*segments,j+3*segments,j+2*segments),
                  (i,i+2*segments,j+2*segments,j), (i+segments,j+segments,j+3*segments,i+3*segments)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = at
    result = finish(obj, name, material, parent, .009, False)
    # The annular front is planar, not a smoothed torus. Only cylindrical
    # inner/outer walls interpolate normals; this avoids scalloped highlights.
    for index, polygon in enumerate(result.data.polygons):
        polygon.use_smooth = index % 4 >= 2
    return result

def text(name, body, at, size, material, parent=None, align="LEFT", rotation=0):
    curve = bpy.data.curves.new(name, "FONT")
    curve.body = body
    curve.size = size
    curve.space_character = 1.15
    curve.align_x = align
    curve.extrude = 0
    curve.resolution_u = 3
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.location = at
    obj.rotation_euler.z = rotation
    obj.data.materials.append(material)
    parent_to(obj, parent)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj.select_set(False)
    return obj

chassis = empty("Chassis")
face = empty("FacePivot", (0, -4.38, .48))
volume = empty("VolumePivot", (0, -2.16, 1.35), face)
carrier = empty("DiscCarrier", (0, 2.8, -4.9), chassis)

# Fixed outer shell and continuous interior, never an opening onto empty page.
box("RearShell", (0, 0, -11.9), (17.8, 8.9, .22), black, chassis, .09)
box("ShellRoof", (0, 4.45, -6.1), (17.8, .18, 11.8), black, chassis, .04)
box("ShellFloor", (0, -4.35, -6.1), (17.8, .18, 11.8), black, chassis, .04)
box("BayShadow", (0, 2.35, -10.4), (16.9, 2.5, .3), black, chassis, .08)
box("LeftCheek", (-8.88, 0, .1), (.24, 8.9, .95), dark_metal, chassis, .08)
box("RightCheek", (8.88, 0, .1), (.24, 8.9, .95), dark_metal, chassis, .08)
prism("TopRail", [(-9,4.6),(9,4.6),(8.8,3.59),(-8.8,3.59)], [1,.99,.61,.61], .22, silver, chassis, .06)
box("SlotLip", (0, 4.08, .84), (12.8, .43, .08), chrome, chassis, .15)
box("SlotMouth", (0, 4.08, .9), (12.58, .26, .035), black, chassis, .10)
box("SlotBlueIndicator", (6.13, 4.08, .931), (.13, .16, .025), blue, chassis, .012)
text("SlotLegend", "DISC LOADING MECHANISM", (0,4.37,1.015), .10, ink, chassis, "CENTER")
for sign in [-1,1]:
    hinge = cylinder("HingePin", (sign*8.65,-3.91,.62), .17, .22, chrome, chassis, 32)
    hinge.rotation_euler.y = math.pi/2
    box("HingeBracket", (sign*8.65,-3.6,.12), (.25,1.4,.4), dark_metal, chassis, .035)
    box("LoaderGuide", (sign*6.5,2.92,-.8), (.28,.2,.8), dark_metal, chassis, .03)

# The full lower face / glass assembly is rigid and hinged.
prism("FaceBacking", [(-8.77,3.55),(8.77,3.55),(8.8,-4.45),(1.2,-4.57),(0,-4.7),(-1.2,-4.57),(-8.8,-4.45)], .62,.32, dark_metal, face,.05)
# Floating chrome edge at lens base follows the shallow V.
prism("LensLowerChrome", [(-8.66,.79),(-4,.19),(0,.1),(4,.19),(8.66,.79),(8.66,.63),(4,.02),(0,-.07),(-4,.02),(-8.66,.63)], 1.05,.08,chrome,face,.025)
for sign in [-1,1]:
    pts = [(sign*x,y) for x,y in [(8.67,.59),(4,.00),(1.8,-1.07),(1.44,-3.3),(.7,-4.53),(8.73,-4.40)]]
    prism("SculptedWing",pts,[1.05,1.28,1.41,1.33,.8,.8],.16,silver,face,.10)
    pts = [(sign*x,y) for x,y in [(8.65,.43),(3.35,-.53),(1.85,-1.65),(2.04,-2.24),(8.62,-.40)]]
    prism("UpperBlade",pts,[1.11,1.43,1.52,1.30,1.06],.1,chrome,face,.025)
    pts = [(sign*x,y) for x,y in [(8.58,-1.53),(2.17,-2.72),(1.71,-3.62),(8.65,-4.28)]]
    prism("LowerFacet",pts,[1.04,1.31,1.13,.81],.08,silver,face,.025)
    box("SideFaceChrome", (sign*8.68,-1.86,.99), (.065,5.05,.08),chrome,face,.02)

# Lens and screen share analytic bowing, but are separate objects/materials.
def lens(name, material, zoffset):
    nx, ny = 64, 18
    verts=[]; uvs=[]
    for j in range(ny+1):
        t=j/ny
        for i in range(nx+1):
            u=i/nx; x=(u-.5)*17.1
            bottom=.27+.48*(abs(x)/8.55)**2
            y=bottom+(3.43-bottom)*t
            z=.96+zoffset+.11*(1-(x/8.55)**2)*math.sin(t*math.pi)
            verts.append((x,y,z)); uvs.append((u,t))
    faces=[]
    for j in range(ny):
        for i in range(nx):
            a=j*(nx+1)+i; faces.append((a,a+1,a+nx+2,a+nx+1))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    uv=mesh.uv_layers.new(name="DisplayUV")
    for polygon in mesh.polygons:
        polygon.use_smooth=True
        for index in polygon.loop_indices:
            uv.data[index].uv=uvs[mesh.loops[index].vertex_index]
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    return finish(obj,name,material,face)
lens("Screen",screen_material,0)
lens("Glass",glass_material,.018)
box("LensTopSeal",(0,3.49,.88),(17.24,.09,.15),black,face,.025)
for sign in [-1,1]:
    box("LensSideSeal",(sign*8.57,2.1,.9),(.1,2.72,.12),black,face,.025)

# Gear edge is actual geometry, not a normal-map illusion.
cylinder("KnobSocket",(0,-2.16,1.26),1.88,.17,black,face)
ring("SocketChrome",(0,-2.16,1.39),1.89,1.78,.09,chrome,face)
cylinder("KnobGripBody",(0,-2.16,1.52),1.68,.37,rubber,volume)
for i in range(64):
    angle=i*math.tau/64
    obj=box("GripTooth",(1.66*math.sin(angle),-2.16+1.66*math.cos(angle),1.72),(.10,.23,.24),chrome,volume,.018)
    obj.rotation_euler.z=-angle
ring("KnobOuterBevel",(0,-2.16,1.79),1.52,1.35,.13,chrome,volume)
cylinder("KnobHub",(0,-2.16,1.81),1.365,.21,silver,volume)
ring("HubEtch",(0,-2.16,1.925),1.30,1.286,.002,dark_metal,volume)
box("KnobPointer",(-.60,-1.03,1.939),(.038,.18,.012),ink,volume,.005).rotation_euler.z=.48

# Four separately named moving keys, following diagonal silver blades.
for sign, names, labels in [(-1,["KeyPlay","KeyNext"],["PLAY","NEXT"]),(1,["KeyDisplay","KeyMute"],["DISPLAY","MUTE"])]:
    for row,(name,label) in enumerate(zip(names,labels)):
        x=sign*4.5;y=-1.18-row*.70
        key=empty(name,(x,y,1.46),face)
        pts=[(sign*a,b) for a,b in [(5.75,y+.51),(3.45,y+.05),(3.08,y-.39),(5.30,y+.03)]]
        cx=sum(p[0] for p in pts)/4;cy=sum(p[1] for p in pts)/4
        pts=[(a,cy+(b-cy)*1.25) for a,b in pts]
        prism(name+"Recess",pts,1.45,.14,black,face,.055)
        inner=[(cx+(a-cx)*.91,cy+(b-cy)*.80) for a,b in pts]
        prism(name+"Blue",inner,1.56,.10,blue,key,.04)
        inner=[(cx+(a-cx)*.83,cy+(b-cy)*.60) for a,b in pts]
        prism(name+"Cap",inner,1.61,.05,key_silver,key,.035)
        # Actual ink geometry survives model rotation and key travel. At the
        # homepage scale a function symbol reads better than 2px microtext.
        icon=empty(name+"Icon",(cx,cy,1.67),key)
        if name=="KeyPlay":
            shapes=[[(-.13,-.115),(-.13,.115),(.10,0)],[(.15,-.11),(.19,-.11),(.19,.11),(.15,.11)]]
        elif name=="KeyNext":
            shapes=[[(-.22,-.115),(-.22,.115),(-.01,0)],[(.01,-.115),(.01,.115),(.22,0)]]
        elif name=="KeyDisplay":
            shapes=[[(x,-.12),(x+.06,-.12),(x+.06,h),(x,h)] for x,h in [(-.17,.02),(-.03,.15),(.11,.08)]]
        else:
            shapes=[[(-.20,-.05),(-.10,-.05),(.01,-.13),(.01,.13),(-.10,.05),(-.20,.05)],[(.08,-.13),(.12,-.15),(.25,.13),(.21,.15)]]
        angle=sign*.19
        for i,shape in enumerate(shapes):
            points=[(cx+a*math.cos(angle)-b*math.sin(angle),cy+a*math.sin(angle)+b*math.cos(angle)) for a,b in shape]
            prism(name+"Symbol"+str(i),points,1.673,.004,ink,icon,.001)
text("VolumeLegend","VOLUME",(-8.13,-4.09,1.0),.12,ink,face)
text("MinusLegend","−",(-2.15,-3.83,1.1),.21,ink,face)
text("PlusLegend","+",(2.1,-3.83,1.1),.21,ink,face)

# Horizontal transport with a slight loading-rail pitch: a narrow visible arc.
disc=ring("OpticalDisc",(0,2.8,-4.9),5.9,.74,.12,disc_material,carrier,128)
disc.rotation_euler.x=math.radians(80)
hub=ring("DiscHub",(0,2.8,-4.89),1.13,.74,.125,chrome,carrier,64)
hub.rotation_euler.x=math.radians(80)

# Compact export: join repeated static detail per material and articulation.
for parent in [chassis,face,volume]+[bpy.data.objects[n] for n in ["KeyPlay","KeyNext","KeyDisplay","KeyMute"]]:
    groups={}
    for obj in list(parent.children):
        if obj.type=="MESH" and obj.name not in ["Screen","Glass","KnobHub"]:
            material=obj.data.materials[0].name
            groups.setdefault(material,[]).append(obj)
    for material,objects in groups.items():
        # Apply bevels before joining to retain every part's radius.
        for obj in objects:
            bpy.ops.object.select_all(action="DESELECT");obj.select_set(True);bpy.context.view_layer.objects.active=obj
            for modifier in list(obj.modifiers):
                bpy.ops.object.modifier_apply(modifier=modifier.name)
        if len(objects)>1:
            bpy.ops.object.select_all(action="DESELECT")
            for obj in objects:obj.select_set(True)
            bpy.context.view_layer.objects.active=objects[0]
            bpy.ops.object.join()
            bpy.context.object.name=parent.name+"_"+material

# Directional microscopic roughness, preserved as an editable original map.
rng=np.random.default_rng(41)
n=512
rows=rng.normal(0,.004,(n,1))
grain=np.clip(.53+rows+rng.normal(0,.003,(n,n)),0,1).astype(np.float32)
rgba=np.ones((n,n,4),dtype=np.float32);rgba[:,:,:3]=grain[:,:,None]
im=bpy.data.images.new("SatinRoughness",width=n,height=n,alpha=False)
im.colorspace_settings.name="Non-Color";im.pixels.foreach_set(rgba.ravel())
im.filepath_raw=str(SOURCE/"satin-roughness.png");im.file_format="PNG";im.save();im.pack()
# Map exported separately for the shared web material calibration.
im.filepath_raw=str(PUBLIC/"deck-satin-roughness-v01.png");im.save()

# UV coordinates on metal for consistent tiny machining, not stretched desktop textures.
for obj in list(bpy.context.scene.objects):
    if obj.type=="MESH" and obj.name not in ["Screen","Glass"]:
        if not obj.data.uv_layers:obj.data.uv_layers.new(name="MaterialUV")
        uv=obj.data.uv_layers.active
        for polygon in obj.data.polygons:
            for index in polygon.loop_indices:
                p=obj.data.vertices[obj.data.loops[index].vertex_index].co
                uv.data[index].uv=(p.x/2.73+.5,p.y/2.73+.5) if obj.name=="KnobHub" else (p.x/18+.5,p.y/9.3+.5)

bpy.context.scene.unit_settings.system="METRIC"
bpy.context.scene.unit_settings.scale_length=.01
bpy.ops.object.select_all(action="SELECT")
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/"deck-a-master.blend"))
for obj in bpy.context.scene.objects:
    if obj.type == "MESH":
        obj.modifiers.new("Export triangulation", "TRIANGULATE")
bpy.ops.export_scene.gltf(filepath=str(PUBLIC/"deck-a-v02.glb"),export_format="GLB",export_yup=False,
    export_apply=True,export_texcoords=True,export_normals=True,export_tangents=True,export_animations=False,
    export_extras=True,export_cameras=False,export_lights=False)
manifest={"blender":bpy.app.version_string,"units":"1 unit = 10mm; web Y-up preserved", "frontAspect":180/93,
          "source":"deck-a-master.blend","export":"deck-a-v02.glb","sha256":hashlib.sha256((PUBLIC/"deck-a-v02.glb").read_bytes()).hexdigest(),
          "pivots":["Chassis","FacePivot","VolumePivot","KeyPlay","KeyNext","KeyDisplay","KeyMute","DiscCarrier"],
          "stage":"REFINEMENT 02 — geometric function symbols and planar annular normals; homepage controls connected"}
(SOURCE/"manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf8")
print(json.dumps(manifest))
