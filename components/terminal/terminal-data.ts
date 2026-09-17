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

export const INITIAL_MAILS: Mail[] = [
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

export const INITIAL_FILES: FileNode = {
  name: "/home/user", type: 'folder',
  children: [
    { name: "notes.txt", type: 'file', content: ["Personal Log", "Day 1: Excited for ECHO.", "", "Day 5: Something wrong.", "", "Day 8: I hear them now."] },
    { name: "project.dat", type: 'file', content: ["PROJECT ECHO", "Origin: Site X", "", "Capabilities:", "- Telepathy", "- Neural control"] },
    { name: "classified.doc", type: 'encrypted', content: ["[ACCESS DENIED]"] },
  ]
};

export const INITIAL_LOGS: LogEntry[] = [
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


