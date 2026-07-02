/* AZ-900 Drill Room — app logic.
   Deliberately no storage APIs: nothing persists between page loads.
   Screenshot exam results if you want to compare attempts. */

(function () {
"use strict";

// ---------- helpers ----------
const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const DOMAIN = { 1: "Domain 1", 2: "Domain 2", 3: "Domain 3" };

function el(t, cls, text) {
  const n = document.createElement(t);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}
function tag(d) { return el("span", "tag d" + d, DOMAIN[d]); }
function shuffle(a) {
  const x = a.slice();
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
}

// ---------- tabs ----------
const tabButtons = $$("nav.tabs button");
function activeView() {
  const b = tabButtons.find(x => x.classList.contains("active"));
  return b ? b.dataset.view : "";
}
tabButtons.forEach(b => b.addEventListener("click", () => {
  tabButtons.forEach(x => x.classList.toggle("active", x === b));
  $$(".view").forEach(v => v.classList.toggle("active", v.id === "view-" + b.dataset.view));
}));

// ---------- flashcards ----------
const FC = { deck: "traps", dom: 0, order: [], i: 0 };

function fcPool() {
  const src = FC.deck === "traps" ? AZ_DATA.trapCards : AZ_DATA.fullCards;
  return FC.dom ? src.filter(c => c.d === FC.dom) : src;
}
function fcLoad(shuffled) {
  const pool = fcPool();
  FC.order = shuffled ? shuffle(pool) : pool.slice();
  FC.i = 0;
  fcRender();
}
function fcFlip() {
  const c = $("#fc-stage .fc");
  if (c) c.classList.toggle("flipped");
}
function fcRender() {
  const stage = $("#fc-stage");
  stage.innerHTML = "";
  const card = FC.order[FC.i];
  if (!card) {
    stage.appendChild(el("p", "sub", "No cards match this filter."));
    $("#fc-count").textContent = "0 cards";
    return;
  }
  const btn = el("button", "fc");
  btn.type = "button";
  btn.setAttribute("aria-label", "Flashcard: activate to flip");

  const inner = el("div", "fc-inner");

  const front = el("div", "face d" + card.d);
  const fe = el("div", "eyebrow");
  fe.appendChild(el("span", null, FC.deck === "traps" ? "if the question stresses\u2026" : "question"));
  fe.appendChild(tag(card.d));
  const cue = el("div", "cue");
  cue.appendChild(document.createTextNode(card.c));
  cue.appendChild(el("span", "glyph", "\u2192"));
  front.append(fe, cue, el("div", "hint", "tap or press space to flip"));

  const back = el("div", "face back d" + card.d);
  const be = el("div", "eyebrow");
  be.appendChild(el("span", null, "answer"));
  be.appendChild(tag(card.d));
  back.append(be, el("div", "ans", card.a), el("div", "why", card.w || ""), el("div", "hint", "\u2192 for the next card"));

  inner.append(front, back);
  btn.appendChild(inner);
  btn.addEventListener("click", () => btn.classList.toggle("flipped"));
  stage.appendChild(btn);
  $("#fc-count").textContent = "card " + (FC.i + 1) + " / " + FC.order.length;
}
function fcStep(n) {
  if (!FC.order.length) return;
  FC.i = (FC.i + n + FC.order.length) % FC.order.length;
  fcRender();
}

$("#fc-prev").addEventListener("click", () => fcStep(-1));
$("#fc-next").addEventListener("click", () => fcStep(1));
$("#fc-flip").addEventListener("click", fcFlip);
$("#fc-shuffle").addEventListener("click", () => fcLoad(true));
$$("#fc-deck button").forEach(b => b.addEventListener("click", () => {
  FC.deck = b.dataset.deck;
  $$("#fc-deck button").forEach(x => x.classList.toggle("on", x === b));
  fcLoad(false);
}));
$$("#fc-dom button").forEach(b => b.addEventListener("click", () => {
  FC.dom = Number(b.dataset.dom);
  $$("#fc-dom button").forEach(x => x.classList.toggle("on", x === b));
  fcLoad(false);
}));

document.addEventListener("keydown", (e) => {
  if (activeView() !== "cards") return;
  const t = e.target;
  if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
  if (e.key === "ArrowRight") { e.preventDefault(); fcStep(1); }
  else if (e.key === "ArrowLeft") { e.preventDefault(); fcStep(-1); }
  else if (e.key === " ") {
    // if the card itself has focus, the native button activation will flip it
    if (document.activeElement && document.activeElement.classList.contains("fc")) return;
    e.preventDefault();
    fcFlip();
  }
});

// ---------- match ----------
const M = { pairs: [], selC: -1, selA: -1, tries: 0, done: 0, lock: false };

function tileByK(colSel, k) { return $(colSel + ' .tile[data-k="' + k + '"]'); }

function matchNew() {
  M.pairs = shuffle(AZ_DATA.matchPairs).slice(0, 8);
  M.selC = -1; M.selA = -1; M.tries = 0; M.done = 0; M.lock = false;
  $("#m-banner").innerHTML = "";
  const cues = $("#m-cues"), ans = $("#m-ans");
  cues.innerHTML = ""; ans.innerHTML = "";
  shuffle(M.pairs.map((p, k) => ({ p, k }))).forEach(({ p, k }) => {
    const b = el("button", "tile cue", p.c);
    b.type = "button"; b.dataset.k = k;
    b.addEventListener("click", () => pick("c", k, b));
    cues.appendChild(b);
  });
  shuffle(M.pairs.map((p, k) => ({ p, k }))).forEach(({ p, k }) => {
    const b = el("button", "tile", p.a);
    b.type = "button"; b.dataset.k = k;
    b.addEventListener("click", () => pick("a", k, b));
    ans.appendChild(b);
  });
  matchStatus();
}
function pick(side, k, b) {
  if (M.lock || b.classList.contains("done")) return;
  if (side === "c") {
    if (M.selC === k) { M.selC = -1; b.classList.remove("sel"); return; }
    if (M.selC > -1) tileByK("#m-cues", M.selC).classList.remove("sel");
    M.selC = k; b.classList.add("sel");
  } else {
    if (M.selA === k) { M.selA = -1; b.classList.remove("sel"); return; }
    if (M.selA > -1) tileByK("#m-ans", M.selA).classList.remove("sel");
    M.selA = k; b.classList.add("sel");
  }
  if (M.selC === -1 || M.selA === -1) return;

  const c = tileByK("#m-cues", M.selC), a = tileByK("#m-ans", M.selA);
  M.tries++;
  if (M.selC === M.selA) {
    [c, a].forEach(t => { t.classList.remove("sel"); t.classList.add("done"); t.disabled = true; });
    M.done++; M.selC = -1; M.selA = -1;
    if (M.done === M.pairs.length) {
      const acc = Math.round((M.pairs.length / M.tries) * 100);
      $("#m-banner").appendChild(el("div", "banner",
        "Round clear \u2014 " + M.pairs.length + " pairs in " + M.tries + " tries (" + acc + "% accuracy)."));
    }
  } else {
    M.lock = true;
    [c, a].forEach(t => t.classList.add("shake"));
    setTimeout(() => {
      [c, a].forEach(t => t.classList.remove("shake", "sel"));
      M.selC = -1; M.selA = -1; M.lock = false;
    }, 340);
  }
  matchStatus();
}
function matchStatus() {
  $("#m-status").textContent = M.done + " / " + M.pairs.length + " matched \u00b7 " + M.tries + " tries";
}
$("#m-new").addEventListener("click", matchNew);

// ---------- scenarios ----------
const S = { order: [], i: 0, right: 0, seen: 0, locked: false };

function scnStart() {
  S.order = shuffle(AZ_DATA.scenarios);
  S.i = 0; S.right = 0; S.seen = 0;
  scnRender();
}
function scnRender() {
  S.locked = false;
  const box = $("#s-box");
  box.innerHTML = "";
  const q = S.order[S.i];
  const card = el("div", "qcard d" + q.d);
  const eb = el("div", "eyebrow");
  eb.appendChild(el("span", null, "scenario " + (S.i + 1) + " / " + S.order.length));
  eb.appendChild(tag(q.d));
  card.appendChild(eb);
  card.appendChild(el("p", "stem", q.q));
  const opts = el("div", "opts");
  q.opts.forEach((o, idx) => {
    const b = el("button", "opt", o);
    b.type = "button";
    b.addEventListener("click", () => {
      if (S.locked) return;
      S.locked = true; S.seen++;
      if (idx === q.c) { S.right++; b.classList.add("right"); }
      else { b.classList.add("wrong"); opts.children[q.c].classList.add("right"); }
      $$("button", opts).forEach(x => x.disabled = true);
      const why = el("div", "why-box");
      why.appendChild(el("strong", null, q.opts[q.c] + ". "));
      why.appendChild(document.createTextNode(q.w));
      card.appendChild(why);
      $("#s-next").disabled = false;
      scnTally();
    });
    opts.appendChild(b);
  });
  card.appendChild(opts);
  box.appendChild(card);
  $("#s-next").disabled = true;
  scnTally();
}
function scnTally() {
  $("#s-tally").textContent = S.right + " / " + S.seen + " correct this session";
}
$("#s-next").addEventListener("click", () => {
  S.i++;
  if (S.i >= S.order.length) { S.order = shuffle(AZ_DATA.scenarios); S.i = 0; }
  scnRender();
});
$("#s-restart").addEventListener("click", scnStart);

// ---------- mock exam ----------
const E = { qs: [], ans: [], i: 0, count: 30, mins: 30, left: 0, timerId: null, phase: "setup" };

function fmt(s) {
  const m = Math.floor(s / 60), x = s % 60;
  return String(m).padStart(2, "0") + ":" + String(x).padStart(2, "0");
}
function examSetup() {
  E.phase = "setup";
  if (E.timerId) { clearInterval(E.timerId); E.timerId = null; }
  const box = $("#e-box");
  box.innerHTML = "";
  const s = el("div", "exam-setup");
  s.appendChild(el("h2", null, "Mock exam"));
  s.appendChild(el("p", "sub",
    "Random draw from a bank of " + AZ_DATA.examBank.length +
    " questions. Nothing is saved \u2014 screenshot your score if you want to compare attempts."));

  const r1 = el("div", "row");
  r1.appendChild(el("span", "lbl", "questions"));
  const seg1 = el("div", "seg");
  [15, 30, 45].forEach(n => {
    const b = el("button", n === E.count ? "on" : "", String(n));
    b.type = "button";
    b.addEventListener("click", () => {
      E.count = n;
      $$("button", seg1).forEach(x => x.classList.toggle("on", x === b));
    });
    seg1.appendChild(b);
  });
  r1.appendChild(seg1);

  const r2 = el("div", "row");
  r2.appendChild(el("span", "lbl", "timer"));
  const seg2 = el("div", "seg");
  [["none", 0], ["15 min", 15], ["30 min", 30], ["45 min", 45]].forEach(([label, m]) => {
    const b = el("button", m === E.mins ? "on" : "", label);
    b.type = "button";
    b.addEventListener("click", () => {
      E.mins = m;
      $$("button", seg2).forEach(x => x.classList.toggle("on", x === b));
    });
    seg2.appendChild(b);
  });
  r2.appendChild(seg2);

  const start = el("button", "btn primary", "Start exam");
  start.type = "button";
  start.addEventListener("click", examStart);
  s.append(r1, r2, start);
  box.appendChild(s);
}
function examStart() {
  const n = Math.min(E.count, AZ_DATA.examBank.length);
  E.qs = shuffle(AZ_DATA.examBank).slice(0, n);
  E.ans = new Array(n).fill(-1);
  E.i = 0;
  E.phase = "run";
  if (E.mins) {
    E.left = E.mins * 60;
    E.timerId = setInterval(() => {
      E.left--;
      const t = $("#e-timer");
      if (t) {
        t.textContent = fmt(Math.max(E.left, 0));
        t.classList.toggle("low", E.left < 60);
      }
      if (E.left <= 0) examFinish(true);
    }, 1000);
  }
  examRender();
}
function examRender() {
  const box = $("#e-box");
  box.innerHTML = "";

  const top = el("div", "exam-top");
  top.appendChild(el("div", "count", "question " + (E.i + 1) + " / " + E.qs.length));
  const timer = el("div", "timer");
  timer.id = "e-timer";
  timer.textContent = E.mins ? fmt(Math.max(E.left, 0)) : "no timer";
  if (E.mins && E.left < 60) timer.classList.add("low");
  top.appendChild(timer);
  box.appendChild(top);

  const pal = el("div", "palette");
  E.qs.forEach((_, k) => {
    const d = el("button",
      "dot" + (E.ans[k] > -1 ? " answered" : "") + (k === E.i ? " current" : ""),
      String(k + 1));
    d.type = "button";
    d.addEventListener("click", () => { E.i = k; examRender(); });
    pal.appendChild(d);
  });
  box.appendChild(pal);

  const q = E.qs[E.i];
  const card = el("div", "qcard d" + q.d);
  const eb = el("div", "eyebrow");
  eb.appendChild(el("span", null, "mock exam"));
  eb.appendChild(tag(q.d));
  card.appendChild(eb);
  card.appendChild(el("p", "stem", q.q));
  const opts = el("div", "opts");
  q.opts.forEach((o, idx) => {
    const b = el("button", "opt" + (E.ans[E.i] === idx ? " picked" : ""), o);
    b.type = "button";
    b.addEventListener("click", () => { E.ans[E.i] = idx; examRender(); });
    opts.appendChild(b);
  });
  card.appendChild(opts);
  box.appendChild(card);

  const bar = el("div", "session-bar");
  const prev = el("button", "btn", "Previous");
  prev.type = "button"; prev.disabled = E.i === 0;
  prev.addEventListener("click", () => { E.i--; examRender(); });
  const next = el("button", "btn", "Next");
  next.type = "button"; next.disabled = E.i === E.qs.length - 1;
  next.addEventListener("click", () => { E.i++; examRender(); });
  const fin = el("button", "btn primary", "Finish and score");
  fin.type = "button";
  fin.addEventListener("click", () => examFinish(false));
  bar.append(prev, next, fin);
  box.appendChild(bar);
}
function examFinish(auto) {
  if (E.phase !== "run") return;
  if (!auto) {
    const blank = E.ans.filter(a => a === -1).length;
    if (blank && !window.confirm(
      blank + " unanswered question" + (blank > 1 ? "s" : "") + " will score zero. Finish anyway?")) return;
  }
  if (E.timerId) { clearInterval(E.timerId); E.timerId = null; }
  E.phase = "done";
  examResults(auto);
}
function examResults(auto) {
  const box = $("#e-box");
  box.innerHTML = "";
  const right = E.qs.reduce((n, q, k) => n + (E.ans[k] === q.c ? 1 : 0), 0);
  const pct = Math.round((right / E.qs.length) * 100);

  const head = el("div", "result-head");
  const sc = el("div", "score", right + " / " + E.qs.length + " \u00b7 " + pct + "%");
  sc.appendChild(el("small", null,
    (auto ? "Time expired. " : "") +
    "The real exam reports a scaled score \u2014 700/1000 is the pass mark, not 70% of questions. " +
    "Nothing here is saved: screenshot this screen to compare attempts."));
  head.appendChild(sc);
  box.appendChild(head);

  const bar = el("div", "session-bar");
  const wrongOnly = el("button", "btn", "Show wrong only");
  wrongOnly.type = "button";
  const retake = el("button", "btn primary", "Retake");
  retake.type = "button";
  retake.addEventListener("click", examSetup);
  bar.append(wrongOnly, retake);
  box.appendChild(bar);

  const list = el("div");
  box.appendChild(list);
  let filt = false;
  function renderList() {
    list.innerHTML = "";
    E.qs.forEach((q, k) => {
      const ok = E.ans[k] === q.c;
      if (filt && ok) return;
      const item = el("div", "review-item");
      const card = el("div", "qcard d" + q.d);
      const eb = el("div", "eyebrow");
      eb.appendChild(el("span", "verdict " + (ok ? "ok" : "bad"), (ok ? "\u2713" : "\u2717") + " Q" + (k + 1)));
      eb.appendChild(tag(q.d));
      card.appendChild(eb);
      card.appendChild(el("p", "stem", q.q));
      const l1 = el("p", "ln");
      l1.appendChild(el("span", "mut", "your answer \u2014 "));
      l1.appendChild(document.createTextNode(E.ans[k] === -1 ? "unanswered" : q.opts[E.ans[k]]));
      const l2 = el("p", "ln");
      l2.appendChild(el("span", "mut", "correct \u2014 "));
      l2.appendChild(document.createTextNode(q.opts[q.c]));
      const l3 = el("p", "ln");
      l3.appendChild(el("span", "mut", q.w));
      card.append(l1, l2, l3);
      item.appendChild(card);
      list.appendChild(item);
    });
    if (!list.children.length) {
      list.appendChild(el("p", "sub", "Nothing wrong to show \u2014 clean run."));
    }
  }
  wrongOnly.addEventListener("click", () => {
    filt = !filt;
    wrongOnly.textContent = filt ? "Show all" : "Show wrong only";
    renderList();
  });
  renderList();
}

// ---------- init ----------
fcLoad(false);
matchNew();
scnStart();
examSetup();

})();
