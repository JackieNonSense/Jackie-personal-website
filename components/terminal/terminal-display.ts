import { activeTab, contentFor, files, logs, mails, tabs, type Session, type Action } from './terminal-session';
const C = { text: '#b4e3d9', dim: '#699c97', line: '#294b48', accent: '#d5f2e5' };
export function drawTerminal(ctx: CanvasRenderingContext2D, s: Session) {
  ctx.clearRect(0, 0, 1440, 1000); ctx.fillStyle = '#030b0b'; ctx.fillRect(0, 0, 1440, 1000);
  const light = ctx.createRadialGradient(640, 480, 80, 720, 500, 810); light.addColorStop(0, '#0a1919'); light.addColorStop(1, '#020607');
  ctx.fillStyle = light; ctx.fillRect(0, 0, 1440, 1000); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const text = (label: string, x: number, y: number, size = 28, color = C.text) => { ctx.font = `${size}px Consolas, monospace`; ctx.fillStyle = color; ctx.fillText(label, x, y); };
  const line = (x: number, y: number, x2: number, y2: number) => { ctx.strokeStyle = C.line; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke(); };
  text('TERMLINK / JR INDUSTRIES', 66, 89, 30); text('ECHO / LOCAL', 1120, 89, 25, C.dim); line(66, 116, 1374, 116);
  if (!s.awake) {
    text('JR INDUSTRIES', 485, 437, 40, C.accent); text('REMOTE ARCHIVE / TERMINAL 07', 466, 488, 23, C.dim);
    line(596, 540, 844, 540); text('[ ENTER / TAP TO WAKE ]', 522, 602, 25);
    text('STANDBY', 66, 920, 23, C.dim); text('1981 / LAB 7', 1167, 920, 23, C.dim); return;
  }
  const tab = activeTab(s); line(284, 162, 284, 862); line(1120, 162, 1120, 862);
  tabs.forEach((item, i) => {
    if (item === tab) { ctx.fillStyle = '#12302e'; ctx.fillRect(65, 198 + i * 67, 190, 45); ctx.strokeStyle = '#6da49b'; ctx.strokeRect(65, 198 + i * 67, 190, 45); }
    text(`${String(i + 1).padStart(2, '0')} ${item.toUpperCase()}`, 82, 228 + i * 67, 30, item === tab ? C.accent : C.dim);
  });
  text('PROJECT', 1161, 228, 23, C.dim); text('ECHO', 1161, 262, 32);
  text('LINK', 1161, 349, 23, C.dim); text('OFFLINE', 1161, 383, 22);
  text('UNREAD', 1161, 470, 23, C.dim); text(String(mails.length - s.readIds.length).padStart(2, '0'), 1161, 504, 32);
  text('SESSION', 1161, 711, 23, C.dim); text('GUEST', 1161, 745, 28);
  if (s.view === 'mail') {
    text('INBOX / 07 RECORDS', 329, 230, 28);
    mails.forEach((m, i) => {
      const y = 319 + i * 72;
      if (i === s.selected) { ctx.fillStyle = '#122a29'; ctx.fillRect(314, y - 25, 779, 62); ctx.fillStyle = '#89cfc0'; ctx.fillRect(314, y - 25, 3, 62); }
      text(`${s.readIds.includes(m.id) ? ' ' : '·'} ${m.from}`, 332, y, 25, C.dim);
      text(m.date, 931, y, 21, C.dim); text(m.subject, 354, y + 27, 30);
    });
  } else if (s.view === 'files') {
    text('FILES / LOCAL ARCHIVE', 329, 230, 28); text(files.name, 329, 277, 21, C.dim);
    files.children!.forEach((f, i) => { const y = 366 + i * 95; if (i === s.selected) { ctx.fillStyle = '#122a29'; ctx.fillRect(314, y - 33, 779, 68); } text(f.name, 341, y, 32); text(f.type === 'encrypted' ? 'LOCKED' : 'TEXT', 953, y, 21, C.dim); });
  } else if (s.view === 'logs') {
    text('SYSTEM LOG / ARCHIVE', 329, 230, 28);
    logs.slice(s.scroll, s.scroll + 8).forEach((l, i) => { const y = 312 + i * 64; text(`${l.timestamp} / ${l.level}`, 329, y, 20, l.level === 'CRITICAL' ? '#ceae7c' : C.dim); text(l.message, 329, y + 28, 28); });
  } else if (s.view === 'game') { text('SURVIVOR / LOCAL PROGRAM', 329, 230, 32); text('W A S D / MOVE     J / FIRE', 329, 308, 22); }
  else {
    const content = contentFor(s); text(content.title, 329, 230, 32); text(content.subtitle, 329, 277, 23, C.dim); line(329, 302, 1090, 302);
    content.body.forEach((l, i) => text(l, 329, 364 + i * 40, 32));
  }
  line(66, 890, 1374, 890); text('↑ ↓ SELECT   ENTER OPEN   ESC BACK', 66, 937, 21, C.dim);
  text('TERMLINK v1.25', 1140, 937, 21, C.dim);
}
export function displayAction(x: number, y: number, s: Session): Action | undefined {
  if (!s.awake) return { type: 'wake' };
  if (x > 65 && x < 255 && y > 198 && y < 533) return { type: 'navigate', view: tabs[Math.floor((y - 198) / 67)] };
  if (x > 314 && x < 1093 && s.view === 'mail' && y > 294 && y < 798) {
    const index = Math.floor((y - 294) / 72); return index === s.selected ? { type: 'open' } : { type: 'select', index };
  }
  if (x > 314 && x < 1093 && s.view === 'files' && y > 333 && y < 618) {
    const index = Math.floor((y - 333) / 95); return index === s.selected ? { type: 'open' } : { type: 'select', index };
  }
  if (y > 890) return { type: 'back' };
}

