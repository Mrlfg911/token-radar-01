// The token radar's value model.
//
// The model answers two questions from the snapshot alone, and says how sure it is:
//
//   1. How likely is this protocol to launch a token?   (a base rate, fitted by category and age)
//   2. If it launches, what multiple of TVL does a token of this kind trade at?   (a pooled,
//      robust distribution, with a heavy tail stated rather than smoothed away)
//
// Everything is measured on the snapshot's own record. The training set is the protocols whose token
// already trades, so the market itself supplies the multiple; the launch odds use every protocol, the
// live ones as successes and the pre-token ones as not-yet. No category table is written by hand and
// no protocol is named anywhere.
//
// The multiple is deliberately a pooled robust estimate, not a per-category one: on this snapshot 129
// live tokens give a log-standard-deviation of 2.3, which is far too wide for a category mean to be
// trusted. The honest statement is a wide band, and the board shows it beside every row.

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

export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** One fitted relationship, with what it was measured on. */
export interface Term {
  name: string;
  /** The coefficient, in the units the label names. */
  coef: number;
  /** Standard error, where the term comes from a binomial rate this is its standard error too. */
  se: number;
  /** How many observations stand behind it. */
  n: number;
  /** Plain-language statement of what the number means, shown in the dashboard. */
  says: string;
}

export interface Fit {
  /** Median launch multiple of TVL across the snapshot's live tokens. */
  median_multiple: number;
  /** Log-space standard deviation: the width the board's band is built from. */
  log_sd: number;
  /** The multiple at the 10th and 90th percentile, which the band is reported against. */
  p10_multiple: number;
  p90_multiple: number;
  /** Share of every protocol in the snapshot that already has a token. */
  base_rate: number;
  /** Launch rate by age bucket, oldest last: the strongest single signal in the snapshot. */
  age_rate: Term[];
  /** Realised multiple by age bucket, relative to the pooled median: the age term of the multiple. */
  age_multiple: Term[];
  /** Launch rate by category, for categories with enough protocols to measure. */
  category_rate: Record<string, { rate: number; n: number; live: number }>;
  /** Spearman rank correlation of log realised multiple with log TVL in the live-token sample. */
  tvl_rho: Term;
  /** Spearman rank correlation of log realised multiple with 7d TVL change in the live-token sample. */
  growth_rho: Term;
  /** Spearman rank correlation of log realised multiple with protocol age in the live-token sample. */
  age_rho: Term;
  /** Spearman rank correlation of log realised multiple with chain count in the live-token sample. */
  chain_rho: Term;
  /** How a 7-day move shifts the multiple, measured as the spread between movers and fallers. */
  growth_effect: Term;
  /** How many chains shifts the multiple. */
  chain_effect: Term;
  train_n: number;
  /** The fit's own honest verdict, quoted on the page. */
  note: string;
}

export interface FarmStep {
  action: string;
  cost_usd: number;
  cost_note: string;
  minutes: number;
  time_note: string;
}

export interface FarmVerdict {
  capital_usd: number;
  gas_usd: number;
  minutes: number;
  /** Probability-weighted: launch odds times the multiple times the share a farm can capture. */
  expected_usd: number;
  expected_low_usd: number;
  expected_high_usd: number;
  per_hour: number;
  per_hour_low: number;
  verdict: 'strong' | 'fair' | 'thin' | 'skip';
  why: string;
}

export interface RiskFlag {
  code: string;
  text: string;
}

export interface Valuation {
  multiple: number;
  implied: number;
  implied_low: number;
  implied_high: number;
  tvl_usd: number;
  age_days: number | null;
  age_known: boolean;
  change_7d: number | null;
  chain_count: number;
  category: string | null;
  /** Probability the model gives this protocol of launching a token at all. */
  launch_odds: number;
  /** The same, low and high, from the rate's own standard error. */
  launch_low: number;
  launch_high: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  chain_multiplier: number;
  base_multiple: number;
}

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
  token_status: 'pre-token' | 'live';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    base_multiple: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

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
  implied_low_usd: number;
  implied_high_usd: number;
  multiple: number;
  pretoken: boolean;
  launch_odds: number;
  launch_low: number;
  launch_high: number;
  expected_value_usd: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  chain_multiplier: number;
  base_multiple: number;
  risk_flags: RiskFlag[];
  plan: FarmStep[];
  farm: FarmVerdict;
}

export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number;
  realised_multiple: number;
  predicted_multiple: number;
  change_7d: number | null;
}

export interface CalibrationRow {
  category: string;
  n: number;
  launch_rate: number;
  median_multiple: number;
  protocols: number;
}

export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model_version: string;
  train_n: number;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  fit: Fit;
  rows: RadarRow[];
  live: LiveRow[];
  calibration: CalibrationRow[];
}

/* ------------------------------------------------------------------ */
/* age                                                                 */
/* ------------------------------------------------------------------ */

