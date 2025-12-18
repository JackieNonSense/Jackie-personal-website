"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ==================== TYPES ====================
type BootPhase = 'logo' | 'pressEnter' | 'password' | 'verifying' | 'loading' | 'welcome' | 'ready' | 'locked';
type ViewType = 'menu' | 'mail-list' | 'mail-read' | 'files' | 'file-view' | 'logs' | 'system' | 'game';

interface Mail {
  id: number;
  from: string;
  subject: string;
  date: string;
  body: string[];
  read: boolean;
  important?: boolean;
}

interface FileNode {
  name: string;
  type: 'file' | 'folder' | 'encrypted';
  content?: string[];
  children?: FileNode[];
}

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  message: string;
}

interface Platform {
  x: number;
  y: number;
  w: number;
}

interface GameState {
  playerX: number;
  playerY: number;
  playerVelY: number;
  onGround: boolean;
  facing: 1 | -1;
  bullets: { x: number; y: number; dir: number }[];
  enemies: { x: number; y: number; type: number }[];
  score: number;
  gameOver: boolean;
  spawnTimer: number;
  shootCooldown: number;
}

interface TerminalState {
  bootPhase: BootPhase;
  currentView: ViewType;
  selectedIndex: number;
  inputBuffer: string;
  passwordAttempts: number;
  mails: Mail[];
  selectedMail: Mail | null;
  files: FileNode;
  selectedFile: FileNode | null;
  logs: LogEntry[];
  logScrollOffset: number;
  gameState: GameState | null;
  loadingProgress: number;
  verifyLines: number; // Track how many verification lines to show
}

// ==================== GAME PLATFORMS ====================
const PLATFORMS: Platform[] = [
  { x: 0, y: 320, w: 512 },      // Ground
  { x: 80, y: 250, w: 100 },     // Platform 1
  { x: 250, y: 200, w: 80 },     // Platform 2
  { x: 380, y: 260, w: 90 },     // Platform 3
  { x: 150, y: 150, w: 70 },     // High platform
];

// ==================== PIXEL SPRITES ====================
const PLAYER_SPRITE = [
  "  ██  ",
  " ████ ",
  "██████",
  " █  █ ",
  "  ██  ",
  " ████ ",
  "██  ██",
  "█ ██ █",
  "  ██  ",
  " █  █ ",
];

const ENEMY_SPRITE = [
  " ████ ",
  "██████",
  "█ ██ █",
  "██████",
  " ████ ",
  " █  █ ",
];

// ==================== DATA ====================
const CORRECT_PASSWORD = "3c5614";

const INITIAL_MAILS: Mail[] = [
  { id: 1, from: "ADMIN", subject: "Welcome to JR Industries", date: "1981-03-15",
    body: ["Welcome to JR Industries!", "", "You have been assigned to", "Project ECHO in Lab 7.", "", "Report to Dr. Wang.", "", "- Admin"], read: false, important: true },
  { id: 2, from: "DR. WANG", subject: "Project ECHO Results", date: "1981-03-18",
    body: ["The samples are extraordinary.", "", "The organism shows neural", "interface capabilities.", "", "It responds to thoughts.", "", "- Dr. Wang"], read: false },
  { id: 3, from: "UNKNOWN", subject: "They can hear you", date: "1981-03-20",
    body: ["Do not trust what you see.", "", "It came from THEM.", "It learns. It controls.", "", "Get out while you can."], read: false, important: true },
  { id: 4, from: "SECURITY", subject: "Lab 7 Breach", date: "1981-03-21",
    body: ["SECURITY ALERT", "", "Unauthorized access detected.", "Biometric override at 03:47."], read: false },
  { id: 5, from: "DR. WANG", subject: "Strange Behavior", date: "1981-03-22",
    body: ["Staff acting synchronized.", "Same movements. Same words.", "", "I can hear whispers.", "We made a mistake."], read: false },
  { id: 6, from: "[CORRUPTED]", subject: "j0!n u5", date: "1981-03-23",
    body: ["WE ARE ONE", "YOU WILL JOIN US", "THE ECHO SPREADS"], read: false, important: true },
  { id: 7, from: "ADMIN", subject: "EVACUATION", date: "1981-03-23",
    body: ["!!! EMERGENCY !!!", "", "CONTAINMENT FAILURE.", "EVACUATE IMMEDIATELY.", "", "[SIGNAL LOST]"], read: false, important: true }
];

