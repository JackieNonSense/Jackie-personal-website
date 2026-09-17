import { art, records, logs } from './echo-content';
import { objective, hints, linkPorts, type EchoState, type EchoAction, type EchoPage } from './echo-engine';
import { PROGRAMS, drawProgram, type ProgramId, type ProgramState, type ProgramAction } from './echo-programs';
import { rewardsForScores } from './echo-rewards';

export const SCREEN_W = 1600, SCREEN_H = 1000;
export const PROGRAM_RECT = { x: 315, y: 266, width: 945, height: 508 };
export type UIAction = { type: 'story'; action: EchoAction } | { type: 'program-select'; id: ProgramId } | { type: 'program-action'; action: ProgramAction } | { type: 'program-exit' } | { type: 'command-focus' } | { type:'reward-select';index:number };
export type Control = { id: string; label: string; rect: { x: number; y: number; w: number; h: number }; action: UIAction; disabled?: boolean; active?: boolean };
export type TerminalView = { title: string; subtitle: string; text: string[]; kind: 'boot'|'overview'|'text'|'list'|'map'|'signal'|'link'|'program'|'ending'; controls: Control[]; art?: string[] };
export const NAV: { id: EchoPage; label: string }[] = [
  {id:'overview',label:'DESK'}, {id:'mail',label:'MESSAGES'}, {id:'files',label:'ARCHIVE'}, {id:'logs',label:'EVENT LOG'},
  {id:'map',label:'LAB / MAP'}, {id:'signal',label:'SIGNAL'}, {id:'link',label:'PATCH BAY'}, {id:'programs',label:'PROGRAMS'}, {id:'journal',label:'FIELD NOTES'},
];
export const PALETTE = { bright:'#c2eee3', text:'#95cfc2', dim:'#5a948c', faint:'#315e5a', line:'#29514d', amber:'#d0b681', bg:'#020a0b' };
export function wrapText(text: string, columns: number): string[] {
  if (!text) return [''];
  const result: string[] = []; let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && line.length + word.length + 1 > columns) { result.push(line); line = ''; }
    let rest = word;
    while (rest.length > columns) { if(line){result.push(line);line='';} result.push(rest.slice(0,columns));rest=rest.slice(columns); }
    if (rest) line += (line ? ' ' : '') + rest;
  }
  if(line)result.push(line);
  return result;
}
export function hitControl(controls: Control[], x: number, y: number) {
  return [...controls].reverse().find(c => !c.disabled && x >= c.rect.x && x <= c.rect.x+c.rect.w && y >= c.rect.y && y <= c.rect.y+c.rect.h);
}
export function scrollLimit(s:EchoState,program:ProgramState|null,scores:Record<string,number>={},rewardIndex=-1):number{
  const view=terminalView(s,program,scores,rewardIndex);
  if(view.kind==='text')return Math.max(0,view.text.flatMap(p=>[...wrapText(p,55),'']).length-12);
  if(s.page==='logs')return Math.max(0,logs.length-6);
  if(s.page==='mail'||s.page==='files')return Math.max(0,records.filter(r=>r.kind===(s.page==='mail'?'mail':'file')).length-7);
  return 0;
}
const story = (action: EchoAction): UIAction => ({ type:'story', action });

