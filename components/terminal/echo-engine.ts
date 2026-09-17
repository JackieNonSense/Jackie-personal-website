import { records } from './echo-content';
export const PAGES = ['overview','mail','files','logs','map','signal','link','programs','journal'] as const;
export type EchoPage = typeof PAGES[number];
export type Destination = 'isolate'|'restore';
export type EchoState = {
  awake:boolean; page:EchoPage; openId:string|null; readIds:string[]; evidence:string[];
  stage:0|1|2|3; ending:Destination|null; feedback:string; fault:string|null;
  frequency:number; phase:number; channel:number; rotations:number[]; destination:Destination;
  pendingEnding:boolean; hintLevel:number; scroll:number;
};
export type EchoAction =
  | {type:'wake'|'sleep'|'back'|'correlate'|'recover'|'reset-module'|'verify-link'|'confirm-ending'|'cancel-ending'|'hint'|'new-game'}
  | {type:'navigate';page:EchoPage} | {type:'open';id:string} | {type:'scroll';delta:number}
  | {type:'inspect';target:string} | {type:'tune';field:'frequency'|'phase'|'channel';value:number}
  | {type:'unlock';password:string} | {type:'rotate';index:number}
  | {type:'destination';value:Destination} | {type:'message';text:string};
export const SIGNAL_TARGET = {frequency:147,phase:180,channel:7} as const;
export const SIGNAL_LIMITS = {
  frequency:{min:120,max:180,step:1},phase:{min:0,max:270,step:90},channel:{min:1,max:9,step:1},
} as const;
export const LINK_SOURCE=0, LINK_TARGET=8;
export const LINK_SOLUTION=[0,1,2,3,1,2,2,1,0] as const;
/** Ports are clockwise N=0, E=1, S=2, W=3. Rotation is a clockwise quarter turn. */
export const LINK_TILE_PORTS:readonly (readonly number[])[]=[[1,3],[1,2],[2,3],[2,3],[3,2],[2,0],[2,3],[0,2],[1,3]];
export const REQUIRED_EVIDENCE=['incident','witness','lab7','override','breach'] as const;
const knownEvidence=[...REQUIRED_EVIDENCE,'correlated','recovered','clearance','committed'];
const initialTuning={frequency:132,phase:0,channel:1};

export function initialEcho():EchoState {
  return {awake:false,page:'overview',openId:null,readIds:[],evidence:[],stage:0,ending:null,
    feedback:'A signal remains. Wake the terminal to investigate.',fault:null,...initialTuning,
    rotations:Array(9).fill(0),destination:'isolate',pendingEnding:false,hintLevel:0,scroll:0};
}
const add=(values:string[],...items:string[])=>[...new Set([...values,...items])];
const say=(s:EchoState,feedback:string):EchoState=>({...s,feedback});
export function linkPorts(rotation:number,index:number):number[] {
  if(!Number.isInteger(index)||index<0||index>8||!Number.isInteger(rotation))return [];
  return LINK_TILE_PORTS[index].map(port=>(port+((rotation%4)+4)%4)%4);
}
export function linkConnected(s:Pick<EchoState,'rotations'>):boolean {
  if(s.rotations.length!==9||!linkPorts(s.rotations[0],0).includes(3)||!linkPorts(s.rotations[8],8).includes(1))return false;
  const visited=new Set<number>(),queue=[0];
  while(queue.length){
    const cell=queue.shift()!;if(visited.has(cell))continue;visited.add(cell);if(cell===8)return true;
    for(const port of linkPorts(s.rotations[cell],cell)){
      const x=cell%3,y=Math.floor(cell/3), nx=x+[0,1,0,-1][port],ny=y+[-1,0,1,0][port];
      if(nx<0||nx>2||ny<0||ny>2)continue;
      const next=ny*3+nx;
      if(linkPorts(s.rotations[next],next).includes((port+2)%4))queue.push(next);
    }
  }
  return false;
}
export function objective(s:EchoState):string {
  return ['Reconstruct the Lab 7 breach: mail, notebook, map and both door timestamps.',
    'Recover the isolated receiver using the calibration card.',
    'Repair the manual link, choose its destination and verify before committing.',
    s.ending==='restore'?'Transmission complete. Review the retained archive or begin another investigation.':'Archive isolated. Review the retained evidence or begin another investigation.'][s.stage];
}
const stageHints=[
  ['Read the security mail and personal notebook. The map and logs record different kinds of evidence.',
    'Open m04 and f01. Inspect Lab 7 and both door events at 03:47 and 03:48, then correlate.',
    'Commands: open m04; open f01; inspect lab7; inspect 03:47; inspect 03:48; correlate. Enter each separately.'],
  ['The recorder calibration is in signal-calibration.txt and the maintenance mail.',
    'Set the carrier, invert the phase and choose the laboratory recorder channel. Recovery is receive-only.',
    'Set frequency 147 kHz, phase 180 degrees, channel 7. Select RECOVER. If needed, RESET MODULE and retry.'],
  ['Join reciprocal ports from the west of cell 1 to the east of cell 9. Read bus-routing.txt.',
    'The connected path is 1 > 2 > 5 > 4 > 7 > 8 > 9. Cells 3 and 6 can remain unused.',
    'From RESET MODULE, clockwise turns per cell are 0,1,2,3,1,2,2,1,0. Choose ISOLATE or RESTORE, VERIFY LINK, then CONFIRM.'],
  ['Both endings preserve the archive. New investigation clears this local progress; optional programs are independent.'],
];
export function hints(s:EchoState):string[]{return stageHints[s.stage].slice(0,s.hintLevel);}

