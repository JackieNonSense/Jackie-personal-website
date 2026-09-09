"""Independent Blender design/mechanism study, not the portfolio production model.

Y up, Z toward viewer, 1 unit = 10 mm. Geometry, normals, hinge and carriage
are authored here; the display is illustrative, not a captured live spectrum.
"""
import bpy
import math
import json
import sys
from pathlib import Path
from mathutils import Vector, Matrix

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'app/reference/production/cd-deck-v07-wide-study'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name,color,metal=0,rough=.4,emission=0):
    m=bpy.data.materials.new(name);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    if emission:
        p.inputs['Emission Color'].default_value=(*color,1)
        p.inputs['Emission Strength'].default_value=emission
    return m

champagne=material('Satin champagne alloy',(.43,.40,.32),.8,.31)
edge=material('Polished edge',(.59,.60,.55),.95,.23)
polymer=material('Graphite seals',(.012,.018,.022),.08,.44)
bay=material('Internal graphite',(.035,.043,.046),.5,.36)
glass=material('Smoked optical glass',(.005,.012,.018),.15,.15)
cyan=material('Cyan phosphor',(.04,.63,.9),0,.4,2)
blue=material('Deep blue phosphor',(.025,.10,.40),0,.4,1.5)
lime=material('Chartreuse phosphor',(.58,.84,.09),0,.4,1.8)
amber=material('Amber indicators',(.95,.30,.035),0,.4,1.6)
dim=material('Unlit display segments',(.015,.050,.061),0,.55,.35)
ink=material('Pad printed ink',(.028,.038,.038),0,.8)
silver=material('Linear fader alloy',(.52,.54,.49),.8,.25)

def parent(obj,to):
    if to:
        bpy.context.view_layer.update();world=obj.matrix_world.copy()
        obj.parent=to;obj.matrix_world=world
    return obj

def empty(name,at=(0,0,0),to=None):
    obj=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(obj);obj.location=at
    return parent(obj,to)

def box(name,at,size,mat,to=None,r=.04):
    bpy.ops.mesh.primitive_cube_add(size=1,location=at)
    obj=bpy.context.object;obj.name=name;obj.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    obj.data.materials.append(mat)
    if r:
        b=obj.modifiers.new('Continuous edge radius','BEVEL');b.width=r;b.segments=6;b.harden_normals=True
        n=obj.modifiers.new('Weighted planar normals','WEIGHTED_NORMAL');n.keep_sharp=True;n.weight=50
    return parent(obj,to)

font_path=Path('C:/Windows/Fonts/consola.ttf')
font=bpy.data.fonts.load(str(font_path)) if font_path.exists() else None
def text(name,body,x,y,z,size,mat,to=None,align='LEFT'):
    curve=bpy.data.curves.new(name,'FONT');curve.body=body;curve.size=size;curve.align_x=align;curve.resolution_u=4
    if font:curve.font=font
    obj=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(obj);obj.location=(x,y,z);obj.data.materials.append(mat)
    return parent(obj,to)

def line(name,points,mat,to=None,width=.012):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.bevel_depth=width;curve.bevel_resolution=2
    spline=curve.splines.new('POLY');spline.points.add(len(points)-1)
    for p,v in zip(spline.points,points):p.co=(*v,1)
    obj=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(obj);obj.data.materials.append(mat)
    return parent(obj,to)

def arc(name,cx,cy,rx,ry,a,b,mat,to,width=.015,z=1.035):
    count=max(3,math.ceil(72*abs(b-a)/math.pi))
    points=[(cx+rx*math.cos(a+(b-a)*i/count),cy+ry*math.sin(a+(b-a)*i/count),z) for i in range(count+1)]
    return line(name,points,mat,to,width)

def rounded_path(w,h,r,n=20):
    pts=[]
    for x,y,start in [(w/2-r,h/2-r,0),(-w/2+r,h/2-r,90),(-w/2+r,-h/2+r,180),(w/2-r,-h/2+r,270)]:
        for i in range(n+1):
            a=math.radians(start+i*90/n);pts.append((x+r*math.cos(a),y+r*math.sin(a)))
    return pts

