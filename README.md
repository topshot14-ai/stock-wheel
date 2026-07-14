# 🎯 Stock Wheel

Spin a wheel to get a random stock from the top 100 biggest US-listed companies.

**Live site:** https://topshot14-ai.github.io/stock-wheel/

## Features
- Four wheel modes:
  - **Top 100** — 100 biggest US stocks by market cap
  - **S&P 500** — all 503 constituents (labels hidden, 503 slices is a lot)
  - **High Volume** — the most actively traded names
  - **Degen 🎰** — memes, crypto plays, quantum lottos, and leveraged ETFs
- Slices color-coded by sector (or degen category), tick sound as the wheel spins
- After the stock lands, a second mini-wheel spins for direction: **CALL 📈** or **PUT 📉**
- Result card with ticker, company name, sector, and one-click links to TradingView and Yahoo Finance
- Spin history saved in your browser (localStorage), tagged with the mode used

## Updating the stock lists
- `stocks.js` — Top 100, High Volume, and Degen lists, plus the `MODES` config. Edit and push.
- `sp500.js` — generated from [datasets/s-and-p-500-companies](https://github.com/datasets/s-and-p-500-companies) constituents.csv. Re-run the generator against a fresh CSV to update.

All lists are snapshots as of July 2026.

## Stack
Plain HTML/CSS/JS, no build step, no dependencies. Hosted on GitHub Pages.