const INITIAL_FILES: FileNode = {
  name: "/home/user", type: 'folder',
  children: [
    { name: "notes.txt", type: 'file', content: ["Personal Log", "Day 1: Excited for ECHO.", "", "Day 5: Something wrong.", "", "Day 8: I hear them now."] },
    { name: "project.dat", type: 'file', content: ["PROJECT ECHO", "Origin: Site X", "", "Capabilities:", "- Telepathy", "- Neural control"] },
    { name: "classified.doc", type: 'encrypted', content: ["[ACCESS DENIED]"] },
  ]
};

const INITIAL_LOGS: LogEntry[] = [
  { timestamp: "1981-03-01 06:00", level: "INFO", message: "TERMLINK v1.25 initialized" },
  { timestamp: "1981-03-01 06:01", level: "INFO", message: "Network connection established" },
  { timestamp: "1981-03-05 09:00", level: "INFO", message: "New user: Dr. Wang assigned" },
  { timestamp: "1981-03-08 11:30", level: "INFO", message: "Project ECHO files created" },
  { timestamp: "1981-03-10 14:00", level: "INFO", message: "Lab 7 access granted" },
  { timestamp: "1981-03-12 08:45", level: "INFO", message: "Specimen containment active" },
  { timestamp: "1981-03-14 16:20", level: "INFO", message: "Neural interface test #1" },
  { timestamp: "1981-03-15 08:00", level: "INFO", message: "System boot - normal" },
  { timestamp: "1981-03-15 23:00", level: "INFO", message: "Backup completed" },
  { timestamp: "1981-03-16 02:30", level: "WARN", message: "Unusual EM readings" },
  { timestamp: "1981-03-17 04:15", level: "INFO", message: "Dr. Wang late login" },
  { timestamp: "1981-03-18 14:22", level: "INFO", message: "Lab 7: Sample extraction" },
  { timestamp: "1981-03-19 01:00", level: "WARN", message: "Containment temp spike" },
  { timestamp: "1981-03-19 03:33", level: "WARN", message: "Motion in Corridor B" },
  { timestamp: "1981-03-20 03:00", level: "WARN", message: "Network anomaly detected" },
  { timestamp: "1981-03-20 03:01", level: "ERROR", message: "Unknown device on network" },
  { timestamp: "1981-03-20 15:00", level: "WARN", message: "Staff: erratic behavior" },
  { timestamp: "1981-03-21 00:00", level: "ERROR", message: "Surveillance offline" },
  { timestamp: "1981-03-21 03:47", level: "ERROR", message: "Biometric override" },
  { timestamp: "1981-03-21 03:48", level: "CRITICAL", message: "DOOR 7 FORCED OPEN" },
  { timestamp: "1981-03-22 00:00", level: "WARN", message: "Sync behavior in staff" },
  { timestamp: "1981-03-22 12:00", level: "ERROR", message: "Comms corrupted" },
  { timestamp: "1981-03-22 18:30", level: "CRITICAL", message: "ECHO ACTIVE" },
  { timestamp: "1981-03-23 01:00", level: "CRITICAL", message: "CONTAINMENT FAILURE" },
  { timestamp: "1981-03-23 02:15", level: "CRITICAL", message: "FULL BREACH" },
  { timestamp: "1981-03-23 02:17", level: "CRITICAL", message: "EVACUATION ORDER" },
  { timestamp: "1981-03-23 02:19", level: "CRITICAL", message: "W3 4R3 0N3" },
  { timestamp: "1981-03-23 02:20", level: "CRITICAL", message: "[SIGNAL LOST]" },
];

// Professional 1981-style ASCII Logo - Impressive Design
const BOOT_LOGO = [
  "",
  "  ╔════════════════════════════════════════════",
  "  ║                                            ",
  "  ║      ██╗██████╗    ██╗███╗   ██╗██████╗    ",
  "  ║      ██║██╔══██╗   ██║████╗  ██║██╔══██╗   ",
  "  ║      ██║██████╔╝   ██║██╔██╗ ██║██║  ██║   ",
  "  ║ ██   ██║██╔══██╗   ██║██║╚██╗██║██║  ██║   ",
  "  ║ ╚█████╔╝██║  ██║   ██║██║ ╚████║██████╔╝   ",
  "  ║  ╚════╝ ╚═╝  ╚═╝   ╚═╝╚═╝  ╚═══╝╚═════╝    ",
  "  ║                                            ",
  "  ║  ══════════════════════════════════════    ",
  "  ║        I  N  D  U  S  T  R  I  E  S        ",
  "  ║  ══════════════════════════════════════    ",
  "  ║                                            ",
  "  ║       TERMLINK OPERATING SYSTEM v1.25      ",
  "  ║       (C) 1981 JR Industries Inc.          ",
  "  ║                                            ",
  "  ╚════════════════════════════════════════════",
];