export function reduceEcho(s:EchoState,a:EchoAction):EchoState {
  if(a.type==='new-game')return initialEcho();
  if(a.type==='wake')return {...s,awake:true,feedback:s.stage===0?'LOCAL ARCHIVE ONLINE / Employee 777 identity retained. Read the current objective.':objective(s)};
  if(a.type==='sleep')return {...s,awake:false,pendingEnding:false,feedback:'Standby. Investigation retained.'};
  if(a.type==='message')return say(s,a.text);
  if(!s.awake)return say(s,'Terminal is in standby. WAKE to continue.');
  if(a.type==='navigate')return {...s,page:a.page,openId:null,scroll:0,pendingEnding:false};
  if(a.type==='back')return {...s,openId:null,scroll:0,pendingEnding:false};
  if(a.type==='scroll')return Number.isFinite(a.delta)?{...s,scroll:Math.max(0,Math.min(500,s.scroll+Math.trunc(a.delta)))}:s;
  if(a.type==='hint'){const hintLevel=Math.min(3,s.hintLevel+1);return {...s,hintLevel,feedback:stageHints[s.stage][Math.min(hintLevel-1,stageHints[s.stage].length-1)]};}
  if(a.type==='open'){
    const record=records.find(record=>record.id===a.id);
    if(!record)return say(s,'Record not found. Use its archive ID or filename.');
    if((record.requires??0)>s.stage)return say(s,'This archive segment is offline. Complete the current objective to recover it.');
    if(record.id==='f03'&&!s.evidence.includes('clearance'))return say(s,'CLASSIFIED / LEVEL 5. After receiver recovery, use the phrase in maintenance-slip.txt: UNLOCK <phrase>.');
    return {...s,page:record.kind==='mail'?'mail':'files',openId:record.id,scroll:0,readIds:add(s.readIds,record.id),
      evidence:record.evidence?add(s.evidence,record.evidence):s.evidence,
      feedback:record.evidence?'Relevant observation added to the investigation journal.':`ARCHIVE OPEN / ${record.title}`};
  }
  if(a.type==='inspect'){
    const target=a.target.toLowerCase().replace(/[\s_-]/g,'');
    const observation:Record<string,[string,string]>={
      lab7:['lab7','LAB 7: recorder and Corridor B relay share a route. Map evidence retained.'],
      '03:47':['override','03:47: a credential was accepted. Permission does not establish consent.'],
      '03:48':['breach','03:48: the mechanical latch was forced. A second event, one minute later.'],
    };
    if(!observation[target])return say(s,target==='corridorb'?'CORRIDOR B: inspect Lab 7 at the end of this relay route.':'Inspect LAB7 on the map, or 03:47 and 03:48 in the security logs.');
    const [evidence,feedback]=observation[target];return {...s,evidence:add(s.evidence,evidence),feedback};
  }
  if(a.type==='unlock'){
    if(s.stage<2)return say(s,'CLASSIFIED MODULE OFFLINE. Complete signal recovery first; a password cannot tune the receiver.');
    if(a.password.trim().toLowerCase()!=='3c5614')return {...s,fault:'access',feedback:'Phrase not recognized. Read maintenance-slip.txt; retry is available and no progress is lost.'};
    return {...s,evidence:add(s.evidence,'clearance'),fault:null,feedback:'LEVEL 5 / Employee 777. classified.doc is now available.'};
  }
  if(s.stage===3)return say(s,'The decision is recorded. Browse the archive or begin a new investigation.');
  if(a.type==='correlate'){
    if(s.stage>0)return say(s,'Breach correlation already complete. '+objective(s));
    const missing=REQUIRED_EVIDENCE.filter(item=>!s.evidence.includes(item));
    if(missing.length)return say(s,`Evidence incomplete (${5-missing.length}/5). Read security mail and notes, inspect Lab 7, and inspect both door timestamps.`);
    return {...s,stage:1,page:'signal',openId:null,scroll:0,hintLevel:0,fault:null,evidence:add(s.evidence,'correlated'),feedback:'CORRELATION COMPLETE. The isolated receiver is safe to power. Calibration documents recovered.'};
  }
  if(a.type==='reset-module'){
    const link=s.page==='link'||s.fault==='link';
    return {...s,...(link?{rotations:Array(9).fill(0)}:initialTuning),fault:null,pendingEnding:false,feedback:'Local module reset. Documents, evidence and story progress retained.'};
  }
  if(a.type==='tune'){
    if(s.stage<1)return say(s,'Receiver disabled. Correlate the breach evidence first.');
    const range=SIGNAL_LIMITS[a.field];
    if(!range||!Number.isFinite(a.value)||a.value<range.min||a.value>range.max||(a.value-range.min)%range.step!==0)
      return say(s,range?`Setting outside range. ${a.field.toUpperCase()}: ${range.min}-${range.max}, step ${range.step}.`:'Unknown receiver control.');
    return {...s,[a.field]:a.value,fault:null,feedback:'Receiver setting updated. Compare the calibration card before RECOVER.'};
  }
  if(a.type==='recover'){
    if(s.stage===0)return say(s,'Receiver disabled. Correlate the breach evidence first.');
    if(s.stage===2)return say(s,'Receiver spool already recovered. The manual link remains under your control.');
    if(s.frequency!==147||s.phase!==180||s.channel!==7)return {...s,fault:'signal',feedback:'SIGNAL MISMATCH. No data lost. Check all three settings or RESET MODULE to retry.'};
    return {...s,stage:2,page:'link',openId:null,scroll:0,hintLevel:0,fault:null,evidence:add(s.evidence,'recovered'),feedback:'SPOOL RECOVERED. Late mail and routing documents available. External carrier remains disconnected.'};
  }
  if(a.type==='rotate'){
    if(s.stage<2)return say(s,'Routing board offline. Recover the receiver first.');
    if(!Number.isInteger(a.index)||a.index<0||a.index>8)return say(s,'Choose a coupler numbered 1 through 9.');
    const rotations=[...s.rotations];rotations[a.index]=(rotations[a.index]+1)%4;
    return {...s,rotations,pendingEnding:false,fault:null,feedback:`Coupler ${a.index+1} rotated clockwise. VERIFY LINK when the path is complete.`};
  }
  if(a.type==='destination')return {...s,destination:a.value,pendingEnding:false,feedback:a.value==='restore'?'RESTORE selected: the recovered pattern may travel outside Lab 7.':'ISOLATE selected: retain local evidence; no assistance request will leave.'};
  if(a.type==='verify-link'){
    if(s.stage<2)return say(s,'Routing board offline. Recover the receiver first.');
    if(!linkConnected(s))return {...s,fault:'link',pendingEnding:false,feedback:'OPEN CIRCUIT. Connect west of cell 1 to east of cell 9 through matching ports. Retry without losing evidence.'};
    return {...s,pendingEnding:true,fault:null,feedback:s.destination==='restore'?'PATH VERIFIED. Transmit the recovered archive to an unverified carrier? CONFIRM commits; CANCEL returns.':'PATH VERIFIED. Seal the recording here and withhold the outgoing call? CONFIRM commits; CANCEL returns.'};
  }
  if(a.type==='cancel-ending')return {...s,pendingEnding:false,feedback:'Decision cancelled. No transmission or isolation committed.'};
  if(a.type==='confirm-ending'){
    if(s.stage!==2||!s.pendingEnding||!linkConnected(s))return say(s,'Verify a connected path and select its destination before confirming.');
    return {...s,stage:3,ending:s.destination,page:'overview',openId:null,scroll:0,pendingEnding:false,hintLevel:0,evidence:add(s.evidence,'committed'),feedback:s.destination==='restore'?'TRANSMISSION COMPLETE. A distant carrier answers. Its origin is unverified.':'ISOLATION COMPLETE. The archive survives here. The external line is silent.'};
  }
  return s;
}

