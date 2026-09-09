"""Corrected motorized display: stowed horizontal -> extracted -> upright.
Independent Blender source. No production audio/UI is baked into the mesh.
"""
import bpy, math, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'app/reference/production/cd-deck-v09-edgy';OUT.mkdir(parents=True,exist_ok=True)
PUBLIC=ROOT/'public/portfolio'
PANEL=json.loads((ROOT/'components/portfolio/deck-panel.json').read_text(encoding='utf8'))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(name,color,metal=0,rough=.4,emit=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if emit:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emit
 return m
alloy=mat('DarkAnodized',(.035,.047,.054),.78,.4);chrome=mat('NarrowChrome',(.46,.47,.43),.88,.29);black=mat('Graphite',(.008,.014,.016),.15,.38);rubber=mat('Gasket',(.004,.006,.007),0,.65);lime=mat('KeyLight',(.44,.75,.04),0,.4,.65);dark=mat('DarkGlass',(.002,.009,.012),.1,.16)
cobalt=mat('CobaltEnamel',(.009,.035,.25),.45,.37);silver=mat('TitaniumPaddle',(.27,.29,.27),.82,.34);seam=mat('SeamLight',(.025,.1,.55),.15,.4,.1)
def empty(name,at=(0,0,0),parent=None):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;o.location=at;return o
def legend(name,text,at,size,material,parent):
 bpy.ops.object.text_add();o=bpy.context.object;o.name=name;o.data.body=text;o.data.align_x='CENTER';o.data.size=size;o.data.space_character=1.15;o.data.extrude=.0008;o.data.materials.append(material);o.parent=parent;o.location=at;bpy.ops.object.convert(target='MESH');return bpy.context.object
def box(name,at,size,material,parent=None,bevel=.06):
 bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.parent=parent;o.location=at;o.data.materials.append(material)
 if bevel:
  b=o.modifiers.new('Machined radius','BEVEL');b.width=bevel;b.segments=5;b.harden_normals=True;n=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');n.keep_sharp=True
 return o

def plate(name,points,z,depth,material,parent,bevel=.05):
 # A real extruded, bevelled silhouette, not a texture over a rectangular box.
 if sum(points[i][0]*points[(i+1)%len(points)][1]-points[(i+1)%len(points)][0]*points[i][1] for i in range(len(points)))<0:points=list(reversed(points))
 n=len(points);verts=[(x,y,z+d) for d in [-depth/2,depth/2] for x,y in points]
 faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();uv=mesh.uv_layers.new(name='SurfaceUV')
 xmin=min(x for x,y in points);ymin=min(y for x,y in points);w=max(x for x,y in points)-xmin;h=max(y for x,y in points)-ymin
 for poly in mesh.polygons:
  for j in poly.loop_indices:
   x,y,_=mesh.vertices[mesh.loops[j].vertex_index].co;uv.data[j].uv=((x-xmin)/w,(y-ymin)/h)
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.parent=parent;o.data.materials.append(material)
 if bevel:
  b=o.modifiers.new('Cut edge radii','BEVEL');b.width=bevel;b.segments=5;b.harden_normals=True;n=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');n.keep_sharp=True
 return o

def edge(name,a,b,z,width,material,parent):
 x,y=(a[0]+b[0])/2,(a[1]+b[1])/2;o=box(name,(x,y,z),(math.dist(a,b),width,.025),material,parent,.006);o.rotation_euler.z=math.atan2(b[1]-a[1],b[0]-a[0]);return o

def paddle(w,h,s):return [(-w/2-s,-h/2),(w/2-s,-h/2),(w/2+s,h/2),(-w/2+s,h/2)]
def outline(w,h,r):
 p=[]
 for x,y,a in [(w/2-r,h/2-r,0),(-w/2+r,h/2-r,90),(-w/2+r,-h/2+r,180),(w/2-r,-h/2+r,270)]:
  for i in range(17):
   t=math.radians(a+i*90/16);p.append((x+r*math.cos(t),y+r*math.sin(t)))
 return p
def ring(name,profiles,material,parent):
 loops=[[(x,y+3.45,z) for x,y in outline(w,h,r)] for w,h,r,z in profiles];n=len(loops[0]);faces=[]
 for k in range(len(loops)-1):
  for i in range(n):faces.append((k*n+i,k*n+(i+1)%n,(k+1)*n+(i+1)%n,(k+1)*n+i))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata([p for loop in loops for p in loop],[],faces);mesh.update()
 uv=mesh.uv_layers.new(name='SatinUV')
 for poly in mesh.polygons:
  for j in poly.loop_indices:
   x,y,_=mesh.vertices[mesh.loops[j].vertex_index].co;uv.data[j].uv=(x/18+.5,y/9)
 for p in mesh.polygons:p.use_smooth=True
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.parent=parent;o.data.materials.append(material);return o
base=empty('Base');carriage=empty('ScreenCarriage',(PANEL['screenX'],0,-7));hinge=empty('ScreenHinge',(0,-2.8,0),carriage)
bottom=[(-8.9,-7.6),(-5.25,-7.6),(-3.9,-8.3),(7.7,-8.3),(8.9,-7.48)]
for a,b in zip(bottom,bottom[1:]):
 o=box('FoldedLowerShell',((a[0]+b[0])/2,(a[1]+b[1])/2,-3.6),(math.dist(a,b),.14,9.1),black,base,.035);o.rotation_euler.z=math.atan2(b[1]-a[1],b[0]-a[0])
box('BaseRoof',(0,-2.35,-3.6),(18,.18,9.1),black,base)
plate('BaseRear',[(-8.9,-2.35),(8.9,-2.35)]+list(reversed(bottom)),-8.1,.20,black,base)
for sign in [-1,1]:
 low=-7.6 if sign<0 else -7.48
 box('BaseCheek',(sign*8.8,(low-2.35)/2,-3.6),(.30,-2.35-low,9.1),black,base,.05)
 box('GuideTrack',(PANEL['screenX']+sign*7.0,-2.95,-3.4),(.2,.14,9.0),black,base,.02)
 box('SlidingGuide',(sign*7.0,-2.95,-3.6),(.13,.1,7.5),chrome,carriage,.02)
 bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=.16,depth=.40);p=bpy.context.object;p.name='DisplayAxle';p.parent=hinge;p.location=(sign*7.05,0,0);p.rotation_euler.y=math.pi/2;p.data.materials.append(chrome)
