/*
 * The photos on Jackie's disk, C:\PHOTOS, as PICVIEW shows them. The pictures are
 * rendered by scripts/build-terminal-photos.py; to use real photographs instead,
 * put them through scripts/build-terminal-picture.py under the same names.
 *
 * The ROOM series was taken from a corner of his ceiling, always at 3:07, and not
 * by him. ROOM_010 is taken now: its screen shows whatever this screen showed.
 */
export type Photo = {
  url: string;
  /** When it was taken, as the file says; 'now' for ROOM_010. */
  taken: string;
  /** Loading stops here for a moment (a fraction of the picture), as a bad sector would. */
  stall?: number;
  /** The screen in the picture shows the terminal's own screen. */
  live?: boolean;
};

const url = (id: string) => `/terminal/photos/${id}.png`;

export const PHOTOS: Record<string, Photo> = {
  workshop: { url: url('workshop'), taken: '2029-09-10 18:05' },
  desk: { url: url('desk'), taken: '2029-09-14 16:20' },
  window: { url: url('window'), taken: '2029-10-03 01:40' },
  moth: { url: url('moth'), taken: '2029-11-02 22:15' },
  expo_01: { url: url('expo_01'), taken: '2029-07-14 10:32' },
  expo_02: { url: url('expo_02'), taken: '2029-07-14 10:32' },
  rooms: { url: url('rooms'), taken: '2030-04-02 03:07' },
  print: { url: url('print'), taken: '2030-06-11 19:12' },
  room_001: { url: url('room_001'), taken: '2030-06-30 03:07' },
  room_002: { url: url('room_002'), taken: '2030-07-02 03:07' },
  room_003: { url: url('room_003'), taken: '2030-07-06 03:07' },
  room_004: { url: url('room_004'), taken: '2030-07-09 03:07' },
  room_005: { url: url('room_005'), taken: '2030-07-13 03:07', stall: 0.62 },
  room_006: { url: url('room_006'), taken: '2030-07-16 03:07' },
  room_007: { url: url('room_007'), taken: '2030-07-19 03:07' },
  room_008: { url: url('room_008'), taken: '2030-08-02 03:07', stall: 0.4 },
  room_009: { url: url('room_009'), taken: '2030-08-11 03:07' },
  room_010: { url: url('room_010'), taken: 'now', live: true },
};

/** Where the monitor's screen lies in the ROOM pictures (from the renderer). */
export const ROOM_SCREEN_URL = '/terminal/photos/room-screen.json';
