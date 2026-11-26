// A token-radar-01 entry (Node 22, standard library only).
//
// Fits from the sealed snapshot, ranks pre-token candidates, and includes explicitly labelled live
// tokens after them as the model's training/comparison set.
//
// Run: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { boardIssue, buildRadar, dataScript, parseSnapshot } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const TEXT_MAX_BYTES = 65_536;
const SCREENSHOT_CAPS = { max: 4, max_bytes: 524_288 };
const IMAGE_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  if (at >= 0 && at + 1 < process.argv.length) return process.argv[at + 1]!;
  const withEquals = process.argv.find((a) => a.startsWith(`--${name}=`));
  return withEquals === undefined ? fallback : withEquals.slice(name.length + 3);
}

const inputArg = arg('input', '/input');
const inputFile = inputArg.endsWith('.json') ? inputArg : join(inputArg, 'snapshot.json');
if (!existsSync(inputFile)) {
  process.stderr.write(`token radar: no snapshot at ${inputFile}: pass --input <snapshot.json|directory> or mount the sealed /input\n`);
  process.exit(2);
}
const out = arg('output', process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
const snapshot = parseSnapshot(readFileSync(inputFile, 'utf8'));
const { board, radar } = buildRadar(snapshot);
const issue = boardIssue(board, snapshot);
if (issue !== null) {
  process.stderr.write(`token radar: the model wrote a board the gate refuses: ${issue}\n`);
  process.exit(1);
}

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'board.json'), `${JSON.stringify({ rows: board })}\n`);
writeFileSync(join(out, 'data.js'), dataScript(radar));

function copyFiles(from: string, to: string): string[] {
  if (!existsSync(from)) return [];
  mkdirSync(to, { recursive: true });
  const copied: string[] = [];
  for (const name of readdirSync(from)) {
    const src = join(from, name);
    if (!statSync(src).isFile() || name.startsWith('.')) continue;
    copyFileSync(src, join(to, name));
    copied.push(name);
  }
  return copied.sort();
}

copyFiles(join(here, 'dashboard'), join(out, 'dashboard'));
writeFileSync(join(out, 'dashboard', 'data.js'), dataScript(radar));
const shots = copyFiles(join(here, 'screenshots'), join(out, 'screenshots'));
if (shots.length !== 3) process.stderr.write(`token radar: screenshots/ holds ${shots.length} images: hand in 3, the board, a detail view and a filtered view\n`);
for (const name of shots) if (!IMAGE_NAME.test(name)) throw new Error(`token radar: screenshots/${name}: a name is letters, digits and . _ -`);

writeFileSync(join(out, 'dossier.json'), buildDossier(out, {
  text_max_bytes: TEXT_MAX_BYTES,
  screenshots: SCREENSHOT_CAPS,
  dashboard: { max_files: 400, max_bytes: 4_194_304 },
}));

const f = radar.fit;
process.stdout.write(
  `token radar ${radar.model_version}: ${snapshot.protocols.length} protocols, ${f.train_n} live tokens, median multiple ${f.median_multiple.toFixed(2)}x (p10 ${f.p10_multiple.toFixed(2)}x, p90 ${f.p90_multiple.toFixed(2)}x, log-sd ${f.log_sd.toFixed(2)})\n` +
  `token radar: ${radar.watchlist_size} watchlist, ${radar.board_size} rows (${radar.early_size} pre-token rows outside watchlist, ${radar.live_size} live tokens explicitly labelled)\n` +
  `token radar: rank 1 is ${radar.rows.find((r) => r.pretoken)?.name ?? 'none'} at $${(radar.rows.find((r) => r.pretoken)?.implied_value_usd ?? 0).toLocaleString('en-US')} implied\n` +
  `token radar: wrote board.json, data.js, dashboard/ (${readdirSync(join(out, 'dashboard')).length} files), screenshots/ (${shots.length} images) and dossier.json\n`,
);
