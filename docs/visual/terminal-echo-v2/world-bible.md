# ECHO / Terminal 07 — investigation bible

## Canon and intent

This is a fictional archive investigation inside JR Industries' TERMLINK terminal. The player operates the retained Employee 777 account after the Lab 7 failure. The machine can recover records and manipulate local instrument modules; it cannot verify the identity of the person using it, the origin of an external voice, or who escaped the facility.

Preserve the original 1981 chronology, Dr. Wang, Site X, Project ECHO, neural interface research, synchronous staff behavior, the 03:47 biometric override, the 03:48 forced door, the evacuation and final lost signal. Preserve the seven original mail subjects and core lines, notes.txt, project.dat, classified.doc, all 28 original logs, password 3c5614, Employee 777 / Level 5, and SURVIVOR as an optional program. Site X is an unresolved location code. “THEM” is an unidentified sender's claim, not a confirmed explanation.

The original hidden brass key and paper still exist in unused homepage components. The current homepage does not mount that chain. The new maintenance-slip.txt deliberately makes its phrase available inside the terminal: leaving the current scene or finding a retired homepage object is never mandatory.

The archive now contains 12 mail records, 8 files and 36 logs. Authored mail/file body copy is 2,081 English words. New content connects the old observations rather than replacing the premise. Gameplay is designed for a first mainline visit of roughly 10–15 minutes; actual duration needs human playtesting. Optional programs and exhaustive rereading are outside that target.

## Three challenges

### 1. Reconstruct the breach / stage 0 → 1

Estimated 3–4 minutes. Open the security mail m04 and the personal notebook f01; m05 can supply the same witness observation as f01. Inspect LAB7 on the facility map. Inspect both security timestamps 03:47 and 03:48. Correlate these five observations.

Evidence identifiers are `incident`, `witness`, `lab7`, `override`, `breach`. Neither a single document nor a remembered password completes this challenge. The contradiction is intentional: the electronic controller accepted a credential and the mechanical latch was then forced. Valid permission is not proof of a willing person. Correlation records `correlated` and enables the isolated receiver, without claiming to identify the intruder.

The journal and three graduated hints make missing evidence recoverable. Wrong correlation attempts do not erase observations or impose a timer.

### 2. Recover the receiver / stage 1 → 2

Estimated 2–3 minutes including new reading. m08 and f04 explicitly specify **147 kHz / 180 degrees / channel 7**. Adjust the three instrument controls and choose RECOVER. Button controls and `tune frequency 147`, `tune phase 180`, `tune channel 7`, `recover` all use identical reducer actions.

The frequency range is 120–180 in steps of 1, phase 0–270 in steps of 90, and channel 1–9. A mismatched setting produces a local signal fault and an actionable explanation. Changing the controls or resetting the module allows immediate retry. Correct recovery records `recovered`, exposes late mail and routing documents, and advances to stage 2. It never silently opens an external connection.

Only after recovery does `unlock 3c5614` (also `unlock classified.doc 3c5614`) grant `clearance` and make the optional classified memorandum f03 available to open. The password cannot bypass either investigation or tuning. The restricted text expands the moral uncertainty but is not a mandatory fourth puzzle.

### 3. Repair the bus and choose / stage 2 → 3

Estimated 4–6 minutes including the late archive and choice. Rotate nine two-port couplers clockwise. Ports are numbered N=0, E=1, S=2, W=3. The source enters west of zero-based index 0; the destination leaves east of index 8. Connectivity is evaluated by reciprocal neighboring ports, not by equality to a single fixed answer. Unused cells may have any orientation.

The surviving pencil trace in f07 is **1 → 2 → 5 → 4 → 7 → 8 → 9**, with 3 and 6 unused. One solution, measured as clockwise quarter turns from RESET MODULE, is **[0,1,2,3,1,2,2,1,0]**. The third hint exposes these turns; earlier hints describe source, destination and route. The exported `LINK_SOLUTION` is for deterministic verification and the final hint, not a required direct comparison in gameplay.

Choose ISOLATE or RESTORE, verify the connected path, then explicitly confirm. The default switch position is ISOLATE but it never commits automatically. Rotating a tile, changing the destination, navigating, sleeping or cancelling invalidates a pending confirmation. A failed path is recoverable locally. No reflex test, arcade high score or countdown determines the ending.

## Endings and artistic beats

**ISOLATE** seals a local archive and leaves the outgoing line silent. Evidence survives; an assistance request does not leave. This is not presented as proof everyone is safe.

**RESTORE** sends a status burst and recovered recording to an unverified external carrier. A distant answer arrives; its identity and the consequences remain unresolved. This is not presented as a confirmed rescue or confirmed catastrophe.

Both endings automatically return to the overview receipt with no open document and reset scroll; they retain readable records, permit optional programs and allow an explicit new investigation. There is no hidden morality score or “correct” ending. Existing late messages remain dated archived messages, not claims of live correspondence.

Character art is exported as rectangular framed grids: repaired JR Industries boot artwork, a complete WELCOME / Employee 777 banner, facility wiring map, and one ending receipt for each destination. The old truncated right border and incomplete WELC headline were corrected. Font coverage must include block and box-drawing Unicode used inside the logo. New terminal UI should preserve whitespace and fixed cell geometry instead of wrapping the pictures as prose.

Suggested finite art beats: first wake → original identity artwork; successful receiver/clearance reveal → Employee 777; final confirmation → destination receipt. Normal investigation should remain calm. Reduced motion displays complete stable artwork. Optional SURVIVOR retains its existing character silhouettes and stays separate from mainline progress.

## Engine and persistence

The story engine is a pure reducer. `EchoState` separates navigation and open record ID from puzzle state, clue discovery and committed outcome. Scrolling never changes the open record. All controls and the whitelisted command parser yield the same `EchoAction` values; commands cannot access a shell or network.

Public exports: `initialEcho`, `reduceEcho`, `parseCommand`, `objective`, `hints`, `serializeEcho`, `restoreEcho`, `linkPorts`, `linkConnected`, `PAGES`, `SIGNAL_TARGET`, `SIGNAL_LIMITS`, `LINK_SOURCE`, `LINK_TARGET`, `LINK_TILE_PORTS`, `LINK_SOLUTION`, and `REQUIRED_EVIDENCE`. Content exports `records`, `logs`, `art`, `EchoRecord`, and `EchoLog`. Extra feedback action: `{type:'message', text:string}`. No additional state fields were added to the agreed UI contract.

Save envelope: `{version:1,state}`. Restore validates enums, IDs, bounds, array shape and uniqueness, record availability, stage prerequisites, clearance, connected completed paths and ending consistency. Invalid or unknown saves yield a fresh session without crashing. A pending final confirmation is never restored. Local storage ownership and browser errors belong to the React host; this engine does not access browser globals.

RESET MODULE resets only the selected/failed instrument and preserves narrative progress. NEW GAME returns a fresh sleeping session and should be an explicit host UI action. A completed ending is immutable within that session; use replay to explore the alternative.

## Verification

The first run failed all 10 initial tests on explicit missing-module assertions before implementation. Initial implementation passed 10 tests. Added log-prerequisite and inconsistent-save coverage; the latter failed with an accepted premature clearance, then passed after validation was tightened. Final focused suite: 12 tests, including both endings, mandatory investigation, wrong tuning recovery, password gating, connected routing and cancellation, stable reading, command parity, malformed/inconsistent saves, hints/replay, record totals, body word budget and rectangular art.

Pure-module TypeScript check passed. These checks establish reducer/content behavior; browser readability, command focus, input devices, visual matching, frame rate and actual completion duration still require integrated review by the host implementation.