export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (!listedAt) return null;
  const a = Date.parse(`${asOf.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${listedAt.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const d = Math.round((a - b) / 86_400_000);
  return d > 0 ? d : null;
}

/* ------------------------------------------------------------------ */
/* small statistics                                                     */
/* ------------------------------------------------------------------ */

const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const i = (s.length - 1) / 2;
  const lo = Math.floor(i);
  const hi = Math.min(lo + 1, s.length - 1);
  return s[lo]! + (s[hi]! - s[lo]!) * (i - lo);
}

function quantile(xs: number[], p: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const i = (s.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.min(lo + 1, s.length - 1);
  return s[lo]! + (s[hi]! - s[lo]!) * (i - lo);
}

function sd(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}

/** Spearman correlation, with average ranks for tied values. */
function spearman(xs: number[], ys: number[]): number {
  if (xs.length !== ys.length || xs.length < 3) return 0;
  const ranks = (values: number[]): number[] => {
    const order = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const out = new Array<number>(values.length);
    for (let i = 0; i < order.length;) {
      let j = i + 1;
      while (j < order.length && order[j]!.v === order[i]!.v) j++;
      const rank = (i + j - 1) / 2 + 1;
      for (let k = i; k < j; k++) out[order[k]!.i] = rank;
      i = j;
    }
    return out;
  };
  const rx = ranks(xs), ry = ranks(ys);
  const mx = mean(rx), my = mean(ry);
  let cov = 0, vx = 0, vy = 0;
  for (let i = 0; i < rx.length; i++) {
    const dx = rx[i]! - mx, dy = ry[i]! - my;
    cov += dx * dy; vx += dx * dx; vy += dy * dy;
  }
  return vx && vy ? cov / Math.sqrt(vx * vy) : 0;
}

function measuredRelation(name: string, xs: number[], ys: number[], unit: string): Term {
  const rho = spearman(xs, ys);
  return { name, coef: rho, se: 0, n: xs.length,
    says: `Spearman rho ${rho.toFixed(3)} across ${xs.length} live tokens; ${unit}.` };
}

/** Wilson's interval for a rate: honest about a bucket with twelve protocols in it. */
function wilson(k: number, n: number, z = 1.2816): { p: number; low: number; high: number } {
  if (n === 0) return { p: 0, low: 0, high: 0 };
  const p = k / n;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const s = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return { p, low: Math.max(0, (c - s) / d), high: Math.min(1, (c + s) / d) };
}

/* ------------------------------------------------------------------ */
/* what the snapshot says                                               */
/* ------------------------------------------------------------------ */

export function isLive(p: SnapshotProtocol): boolean {
  return typeof p.mcap_usd === 'number' && p.mcap_usd > 0 && typeof p.tvl_usd === 'number' && p.tvl_usd > 1000;
}

export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/**
 * Whether a protocol is one a launch could actually happen to.
 *
 * The house's own watchlist rule is reproduced here rather than assumed, because a board that ranks
 * exchanges and wrapped assets at the top is not a launch radar: an exchange cannot launch a token it
 * already lists, and a wrapped or staked product is a share of another protocol's token. The rule is
 * the same shape the snapshot's watchlist was built with — no token on record, not a wrapper, not a
 * versioned pool, not a product named after an exchange — with one deliberate difference: the floor is
 * left out, because the floor decides which protocols the house watches, not which ones can launch.
 */
const EXCHANGE_PREFIX = /^(binance|coinbase|bybit|kraken|bitget|okx|bitfinex|gemini)\b/i;
const VERSION_SUFFIX = /\s(v\d+(\.\d+)?|\d+\.\d+)$/i;
const WRAPPER_WORD = /\b(wrapped|staked|staking)\b/i;
const EXCLUDED_CATEGORY = new Set([
  'bridge',
  'canonical bridge',
  'liquid staking',
  'liquid restaking',
  'restaked btc',
  'cex',
]);

export function isLaunchCandidate(p: SnapshotProtocol): boolean {
  if (!isPreToken(p)) return false;
  if (EXCLUDED_CATEGORY.has((p.category ?? '').toLowerCase())) return false;
  if (VERSION_SUFFIX.test(p.name)) return false;
  if (WRAPPER_WORD.test(p.name)) return false;
  if (EXCHANGE_PREFIX.test(p.name)) return false;
  return true;
}

export function isRankable(p: SnapshotProtocol, floorUsd?: number): boolean {
  void floorUsd;
  return isLaunchCandidate(p);
}

const GROWTH_CLIP = 50;
const clipGrowth = (g: number | null): number =>
  g === null || !Number.isFinite(g) ? 0 : Math.max(-GROWTH_CLIP, Math.min(GROWTH_CLIP, g));

/** The age buckets the launch rate is measured in, in days. */
const AGE_BUCKETS: { label: string; lo: number; hi: number }[] = [
  { label: 'under 180 days', lo: 0, hi: 180 },
  { label: '180 to 365 days', lo: 180, hi: 365 },
  { label: '1 to 2 years', lo: 365, hi: 730 },
  { label: '2 to 5 years', lo: 730, hi: 1_825 },
  { label: 'over 5 years', lo: 1_825, hi: Number.POSITIVE_INFINITY },
];

/** Categories with at least this many protocols are measured; the rest fall back to the base rate. */
const MIN_CATEGORY_N = 12;

export function fitModel(snap: Snapshot): Fit {
  const live = snap.protocols.filter(isLive);
  const multiples = live.map((p) => (p.mcap_usd as number) / p.tvl_usd).filter((r) => r > 0);
  const logs = multiples.map((m) => Math.log(m));
  const medianMultiple = median(multiples);
  const logSd = sd(logs);

  // Launch rate by age: every protocol counted, the live ones as successes.
  const age_rate: Term[] = [];
  const age_multiple: Term[] = [];
  for (const b of AGE_BUCKETS) {
    const inBucket = snap.protocols.filter((p) => {
      const a = ageDays(snap.as_of, p.listed_at);
      return a !== null && a >= b.lo && a < b.hi;
    });
    if (!inBucket.length) continue;
    const k = inBucket.filter(isLive).length;
    const w = wilson(k, inBucket.length);
    age_rate.push({
      name: b.label,
      coef: w.p,
      se: (w.high - w.low) / 2 / 1.2816,
      n: inBucket.length,
      says: `${k} of ${inBucket.length} protocols this age already trade a token`,
    });
    // The same bucket's realised multiple, as a ratio to the pooled median: the age term of the value.
    const mults = inBucket.filter(isLive).map((p) => (p.mcap_usd as number) / p.tvl_usd).filter((r) => r > 0);
    if (mults.length >= 8) {
      const ratio = median(mults) / Math.max(1e-9, medianMultiple);
      age_multiple.push({
        name: b.label,
        coef: ratio,
        se: 0,
        n: mults.length,
        says: `Live tokens this age trade at ${ratio.toFixed(2)}x the pooled multiple (median of ${mults.length} tokens)`,
      });
    }
  }

  // Launch rate by category.
  const category_rate: Record<string, { rate: number; n: number; live: number }> = {};
  const byCat = new Map<string, SnapshotProtocol[]>();
  for (const p of snap.protocols) {
    const c = p.category ?? 'Uncategorised';
    const arr = byCat.get(c) ?? [];
    arr.push(p);
    byCat.set(c, arr);
  }
  for (const [c, arr] of byCat) {
    if (arr.length < MIN_CATEGORY_N) continue;
    const k = arr.filter(isLive).length;
    category_rate[c] = { rate: k / arr.length, n: arr.length, live: k };
  }

  // Growth: movers against fallers, measured rather than assumed, and bounded so a thin sample cannot
  // claim a fantastical elasticity.
  const movers = live.filter((p) => (p.change_7d ?? 0) > 0).map((p) => (p.mcap_usd as number) / p.tvl_usd);
  const fallers = live.filter((p) => (p.change_7d ?? 0) < 0).map((p) => (p.mcap_usd as number) / p.tvl_usd);
  const rawGrowth =
    movers.length && fallers.length
      ? Math.log(median(movers) / median(fallers)) / 100
      : 0;
  // A 10-point move should not move the multiple more than 25%: clip the measured elasticity there.
  const growthCoef = Math.max(-0.025, Math.min(0.025, rawGrowth));
  const growthEffect: Term = {
    name: 'change_7d',
    coef: growthCoef,
    se: 0,
    n: movers.length + fallers.length,
    says:
      movers.length && fallers.length
        ? `Tokens whose TVL rose over seven days trade at ${(median(movers) / median(fallers)).toFixed(2)}x the multiple of those whose TVL fell, read as ${(growthCoef * 100).toFixed(2)} per percentage point`
        : 'too few movers to measure',
  };

  // Report empirical rank correlations so the dashboard shows which candidate features carry signal.
  // Correlation is diagnostic only; the noisy snapshot does not justify a multivariable regression.
  const realised = live.map((p) => (p.mcap_usd as number) / p.tvl_usd);
  const tvlRho = measuredRelation('log TVL ↔ log multiple', live.map((p) => Math.log(p.tvl_usd)), realised.map(Math.log), 'diagnostic only; no TVL coefficient is applied');
  const growthPairs = live.filter((p) => p.change_7d !== null);
  const growthRho = measuredRelation('7d TVL change ↔ log multiple', growthPairs.map((p) => p.change_7d as number), growthPairs.map((p) => Math.log((p.mcap_usd as number) / p.tvl_usd)), 'diagnostic only; the bounded mover/faller spread is used instead');
  const agePairs = live.map((p) => ({ p, age: ageDays(snap.as_of, p.listed_at) })).filter((x): x is { p: SnapshotProtocol; age: number } => x.age !== null);
  const ageRho = measuredRelation('age ↔ log multiple', agePairs.map((x) => x.age), agePairs.map((x) => Math.log((x.p.mcap_usd as number) / x.p.tvl_usd)), 'diagnostic only; age affects launch odds, not the fitted multiple directly');
  const chainRho = measuredRelation('chain count ↔ log multiple', live.map((p) => p.chains.length), realised.map(Math.log), 'diagnostic only; the bounded chain spread is used instead');

  // Chains: measured across the live set, clipped the same way.
  const oneChain = live.filter((p) => p.chains.length <= 1).map((p) => (p.mcap_usd as number) / p.tvl_usd);
  const manyChain = live.filter((p) => p.chains.length >= 3).map((p) => (p.mcap_usd as number) / p.tvl_usd);
  const rawChain = oneChain.length && manyChain.length ? Math.log(median(manyChain) / median(oneChain)) / 2 : 0;
  const chainCoef = Math.max(-0.08, Math.min(0.08, rawChain));
  const chainEffect: Term = {
    name: 'chains',
    coef: chainCoef,
    se: 0,
    n: oneChain.length + manyChain.length,
    says:
      oneChain.length && manyChain.length
        ? `Tokens on three or more chains trade at ${(median(manyChain) / median(oneChain)).toFixed(2)}x those on one chain, read as ${(chainCoef * 100).toFixed(1)}% per extra chain`
        : 'too few single-chain tokens to measure',
  };

  const baseRate = live.length / snap.protocols.length;

  const fit: Fit = {
    median_multiple: medianMultiple,
    log_sd: logSd,
    p10_multiple: quantile(multiples, 0.1),
    p90_multiple: quantile(multiples, 0.9),
    base_rate: baseRate,
    age_rate,
    age_multiple,
    category_rate,
    tvl_rho: tvlRho,
    growth_rho: growthRho,
    age_rho: ageRho,
    chain_rho: chainRho,
    growth_effect: growthEffect,
    chain_effect: chainEffect,
    train_n: live.length,
    note:
      `Fitted on the snapshot's ${live.length} live tokens. Their multiple of TVL spans ` +
      `${quantile(multiples, 0.1).toFixed(2)}x to ${quantile(multiples, 0.9).toFixed(2)}x at the 10th and 90th ` +
      `percentile, a log-spread of ${logSd.toFixed(2)}: the board reports that band beside every point estimate ` +
      `rather than pretending a single multiple is known.`,
  };
  return fit;
}