profile=[(-8.9,-3.05),(6.9,-3.05),(8.9,-4.05),(8.9,-7.48),(7.7,-8.30),(-3.9,-8.30),(-5.25,-7.6),(-8.9,-7.6)]
plate('FrontConsole',profile,1,.35,alloy,base,.07)
for a,b in zip(profile,profile[1:]+profile[:1]):edge('ExposedSilverEdge',a,b,1.18,.048,chrome,base)
plate('OffsetSpine',[(-8.72,-3.28),(-5.66,-3.28),(-5.82,-5.75),(-5.12,-7.37),(-8.72,-7.37)],1.20,.07,black,base)
plate('CobaltShoulder',[(7.77,-3.65),(8.67,-4.15),(8.67,-7.23),(7.58,-7.87),(7.06,-7.87)],1.23,.12,cobalt,base)
edge('CobaltWear',(8.65,-4.17),(8.65,-7.21),1.30,.045,chrome,base)
edge('PlaybackSeam',(-5.45,-5.7),(-1.53,-5.7),1.24,.044,seam,base)
box('ExtractionSlot',(0,-2.73,.90),(17.35,.52,.05),rubber,base,.05)
box('SlotTopLip',(-.32,-2.40,1.01),(17.1,.075,.10),chrome,base,.02)
edge('OffsetRule',(-4.53,-6.14),(7.33,-6.14),1.22,.025,chrome,base)
# Short machining marks belong to the casing, not invented serial numbers.
for i in range(3):edge('CobaltCut',(-8.0+i*.22,-6.40),(-7.7+i*.22,-6.05),1.26,.047,cobalt,base)
legend('CaseEtching','OPTICAL',(-6.73,-7.07,1.25),.13,chrome,base)
for i,(x,y) in enumerate([(-8.45,-3.36),(8.33,-7.14),(-4.64,-7.89)]):
 bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=.095,depth=.045);p=bpy.context.object;p.name='RecessedFastener';p.parent=base;p.location=(x,y,1.2);p.data.materials.append(black)
 edge('FastenerSlot',(x-.057,y-.018),(x+.057,y+.018),1.229,.018,chrome,base)
