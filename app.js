(function () {
  "use strict";
  const HOURS = ["03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","19","20","21","22","23","00","01","02"];
  const DEFAULT_TARGETS = { p1: 9500, p2: 4500, total: 14000 };
  const STORE_KEY = "presort-throughput-tracker-v1";
  const fmt = n => n == null ? "—" : Math.round(n).toLocaleString("en-GB");
  const sgn = n => (n > 0 ? "+" : n < 0 ? "−" : "±") + Math.abs(Math.round(n)).toLocaleString("en-GB");
  const num = v => (typeof v === "number" && isFinite(v) && v >= 0) ? v : null;

  const state = { days: {}, targets: { ...DEFAULT_TARGETS }, date: null, shared: null, canSave: true, lastBackup: null, recRange: "30" };

  // ---------- storage (this browser only) ----------
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d && typeof d === "object") {
        state.days = cleanDays(d.days);
        state.targets = cleanTargets(d.targets);
        if (typeof d.lastBackup === "string") state.lastBackup = d.lastBackup;
      }
    } catch (e) { state.canSave = false; }
  }
  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ days: state.days, targets: state.targets, lastBackup: state.lastBackup })); return true; }
    catch (e) { state.canSave = false; return false; }
  }
  function cleanTargets(t) {
    t = t || {};
    return { p1: num(t.p1) || DEFAULT_TARGETS.p1, p2: num(t.p2) || DEFAULT_TARGETS.p2, total: num(t.total) || DEFAULT_TARGETS.total };
  }
  function cleanDays(days) {
    const out = {};
    if (!days || typeof days !== "object") return out;
    Object.keys(days).forEach(k => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) return;
      const d = days[k] || {}, day = { p1: {}, p2: {} };
      ["p1", "p2"].forEach(p => HOURS.forEach(h => { const v = num(d[p] && d[p][h]); if (v != null) day[p][h] = v; }));
      if (typeof d.updatedAt === "string") day.updatedAt = d.updatedAt;
      if (d.targets && typeof d.targets === "object") day.targets = cleanTargets(d.targets);
      if (!Object.keys(day.p1).length && !Object.keys(day.p2).length) return;
      out[k] = day;
    });
    return out;
  }

  // ---------- share links: #v1;date;p1t,p2t,tt;24 p1 values;24 p2 values ----------
  function encodeShare(key) {
    const d = state.days[key] || { p1: {}, p2: {} }, T = dayTargetsOf(key);
    const row = p => HOURS.map(h => d[p] && d[p][h] != null ? d[p][h] : "").join(",");
    return "v1;" + key + ";" + [T.p1, T.p2, T.total].join(",") + ";" + row("p1") + ";" + row("p2");
  }
  function decodeShare(hash) {
    const parts = decodeURIComponent(hash.replace(/^#/, "")).split(";");
    if (parts.length !== 5 || parts[0] !== "v1" || !/^\d{4}-\d{2}-\d{2}$/.test(parts[1])) return null;
    const t = parts[2].split(",").map(Number);
    const col = s => { const a = s.split(","), o = {}; if (a.length !== 24) return null; a.forEach((v, i) => { if (v !== "") { const n = num(Number(v)); if (n != null) o[HOURS[i]] = n; } }); return o; };
    const p1 = col(parts[3]), p2 = col(parts[4]);
    if (!p1 || !p2) return null;
    return { date: parts[1], p1, p2, targets: cleanTargets({ p1: t[0], p2: t[1], total: t[2] }) };
  }

  // ---------- dates ----------
  const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  function sortDayKey(d) { const x = new Date(d.getTime()); if (x.getHours() < 3) x.setDate(x.getDate() - 1); return iso(x); }
  function shiftDay(key, n) { const [y, m, d] = key.split("-").map(Number); const x = new Date(y, m - 1, d); x.setDate(x.getDate() + n); return iso(x); }
  function niceDate(key) { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }); }
  function currentHourIndex() { const now = new Date(); return sortDayKey(now) === state.date ? HOURS.indexOf(String(now.getHours()).padStart(2, "0")) : -1; }

  // ---------- status ----------
  function status(v, t) { if (v == null || !t) return "none"; if (v >= t) return "ok"; if (v >= t * 0.9) return "near"; return "bad"; }
  const glyph = { ok: "▲", near: "●", bad: "▼", none: "" };
  const viewing = () => state.shared && state.shared.date === state.date;
  function dayTargetsOf(key) { return (state.days[key] && state.days[key].targets) || state.targets; }
  const targets = () => viewing() ? state.shared.targets : dayTargetsOf(state.date);
  function dayData(key) {
    const d = viewing() ? state.shared : (state.days[key] || {});
    const p1 = d.p1 || {}, p2 = d.p2 || {};
    return HOURS.map(h => {
      const a = num(p1[h]), b = num(p2[h]);
      return { h, p1: a, p2: b, total: (a == null && b == null) ? null : (a || 0) + (b || 0) };
    });
  }

  // ---------- small DOM helpers ----------
  const $ = id => document.getElementById(id);
  function div(c) { const d = document.createElement("div"); d.className = c; return d; }
  function span(c, t) { const s = document.createElement("span"); s.className = c; s.textContent = t; return s; }
  let connTimer;
  function setConn(text, warn) {
    const c = $("conn"); c.className = warn ? "warn" : "live";
    const dot = document.createElement("span"); dot.className = "dot";
    c.replaceChildren(dot, text);
    clearTimeout(connTimer);
    if (warn) connTimer = setTimeout(() => setConn(state.canSave ? "Saved in this browser" : "This browser won't keep figures (private window?)", !state.canSave), 5000);
  }

  // ---------- tiles ----------
  function tile(el, label, key, rows, target) {
    const vals = rows.map(r => r[key]), counted = vals.filter(v => v != null);
    const sum = counted.reduce((s, v) => s + v, 0), tgt = counted.length * target;
    const st = counted.length ? status(sum, tgt) : "none";
    const pct = tgt ? Math.round(sum / tgt * 100) : null;
    const hits = counted.filter(v => v >= target).length;
    const best = counted.length ? Math.max(...counted) : null;
    const bestH = best != null ? rows[vals.indexOf(best)].h + ":00" : "";
    const r1 = div("row"); r1.append(span("k", label), span("pill " + st, st === "none" ? "No data" : glyph[st] + " " + pct + "% of target"));
    const big = div("big"); big.textContent = fmt(counted.length ? sum : null);
    const sub = div("sub"); sub.textContent = counted.length ? "vs " + fmt(tgt) + " for " + counted.length + " h  ·  " + sgn(sum - tgt) : "Target " + fmt(target) + " per hour";
    const sub2 = div("sub"); sub2.textContent = counted.length ? hits + " of " + counted.length + " hours hit " + fmt(target) + "  ·  best " + fmt(best) + " at " + bestH : "Nothing entered for this day yet";
    const hb = div("hitbar"); hb.setAttribute("aria-hidden", "true");
    vals.forEach(v => { const i = document.createElement("i"); const s = status(v, target); if (s !== "none") i.className = s; hb.append(i); });
    el.replaceChildren(r1, big, sub, sub2, hb);
  }

  // ---------- chart ----------
  const chartEl = $("chart");
  const tip = document.createElement("div"); tip.className = "tip"; tip.hidden = true;
  function drawChart(rows) {
    const T = targets();
    const W = Math.max(300, chartEl.clientWidth || 800), H = W < 560 ? 220 : 280;
    const m = { t: 22, r: 8, b: 26, l: 44 }, iw = W - m.l - m.r, ih = H - m.t - m.b;
    const maxV = Math.max(T.total * 1.15, ...rows.map(r => r.total || 0));
    const step = maxV > 30000 ? 10000 : maxV > 12000 ? 5000 : 2500;
    const top = Math.ceil(maxV / step) * step;
    const y = v => m.t + ih - (v / top) * ih, bw = iw / HOURS.length;
    const ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Stacked hourly shipments for P1 and P2 against the hourly targets");
    const STYLE = { fill: 1, stroke: 1, "stroke-width": 1, "stroke-dasharray": 1, opacity: 1, "font-size": 1, "font-family": 1, "font-weight": 1 };
    const el = (tag, attrs, text) => {
      const e = document.createElementNS(ns, tag);
      for (const k in attrs) {
        if (STYLE[k]) e.style.setProperty(k, k === "font-size" ? attrs[k] + "px" : String(attrs[k]));
        else e.setAttribute(k, attrs[k]);
      }
      if (text != null) e.textContent = text;
      svg.append(e); return e;
    };
    for (let v = 0; v <= top; v += step) {
      el("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), stroke: "var(--line)", "stroke-width": 1 });
      el("text", { x: m.l - 6, y: y(v) + 4, "text-anchor": "end", fill: "var(--muted)", "font-size": 10.5, "font-family": "var(--font-num)" }, v ? (v / 1000) + "k" : "0");
    }
    const cur = currentHourIndex(), every = W < 560 ? 3 : (W < 820 ? 2 : 1);
    rows.forEach((r, i) => {
      const x = m.l + i * bw, w = Math.max(2, bw * 0.68), xo = x + (bw - w) / 2;
      if (i === cur) el("rect", { x, y: m.t, width: bw, height: ih, fill: "var(--ink)", opacity: 0.05 });
      const a = r.p1 || 0, b = r.p2 || 0;
      if (a) el("rect", { x: xo, y: y(a), width: w, height: y(0) - y(a), fill: "var(--bar1)", rx: 1.5 });
      if (b) el("rect", { x: xo, y: y(a + b), width: w, height: y(a) - y(a + b), fill: "var(--bar2)", rx: 1.5 });
      const st = status(r.total, T.total);
      if (st !== "none") el("circle", { cx: x + bw / 2, cy: Math.min(y(r.total), y(T.total)) - 8, r: W < 560 ? 2.6 : 3.4, fill: "var(--" + st + ")" });
      if (i % every === 0) el("text", { x: x + bw / 2, y: H - 8, "text-anchor": "middle", fill: "var(--muted)", "font-size": 10.5, "font-family": "var(--font-num)" }, r.h);
      el("rect", { x, y: m.t, width: bw, height: ih, fill: "transparent", "data-i": i });
    });
    el("line", { x1: m.l, x2: W - m.r, y1: y(T.total), y2: y(T.total), stroke: "var(--ink)", "stroke-width": 1.5, "stroke-dasharray": "5 4" });
    el("line", { x1: m.l, x2: W - m.r, y1: y(T.p1), y2: y(T.p1), stroke: "var(--muted)", "stroke-width": 1, "stroke-dasharray": "2 4" });
    el("text", { x: W - m.r, y: y(T.total) - 5, "text-anchor": "end", fill: "var(--ink)", "font-size": 10.5, "font-weight": 600, "font-family": "var(--font-num)" }, fmt(T.total));
    el("text", { x: W - m.r, y: y(T.p1) - 5, "text-anchor": "end", fill: "var(--muted)", "font-size": 10.5, "font-family": "var(--font-num)" }, fmt(T.p1));
    svg.addEventListener("pointermove", e => {
      const t = e.target.closest("rect[data-i]"); if (!t) { tip.hidden = true; return; }
      const r = rows[+t.getAttribute("data-i")], box = chartEl.getBoundingClientRect();
      const head = document.createElement("b"); head.textContent = r.h + ":00";
      tip.replaceChildren(head, document.createElement("br"), "P1 " + fmt(r.p1) + "  ·  P2 " + fmt(r.p2), document.createElement("br"),
        "Total " + fmt(r.total) + (r.total != null ? "  (" + sgn(r.total - T.total) + ")" : ""));
      tip.hidden = false;
      const tw = tip.offsetWidth, px = e.clientX - box.left, py = e.clientY - box.top;
      tip.style.left = Math.min(Math.max(px, tw / 2 + 4), box.width - tw / 2 - 4) + "px";
      tip.style.top = Math.max(py - 10, tip.offsetHeight + 4) + "px";
    });
    svg.addEventListener("pointerleave", () => { tip.hidden = true; });
    chartEl.replaceChildren(svg, tip);
  }

  // ---------- ledger ----------
  function buildRows() {
    const tbody = $("rows"); tbody.replaceChildren();
    HOURS.forEach((h, i) => {
      const tr = document.createElement("tr"); tr.id = "row-" + h;
      const th = document.createElement("td"); th.className = "hr"; th.append(h + ":00");
      const sm = document.createElement("small"); sm.textContent = "to " + HOURS[(i + 1) % 24] + ":00"; th.append(sm); tr.append(th);
      ["p1", "p2"].forEach(p => {
        const td = document.createElement("td"), c = div("cell"); c.id = "c-" + p + "-" + h;
        const inp = document.createElement("input");
        inp.type = "text"; inp.inputMode = "numeric"; inp.id = "in-" + p + "-" + h; inp.placeholder = "—";
        inp.setAttribute("aria-label", p.toUpperCase() + " shipments " + h + ":00");
        inp.addEventListener("change", () => commit(p, h, inp));
        inp.addEventListener("keydown", e => { if (e.key === "Enter") inp.blur(); });
        const d = span("delta none", ""); d.id = "d-" + p + "-" + h;
        c.append(inp, d); td.append(c); tr.append(td);
      });
      const td = document.createElement("td"), c = div("cell"); c.id = "c-t-" + h;
      const tot = span("tot", "—"); tot.id = "v-t-" + h;
      const d = span("delta none", ""); d.id = "d-t-" + h;
      c.append(tot, d); td.append(c); tr.append(td);
      tbody.append(tr);
    });
  }
  function paintCell(p, h, v, t) {
    const st = status(v, t);
    $("c-" + p + "-" + h).className = "cell " + (st === "none" ? "" : st);
    const d = $("d-" + p + "-" + h); d.className = "delta " + st;
    d.textContent = v == null ? "" : glyph[st] + " " + sgn(v - t);
  }
  function paintRows(rows) {
    const T = targets(), cur = currentHourIndex(), ro = viewing();
    rows.forEach((r, i) => {
      $("row-" + r.h).classList.toggle("now", i === cur);
      [["p1", T.p1], ["p2", T.p2]].forEach(([p, t]) => {
        const inp = $("in-" + p + "-" + r.h);
        if (document.activeElement !== inp) inp.value = r[p] == null ? "" : r[p].toLocaleString("en-GB");
        inp.readOnly = ro;
        paintCell(p, r.h, r[p], t);
      });
      $("v-t-" + r.h).textContent = fmt(r.total);
      paintCell("t", r.h, r.total, T.total);
    });
  }

  // ---------- render ----------
  function render() {
    const rows = dayData(state.date), T = targets();
    $("dayTitle").textContent = niceDate(state.date);
    $("date").value = state.date;
    $("thP1").textContent = "target " + fmt(T.p1) + "/h";
    $("thP2").textContent = "target " + fmt(T.p2) + "/h";
    $("thT").textContent = "target " + fmt(T.total) + "/h";
    $("lgTotal").textContent = "Total target " + fmt(T.total);
    $("lgP1").textContent = "P1 target " + fmt(T.p1);
    tile($("tile-total"), "Total · P1 + P2", "total", rows, T.total);
    tile($("tile-p1"), "Platform 1", "p1", rows, T.p1);
    tile($("tile-p2"), "Platform 2", "p2", rows, T.p2);
    drawChart(rows);
    paintRows(rows);
    const v = viewing();
    $("sharedBanner").hidden = !v;
    if (v) $("sharedText").textContent = "Shared figures for " + niceDate(state.shared.date) + ". They aren't in your tracker until you save them.";
    $("editTargets").hidden = v;
    const d = state.days[state.date];
    $("updated").textContent = !v && d && d.updatedAt ? "Last change " + new Date(d.updatedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
    $("shareOut").hidden = true;
    resetClear();
    renderRecord();
    renderBackupState();
  }

  // ---------- day-by-day record ----------
  function summarise(key) {
    const d = state.days[key] || {}, T = dayTargetsOf(key);
    const rows = HOURS.map(h => {
      const a = num(d.p1 && d.p1[h]), b = num(d.p2 && d.p2[h]);
      return { h, p1: a, p2: b, total: (a == null && b == null) ? null : (a || 0) + (b || 0) };
    });
    const part = (k, t) => {
      const c = rows.filter(r => r[k] != null), sum = c.reduce((s, r) => s + r[k], 0);
      return { hours: c.length, sum, pct: c.length ? sum / (c.length * t) * 100 : null, hits: c.filter(r => r[k] >= t).length };
    };
    let best = null;
    rows.forEach(r => { if (r.total != null && (!best || r.total > best.total)) best = r; });
    return { key, T, rows, p1: part("p1", T.p1), p2: part("p2", T.p2), total: part("total", T.total), best };
  }
  const pctTxt = p => p == null ? "—" : Math.round(p) + "%";
  function shortDate(key) { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }); }
  function recordKeys() {
    const all = Object.keys(state.days).sort();
    if (state.recRange === "all") return all;
    const start = shiftDay(sortDayKey(new Date()), -(Number(state.recRange) - 1));
    return all.filter(k => k >= start);
  }
  function stat(label, value, note, cls) {
    const box = div("rec-stat"), v = div("rec-val" + (cls ? " " + cls : ""));
    v.textContent = value;
    box.append(span("k", label), v);
    if (note) box.append(span("sub", note));
    return box;
  }
  function renderRecord() {
    const allKeys = Object.keys(state.days).sort(), keys = recordKeys();
    const sums = keys.map(summarise);
    const empty = !sums.length;
    $("recEmpty").hidden = !empty;
    $("recChart").hidden = empty;
    $("recTableWrap").hidden = empty;
    document.querySelectorAll("[data-range]").forEach(b => b.setAttribute("aria-pressed", String(b.getAttribute("data-range") === state.recRange)));

    // headline figures for the range
    const stats = $("recStats"); stats.replaceChildren();
    if (!empty) {
      const withPct = sums.filter(s => s.total.pct != null);
      const avg = withPct.length ? withPct.reduce((a, s) => a + s.total.pct, 0) / withPct.length : null;
      const atTarget = withPct.filter(s => s.total.pct >= 100).length;
      const bestDay = withPct.reduce((b, s) => (!b || s.total.pct > b.total.pct) ? s : b, null);
      const vol = sums.reduce((a, s) => a + s.total.sum, 0);
      stats.append(
        stat("Days recorded", String(sums.length), state.recRange === "all" ? "since " + shortDate(keys[0]) : "in the last " + state.recRange + " days"),
        stat("Shipments", fmt(vol), "P1 + P2 across these days"),
        stat("Average day", pctTxt(avg), "of total target", "st-" + status(avg, 100)),
        stat("Days at target", atTarget + " of " + withPct.length, bestDay ? "best " + shortDate(bestDay.key) + " · " + pctTxt(bestDay.total.pct) : "")
      );
    }

    // table, newest first
    const tbody = $("recRows"); tbody.replaceChildren();
    sums.slice().reverse().forEach(s => {
      const tr = document.createElement("tr");
      if (s.key === state.date) tr.className = "now";
      const td = (content, cls) => { const c = document.createElement("td"); if (cls) c.className = cls; if (content instanceof Node) c.append(content); else c.textContent = content; tr.append(c); return c; };
      const btn = document.createElement("button"); btn.type = "button"; btn.className = "day-link"; btn.textContent = niceDate(s.key);
      btn.addEventListener("click", () => { go(s.key); window.scrollTo({ top: 0, behavior: "smooth" }); });
      td(btn);
      td(String(s.total.hours), "n");
      td(fmt(s.total.sum), "n strong");
      const pill = (p) => { const st = status(p, 100); return span("pill " + st, p == null ? "—" : glyph[st] + " " + pctTxt(p)); };
      td(pill(s.total.pct));
      td(pill(s.p1.pct));
      td(pill(s.p2.pct));
      td(s.total.hits + " of " + s.total.hours, "n");
      const i = allKeys.indexOf(s.key), prev = i > 0 ? summarise(allKeys[i - 1]) : null;
      if (prev && prev.total.pct != null && s.total.pct != null) {
        const ch = s.total.pct - prev.total.pct, cls = ch > 0.5 ? "up" : ch < -0.5 ? "down" : "flat";
        td((ch > 0.5 ? "▲ +" : ch < -0.5 ? "▼ −" : "= ") + Math.abs(ch).toFixed(1) + " pts", "n chg " + cls).title = "vs " + niceDate(prev.key);
      } else td("first day", "n chg flat");
      tbody.append(tr);
    });
    drawRecordChart(sums);
  }

  const recEl = $("recChart");
  const recTip = document.createElement("div"); recTip.className = "tip"; recTip.hidden = true;
  function drawRecordChart(sums) {
    if (!sums.length) { recEl.replaceChildren(); return; }
    const W = Math.max(300, recEl.clientWidth || 800), H = W < 560 ? 190 : 230;
    const m = { t: 18, r: 8, b: 26, l: 40 }, iw = W - m.l - m.r, ih = H - m.t - m.b;
    const top = Math.max(120, Math.ceil(Math.max(...sums.map(s => s.total.pct || 0)) / 20) * 20);
    const y = v => m.t + ih - (v / top) * ih, bw = iw / Math.max(sums.length, 7);
    const ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Each recorded day's total shipments as a percentage of target");
    const STYLE = { fill: 1, stroke: 1, "stroke-width": 1, "stroke-dasharray": 1, opacity: 1, "font-size": 1, "font-family": 1, "font-weight": 1 };
    const el = (tag, attrs, text) => {
      const e = document.createElementNS(ns, tag);
      for (const k in attrs) {
        if (STYLE[k]) e.style.setProperty(k, k === "font-size" ? attrs[k] + "px" : String(attrs[k]));
        else e.setAttribute(k, attrs[k]);
      }
      if (text != null) e.textContent = text;
      svg.append(e); return e;
    };
    for (let v = 0; v <= top; v += top > 160 ? 50 : 20) {
      el("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), stroke: "var(--line)", "stroke-width": 1 });
      el("text", { x: m.l - 6, y: y(v) + 4, "text-anchor": "end", fill: "var(--muted)", "font-size": 10.5, "font-family": "var(--font-num)" }, v + "%");
    }
    const maxLabels = Math.floor(iw / 44), every = Math.max(1, Math.ceil(sums.length / maxLabels));
    sums.forEach((s, i) => {
      const x = m.l + i * bw, w = Math.max(3, Math.min(bw * 0.68, 46)), xo = x + (bw - w) / 2;
      if (s.key === state.date) el("rect", { x, y: m.t, width: bw, height: ih, fill: "var(--ink)", opacity: 0.06 });
      const p = s.total.pct || 0, st = status(s.total.pct, 100);
      if (p) el("rect", { x: xo, y: y(Math.min(p, top)), width: w, height: y(0) - y(Math.min(p, top)), fill: "var(--" + (st === "none" ? "none" : st) + ")", rx: 1.5 });
      if (i % every === 0 || i === sums.length - 1) el("text", { x: x + bw / 2, y: H - 8, "text-anchor": "middle", fill: "var(--muted)", "font-size": 10.5, "font-family": "var(--font-num)" }, shortDate(s.key));
      const hit = el("rect", { x, y: m.t, width: bw, height: ih, fill: "transparent", "data-i": i });
      hit.style.cursor = "pointer";
    });
    el("line", { x1: m.l, x2: W - m.r, y1: y(100), y2: y(100), stroke: "var(--ink)", "stroke-width": 1.5, "stroke-dasharray": "5 4" });
    el("text", { x: W - m.r, y: y(100) - 5, "text-anchor": "end", fill: "var(--ink)", "font-size": 10.5, "font-weight": 600, "font-family": "var(--font-num)" }, "target");
    svg.addEventListener("pointermove", e => {
      const t = e.target.closest("rect[data-i]"); if (!t) { recTip.hidden = true; return; }
      const s = sums[+t.getAttribute("data-i")], box = recEl.getBoundingClientRect();
      const head = document.createElement("b"); head.textContent = niceDate(s.key);
      recTip.replaceChildren(head, document.createElement("br"),
        "Total " + fmt(s.total.sum) + " · " + pctTxt(s.total.pct) + " of target", document.createElement("br"),
        "P1 " + pctTxt(s.p1.pct) + " · P2 " + pctTxt(s.p2.pct) + " · " + s.total.hours + " h");
      recTip.hidden = false;
      const tw = recTip.offsetWidth, px = e.clientX - box.left, py = e.clientY - box.top;
      recTip.style.left = Math.min(Math.max(px, tw / 2 + 4), box.width - tw / 2 - 4) + "px";
      recTip.style.top = Math.max(py - 10, recTip.offsetHeight + 4) + "px";
    });
    svg.addEventListener("pointerleave", () => { recTip.hidden = true; });
    svg.addEventListener("click", e => {
      const t = e.target.closest("rect[data-i]"); if (!t) return;
      go(sums[+t.getAttribute("data-i")].key); window.scrollTo({ top: 0, behavior: "smooth" });
    });
    recEl.replaceChildren(svg, recTip);
  }

  function renderBackupState() {
    const el = $("backupState"), n = Object.keys(state.days).length;
    if (!n) { el.textContent = "Nothing recorded yet."; el.className = "backup-state"; return; }
    if (!state.lastBackup) { el.textContent = n + (n === 1 ? " day" : " days") + " recorded in this browser and never backed up. Download a backup so the record can't be lost."; el.className = "backup-state warn"; return; }
    const ageDays = Math.floor((Date.now() - new Date(state.lastBackup).getTime()) / 86400000);
    const when = ageDays <= 0 ? "today" : ageDays === 1 ? "yesterday" : ageDays + " days ago";
    el.textContent = n + (n === 1 ? " day" : " days") + " recorded in this browser. Last backup " + when + ".";
    el.className = "backup-state" + (ageDays >= 7 ? " warn" : "");
  }

  // ---------- downloads ----------
  function download(name, text, type) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  const csvCell = v => v == null ? "" : /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
  const csv = rows => rows.map(r => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
  const r1 = p => p == null ? null : Math.round(p * 10) / 10;
  $("csvDays").addEventListener("click", () => {
    const keys = Object.keys(state.days).sort();
    if (!keys.length) { setConn("Nothing recorded yet", true); return; }
    const rows = [["Date", "Hours entered", "P1 shipments", "P1 % of target", "P1 hours at target", "P2 shipments", "P2 % of target", "P2 hours at target", "Total shipments", "Total % of target", "Total hours at target", "Best hour", "Best hour total", "P1 target per hour", "P2 target per hour", "Total target per hour"]];
    keys.forEach(k => {
      const s = summarise(k);
      rows.push([k, s.total.hours, s.p1.sum, r1(s.p1.pct), s.p1.hits, s.p2.sum, r1(s.p2.pct), s.p2.hits, s.total.sum, r1(s.total.pct), s.total.hits,
        s.best ? s.best.h + ":00" : null, s.best ? s.best.total : null, s.T.p1, s.T.p2, s.T.total]);
    });
    download("presort-daily-record-" + iso(new Date()) + ".csv", csv(rows), "text/csv");
    setConn("Daily record downloaded");
  });
  $("csvHours").addEventListener("click", () => {
    const keys = Object.keys(state.days).sort();
    if (!keys.length) { setConn("Nothing recorded yet", true); return; }
    const rows = [["Date", "Hour", "P1", "P2", "Total", "P1 target", "P2 target", "Total target"]];
    keys.forEach(k => summarise(k).rows.forEach(r => {
      if (r.total == null) return;
      const T = dayTargetsOf(k);
      rows.push([k, r.h + ":00", r.p1, r.p2, r.total, T.p1, T.p2, T.total]);
    }));
    download("presort-every-hour-" + iso(new Date()) + ".csv", csv(rows), "text/csv");
    setConn("Hourly detail downloaded");
  });
  document.querySelectorAll("[data-range]").forEach(b => b.addEventListener("click", () => {
    state.recRange = b.getAttribute("data-range");
    try { localStorage.setItem(STORE_KEY + "-range", state.recRange); } catch (e) {}
    renderRecord();
  }));
  $("jumpRecord").addEventListener("click", () => $("record").scrollIntoView({ behavior: "smooth", block: "start" }));

  // ---------- entering figures ----------
  function parse(txt) {
    const s = String(txt).replace(/[,\s]/g, "");
    if (s === "") return null;
    const k = /k$/i.test(s), n = Number(k ? s.slice(0, -1) : s) * (k ? 1000 : 1);
    return isFinite(n) && n >= 0 ? Math.round(n) : NaN;
  }
  function commit(p, h, inp) {
    if (viewing()) return;
    const v = parse(inp.value);
    if (Number.isNaN(v)) { inp.value = ""; setConn("Numbers only, for example 9500 or 9.5k", true); render(); return; }
    const day = state.days[state.date] = state.days[state.date] || { p1: {}, p2: {} };
    if (!day.targets) day.targets = { ...state.targets };
    if (v == null) delete day[p][h]; else day[p][h] = v;
    day.updatedAt = new Date().toISOString();
    if (!Object.keys(day.p1).length && !Object.keys(day.p2).length) delete state.days[state.date];
    if (!persist()) setConn("This browser won't keep figures (private window?). Download a backup before closing.", true);
    render();
  }

  // ---------- shared view ----------
  function readHash() {
    if (!/^#v1(;|%3B)/i.test(location.hash)) { state.shared = null; return; }
    const s = decodeShare(location.hash);
    if (!s) { state.shared = null; setConn("That share link couldn't be read", true); return; }
    state.shared = s; state.date = s.date;
  }
  function clearHash() { try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { location.hash = ""; } }
  $("keepShared").addEventListener("click", () => {
    const s = state.shared; if (!s) return;
    state.days[s.date] = { p1: { ...s.p1 }, p2: { ...s.p2 }, targets: { ...s.targets }, updatedAt: new Date().toISOString() };
    state.shared = null; clearHash(); persist(); render();
    setConn("Saved " + niceDate(s.date) + " to your tracker");
  });
  $("closeShared").addEventListener("click", () => { state.shared = null; clearHash(); render(); });
  window.addEventListener("hashchange", () => { readHash(); render(); });

  // ---------- share, backup, restore, clear ----------
  $("shareBtn").addEventListener("click", async () => {
    const link = location.href.split("#")[0] + "#" + (viewing() ? location.hash.slice(1) : encodeShare(state.date));
    const out = $("shareOut"); out.value = link; out.hidden = false;
    try { await navigator.clipboard.writeText(link); setConn("Share link copied"); }
    catch (e) { out.focus(); out.select(); setConn("Copy the link below", false); }
  });
  $("exportBtn").addEventListener("click", () => {
    download("presort-throughput-backup-" + iso(new Date()) + ".json",
      JSON.stringify({ app: "presort-throughput-tracker", version: 1, exportedAt: new Date().toISOString(), targets: state.targets, days: state.days }, null, 2),
      "application/json");
    state.lastBackup = new Date().toISOString(); persist(); renderBackupState();
    setConn("Backup downloaded");
  });
  $("importFile").addEventListener("change", e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result), days = cleanDays(d.days), n = Object.keys(days).length;
        if (!n) throw new Error("empty");
        Object.assign(state.days, days);
        if (d.targets) state.targets = cleanTargets(d.targets);
        persist(); render(); setConn("Restored " + n + (n === 1 ? " day" : " days") + " from the backup");
      } catch (err) { setConn("That file isn't a tracker backup", true); }
      e.target.value = "";
    };
    r.readAsText(f);
  });
  let armed = false;
  function resetClear() { armed = false; $("clearDay").textContent = "Clear this day"; }
  $("clearDay").addEventListener("click", () => {
    if (viewing() || !state.days[state.date]) { setConn("Nothing to clear for this day", true); return; }
    if (!armed) { armed = true; $("clearDay").textContent = "Click again to clear " + niceDate(state.date); return; }
    delete state.days[state.date]; persist(); render(); setConn("Cleared " + niceDate(state.date));
  });

  // ---------- targets ----------
  const form = $("tgtForm");
  function fillTargets(t) { $("tgtP1").value = t.p1; $("tgtP2").value = t.p2; $("tgtTotal").value = t.total; }
  $("editTargets").addEventListener("click", () => { fillTargets(targets()); form.hidden = false; $("tgtP1").focus(); });
  $("tgtCancel").addEventListener("click", () => { form.hidden = true; });
  $("tgtReset").addEventListener("click", () => fillTargets(DEFAULT_TARGETS));
  form.addEventListener("submit", e => {
    e.preventDefault();
    const t = { p1: +$("tgtP1").value, p2: +$("tgtP2").value, total: +$("tgtTotal").value };
    if (![t.p1, t.p2, t.total].every(v => v > 0)) { setConn("Targets need to be above zero", true); return; }
    state.targets = t;
    if (state.days[state.date]) state.days[state.date].targets = { ...t };
    persist(); form.hidden = true; render(); setConn("Targets saved");
  });

  // ---------- navigation and theme ----------
  function go(key) { if (viewing() && key !== state.shared.date) { state.shared = null; clearHash(); } state.date = key; render(); }
  $("prev").addEventListener("click", () => go(shiftDay(state.date, -1)));
  $("next").addEventListener("click", () => go(shiftDay(state.date, 1)));
  $("today").addEventListener("click", () => go(sortDayKey(new Date())));
  $("date").addEventListener("change", e => { if (e.target.value) go(e.target.value); });
  const app = $("app");
  function setMode(mono) {
    app.classList.toggle("mono", mono);
    $("modeMono").setAttribute("aria-pressed", String(mono));
    $("modeColour").setAttribute("aria-pressed", String(!mono));
    try { localStorage.setItem(STORE_KEY + "-mode", mono ? "mono" : "colour"); } catch (e) {}
  }
  $("modeMono").addEventListener("click", () => setMode(true));
  $("modeColour").addEventListener("click", () => setMode(false));

  let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { drawChart(dayData(state.date)); drawRecordChart(recordKeys().map(summarise)); }, 120); });
  setInterval(() => { if (!document.activeElement || document.activeElement.tagName !== "INPUT") render(); }, 60000);

  // ---------- start ----------
  load();
  try {
    if (localStorage.getItem(STORE_KEY + "-mode") === "mono") setMode(true);
    const rg = localStorage.getItem(STORE_KEY + "-range"); if (rg === "7" || rg === "30" || rg === "all") state.recRange = rg;
  } catch (e) {}
  state.date = sortDayKey(new Date());
  buildRows();
  readHash();
  render();
  if (!state.canSave) setConn("This browser won't keep figures (private window?)", true);
})();
