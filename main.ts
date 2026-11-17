// SILKSPAN hands itself in here: this program copies the playable game and its screenshots out of
// the repository into the grader's output directory and writes the dossier the judge reads. It runs
// on the grader's Node 22 with the standard library only and the kit's own dossier builder, and it
// writes exactly the same bytes on every run of the same tree.
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

/** The repository this program is part of: that is what it hands in. */
const here = fileURLToPath(new URL('.', import.meta.url));
/** Outside the grader, MAKEFUN_OUTPUT_DIR stands in for the grader's own /output. */
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/**
 * The scorer's own caps, passed straight to buildDossier. Only text_max_bytes shapes the dossier's
 * bytes; the rest refuse an entry the scorer would refuse anyway: more than four screenshots or one
 * over 256 KiB, more than 993 entries under game/ or 48 MiB of game files in all, or a path under
 * game/ longer than 1000 bytes.
 */
const SCORER_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

/** Every file under `root`, as paths relative to it. */
function listFiles(root) {
  const found = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const full = join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) found.push(relative(root, full));
    }
  };
  walk(root);
  return found;
}

/** Copy one directory of the repository into the output and report what went over. */
function handIn(source, destination, what) {
  if (!existsSync(source)) throw new Error(`nothing to hand in: ${source} is missing`);
  mkdirSync(destination, { recursive: true });
  cpSync(source, destination, { recursive: true });
  const files = listFiles(source);
  const bytes = files.reduce((total, file) => total + statSync(join(source, file)).size, 0);
  console.log(`${what}: ${files.length} file(s), ${bytes} bytes`);
  return files;
}

mkdirSync(out, { recursive: true });

const game = handIn(join(here, 'game'), join(out, 'game'), 'game/');
const shots = handIn(join(here, 'screenshots'), join(out, 'screenshots'), 'screenshots/');

if (!game.includes('index.html')) throw new Error('game/index.html is missing, so there is no game to play');
if (shots.length < 3) throw new Error(`screenshots/ holds ${shots.length} image(s); the entry needs three or four`);

writeFileSync(join(out, 'dossier.json'), buildDossier(out, SCORER_LIMITS));
console.log(`dossier.json: ${statSync(join(out, 'dossier.json')).size} bytes`);
console.log(`handed in at ${out}`);