for item in PANEL['keys']:
 x,y,name=item['x'],item['y'],item['node']
 w,h,s=item['width'],item['height'],item['skew']
 plate(name+'Seat',[(xx+x,yy+y) for xx,yy in paddle(w+.19,h+.19,s)],1.25,.13,rubber,base,.06)
 key=plate(name,paddle(w,h,s),0,.24,silver if name=='PlayKey' else black,base,.065);key.location=(x,y,1.42)
 edge(name+'Lip',(-w/2+s+.12,h/2-.045),(w/2+s-.12,h/2-.045),.12,.025,chrome,key)
 box(name+'Light',(0,h/2-.19,.135),(min(1.3,w-.5),.032,.015),lime,key,.005)
v=PANEL['volume'];fader=empty('VolumeFader',(v['x']-v['travel']/4,v['y'],1.4),base)
box('FaderTrack',(v['x'],v['y'],1.24),(v['width'],.28,.08),rubber,base,.07)
box('FaderCap',(0,0,0),(1.0,.76,.24),chrome,fader,.09)
for i in range(6):box('FaderGrip',(-.275+i*.11,0,.13),(.018,.43,.005),black,fader,.003)
for i in range(21):box('VolumeTick',(v['x']-v['travel']/2+i*v['travel']/20,-6.67,1.2),(.017,.17 if i%5==0 else .08,.005),chrome,base,.003)
box('DisplayBack',(0,3.45,-.03),(15.7,7.0,.23),black,hinge,.10)
ring('DisplayBezel',[(15.72,7.02,.25,-.04),(15.76,7.06,.28,.05),(15.70,7.0,.30,.16),(15.56,6.86,.31,.20),(14.64,6.1,.29,.20),(14.48,5.94,.28,.14)],alloy,hinge)
ring('GlassEdgeCatch',[(15.73,7.03,.29,.12),(15.67,6.97,.30,.16)],chrome,hinge)
plate('DisplayOffsetCheek',[(7.78,.22),(8.85,1.12),(8.85,5.40),(7.78,6.72)],.01,.28,cobalt,hinge,.04)
edge('CheekEdge',(8.83,1.15),(8.83,5.38),.17,.035,chrome,hinge)
for i in range(4):edge('DisplayIndex',(8.04,1.54+i*.25),(8.42,1.54+i*.25),.17,.018,chrome,hinge)
ring('OpticalSeal',[(14.49,5.95,.28,.145),(14.40,5.86,.29,.185)],rubber,hinge)
pts=outline(14.40,5.86,.29);mesh=bpy.data.meshes.new('DisplaySurface');mesh.from_pydata([(x,y+3.45,.19) for x,y in pts],[],[tuple(range(len(pts)))]);mesh.update();uv=mesh.uv_layers.new(name='ScreenUV')
for poly in mesh.polygons:
 for j in poly.loop_indices:
  x,y,_=mesh.vertices[mesh.loops[j].vertex_index].co;uv.data[j].uv=(x/14.40+.5,(y-3.45)/5.86+.5)
surface=bpy.data.objects.new('DisplaySurface',mesh);bpy.context.collection.objects.link(surface);surface.parent=hinge;surface.data.materials.append(dark)
scene=bpy.context.scene;scene.frame_start=1;scene.frame_end=97;scene.render.fps=60
def smooth(t):
 t=max(0,min(1,t));return t*t*(3-2*t)
samples=[]
for frame in range(1,98):
 t=(frame-1)/60;z=-7+8.5*smooth((t-.08)/.60);angle=90*(1-smooth((t-.72)/.68));carriage.location.z=z;hinge.rotation_euler.x=math.radians(angle)
 carriage.keyframe_insert(data_path='location',frame=frame);hinge.keyframe_insert(data_path='rotation_euler',frame=frame);samples.append({'frame':frame,'z':z,'angle':angle})
scene.frame_set(1)
for o in list(scene.objects):
 if o.type=='MESH':
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
  for m in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=m.name)
scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=.01
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'edgy-master-v03.blend'))
bpy.ops.export_scene.gltf(filepath=str(PUBLIC/'deploy-deck-v03.glb'),export_format='GLB',export_yup=False,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_nla_strips_merged_animation_name='DeployScreen',export_force_sampling=True,export_frame_range=True,export_cameras=False,export_lights=False)
(OUT/'mechanism.json').write_text(json.dumps({'samples':samples,'nodes':[o.name for o in scene.objects],'panel':PANEL},indent=2),encoding='utf8')
print('DEPLOY_EXPORT_COMPLETE')
