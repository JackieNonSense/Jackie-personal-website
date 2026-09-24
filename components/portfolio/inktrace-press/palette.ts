// Three inks on the sheet. The sheet itself is the paper, so index 0 is left unprinted.
export const PAPER=0,INK=1,BLUE=2,PALE=3;
export const INK_RGBA:readonly (readonly [number,number,number,number])[]=[
 [0,0,0,0],
 [0x23,0x24,0x1f,255],
 [0x24,0x4a,0xaa,255],
 [0x41,0x66,0xb5,255],
];
