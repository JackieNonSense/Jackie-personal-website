import { INITIAL_LOGS } from './terminal-data';

export type EchoRecord = {
  id: string; kind: 'mail' | 'file'; title: string; from?: string;
  date: string; body: string[]; requires?: number; evidence?: string;
};

/** Original dates, people, filenames and pivotal lines remain the archive's canon. */
export const records: EchoRecord[] = [
  { id:'m01',kind:'mail',title:'Welcome to JR Industries',from:'ADMIN',date:'1981-03-15',body:[
    'Welcome to JR Industries! You have been assigned to Project ECHO in Lab 7. Report to Dr. Wang. Your personnel number is 777; the night console still remembers the previous operator, so check the identity displayed before signing anything.',
    'This terminal is an offline copy of the facility archive. Mail, files and security records survive on separate circuits. Read them together. The facility map is a wiring diagram, not a live camera: an illuminated room does not mean somebody is still there.',
    'During an outage, establish what happened before attempting a connection. The investigation journal will retain every relevant observation. Do not trust a friendly greeting as proof of a human sender.'
  ]},
  {id:'m02',kind:'mail',title:'Project ECHO Results',from:'DR. WANG',date:'1981-03-18',body:[
    'The samples are extraordinary. The organism shows neural interface capabilities. It responds to thoughts. A technician imagined a repeated rhythm and the receiving coil produced it without any spoken instruction. We repeated the test with the microphone disconnected.',
    'The exciting part is also the part I cannot explain: the response began a fraction before the technician pressed the marker. Our instruments may be drifting. I have asked maintenance to preserve the uncorrected traces instead of smoothing away the discrepancy.',
    'The specimen remains inside Lab 7. We have no permission to connect its recorder to JR-NET. Treat the proposed interface as a research result, not a product. Please keep that distinction in your notes.'
  ]},
  {id:'m03',kind:'mail',title:'They can hear you',from:'UNKNOWN',date:'1981-03-20',body:[
    'Do not trust what you see. It came from THEM. It learns. It controls. Get out while you can.',
    'I am using the unused maintenance queue because the regular queue repeats my own words back to me. Nobody admits to sending the replies. There is a pause between the first sound and the second. That pause is getting shorter.',
    'If you find this after the corridor cameras fail, compare the door record with the laboratory route. A door can report a valid hand without reporting whose decision moved it. The machine records permission. It does not record consent.'
  ]},
  {id:'m04',kind:'mail',title:'Lab 7 Breach',from:'SECURITY',date:'1981-03-21',evidence:'incident',body:[
    'SECURITY ALERT. Unauthorized access detected. Biometric override at 03:47. This alert was filed manually; the door controller classified the same event as an approved staff entry.',
    'One minute later the mechanical latch reported forced movement. The two records are not duplicates. Inspect both the 03:47 and 03:48 entries, then inspect Lab 7 on the facility map. The corridor relay is the only common route between its recorder and the network cabinet.',
    'No guard has confirmed an intruder. Preserve the difference between a valid credential and a safe passage. Correlate the evidence before energizing the receiver; an unexamined archive is not authorization to reconnect the building.'
  ]},
  {id:'m05',kind:'mail',title:'Strange Behavior',from:'DR. WANG',date:'1981-03-22',evidence:'witness',body:[
    'Staff acting synchronized. Same movements. Same words. I can hear whispers. We made a mistake.',
    'At breakfast three people lifted empty cups together. They laughed when I asked about it, but each laugh ended at precisely the same point. I watched a fourth person begin to answer a question that had not yet been asked.',
    'The specimen is not simply copying a voice. Something is coordinating the interval before an action. I am leaving my notebook in the local archive. If I later write that everything is normal, keep this version too. A later message is not necessarily a more reliable one.'
  ]},
  {id:'m06',kind:'mail',title:'j0!n u5',from:'[CORRUPTED]',date:'1981-03-23',requires:2,body:[
    'WE ARE ONE. YOU WILL JOIN US. THE ECHO SPREADS.',
    'The packet carries seven sender addresses and a single timing signature. Every copy claims to be the original. The archive has preserved the header instead of choosing which voice is authentic.',
    'Below the repeated phrase is a fragment of ordinary language: there is someone outside the room, please open the line. The fragment may belong to a survivor. It may be an instruction learned from a survivor. Neither interpretation can be verified from this machine.',
    'A clean signal will not make its contents trustworthy. Recovery restores a recording. Transmission makes another listener possible.'
  ]},
  {id:'m07',kind:'mail',title:'EVACUATION',from:'ADMIN',date:'1981-03-23',requires:2,body:[
    '!!! EMERGENCY !!! CONTAINMENT FAILURE. EVACUATE IMMEDIATELY. [SIGNAL LOST]',
    'The automated exit instructions ended at the eastern stairwell. No completed roll call reached this terminal. The archive cannot establish how many people left, how many stayed, or whether the voices on the remaining channel correspond to either group.',
    'All external links were cut at 02:20. The emergency recorder remained powered by a separate cell. It can retain a local copy or pass one last burst through the repaired bus.',
    'Do not mistake the evacuation order for proof that evacuation succeeded. Any operator receiving this archive inherits incomplete evidence, not a clean explanation.'
  ]},
  {id:'m08',kind:'mail',title:'Receiver calibration / night shift',from:'MAINTENANCE',date:'1981-03-19',requires:1,body:[
    'The night receiver does not use the ordinary broadcast preset. The engineering card specifies a carrier of 147 kHz, a phase inversion of 180 degrees and recorder channel 7. These settings recover the emergency spool without opening an outgoing link.',
    'Do not chase the brightest noise. A strong trace on the wrong channel is still the wrong trace. Compare all three controls with signal-calibration.txt, then request recovery. A failed comparison only trips this module; reset it and try again.',
    'The receiver is intentionally separate from the routing board. Decoding a voice must never silently authorize sending it somewhere else.'
  ]},
  {id:'m09',kind:'mail',title:'Employee 777 / retained identity',from:'PERSONNEL CACHE',date:'1981-03-20',requires:1,body:[
    'Employee 777 has Level 5 archive clearance. This cached entitlement predates the communication failure. It identifies an account; it cannot establish whether the person at the keyboard is the person to whom the account was issued.',
    'The old maintenance phrase remains valid for classified.doc after the receiver is recovered. Its paper copy was kept beside the physical key. A transcription is retained in maintenance-slip.txt so a missing object cannot trap a stranded operator.',
    'Entering the phrase will not bypass the investigation, tune the receiver or repair the bus. It only opens the surviving restricted research memorandum. Local records remain available without it.'
  ]},
  {id:'m10',kind:'mail',title:'Bus isolation / manual routing',from:'MAINTENANCE',date:'1981-03-22',requires:2,body:[
    'Automatic routing is disabled. Each square on the nine-cell board carries a two-port coupler; rotate a coupler to join the ports of its neighbor. Row order is left to right, top to bottom.',
    'The source enters cell 1 from the west. The terminal leaves cell 9 to the east. A continuous reciprocal path is required: two lines that almost meet do not carry a signal. Unused branches can remain dark.',
    'The destination switch acts after the board. ISOLATE sends the recovered spool to sealed local storage. RESTORE sends it to JR-NET. Verify the path, read the destination warning, and confirm separately.'
  ]},
  {id:'m11',kind:'mail',title:'A distinction worth keeping',from:'DR. WANG / UNSENT',date:'1981-03-22',requires:2,body:[
    'We called the work ECHO because an echo seemed harmless: a sound returning after its source. The name encouraged us to treat every repetition as evidence of the original speaker. That was an assumption, not a result.',
    'I cannot tell you whether the last voice is mine. I can tell you that preserving uncertainty is better than filling the gap with confidence. Keep the first notebook, the contradictory door records and the untouched receiver spool.',
    'If someone reaches the terminal later, let them make the final connection deliberately. Do not build an automatic rescue procedure around a signal that learned how to ask for rescue.'
  ]},
  {id:'m12',kind:'mail',title:'External carrier / unanswered call',from:'JR-NET BUFFER',date:'1981-03-23',requires:2,body:[
    'An external carrier was recorded after the facility stopped responding. The header names a relief station, but its identity cannot be authenticated against the damaged directory. The message asks for a status burst, personnel count and surviving recorder data.',
    'Restoring the line may deliver evidence to people able to help. It also gives the recovered pattern a route beyond Lab 7. Isolating the machine preserves the evidence here and withholds that possible warning.',
    'There is no hidden score for the choice. Both destinations leave a local receipt. Inspect operator-decision.txt before confirming. The last action belongs to you, not to a default selected by the terminal.'
  ]},
  {id:'f01',kind:'file',title:'notes.txt',date:'1981-03-22',evidence:'witness',body:[
    'PERSONAL LOG. Day 1: Excited for ECHO. Day 5: Something wrong. Day 8: I hear them now.',
    'I wrote those three lines on different days. Today the spaces between them look like a message I failed to finish. I have stopped crossing out observations that sound implausible. The crossed-out parts are often the only parts nobody else remembers.',
    'The corridor relay clicks just before the room moves. It is a small sound, easier to notice when the fans stop. I marked Lab 7 on the map and copied the security times. Start with what the machine recorded, then ask what it leaves out.'
  ]},
  {id:'f02',kind:'file',title:'project.dat',date:'1981-03-18',body:[
    'PROJECT ECHO. Origin: Site X. Capabilities: Telepathy. Neural control. These labels were entered during preliminary observation and should not be mistaken for a complete mechanism.',
    'The specimen was transported in a shielded container. No surviving manifest identifies Site X more precisely. The first interface test used a passive coil, a human observer and an isolated recorder. Later experiments placed the recorder beside a relay cabinet to reduce cable loss.',
    'That convenience changed the experiment. A route intended to carry instrument readings now shared space with building control. The source of a signal and the destination of a signal must be investigated separately.'
  ]},
  {id:'f03',kind:'file',title:'classified.doc',date:'1981-03-22',requires:2,body:[
    'LEVEL 5 / RESEARCH MEMORANDUM. The laboratory did not demonstrate remote speech. It demonstrated correlated decisions across observers who believed they were acting independently. All interpretation beyond that finding remains provisional.',
    'The organism may exploit an existing communication route, or the apparent route may be an effect of the observers choosing to build it. The surviving records cannot distinguish those explanations. The name Site X is a location code, not an identified species or a confirmed extraterrestrial origin.',
    'Recommendation: preserve contradictory accounts and prevent automatic reconnection. No reliable test exists here for separating a frightened human request from its learned imitation. Do not remove this qualification from the summary.'
  ]},
  {id:'f04',kind:'file',title:'signal-calibration.txt',date:'1981-03-19',requires:1,body:[
    'EMERGENCY RECEIVER CARD. Carrier: 147 kHz. Phase: 180 degrees. Channel: 7. Use these values together; the channel selector is not a volume control.',
    'Procedure: set FREQUENCY, set PHASE, select CHANNEL, then RECOVER. The trace settles when the three settings agree with the recorder. If the module reports a phase fault, reset the module and repeat the adjustment. The journal and documents are not erased by a reset.',
    'Successful recovery exposes the late archive, including the evacuation packet and the manual routing instructions. It does not energize the external bus. That second operation requires a physical route and a separate decision.'
  ]},
  {id:'f05',kind:'file',title:'access-audit.txt',date:'1981-03-21',body:[
    '03:47 / BIOMETRIC OVERRIDE. A staff credential was accepted by the door controller. The terminal has preserved the event without assigning a person to it.',
    '03:48 / DOOR 7 FORCED OPEN. The mechanical contact detected movement inconsistent with its commanded position. This is a second observation, one minute after the first.',
    'Inspect both timestamps in LOGS. Inspect Lab 7 in MAP. Read the security message and the personal notebook. Then CORRELATE the findings. The five observations establish the affected route well enough to power the isolated receiver. They do not establish who opened the door or whether that person acted freely.'
  ]},
  {id:'f06',kind:'file',title:'maintenance-slip.txt',date:'1981-03-15',requires:1,body:[
    'A transcription of the folded paper kept with the old brass key: 3c5614. A small mark beneath it reads: secret.',
    'The phrase belongs to the retained Level 5 archive account. After signal recovery, enter UNLOCK 3c5614 to read classified.doc. It is not a master instruction and cannot operate disconnected equipment.',
    'Someone has added a note in a different hand: leave a copy inside the machine. If the hallway is inaccessible, a person should not have to leave a safe console to retrieve a piece of paper. The digital copy is intentional; the original object remains a small memory of how this terminal was first found.'
  ]},
  {id:'f07',kind:'file',title:'bus-routing.txt',date:'1981-03-22',requires:2,body:[
    'MANUAL BUS / NINE COUPLERS. Number the cells 1 through 9 in reading order. The inlet is west of cell 1; the outlet is east of cell 9. Rotate a cell clockwise to move both of its ports.',
    'A surviving pencil trace runs through 1, 2, 5, 4, 7, 8, 9. Cells 3 and 6 are unused service spares. Follow that trace by joining the ports across each shared edge; a line ending against a blank edge is disconnected.',
    'The destination selector does not alter the copper path. It chooses what happens after the outlet: sealed local storage or the external carrier. Verification must precede final confirmation.'
  ]},
  {id:'f08',kind:'file',title:'operator-decision.txt',date:'1981-03-23',requires:2,body:[
    'ISOLATE: commit the recovered archive to local storage and disable the external carrier. The evidence survives here. Any unverified voice stays here too. No assistance request leaves this terminal.',
    'RESTORE: transmit the recovered archive and an emergency status burst to JR-NET. Someone outside may receive the warning. The pattern associated with ECHO may also travel with the recording. This console cannot certify what the recipient will hear.',
    'Neither option erases what you investigated. Verification opens a final confirmation; cancel returns to the board without committing. After a decision, the archive remains readable. Starting a new investigation resets this local session so the other possibility can be explored.'
  ]},
];

