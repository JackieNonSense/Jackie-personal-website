export type MusicTrack = { id: string; title: string; artist: string; src: string; sourceUrl: string; licenseUrl: string; credit: string };
const licenseUrl = "https://creativecommons.org/licenses/by/4.0/";
export const musicTracks: readonly MusicTrack[] = [
  { id: "edm-detection", title: "EDM Detection Mode", artist: "Kevin MacLeod", src: "/audio/edm-detection-mode.mp3", sourceUrl: "https://incompetech.com/music/royalty-free/index.html?Search=Search&isrc=USUAN1500026", licenseUrl, credit: '"EDM Detection Mode" Kevin MacLeod (incompetech.com). Licensed under Creative Commons: By Attribution 4.0 License. Unmodified audio.' },
  { id: "voxel-revolution", title: "Voxel Revolution", artist: "Kevin MacLeod", src: "/audio/voxel-revolution.mp3", sourceUrl: "https://incompetech.com/music/royalty-free/index.html?Search=Search&isrc=USUAN2000025", licenseUrl, credit: '"Voxel Revolution" Kevin MacLeod (incompetech.com). Licensed under Creative Commons: By Attribution 4.0 License. Unmodified audio.' },
];