const message=(text:string):EchoAction=>({type:'message',text});
export function parseCommand(text:string,s:EchoState):EchoAction {
  const input=text.trim().toLowerCase();if(!input)return message('Enter HELP for available controls.');
  const [verb,...args]=input.split(/\s+/),arg=args.join(' ');
  if(PAGES.includes(verb as EchoPage)&&!args.length)return {type:'navigate',page:verb as EchoPage};
  if(verb==='help')return message('MAIL / FILES / LOGS / MAP / SIGNAL / LINK / PROGRAMS / JOURNAL. OPEN <id or filename>, INSPECT LAB7|03:47|03:48, CORRELATE, TUNE frequency|phase|channel <number>, RECOVER, UNLOCK <phrase>, ROTATE 1-9, DESTINATION isolate|restore, VERIFY, CONFIRM, CANCEL, RESET, HINT, BACK.');
  if(verb==='status')return message(objective(s));
  const single:Record<string,EchoAction['type']>={wake:'wake',sleep:'sleep',back:'back',correlate:'correlate',recover:'recover',reset:'reset-module',hint:'hint',verify:'verify-link','verify-link':'verify-link',confirm:'confirm-ending',cancel:'cancel-ending'};
  if(single[verb]&&!args.length)return {type:single[verb]} as EchoAction;
  if((verb==='open'||verb==='read')&&arg){const record=records.find(r=>r.id===arg||r.title.toLowerCase()===arg);return record?{type:'open',id:record.id}:message('Record not found. Use its displayed ID or filename.');}
  if(verb==='inspect'&&arg)return {type:'inspect',target:arg};
  if(verb==='unlock'){
    if(args.length===1)return {type:'unlock',password:arg};
    if(args.length===2&&args[0]==='classified.doc')return {type:'unlock',password:args[1]};
    return message('Usage: UNLOCK [classified.doc] <phrase>.');
  }
  if(verb==='tune'){
    if(args.length!==2||!['frequency','phase','channel'].includes(args[0])||!/^\d+(?:\.\d+)?$/.test(args[1]))return message('Usage: TUNE frequency|phase|channel <number>.');
    return {type:'tune',field:args[0] as 'frequency'|'phase'|'channel',value:Number(args[1])};
  }
  if(verb==='rotate')return /^[1-9]$/.test(arg)?{type:'rotate',index:Number(arg)-1}:message('Usage: ROTATE <cell number 1-9>.');
  if(verb==='destination'||verb==='route')return arg==='isolate'||arg==='restore'?{type:'destination',value:arg}:message('Usage: DESTINATION isolate|restore.');
  return message(`Unknown command: ${verb.slice(0,40)}. Enter HELP. Commands operate this local simulation only.`);
}

