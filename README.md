# BrianBetsMaxxing 🎰

**Brian's BetsMaxx Briefing** — an interactive, mobile-first odds card for the 2026 World Cup group stage, built to screenshot straight onto a WhatsApp story.

## 📲 View it

Open **[`index.html`](index.html)** in any browser, or enable **GitHub Pages** (Settings → Pages → deploy from this branch) to get a shareable link.

## ⚽ What's inside

Researched odds for three group-stage matches:

| Match | Date | Favourite |
|---|---|---|
| 🇫🇷 France v Iraq 🇮🇶 | Mon 22 Jun · Philadelphia | France (~94%, -1500) |
| 🇩🇪 Germany v Ecuador 🇪🇨 | Thu 25 Jun · MetLife, NJ | Germany (~65%, -190) |
| 🇪🇸 Spain v Uruguay 🇺🇾 | Group H decider · Guadalajara | Spain (~61%, -155) |

> ℹ️ The original story said "France v Iran" — but in the group stage France play **Iraq**. Iran are in a different group. The card prices the real fixture.

### Features
- 🔀 Toggle odds between **Decimal / American / Implied %**
- 📊 Animated confidence bars per outcome
- 👆 Tap any match for the **smart-money angles**
- 🎟️ Live **accumulator calculator** (enter your stake)
- 📲 **Share** button (native share sheet) + 📋 **Copy bet slip**
- 📐 **Story mode** — reframes to a clean 9:16 layout for screenshotting onto a WhatsApp/Instagram story
- 🤖 Explainer: **how people actually use AI for sports betting**
- 💚 Responsible-gambling footer

Odds are refreshed as lines move toward kickoff (e.g. France shortened from -700 to -1500 on match day).

## 🤖 Live odds automation (optional)

The card reads **`odds.json`** at load time and falls back to its baked-in odds if that file is missing. A GitHub Action (`.github/workflows/refresh-odds.yml`) keeps `odds.json` fresh by pulling consensus lines from **[The Odds API](https://the-odds-api.com)**.

### One-time setup
1. **Merge this PR to `main`** — scheduled (cron) workflows only run from the default branch.
2. Get a **free API key** at [the-odds-api.com](https://the-odds-api.com) (500 requests/month free).
3. In the repo: **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `ODDS_API_KEY` · Value: your key
   - *(optional variables)* `ODDS_REGIONS` (default `us,uk,eu`), `ODDS_SPORT_KEY` (default `soccer_fifa_world_cup`)
4. **Actions tab → "Refresh World Cup odds" → Run workflow** to test it immediately.

### What it does
- Runs **twice daily**, plus extra refreshes in the hours before the Germany (Jun 25) and Spain (Jun 26) kickoffs.
- Fetches the head-to-head market, averages the decimal price across all books, and writes `odds.json` (decimal + American + implied %, favourite first).
- Commits the file **only when the odds change**.
- If `ODDS_API_KEY` isn't set, it skips quietly (no failed runs).

> 💡 Each run costs ~3 API credits, so the schedule stays comfortably inside the free tier.

You can also run it locally: `ODDS_API_KEY=yourkey node scripts/fetch-odds.js`

## ⚠️ Disclaimer
Odds are a snapshot and move before kickoff. For entertainment only. 18+ · please gamble responsibly · BeGambleAware.

Sources: ESPN, Sky Sports, BetMGM, Yahoo Sports, LeagueLane, Wincomparator.