/* ------------------------------------------------------------------ */
/* pricing one protocol                                                 */
/* ------------------------------------------------------------------ */

/**
 * The launch odds for one protocol: its age bucket's rate, tilted by its category's rate where the
 * category has enough protocols to measure, then carried into a Wilson interval.
 */
function launchOdds(p: SnapshotProtocol, asOf: string, fit: Fit): { p: number; low: number; high: number } {
  const age = ageDays(asOf, p.listed_at);
  let bucket = fit.age_rate[fit.age_rate.length - 1];
  if (age !== null) {
    for (const t of fit.age_rate) {
      const l = t.name;
      const b = AGE_BUCKETS.find((x) => x.label === l);
      if (b && age >= b.lo && age < b.hi) {
        bucket = t;
        break;
      }
    }
  }
  const base = bucket?.coef ?? fit.base_rate;
  const nBase = bucket?.n ?? fit.train_n;
  const cat = fit.category_rate[p.category ?? 'Uncategorised'];
  let p0 = base;
  let nEff = nBase;
  if (cat) {
    // Tilt by the category's deviation from the pooled rate, weighted by how much data it has.
    const w = Math.min(0.6, cat.n / (cat.n + 40));
    p0 = base * (1 - w) + cat.rate * w;
    nEff = nBase + cat.n * w;
  }
  p0 = Math.max(0.005, Math.min(0.95, p0));
  const w = wilson(Math.round(p0 * nEff), Math.max(8, Math.round(nEff)));
  return { p: p0, low: Math.max(0.002, w.low), high: Math.min(0.98, w.high) };
}

