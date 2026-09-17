import type { ProgramId } from './echo-programs';

export type ProgramReward = { id: string; title: string; body: string[]; art: string[] };
export const REWARD_THRESHOLDS: Record<ProgramId, number> = { survivor: 100, packet: 50, mirror: 250 };

function frame(lines: string[]): string[] {
  const width = Math.max(32, ...lines.map(line => line.length));
  return ['+' + '-'.repeat(width + 2) + '+', ...lines.map(line => `| ${line.padEnd(width)} |`), '+' + '-'.repeat(width + 2) + '+'];
}

const REWARDS: (ProgramReward & { program: ProgramId })[] = [
  {
    id: 'reward-survivor', program: 'survivor', title: 'THE THIRD SHIFT / RECREATION MEMO',
    body: [
      '18 MAR 1981 / TECHNICAL SERVICES / PERSONAL COPY',
      'The night crew asked for another platform in SURVIVOR. They said the little operator needed somewhere higher to stand. I told them this was a break-room program, not a safety exercise. They laughed, then asked again.',
      'Wang used to stop here between experiments. He never fired a shot. He climbed to the upper ledge and left the operator there while he read his notes. Last night he watched the empty lower floor for nearly ten minutes.',
      'I have kept the original drawing below. There are six pixels across the face. It is impossible to tell whether the operator is looking at the room or looking out of it. Tomorrow I will add the platform.',
    ],
    art: frame(['JR RECREATION / SPRITE SHEET 01', '', '             ####', '            ######', '             #  #', '              ##', '             ####', '            ##  ##', '         =============', '           THIRD SHIFT']),
  },
  {
    id: 'reward-packet', program: 'packet', title: 'RETURN ADDRESS / NETWORK TRAINING',
    body: [
      '20 MAR 1981 / NETWORK OPERATIONS / TRAINING ANNOTATION',
      'The packet exercise has no destination. That bothered the new technicians. They wanted a final socket, a delivery receipt, something to prove that the growing line was going somewhere. The instructor told them that keeping a route alive was already a kind of arrival.',
      'Someone changed the training sheet after lunch. Every destination box now contains the same return address: Terminal 07. The change was made while the training volume was still attached to JR-NET; its later local copy preserves the alteration.',
      'Security has asked us to retain both versions. The route below is harmless. It is a picture of a message travelling in circles. That does not explain why the sender thanked us for opening it.',
    ],
    art: frame(['PACKET TRACE / LOCAL COPY', '', '    +------->------->----+', '    |                   |', '    ^     TERMINAL 07   v', '    |                   |', '    +-------<-------<---+', '', '        RETURN TO SENDER']),
  },
  {
    id: 'reward-mirror', program: 'mirror', title: 'AFTERIMAGE / RESPONSE TEST NOTE',
    body: [
      '22 MAR 1981 / DR. WANG / UNSENT LOCAL DRAFT',
      'Five rounds are sufficient. The test was designed to measure a person remembering a machine, not a machine remembering a person. During the last linked trial, the receiver repeated the pattern one interval before the subject pressed the final pad.',
      'This does not establish prediction. We cannot exclude an instruction entering through the same circuit that reports the response. The subject said the sequence felt familiar before it appeared. He also said he had never seen this room before.',
      'I disconnected the transport lead. The anticipatory response stopped. Please keep that detail in the report. A boundary still exists, however badly we have mistaken its location. Do not let the striking result erase the ordinary cable beside it.',
    ],
    art: frame(['NEURAL RESPONSE / AFTERIMAGE', '', '          [1] [2] [3]', '          [4] [5] [6]', '          [7] [8] [9]', '', '     YOU  --->  [ ]  --->  YOU', '', '         TRANSPORT: OPEN CIRCUIT']),
  },
];

/** Optional archive only: these records never grant evidence or main-story access. */
export function rewardsForScores(scores: unknown): ProgramReward[] {
  if (!scores || typeof scores !== 'object' || Array.isArray(scores)) return [];
  const values = scores as Partial<Record<ProgramId, unknown>>;
  return REWARDS.filter(record => {
    const score = values[record.program];
    return typeof score === 'number' && Number.isFinite(score) && score >= REWARD_THRESHOLDS[record.program];
  }).map(({ id, title, body, art }) => ({ id, title, body: [...body], art: [...art] }));
}
