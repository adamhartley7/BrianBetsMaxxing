#!/usr/bin/env node
/*
 * Fetches live 2026 World Cup odds from The Odds API and writes odds.json,
 * which index.html reads at load time (with a graceful fallback to its
 * baked-in odds when the file is missing or the fetch fails).
 *
 * No external dependencies — uses Node 18+ global fetch.
 * Required env: ODDS_API_KEY   (free key from https://the-odds-api.com)
 * Optional env: ODDS_SPORT_KEY (default: soccer_fifa_world_cup)
 *               ODDS_REGIONS   (default: us,uk,eu)
 */

const API_KEY = process.env.ODDS_API_KEY;
const REGIONS = process.env.ODDS_REGIONS || 'us,uk,eu';
const PREFERRED_SPORT = process.env.ODDS_SPORT_KEY || 'soccer_fifa_world_cup';
const BASE = 'https://api.the-odds-api.com/v4';

// The three fixtures the card tracks (id must match index.html match ids).
const FIXTURES = [
  { id: 'fra', teams: ['France', 'Iraq'] },
  { id: 'ger', teams: ['Germany', 'Ecuador'] },
  { id: 'esp', teams: ['Spain', 'Uruguay'] },
];

const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
const norm = s => (s || '').toLowerCase();
const decToImplied = dec => Math.round(100 / dec);
function decToAmerican(dec) {
  if (!isFinite(dec) || dec <= 1) return '';
  return dec >= 2 ? '+' + Math.round((dec - 1) * 100) : '' + Math.round(-100 / (dec - 1));
}
function hasTeam(name, want) {
  const n = norm(name), w = norm(want);
  return n.includes(w) || w.includes(n);
}

async function getJson(url) {
  const res = await fetch(url);
  const remaining = res.headers.get('x-requests-remaining');
  if (remaining != null) console.log(`API credits remaining: ${remaining}`);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw Object.assign(new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`), { status: res.status });
  }
  return res.json();
}

// Find the right sport key even if the default ever changes.
async function resolveSportKey() {
  try {
    const sports = await getJson(`${BASE}/sports/?apiKey=${API_KEY}&all=true`);
    const soccer = sports.filter(s => norm(s.group) === 'soccer');
    const exact = soccer.find(s => s.key === PREFERRED_SPORT);
    if (exact) return exact.key;
    const wc = soccer.find(s =>
      norm(s.title).includes('world cup') &&
      !norm(s.key).match(/winner|qualif|women|u20|u17/));
    if (wc) { console.log(`Using discovered sport key: ${wc.key} (${wc.title})`); return wc.key; }
  } catch (e) {
    console.warn('Sport lookup failed, falling back to preferred key:', e.message);
  }
  return PREFERRED_SPORT;
}

async function main() {
  if (!API_KEY) {
    console.warn('⚠️  ODDS_API_KEY not set — skipping refresh. Add it in repo Settings → Secrets and variables → Actions.');
    process.exit(0); // friendly no-op so scheduled runs don't show as failures
  }

  const sport = await resolveSportKey();
  const url = `${BASE}/sports/${sport}/odds/?apiKey=${API_KEY}&regions=${REGIONS}&markets=h2h&oddsFormat=decimal`;
  const events = await getJson(url);
  console.log(`Fetched ${events.length} ${sport} events.`);

  const out = { updated: new Date().toISOString(), source: '', matches: {} };
  let bookCount = 0;

  for (const fx of FIXTURES) {
    const ev = events.find(e =>
      fx.teams.every(t => hasTeam(e.home_team, t) || hasTeam(e.away_team, t)));
    if (!ev) { console.log(`No live market yet for ${fx.teams.join(' v ')}`); continue; }

    const prices = {}; // outcome name -> [decimal prices across books]
    for (const bk of ev.bookmakers || []) {
      const mkt = (bk.markets || []).find(m => m.key === 'h2h');
      if (!mkt) continue;
      for (const o of mkt.outcomes || []) (prices[o.name] = prices[o.name] || []).push(o.price);
    }

    const teamA = ev.home_team, teamB = ev.away_team;
    if (!(prices[teamA] || []).length || !(prices[teamB] || []).length) {
      console.log(`Incomplete market for ${fx.teams.join(' v ')}`); continue;
    }
    bookCount = Math.max(bookCount, (ev.bookmakers || []).length);

    const decA = avg(prices[teamA]);
    const decB = avg(prices[teamB]);
    const drawName = Object.keys(prices).find(n => norm(n) === 'draw');
    const decD = drawName ? avg(prices[drawName]) : null;

    const fav = decA <= decB ? { who: teamA, dec: decA } : { who: teamB, dec: decB };
    const dog = decA <= decB ? { who: teamB, dec: decB } : { who: teamA, dec: decA };
    const row = (who, cls, dec) => ({ who, cls, dec: dec.toFixed(2), am: decToAmerican(dec), pct: decToImplied(dec) });

    const rows = [row(fav.who, 'win', fav.dec)];
    if (decD) rows.push(row('Draw', 'draw', decD));
    rows.push(row(dog.who, 'lose', dog.dec));

    out.matches[fx.id] = { rows, fav: +fav.dec.toFixed(2) };
    console.log(`${fav.who} ${fav.dec.toFixed(2)} | draw ${decD ? decD.toFixed(2) : '-'} | ${dog.who} ${dog.dec.toFixed(2)}`);
  }

  if (Object.keys(out.matches).length === 0) {
    console.warn('No target fixtures in live markets (already played, or not posted yet) — leaving odds.json unchanged.');
    process.exit(0);
  }

  out.source = `the-odds-api.com · consensus of up to ${bookCount} books`;
  require('fs').writeFileSync('odds.json', JSON.stringify(out, null, 2) + '\n');
  console.log('Wrote odds.json ✅');
}

main().catch(e => { console.error('Fetch failed:', e.message); process.exit(1); });
