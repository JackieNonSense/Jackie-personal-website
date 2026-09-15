// Independent fictional examples; never read from an InkTrace account.
export const people = [
 {name:'Mara',role:'The archivist',note:'Keeps the records. Wants to know what the archive has left out.',links:'Ivo — collaborator · Sen — guide',chapter:'Chapters I, III & VI'},
 {name:'Ivo',role:'The cartographer',note:'Draws the missing coast from fragments of an unfinished map.',links:'Mara — collaborator · Sen — former apprentice',chapter:'Chapters I, II & V'},
 {name:'Sen',role:'The courier',note:'Carries a letter that links the old archive to the outer islands.',links:'Mara — guide · Ivo — mentor',chapter:'Chapters III, IV & VI'},
] as const;
export const events = [
 {id:'opening',title:'The archive opens',year:'312',month:'03',day:'14',chapter:'Chapter I',people:'Mara · Ivo',summary:'Mara opens the sealed archive. Ivo finds a coastline missing from every public map.'},
 {id:'map',title:'The map is decoded',year:'312',month:'06',day:'02',chapter:'Chapter II',people:'Ivo · Sen',summary:'Ivo decodes the map. A note from his former apprentice points towards the outer islands.'},
 {id:'departure',title:'Departure',year:'312',month:'09',day:'21',chapter:'Chapter III',people:'Mara · Sen',summary:'Mara and Sen leave with the map. The archive records their departure, but not their destination.'},
 {id:'letter',title:'A letter arrives',year:'313',month:'01',day:'08',chapter:'Chapter IV',people:'Mara · Sen',summary:'A letter names the island they are looking for. Sen recognises the handwriting.'},
 {id:'crossing',title:'The crossing',year:'313',month:'04',day:'17',chapter:'Chapter V',people:'Ivo · Sen',summary:'Ivo rejoins Sen at the crossing. Their two versions of the map finally meet.'},
 {id:'return',title:'An unfinished return',year:'313',month:'11',day:'03',chapter:'Chapter VI',people:'Mara · Sen',summary:'Mara returns to the archive with new records. One drawer is deliberately left empty.'},
] as const;
export const features=['Timeline','Characters','AI Assistant','Wiki'] as const;
export const captions=[
 ['A whole world, held in one chronology.','Move from years into the shape of a month.','A date leads to a particular moment.','Open a record. Follow its people and chapter.'],
 ['The people living between these pages.','Begin with a character, not an empty diagram.','Follow the relationships already in the story.','Their connections lead back to the chapters.'],
 ['One request, grounded in your story.','A relationship board is prepared as a preview.','Review the proposal before anything is written.','The approved board now has a place in the archive.'],
 ['An entry deserves more than a wall of text.','Place an image beside the story.','Give quotations and details their own rhythm.','A reference can reveal the story behind a name.'],
] as const;