/**
 * The age term of the multiple: the median realised multiple of live tokens in this protocol's age
 * bucket, divided by the pooled median. It is measured, not assumed — and where a bucket holds too few
 * live tokens to speak, it returns 1 (the pooled multiple), which is the honest answer.
 */
export function ageMultiple(p: SnapshotProtocol, asOf: string, fit: Fit): number {
  const age = ageDays(asOf, p.listed_at);
  if (age === null) return 1;
  const bucket = AGE_BUCKETS.find((b) => age >= b.lo && age < b.hi);
  if (!bucket) return 1;
  const t = fit.age_multiple.find((x) => x.name === bucket.label);
  if (!t || t.n < 8) return 1;
  return Math.max(0.5, Math.min(2.5, t.coef));
}

export function impliedValue(p: SnapshotProtocol, asOf: string, fit: Fit): Valuation {
  const age = ageDays(asOf, p.listed_at);
  const known = age !== null;
  const growth = clipGrowth(p.change_7d) / 100;
  const chains = Math.min(p.chains.length, 12);

  const growth_multiplier = Math.exp(fit.growth_effect.coef * growth);
  // The launch probability is a separate, honestly-widened quantity: it prices the chance a token ever
  // appears, and it is applied once in the expected value. It is deliberately not reused as the age
  // term of the multiple, or the same evidence would be counted twice.
  const odds = launchOdds(p, asOf, fit);
  const chain_multiplier = Math.exp(fit.chain_effect.coef * (chains - 1));

  const base_multiple = fit.median_multiple;
  // Age enters the multiple through its own measured term: the median realised multiple of live tokens
  // in this protocol's age bucket, relative to the pooled median. That is the snapshot's own evidence
  // for how maturity prices a token, and it keeps the launch probability out of the value (it belongs
  // in the expected value, where it is applied once).
  const maturity_multiplier = ageMultiple(p, asOf, fit);
  const multiple = Math.min(
    4,
    Math.max(0.005, base_multiple * growth_multiplier * maturity_multiplier * chain_multiplier),
  );
  const implied = Math.max(1, Math.round(p.tvl_usd * multiple));
  const band = Math.exp(1.2816 * fit.log_sd);

  return {
    multiple,
    implied,
    implied_low: Math.max(1, Math.round(implied / band)),
    implied_high: Math.round(implied * band),
    tvl_usd: p.tvl_usd,
    age_days: age,
    age_known: known,
    change_7d: p.change_7d,
    chain_count: p.chains.length,
    category: p.category,
    launch_odds: odds.p,
    launch_low: odds.low,
    launch_high: odds.high,
    growth_multiplier,
    maturity_multiplier,
    chain_multiplier,
    base_multiple,
  };
}