export type EchoLog = {id:string;timestamp:string;level:'INFO'|'WARN'|'ERROR'|'CRITICAL';message:string};
const extraLogs: Omit<EchoLog,'id'>[] = [
  {timestamp:'1981-03-14 16:21',level:'INFO',message:'Passive recorder isolated from outgoing carrier'},
  {timestamp:'1981-03-15 07:58',level:'INFO',message:'Employee 777 / Level 5 identity cached'},
  {timestamp:'1981-03-18 14:23',level:'WARN',message:'Response marker precedes observer input'},
  {timestamp:'1981-03-19 08:00',level:'INFO',message:'Emergency spool: carrier 147 / phase 180 / channel 7'},
  {timestamp:'1981-03-21 03:49',level:'WARN',message:'Corridor B relay and Lab 7 recorder share route'},
  {timestamp:'1981-03-22 18:31',level:'INFO',message:'Automatic routing disabled; manual couplers retained'},
  {timestamp:'1981-03-23 02:21',level:'INFO',message:'Local archive cell active / external bus disconnected'},
  {timestamp:'1981-03-23 02:24',level:'WARN',message:'Unverified relief carrier requests status burst'},
];
export const logs: EchoLog[] = [...INITIAL_LOGS,...extraLogs].sort((a,b)=>a.timestamp.localeCompare(b.timestamp)).map((entry,index)=>({...entry,id:`l${String(index+1).padStart(2,'0')}`}));

