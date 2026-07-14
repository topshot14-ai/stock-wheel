(() => {
  const canvas = document.getElementById("wheel");
  const ctx = canvas.getContext("2d");
  const spinBtn = document.getElementById("spin-btn");
  const liveTicker = document.getElementById("live-ticker");
  const modeBar = document.getElementById("mode-bar");
  const modeDesc = document.getElementById("mode-desc");
  const dirCanvas = document.getElementById("dir-wheel");
  const dirCtx = dirCanvas.getContext("2d");
  const dirBadge = document.getElementById("dir-badge");
  const resultCard = document.getElementById("result-card");
  const resultTicker = document.getElementById("result-ticker");
  const resultName = document.getElementById("result-name");
  const resultSector = document.getElementById("result-sector");
  const linkTV = document.getElementById("link-tv");
  const linkYahoo = document.getElementById("link-yahoo");
  const historyList = document.getElementById("history-list");
  const historyEmpty = document.getElementById("history-empty");
  const clearBtn = document.getElementById("clear-history");

  const POINTER = -Math.PI / 2; // 12 o'clock
  const TWO_PI = Math.PI * 2;
  const LABEL_MAX = 150; // hide slice labels above this many slices

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
    // degen categories
    "Meme": ["#e11d48", "#be123c"],
    "Crypto": ["#f59e0b", "#d97706"],
    "Quantum": ["#8b5cf6", "#7c3aed"],
    "Space": ["#0ea5e9", "#0284c7"],
    "EV / Green": ["#22c55e", "#16a34a"],
    "AI Hype": ["#ec4899", "#db2777"],
    "Leveraged ETF": ["#ef4444", "#b91c1c"],
  };

  const MODE_KEY = "stock-wheel-mode";
  let mode = MODES[0];
  let stocks = mode.list;
  let N = stocks.length;
  let STEP = TWO_PI / N;
  let rotation = 0;
  let spinning = false;

  // ---- Modes ----
  function setMode(m) {
    mode = m;
    stocks = m.list;
    N = stocks.length;
    STEP = TWO_PI / N;
    rotation = 0;
    localStorage.setItem(MODE_KEY, m.key);
    modeDesc.textContent = m.desc + " · " + N + " slices";
    liveTicker.textContent = "SPIN";
    for (const btn of modeBar.children) {
      btn.classList.toggle("active", btn.dataset.key === m.key);
    }
    draw();
  }

  for (const m of MODES) {
    const btn = document.createElement("button");
    btn.textContent = m.label;
    btn.dataset.key = m.key;
    btn.addEventListener("click", () => { if (!spinning) setMode(m); });
    modeBar.appendChild(btn);
  }

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
      const colors = SECTOR_COLORS[stocks[i].s] || ["#6b7280", "#4b5563"];
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, a0, a0 + STEP);
      ctx.closePath();
      ctx.fillStyle = colors[i % 2];
      ctx.fill();
      if (N <= LABEL_MAX) {
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // ticker labels, pointing outward along each slice's center line
    if (N <= LABEL_MAX) {
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = "700 11px -apple-system, 'Segoe UI', Roboto, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      for (let i = 0; i < N; i++) {
        ctx.save();
        ctx.rotate(i * STEP + STEP / 2);
        ctx.fillText(stocks[i].t, r - 10, 0);
        ctx.restore();
      }
    }

    // outer rim
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TWO_PI);
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#2a3245";
    ctx.stroke();

    ctx.restore();
  }

  // Index of the slice currently under the pointer
  function indexAtPointer() {
    let a = (POINTER - rotation) % TWO_PI;
    if (a < 0) a += TWO_PI;
    return Math.floor(a / STEP) % N;
  }

  // ---- Tick sound (WebAudio, no assets) ----
  let audioCtx = null;
  let lastTickAt = 0;
  function tick() {
    try {
      const now = performance.now();
      if (now - lastTickAt < 25) return; // don't machine-gun on 500-slice wheels
      lastTickAt = now;
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

  // ---- Direction mini-wheel (CALL / PUT) ----
  const DIRS = [
    { label: "CALL", cls: "call", color: "#16a34a" },
    { label: "PUT", cls: "put", color: "#dc2626" },
  ];
  let dirRotation = -Math.PI; // start with CALL upright under the pointer

  function drawDir() {
    const w = dirCanvas.width;
    const cx = w / 2;
    const r = w / 2 - 4;
    dirCtx.clearRect(0, 0, w, w);
    dirCtx.save();
    dirCtx.translate(cx, cx);
    dirCtx.rotate(dirRotation);

    for (let i = 0; i < 2; i++) {
      dirCtx.beginPath();
      dirCtx.moveTo(0, 0);
      dirCtx.arc(0, 0, r, i * Math.PI, (i + 1) * Math.PI);
      dirCtx.closePath();
      dirCtx.fillStyle = DIRS[i].color;
      dirCtx.fill();
      dirCtx.strokeStyle = "rgba(0,0,0,0.4)";
      dirCtx.lineWidth = 2;
      dirCtx.stroke();
    }

    dirCtx.fillStyle = "rgba(255,255,255,0.95)";
    dirCtx.font = "800 30px -apple-system, 'Segoe UI', Roboto, sans-serif";
    dirCtx.textAlign = "center";
    dirCtx.textBaseline = "middle";
    // Each label sits at its half's center, oriented to read upright
    // when that half lands under the pointer (top).
    for (let i = 0; i < 2; i++) {
      dirCtx.save();
      dirCtx.rotate(i * Math.PI + Math.PI);
      dirCtx.fillText(DIRS[i].label, 0, -r * 0.55);
      dirCtx.restore();
    }

    dirCtx.beginPath();
    dirCtx.arc(0, 0, r, 0, TWO_PI);
    dirCtx.lineWidth = 3;
    dirCtx.strokeStyle = "#2a3245";
    dirCtx.stroke();
    dirCtx.restore();
  }

  function spinDirection(onDone) {
    const winner = Math.floor(Math.random() * 2);
    // Land the winning half's center under the pointer, with jitter
    const jitter = (Math.random() - 0.5) * Math.PI * 0.6;
    const winnerCenter = winner * Math.PI + Math.PI / 2;
    const desired = POINTER - winnerCenter + jitter;

    let delta = (desired - dirRotation) % TWO_PI;
    if (delta < 0) delta += TWO_PI;
    const total = delta + (4 + Math.floor(Math.random() * 2)) * TWO_PI;

    const start = dirRotation;
    const duration = 2000 + Math.random() * 400;
    const t0 = performance.now();
    let lastHalf = -1;

    function frame(now) {
      const t = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      dirRotation = start + total * eased;
      drawDir();

      const half = Math.floor(((dirRotation % TWO_PI) + TWO_PI) / Math.PI) % 2;
      if (half !== lastHalf) { lastHalf = half; tick(); }

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        dirRotation = ((desired % TWO_PI) + TWO_PI) % TWO_PI;
        drawDir();
        onDone(DIRS[winner]);
      }
    }
    requestAnimationFrame(frame);
  }

  // ---- Spin ----
  function spin() {
    if (spinning) return;
    spinning = true;
    spinBtn.disabled = true;
    modeBar.classList.add("locked");
    resultCard.classList.add("hidden");

    const winner = Math.floor(Math.random() * N);
    // Land the winner's slice under the pointer, with a little jitter inside the slice
    const jitter = (Math.random() - 0.5) * STEP * 0.7;
    const winnerCenter = winner * STEP + STEP / 2;
    const desired = POINTER - winnerCenter + jitter;

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
        liveTicker.textContent = stocks[idx].t;
        tick();
      }

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        rotation = ((desired % TWO_PI) + TWO_PI) % TWO_PI;
        draw();
        finish(stocks[winner]);
      }
    }
    requestAnimationFrame(frame);
  }

  function finish(stock) {
    liveTicker.textContent = stock.t;

    resultTicker.textContent = stock.t;
    resultName.textContent = stock.n;
    resultSector.textContent = stock.s + " · " + mode.label.replace(" 🎰", "");
    linkTV.href = "https://www.tradingview.com/chart/?symbol=" + encodeURIComponent(stock.t);
    linkYahoo.href = "https://finance.yahoo.com/quote/" + encodeURIComponent(stock.t.replace(".", "-"));
    dirBadge.textContent = "?";
    dirBadge.className = "dir-badge";
    resultCard.classList.remove("hidden");

    // Now spin the direction wheel; unlock everything once it lands
    spinDirection((dir) => {
      dirBadge.textContent = dir.label + (dir.cls === "call" ? " 📈" : " 📉");
      dirBadge.classList.add(dir.cls);
      addHistory(stock, dir);
      spinning = false;
      spinBtn.disabled = false;
      modeBar.classList.remove("locked");
    });
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

  function addHistory(stock, dir) {
    const items = loadHistory();
    items.unshift({ t: stock.t, n: stock.n, m: mode.label.replace(" 🎰", ""), d: dir.label, at: Date.now() });
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
        '<span class="h-ticker"></span><span class="h-dir"></span><span class="h-name"></span><span class="h-time"></span>';
      li.querySelector(".h-ticker").textContent = it.t;
      const dirEl = li.querySelector(".h-dir");
      if (it.d) {
        dirEl.textContent = it.d;
        dirEl.classList.add(it.d === "CALL" ? "call" : "put");
      }
      li.querySelector(".h-name").textContent = it.n;
      li.querySelector(".h-time").textContent = (it.m ? it.m + " · " : "") + when;
      historyList.appendChild(li);
    }
  }

  clearBtn.addEventListener("click", () => {
    localStorage.removeItem(KEY);
    renderHistory();
  });

  spinBtn.addEventListener("click", spin);

  // ---- Init ----
  const savedMode = MODES.find(m => m.key === localStorage.getItem(MODE_KEY));
  setMode(savedMode || MODES[0]);
  drawDir();
  renderHistory();
})();
