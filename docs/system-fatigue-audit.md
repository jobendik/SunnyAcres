# Sunny Acres — System Fatigue Audit

_Snapshot: clarity / pacing / first-session pass._

The game has grown to ~70 systems with very strong depth, but the More menu
shows every late-game system to a Level 1 player and the Objective Rail only
covers ~10 of them. This document inventories what exists, where it surfaces,
and what visibility / priority it should have.

No systems are removed. The fix is **gating, ranking, and re-naming.**

## Headline issues

1. **More menu dumps 30+ buttons at Level 1.** A new player sees Club, Plots,
   Maps, Cart, Balloon, Train, Boat, Stall, Codex, Path, Grid, Ranks,
   Prestige, Share, Museum, Events, Recipes, etc. before they have planted a
   single seed. Worse, opening many of them surfaces a "you're not eligible"
   message — visible failures rather than visible anticipation.
2. **Objective Rail does not know about ~70% of the systems.** It covers
   crops, animals, production, orders, quests, daily/wheel — but ignores
   Boat (crates filling, departing soon), Train (returned), Market Stall
   (sold items waiting), Festival Cart, Balloon (active, soon-leaving),
   Live Events, Contracts (expiring), Visitors (expiring), Compost
   (finished), Greenhouse (slots ready), Expeditions (energy full),
   Expansion (plot unlockable, obstacle clearable), Landmarks (contribute),
   Weather Grid (charges full), Gazette (help requests), Museum, Card
   Fusion, Hazards, Building Upgrades.
3. **Unlock list is severely outdated.** `unlocks.ts:HIGHLIGHTS` covers 17
   entries — mostly pre-roadmap. It is missing Market Stall (L4), Gazette,
   Festival Cart (L6), Boat (L9), Contracts (L9), Tool Shed (L10),
   Balloon (L10), Train (L13), Club (L15), Helpers (L18), Expeditions
   (L20) and all 5 land plots, all 5 landmark projects, breeds, building
   upgrades, etc. Level-up teasers therefore lie to the player.
4. **No central feature-visibility helper.** Each panel decides locally
   whether it's "ready" — there is no `isUnlocked(id)`, `isRelevantSoon(id)`,
   `hasAttention(id)` that the menu can query. Adding more buttons multiplies
   the disclosure problem.
5. **README is two roadmap-phases out of date.** No mention of Weather Grid,
   deliveries, Club, Expeditions, save-version drift (README says v2, code
   uses v3 key + v5 internal schema).
6. **Tutorial step 6 fires too early.** "Build a Feed Mill" appears before
   the player has earned the coins or understands what feed _does_.

## Full system inventory

`Visibility` = where the player encounters it today.
`Gate` = the actual unlock condition in code.
`Action` = what changes after this pass.