export function terminalView(s: EchoState, program: ProgramState | null, scores:Record<string,number>={},rewardIndex=-1): TerminalView {
  const v: TerminalView = {title:'LOCAL RECOVERY',subtitle:'JR-NET / OFFLINE SESSION',text:[],kind:'overview',controls:[]};
  const add = (id: string,label: string,x: number,y: number,w: number,h: number,action: UIAction,disabled=false,active=false) => v.controls.push({id,label,rect:{x,y,w,h},action,disabled,active});
  if(!s.awake) {
    v.kind='boot';v.title='JR INDUSTRIES';v.subtitle='TERMLINK v1.25 / RECOVERY VOLUME 07';v.art=art.boot;
    v.text=['A signal remains.','Local archive recovered after the Lab 7 blackout.','A 10–15 minute investigation. Your progress is saved on this device.'];
    add('wake','[ ENTER / RESTORE SESSION ]',500,773,600,62,story({type:'wake'}));return v;
  }
  NAV.forEach((n,i)=>add(`nav-${n.id}`,`${String(i+1).padStart(2,'0')}  ${n.label}`,38,158+i*65,219,48,story({type:'navigate',page:n.id}),false,s.page===n.id));
  add('hint','REQUEST HINT',1328,704,230,48,story({type:'hint'}));
  add('command','> TYPE A COMMAND',310,930,940,43,{type:'command-focus'});
  if(s.fault) {
    v.kind='text';v.title='MODULE FAULT';v.subtitle='LOCAL FAILURE / ARCHIVE INTACT';v.text=[s.fault,'No evidence has been lost. Reset this module to try again.'];
    add('reset-module','RESET MODULE',335,674,470,58,story({type:'reset-module'}));return v;
  }
  if(s.pendingEnding) {
    v.kind='text';v.title=s.destination==='isolate'?'AUTHORIZE ISOLATION':'AUTHORIZE UPLINK';v.subtitle='FINAL OPERATION / MANUAL CONFIRMATION';
    v.text=s.destination==='isolate'?['The sealed local archive will remain available.','The Lab 7 relay will be severed. Any active presence on that branch will lose its route out.','The last voice is asking you to wait. You cannot verify who is speaking.']:['The uplink will reconnect Lab 7 to JR-NET.','The archive can leave this terminal. So can anything still active in its transport layer.','The voice says it can bring everyone back. The read-only diagnostics cannot confirm this.'];
    add('confirm-ending','EXECUTE '+s.destination.toUpperCase(),335,740,470,60,story({type:'confirm-ending'}));
    add('cancel-ending','RETURN TO PATCH BAY',835,740,408,60,story({type:'cancel-ending'}));return v;
  }
  const reward=rewardsForScores(scores)[rewardIndex];
  if(reward&&s.page==='programs'){
    v.kind='text';v.title=reward.title;v.subtitle='OPTIONAL RECOVERY / RECREATION VOLUME';v.text=[...reward.art,'',...reward.body];
    add('reward-back','BACK TO PROGRAMS',335,797,410,52,{type:'reward-select',index:-1});add('reward-up','PAGE UP',775,797,215,52,story({type:'scroll',delta:-10}));add('reward-down','PAGE DOWN',1010,797,215,52,story({type:'scroll',delta:10}));return v;
  }
  if(s.evidence.includes('clearance')&&s.feedback.startsWith('LEVEL 5')){
    v.kind='ending';v.title='ACCESS GRANTED';v.subtitle='JR-NET / LOCAL CREDENTIAL VERIFIED';v.art=art.welcome;v.text=['Welcome back, Employee 777.','The classified volume is open. Read it before deciding where the recovered signal should go.'];
    add('classified-open','OPEN CLASSIFIED.DOC',335,797,470,52,story({type:'open',id:'f03'}));add('clearance-continue','RETURN TO PATCH BAY',835,797,408,52,story({type:'navigate',page:'link'}));return v;
  }
  if(s.ending && s.page==='overview') {
    v.kind='ending';v.title=s.ending==='isolate'?'THE LAST LOCAL SIGNAL':'WE ARE STILL HERE';v.subtitle='CHAPTER 01 / '+(s.ending==='isolate'?'ISOLATED':'LINK RESTORED');v.art=art[s.ending];
    v.text=s.ending==='isolate'?['The line goes quiet. The archive survives.','For the first time, the terminal answers only when you ask.','Employee 777 is still listed as missing. Somewhere in the recovered records, a final address remains.']:['JR-NET reports a successful recovery.','A second terminal acknowledges. Then a third.','The reply arrives before you finish typing: WELCOME BACK.'];
    add('ending-archive','REVISIT THE ARCHIVE',335,797,470,52,story({type:'navigate',page:'files'}));add('ending-programs','OPEN PROGRAMS',835,797,408,52,story({type:'navigate',page:'programs'}));return v;
  }
  if(s.openId) {
    const r=records.find(r=>r.id===s.openId);
    v.kind='text';v.title=r?.title||'ARCHIVE RECORD';v.subtitle=`${r?.from||'LOCAL STORAGE'} / ${r?.date||'1981-03-23'}`;
    v.text=r?.body||['Record unavailable.'];
    const restricted = (r?.requires||0)>s.stage || (r?.id==='f03'&&!s.evidence.includes('clearance'));
    if(restricted)v.text=['[ ACCESS DENIED ]',r?.id==='f03'?'Restore the signal module, then use the maintenance password.':'This record is on an offline volume. Continue the recovery investigation.'];
    add('record-back','< BACK',310,797,190,49,story({type:'back'}));add('page-up','PAGE UP',774,797,218,49,story({type:'scroll',delta:-10}));add('page-down','PAGE DOWN',1012,797,231,49,story({type:'scroll',delta:10}));
    if(r?.id==='f03' && s.stage>=2 && restricted)add('unlock-file','ENTER MAINTENANCE PASSWORD',335,650,865,55,{type:'command-focus'});
    return v;
  }
  switch(s.page) {
    case 'overview':
      v.title='AFTER THE BLACKOUT';v.subtitle='23 MAR 1981 / TERMINAL 07';v.text=['The last evacuation order never reached its destination.','You are inside Employee 777’s abandoned recovery session. The network is down. The local archive is still warm.','Recover what happened in Lab 7. Decide what should leave this machine.'];
      add('begin','OPEN SECURITY MESSAGE',335,586,890,63,story({type:'open',id:'m04'}));
      add('resume-objective','CONTINUE INVESTIGATION',335,673,890,63,story({type:'navigate',page:s.stage===0?'map':s.stage===1?'signal':'link'}));break;
    case 'mail': case 'files': {
      v.kind='list';v.title=s.page==='mail'?'RECOVERED MESSAGES':'LOCAL ARCHIVE';
      const all=records.filter(r=>r.kind===(s.page==='mail'?'mail':'file'));v.subtitle=`${all.length} RECORDS / READ-ONLY MIRROR`;
      const offset=Math.min(s.scroll,Math.max(0,all.length-7));
      all.slice(offset,offset+7).forEach((r,i)=>add(`record-${r.id}`,`${s.readIds.includes(r.id)?' ':'·'} ${r.title}`,310,259+i*70,945,59,story({type:'open',id:r.id})));
      v.text=all.map(r=>`${r.title} — ${r.from||'LOCAL'} / ${r.date}`);
      add('records-prev','PREVIOUS',310,797,250,49,story({type:'scroll',delta:-7}));add('records-next','NEXT',998,797,250,49,story({type:'scroll',delta:7}));break;
    }
    case 'logs':
      v.kind='list';v.title='READ-ONLY EVENT RECORDER';v.subtitle='ROM MIRROR / CLOCK SOURCE: LOCAL';
      v.text=logs.map(l=>`${l.timestamp}  ${l.level}\n${l.message}`);
      add('inspect-override','INSPECT 03:47',310,732,457,54,story({type:'inspect',target:'03:47'}));add('inspect-breach','INSPECT 03:48',787,732,457,54,story({type:'inspect',target:'03:48'}));
      add('logs-prev','EARLIER',310,797,250,49,story({type:'scroll',delta:-6}));add('logs-next','LATER',998,797,250,49,story({type:'scroll',delta:6}));break;
    case 'map':
      v.kind='map';v.title='LAB 7 / PHYSICAL TOPOLOGY';v.subtitle='FACILITY CONTROL / PASSIVE OBSERVATION';v.art=art.map;
      v.text=['Inspect the affected room and compare the two door events with the security message and a witness record.','The local door recorder is electrically isolated from JR-NET. Its event order cannot be rewritten remotely.'];
      add('inspect-lab7','INSPECT LAB 7',335,656,410,55,story({type:'inspect',target:'lab7'}));add('map-logs','READ DOOR EVENTS',770,656,450,55,story({type:'navigate',page:'logs'}));
      add('correlate','CORRELATE EVIDENCE',335,736,885,60,story({type:'correlate'}));break;
    case 'signal':
      v.kind='signal';v.title='NEURAL RESPONSE / RECEIVER';v.subtitle=s.stage<1?'MODULE OFFLINE / RECONSTRUCT THE INCIDENT':'RECOVERY CHANNEL / MANUAL CALIBRATION';
      v.text=['Use signal-calibration.txt to identify the recorded carrier, phase and channel. Tune freely; RECOVER submits the configuration.'];
      add('calibration','OPEN CALIBRATION RECORD',335,241,885,47,story({type:'open',id:'f04'}));
      (['channel','frequency','phase'] as const).forEach((field,i)=>{
        const values={channel:s.channel,frequency:s.frequency,phase:s.phase};const step=field==='phase'?90:1;
        add(`tune-${field}-down`,`− ${field.toUpperCase()}`,335,555+i*63,330,49,story({type:'tune',field,value:values[field]-step}),s.stage<1);
        add(`tune-${field}-up`,`${field.toUpperCase()} +`,907,555+i*63,313,49,story({type:'tune',field,value:values[field]+step}),s.stage<1);
      });
      add('recover-signal','RECOVER TRANSMISSION',335,797,885,52,story({type:'recover'}),s.stage<1);break;
    case 'link':
      v.kind='link';v.title='PATCH BAY / MANUAL ROUTING';v.subtitle=s.stage<2?'BUS OFFLINE / RECOVER THE SIGNAL':'ROTATE SEGMENTS / WEST SOURCE → EAST EXIT';
      v.text=['Connect the west socket of cell 1 to the east socket of cell 9. Click a module to rotate clockwise. Choose the destination before verifying.'];
      add('routing-guide','ROUTING GUIDE',1000,262,246,47,story({type:'open',id:'f07'}));
      for(let i=0;i<9;i++)add(`rotate-${i}`,`ROTATE CELL ${i+1}`,492+(i%3)*124,325+Math.floor(i/3)*124,108,108,story({type:'rotate',index:i}),s.stage<2);
      add('destination-isolate','SEALED / ISOLATE',335,728,432,53,story({type:'destination',value:'isolate'}),s.stage<2,s.destination==='isolate');
      add('destination-restore','JR-NET / UPLINK',787,728,432,53,story({type:'destination',value:'restore'}),s.stage<2,s.destination==='restore');
      add('verify-link','VERIFY ROUTE',335,797,885,52,story({type:'verify-link'}),s.stage<2);break;
    case 'programs':
      if(program){
        const meta=PROGRAMS.find(p=>p.id===program.id)!;
        v.kind='program';v.title=meta.title;v.subtitle='RECREATION VOLUME / '+program.status.toUpperCase();v.text=[meta.description,...meta.instructions];
        const action=program.status==='ready'?'start':program.status==='paused'?'resume':program.status==='result'?'retry':'pause';
        add('program-play',action.toUpperCase(),335,797,415,52,{type:'program-action',action:{type:action}});
        add('program-exit','EXIT PROGRAM',790,797,430,52,{type:'program-exit'});
      }else{
        v.kind='list';v.title='RESIDENT PROGRAMS';v.subtitle='JR EMPLOYEE UTILITIES / OPTIONAL';v.text=['Programs never block the investigation. Local high scores are kept between visits.'];
        PROGRAMS.forEach((p,i)=>add(`launch-${p.id}`,`${String(i+1).padStart(2,'0')}  ${p.title}`,335,322+i*135,885,91,{type:'program-select',id:p.id}));
        rewardsForScores(scores).forEach((r,i)=>add(`reward-${r.id}`,`BONUS RECORD ${i+1}`,335+i*302,797,281,48,{type:'reward-select',index:i}));
      }break;
    case 'journal':
      v.kind='text';v.title='FIELD NOTES / EMPLOYEE 777';v.subtitle='RECOVERY PROGRESS / SAVED LOCALLY';
      v.text=[objective(s),'','EVIDENCE REGISTER',...s.evidence.map(e=>`[ VERIFIED ] ${e.replaceAll('-',' ').toUpperCase()}`),'','MODULES',`Incident reconstruction: ${s.stage>=1?'COMPLETE':'PENDING'}`,`Signal recovery: ${s.stage>=2?'COMPLETE':'PENDING'}`,`Final operation: ${s.ending?.toUpperCase()||'PENDING'}`,'','Open a record to preserve its discovery. Optional games never change investigation progress.'];
      add('notes-prev','PAGE UP',335,797,410,52,story({type:'scroll',delta:-10}));add('notes-next','PAGE DOWN',790,797,430,52,story({type:'scroll',delta:10}));break;
  }
  return v;
}

