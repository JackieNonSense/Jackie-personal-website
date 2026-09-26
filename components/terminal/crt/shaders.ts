import { GLASS, SHELL } from './geometry';
import { RASTER_H, RASTER_W } from './raster';

const f = (v: number) => (Number.isInteger(v) ? v.toFixed(1) : String(v));

/** Texture v = 0 is the top row everywhere: raster, phosphor, bloom and probes. */
export const FULLSCREEN_VS = `#version 300 es
out vec2 vUv;
void main(){
  vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2))*2.-1.;
  vUv=p*.5+.5;
  gl_Position=vec4(p,0.,1.);
}`;

/**
 * Phosphor screen. The deflection squeezes the raster (power on/off), the beam
 * excites the coating in the colour the palette gives each index, and the coating
 * decays: a fast component for the image and a slow tail that leaves a faint ghost
 * behind moving text. Three outputs: the fast and slow components (fed back next
 * frame) and what the screen shows now.
 */
export const PHOSPHOR_FS = `#version 300 es
precision highp float;
uniform sampler2D uRaster, uFastPrev, uSlowPrev, uPalette;
uniform vec2 uDeflect;
uniform float uGain, uDt, uDot, uEmit, uJitter, uFrame, uBright, uFastTau, uSlowTau, uTail;
uniform vec3 uDotColor;
in vec2 vUv;
layout(location=0) out vec4 oFast;
layout(location=1) out vec4 oSlow;
layout(location=2) out vec4 oLit;
float hash(float n){return fract(sin(n)*43758.5453);}
// Takes 'amount' off the strongest channel and the others in proportion: the hue holds as it fades.
vec3 fall(vec3 v,float amount){float m=max(max(v.r,v.g),v.b);return max(v-amount*v/max(m,1e-4),0.);}
void main(){
  const vec2 size=vec2(${f(RASTER_W)},${f(RASTER_H)});
  vec2 c=vUv-.5;
  float line=floor(vUv.y*size.y);
  vec2 src=c/max(uDeflect,vec2(1e-4))+.5;
  src.x+=uJitter*(hash(line*1.37+uFrame*.618)-.5)/size.x;
  vec3 e=vec3(0.);
  if(uEmit>0.&&src.x>=0.&&src.x<1.&&src.y>=0.&&src.y<1.){
    int index=int(texture(uRaster,src).r*255.+.5);
    e=texelFetch(uPalette,ivec2(index,0),0).rgb*uGain*uBright;
  }
  vec2 d=c*size;
  e+=uDotColor*uDot*exp(-dot(d,d)/5.);
  vec3 fast=max(e,fall(texture(uFastPrev,vUv).rgb*exp(-uDt/uFastTau),uDt*.02));
  // The tail integrates what the beam painted: steady text builds a ghost, flicker averages away.
  vec3 slow=fall(mix(e,texture(uSlowPrev,vUv).rgb,exp(-uDt/uSlowTau)),uDt*.02);
  oFast=vec4(fast,1.);
  oSlow=vec4(slow,1.);
  oLit=vec4(fast+uTail*slow,1.);
}`;

/** Dual-filter downsample. */
export const DOWN_FS = `#version 300 es
precision highp float;
uniform sampler2D uSrc;
uniform vec2 uTexel;
in vec2 vUv; out vec4 o;
vec3 val(vec2 uv){return texture(uSrc,uv).rgb;}
void main(){
  vec2 h=uTexel;
  vec3 s=val(vUv)*4.+val(vUv-h)+val(vUv+h)+val(vUv+vec2(h.x,-h.y))+val(vUv-vec2(h.x,-h.y));
  o=vec4(s/8.,1.);
}`;

export const UP_FS = `#version 300 es
precision highp float;
uniform sampler2D uSrc, uBase;
uniform vec2 uTexel;
uniform float uBaseWeight;
in vec2 vUv; out vec4 o;
vec3 t(vec2 d){return texture(uSrc,vUv+d*uTexel).rgb;}
void main(){
  vec3 s=t(vec2(-2.,0.))+t(vec2(2.,0.))+t(vec2(0.,-2.))+t(vec2(0.,2.))
    +2.*(t(vec2(-1.,1.))+t(vec2(1.,1.))+t(vec2(1.,-1.))+t(vec2(-1.,-1.)));
  o=vec4(s/12.+texture(uBase,vUv).rgb*uBaseWeight,1.);
}`;