def surround(name,profiles,mat,to,cy=.55):
    # Rounded-rectangle cross-section loops: actual continuous chamfers and
    # soft radii, no non-planar front n-gon split into accidental triangles.
    loops=[[(x,y+cy,z) for x,y in rounded_path(w,h,r)] for w,h,r,z in profiles]
    n=len(loops[0]);vertices=[v for loop in loops for v in loop];faces=[]
    for k in range(len(loops)-1):
        for i in range(n):faces.append((k*n+i,k*n+(i+1)%n,(k+1)*n+(i+1)%n,(k+1)*n+i))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update()
    for p in mesh.polygons:p.use_smooth=True
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(mat)
    return parent(obj,to)

body=empty('FixedChassis')
carriage=empty('PanelCarriage')
hinge=empty('PanelHinge',(0,-3.30,.48),carriage)
panel=empty('ScreenAssembly',to=hinge)

# Fixed shell/control rails. Opening the screen reveals a real enclosed bay.
box('Enclosed rear housing',(0,0,-2.9),(18,10,5.8),polymer,body,.22)
box('Internal bay face',(0,.55,.15),(15.7,7.8,.15),bay,body,.18)
box('CD slot bevel',(0,1.9,.25),(12.7,.50,.15),edge,body,.12)
box('CD throat',(0,1.9,.345),(12.35,.22,.045),polymer,body,.08)
text('Bay caption','COMPACT DISC   /   LOAD',-6.15,2.45,.36,.24,ink,body)
box('Media bay lower inset',(0,-.7,.25),(11.8,2.5,.12),polymer,body,.16)
text('Bay lower caption','OPTICAL TRANSPORT',0,-.78,.33,.28,dim,body,'CENTER')
for side in [-1,1]:
    box('Fixed side rail',(side*8.33,.50,.25),(1.34,8.7,.60),champagne,body,.15)
    box('Linear slide channel',(side*7.35,-3.30,-.25),(.30,.32,1.4),polymer,body,.03)
    box('Travelling hinge arm',(side*7.35,-3.30,-.15),(.17,.22,1.7),edge,carriage,.03)
    bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=.18,depth=.35,location=(side*7.35,-3.30,.48),rotation=(0,math.pi/2,0))
    pin=bpy.context.object;pin.name='Hinge axle';pin.data.materials.append(edge);parent(pin,carriage)
    for y in [-2,0,2]:
        box('Rear seam',(side*8.97,y,-2.6),(.04,.08,3.8),bay,body,.01)
box('Top header',(0,4.79,.27),(17.8,.43,.50),champagne,body,.10)
box('Fixed lower console',(0,-4.20,.26),(17.8,1.50,.62),champagne,body,.18)

# Movable rounded display shell and optical surround.
screen_back=box('ScreenBack',(0,.55,.49),(15.92,7.77,.35),polymer,panel,.21)
surround('Continuous screen bezel',[(15.94,7.78,.34,.57),(15.92,7.76,.35,.67),(15.82,7.66,.38,.78),(15.60,7.44,.40,.84),(14.90,6.90,.41,.84),(14.68,6.69,.42,.76)],champagne,panel)
surround('Black optical gasket',[(14.69,6.70,.42,.765),(14.60,6.61,.43,.81),(14.47,6.48,.44,.87)],polymer,panel)
outline=rounded_path(14.48,6.49,.43)
mesh=bpy.data.meshes.new('Rounded optical surface')
mesh.from_pydata([(x,y+.55,.90) for x,y in outline],[],[tuple(range(len(outline)))]);mesh.update()
optical=bpy.data.objects.new('GlassBack',mesh);bpy.context.collection.objects.link(optical);optical.data.materials.append(glass);parent(optical,panel)
# Narrow reflections are geometry/material lighting, not a baked product image.
surround('Glass edge catch',[(14.46,6.47,.42,.90),(14.41,6.42,.43,.92)],edge,panel)

# Dense VFD study. Future homepage values come from the existing audio controller.
# This exact display is labelled as a static design study in the report/page.
display=empty('DisplayArtwork',to=panel)
text('Small heading','DIGITAL SOUND PROCESSOR',-6.82,3.20,1.035,.20,dim,display)
text('Mode title','COMPACT DISC',-6.80,2.60,1.035,.36,cyan,display)
text('Track title','EDM DETECTION MODE',-3.45,1.83,1.035,.46,cyan,display)
text('Time','00:28',6.70,2.05,1.035,.78,lime,display,'RIGHT')
text('Track label','TRACK 01 / 02',6.70,2.96,1.035,.26,amber,display,'RIGHT')
for i,label in enumerate(['PLAY','STEREO','SPECTRUM','LOCAL']):
    y=1.80-i*.70
    line('Mode cell',[(-6.80,y-.21,1.035),(-4.10,y-.21,1.035),(-4.10,y+.21,1.035),(-6.80,y+.21,1.035),(-6.80,y-.21,1.035)],cyan if i==0 else blue,display,.012)
    text('Mode legend',label,-6.62,y-.10,1.037,.27,lime if i==0 else cyan,display)