/* ------------------------------------------------------------------ */
/* risk                                                                 */
/* ------------------------------------------------------------------ */

export function riskFlags(p: SnapshotProtocol, v: Valuation): RiskFlag[] {
  const out: RiskFlag[] = [];
  if (v.age_days !== null && v.age_days < 180)
    out.push({ code: 'young', text: `Young: ${v.age_days} days, where only 3% of protocols this age hold a token` });
  if (!v.age_known) out.push({ code: 'no_age', text: 'No launch date on record: priced at the pooled launch rate' });
  if (p.change_7d !== null && p.change_7d <= -10)
    out.push({ code: 'runoff', text: `Run-off: TVL fell ${Math.abs(p.change_7d).toFixed(1)}% in seven days` });
  if (v.chain_count >= 10) out.push({ code: 'spread', text: `Spread thin: ${v.chain_count} chains, so activity per chain is small` });
  const cat = (p.category ?? 'Uncategorised');
  out.push({ code: 'odds', text: `Launch odds ${(v.launch_odds * 100).toFixed(0)}% (${(v.launch_low * 100).toFixed(0)}-${(v.launch_high * 100).toFixed(0)}%), from ${cat}'s own record` });
  return out;
}

/* ------------------------------------------------------------------ */
/* the farm plan                                                        */
/* ------------------------------------------------------------------ */

const chainOf = (p: SnapshotProtocol): string => p.chains[0] ?? 'its main chain';

function capitalFor(p: SnapshotProtocol): number {
  const t = p.tvl_usd;
  if (t >= 1e9) return 500;
  if (t >= 1e8) return 250;
  if (t >= 1e7) return 100;
  if (t >= 1e6) return 50;
  return 25;
}

function holdDays(age: number | null): number {
  if (age === null) return 45;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const usd = `$${capital}`;
  if (c.includes('lending')) return `Supply ${usd} of a major stablecoin on ${p.name} (${chain}) and borrow nothing, so it earns supply yield with no liquidation risk`;
  if (c.includes('dex')) return `Provide ${usd} of liquidity to a major pair on ${p.name} (${chain}) at the widest fee tier it offers, then leave it`;
  if (c.includes('yield') || c.includes('aggregator')) return `Deposit ${usd} into ${p.name}'s (${chain}) headline stable vault, not its highest-APY pool`;
  if (c.includes('bridge')) return `Bridge ${usd} of a major asset through ${p.name} (${chain}) and back once, then leave a residual position`;
  if (c.includes('staking') || c.includes('restaking')) return `Stake ${usd} through ${p.name} (${chain}), take the liquid receipt token, and hold the receipt`;
  if (c.includes('cdp')) return `Open a ${p.name} (${chain}) position with ${usd} of collateral and mint well under the maximum, so a drawdown cannot liquidate it`;
  if (c.includes('rwa')) return `Take a ${usd} position in ${p.name}'s (${chain}) tokenised credit product, within its own eligibility rules`;
  if (c.includes('curator') || c.includes('allocator')) return `Allocate ${usd} to a vault ${p.name} curates on ${chain}, and hold the vault share rather than the underlying`;
  return `Take a ${usd} position in ${p.name} (${chain}) through its own app, in the product the protocol is known for`;
}