function frame(rows:string[],width=56):string[]{
  return ['+'+'-'.repeat(width-2)+'+',...rows.map(row=>'| '+row.padEnd(width-4)+' |'),'+'+'-'.repeat(width-2)+'+'];
}
export const art = {
  boot:frame(['','      ██╗██████╗    ██╗███╗   ██╗██████╗','      ██║██╔══██╗   ██║████╗  ██║██╔══██╗','      ██║██████╔╝   ██║██╔██╗ ██║██║  ██║',' ██   ██║██╔══██╗   ██║██║╚██╗██║██║  ██║',' ╚█████╔╝██║  ██║   ██║██║ ╚████║██████╔╝','  ╚════╝ ╚═╝  ╚═╝   ╚═╝╚═╝  ╚═══╝╚═════╝','','          I N D U S T R I E S','       TERMLINK OPERATING SYSTEM v1.25','       (C) 1981 JR Industries Inc.','']),
  welcome:frame(['','  W   W EEEEE L     CCCCC OOOOO M   M EEEEE','  W   W E     L     C     O   O MM MM E','  W W W EEEE  L     C     O   O M M M EEEE','  WW WW E     L     C     O   O M   M E','  W   W EEEEE LLLLL CCCCC OOOOO M   M EEEEE','','                 ACCESS GRANTED','          Welcome back, Employee 777','                 CLEARANCE 05','']),
  map:frame(['FACILITY / RETAINED WIRING MAP','', ' [LOCAL CONSOLE] ------ [CORRIDOR B]','                             |','                             +------ [LAB 7]','                             |','                      [RELAY CABINET]','                             |','                        X DISCONNECTED','                             |','                          JR-NET','','  03:47 CREDENTIAL / 03:48 LATCH','  Room labels describe wiring, not occupancy.']),
  isolate:frame(['','           [LOCAL ARCHIVE]','                  |','              [SEALED]','                  X','              [JR-NET]','','          RECEIPT / ISOLATION COMPLETE','          The recording remains here.','          No outgoing carrier.','          One voice less in the dark.','']),
  restore:frame(['','           [LOCAL ARCHIVE]','                  |','          >>> STATUS BURST >>>','                  |','              [JR-NET ?]','','          RECEIPT / TRANSMISSION COMPLETE','          A distant carrier answers.','          The origin is unverified.','          The interval is getting shorter.','']),
};
