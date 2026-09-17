import { PlaneGeometry } from 'three';

export const CRT_PHOSPHOR = {scanDepth:.24,core:.98,nearHalo:.42,farHalo:.2,nearRadius:2.2,farRadius:6.5} as const;

export function createCrtGlass() {
  const glass = new PlaneGeometry(3.2, 1.9, 64, 40);
  const p = glass.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / 1.6, y = p.getY(i) / .95;
    p.setZ(i, .12 * (1 - .55 * x * x - .45 * y * y));
  }
  glass.computeVertexNormals();
  return glass;
}

export const crtVertex = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
void main(){
  vUv=uv;
  vec4 p=modelViewMatrix*vec4(position,1.);
  vPosition=p.xyz;
  vNormal=normalize(normalMatrix*normal);
  gl_Position=projectionMatrix*p;
}`;

export const crtFragment = `
uniform sampler2D uSignal;
uniform float uPower;
uniform float uIgnition;
uniform vec2 uPointer;
uniform vec2 uTextureSize;
uniform float uScanLines;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
float glyph(vec2 uv){return texture2D(uSignal,uv).a;}
void main(){
  vec2 p=vUv*2.-1.;
  vec2 uv=vUv;
  vec2 texel=1./uTextureSize;
  float core=glyph(uv);
  float nearGlow=(glyph(uv+texel*vec2(${CRT_PHOSPHOR.nearRadius},0.))+glyph(uv-texel*vec2(${CRT_PHOSPHOR.nearRadius},0.))+glyph(uv+texel*vec2(0.,${CRT_PHOSPHOR.nearRadius}))+glyph(uv-texel*vec2(0.,${CRT_PHOSPHOR.nearRadius})))*.25;
  float farGlow=(glyph(uv+texel*vec2(${CRT_PHOSPHOR.farRadius},0.))+glyph(uv-texel*vec2(${CRT_PHOSPHOR.farRadius},0.))+glyph(uv+texel*vec2(0.,${CRT_PHOSPHOR.farRadius}))+glyph(uv-texel*vec2(0.,${CRT_PHOSPHOR.farRadius})))*.25;
  // Static, sub-pixel phosphor structure; no travelling overlay or flashing noise.
  float scan=${1-CRT_PHOSPHOR.scanDepth}+${CRT_PHOSPHOR.scanDepth}*cos(uv.y*uScanLines*6.2831853);
  float edge=1.-.16*dot(p,p);
  float ink=(core*${CRT_PHOSPHOR.core}+nearGlow*${CRT_PHOSPHOR.nearHalo}+farGlow*${CRT_PHOSPHOR.farHalo})*uPower*scan*edge;
  float ignition=exp(-pow(p.y*95.,2.))*(1.-smoothstep(.55,.9,abs(p.x)))*uIgnition;
  vec3 n=normalize(vNormal), eye=normalize(-vPosition);
  vec3 reflected=reflect(-eye,n);
  // A small bounded reflection sits IN FRONT of the phosphor and follows the pointer.
  float softbox=exp(-pow((reflected.x+.48-uPointer.x*.055)*8.,2.)-pow((reflected.y-.63-uPointer.y*.025)*13.,2.));
  float reflection=softbox*uPower*.035;
  float rounded=1.-smoothstep(.0,.025,length(max(abs(p)-vec2(.91,.86),0.))-.09);
  float alpha=clamp(ink*1.12+ignition*.4+reflection,0.,.98)*rounded;
  vec3 tint=mix(vec3(.35,.83,.68),vec3(.85,1.,.88),clamp(core,0.,1.));
  gl_FragColor=vec4(tint,alpha);
}`;