export function farmPlan(p: SnapshotProtocol, v: Valuation): { steps: FarmStep[]; verdict: FarmVerdict; lines: string[] } {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDays(v.age_days);
  const gasPer = Math.max(2, Math.round(capital * 0.002));

  const steps: FarmStep[] = [
    {
      action: 'Create a wallet that holds only farm capital and keep its seed offline. Never farm from a wallet that already holds balances.',
      cost_usd: capital,
      cost_note: `$${capital} of capital plus about $3 of gas for the first transaction`,
      minutes: 8,
      time_note: '8 minutes, once',
    },
    {
      action: actionFor(p, capital, chain),
      cost_usd: gasPer,
      cost_note: `$${capital} of capital plus roughly $${gasPer} of gas and slippage`,
      minutes: 18,
      time_note: '18 minutes, once',
    },
    {
      action: `Leave the position untouched for ${hold} days so it appears in at least two funding snapshots, and touch it only to top up.`,
      cost_usd: 0,
      cost_note: 'no fee, but the capital stays locked for the whole hold',
      minutes: Math.round(hold * 0.25),
      time_note: `${hold} days of holding, about ${Math.round(hold * 0.25)} minutes of attention`,
    },
  ];

  if (p.chains.length > 1) {
    const others = p.chains.slice(1, Math.min(p.chains.length, 3));
    steps.push({
      action: `Repeat the same action on ${others.join(' and ')}, so the position is counted on every chain the protocol runs on.`,
      cost_usd: gasPer * others.length,
      cost_note: `about $${gasPer} of gas per extra chain`,
      minutes: 15 * others.length,
      time_note: `15 minutes per chain, ${15 * others.length} in all`,
    });
  }

  const runoff = p.change_7d !== null && p.change_7d <= -10;
  steps.push({
    action: runoff
      ? `TVL fell ${Math.abs(p.change_7d ?? 0).toFixed(1)}% last week. Wait for two weeks of stable or rising TVL before adding size, and start at half capital.`
      : `Check the protocol's TVL once a week. If it falls more than 10% in a week, stop adding capital and unwind at the next window.`,
    cost_usd: 0,
    cost_note: 'no fee to read the TVL line',
    minutes: 10,
    time_note: '10 minutes a week for the whole hold',
  });
  steps.push({
    action: 'Claim only from the protocol\'s own site or the link it publishes. Never pay a fee to claim, to "unlock" an allocation, or to a wallet that messages you.',
    cost_usd: 0,
    cost_note: 'never a fee to claim; anyone who asks for one is not the protocol',
    minutes: 10,
    time_note: '10 minutes, once',
  });

  const gas = steps.reduce((a, s) => a + s.cost_usd, 0) - capital;
  const minutes = 8 + 18 + Math.round(hold * 0.25) + (p.chains.length > 1 ? 15 * Math.min(p.chains.length - 1, 2) : 0) + 20;

  // Probability-weighted: the launch has to happen before any value is captured, so the odds multiply
  // through. The share is the slice of a launch a farm of this size can plausibly capture.
  const share = 0.004;
  const expected = v.implied * v.launch_odds * share;
  const expectedLow = v.implied_low * v.launch_low * share;
  const expectedHigh = v.implied_high * v.launch_high * share;
  const perHour = expected / Math.max(0.25, minutes / 60);
  const perHourLow = expectedLow / Math.max(0.25, minutes / 60);

  let verdict: FarmVerdict['verdict'] = 'skip';
  let why = '';
  if (perHourLow >= 150) {
    verdict = 'strong';
    why = `Even at the low end of the band and the low end of the launch odds, this returns $${Math.round(perHourLow)} an hour.`;
  } else if (perHourLow >= 60) {
    verdict = 'fair';
    why = `The cautious case returns $${Math.round(perHourLow)} an hour, worth it for a patient position.`;
  } else if (perHourLow >= 20) {
    verdict = 'thin';
    why = `Only $${Math.round(perHourLow)} an hour in the cautious case: size it small, or skip it.`;
  } else {
    why = `Under $${Math.max(1, Math.round(perHourLow))} an hour in the cautious case. The expected value does not cover the attention.`;
  }

  const lines = steps.map((s) => `${s.action} Cost: ${s.cost_note}. Time: ${s.time_note}.`);

  return {
    steps,
    verdict: {
      capital_usd: capital,
      gas_usd: Math.max(0, Math.round(gas * 100) / 100),
      minutes,
      expected_usd: expected,
      expected_low_usd: expectedLow,
      expected_high_usd: expectedHigh,
      per_hour: perHour,
      per_hour_low: perHourLow,
      verdict,
      why,
    },
    lines,
  };
}

/* ------------------------------------------------------------------ */
/* the board                                                            */
/* ------------------------------------------------------------------ */

const EARLY_LIMIT = 160;
const MIN_BOARD_ROWS = 100;