| System | Visibility | Gate (real) | Risk | Recommended action |
|---|---|---|---|---|
| **Core farming** | toolbar always | L1 | none | keep |
| Plow / Plant / Harvest | toolbar always | L1 | none | keep, anchored by tutorial |
| Shop | toolbar always | L1 | none | keep |
| Build menu | toolbar always | L1 (FeedMill at L2) | low | keep |
| Decor menu | toolbar (desktop) / More | L1 | low | keep |
| Quests | side panel | L1 | none | keep |
| Orders | side panel | L1 | none | keep |
| Achievements | toolbar / More | L1 | low | keep |
| News (Daily Acre) | toolbar / More | L1 | low | keep |
| Daily (streak/challenges) | toolbar / More | L1 | low | keep |
| Daily Wheel | More | L1 (always spinnable) | low | keep |
| Season Pass | More | L1 (always rolls) | medium | demote: only show after L2 — first-second-day player should focus on the core loop |
| Help | toolbar / More | always | none | refresh content |
| Save | toolbar / More | always | none | keep |
| Snapshot (share farm) | More | L1 | low | demote, late-game flavor |
| Music toggle | HUD + More | always | none | keep |
| **Retention / meta** | | | | |
| Weather Mastery Grid | More (always) | **L5** | high | hide until L4, teaser at L4, full at L5; objective once charges ≥ slotted card cost |
| Specialization | More (always) | **L5** | medium | hide until L4, teaser at L4 |
| Collection / Codex | More (always) | always exists | low | hide until L3 (player needs items first) |
| Prestige | More (always) | **L25** | medium | hide until L20, teaser at L20 |
| Leaderboard | More (always) | always | medium | hide until L5 |
| Market (price modifiers) | More (always) | always | low | hide until L4 |
| **Market Stall** | More (always) | **L4** | high | hide until L3, teaser at L3, full at L4 |
| **Gazette** | More (always) | always | medium | hide until L3 (otherwise just static weather article) |
| Recipe Book | More (always) | L1 (panel useless before buildings) | low | hide until first production building placed |
| Museum / Collection Hall | More (always) | always | medium | hide until L6 |
| **Roadmap-expansion content** | | | | |
| Boat | More (always) | **L9** | high | hide until L7, teaser at L7 |
| Train | More (always) | **L13** | high | hide until L10, teaser at L10 |
| Balloon | More (always) | **L10** | medium | hide until L8 |
| Festival Cart | More (always) | **L6** | medium | hide until L4, teaser at L4 |
| Landmarks (Builds) | More (always) | first one at **L7** | high | hide until L5, teaser at L5 |
| Friendship | More (always) | always (always relevant if orders exist) | low | hide until L3 (orders unlock at L1 but first delivery onboards friendship) |
| Village | More (always) | nodes from L1+ but rep needed | medium | hide until L4 |
| Club | More (always) | **L15** | high | hide until L12, teaser at L12 |
| Expansion (Plots) | More (always) | first plot at **L7** | high | hide until L5, teaser at L5 |
| Expeditions (Maps) | More (always) | **L20** (first map L16) | high | hide until L15, teaser at L15 |
| Live Events | More (always) | always (weekly rolls auto) | medium | hide until L8 |
| Building Mastery | passive (per-building UI) | always | low | passive — no top-level button |
| Tool Shed | implicit (effect) | **L10** | low | passive |
| Contracts | inside Market panel | **L9** | medium | objective rail surfaces expiring/completable contracts |
| Visitors V2 | walk-on overlay | **L5** | medium | objective rail surfaces serveable visitor |
| Reputation | passive number | always | none | passive |
| Card Fusion | inside Weather Grid panel | needs fragments | low | passive; surfaces in rail when 2+ cards + cost in fragments |
| Forecast | inside Daily/News | always | none | passive |
| Helpers | More (always)? — actually invisible; only inside Tool Shed? | **L18** | medium | confirm panel exists, demote |
| Journal | implicit | always | none | passive |
| Hazards | passive | always | low | passive; surfaces in rail when active hazard needs prep |
| Friend Codes | implicit | always | none | passive (no real netcode) |
| Compost | inside Greenhouse? | always | medium | surfaces in rail when fermented batch is ready |
| Greenhouse | inside Landmarks once built | **landmark L12** | medium | surfaces in rail when slot ready |
| Building Upgrades | inside building panel | always (per-building) | low | passive |
| Decor Sets | inside Decor panel | always | low | passive |
| Pet Dog | spawned at L4 | **L4** | none | passive |
| Fishing | dock building required at L3 | **L3** + dock | none | keep |
| Combo | floating HUD | always | low | passive |
| Treasures (chests) | overlay | always | low | passive |

## What the More menu should look like, by tier

This mirrors the brief's recommended philosophy but uses the **real** unlock
levels from the code.

### Tier 1 (Lv 1–2): "Cozy first day"
- Shop, Build, Barn, Quests/Orders FAB, Decor, News, Daily, Help, Save, Music
- _Locked teasers shown:_ none — keep it calm

### Tier 2 (Lv 3–4): "Awakening"
- Add: Stall, Gazette, Codex, Recipes (after first production)
- _Teasers:_ Grid (L5), Path (L5)

### Tier 3 (Lv 5–7): "The world widens"
- Add: Grid, Path (Specialization), Live Events (L8 teaser), Plots (L5 teaser), Builds (L5 teaser), Market, Friendship
- Show Cart at L4 (it actually unlocks at L6 per code; show teaser at L4)

### Tier 4 (Lv 8–12): "Logistics"
- Add: Boat, Balloon, Festival Cart fully, Village
- _Teasers:_ Train (L13), Club (L15)