export function serializeEcho(s:EchoState):string{return JSON.stringify({version:1,state:s});}
const integer=(value:unknown,min:number,max:number)=>typeof value==='number'&&Number.isInteger(value)&&value>=min&&value<=max;
export function restoreEcho(raw:string|null):EchoState {
  if(!raw||raw.length>40000)return initialEcho();
  try{
    const value:unknown=JSON.parse(raw);
    if(!value||typeof value!=='object'||!('version'in value)||value.version!==1||!('state'in value)||!value.state||typeof value.state!=='object')return initialEcho();
    const v=value.state as Record<string,unknown>;
    if(typeof v.awake!=='boolean'||!PAGES.includes(v.page as EchoPage)||!integer(v.stage,0,3)||!integer(v.scroll,0,500)||!integer(v.hintLevel,0,3)||typeof v.pendingEnding!=='boolean')return initialEcho();
    if(!['isolate','restore'].includes(v.destination as string)||!(v.ending===null||['isolate','restore'].includes(v.ending as string))||typeof v.feedback!=='string'||v.feedback.length>4000||!(v.fault===null||['signal','link','access'].includes(v.fault as string)))return initialEcho();
    if(!Array.isArray(v.rotations)||v.rotations.length!==9||v.rotations.some(n=>!integer(n,0,3)))return initialEcho();
    for(const field of ['frequency','phase','channel'] as const){const range=SIGNAL_LIMITS[field];if(!integer(v[field],range.min,range.max)||((v[field] as number)-range.min)%range.step!==0)return initialEcho();}
    if(!Array.isArray(v.readIds)||v.readIds.length>20||v.readIds.some(id=>typeof id!=='string'||!records.some(r=>r.id===id))||new Set(v.readIds).size!==v.readIds.length)return initialEcho();
    if(!Array.isArray(v.evidence)||v.evidence.length>knownEvidence.length||v.evidence.some(id=>typeof id!=='string'||!knownEvidence.includes(id))||new Set(v.evidence).size!==v.evidence.length)return initialEcho();
    if(v.openId!==null&&(typeof v.openId!=='string'||!records.some(r=>r.id===v.openId)||!v.readIds.includes(v.openId)))return initialEcho();
    const s=v as unknown as EchoState;
    if(s.stage>0&&(!s.evidence.includes('correlated')||!REQUIRED_EVIDENCE.every(item=>s.evidence.includes(item))))return initialEcho();
    if(s.stage>1&&!s.evidence.includes('recovered'))return initialEcho();
    if(s.stage===0&&s.evidence.includes('correlated')||s.stage<2&&s.evidence.includes('recovered'))return initialEcho();
    if(s.stage<2&&s.evidence.includes('clearance')||s.stage<3&&s.evidence.includes('committed'))return initialEcho();
    if((s.stage===3)!==(s.ending!==null)||s.stage===3&&(!s.evidence.includes('committed')||!linkConnected(s)))return initialEcho();
    if(s.ending!==null&&s.ending!==s.destination)return initialEcho();
    if(s.readIds.some(id=>{const r=records.find(r=>r.id===id)!;return(r.requires??0)>s.stage||id==='f03'&&!s.evidence.includes('clearance');}))return initialEcho();
    if(s.openId){const record=records.find(r=>r.id===s.openId)!;if(s.page!==(record.kind==='mail'?'mail':'files'))return initialEcho();}
    return {...initialEcho(),...s,readIds:[...s.readIds],evidence:[...s.evidence],rotations:[...s.rotations],pendingEnding:false};
  }catch{return initialEcho();}
}