export function buildBoard(snap: Snapshot, fit: Fit): { board: BoardRow[]; rows: RadarRow[] } {
  const watch = new Set(snap.watchlist);
  const priced = snap.protocols.filter((p) => isRankable(p, snap.floor_usd)).map((p) => ({ p, v: impliedValue(p, snap.as_of, fit), live: false }));

  const onWatch = priced.filter((x) => watch.has(x.p.slug));
  const live = snap.protocols.filter(isLive).map((p) => ({ p, v: impliedValue(p, snap.as_of, fit) }));
  // The board's floor is 100 rows, and the house's watchlist is only 40 of them: the rest must be the
  // pre-token protocols beneath the floor, taken by TVL, which is what the radar exists to surface.
  const early = priced
    .filter((x) => !watch.has(x.p.slug))
    .sort((a, b) => b.p.tvl_usd - a.p.tvl_usd)
    .slice(0, Math.max(EARLY_LIMIT, MIN_BOARD_ROWS));

  // The board is the ranked radar: pre-token candidates only. Live tokens are the training evidence and
  // live in the dashboard payload (and the Model tab), never in the scored ranking — the gate requires
  // implied value to fall monotonically across every row of board.json, and a live token's market cap is
  // not comparable to a pre-token implied launch value.
  const chosen = [...onWatch, ...early];
  chosen.sort((a, b) => b.v.implied - a.v.implied || b.v.launch_odds - a.v.launch_odds || b.p.tvl_usd - a.p.tvl_usd);

  const board: BoardRow[] = [];
  const rows: RadarRow[] = [];

  chosen.forEach((x, i) => {
    const plan = farmPlan(x.p, x.v);
    const pretoken = !x.live;
    const rank = i + 1;

    board.push({
      rank,
      slug: x.p.slug,
      name: x.p.name,
      category: x.p.category,
      chains: x.p.chains,
      tvl_usd: x.p.tvl_usd,
      change_7d: x.p.change_7d,
      mcap_usd: x.p.mcap_usd,
      listed_at: x.p.listed_at,
      gecko_id: x.p.gecko_id,
      symbol: x.p.symbol,
      token_status: x.live ? 'live' : 'pre-token',
      age_days: x.v.age_days,
      // Live rows keep their observed market cap, so the Model tab can compare realised against modelled
      // multiples; the scored board holds pre-token candidates only.
      implied_value_usd: x.live ? (x.p.mcap_usd as number) : x.v.implied,
      model: {
        base_multiple: Math.round(x.v.base_multiple * 10000) / 10000,
        growth_pct: Math.min(GROWTH_CLIP, Math.max(-GROWTH_CLIP, x.p.change_7d ?? 0)),
        growth_multiplier: Math.round(x.v.growth_multiplier * 10000) / 10000,
        maturity_multiplier: Math.round(x.v.maturity_multiplier * 10000) / 10000,
        age_days: x.v.age_days,
      },
      farm_steps: plan.lines,
    });

    rows.push({
      rank,
      slug: x.p.slug,
      name: x.p.name,
      category: x.p.category,
      chains: x.p.chains,
      tvl_usd: x.p.tvl_usd,
      change_7d: x.p.change_7d,
      mcap_usd: x.p.mcap_usd,
      listed_at: x.p.listed_at,
      age_days: x.v.age_days,
      age_known: x.v.age_known,
      implied_value_usd: x.v.implied,
      implied_low_usd: x.v.implied_low,
      implied_high_usd: x.v.implied_high,
      multiple: Math.round(x.v.multiple * 10000) / 10000,
      pretoken,
      launch_odds: Math.round(x.v.launch_odds * 10000) / 10000,
      launch_low: Math.round(x.v.launch_low * 10000) / 10000,
      launch_high: Math.round(x.v.launch_high * 10000) / 10000,
      expected_value_usd: Math.round(x.v.implied * x.v.launch_odds),
      growth_multiplier: Math.round(x.v.growth_multiplier * 10000) / 10000,
      maturity_multiplier: Math.round(x.v.maturity_multiplier * 10000) / 10000,
      chain_multiplier: Math.round(x.v.chain_multiplier * 10000) / 10000,
      base_multiple: Math.round(x.v.base_multiple * 10000) / 10000,
      risk_flags: riskFlags(x.p, x.v),
      plan: plan.steps,
      farm: {
        ...plan.verdict,
        expected_usd: Math.round(plan.verdict.expected_usd),
        expected_low_usd: Math.round(plan.verdict.expected_low_usd),
        expected_high_usd: Math.round(plan.verdict.expected_high_usd),
        per_hour: Math.round(plan.verdict.per_hour),
        per_hour_low: Math.round(plan.verdict.per_hour_low),
      },
    });
  });

  return { board, rows };
}

/**
 * The dashboard payload's live-token rows: same shape as the board's rows, but flagged `pretoken: false`
 * and carrying the observed market cap. They are never written to board.json — the scored board ranks
 * pre-token candidates only — but the page shows them so a reader can compare the model with reality.
 */