# Large concentric spectrum arcs replace the physical center wheel.
for row in range(5):
    rx=3.60-row*.39;ry=1.77-row*.20
    arc('Spectrum guide',-.10,-1.76,rx,ry,0,math.pi,blue,display,.012)
    for i in range(42):
        a=(i+.18)/42*math.pi;b=(i+.75)/42*math.pi
        energy=(math.sin(i*.38)+math.sin(i*.91)+2)/4
        lit=energy>.13+row*.14
        arc('Segment arc',-.10,-1.76,rx,ry,a,b,cyan if lit else dim,display,.025)
text('Volume value','25',-.10,-1.24,1.036,.75,cyan,display,'CENTER')
text('Volume label','VOLUME',-.10,-1.78,1.036,.23,dim,display,'CENTER')
for col in range(29):
    x=-3.35+col*.25;amplitude=2+round(4*(math.sin(col*.42)**2))
    for row in range(7):
        box('Spectrum rectangular segment',(x,.60+row*.10,1.03),(.15,.035,.006),lime if row<amplitude else dim,display,.0)
for i,label in enumerate(['LOW','MID','HIGH']):
    y=.68-i*1.06
    arc('Band meter',5.83,y,.62,.37,math.pi*.2,math.pi*1.9,blue,display,.018)
    arc('Band level',5.83,y,.62,.37,math.pi*.2,math.pi*(.7+i*.28),cyan,display,.025)
    text('Band name',label,4.25,y-.08,1.036,.25,cyan,display)
    text('Band value',str([38,61,24][i]),6.78,y-.10,1.036,.31,lime,display,'RIGHT')
line('Trace baseline',[(-6.82,-2.23,1.035),(6.82,-2.23,1.035)],blue,display,.012)
text('Status footer','PLAYING   /   STEREO',-6.82,-2.48,1.037,.24,cyan,display)
text('Audio source','LOCAL AUDIO',6.82,-2.48,1.037,.24,amber,display,'RIGHT')

for x,labels in [(-8.32,['DISP','PLAY','NEXT']),(8.32,['OPEN','ANGLE','MUTE'])]:
    for i,label in enumerate(labels):
        y=3.03-i*2.28
        box(label+' recess',(x,y,.61),(1.02,.65,.15),polymer,body,.10)
        box(label+' key',(x,y,.72),(.89,.49,.14),bay,body,.08)
        text(label+' label',label,x,y-.07,.803,.17,lime,body,'CENTER')

# Direct linear volume. No rotary mesh or drag-angle mapping remains.
fader=empty('VolumeFader',(-1.7,-4.19,.84),body)
box('Fader black recess',(0,-4.18,.60),(8.0,.53,.11),polymer,body,.12)
box('Fader slide track',(0,-4.18,.67),(7.55,.09,.06),bay,body,.025)
box('Fader cap',(-1.7,-4.18,.81),(1.10,.68,.28),silver,fader,.12)
for i in range(5):box('Fader grip groove',(-1.90+i*.1,-4.18,.955),(.025,.34,.009),bay,fader,.006)
text('Volume minus','-',-4.48,-4.31,.65,.40,ink,body)
text('Volume plus','+',4.48,-4.31,.65,.35,ink,body)
text('Volume print','VOLUME',0,-4.73,.60,.19,ink,body,'CENTER')
for x,label in [(-6.40,'PLAY / PAUSE'),(6.40,'NEXT >')]:
    box(label+' bottom key',(x,-4.19,.65),(2.25,.76,.20),bay,body,.12)
    text(label+' bottom legend',label,x,-4.28,.766,.23,lime,body,'CENTER')

# Independent carriage, then damped hinge. No rotation until rail clearance.
def ease(t):
    t=max(0,min(1,t));return t*t*(3-2*t)
