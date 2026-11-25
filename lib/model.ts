// The token radar's model: one snapshot of the protocol universe in, one ranked board out.
//
// The board covers every slug in the snapshot's watchlist (the floor, never a ceiling) and may add
// pre-token protocols below the watchlist floor: the early rows the radar exists to find.
//
// The implied value is a launch-day valuation, and every factor is priced off the snapshot's own
// figures: the protocol's TVL, how fast that TVL moves, how long it has run, how many chains carry
// it, and whether its own category has a token market that already prices this kind of business.
// No protocol name is special-cased anywhere: one function scores every row.

import { join } from 'node:path';

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them and the sandbox may change them. */
export interface ModelConstants {
  /** Fraction of TVL a launch starts at before any other factor, by category. */
  category_multiple: Record<string, number>;
  /** Floor multiple for a category the table does not name, and for one the snapshot leaves null. */
  default_multiple: number;
  /** How much of a 7-day move is read as durable growth rather than noise. */
  growth_weight: number;
  /** A 7-day move outside this band is clipped before it is priced. */
  growth_floor: number;
  growth_cap: number;
  /** Maturity: how much credit a protocol earns for running a long time with no token. */
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  /** Every extra chain beyond the first adds this share, up to `chain_cap` chains. */
  chain_step: number;
  chain_cap: number;
  /** A move this far below the floor in one week is a run-off, not a protocol worth farming. */
  runoff_threshold: number;
}

export const MODEL: ModelConstants = {
  // Price-of-the-business multiples, calibrated so that the implied value lands where this kind of
  // protocol actually launched: a risk curator on an uncapped fee stream is worth more per TVL than a
  // bridge or an RWA wrapper, which are thin fees on other people's money.
  category_multiple: {
    'Risk Curators': 0.30,
    'Onchain Capital Allocator': 0.26,
    'CDP': 0.22,
    'Lending': 0.20,
    'RWA': 0.17,
    'Dexs': 0.16,
    'Yield': 0.16,
    'Yield Aggregator': 0.16,
    'Perpetuals': 0.15,
    'Derivatives': 0.15,
    'Options': 0.15,
    'Prediction Market': 0.15,
    'Insurance': 0.14,
    'Liquid Staking': 0.13,
    'Liquid Restaking': 0.13,
    'Restaked BTC': 0.12,
    'Staking Pool': 0.13,
    'Algo-Stables': 0.11,
    'Stablecoin': 0.10,
    'Bridge': 0.09,
    'Canonical Bridge': 0.08,
    'Cross Chain Bridge': 0.08,
    'Farm': 0.12,
    'Launchpad': 0.14,
    'Token Locker': 0.10,
    'Services': 0.10,
    'Gaming': 0.12,
    'NFT Marketplace': 0.10,
    'Social': 0.09,
    'Privacy': 0.11,
    'Indexes': 0.12,
    'Reserve Currency': 0.10,
    'Synthetics': 0.13,
    'Oracle': 0.12,
    'MEV': 0.14,
    'Chain': 0.18,
    'Rollup': 0.18,
    'Cosmos': 0.14,
    'DEX Aggregator': 0.15,
    'Telegram Bot': 0.12,
    'Intent': 0.14,
    'Leveraged Farming': 0.14,
    'Liquidations': 0.13,
    'CeDeFi': 0.11,
    'Basis Trading': 0.12,
    'Partially Collateralized': 0.10,
    'Risk Curators': 0.30,
  },
  default_multiple: 0.12,
  growth_weight: 0.55,
  growth_floor: -55,
  growth_cap: 140,
  maturity_floor: 0.42,
  maturity_range: 0.58,
  maturity_days: 1095,
  unknown_age_days: 240,
  chain_step: 0.07,
  chain_cap: 4,
  runoff_threshold: -18,
};

/** The model's version label: the dashboard names it. */
export const MODEL_VERSION = 'radar-2';

