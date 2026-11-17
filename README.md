# SILKSPAN

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/De4i/silkspan/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/De4i/silkspan/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A silk-line crate game for make.fun's "Make the best game" bounty. Harvest crates ride a canopy
chute to the lip of a gorge; on the way down you string taut silk between the posts standing in
the river, and each crate leaves a line along its own bounce. A short tight span throws a crate
far; a long loose one drops it short. Walk them into the three bays of the loading dock, mind the
wicker shells that crack on a tight line and the anvils that leave a line hot, and clear six
shipments before the barge sails.

## Run it

```sh
node serve.ts            # serves game/ on http://localhost:8080
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # what the grader runs
```

## Layout

- `game/` — the playable game: static files, no build step, no network request, no library.
- `game/src/state.js` — the rules, stepped at a fixed rate, with no DOM in sight.
- `game/src/silk.js` — a span's resting curve and what a crate feels when it lands on one.
- `game/src/autopilot.js` — the same plan-the-throw search the screenshot scenes play through.
- `main.ts` — hands `game/` and `screenshots/` in and writes `dossier.json`.

---

<sub>Entered on [make.fun](https://make.fun?utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