export function drawEcho(ctx: CanvasRenderingContext2D,s: EchoState,program: ProgramState|null,options: {time:number;boot:number;hover:string|null;scores:Record<string,number>;still:boolean;hintOpen?:boolean;rewardIndex?:number}) {
  const v=terminalView(s,program,options.scores,options.rewardIndex), C=PALETTE;
  ctx.clearRect(0,0,SCREEN_W,SCREEN_H);ctx.fillStyle=C.bg;ctx.fillRect(0,0,SCREEN_W,SCREEN_H);
  const grad=ctx.createRadialGradient(760,470,20,800,500,1000);grad.addColorStop(0,'#071719');grad.addColorStop(1,'#010606');ctx.fillStyle=grad;ctx.fillRect(0,0,SCREEN_W,SCREEN_H);
  const text=(label:string,x:number,y:number,size=24,color:string=C.text)=>{ctx.font=`${size}px 'Echo Mono', 'Courier New', monospace`;ctx.fillStyle=color;ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillText(label,x,y);};
  const line=(x:number,y:number,x2:number,y2:number,color:string=C.line)=>{ctx.strokeStyle=color;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();};
  const ascii=(rows:string[],x:number,y:number,maxW:number,maxH:number)=>{
    const count=Math.max(1,...rows.map(r=>r.length));const cell=Math.min(maxW/count,maxH/Math.max(1,rows.length)/1.5);const height=cell*1.5;
    ctx.save();ctx.font=`${Math.floor(height)}px 'Echo Mono', monospace`;ctx.textBaseline='top';ctx.fillStyle=C.text;
    rows.forEach((r,ri)=>Array.from(r).forEach((char,ci)=>{
      const cx=Math.round(x+ci*cell),cy=Math.round(y+ri*height),cw=Math.ceil(cell),ch=Math.ceil(height),mx=cx+cw/2,my=cy+ch/2;
      if(char==='█'){ctx.fillRect(cx,cy,cw,ch);return;}
      const ports:Record<string,number[]>={'─':[1,3],'═':[1,3],'│':[0,2],'║':[0,2],'┌':[1,2],'╔':[1,2],'┐':[2,3],'╗':[2,3],'└':[0,1],'╚':[0,1],'┘':[0,3],'╝':[0,3],'┼':[0,1,2,3],'╬':[0,1,2,3],'├':[0,1,2],'┤':[0,2,3]};
      if(ports[char]){ctx.strokeStyle=C.text;ctx.lineWidth=Math.max(1,cell*.1);ports[char].forEach(p=>{ctx.beginPath();ctx.moveTo(mx,my);ctx.lineTo(p===1?cx+cw:p===3?cx:mx,p===0?cy:p===2?cy+ch:my);ctx.stroke();});}
      else if(char!==' ')ctx.fillText(char,cx,cy);
    }));ctx.restore();
  };
  text('JR / TERMLINK',42,65,27,C.bright);text('RECOVERY CONSOLE',338,65,22);text('23 MAR 1981',1120,65,22,C.dim);text('07',1490,65,30,C.bright);line(40,101,1560,101);
  if(!s.awake){
    const rows=options.still?art.boot:art.boot.slice(0,Math.max(1,Math.ceil(options.boot*art.boot.length)));
    ascii(rows,420,210,880,430);text('A  S I G N A L  R E M A I N S',536,702,23,C.dim);text('LOCAL ARCHIVE / NO EXTERNAL CONNECTION',490,888,19,C.dim);
  }else{
    line(279,145,279,878);line(1291,145,1291,878);
    text(v.title,313,180,29,C.bright);text(v.subtitle,313,218,19,C.dim);line(311,238,1255,238);
    text('ARCHIVE / 07',1326,177,20,C.dim);text(s.ending?'CLOSED':s.stage>=2?'LEVEL 5':'RECOVERY',1326,222,25,C.bright);
    text('INVESTIGATION',1326,299,18,C.dim);
    ['INCIDENT','SIGNAL','DECISION'].forEach((label,i)=>{text(`${s.stage>i?'■':'□'} ${label}`,1326,342+i*40,21,s.stage>i?C.text:C.faint);});
    line(1326,466,1555,466);text('CURRENT OBJECTIVE',1326,504,17,C.dim);wrapText(objective(s),19).slice(0,6).forEach((l,i)=>text(l,1326,543+i*28,20));
    text(`EVIDENCE   ${String(s.evidence.length).padStart(2,'0')}`,1326,801,20,C.dim);text('777 / LOCAL',1326,846,19,C.dim);
    if(v.kind==='text') {
      const all=v.text.flatMap(p=>[...wrapText(p,55),'']);const offset=Math.min(s.scroll,Math.max(0,all.length-12));
      ctx.save();ctx.beginPath();ctx.rect(311,255,943,514);ctx.clip();all.slice(offset,offset+13).forEach((l,i)=>text(l,326,287+i*38,27));ctx.restore();
      text(`${Math.min(offset+1,all.length)}—${Math.min(offset+13,all.length)} / ${all.length}`,1055,875,18,C.dim);
    } else if(v.kind==='overview') {
      text('> RECOVERY NOTICE',335,292,22,C.amber);v.text.flatMap(p=>[...wrapText(p,54),'']).slice(0,7).forEach((l,i)=>text(l,335,345+i*34,26));
      text('READ. CORRELATE. RECONNECT — OR CUT THE LINE.',335,798,19,C.dim);
    } else if(v.kind==='list' && s.page==='logs') {
      const offset=Math.min(s.scroll,Math.max(0,logs.length-6));
      logs.slice(offset,offset+6).forEach((l,i)=>{text(`${l.timestamp} / ${l.level}`,325,283+i*69,18,l.level==='CRITICAL'?C.amber:C.dim);text(l.message.slice(0,59),325,312+i*69,24);});
      text(`${offset+1}—${Math.min(offset+6,logs.length)} / ${logs.length}`,1053,875,18,C.dim);
    } else if(v.kind==='list' && s.page==='programs') {
      text('OPTIONAL / KEEP THE MACHINE COMPANY',337,280,19,C.dim);
      PROGRAMS.forEach((p,i)=>text(`BEST ${options.scores[p.id]||0}  /  ${p.id==='mirror'?'PATTERN RECALL':p.id==='packet'?'DATA TRANSPORT':'SURVIVAL SIMULATION'}`,351,436+i*135,18,C.dim));
    } else if(v.kind==='map') {
      ascii(v.art||[],365,282,860,310);text('ROM DOOR RECORDER  ·  AIR-GAPPED',350,617,20,C.dim);
    } else if(v.kind==='signal') {
      ctx.fillStyle='#030c0f';ctx.fillRect(335,311,885,200);
      for(let i=0;i<12;i++)line(335+i*80,311,335+i*80,511,'#102b2d');for(let i=0;i<5;i++)line(335,311+i*50,1220,311+i*50,'#102b2d');
      const wave=(color:string,phase:number,freq:number,offset:number)=>{ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();for(let x=0;x<875;x++){const y=411+Math.sin(x*.028*(freq/147)+phase*Math.PI/180+offset)*57+Math.sin(x*.006)*8;if(x)ctx.lineTo(340+x,y);else ctx.moveTo(340+x,y);}ctx.stroke();};
      wave('#355d5d',180,147,0);wave(C.bright,s.phase,s.frequency,options.still?0:Math.sin(options.time*.3)*.05);
      text('REFERENCE',353,338,16,C.dim);text('LIVE',1120,338,16,C.text);
      [String(s.channel).padStart(2,'0'),`${s.frequency} kHz`,`${s.phase} deg`].forEach((val,i)=>text(val,716,591+i*63,24,C.bright));
    } else if(v.kind==='link') {
      text('IN',366,386,22,C.dim);line(405,379,492,379);line(848,627,940,627);text('OUT',950,635,22,C.dim);
    } else if(v.kind==='program' && program) {
      drawProgram(ctx,program,PROGRAM_RECT,options.time);
    } else if(v.kind==='ending') {
      ascii(v.art||[],405,283,760,280);v.text.flatMap(p=>wrapText(p,56)).slice(0,5).forEach((l,i)=>text(l,335,613+i*31,24));
    }
    if(s.stage>=2 && !s.openId && v.kind!=='program' && v.kind!=='ending'){
      // A bounded, seeded-looking signal scar: never obscures the reading pane.
      for(let i=0;i<22;i++){const x=1351+(i%7)*27,y=642+Math.floor(i/7)*8;ctx.fillStyle=i%3?'#315958':'#719f94';ctx.fillRect(x,y,9+(i%4)*3,2);}
    }
  }
  for(const c of v.controls){
    const {x,y,w,h}=c.rect;
    if(c.id.startsWith('rotate-')){
      const index=Number(c.id.split('-')[1]);ctx.fillStyle=c.disabled?'#051010':'#0c2325';ctx.fillRect(x,y,w,h);ctx.strokeStyle=options.hover===c.id?C.bright:C.line;ctx.strokeRect(x,y,w,h);
      const cx=x+w/2,cy=y+h/2;ctx.strokeStyle=c.disabled?C.faint:C.text;ctx.lineWidth=6;linkPorts(s.rotations[index],index).forEach(p=>{ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(p===1?x+w:p===3?x:cx,p===0?y:p===2?y+h:cy);ctx.stroke();});ctx.lineWidth=1;text(String(index+1),x+7,y+19,14,C.dim);continue;
    }
    const hover=options.hover===c.id;ctx.fillStyle=c.active?'#183534':hover?'#15312f':c.id.startsWith('nav-')?'#061011':'#0a2021';ctx.fillRect(x,y,w,h);
    if(!c.id.startsWith('nav-')||c.active){ctx.strokeStyle=c.disabled?C.faint:hover?C.bright:c.active?C.text:C.line;ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,w-1,h-1);}
    if(c.active){ctx.fillStyle=C.text;ctx.fillRect(x,y,3,h);}
    const size=c.id.startsWith('nav-')?19:c.id.startsWith('record-')?24:21;
    const max=Math.floor((w-28)/(size*.61));text(c.label.length>max?c.label.slice(0,max-1)+'…':c.label,x+14,y+h/2+size*.35,size,c.disabled?C.faint:hover?C.bright:C.text);
  }
  if(s.awake){
    line(40,893,1560,893);text((s.feedback||'LOCAL SESSION / CHANGES SAVED').slice(0,106),47,920,19,s.fault?C.amber:C.dim);
    text('HELP / TAB / ESC',1326,959,18,C.dim);
    if(options.hintOpen&&s.hintLevel>0){const all=hints(s);const hint=all[Math.min(s.hintLevel-1,all.length-1)];if(hint){ctx.fillStyle='#0b2021';ctx.fillRect(300,105,968,122);ctx.strokeStyle=C.amber;ctx.strokeRect(300,105,968,122);text(`HINT ${s.hintLevel} / 3 — TAP SCREEN TO DISMISS`,318,133,18,C.amber);wrapText(hint,72).slice(0,3).forEach((l,i)=>text(l,318,160+i*27,20));}}
  }
  return v;
}