const MAIN_MENU = [
  { label: "MAIL", desc: "Check messages" },
  { label: "FILES", desc: "Browse files" },
  { label: "LOGS", desc: "System logs" },
  { label: "SYSTEM", desc: "System info" },
  { label: "GAME", desc: "SURVIVOR" },
  { label: "LOGOUT", desc: "Exit system" },
];

const GROUND_Y = 320;
const GRAVITY = 600;
const JUMP_FORCE = -280;
const PLAYER_SPEED = 100;

// ==================== COMPONENT ====================
interface CRTScreenProps {
  position?: [number, number, number];
}

export default function CRTScreen({ position = [0, 0, 0] }: CRTScreenProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const keysRef = useRef<Set<string>>(new Set());

  const [state, setState] = useState<TerminalState>({
    bootPhase: 'logo',
    currentView: 'menu',
    selectedIndex: 0,
    inputBuffer: "",
    passwordAttempts: 0,
    mails: INITIAL_MAILS,
    selectedMail: null,
    files: INITIAL_FILES,
    selectedFile: null,
    logs: INITIAL_LOGS,
    logScrollOffset: 0,
    gameState: null,
    loadingProgress: 0,
    verifyLines: 0,
  });

  const [cursorVisible, setCursorVisible] = useState(true);
  const [logoLines, setLogoLines] = useState(0);

  // Use ref to track latest state for keyboard handler
  const stateRef = useRef(state);
  stateRef.current = state;

  const { canvas, texture, screenMaterial } = useMemo(() => {
    const cvs = document.createElement('canvas');
    cvs.width = 512;
    cvs.height = 384;
    const ctx = cvs.getContext('2d');
    if (ctx) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 512, 384); }
    const tex = new THREE.CanvasTexture(cvs);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
    return { canvas: cvs, texture: tex, screenMaterial: mat };
  }, []);

  // Boot sequence
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    BOOT_LOGO.forEach((_, i) => {
      timers.push(setTimeout(() => setLogoLines(i + 1), 50 + i * 80));
    });
    timers.push(setTimeout(() => setState(p => ({ ...p, bootPhase: 'pressEnter' })), 2500));
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setCursorVisible(v => !v), 500);
    return () => clearInterval(interval);
  }, []);

  // Verifying phase - scrolling terminal commands
  const VERIFY_COMMANDS = [
    "> Connecting to JR-NET...",
    "> Connection established",
    "> Loading user database...",
    "> Authenticating credentials...",
    "> Checking password hash...",
    "> Verifying clearance level...",
    "> Accessing employee records...",
    "> Employee #777 found",
    "> Clearance: LEVEL 5",
    "> ACCESS GRANTED",
  ];

  useEffect(() => {
    if (state.bootPhase !== 'verifying') return;

    let lineIndex = 0;
    setState(p => ({ ...p, verifyLines: 0 })); // Reset

    const interval = setInterval(() => {
      if (lineIndex < VERIFY_COMMANDS.length) {
        lineIndex++;
        setState(p => ({ ...p, verifyLines: lineIndex }));
      } else {
        clearInterval(interval);
        // Delay before loading
        setTimeout(() => {
          setState(p => ({ ...p, bootPhase: 'loading', loadingProgress: 0, verifyLines: 0 }));
        }, 800);
      }
    }, 180 + Math.random() * 120); // Staggered timing

    return () => clearInterval(interval);
  }, [state.bootPhase]);

  // Loading progress with stutter
  useEffect(() => {
    if (state.bootPhase !== 'loading') return;

    const stutter = [0, 15, 30, 32, 33, 50, 65, 70, 71, 85, 95, 100];
    let i = 0;
    const interval = setInterval(() => {
      if (i < stutter.length) {
        setState(p => ({ ...p, loadingProgress: stutter[i] }));
        i++;
      } else {
        clearInterval(interval);
        setState(p => ({ ...p, bootPhase: 'welcome', loadingProgress: 100 }));
      }
    }, 200 + Math.random() * 150);

    return () => clearInterval(interval);
  }, [state.bootPhase]);

  // Welcome phase - show welcome animation then transition to ready
  useEffect(() => {
    if (state.bootPhase !== 'welcome') return;

    const timer = setTimeout(() => {
      setState(p => ({ ...p, bootPhase: 'ready' }));
    }, 3000); // Show welcome for 3 seconds

    return () => clearTimeout(timer);
  }, [state.bootPhase]);

  const initGame = useCallback(() => {
    setState(p => ({
      ...p,
      currentView: 'game',
      gameState: {
        playerX: 60,
        playerY: GROUND_Y - 20,
        playerVelY: 0,
        onGround: true,
        facing: 1,
        bullets: [],
        enemies: [],
        score: 0,
        gameOver: false,
        spawnTimer: 0,
        shootCooldown: 0,
      }
    }));
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    keysRef.current.add(key);

    // Use ref for latest state to avoid stale closure
    const { bootPhase, currentView, selectedIndex, inputBuffer, mails, files, gameState } = stateRef.current;

    if (bootPhase === 'pressEnter' && e.key === 'Enter') {
      setState(p => ({ ...p, bootPhase: 'password', inputBuffer: "" }));
      return;
    }

    if (bootPhase === 'password') {
      if (e.key === 'Enter') {
        if (inputBuffer.toLowerCase() === CORRECT_PASSWORD) {
          setState(p => ({ ...p, bootPhase: 'verifying', loadingProgress: 0 }));
        } else {
          const newAttempts = stateRef.current.passwordAttempts + 1;
          if (newAttempts >= 3) {
            // Lock after 3 failed attempts
            setState(p => ({ ...p, bootPhase: 'locked', passwordAttempts: newAttempts, inputBuffer: "" }));
          } else {
            setState(p => ({ ...p, passwordAttempts: newAttempts, inputBuffer: "" }));
          }
        }
      } else if (e.key === 'Backspace') {
        setState(p => ({ ...p, inputBuffer: p.inputBuffer.slice(0, -1) }));
      } else if (e.key.length === 1 && inputBuffer.length < 20) {
        setState(p => ({ ...p, inputBuffer: p.inputBuffer + e.key }));
      }
      return;
    }

    if (bootPhase !== 'ready') return;

    if (currentView === 'game') {
      if (e.key === 'Escape') setState(p => ({ ...p, currentView: 'menu', gameState: null, selectedIndex: 4 }));
      if (key === 'r' && gameState?.gameOver) initGame();
      return;
    }

    if (e.key === 'Escape') {
      if (currentView === 'mail-read') setState(p => ({ ...p, currentView: 'mail-list', selectedMail: null }));
      else if (currentView === 'file-view') setState(p => ({ ...p, currentView: 'files', selectedFile: null }));
      else if (currentView !== 'menu') setState(p => ({ ...p, currentView: 'menu', selectedIndex: 0 }));
      return;
    }

    const fileCount = (files.children || []).length;

    if (e.key === 'ArrowUp') {
      if (currentView === 'menu') setState(p => ({ ...p, selectedIndex: Math.max(0, p.selectedIndex - 1) }));
      else if (currentView === 'mail-list') setState(p => ({ ...p, selectedIndex: Math.max(0, p.selectedIndex - 1) }));
      else if (currentView === 'files') setState(p => ({ ...p, selectedIndex: Math.max(0, p.selectedIndex - 1) }));
      else if (currentView === 'logs') setState(p => ({ ...p, logScrollOffset: Math.max(0, p.logScrollOffset - 1) }));
      return;
    }

    if (e.key === 'ArrowDown') {
      if (currentView === 'menu') setState(p => ({ ...p, selectedIndex: Math.min(MAIN_MENU.length - 1, p.selectedIndex + 1) }));
      else if (currentView === 'mail-list') setState(p => ({ ...p, selectedIndex: Math.min(mails.length - 1, p.selectedIndex + 1) }));
      else if (currentView === 'files') setState(p => ({ ...p, selectedIndex: Math.min(fileCount - 1, p.selectedIndex + 1) }));
      else if (currentView === 'logs') setState(p => ({ ...p, logScrollOffset: Math.min(state.logs.length - 5, p.logScrollOffset + 1) }));
      return;
    }

    if (e.key === 'Enter') {
      if (currentView === 'menu') {
        if (selectedIndex === 4) initGame();
        else if (selectedIndex === 5) {
          // LOGOUT - reset to password screen
          setState(p => ({
            ...p,
            bootPhase: 'pressEnter',
            currentView: 'menu',
            selectedIndex: 0,
            inputBuffer: "",
            passwordAttempts: 0,
          }));
        }
        else {
          const views: ViewType[] = ['mail-list', 'files', 'logs', 'system'];
          setState(p => ({ ...p, currentView: views[selectedIndex], selectedIndex: 0 }));
        }
      } else if (currentView === 'mail-list') {
        const mail = mails[selectedIndex];
        if (mail) {
          const updated = mails.map(m => m.id === mail.id ? { ...m, read: true } : m);
          setState(p => ({ ...p, selectedMail: mail, mails: updated, currentView: 'mail-read' }));
        }
      } else if (currentView === 'files') {
        const file = (files.children || [])[selectedIndex];
        if (file && (file.type === 'file' || file.type === 'encrypted')) {
          setState(p => ({ ...p, selectedFile: file, currentView: 'file-view' }));
        }
      }
      return;
    }

    if (['1','2','3','4','5','6'].includes(e.key) && currentView === 'menu') {
      const idx = parseInt(e.key) - 1;
      if (idx === 4) initGame();
      else if (idx === 5) {
        // LOGOUT
        setState(p => ({
          ...p,
          bootPhase: 'pressEnter',
          currentView: 'menu',
          selectedIndex: 0,
          inputBuffer: "",
          passwordAttempts: 0,
        }));
      }
      else {
        const views: ViewType[] = ['mail-list', 'files', 'logs', 'system'];
        setState(p => ({ ...p, currentView: views[idx], selectedIndex: 0 }));
      }
    }
  }, [initGame]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysRef.current.delete(e.key.toLowerCase());
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Game loop with platform collision
  useFrame((_, delta) => {
    if (state.currentView !== 'game' || !state.gameState || state.gameState.gameOver) return;

    const dt = Math.min(delta, 0.05);
    let { playerX, playerY, playerVelY, onGround, facing, bullets, enemies, score, spawnTimer, shootCooldown } = state.gameState;

    if (keysRef.current.has('a')) { playerX -= PLAYER_SPEED * dt; facing = -1; }
    if (keysRef.current.has('d')) { playerX += PLAYER_SPEED * dt; facing = 1; }
    playerX = Math.max(10, Math.min(480, playerX));

    if (keysRef.current.has('w') && onGround) {
      playerVelY = JUMP_FORCE;
      onGround = false;
    }

    playerVelY += GRAVITY * dt;
    playerY += playerVelY * dt;

    // Platform collision
    onGround = false;
    for (const plat of PLATFORMS) {
      if (playerX + 12 > plat.x && playerX < plat.x + plat.w &&
          playerY + 20 >= plat.y && playerY + 20 <= plat.y + 10 && playerVelY >= 0) {
        playerY = plat.y - 20;
        playerVelY = 0;
        onGround = true;
        break;
      }
    }

    shootCooldown -= dt;
    if (keysRef.current.has('j') && shootCooldown <= 0) {
      bullets.push({ x: playerX + (facing > 0 ? 12 : -4), y: playerY + 6, dir: facing });
      shootCooldown = 0.18;
    }

    bullets = bullets.map(b => ({ ...b, x: b.x + b.dir * 280 * dt })).filter(b => b.x > 0 && b.x < 512);

    spawnTimer += dt;
    if (spawnTimer > 1.8 - Math.min(score / 200, 1)) {
      const platIdx = Math.floor(Math.random() * PLATFORMS.length);
      const plat = PLATFORMS[platIdx];
      enemies.push({ x: 500, y: plat.y - 12, type: 0 });
      spawnTimer = 0;
    }

    enemies = enemies.map(e => ({ ...e, x: e.x - (50 + score * 0.3) * dt }));

    let gameOver = false;
    enemies = enemies.filter(enemy => {
      const hit = bullets.some(b => Math.abs(b.x - enemy.x) < 12 && Math.abs(b.y - enemy.y) < 12);
      if (hit) {
        score += 10;
        bullets = bullets.filter(b => !(Math.abs(b.x - enemy.x) < 12 && Math.abs(b.y - enemy.y) < 12));
        return false;
      }
      if (Math.abs(enemy.x - playerX) < 12 && Math.abs(enemy.y - playerY) < 16) {
        gameOver = true;
      }
      return enemy.x > -20;
    });

    setState(p => ({
      ...p,
      gameState: { playerX, playerY, playerVelY, onGround, facing, bullets, enemies, score, gameOver, spawnTimer, shootCooldown }
    }));
  });

  const drawSprite = (ctx: CanvasRenderingContext2D, sprite: string[], x: number, y: number, color: string, flip = false) => {
    ctx.fillStyle = color;
    sprite.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        if (row[rx] === '█') {
          const px = flip ? x + (row.length - 1 - rx) * 2 : x + rx * 2;
          ctx.fillRect(px, y + ry * 2, 2, 2);
        }
      }
    });
  };

  // Render
  useFrame(() => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 512, 384);

    ctx.font = '12px monospace';
    ctx.fillStyle = '#00ff00';
    ctx.shadowColor = '#00ff00';
    ctx.shadowBlur = 3; // Increased glow

    const { bootPhase, currentView, selectedIndex, inputBuffer, mails, selectedMail, files, selectedFile, logs, logScrollOffset, gameState, passwordAttempts, loadingProgress } = state;
    const lh = 14;
    let y = 60; // Moved down

    // Boot logo - centered
    if (bootPhase === 'logo' || bootPhase === 'pressEnter') {
      ctx.font = '9px monospace';
      y = 40; // Start higher to fit new logo
      BOOT_LOGO.slice(0, logoLines).forEach(line => {
        ctx.fillText(line, 20, y);
        y += 14;
      });
      if (bootPhase === 'pressEnter') {
        y += 15;
        ctx.font = '12px monospace';
        ctx.fillText(">>> Press ENTER to continue <<<", 125, y);
      }
    }
    // Password - left aligned
    else if (bootPhase === 'password') {
      y = 100;
      ctx.fillText("JR INDUSTRIES (TM) TERMLINK", 40, y); y += 30;
      ctx.fillText("ENTER PASSWORD NOW", 40, y); y += 25;
      if (passwordAttempts > 0) {
        ctx.fillStyle = '#ffaa00';
        ctx.shadowColor = '#ffaa00';
        ctx.fillText(`INCORRECT. ${3 - passwordAttempts} ATTEMPTS LEFT.`, 40, y);
        ctx.fillStyle = '#00ff00';
        ctx.shadowColor = '#00ff00';
      }
      y += 30;
      ctx.fillText("> " + "*".repeat(inputBuffer.length) + (cursorVisible ? "_" : " "), 40, y);
    }
    // LOCKED state - retro alarm animation
    else if (bootPhase === 'locked') {
      ctx.textAlign = 'center';
      y = 120;

      // Alternating red/dark red for retro flicker
      const isFlash = cursorVisible;

      ctx.fillStyle = isFlash ? '#ff0000' : '#880000';
      ctx.shadowColor = isFlash ? '#ff0000' : '#880000';
      ctx.shadowBlur = isFlash ? 15 : 5;

      ctx.font = 'bold 14px monospace';
      ctx.fillText("*** SECURITY ALERT ***", 256, y);
      y += 50;

      ctx.font = 'bold 22px monospace';
      ctx.fillText("ACCESS DENIED", 256, y);
      y += 50;

      ctx.font = '12px monospace';
      ctx.fillStyle = isFlash ? '#ff4444' : '#660000';
      ctx.fillText("TERMINAL LOCKED", 256, y);
      y += 50;

      // Blinking INTRUDER ALERT with ASCII style
      if (isFlash) {
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(">>> INTRUDER ALERT <<<", 256, y);
      }

      ctx.shadowBlur = 3;
      ctx.textAlign = 'left';
    }
    // Verifying password phase - scrolling terminal effect
    else if (bootPhase === 'verifying') {
      ctx.textAlign = 'left';
      ctx.font = '11px monospace';

      y = 60;
      ctx.fillStyle = '#008800';
      ctx.fillText("JR INDUSTRIES (TM) TERMLINK", 30, y);
      y += 25;
      ctx.fillText("────────────────────────────────", 30, y);
      y += 20;

      ctx.fillStyle = '#00ff00';

      // Show commands one by one
      VERIFY_COMMANDS.slice(0, state.verifyLines).forEach((cmd, i) => {
        // Last visible line gets typing cursor effect
        if (i === state.verifyLines - 1) {
          ctx.fillStyle = '#00ff00';
          ctx.fillText(cmd + (cursorVisible ? "█" : ""), 30, y);
        } else {
          // Previous lines slightly dimmer
          ctx.fillStyle = '#00aa00';
          ctx.fillText(cmd, 30, y);
        }
        y += 16;
      });

      // Blinking cursor at bottom if still typing
      if (state.verifyLines < VERIFY_COMMANDS.length && cursorVisible) {
        ctx.fillStyle = '#00ff00';
        ctx.fillText(">", 30, y);
      }
    }
    // Loading with progress bar
    else if (bootPhase === 'loading') {
      y = 140;
      ctx.textAlign = 'center';
      ctx.fillText("LOADING SYSTEM...", 256, y); y += 30;

      // Progress bar
      const barWidth = 200;
      const barX = 156;
      ctx.strokeStyle = '#00ff00';
      ctx.strokeRect(barX, y, barWidth, 16);
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(barX + 2, y + 2, (barWidth - 4) * (loadingProgress / 100), 12);

      y += 30;
      ctx.fillText(`${loadingProgress}%`, 256, y);
      ctx.textAlign = 'left';
    }
    // Welcome animation phase
    else if (bootPhase === 'welcome') {
      ctx.textAlign = 'center';

      // ASCII Welcome Banner with glow effect
      const welcomeArt = [
        "╔══════════════════════════════════════╗",
        "║                                      ║",
        "║   ██╗    ██╗███████╗██╗      ██████╗ ║",
        "║   ██║    ██║██╔════╝██║     ██╔════╝ ║",
        "║   ██║ █╗ ██║█████╗  ██║     ██║      ║",
        "║   ██║███╗██║██╔══╝  ██║     ██║      ║",
        "║   ╚███╔███╔╝███████╗███████╗╚██████╗ ║",
        "║    ╚══╝╚══╝ ╚══════╝╚══════╝ ╚═════╝ ║",
        "║                                      ║",
        "║           ACCESS GRANTED             ║",
        "║                                      ║",
        "║      Welcome back, Employee 777      ║",
        "║                                      ║",
        "╚══════════════════════════════════════╝",
      ];

      ctx.font = '10px monospace';
      ctx.fillStyle = '#00ff00';
      ctx.shadowColor = '#00ff00';
      ctx.shadowBlur = 8; // Extra glow for welcome

      y = 80;
      welcomeArt.forEach(line => {
        ctx.fillText(line, 256, y);
        y += 16;
      });

      // Blinking "initializing..."
      if (cursorVisible) {
        ctx.fillStyle = '#008800';
        ctx.fillText("[ INITIALIZING TERMINAL... ]", 256, y + 20);
      }

      ctx.shadowBlur = 3;
      ctx.textAlign = 'left';
    }
    // Main menu - centered
    else if (bootPhase === 'ready') {
      if (currentView === 'menu') {
        y = 80;
        ctx.textAlign = 'center';
        ctx.fillText("JR INDUSTRIES (TM) TERMLINK", 256, y); y += 10;
        ctx.fillText("────────────────────────────", 256, y); y += 25;

        MAIN_MENU.forEach((item, i) => {
          const sel = i === selectedIndex;
          if (sel) {
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(100, y - 10, 312, 16);
            ctx.fillStyle = '#000000';
          }
          ctx.fillText(`[${i + 1}] ${item.label} - ${item.desc}`, 256, y);
          if (sel) ctx.fillStyle = '#00ff00';
          y += 20;
        });

        y = 340;
        ctx.fillStyle = '#008800';
        ctx.fillText("↑↓: Select   ENTER: Open   1-5: Quick", 256, y);
        ctx.textAlign = 'left';
      }
      // Other views
      else if (currentView === 'mail-list') {
        ctx.fillText("═══ MAIL ═══", 20, 25);
        y = 50;
        mails.forEach((m, i) => {
          const sel = i === selectedIndex;
          if (sel) { ctx.fillStyle = '#00ff00'; ctx.fillRect(15, y - 10, 400, 14); ctx.fillStyle = '#000'; }
          ctx.fillText(`${sel ? '>' : ' '} ${m.read ? ' ' : '*'} ${m.from}: ${m.subject.slice(0, 30)}`, 20, y);
          if (sel) ctx.fillStyle = '#00ff00';
          y += 16;
        });
        ctx.fillStyle = '#008800'; ctx.fillText("↑↓/ENTER/ESC", 20, 360);
      }
      else if (currentView === 'mail-read' && selectedMail) {
        ctx.fillText(`FROM: ${selectedMail.from}`, 20, 25);
        ctx.fillText(`DATE: ${selectedMail.date}`, 20, 40);
        ctx.fillText(`SUBJ: ${selectedMail.subject}`, 20, 55);
        ctx.fillText("────────────────────────────────", 20, 70);
        y = 90;
        selectedMail.body.forEach(line => { ctx.fillText(line, 20, y); y += 16; });
        ctx.fillStyle = '#008800'; ctx.fillText("ESC: Back", 20, 360);
      }
      else if (currentView === 'files') {
        ctx.fillText("═══ FILES ═══", 20, 25);
        ctx.fillText(files.name, 20, 45);
        y = 70;
        (files.children || []).forEach((f, i) => {
          const sel = i === selectedIndex;
          const icon = f.type === 'folder' ? 'DIR' : f.type === 'encrypted' ? 'ENC' : 'TXT';
          if (sel) { ctx.fillStyle = '#00ff00'; ctx.fillRect(15, y - 10, 250, 14); ctx.fillStyle = '#000'; }
          ctx.fillText(`${sel ? '>' : ' '} [${icon}] ${f.name}`, 20, y);
          if (sel) ctx.fillStyle = '#00ff00';
          y += 16;
        });
        ctx.fillStyle = '#008800'; ctx.fillText("↑↓/ENTER/ESC", 20, 360);
      }
      else if (currentView === 'file-view' && selectedFile) {
        ctx.fillText(`═══ ${selectedFile.name} ═══`, 20, 25);
        y = 50;
        (selectedFile.content || []).forEach(line => { ctx.fillText(line, 20, y); y += 16; });
        ctx.fillStyle = '#008800'; ctx.fillText("ESC: Back", 20, 360);
      }
      else if (currentView === 'logs') {
        ctx.fillText("═══ LOGS ═══", 20, 25);
        y = 50;
        logs.slice(logScrollOffset, logScrollOffset + 16).forEach(log => {
          const c = log.level === 'CRITICAL' ? '#ff4444' : log.level === 'ERROR' ? '#ff8844' : log.level === 'WARN' ? '#ffff44' : '#00ff00';
          ctx.fillStyle = c; ctx.shadowColor = c;
          ctx.fillText(`[${log.timestamp}] ${log.level}: ${log.message}`, 10, y);
          y += 16;
        });
        ctx.fillStyle = '#008800'; ctx.shadowColor = '#00ff00'; ctx.fillText("↑↓/ESC", 20, 360);
      }
      else if (currentView === 'system') {
        ctx.fillText("═══ SYSTEM ═══", 20, 25);
        y = 50;
        ["JR TERMLINK v1.25", "Build: 1981-03-01", "", "Memory: 64KB [OK]", "Storage: 360KB Floppy", "Network: [OFFLINE]", "", "Status: CONTAINMENT BREACH"].forEach(l => { ctx.fillText(l, 20, y); y += 16; });
        ctx.fillStyle = '#008800'; ctx.fillText("ESC: Back", 20, 360);
      }
      // Game
      else if (currentView === 'game' && gameState) {
        ctx.shadowBlur = 0;

        // Platforms
        ctx.fillStyle = '#004400';
        PLATFORMS.forEach(p => ctx.fillRect(p.x, p.y, p.w, 8));

        // Player
        drawSprite(ctx, PLAYER_SPRITE, gameState.playerX, gameState.playerY, '#00ff00', gameState.facing < 0);

        // Bullets
        ctx.fillStyle = '#ffff00';
        gameState.bullets.forEach(b => ctx.fillRect(b.x, b.y, 6, 2));

        // Enemies
        gameState.enemies.forEach(e => drawSprite(ctx, ENEMY_SPRITE, e.x, e.y, '#ff4444'));

        // UI
        ctx.fillStyle = '#00ff00';
        ctx.shadowBlur = 3;
        ctx.fillText(`SCORE: ${gameState.score}`, 20, 20);
        ctx.fillStyle = '#008800';
        ctx.fillText("WASD:Move  J:Shoot  ESC:Exit", 20, 375);

        if (gameState.gameOver) {
          ctx.fillStyle = 'rgba(0,0,0,0.8)';
          ctx.fillRect(120, 130, 270, 100);
          ctx.strokeStyle = '#00ff00';
          ctx.strokeRect(120, 130, 270, 100);
          ctx.fillStyle = '#00ff00';
          ctx.textAlign = 'center';
          ctx.fillText("══════════════════════", 256, 150);
          ctx.fillText("G A M E   O V E R", 256, 170);
          ctx.fillText("══════════════════════", 256, 190);
          ctx.fillText(`Score: ${gameState.score}`, 256, 210);
          ctx.fillStyle = '#008800';
          ctx.fillText("[R] Restart  [ESC] Exit", 256, 225);
          ctx.textAlign = 'left';
        }
      }
    }

    // Scanlines
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    for (let i = 0; i < 384; i += 2) ctx.fillRect(0, i, 512, 1);

    texture.needsUpdate = true;
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} material={screenMaterial}>
        <planeGeometry args={[0.92, 0.69]} />
      </mesh>
    </group>
  );
}