samples=[]
scene=bpy.context.scene;scene.frame_start=1;scene.frame_end=79;scene.render.fps=60
for frame in range(1,80):
    t=(frame-1)/60
    extension=1.4*ease((t-.10)/.27)
    angle=108*ease((t-.39)/.78)
    carriage.location.z=extension;hinge.rotation_euler.x=math.radians(angle)
    carriage.keyframe_insert(data_path='location',frame=frame)
    hinge.keyframe_insert(data_path='rotation_euler',frame=frame)
    bpy.context.view_layer.update()
    minimum=min((screen_back.matrix_world@Vector(corner)).z for corner in screen_back.bound_box)
    samples.append({'frame':frame,'seconds':t,'extension':extension,'angle':angle,'panelMinZ':minimum})
scene.frame_set(1)

# Convert display curves/text and apply edge modifiers before glTF export.
for obj in list(scene.objects):
    if obj.type in {'FONT','CURVE'}:
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
        bpy.ops.object.convert(target='MESH')
    if obj.type=='MESH':
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
        for modifier in list(obj.modifiers):bpy.ops.object.modifier_apply(modifier=modifier.name)

# Preserve hierarchy and consolidate display primitives by material.
for mat in [cyan,blue,lime,amber,dim]:
    group=[o for o in display.children if o.type=='MESH' and o.data.materials[0]==mat]
    if len(group)>1:
        bpy.ops.object.select_all(action='DESELECT')
        for obj in group:obj.select_set(True)
        bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join();bpy.context.object.name=mat.name+' artwork'

scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=.01
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(OUT/'wide-display-study.glb'),export_format='GLB',export_yup=False,export_apply=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_nla_strips_merged_animation_name='PanelOpen',export_force_sampling=True,export_frame_range=True,export_cameras=False,export_lights=False)
(OUT/'mechanism.json').write_text(json.dumps({'status':'Blender design study, not Sony engineering reconstruction or live audio UI','front':{'width':18,'height':10},'screen':{'width':14.48,'height':6.49},'samples':samples,'nodes':[o.name for o in scene.objects]},indent=2),encoding='utf8')

# Material study renders. Transparent backdrop sits on the portfolio black stock.
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
try:
    prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='OPTIX';prefs.get_devices()
    available=[d for d in prefs.devices if d.type=='OPTIX']
    if available:
        for d in prefs.devices:d.use=d.type=='OPTIX'
        scene.cycles.device='GPU'
except Exception:
    pass  # CPU rendering remains valid; no GPU performance claim.
scene.render.resolution_x=1920;scene.render.resolution_y=1280;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=True
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.13,.15,.17,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
scene.view_settings.view_transform='AgX'
def area(name,at,power,size,color,aim=(0,0,0),shape='DISK',size_y=None):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape=shape;data.size=size;data.color=color
    if size_y and shape=='RECTANGLE':data.size_y=size_y
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.location=at;o.rotation_euler=(Vector(aim)-o.location).to_track_quat('-Z','Y').to_euler()
area('Large left softbox',(-9,10,15),5200,11,(1,.91,.76))
area('Right strip',(12,1,10),2800,3,(.68,.83,1),shape='RECTANGLE',size_y=12)
area('Lower soft fill',(-1,-10,10),1400,8,(.84,.91,1))
data=bpy.data.cameras.new('Front review camera');camera=bpy.data.objects.new('Front review camera',data);bpy.context.collection.objects.link(camera)
data.type='ORTHO';data.ortho_scale=21;camera.location=(0,0,38);camera.rotation_euler=(Vector((0,0,0))-camera.location).to_track_quat('-Z','Y').to_euler();scene.camera=camera
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'wide-display-rig-v02.blend'))
if '--no-render' not in sys.argv:
    for frame,name in [(1,'01-front'),(23,'02-extended'),(49,'03-turning'),(79,'04-open')]:
        scene.frame_set(frame);scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
    camera.location=(19,7,29)
    forward=(Vector((0,-.5,1.5))-camera.location).normalized();right=forward.cross(Vector((0,1,0))).normalized();up=right.cross(forward)
    camera.rotation_euler=Matrix((right,up,-forward)).transposed().to_euler();data.ortho_scale=24
    scene.render.filepath=str(OUT/'05-hinge-inspection.png');bpy.ops.render.render(write_still=True)
print('WIDE_STUDY_COMPLETE '+str(OUT))
