// Fiction written for this silent demonstration. No account or product data.
export const PEOPLE=[
 {id:'mara',name:'Mara',role:'The archivist',note:'Keeps the records. Wants to know what the archive has left out.',chapters:'I / III / IV / V / VI',row:0},
 {id:'ivo',name:'Ivo',role:'The mapmaker',note:'Reads the spaces between coastlines. Gives the journey its shape.',chapters:'II / V / VI',row:1},
 {id:'sen',name:'Sen',role:'The guide',note:'Knows the northern crossing. Walks where the maps fall silent.',chapters:'III / IV / VI',row:2},
] as const;
export const RELATIONS=[{from:'mara',to:'ivo',label:'collaborator'},{from:'mara',to:'sen',label:'guide'}] as const;
export const EVENTS=[
 {id:'opens',year:312,month:'03',monthName:'March',day:'14',title:'The archive opens',text:'Mara opens the coastal archive. A missing page becomes the beginning of a journey.',people:['mara'],chapter:'I'},
 {id:'map',year:312,month:'06',monthName:'June',day:'02',title:'The map is decoded',text:'Ivo finds a route in the margins. The marks lead north, beyond the familiar coast.',people:['ivo'],chapter:'II'},
 {id:'departure',year:312,month:'09',monthName:'September',day:'21',title:'Departure',text:'Mara and Sen leave with the map. Their notes record the departure, but not yet the destination.',people:['mara','sen'],chapter:'III'},
 {id:'crossing',year:313,month:'02',monthName:'February',day:'08',title:'The crossing',text:'Sen finds a passage through the northern cliffs. Mara records the names the sea has kept.',people:['sen','mara'],chapter:'IV'},
 {id:'signal',year:313,month:'05',monthName:'May',day:'17',title:'A signal received',text:'Ivo receives a field note from the Outer Coast. The missing route can finally be drawn.',people:['ivo','mara'],chapter:'V'},
 {id:'return',year:313,month:'10',monthName:'October',day:'04',title:'The return',text:'The three return to the archive. A map, a journal and a journey now belong to the same story.',people:['mara','ivo','sen'],chapter:'VI'},
] as const;
export const SCENES=[
 {id:'timeline',name:'Timeline',title:'The time scroll',duration:18000,times:[0,3500,6000,10000,15000,18000],steps:['Two years, one journey','Open a year','Find the month','The record travels','People and chapters','The story, connected']},
 {id:'characters',name:'Characters',title:'The index courtyard',duration:14000,times:[0,4000,6500,9000,11000,14000],steps:['Three lives enter','Take your place','Follow a person','Connections take shape','Find their appearances','Every connection stays visible']},
 {id:'ai',name:'AI Assistant',title:'The relation desk',duration:16000,times:[0,4000,6500,9500,12000,16000],steps:['One request','Read the first record','Bring the next record','Arrange the people','Connect existing notes','Waiting for confirmation']},
 {id:'wiki',name:'Wiki',title:'The typesetting workshop',duration:22000,times:[0,3000,5000,9500,12500,15500,18500,22000],steps:['A page to begin with','Bring the map','Make room for the story','Let the words wrap','A voice in the margin','Put the voice in context','Follow a name','The page is yours']},
] as const;
