# TOUCHLINE — mobile football manager (prototype)

Full design: [docs/GAME_DESIGN_DOCUMENT.md](docs/GAME_DESIGN_DOCUMENT.md) · [docs/ROADMAP.md](docs/ROADMAP.md) · [docs/FEATURES.md](docs/FEATURES.md) · [docs/COMPETITION_RULES.md](docs/COMPETITION_RULES.md).

A playable vertical slice: **710 real clubs in 40 real leagues (at their real sizes) across 31 nations, in three simulation tiers** — full (Premier League, Championship, LaLiga, Bundesliga, Ligue 1, Brasileirão), light (League One, League Two, Segunda División, Primera Federación, 2. and 3. Liga, Serie A and Serie B, Ligue 2, Portugal, Netherlands, Argentina, USA, Japan) and minimal (Belgium, Turkey, Czechia, Greece, Norway, Poland, Denmark, Austria, Switzerland, Scotland, Serbia, Hungary, Ireland, Wales, Australia, Mexico, Korea, Thailand, Nigeria, Morocco); your own league and the leagues just above and below it always run in the full engine — with B teams and U21/U18 sides, eleven domestic cups, ten continental cups (Europa League, Conference League, Copa Sudamericana, AFC Champions League Two and the CAF Confederation Cup included), a Club World Cup, international football with 37 national teams and qualifiers, a live match engine, and the story-driven world around it.

## Run it

No build step. Serve the folder and open it at phone width (or on a phone on the same network):

```bash
python -m http.server 5173
```

Then open http://localhost:5173. Saves go to IndexedDB in the browser, or to real files in the native app (3 slots, autosave after every matchday and whenever the app goes to the background). Older saves are upgraded automatically (the original is kept as a backup); only saves from before Alpha 1 can't be. Club → Settings exports a compressed `.touchline` backup and imports one (also from the title screen).

## Develop, test, build

The source runs as-is — no build is needed to play or develop. Node tooling (`npm install` once) adds:

```bash
npm test
```