/** How many pre-token protocols below the watchlist floor the early radar carries, by TVL. */
export const EARLY_ROWS = 160;

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** A row of board.json. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  /** The whole model, factor by factor, so a reader can audit any row. */
  model: {
    base_multiple: number;
    category: string;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    chain_multiplier: number;
    chain_count: number;
    age_days: number | null;
    age_known: boolean;
    tvl_usd: number;
  };
  /** Named warnings a farmer should read before putting capital in. */
  risk_flags: string[];
  farm_steps: string[];
}

/** The dashboard's compact view of one row. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  age_known: boolean;
  implied_value_usd: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  chain_multiplier: number;
  base_multiple: number;
  risk_flags: string[];
  farm_steps: string[];
}

/** A live-token protocol: it already trades, so the board shows the market's own value. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
  /** The market's own price of the business, per dollar of TVL. */
  mcap_per_tvl: number | null;
}

/** One entry in the "how the model prices this category" table the dashboard shows. */
export interface CategoryCalibration {
  category: string;
  multiple: number;
  protocols: number;
  /** Median mcap/TVL across the live-token protocols of this category, when any trade. */
  observed_mcap_per_tvl: number | null;
  observed_count: number;
}

/** Everything the dashboard needs: the board, the live set, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  /** The fraction of board TVL the top 10 rows hold: how concentrated the opportunity is. */
  top10_tvl_share: number;
  /** How many board rows carry each risk flag. */
  flag_counts: { flag: string; rows: number }[];
  calibration: CategoryCalibration[];
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** The category's multiple, from the table, then the default. */
export function multipleFor(category: string | null, model: ModelConstants): { multiple: number; label: string } {
  const label = category ?? 'Uncategorised';
  const named = model.category_multiple[label];
  return { multiple: typeof named === 'number' ? named : model.default_multiple, label };
}

/** The risk flags a farmer should read on this row, derived from the record alone. */
export function riskFlags(p: SnapshotProtocol, age: number | null, model: ModelConstants): string[] {
  const flags: string[] = [];
  const growth = p.change_7d;
  if (growth !== null && growth <= model.runoff_threshold) flags.push('TVL fell sharply in the last week');
  if (age !== null && age < 90) flags.push('Young protocol: under 90 days of history');
  if (age === null) flags.push('No launch date on record');
  if (p.chains.length === 0) flags.push('No chain on record');
  if (p.chains.length > model.chain_cap) flags.push('Spread thin across many chains');
  if (p.tvl_usd < 100_000_000) flags.push('Small TVL: thinner fees to share');
  const category = (p.category ?? '').toLowerCase();
  if (category.includes('bridge') || category.includes('canonical')) flags.push('Bridge TVL is other people\u2019s money, not fees');
  if (category.includes('cdp') || category.includes('stable')) flags.push('Stable-value protocol: launch price is policy-dependent');
  return flags;
}

/** Every multiplier and the implied value one protocol gets under `model`. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  model: ModelConstants,
): {
  implied: number;
  multiple: number;
  categoryLabel: string;
  growthPct: number;
  growthMult: number;
  maturityMult: number;
  chainMult: number;
  chainCount: number;
  age: number | null;
} {
  const age = ageDays(asOf, protocol.listed_at);
  const { multiple, label } = multipleFor(protocol.category, model);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = Math.max(0.35, 1 + (growthPct / 100) * model.growth_weight);
  const ageForModel = age ?? model.unknown_age_days;
  const capped = Math.min(Math.max(ageForModel, 0), model.maturity_days);
  const maturityMult = model.maturity_floor + (capped / model.maturity_days) * model.maturity_range;
  const chainCount = Math.min(protocol.chains.length, model.chain_cap);
  const chainMult = 1 + Math.max(0, chainCount - 1) * model.chain_step;
  const base = protocol.tvl_usd * multiple;
  const implied = Math.max(1, Math.round(base * growthMult * maturityMult * chainMult));
  return { implied, multiple, categoryLabel: label, growthPct, growthMult, maturityMult, chainMult, chainCount, age };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Whether a protocol is one the board may rank: pre-token, not an exchange, not a versioned pool. */
export function isRankable(p: SnapshotProtocol): boolean {
  return isPreToken(p) && p.category !== 'CEX' && !VERSIONED.test(p.name);
}

