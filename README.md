# 🎯 Stock Wheel

Spin a wheel to get a random stock from the top 100 biggest US-listed companies.

**Live site:** https://topshot14-ai.github.io/stock-wheel/

## Features
- Spinning wheel with all 100 tickers, color-coded by sector
- Result card with ticker, company name, sector, and one-click links to TradingView and Yahoo Finance
- Spin history saved in your browser (localStorage)

## Updating the stock list
Edit `stocks.js` — the wheel rebuilds itself from that array automatically. The current list is a snapshot of the top 100 US-listed stocks by market cap as of July 2026.

## Stack
Plain HTML/CSS/JS, no build step, no dependencies. Hosted on GitHub Pages.
