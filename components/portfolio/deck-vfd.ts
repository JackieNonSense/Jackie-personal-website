/** Period-style VFD artwork. All meters are driven by the shared audio analyser. */
import type {DisplayMotion} from './deck-display-motion';
export type VfdState = { title:string; time:number; volume:number; track:number; status:string; lit:number; alternate:boolean; levels:number[]; motion?:DisplayMotion };
const patterns = ['abcdef','bc','abged','abgcd','fgbc','afgcd','afgecd','abc','abcdefg','abfgcd'];
const segments:Record<string,number[]>={a:[5,0,25,0],b:[29,4,29,23],c:[29,31,29,50],d:[5,54,25,54],e:[1,31,1,50],f:[1,4,1,23],g:[5,27,25,27]};
// Five-column character generator, rather than a smooth contemporary UI font.
const glyphs:Record<string,number[]>={A:[14,17,17,31,17,17,17],B:[30,17,17,30,17,17,30],C:[15,16,16,16,16,16,15],D:[30,17,17,17,17,17,30],E:[31,16,16,30,16,16,31],F:[31,16,16,30,16,16,16],G:[15,16,16,23,17,17,15],H:[17,17,17,31,17,17,17],I:[31,4,4,4,4,4,31],J:[7,2,2,2,18,18,12],K:[17,18,20,24,20,18,17],L:[16,16,16,16,16,16,31],M:[17,27,21,21,17,17,17],N:[17,25,25,21,19,19,17],O:[14,17,17,17,17,17,14],P:[30,17,17,30,16,16,16],Q:[14,17,17,17,21,18,13],R:[30,17,17,30,20,18,17],S:[15,16,16,14,1,1,30],T:[31,4,4,4,4,4,4],U:[17,17,17,17,17,17,14],V:[17,17,17,17,17,10,4],W:[17,17,17,21,21,27,17],X:[17,17,10,4,10,17,17],Y:[17,17,10,4,4,4,4],Z:[31,1,2,4,8,16,31]};
function dotTitle(c:CanvasRenderingContext2D,text:string,x:number,y:number){
  c.save();c.fillStyle='#c9db6a';c.shadowColor='#b0da6638';c.shadowBlur=2;
  [...text.slice(0,28)].forEach((char,i)=>{const rows=glyphs[char];if(!rows)return;rows.forEach((row,j)=>{for(let k=0;k<5;k++)if(row&(1<<(4-k)))c.fillRect(x+i*18+k*3,y+j*3,2.2,2.2);});});c.restore();
}
function digits(c:CanvasRenderingContext2D,text:string,x:number,y:number,scale:number,color:string){
  c.save();c.translate(x,y);c.scale(scale,scale);c.lineWidth=2.5;c.lineCap='square';
  [...text].forEach((char,i)=>{if(char===':'){c.fillStyle=color;c.fillRect(i*39+10,15,3,4);c.fillRect(i*39+10,36,3,4);return;}
    for(const [key,[x1,y1,x2,y2]] of Object.entries(segments)){c.strokeStyle=patterns[Number(char)]?.includes(key)?color:'#10272e';c.beginPath();c.moveTo(i*39+x1,y1);c.lineTo(i*39+x2,y2);c.stroke();}
  });c.restore();
}
export function drawVfd(canvas:HTMLCanvasElement,s:VfdState){
  const c=canvas.getContext('2d');if(!c)return;c.setTransform(2,0,0,2,0,0);
  c.fillStyle='#02080c';c.fillRect(0,0,1024,416);
  const background=c.createLinearGradient(0,0,0,416);background.addColorStop(0,'#101b25');background.addColorStop(.3,'#041019');background.addColorStop(1,'#010609');c.fillStyle=background;c.fillRect(0,0,1024,416);
  if(s.lit>.001){
    c.save();c.globalAlpha=s.lit;
    const gain=s.motion?.levelGain??1;
    if(s.motion){c.beginPath();c.rect(0,0,1024,416*s.motion.reveal);c.clip();}
    const cyan='#55d9f7',blue='#277fea',lime='#bed557',amber='#e3b76b';
    const label=(text:string,x:number,y:number,color=cyan,size=14)=>{c.fillStyle=color;c.font=`${size>=24?'bold ':''}${size}px "Courier New",monospace`;c.fillText(text,x,y);};
    const line=(x:number,y:number,w:number,color:string)=>{c.fillStyle=color;c.fillRect(x,y,w,1);};
    label('OPTICAL SOUND SYSTEM',27,28,'#849aa7',13);label('MULTI CONTROL / DIGITAL AUDIO',636,28,'#849aa7',13);line(27,40,970,'#28404b');
    // Fixed printed legends and dormant electrodes remain visible behind lit segments.
    ['CD','STEREO','PCM','TRACK','S.A.'].forEach((name,i)=>{const y=67+i*40;c.strokeStyle=i===0?lime:'#1c6586';c.lineWidth=1.5;c.strokeRect(28,y,111,26);label(name,38,y+19,i===0?lime:cyan,17);});
    label('SOURCE',29,288,amber,12);label('OPTICAL',29,310,lime,15);label('44.1 kHz',29,334,'#5b8494',14);
    line(163,58,1,'#2b4c58');c.fillStyle='#16333f';c.fillRect(164,58,1,288);
    c.save();c.globalAlpha*=s.motion?.titleAlpha??1;
    dotTitle(c,s.title.toUpperCase(),190+(s.motion?.titleOffset??0),63);c.restore();
    label(s.status==='playing'?'PLAY  ▶':s.status==='switching'?'DISC CHANGE':s.status==='loading'?'READING DISC':s.status==='error'?'READ ERROR':'PAUSE  II',190,112,amber,14);
    // A shallow fan of segmented electrodes, like a late-90s spectrum analyser.
    const cx=463,cy=352,inner=122;
    for(let i=0;i<44;i++){
      const a=Math.PI+(i/43)*Math.PI;
      const value=(s.levels[Math.floor(i/44*s.levels.length)]??0)*gain;
      for(let band=0;band<8;band++){
        const r=inner+band*12,lit=band<value;
        c.strokeStyle=lit?(band>6?lime:band>3?cyan:blue):(band>3?'#103447':'#102636');c.lineWidth=5;
        c.beginPath();c.arc(cx,cy,r,a+.005,a+.042);c.stroke();
      }
      if(i%3===0){c.strokeStyle='#3285ab';c.lineWidth=1.5;c.beginPath();c.moveTo(cx+227*Math.cos(a),cy+227*Math.sin(a));c.lineTo(cx+233*Math.cos(a),cy+233*Math.sin(a));c.stroke();}
    }
    c.strokeStyle='#238abb';c.lineWidth=1.5;c.beginPath();c.arc(cx,cy,112,Math.PI,2*Math.PI);c.stroke();
    const t=Math.floor(s.time);digits(c,`${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`,360,283,1.06,cyan);
    label(s.alternate?'OPTICAL / PCM':'ELAPSED TIME',409,371,'#73abc1',12);
    if(s.alternate){c.fillStyle='#030c13';c.fillRect(228,151,468,110);label('DIGITAL AUDIO',255,186,cyan,30);label('44.1 kHz / STEREO',255,221,lime,24);label('DIRECT SIGNAL PATH',255,245,'#688796',13);}
    // Secondary displays use different segment heights, as discrete VFD modules did.
    label('TRACK',774,77,amber,14);digits(c,String(s.track).padStart(2,'0'),858,57,.75,cyan);
    label('VOLUME',774,156,amber,14);digits(c,String(Math.round(s.volume*100)).padStart(2,'0'),858,135,.75,lime);
    for(let i=0;i<22;i++){c.fillStyle=i/22<s.volume?cyan:'#112934';c.fillRect(775+i*8,194,5,10);}
    label('SPECTRUM',774,241,'#73abc1',14);
    for(let i=0;i<16;i++){const value=(s.levels[i*2]??0)*gain;for(let j=0;j<9;j++){c.fillStyle=j<value?(j>6?amber:cyan):'#102832';c.fillRect(775+i*11,316-j*7,7,4);}}
    label('L',778,344,lime,12);label('R',927,344,lime,12);line(798,339,112,'#295c74');
    line(27,385,970,'#24404d');label('CD / MD',28,404,'#759797',12);label('FLUORESCENT DISPLAY',391,404,'#4e798b',12);label('DSP · WIDE BIT STREAM',791,404,'#859768',12);
    // Phosphor rows stay crisp; they are not a blur filter on the display.
    c.globalAlpha=s.lit*.18;c.fillStyle='#000';for(let y=0;y<416;y+=2)c.fillRect(0,y,1024,.4);
    c.restore();
  }
  // Restrained, slanted surface reflection; no washed-out white overlay.
  const reflection=c.createLinearGradient(0,0,370,416);reflection.addColorStop(0,'#aec7d212');reflection.addColorStop(.42,'#b1c3d106');reflection.addColorStop(.43,'#ffffff00');c.fillStyle=reflection;c.fillRect(0,0,1024,416);
}