/** 8 x 5 light probes over the raster, plus the whole-screen average in texel (8, 0). */
export const PROBE_FS = `#version 300 es
precision highp float;
uniform sampler2D uSrc;
out vec4 o;
void main(){
  ivec2 p=ivec2(gl_FragCoord.xy);
  vec3 s=vec3(0.);
  if(p.x<8){
    for(int j=0;j<5;j++)for(int i=0;i<5;i++)s+=texelFetch(uSrc,ivec2(p.x*5+i,p.y*5+j),0).rgb;
    s/=25.;
  }else{
    for(int j=0;j<25;j++)for(int i=0;i<40;i++)s+=texelFetch(uSrc,ivec2(i,j),0).rgb;
    s/=1000.;
  }
  o=vec4(s,1.);
}`;

/**
 * The room. Everything is lit twice: once by the photograph's own dim studio light,
 * and once by the tube itself: the 40 probes act as an area light on the relief of
 * the bezel and on the tabletop, which also carries a soft reflection of the set.
 * The light is whatever colour the screen is showing.
 */
export const COMPOSITE_FS = `#version 300 es
precision highp float;
uniform sampler2D uShell, uNormal, uOcc, uPhos, uHalo, uNear, uProbe;
uniform vec2 uResolution, uOrigin;
uniform float uScale, uTime, uFocus, uEmit, uFlicker, uStill, uSpill, uAmbient, uExposure, uLineContrast;
uniform float uMono, uConverge, uWobble, uPurity, uDepthA, uDepthB;
uniform vec3 uCore, uBaseGlow;
uniform vec4 uPressA, uPressB;
out vec4 o;

const vec2 IMG=vec2(${f(SHELL.width)},${f(SHELL.height)});
const vec2 GC=vec2(${f(GLASS.cx)},${f(GLASS.cy)});
const vec2 GR=vec2(${f(GLASS.rx)},${f(GLASS.ry)});
const float GN=${f(GLASS.n)};
const float OVERSCAN=${f(GLASS.overscan)};
const float CURVE=${f(GLASS.curvature)};
const float FLOOR_Y=${f(SHELL.floor)};
const float HRANGE=${f(SHELL.heightRange)};
const vec2 SET_CENTER=vec2(${f(SHELL.bounds.x + SHELL.bounds.w / 2)},${f(SHELL.bounds.y + SHELL.bounds.h / 2)});
const float LINES=${f(RASTER_H)};
const float TX=1./${f(RASTER_W)};
const float PI=3.14159265;
const float PROBE_AREA=(2.*GR.x*OVERSCAN/8.)*(2.*GR.y*OVERSCAN/5.);

float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float glassRadius(vec2 q){return pow(pow(abs(q.x),GN)+pow(abs(q.y),GN),1./GN);}
vec2 rasterUV(vec2 q){return q*(1.+CURVE*dot(q,q))/OVERSCAN*.5+.5;}
vec2 probePos(int i,int j){return GC+GR*OVERSCAN*(vec2((float(i)+.5)/4.,(float(j)+.5)/2.5)-1.);}
float drive(vec3 v){return max(max(v.r,v.g),v.b);}

vec3 tap(vec2 uv){return texture(uPhos,uv).rgb*.5+(texture(uPhos,uv+vec2(TX*.55,0.)).rgb+texture(uPhos,uv-vec2(TX*.55,0.)).rgb)*.25;}
// A colour tube's three beams never quite meet: red and blue drift apart toward the sides.
vec3 phos(vec2 uv){
  vec3 c=tap(uv);
  if(uConverge>0.){
    float off=uConverge*(uv.x-.5)*2.*TX;
    c.r=tap(uv+vec2(off,0.)).r;
    c.b=tap(uv-vec2(off,0.)).b;
  }
  return c;
}

// Each scanline is a gaussian beam; brighter lines bloom wider, as a real spot does.
vec3 beam(vec2 uv){
  float y=uv.y*LINES-.5,y0=floor(y),fy=y-y0;
  vec3 s=vec3(0.);
  for(int i=-1;i<=2;i++){
    float row=y0+float(i);
    if(row<0.||row>=LINES)continue;
    vec3 v=phos(vec2(uv.x,(row+.5)/LINES));
    float sigma=mix(.29,.44,clamp(drive(v),0.,1.))+uFocus;
    float dy=fy-float(i);
    s+=v*exp(-dy*dy/(2.*sigma*sigma))/(sigma*2.5066);
  }
  return s;
}

// Turns a colour about the grey axis: the blotches of a magnetised shadow mask.
vec3 hueTurn(vec3 c,float a){
  const vec3 k=vec3(.57735);
  float co=cos(a),si=sin(a);
  return max(c*co+cross(k,c)*si+k*dot(k,c)*(1.-co),0.);
}

vec3 emission(vec2 img,float radius,vec2 fc){
  vec2 q=(img-GC)/GR;
  vec2 uv=rasterUV(q);
  // Degaussing: the field swings and the picture swims with it.
  uv+=uWobble*vec2(.006*sin(uv.y*7.+uTime*38.),.004*sin(uv.x*5.-uTime*31.));
  vec2 edge=smoothstep(0.,.003,uv)*smoothstep(0.,.003,1.-uv);
  float inRaster=edge.x*edge.y;
  vec3 v=inRaster>0.?beam(uv):vec3(0.);
  // A driven raster is never quite black: the swept lines glow faintly.
  float lines=.5+.5*cos(uv.y*LINES*6.2831853)*uLineContrast;
  v+=uBaseGlow*uEmit*inRaster*.006*(.55+.45*lines);
  float hum=1.+(1.-uStill)*.045*pow(.5+.5*sin(uv.y*4.4-uTime*.62),24.);
  float grain=hash(fc+fract(uTime*7.31)*97.)-.5;
  v*=hum*uFlicker*(1.+grain*.09*(1.-.6*uStill))*(1.-.25*uWobble);
  vec2 outside=max(abs(uv-.5)-.5,0.);
  vec3 halo=texture(uHalo,clamp(uv,0.,1.)).rgb*.25*exp(-dot(outside,outside)*9000.);
  float vignette=1.-.42*pow(radius,9.);
  // An overdriven spot runs toward white: toward the phosphor's own core on a monochrome tube.
  float dv=drive(v);
  vec3 hot=uMono>.5?uCore:mix(v/max(dv,1e-4),vec3(1.),.6);
  vec3 core=v+hot*max(dv-.9,0.)*.5;
  if(uPurity>0.)core=hueTurn(core,uPurity*2.4*sin(dot(q,vec2(3.1,2.3))+uTime*5.));
  return (core*.62+halo*.3)*vignette;
}

vec3 shellColor(vec2 img,vec2 tuv,vec3 photo,float glassMask){
  vec3 n=normalize(texture(uNormal,tuv).rgb*2.-1.);
  vec3 occ=texture(uOcc,tuv).rgb;
  float luma=dot(photo,vec3(.2126,.7152,.0722));
  vec3 base=mix(vec3(luma),photo,.4)*uAmbient*mix(.55,1.,occ.r);
  if(glassMask>.999)return base;
  vec3 P=vec3(img,occ.b*HRANGE);
  vec3 E=vec3(0.),S=vec3(0.);
  for(int j=0;j<5;j++)for(int i=0;i<8;i++){
    vec3 L=texelFetch(uProbe,ivec2(i,j),0).rgb;
    vec3 l=vec3(probePos(i,j),6.)-P;
    float d2=dot(l,l)+400.;
    vec3 ld=l*inversesqrt(d2);
    float ce=max(-ld.z,0.);
    E+=L*(max(dot(n,ld),0.)*ce/d2);
    S+=L*(ce/d2*pow(max(dot(n,normalize(ld+vec3(0.,0.,1.))),0.),36.));
  }
  E*=PROBE_AREA/PI;S*=PROBE_AREA/PI;
  // Near field: the patch of raster closest to this point dominates the recess wall.
  vec2 cq=clamp((img-GC)/(GR*OVERSCAN),-1.,1.);
  vec3 ln=vec3(GC+cq*GR*OVERSCAN,6.)-P;
  float dn=dot(ln,ln)+160.;
  vec3 lnd=ln*inversesqrt(dn);
  E+=texture(uNear,cq*.5+.5).rgb*(max(dot(n,lnd),0.)*max(-lnd.z,0.)*2400./(PI*dn));
  float kd=clamp(.1+luma*1.6,0.,.85);
  vec3 spill=(E*kd+S*.45)*uSpill*mix(.35,1.,occ.r);
  return base+spill*(1.-glassMask);
}

vec3 room(vec2 img,vec2 fc){
  vec3 avg=texelFetch(uProbe,ivec2(8,0),0).rgb;
  vec2 d=(img-SET_CENTER)/vec2(980.,640.);
  vec3 wall=vec3(.0014,.0019,.0021)+avg*.035*exp(-dot(d,d)*1.4);
  float below=img.y-FLOOR_Y;
  if(below<0.)return wall;
  // Tabletop in front of the set: depth grows quickly because it is seen obliquely.
  float depth=below*3.2;
  vec3 E=vec3(0.);
  for(int j=0;j<5;j++)for(int i=0;i<8;i++){
    vec3 L=texelFetch(uProbe,ivec2(i,j),0).rgb;
    vec2 sp=probePos(i,j);
    vec3 l=vec3(sp.x-img.x,FLOOR_Y-sp.y,-depth);
    float d2=dot(l,l)+900.;
    E+=L*(depth*l.y/(d2*d2));
  }
  E*=PROBE_AREA/PI;
  vec3 top=vec3(.0024,.003,.0032)*(1.-.35*smoothstep(0.,420.,below));
  top+=E*.07*uSpill;
  float under=smoothstep(34.,0.,below)*smoothstep(720.,600.,abs(img.x-SET_CENTER.x));
  top*=1.-.75*under;
  // Glossy, blurred reflection of the set; the blur grows with distance from the feet.
  vec2 m=vec2(img.x,2.*FLOOR_Y-img.y);
  vec2 mt=m/IMG;
  float fall=exp(-below/150.);
  vec4 s=textureLod(uShell,clamp(mt,0.,1.),1.5+below/40.);
  float inside=step(0.,mt.y)*step(mt.x,1.)*step(0.,mt.x);
  top+=s.rgb*s.a*uAmbient*.22*fall*inside;
  vec2 q=(m-GC)/GR;
  float g=1.-smoothstep(.96,1.,glassRadius(q));
  // Only the glow survives a matte tabletop: sample the coarse level, never readable text.
  vec2 ruv=rasterUV(q);
  vec3 glow=vec3(0.);
  for(int k=0;k<9;k++){vec2 o=vec2(float(k%3)-1.,float(k/3)-1.)*vec2(.06,.1);glow+=texture(uNear,clamp(ruv+o,0.,1.)).rgb;}
  top+=glow/9.*.12*fall*g;
  // The edge of the tabletop catches a little light.
  top+=vec3(.004,.006,.006)*exp(-below*below/6.);
  return mix(wall,top,smoothstep(0.,2.,below));
}

// A button pushed into its well sits lower, in its own shadow: depth 1 is held down,
// about half is latched, as the selected one stays.
float press(vec2 img,vec4 r,float depth,inout vec2 simg){
  if(depth<=0.)return 0.;
  vec2 pr=(img-r.xy)/r.zw;
  if(pr.x<0.||pr.x>=1.||pr.y<0.||pr.y>=1.)return 0.;
  simg.y-=2.4*depth;
  return pr.y*r.w<3.*depth?depth*2.4:depth;
}

void main(){
  vec2 fc=vec2(gl_FragCoord.x,uResolution.y-gl_FragCoord.y);
  vec2 img=(fc-uOrigin)/uScale;
  vec2 simg=img;
  float pressed=press(img,uPressA,uDepthA,simg)+press(img,uPressB,uDepthB,simg);
  vec2 tuv=simg/IMG;
  float radius=glassRadius((img-GC)/GR);
  float aa=fwidth(radius)*1.5+.002;
  float glassMask=1.-smoothstep(.996-aa,.996,radius);
  vec4 sh=texture(uShell,clamp(tuv,0.,1.));
  float onSet=step(0.,tuv.x)*step(tuv.x,1.)*step(0.,tuv.y)*step(tuv.y,1.)*sh.a;
  vec3 col=room(img,fc);
  if(onSet>.002){
    vec3 c=shellColor(simg,tuv,sh.rgb,glassMask);
    c*=1.-min(.7,.36*pressed);
    if(glassMask>0.)c+=emission(img,radius,fc)*glassMask;
    col=mix(col,c,onSet);
  }
  vec2 v=fc/uResolution-.5;
  col*=1.-.5*smoothstep(.2,.8,length(v*vec2(1.,.85)));
  col=1.-exp(-col*uExposure);
  vec3 srgb=pow(col,vec3(1./2.2));
  srgb+=(hash(fc+fract(uTime*23.)*131.)-.5)*.016+(hash(fc*1.7+3.1)-.5)/255.;
  o=vec4(srgb,1.);
}`;