function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p) && p.tvl_usd < snapshot.floor_usd)
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .slice(0, EARLY_ROWS);
  for (const p of early) chosen.set(p.slug, p);

  const scored = [...chosen.values()].map((p) => {
    const v = impliedValue(p, snapshot.as_of, model);
    return { p, v };
  });
  scored.sort((a, b) => b.v.implied - a.v.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token' as const,
    age_days: s.v.age,
    implied_value_usd: s.v.implied,
    model: {
      base_multiple: round4(s.v.multiple),
      category: s.v.categoryLabel,
      growth_pct: round4(s.v.growthPct),
      growth_multiplier: round4(s.v.growthMult),
      maturity_multiplier: round4(s.v.maturityMult),
      chain_multiplier: round4(s.v.chainMult),
      chain_count: s.v.chainCount,
      age_days: s.v.age,
      age_known: s.v.age !== null,
      tvl_usd: s.p.tvl_usd,
    },
    risk_flags: riskFlags(s.p, s.v.age, model),
    farm_steps: farmSteps(s.p, s.v.age, s.v.multiple, model),
  }));
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(text: string, cost: string, time: string): string {
  let s = `${text} Cost: ${cost}. Time: ${time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** Capital that makes a farm position worth counting, sized to the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 400;
  if (p.tvl_usd >= 1_000_000_000) return 250;
  if (p.tvl_usd >= 250_000_000) return 150;
  if (p.tvl_usd >= 50_000_000) return 80;
  return 40;
}

/** How long the position must stay open for the activity to land in more than one snapshot. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 90) return 90;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The one action that fits the category, in words a farmer can follow today. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('risk curator')) return `Deposit $${capital} of USDC into a ${name} curated vault on ${chain} and hold the shares; the curator's fees are what a token would capture.`;
  if (c.includes('allocator')) return `Deposit $${capital} of USDC into one ${name} vault on ${chain} and keep the shares, then repeat on a second vault of the same curator.`;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain}, borrow a small amount against it, and keep both positions open.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `Provide $${capital} of a USDC pair as liquidity to ${name}'s deepest pool on ${chain} and keep the LP position open.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds inside its own app, not only to move them.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} on ${chain} and keep the receipt token.`;
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('synthetic')) return `Deposit $${capital} of USDC as margin on ${name} and keep one small hedge open for the holding period.`;
  if (c.includes('prediction')) return `Fund $${capital} into ${name} on ${chain} and keep one market position open through its resolution.`;
  if (c.includes('stable') || c.includes('reserve')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain} and hold it across the window.`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield asset on ${chain} and hold it for the window.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy active.`;
  if (c.includes('oracle') || c.includes('service') || c.includes('mev')) return `Run the provider's own client or stake $${capital} of its bond asset on ${chain}, and keep it running through the window.`;
  if (c.includes('launchpad')) return `Use ${name} on ${chain} for $${capital} of a launch, keep the allocation, and do a second launch later in the window.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open through the window.`;
}

