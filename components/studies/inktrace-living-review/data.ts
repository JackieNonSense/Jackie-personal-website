export type ReviewScene = {
 id:'timeline'|'characters'|'ai'|'wiki';
 title:string;
 subtitle:string;
 duration:string;
 premise:string;
 defaultState:string;
 expandedState:string;
 steps:{time:string;title:string;description:string}[];
 takeover:string;
};

/** Art-review scripts, not claims that these production scenes already exist. */
export const reviewScenes:readonly ReviewScene[]=[
 {
  id:'timeline',title:'Timeline',subtitle:'The time scroll',duration:'18 seconds',
  premise:'A folded chronology becomes a route through the archive. Scale is a real change in structure: years, then months, then individual records.',
  defaultState:'Two folded yearly bundles. The courier waits beside the time rail; the reading slot shows the year overview.',
  expandedState:'One bundle unfolds into month and date nodes. The courier delivers the chosen record into the lower slot, leaving the route clear.',
  steps:[
   {time:'00–04s',title:'Unfold',description:'Two year bundles open onto the long paper rail. Aggregate markers remain separate from the walking lane.'},
   {time:'04–09s',title:'Enter a year',description:'A year opens into months; the selected month spreads into dated event nodes.'},
   {time:'09–15s',title:'Deliver a record',description:'The courier walks with changing footfalls, stops at the event, then carries its record down to the reading slot.'},
   {time:'15–18s',title:'Read the connection',description:'The event, people and connected chapter stay visible. The stage is still available for the next selection.'},
  ],
  takeover:'Choose a year, open an event group, then select a record. A click stops the automatic demonstration until Replay is requested.',
 },
 {
  id:'characters',title:'Characters',subtitle:'The index courtyard',duration:'14 seconds',
  premise:'Three separate archive doors open onto one paper courtyard. Relationships are paths between people, not floating cards over their heads.',
  defaultState:'Mara, Ivo and Sen arrive from separate archive entrances. Their standing pads and labels have their own clear space.',
  expandedState:'The selected person turns toward a linked character. Cobalt paths join the pads; a compact chapter index enters the lower slot.',
  steps:[
   {time:'00–04s',title:'Arrive',description:'Three characters leave their own archive entrances and walk to distinct paper platforms.'},
   {time:'04–08s',title:'Turn toward a person',description:'Mara turns toward Ivo. Related people move to reachable nodes, without merging or hiding one another.'},
   {time:'08–11s',title:'Connect',description:'Existing relationship paths draw along the floor in short segments, then receive concise labels.'},
   {time:'11–14s',title:'File appearances',description:'Chapter references enter the lower index. All three characters remain visible and selectable.'},
  ],
  takeover:'Select any person to inspect existing relationships and appearances. The scene does not invent or automatically infer relationships.',
 },
 {
  id:'ai',title:'AI Assistant',subtitle:'The relation desk',duration:'16 seconds + your decision',
  premise:'A paper request enters a small arrangement desk. Existing character files become a proposed network, with a deliberate stop before anything is filed.',
  defaultState:'An empty arrangement surface, three source files and a request slot. Nothing has been created.',
  expandedState:'Three proposed nodes are connected on the preview sheet. The reserved lower slot says Waiting for confirmation, with confirm and re-preview actions.',
  steps:[
   {time:'00–04s',title:'Ask once',description:'A short request is typed into the paper slot: organise these characters and show their relationships.'},
   {time:'04–10s',title:'Bring the sources',description:'Three existing character files arrive one by one. Their contents become visible preview nodes.'},
   {time:'10–16s',title:'Review the proposal',description:'Connections are assembled into a readable network. The sequence stops at Waiting for confirmation.'},
   {time:'YOUR CLICK',title:'Confirm, then archive',description:'Only your confirmation starts the archive action. Without that click, no created or saved state appears.'},
  ],
  takeover:'Confirm the preview or arrange it again. This is independent sample content; no AI request or InkTrace API is called.',
 },
 {
  id:'wiki',title:'Wiki',subtitle:'The typesetting workshop',duration:'22 seconds',
  premise:'A large working page, not a miniature editor screenshot. A typesetter brings material while the page demonstrates real editorial layout.',
  defaultState:'A broad illustration sits above the article. The typesetter waits outside the text area with a quote slip and an index card.',
  expandedState:'The illustration sits beside wrapped text; the quote has moved into the article. A linked record is open in the lower slot, never on top of the page.',
  steps:[
   {time:'00–05s',title:'Bring the material',description:'The typesetter carries the illustration and quote slip to the page edge; heading and article already have readable space.'},
   {time:'05–11s',title:'Make room for the story',description:'The image narrows and moves right; live text reflows around it. This changes the actual layout, not just an animated screenshot.'},
   {time:'11–17s',title:'Set the quotation',description:'The quote moves between paragraphs and receives its attribution. A linked name is selected in the article.'},
   {time:'17–22s',title:'Read without leaving',description:'The linked record appears in the lower index. The finished article remains fully visible for at least three seconds.'},
  ],
  takeover:'Resize the image by its handle or choose Wide / Wrap left / Wrap right. Move the quote and open linked records without leaving the page.',
 },
];