### Tier 5 (Lv 13–20): "Deep loops"
- Add: Train, Club, Museum, Maps (L15 teaser → L20 actual), Ranks

### Tier 6 (Lv 21+): "Endgame"
- Add: Prestige, Share/Snapshot
- Helpers if not already exposed

## Objective Rail coverage gap

Current rail (rough priority weights → what surfaces):

| Priority bucket | Current | Recommended addition |
|---|---|---|
| Urgent claim (≥85) | Streak, Wheel, Timed reward, Challenge, Quest, Order | + Boat full/depart-soon, Train returned, Balloon active, Stall sold, Festival Cart reward, Contract expiring, Visitor expiring soon |
| High (70–85) | Wilting crops, Hungry pen | + Compost finished, Greenhouse ready, Live Event reward, Hazard prep, Weather Grid charge ready with slotted cards |
| Medium (50–70) | Ready crops, Pen produce, Production done, Orchard ready | + Plot unlockable, Obstacle clearable, Landmark contribution possible, Train loadable, Boat docked with crates, Gazette help request, Market hot item, Card Fusion ready |
| Low (30–50) | Empty plots, Idle production, Build first prod, Build pen, Build dock | + Decorate, Read journal, Visit village, Check forecast |

The rail should show **only 1–4** at any time and always pick highest priority
plus an unlocked-soon teaser. Tap-targets need handlers for all new actionIds.

## Tutorial / first 10 minutes

Current 6-step tutorial:
1. Plow (good)
2. Plant (good)
3. Harvest (good)
4. Sell at Shop (good)
5. Open Orders FAB (good)
6. Build Feed Mill (premature — costs 250💰, requires understanding feed)

Recommended replacement of step 6 with the more contextual / scalable
**"Build your first production building"** (Bakery is more rewarding —
costs the same and immediately produces something the player has wheat for).
Even better, gate this step behind "player has at least 1 build-able building
they can afford."

Also missing: a contextual tip when Weather Mastery Grid unlocks at L5 — the
brief calls this out as the signature mechanic with zero in-game guidance.

## Save / load: notes for the QA phase

The save layer is already very defensive — each system's `init()` guards
against missing fields, every timer field is rebased by delta. The
audit found two latent issues:

- `save.ts` uses key `sunnyacres-save-v3` but the README mentions `v2`.
- `SaveData.tutorial` is restored but if a fresh-save tutorial.dismissed
  was true, the new step-6 change above may already have advanced past it.
  Safer: keep the tutorial state untouched and let `tutorialAdvance()` skip
  forward to the first incomplete step (already does this — fine).

No save version bump is required for this pass.

## Technical caps

| Buffer | Current cap | Status |
|---|---|---|
| Journal entries | 60 | OK |
| Telemetry events | 500 | OK |
| Particles | unbounded | OK in practice — life-based pruning |
| Floats | unbounded | OK in practice — life-based pruning |
| Crows | <= small constant | OK |
| Treasures.chests | TTL-pruned | OK |
| VisitorsV2.active | <= 3 | OK |
| Contracts.offers | <= 3 | OK |
| Contracts.active | <= 2 | OK |

Nothing leaks unbounded.

## Summary of changes this pass

- New file `src/systems/feature-visibility.ts` — single source of truth for
  every visible system, with `isUnlocked`, `isRelevantSoon`, `hasAttention`,
  category, label, icon, openButtonId.
- `index.html` — More menu buttons get teaser/locked classes applied
  dynamically; no static-list bloat removed.
- `src/ui/mobile-shell.ts` — applies visibility before opening the sheet.
- `src/systems/objectives.ts` — rewritten to cover every system above.
- `src/ui/objective-rail.ts` — extended action handler.
- `src/systems/unlocks.ts` — full unlock list, real levels.
- `src/systems/tutorial.ts` — final step replaced with contextual prompt.
- `src/ui/help.ts` — updated content + reference to system tiers.
- `README.md` — full rewrite to match current game.
- CSS additions — `.locked-soon`, `.locked-far`, `.has-attention` styles.

Final result: the same depth, but the surface is **calm** at Lv 1 and
**informative** at every level above. New player sees 8 buttons. Lv 25
player still sees the whole farm.