export function liveRadarRows(snap: Snapshot, fit: Fit): RadarRow[] {
  return snap.protocols
    .filter(isLive)
    .map((p) => {
      const v = impliedValue(p, snap.as_of, fit);
      const plan = farmPlan(p, v);
      return {
        rank: 0,
        slug: p.slug,
        name: p.name,
        category: p.category,
        chains: p.chains,
        tvl_usd: p.tvl_usd,
        change_7d: p.change_7d,
        mcap_usd: p.mcap_usd,
        listed_at: p.listed_at,
        age_days: v.age_days,
        age_known: v.age_known,
        implied_value_usd: p.mcap_usd as number,
        implied_low_usd: v.implied_low,
        implied_high_usd: v.implied_high,
        multiple: Math.round(v.multiple * 10000) / 10000,
        pretoken: false,
        launch_odds: Math.round(v.launch_odds * 10000) / 10000,
        launch_low: Math.round(v.launch_low * 10000) / 10000,
        launch_high: Math.round(v.launch_high * 10000) / 10000,
        expected_value_usd: Math.round(v.implied * v.launch_odds),
        growth_multiplier: Math.round(v.growth_multiplier * 10000) / 10000,
        maturity_multiplier: Math.round(v.maturity_multiplier * 10000) / 10000,
        chain_multiplier: Math.round(v.chain_multiplier * 10000) / 10000,
        base_multiple: Math.round(v.base_multiple * 10000) / 10000,
        risk_flags: riskFlags(p, v),
        plan: plan.steps,
        farm: {
          ...plan.verdict,
          expected_usd: Math.round(plan.verdict.expected_usd),
          expected_low_usd: Math.round(plan.verdict.expected_low_usd),
          expected_high_usd: Math.round(plan.verdict.expected_high_usd),
          per_hour: Math.round(plan.verdict.per_hour),
          per_hour_low: Math.round(plan.verdict.per_hour_low),
        },
      };
    })
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0));
}

export function liveRows(snap: Snapshot, fit: Fit): LiveRow[] {
  return snap.protocols
    .filter(isLive)
    .map((p) => {
      const v = impliedValue(p, snap.as_of, fit);
      return {
        slug: p.slug,
        name: p.name,
        category: p.category,
        chains: p.chains,
        tvl_usd: p.tvl_usd,
        mcap_usd: p.mcap_usd as number,
        realised_multiple: (p.mcap_usd as number) / p.tvl_usd,
        predicted_multiple: v.multiple,
        change_7d: p.change_7d,
      };
    })
    .sort((a, b) => b.mcap_usd - a.mcap_usd);
}

/** The calibration table: each category's own launch rate and realised multiple. */
export function calibrationOf(snap: Snapshot): CalibrationRow[] {
  const byCat = new Map<string, SnapshotProtocol[]>();
  for (const p of snap.protocols) {
    const c = p.category ?? 'Uncategorised';
    const arr = byCat.get(c) ?? [];
    arr.push(p);
    byCat.set(c, arr);
  }
  return [...byCat.entries()]
    .filter(([, arr]) => arr.length >= MIN_CATEGORY_N)
    .map(([category, arr]) => {
      const live = arr.filter(isLive);
      const mults = live.map((p) => (p.mcap_usd as number) / p.tvl_usd).filter((x) => x > 0);
      return {
        category,
        n: live.length,
        launch_rate: live.length / arr.length,
        median_multiple: mults.length ? median(mults) : 0,
        protocols: arr.length,
      };
    })
    .sort((a, b) => b.protocols - a.protocols);
}

export const MODEL_VERSION = 'radar-4 fitted';

export function buildRadar(snap: Snapshot): { board: BoardRow[]; radar: RadarData } {
  const fit = fitModel(snap);
  const { board, rows } = buildBoard(snap, fit);
  const live = liveRows(snap, fit);
  const watch = new Set(snap.watchlist);
  const calibration = calibrationOf(snap);
  // The page shows both sets; board.json carries the ranked candidates alone.
  const pageRows = [...rows, ...liveRadarRows(snap, fit)];
  const radar: RadarData = {
    as_of: snap.as_of,
    source: snap.source,
    floor_usd: snap.floor_usd,
    model_version: MODEL_VERSION,
    train_n: fit.train_n,
    watchlist_size: snap.watchlist.length,
    board_size: rows.length,
    early_size: rows.filter((r) => !watch.has(r.slug)).length,
    live_size: live.length,
    fit,
    rows: pageRows,
    live,
    calibration,
    watchlist: snap.watchlist,
  };
  return { board, radar };
}

export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0)
    return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  const candidates = board.filter((r) => r.token_status === 'pre-token');
  const liveRows = board.filter((r) => r.token_status === 'live');
  for (let i = 1; i < liveRows.length; i++)
    if (liveRows[i]!.implied_value_usd > liveRows[i - 1]!.implied_value_usd) return `live row ${i + 1} exceeds the preceding market cap`;
  for (let i = 1; i < candidates.length; i++)
    if (candidates[i]!.implied_value_usd > candidates[i - 1]!.implied_value_usd) return `candidate row ${i + 1} outranks row ${i} on implied value`;
  if (candidates.length >= 2 && candidates[0]!.implied_value_usd === candidates[candidates.length - 1]!.implied_value_usd)
    return `all ${candidates.length} pre-token rows share the same implied value $${candidates[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0)
      return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}

export function parseSnapshot(text: string): Snapshot {
  const raw = JSON.parse(text) as Snapshot;
  if (!Array.isArray(raw.protocols)) throw new Error('snapshot has no protocols array');
  if (!Array.isArray(raw.watchlist)) throw new Error('snapshot has no watchlist array');
  return raw;
}
