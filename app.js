(() => {
  const canvas = document.getElementById("wheel");
  const ctx = canvas.getContext("2d");
  const spinBtn = document.getElementById("spin-btn");
  const liveTicker = document.getElementById("live-ticker");
  const resultCard = document.getElementById("result-card");
  const resultTicker = document.getElementById("result-ticker");
  const resultName = document.getElementById("result-name");
  const resultSector = document.getElementById("result-sector");
  const linkTV = document.getElementById("link-tv");
  const linkYahoo = document.getElementById("link-yahoo");
  const historyList = document.getElementById("history-list");
  const historyEmpty = document.getElementById("history-empty");
  const clearBtn = document.getElementById("clear-history");

  const N = STOCKS.length;
  const STEP = (Math.PI * 2) / N;
  const POINTER = -Math.PI / 2; // 12 o'clock

  const SECTOR_COLORS = {
    "Technology": ["#2563eb", "#1d4ed8"],
    "Financials": ["#0891b2", "#0e7490"],
    "Healthcare": ["#dc2626", "#b91c1c"],
    "Consumer Disc.": ["#d97706", "#b45309"],
    "Consumer Staples": ["#65a30d", "#4d7c0f"],
    "Communication": ["#7c3aed", "#6d28d9"],
    "Energy": ["#ea580c", "#c2410c"],
    "Industrials": ["#475569", "#334155"],
    "Utilities": ["#ca8a04", "#a16207"],
    "Materials": ["#0d9488", "#0f766e"],
    "Real Estate": ["#db2777", "#be185d"],
  };

  let rotation = 0;      // current wheel rotation in radians
  let spinning = false;

  // ---- Drawing ----
  function draw() {
    const w = canvas.width;
    const cx = w / 2;
    const r = w / 2 - 6;
    ctx.clearRect(0, 0, w, w);
    ctx.save();
    ctx.translate(cx, cx);
    ctx.rotate(rotation);

    for (let i = 0; i < N; i++) {
      const a0 = i * STEP;
      const a1 = a0 + STEP;
      const colors = SECTOR_COLORS[STOCKS[i].s] || ["#6b7280", "#4b5563"];
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, a0, a1);
      ctx.closePath();
      ctx.fillStyle = colors[i % 2];
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // ticker labels, pointing outward along each slice's center line
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "700 11px -apple-system, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i < N; i++) {
      ctx.save();
      ctx.rotate(i * STEP + STEP / 2);
      ctx.fillText(STOCKS[i].t, r - 10, 0);
      ctx.restore();
    }

    // outer rim
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#2a3245";
    ctx.stroke();

    ctx.restore();
  }

  // Index of the slice currently under the pointer
  function indexAtPointer() {
    let a = (POINTER - rotation) % (Math.PI * 2);
    if (a < 0) a += Math.PI * 2;
    return Math.floor(a / STEP) % N;
  }

  // ---- Tick sound (WebAudio, no assets) ----
  let audioCtx = null;
  function tick() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = "square";
      o.frequency.value = 1800;
      g.gain.setValueAtTime(0.04, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.03);
      o.connect(g).connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + 0.03);
    } catch (e) { /* audio blocked — fine */ }
  }

  // ---- Spin ----
  function spin() {
    if (spinning) return;
    spinning = true;
    spinBtn.disabled = true;
    resultCard.classList.add("hidden");

    const winner = Math.floor(Math.random() * N);
    // Land the winner's slice under the pointer, with a little jitter inside the slice
    const jitter = (Math.random() - 0.5) * STEP * 0.7;
    const winnerCenter = winner * STEP + STEP / 2;
    let desired = POINTER - winnerCenter + jitter;

    const TWO_PI = Math.PI * 2;
    let delta = (desired - rotation) % TWO_PI;
    if (delta < 0) delta += TWO_PI;
    const extraSpins = 6 + Math.floor(Math.random() * 3); // 6-8 full turns
    const total = delta + extraSpins * TWO_PI;

    const start = rotation;
    const duration = 5200 + Math.random() * 800;
    const t0 = performance.now();
    let lastIdx = indexAtPointer();

    function frame(now) {
      const t = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4); // ease-out quart
      rotation = start + total * eased;
      draw();

      const idx = indexAtPointer();
      if (idx !== lastIdx) {
        lastIdx = idx;
        liveTicker.textContent = STOCKS[idx].t;
        tick();
      }

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        rotation = ((desired % TWO_PI) + TWO_PI) % TWO_PI;
        draw();
        finish(STOCKS[winner]);
      }
    }
    requestAnimationFrame(frame);
  }

  function finish(stock) {
    spinning = false;
    spinBtn.disabled = false;
    liveTicker.textContent = stock.t;

    resultTicker.textContent = stock.t;
    resultName.textContent = stock.n;
    resultSector.textContent = stock.s;
    linkTV.href = "https://www.tradingview.com/chart/?symbol=" + encodeURIComponent(stock.t);
    linkYahoo.href = "https://finance.yahoo.com/quote/" + encodeURIComponent(stock.t.replace(".", "-"));
    resultCard.classList.remove("hidden");

    addHistory(stock);
  }

  // ---- History (localStorage) ----
  const KEY = "stock-wheel-history";

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch (e) { return []; }
  }

  function saveHistory(items) {
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, 50)));
  }

  function addHistory(stock) {
    const items = loadHistory();
    items.unshift({ t: stock.t, n: stock.n, at: Date.now() });
    saveHistory(items);
    renderHistory();
  }

  function renderHistory() {
    const items = loadHistory();
    historyList.innerHTML = "";
    historyEmpty.style.display = items.length ? "none" : "block";
    for (const it of items) {
      const li = document.createElement("li");
      const when = new Date(it.at).toLocaleString([], {
        month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
      });
      li.innerHTML =
        '<span class="h-ticker"></span><span class="h-name"></span><span class="h-time"></span>';
      li.querySelector(".h-ticker").textContent = it.t;
      li.querySelector(".h-name").textContent = it.n;
      li.querySelector(".h-time").textContent = when;
      historyList.appendChild(li);
    }
  }

  clearBtn.addEventListener("click", () => {
    localStorage.removeItem(KEY);
    renderHistory();
  });

  spinBtn.addEventListener("click", spin);

  draw();
  renderHistory();
})();