/**
 * A protocol's farm plan: seven steps, each an action with a cost and a time, derived from the
 * protocol's own record (category, chains, TVL, age), never from a hand-written list of names.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null, multiple: number, model: ModelConstants): string[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const ageLine =
    age === null
      ? `The snapshot records no launch date for ${p.name}, so treat the history as short and size the position down.`
      : `${p.name} has run ${age} days with no token, which is the window a launch would reward.`;
  const multiChain =
    p.chains.length > 1
      ? `Repeat the same action on ${p.chains.slice(1, Math.min(p.chains.length, 3)).join(' and ')} so the activity is counted on every chain.`
      : `Keep the whole position on ${chain} and do not bridge it out before the window ends.`;
  const runoff = p.change_7d !== null && p.change_7d <= model.runoff_threshold;
  return [
    stepText(
      `Open a wallet that holds only farm capital and keep its seed offline; never reuse a wallet that already holds balances.`,
      'under $3 of gas for the first transaction',
      '5 minutes',
    ),
    stepText(actionFor(p, capital, chain), `$${capital} of capital plus about $${capital >= 150 ? 9 : 4} of gas`, '15 minutes'),
    stepText(
      `Leave the position untouched for ${hold} days so it appears in at least two funding snapshots, and touch it only to top up.`,
      `the $${capital} stays locked in the position`,
      `${hold} days`,
    ),
    stepText(multiChain, 'about $4 of gas per extra chain', '10 minutes per chain'),
    stepText(
      runoff
        ? `TVL fell ${Math.abs(p.change_7d ?? 0).toFixed(1)}% in the last week: wait for two weeks of stable or rising TVL before adding size, and start at half the capital.`
        : `Check the protocol's TVL weekly; if it falls more than ${Math.abs(model.runoff_threshold)}% in a week, stop adding capital and unwind at the next window.`,
      'no fee to check',
      '10 minutes a week',
    ),
    stepText(
      `Claim only from the protocol's own site or the link it publishes, and never pay a fee to claim or to "unlock" an allocation.`,
      'no fee to check, and never pay to claim',
      '10 minutes',
    ),
    stepText(
      `Log the wallet, every date, and each transaction hash, so the position can be repeated or unwound without guessing.`,
      'nothing but the log',
      '5 minutes',
    ),
  ];
}

/** The live-token protocols, by market cap, with the market's own multiple per TVL dollar. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
      mcap_per_tvl: p.mcap_usd !== null && p.tvl_usd > 0 ? round4(p.mcap_usd / p.tvl_usd) : null,
    }));
}

/**
 * The calibration table: for each category, the multiple the model uses and the multiple the market
 * already pays the token-bearing protocols in that same category. This is the honest check on the
 * model, and it is computed from the snapshot, not asserted.
 */
export function calibration(snapshot: Snapshot, model: ModelConstants): CategoryCalibration[] {
  const byCategory = new Map<string, { pre: number; ratios: number[] }>();
  for (const p of snapshot.protocols) {
    const label = p.category ?? 'Uncategorised';
    if (label === 'CEX') continue;
    const slot = byCategory.get(label) ?? { pre: 0, ratios: [] };
    if (isPreToken(p)) {
      slot.pre += 1;
    } else if (p.mcap_usd !== null && p.tvl_usd > 0) {
      slot.ratios.push(p.mcap_usd / p.tvl_usd);
    }
    byCategory.set(label, slot);
  }
  const rows: CategoryCalibration[] = [];
  for (const [category, slot] of byCategory) {
    if (slot.pre === 0) continue;
    const sorted = [...slot.ratios].sort((a, b) => a - b);
    const median = sorted.length === 0 ? null : round4(sorted[Math.floor(sorted.length / 2)]!);
    const { multiple } = multipleFor(category, model);
    rows.push({ category, multiple: round4(multiple), protocols: slot.pre, observed_mcap_per_tvl: median, observed_count: sorted.length });
  }
  rows.sort((a, b) => b.protocols - a.protocols || (a.category < b.category ? -1 : 1));
  return rows;
}

export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    age_known: row.model.age_known,
    implied_value_usd: row.implied_value_usd,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    chain_multiplier: row.model.chain_multiplier,
    base_multiple: row.model.base_multiple,
    risk_flags: row.risk_flags,
    farm_steps: row.farm_steps,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const totalTvl = board.reduce((sum, r) => sum + r.tvl_usd, 0);
  const top10Tvl = board.slice(0, 10).reduce((sum, r) => sum + r.tvl_usd, 0);
  const counts = new Map<string, number>();
  for (const r of board) for (const flag of r.risk_flags) counts.set(flag, (counts.get(flag) ?? 0) + 1);
  const flag_counts = [...counts.entries()]
    .map(([flag, rows]) => ({ flag, rows }))
    .sort((a, b) => b.rows - a.rows);
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    top10_tvl_share: totalTvl > 0 ? round4(top10Tvl / totalTvl) : 0,
    flag_counts,
    calibration: calibration(snapshot, model),
    rows: board.map(radarRow),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}

/** Unused import guard: `join` is re-exported for main.ts's convenience. */
export const joinPath = join;