Headless regression test: two seasons with a seeded RNG through the same code the app uses (including the Web Worker's JSON hand-off), then invariants, save pack/unpack and save migrations. About a minute; exits non-zero on failure. `npm run test:quick` plays one season.

```bash
npm run calibrate
```

Calibration report: three seeded seasons compared with real football, 49 measures in four groups: matches (goals, home/draw/away split, shots, xG, set pieces, penalties, cards, title races, cup upsets, light-league scores, goals trend), player careers (age profile of top-flight minutes, keeper ages, top-100 age, peak ages, retirement ages, academy-grown vs generated player shape, world elite trend, top-flight squad turnover, plus the ability-change-by-age curve) and injuries (rate per club, share of squads out, layoff lengths, long-term injuries, match vs training, muscle and hamstring shares, re-injuries, age effect) and the market (top-flight loans out, loanees' games, how long free agents wait, players created from nowhere). Trend measures need `--seasons 8` or more (use it for any long-run question). The engine's tuning knobs live in `FM.CAL` at the top of `js/engine.js` (try values with `node tools/calibrate.mjs --set chanceRate=0.15,homeAtt=1.1`, or any setting by path such as `--set Season.ELITE.growth=0.6`; `targetGoals` is the level the tactical equilibrium settles back toward, via `S.era`), injury rates in `FM.Injury.CAL` (`js/injuries.js`), the career curve in `CURVE` and academy potential in `Sea.YOUTH` (`js/careers.js`), together with elite growth (`Sea.ELITE`), veteran renewals (`Sea.VET`) and unattached veterans retiring (`Sea.FA_RETIRE`). AI managers' ability (`FM.CAL.mgr`) and AI tactical familiarity (`FM.CAL.aiFam`) are engine knobs. The report ends with each league's champions' pre-season rank, to spot a league that is too predictable.

```bash
npm run test:regens
```

Regen test: five academy intakes (plus the world's generated youngsters) aged year by year through the real development code, about 20 seconds. Reports career shapes with examples: prospects who deliver, flops (stalled, plateaued, burned out), one-season wonders, early primes (at their best by 18–19) and long primes (still at their best at 33–34), and checks each against an expected range; exits non-zero on failure. The rates live in `Sea.ARCS` (`js/careers.js`).

```bash
npm run test:suite
npm run test:long
```

Wider suite (`tools/suite.mjs`): a manager plays every match for three seasons (`test:long`: twenty, without the speed limits), and it checks speed (a league day, a pre-season day and a season against a budget; `--budget 2` for a slower machine), that every league table adds up, leagues keep their size and as many clubs go up as down, every full-simulation club can field a legal side all season, no club drifts into impossible debt or wealth, and the world keeps its size and shape. About two minutes a season. In the app, the developer panel has the matching UI smoke test: it opens every tab, sub-tab and a sample of sheets and reports what threw or showed a broken value.

```bash
npm run test:realstats
npm run test:worlddef
npm run test:import
npm run import:history -- --dir data/samples/history --out world.json
```

Data tools for the editor and club packs. The real-stats converter (`js/realstats.js`, command line `tools/realstats.mjs players.csv`) turns a real player's numbers into attributes and ability. The world definition (`js/worlddef.js`, command line `tools/worlddef.mjs --export world.json`) is the world as data, apart from a save: export, validation, an editing API and loading onto a new world. The historical importer (`tools/import-history.mjs`) reads season tables, player stats and club details into a definition through the converter; a synthetic sample is in `data/samples/history`.

**Developer dashboard:** `npm run dev-tools`, then open http://localhost:5190. A local app (`tools/devserver.mjs`, page in `tools/dev/`) that is not part of the game: it runs the test suites, calibration, wonderkid and transfer tests, lint, docs check and build as jobs with live output and a result history in `.devtools/` (two runs of a job can be compared measure by measure); hosts the real-stats converter and the historical importer (paste or upload CSV/JSON, download the result) and a world-definition validator; and shows the game in a frame with the in-game developer panel (Settings → Help → Developer tools: world check, market, wonderkids, speed, a season on a copy, the UI smoke test). `js/devtools.js` is added to the game only inside the dashboard, never to `index.html`, the build or the Pages site.

```bash
npm run test:wonderkids
```

Wonderkid test: ten seeded seasons, following every prospect of 19 or under with a potential of 85+, against what real football shows (how many reach world class, stall or flop, and when the best peak).

```bash
npm run lint
npm run format
```

ESLint (`eslint.config.mjs`) catches undefined names and unused variables; Prettier (`.prettierrc.json`, 120 columns) formats the code. Run both before committing; `npm run format:check` only reports.

```bash
npm run build
```

Minified production build in `dist/`: `sim.min.js` (engine, also loaded by the simulation worker) + `ui.min.js`, content-hashed URLs and a regenerated service worker. Preview it with `npm run serve:dist`.

**GitHub Pages:** `.github/workflows/pages.yml` builds `dist/` and publishes it on every push to `main`. One-time setup: in the repository's Settings → Pages, set Source to "GitHub Actions". The game is then at `https://<user>.github.io/<repo>/` (all paths are relative, so the subpath works, and it installs as an offline web app from there).

**Save format changes:** bump `FM.SAVE_VERSION` in `js/core.js` and add a migration to `MIG` in `js/save.js` (from the previous version). Never edit a shipped migration; `npm test` checks every version has an upgrade path.

### Native app (Capacitor 8)

`android/` and `ios/` are Capacitor projects that package `dist/`. `npm run cap:sync` builds and copies the web app into both.

- **Android:** needs Android Studio (Android SDK) and JDK 21. `npm run android` opens the project; build or run it from there.
- **iOS:** needs a Mac with Xcode. Copy the project over, run `npm install`, then `npm run ios`.
- The app id is `app.touchline.manager` (change it in `capacitor.config.json` before the first store upload). App icons and splash screens are still Capacitor's defaults.
- In the app, saves are files in the app's private data folder (written to a temp file, then renamed); haptics, share and the status bar use the native plugins; the Android back button closes the top-most sheet; phones are locked to portrait (tablets rotate).

### Install it as an app (offline)

Touchline is an installable web app: it has a manifest, app icons and a service worker, and bundles its fonts, so once it has loaded it plays with no internet connection.

- **On this computer:** open http://localhost:5173 in Chrome or Edge and use *Install* (address bar icon, or Club → Settings → Install as an app).
- **On a phone:** browsers only allow installing and offline play over **https**, so the game has to be hosted — any static host works (GitHub Pages, Netlify, Cloudflare Pages); just upload the folder. Then Android: Chrome menu → *Install app*; iPhone: Safari → Share → *Add to Home Screen*. Over plain `http://` on your local network the game still runs, but can't be installed or go offline.
- **Updating:** the service worker fetches fresh files whenever you're online and only falls back to its cache when offline, so edits show up on the next load. When you **add** a new file, add it to the `FILES` list in `sw.js` and bump `CACHE`.

## What's in the slice

| Brief pillar | In the prototype |
|---|---|
| **Match engine** | Top-down pitch, 22 moving dots, visible pressing lines, ball carrier labels. Minute-by-minute sim; highlights slow down (~every 20–40s at 1×). Live xG, possession, momentum bars, 1×/2×/4× speed, instant result. |
| **Tactical prompts** | Analyst insights, chasing the game, protecting a lead, "pinned back", tired legs, injuries, red cards, half-time team talk (personalities react differently). Assistant has a personality and sometimes disagrees. |
| **Tactical depth** | 6 formations (back 3/4/5), build-up (Short/Direct/Counter/Possession), pressing (High/Mid/Low), inverted full-backs, roles (Segundo Volante, Carrilero, Mezzala, Inverted Winger, False 9, Libero…), each with engine effects. |
| **Players** | 1–20 attributes, CA/PA stars, morale, wage, value, contract, form, traits (Big Game Player, Injury Prone, Late Bloomer, Loyal, Mercenary, Leader, Fair-Weather…), hidden attributes + personality. Radar, form chart, heat map, career history. Realistic career shapes (plus hidden arcs: wonderkids who flop, one-season wonders, early primes, long primes): fast growth in the teens, a peak around 27–29, decline through the thirties (pace first, reading of the game last); keepers and centre-backs age later, every player's clock runs a little early or late, and veterans wind down on one-year deals before retiring at ~33–35. |
| **Scouting** | Scouts with regional strengths. Assignments by region or league, filtered by position, age, minimum potential, max fee and focus (undervalued / wonderkids / ready now). Reports are graded A–D, with a Sign / Loan / Monitor / Avoid recommendation, the scout's own words and gradual reveal of personality, injuries and hidden attributes. Target-versus-your-starter comparison. Nationality mixes per league are realistic (35 nations). Fees and wages use fine-grained steppers and exact input. |
| **Youth** | Annual intake shaped by academy level and nationality (Japan = technicians, Brazil = flair, Serbia = defenders, France = athletes). Development depends on age, training facilities, professionalism, minutes and Late Bloomer. U21 and U18 sides play national youth leagues; B teams in Spain and Germany (Castilla, Barça Atlètic, Stuttgart II, ...) play in the lower divisions, can never go up to their parent's division, and their players belong to the parent. |
| **Training & analytics** | Team focus (eight) and intensity (three), individual focus or a new position for any player: development, which attributes grow, training injuries, recovery, set pieces and familiarity. Analytics tab: your season's xG match by match, against the league, chance types, goal times and the analyst's reading. |
| **Competitions** | 40 leagues in three simulation tiers (your league and its neighbours always fully simulated) (full engine / light statistical model / minimal scores-only), promotion, relegation and playoffs, eleven domestic cups (seeded knockouts with byes, extra time and penalties). UEFA Champions League, Europa League, Copa Libertadores, Copa Sudamericana, Asian, African and North American champions cups, all fed by data-driven rules, plus a mid-season Club World Cup for last season's finalists. Knockouts and playoff semi-finals can be two-legged, with an optional away-goals rule. |
| **Transfers** | Offers, counter-offers, loyal/ambitious refusals, windows, rumours, AI bids for your players. Contract packages: wage, length, squad status, signing-on fee, appearance and goal bonuses, release clause, yearly rise, relegation wage cut. Agents with personalities (Shark, Pragmatic, Family, Showman, Rookie) set demands, patience and fees; release clauses can be paid — by you or by rivals. International market, marquee raids, veterans abroad, Transfer Centre. AI clubs keep their squads moving: they replace their weakest starter (judging ageing players on where they're heading), buy from smaller clubs or at a premium from peers (never from a direct domestic rival), and sell the player who lost his place to a smaller club, so players climb the pyramid as they improve and slide down it as they fade. |
| **Club identity** | 710 real clubs in 40 real leagues at their real sizes (real names, kit colours, cities, stadiums and 125 derbies; the game's own ratings), each with an identity: Oil-Backed, Historic Giant, Fan-Owned, Youth-Focused, Selling Club, Fallen Giant. Board demands, fan culture, derbies. |
| **Stories** | Feed of newspaper headlines, fan social posts (with rival fans on derby day), press conferences with choices, dressing-room events. Instagram-style **shareable story cards** export as 1080×1350 PNG ("26-year-old Brazilian winger scores on debut"). |
| **Living world** | AI sackings, takeovers, administration and points deductions, stadium expansions, rule changes (subs, homegrown rules, TV deals), retirements, legends returning as managers. |
| **People** | One-to-one talks (praise, criticism, promises of minutes, a new contract, a debut, not being sold, or permission to leave). Promises are tracked, kept or broken, and move morale and squad trust. Players ask for meetings when unhappy or underpaid. Board meetings (transfer funds, owner-funded facilities, patience, a youth project), a mid-season review and five-game ultimatums. |
| **International** | 37 national teams, coefficient ranking, qualifying groups in the season before a tournament, two double-header breaks, and the summer finals played as calendar days. Take a national team job alongside your club: pick call-ups, set tactics, play the matches live; failing to qualify ends it. Coaching licences (B → A → Pro) unlock bigger jobs. |
| **Career** | Create your manager: first and last name, country, favourite club and avatar (your country knows you; your boyhood club is a homecoming). Start with a club or start unemployed. Out of work (from the start or after a sacking), the world keeps playing and clubs in your reputation range make offers that come and go; a national team job carries on. |
| **Legacy** | Hall of Fame (top scorers, appearances, academy graduates, cult heroes, biggest sales + seeded historic legends), Football Archive per season, manager identity tags (Youth Developer, Giant Killer…), sacking and job offers. |
| **Real rules** | Every career plays by each competition's real rules: three points, five substitutions, each league's foreign-player rules, two-legged continental knockouts and play-off semi-finals, no away goals. Competitions use data-driven rules (`promote`/`relegate`/`playoff` relationships in `js/world.js`), not hardcoded leagues. |
| **Board** | Demands set each season: a league aim and a minimum ("Qualify for the Champions League — at the very least a Europa League place"), cup targets that fit the club, finances (wages against revenue, debt) and the club's identity, each critical, important or a bonus. Four board meetings a season: the board's view and its own demands, then one request (transfer funds, a wage budget, facilities, a stadium expansion, a youth project, a marquee signing, a lower target, patience, a training camp), answered on confidence, money, form, your reputation and what you asked before. |
| **Injuries** | 23 real injury types (hamstring strains to ACL ruptures) with realistic layoffs; risk from proneness, age, fatigue, match fitness and a recent return; training knocks and illness; re-injuries; long injuries cost development and sometimes pace. Your players: medical news, surgery-or-rehab decisions, "risk him?" before big games, return-to-fitness news. Rates match real football (~35 injuries a club-season, ~9% of a squad out at any time). |
| **Staff** | Hire and fire an assistant, coach, analyst, physio, sporting director and up to 5 scouts from a market that refreshes each season. Ability has effects: development speed, injury length, analysis depth, negotiated fees. Vacant roles fall to a caretaker. |
| **Advice** | The assistant's notes on the Squad tab cover lineup issues, fatigue, unhappy players, youngsters ready to play, loan candidates, weak areas, expiring contracts and deadwood, with one-tap actions. Scouts' picks on the Scouting hub. |
| **Season preview** | Predicted table, predicted finish, bookmaker title odds, pre-season best XI, key man, one to watch. |
| **Pre-season** | 3 days before matchday 1: book friendlies (home gate / away fee) or camps (fitness, tactical, youth, commercial tour). Tactical familiarity grows with matches and camps. |
| **Loans & free agents** | Loan in (wage share + optional fee), loan out (offers from AI clubs), AI development loans; loans end at season end. Transfers and loans happen only while the window is open; free agents sign any time for a signing-on bonus. |
| **Post-match** | Summary, analyst insights (xG verdict, chance sources, half comparison, impact of your tactical change, fatigue, pressing), shot map, xG race, chance-type table, per-player stats, ratings, shape. |
| **Matchday** | Captain choice (armband boost, Leader effects), penalty / free-kick / corner takers used by the engine, pre-match team talk with the assistant's pick, weekly matchday digest in the feed. |
| **The world remembers** | Club records and record-breaking news (club, all-time, world transfer), all-time head-to-heads, rivalries that emerge from knockouts and red cards and cool if not fed, Player of the Month, injury histories, transfer fees on career timelines, managers who move between clubs, stadium histories, World News filters. |
| **Saves & platform** | Installable offline web app; saves upgrade automatically between versions; compressed backup export/import; matchday simulation in a Web Worker; autosave when backgrounded; back button, safe areas, haptics and share sheet; Capacitor projects for Android and iOS. |
| **UI** | Mobile-first, swipe between tabs, bottom sheets, dark/light theme, money in your club's currency, tap any club badge for its overview. |
| **Recent (playtest feedback)** | Four more leagues, wide midfielders, position versatility, real transfer flows, a coefficient world ranking, more cups and the real rules of each competition, real club abbreviations and nicknames, stats compared with a player's position, contract cost tables and a past for every player; feed of your club with a Needs reply list and a daily transfer round-up; transfer-window rules and deadline day hour by hour; pre-contracts; full bid negotiation; Plan A/Plan B and twelve formations; weather and home advantage; keeper stats and season-by-season history; finances by country and wage pressure; following clubs, competitions, nations and players; training, analytics, B teams and youth sides. Details in [docs/ROADMAP.md](docs/ROADMAP.md). |

## Code map

```
js/core.js       utilities, namespace
js/data.js       nations, leagues, traits, formations, roles, scouting phrases
js/clubs.js      every league's clubs (B teams name their parent), rivalries
js/world.js      world generation, player model, XI selection, competitions, calendar
js/engine.js     match engine (incl. aggregate/away goals), commentary, tactical prompts
js/season.js     matchday loop, finances, facilities, season end
js/careers.js    development curve, career arcs, youth intake, retirement, AI renewals
js/cups.js       domestic knockouts, continental groups + (two-legged) knockouts, Club World Cup
js/intl.js       national teams, Elo, qualifiers, summer finals, national team jobs
js/tiers.js      light and minimal simulation tiers
js/contracts.js  agents, contract clauses, negotiation model, release clauses, bonuses
js/people.js     player talks and promises, meetings, board, coaching licences
js/advice.js     assistant notes, scout picks, season preview, staff market
js/matchmotion.js  fluid on-pitch movement for the live match
js/scouting.js   scouting knowledge and reports
js/transfers.js  transfer market: prices, loans, offers, AI windows, bids for your players
js/market.js     deadline day, trials, loan watch, fee talks, instalments, pre-contracts, transfer reactions
js/registration.js  each league's foreign-player rules
js/finance.js    revenue by country, attendance, wage pressure, administration
js/youth.js      B teams, U21 and U18 sides, youth leagues
js/training.js   training focus, intensity and individual training
js/analytics.js  match log and league comparison for the Analytics tab
js/stories.js    news feed, story cards, living-world events
js/ui-*.js       shell, components, screens
js/matchview.js  live pitch renderer + post-match analysis
js/ui-alpha.js   negotiation, talks, boardroom, licences, national team screens
js/matchday.js   captain, set-piece takers, pre-match team talk, matchday digest
js/records.js    club records, head-to-heads, rivalry heat, Player of the Month, injury history, manager moves, stadiums
js/injuries.js   injury catalogue and risk model, training injuries, recovery, medical decisions (surgery, risk him?)
js/save.js       save format, migrations, storage backends (files / IndexedDB), backup export/import
js/simrun.js     runs matchday simulation in the Web Worker (js/sim-worker.js) with a progress overlay
js/native.js     Capacitor plugins with web fallbacks, back button, background autosave, boot
tools/           sim-test.mjs (regression test), calibrate.mjs (realism report), regens.mjs (career-shape test), harness.mjs (seeded loader they share), build.mjs (production build)
```

## Not yet built (next candidates)

See [docs/ROADMAP.md](docs/ROADMAP.md). Next is the last playtest feedback batch (platform), then Alpha 2: the database and world editor, historical eras and scenarios, the youth pathway, player and manager career histories, relationships, deeper economics and database export/import. The Living world backlog follows (Football World screen, club philosophy, deeper staff, tactical evolution, agents, media); device builds come before Beta.
