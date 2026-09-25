import { clamp, type Grid, type Sim } from "../grid";

// ImpactOS engine: the detail sheet's scene, acting out each step of "How it works" (see the steps
// for "ingest" in src/data/cv.ts). One set of pieces plays every step: three client files drop in
// as they are, get filed raw into bronze, give up their column names to the silver mapping, line up
// as a gold table against a framework, become the source rows an answer cites, and end as drafted
// answers an agent types into a portal. Each piece is an entity with a place and a text per step;
// when the step changes it walks to its new cell and scrambles into its new text, so any step can
// follow any other. What only one step needs (connectors, typing, counters) is drawn on top and
// scrambles out when the step or its loop moves on.

const NOISE = ".:;+=*x#%";

function hash(a: number, b: number) {
  let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function seedOf(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h | 0;
}
const easeIO = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const easeOut = (u: number) => 1 - Math.pow(1 - u, 3);
const fmt = (n: number) => n.toLocaleString("en-GB");

// w: while it moves, the entity blanks this many cells behind it, so a card slides over what it
// crosses instead of mixing letters with it.
type Spec = { x: number; y: number; s: string; a: number; hot?: boolean; d?: number; drop?: number; w?: number };
type Ent = {
  seed: number;
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  s0: string;
  s1: string;
  a0: number;
  a1: number;
  h0: boolean;
  h1: boolean;
  v0: boolean;
  v1: boolean;
  t: number;
  d: number;
  dur: number;
  drop: boolean;
  top: boolean;
  w: number;
};

// The three uploads. Each line is a list of pieces [dx, id, text, alpha]; pieces with ids other
// steps use (column names, values) travel on from here.
type Piece = [number, string, string, number];
type Upload = { name: string; kind: string; sha: string; meta: string; lines: Piece[][] };
const HEAD = 0.5;
const CELL = 0.32;

const STEPS = ["upload", "bronze", "silver", "gold", "answer", "review"];
// Seconds each step's loop spends on one picture before moving to the next (0: no layout loop).
const PERIOD = [0, 0, 6.5, 6, 5.5, 0];
const PHASES = [1, 1, 2, 2, 4, 1];

// Silver: the column names a client used, the field each maps to, and how it was matched.
type Src = [id: string, text: string, from: string, score: string];
const MAPS: { f: string; src: Src[] }[][] = [
  [
    { f: "site", src: [["hx.site", "Site", "xlsx", "fz .97"], ["hc.loc", "loc", "csv", "em .91"]] },
    { f: "elec", src: [["hx.elec", "Elec kWh", "xlsx", "fz .94"], ["hc.kwh", "kwh", "csv", "fz .88"]] },
    { f: "s1", src: [["hp.s1", "Scope 1 (t)", "pdf", "em .93"]] },
    { f: "s2", src: [["hp.s2", "Scope 2 (t)", "pdf", "em .92"]] },
    { f: "per", src: [["hc.yr", "yr", "csv", "em .86"]] },
  ],
  [
    { f: "site", src: [["hb.bld", "Building", "xlsx", "em .89"], ["hb.prem", "Premises", "xlsx", "em .84"]] },
    { f: "elec", src: [["hb.pow", "Power kWh", "xlsx", "fz .90"], ["hb.use", "Elec usage", "csv", "em .87"]] },
    { f: "s1", src: [["hb.dir", "Direct CO2e", "pdf", "em .90"]] },
    { f: "s2", src: [["hb.ind", "Indirect", "pdf", "em .81"]] },
    { f: "per", src: [["hb.mon", "Month", "csv", "fz .83"]] },
  ],
];
const FIELD: Record<string, string> = { site: "site", elec: "electricity_kwh", s1: "scope1_tco2e", s2: "scope2_tco2e", per: "period" };

// Gold: the framework as its questionnaire lays it out, sections and items, with each clean row
// lined up against the item it answers. Items no row answers stay dim.
type Row = [key: string, metric: string, value: string];
type Item = [code: string, label: string, key: string, section?: boolean];
const FRAMEWORKS: { name: string; items: Item[]; rows: Row[] }[] = [
  {
    name: "CDP",
    items: [
      ["C6", "emissions", "", true],
      ["C6.1", "scope 1", "s1"],
      ["C6.3", "scope 2", "s2"],
      ["C6.5", "scope 3", ""],
      ["C8", "energy", "", true],
      ["C8.2a", "consumption", "elec"],
    ],
    rows: [
      ["s1", "scope1_tco2e", "412.6"],
      ["s2", "scope2_tco2e", "1,284"],
      ["elec", "electricity_kwh", "15,350"],
    ],
  },
  {
    name: "UK SVM",
    items: [
      ["Theme 2", "inequality", "", true],
      ["MAC 2.1", "jobs, skills", "jobs"],
      ["MAC 2.2", "supply chain", "sme"],
      ["Theme 3", "climate", "", true],
      ["MAC 3.1", "environment", "s1"],
      ["Theme 4", "opportunity", "", true],
      ["MAC 4.1", "disability", "dis"],
    ],
    rows: [
      ["jobs", "new_jobs", "38"],
      ["sme", "sme_spend", "31%"],
      ["s1", "scope1_tco2e", "412.6"],
      ["dis", "disabled_hires", "4"],
    ],
  },
];

// Answer: plain-English questions, the query each becomes, and the rows its answer cites.
const QUESTIONS = [
  {
    q: "what was scope 2 in FY24?",
    query: ["select value from gold.emissions", "where metric = 'scope2_tco2e'", "  and period = 'FY24'"],
    via: "sql  duckdb over parquet",
    ans: "1,284 tCO2e",
    cites: [1],
  },
  {
    q: "where did that figure come from?",
    query: ["match (v:Value {row: 'r2'})", "  -[:FROM]->(s:Source)", "return s.file, s.page"],
    via: "graph  lineage",
    ans: "audit_2024.pdf, p.12",
    cites: [1],
  },
  {
    q: "total electricity in FY24?",
    query: ["select sum(value) from gold.energy", "where metric = 'electricity_kwh'", "  and period = 'FY24'"],
    via: "sql  duckdb over parquet",
    ans: "15,350 kWh",
    cites: [2],
  },
  {
    q: "scope 1 and 2 combined?",
    query: ["select sum(value) from gold.emissions", "where metric in ('scope1_tco2e',", "  'scope2_tco2e')"],
    via: "sql  duckdb over parquet",
    ans: "1,696.6 tCO2e",
    cites: [0, 1],
  },
];
const SOURCE_ROWS: [key: string, src: string][] = [
  ["s1", "pdf p.12"],
  ["s2", "pdf p.12"],
  ["elec", "xlsx B5"],
];

export function ingestFlow(cols: number, rows: number): Sim {
  const reduced = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // ---- Geometry, all from cols and rows ----------------------------------------------------------
  const L = 2;
  const R = cols - 3;
  const W = R - L + 1;
  const T = 4;
  const H = rows - 3 - T + 1;
  const tall = H >= 34;
  const topFor = (h: number) => T + Math.max(0, Math.floor((H - h) / 2));

  const files: Upload[] = [
    {
      name: "energy_q3.xlsx",
      kind: "xlsx",
      sha: "3f9a1c",
      meta: "1 sheet",
      lines: [
        [[0, "hx.site", "Site", HEAD], [6, "hx.elec", "Elec kWh", HEAD]],
        [[0, "x.a", "HQ", CELL], [6, "x.av", "12,040", CELL]],
        [[0, "x.b", "Depot", CELL], [6, "x.bv", "n/a", CELL]],
        [[0, "x.c", "Lab", CELL], [6, "x.cv", "3 310", CELL]],
        [[0, "x.d", "TOTAL", CELL], [6, "v.elec", "15350", CELL]],
      ],
    },
    {
      name: "audit_2024.pdf",
      kind: "pdf",
      sha: "b71e02",
      meta: "32 pages",
      lines: [
        [[0, "p.h", "p.12 Emissions", 0.26]],
        [[0, "hp.s1", "Scope 1 (t)", HEAD]],
        [[0, "v.s1", "412.6", CELL], [6, "p.f1", "FY24", 0.2]],
        [[0, "hp.s2", "Scope 2 (t)", HEAD]],
        [[0, "v.s2", "1,284", CELL], [6, "p.f2", "FY24", 0.2]],
        ...(tall ? [[[0, "p.x", "~~~ ~~ ~~~~", 0.14] as Piece]] : []),
      ],
    },
    {
      name: "sites.csv",
      kind: "csv",
      sha: "0c4d88",
      meta: "3 rows",
      lines: [
        [[0, "hc.loc", "loc", HEAD], [3, "c.k1", ",", 0.3], [4, "hc.kwh", "kwh", HEAD], [7, "c.k2", ",", 0.3], [8, "hc.yr", "yr", HEAD]],
        [[0, "c.a", "HQ,12040,24", CELL]],
        [[0, "c.b", "Lab,3310,24", CELL]],
        [[0, "c.c", "Depot,,2024", CELL]],
      ],
    },
  ];
  const cardH = (i: number) => 2 + files[i].lines.length;
  const gap = W >= 60 ? 3 : 2;
  const cw = clamp(Math.floor((W - 2 * gap) / 3), 14, 20);

  // 1 Upload: three cards side by side, dropped at uneven heights.
  const offs = tall ? [4, 0, 8] : [1, 0, 3];
  const cardsH = Math.max(...files.map((_, i) => offs[i] + cardH(i)));
  const y1 = topFor(cardsH + 3);
  const gx0 = L + Math.floor((W - (3 * cw + 2 * gap)) / 2);
  const up = files.map((_, i) => ({ x: gx0 + i * (cw + gap), y: y1 + offs[i], metaY: y1 + offs[i] + cardH(i) }));
  const capY = y1 + cardsH + 2;
  const landAt = [0, 0, 0];

  // 2 Bronze: the same cards filed in a stack, a report beside them.
  const repW = 22;
  const m2 = Math.max(0, Math.floor((W - (cw + repW + 14)) / 2));
  const bx = L + m2;
  const rx = R - m2 - repW + 1;
  const sg = tall ? 2 : 1;
  const y2 = topFor(2 + files.reduce((n, _, i) => n + cardH(i), 0) + 2 * sg);
  const stackY: number[] = [];
  for (let i = 0, y = y2 + 2; i < 3; i++) {
    stackY.push(y);
    y += cardH(i) + sg;
  }
  const bronzeRule = (i: number) => `- sha ${files[i].sha} `.padEnd(cw, "-");
  // Report figures sit on the row of the raw value they came from.
  const figures = [
    { id: "rep.s1", s: "scope 1     412.6 t", file: 1, line: 2 },
    { id: "rep.s2", s: "scope 2     1,284 t", file: 1, line: 4 },
    { id: "rep.elec", s: "electricity 15,350 kWh", file: 0, line: 4, dx: 6 },
  ].map((f) => ({
    ...f,
    x: bx + (f.dx ?? 0),
    y: stackY[f.file] + 2 + f.line,
    // The dotted trace starts one cell after the last text on the raw row.
    from: bx + Math.max(...files[f.file].lines[f.line].map(([dx, , t]) => dx + t.length)) + 1,
  }));

  // 3 Silver: source columns on the left, known fields on the right, joined where they match.
  const tags = W >= 54;
  const m3 = Math.max(0, Math.floor((W - (tags ? 58 : 50)) / 2));
  const sx = L + m3;
  const tagX = sx + 12;
  const methX = tags ? tagX + 6 : sx + 12;
  const x0 = methX + 7;
  const fx = R - m3 - 14;
  const jx = fx - 4;
  const gOut = tall ? 4 : 2;
  const srcY: number[] = [];
  const grpY: number[] = [];
  {
    let y = 0;
    MAPS[0].forEach((grp, gi) => {
      if (gi) y += gOut;
      const first = y;
      grp.src.forEach((_, k) => {
        if (k) y += 2;
        srcY.push(y);
      });
      grpY.push((first + y) / 2);
    });
  }
  const span3 = srcY[srcY.length - 1] + 1;
  const y3 = topFor(2 + span3 + 2);
  const sy3 = y3 + 2;
  const cap3 = y3 + 2 + span3 + 1;

  // 4 Gold: a clean table, each row lined up with its place in the framework.
  const labels = W >= 55;
  const tw4 = labels ? 53 : 38;
  const m4 = Math.max(0, Math.floor((W - tw4) / 2));
  const gx = L + m4;
  const valX = gx + 17;
  const codeX = gx + (labels ? 33 : 30);
  const rule4 = tw4;
  // Each framework has its own ladder; items sit two rows apart where there is room, sections one
  // row further, and the table stays centred on either.
  const gold = FRAMEWORKS.map((fw) => {
    const n = fw.items.length;
    const secs = fw.items.filter((it) => it[3]).length - 1;
    const g = H >= 2 * n + secs + 7 ? 2 : 1;
    const at: number[] = [];
    let yy = 0;
    fw.items.forEach((it, k) => {
      if (k) yy += g + (it[3] && g > 1 ? 1 : 0);
      at.push(yy);
    });
    const y = topFor(2 + yy + 1 + 2);
    const rowOf = (key: string) => y + 2 + at[fw.items.findIndex((it) => it[2] === key)];
    return { y, at: (k: number) => y + 2 + at[k], rowOf, cap: y + 2 + yy + 2 };
  });

  // 5 Answer: the question, its query, the answer, and the rows it cites.
  const m5 = Math.max(0, Math.floor((W - 50) / 2));
  const ax = L + m5;
  const g5 = tall ? 2 : 1;
  const y5 = topFor(10 + 2 * g5 + 1);
  const rowY5 = (k: number) => y5 + 10 + k * g5;

  // 6 Review: drafted answers with their approval, then the portal the agent fills in.
  const m6 = Math.max(0, Math.floor((W - 50) / 2));
  const qx = L + m6;
  const g6 = tall ? 2 : 1;
  const h6Draft = 2 + 2 * g6 + 1;
  const y6 = topFor(h6Draft + 2 + 2 + 2 * g6 + 1 + 2);
  const dY = (k: number) => y6 + 2 + k * g6;
  const py = y6 + h6Draft + 1;
  const pY = (k: number) => py + 2 + k * g6;
  const cntY = pY(2) + 2;
  const REVIEW: [key: string, code: string][] = [
    ["s1", "C6.1"],
    ["s2", "C6.3"],
    ["elec", "C8.2a"],
  ];
  const VALUE: Record<string, string> = { s1: "412.6", s2: "1,284", elec: "15,350" };

  // ---- Layout of every entity for a step and its loop phase ---------------------------------------
  function layout(step: number, phase: number) {
    const m = new Map<string, Spec>();
    const add = (id: string, x: number, y: number, s: string, a: number, o: Partial<Spec> = {}) => m.set(id, { x, y, s, a, ...o });
    const card = (i: number, x: number, y: number, rule: string, d: number, drop?: number) => {
      const f = files[i];
      // A card moves as one block and covers what it passes over.
      add(`n${i}`, x, y, f.name, 0.62, { d, drop, w: cw });
      add(`r${i}`, x, y + 1, rule, 0.16, { d, drop, w: cw });
      f.lines.forEach((ln, k) => ln.forEach(([dx, id, s, a]) => add(id, x + dx, y + 2 + k, s, a, { d, drop, w: dx ? 0 : cw })));
    };

    // The rail along the top names every step and lights the current one.
    if (W >= 54) {
      let x = R - 43;
      STEPS.forEach((s, k) => {
        add(`rail${k}`, x, 1, s, k === step ? 0.85 : k < step ? 0.3 : 0.16, { d: 0 });
        x += s.length + 2;
      });
    } else add("rail", R - STEPS[step].length + 1, 1, STEPS[step], 0.7, { d: 0 });

    if (step === 0) {
      files.forEach((_, i) => card(i, up[i].x, up[i].y, "-".repeat(cw), 0.12 * i, up[i].y + cardH(i)));
    } else if (step === 1) {
      files.forEach((_, i) => card(i, bx, stackY[i], bronzeRule(i), 0.14 * i));
      add("hd.l", bx, y2, "RAW FILES", HEAD);
      add("hd.r", rx, y2, "REPORT", HEAD);
      figures.forEach((f, k) => add(f.id, rx, f.y, f.s, 0.7, { d: 0.55 + 0.1 * k }));
    } else if (step === 2) {
      add("hd.l", sx, y3, "SOURCE COLUMNS", HEAD);
      add("hd.r", fx, y3, "KNOWN FIELDS", HEAD);
      let n = 0;
      MAPS[phase].forEach((grp, gi) => {
        grp.src.forEach(([id, s, from]) => {
          add(id, sx, sy3 + srcY[n], s, 0.85, { d: 0.05 + 0.05 * n });
          if (tags) add(`tg.${id}`, tagX, sy3 + srcY[n], from, 0.24, { d: 0.25 + 0.05 * n });
          n++;
        });
        add(`f.${grp.f}`, fx, sy3 + grpY[gi], FIELD[grp.f], 0.85, { d: 0.45 + 0.08 * gi });
      });
      add("cap.l", sx, cap3, phase ? "client B layout" : "client A layout", 0.5, { d: 0.1 });
      if (W >= 50) add("cap.r", R - m3 - 23, cap3, "fuzzy match + embeddings", 0.26, { d: 0.2 });
    } else if (step === 3) {
      const fw = FRAMEWORKS[phase];
      const G = gold[phase];
      add("hd.l", gx, G.y, "METRIC", HEAD);
      add("hd.v", valX, G.y, "VALUE", HEAD);
      add("hd.r", codeX, G.y, fw.name, 0.85, { d: 0.1 });
      add("rule.g", gx, G.y + 1, "-".repeat(rule4), 0.12);
      // The framework's ladder writes itself in first, then the clean rows slide across to meet
      // their items, metric names first and values behind them.
      fw.items.forEach(([code, label, key, sec], k) => {
        const y = G.at(k);
        const d = 0.05 + 0.05 * k;
        const a = sec ? 0.34 : key ? 0.7 : 0.18;
        add(key ? `cd.${key}` : `lad.${code}`, codeX, y, code, a, { d });
        // A section names its group on the table's left; items carry their label on the right.
        if (sec) add(`lb.${code}`, gx, y, label, 0.3, { d: d + 0.05 });
        else if (labels) add(key ? `lb.${key}` : `lb.${code}`, codeX + 8, y, label, key ? 0.42 : 0.16, { d: d + 0.05 });
      });
      fw.rows.forEach(([key, metric, value], k) => {
        const y = G.rowOf(key);
        add(`f.${key}`, gx, y, metric, 0.8, { d: 0.25 + 0.07 * k });
        add(`v.${key}`, valX, y, value, 0.8, { d: 0.45 + 0.07 * k });
      });
      add("f.per", gx, G.cap, "FY24", 0.45, { d: 0.3 });
      add("f.site", gx + 6, G.cap, "3 sites", 0.3, { d: 0.35 });
    } else if (step === 4) {
      const q = QUESTIONS[phase];
      add("hd.l", ax, y5 + 9, "SOURCE ROWS", HEAD);
      if (W >= 50) add("hd.r", ax + 21, y5 + 9, "gold/*.parquet", 0.24);
      SOURCE_ROWS.forEach(([key, src], k) => {
        const y = rowY5(k);
        // Rows the answer cites are lit on top once the answer lands.
        const d = 0.1 + 0.06 * k;
        add(`rp${k}`, ax, y, `r${k + 1}`, 0.2, { d });
        add(`f.${key}`, ax + 4, y, FIELD[key], 0.36, { d });
        add(`v.${key}`, ax + 21, y, VALUE[key], 0.36, { d });
        add(`cd.${key}`, ax + 29, y, src, 0.2, { d });
      });
    } else {
      add("hd.l", qx, y6, "DRAFTED ANSWERS", HEAD);
      add("hd.r", qx + 32, y6, "REVIEW", HEAD);
      add("hd.p", qx, py, "CDP PORTAL", HEAD);
      REVIEW.forEach(([key, code], k) => {
        add(`cd.${key}`, qx, dY(k), code, 0.7, { d: 0.05 * k });
        add(`f.${key}`, qx + 7, dY(k), FIELD[key], 0.45, { d: 0.05 * k });
        add(`v.${key}`, qx + 24, dY(k), VALUE[key], 0.8, { d: 0.05 * k });
        add(`pc${k}`, qx, pY(k), code, 0.45, { d: 0.2 + 0.05 * k });
      });
    }
    return m;
  }

  // ---- Entities: each walks to its new cell and scrambles into its new text -----------------------
  const ents = new Map<string, Ent>();
  let clock = 0;

  function state(e: Ent) {
    const u = clamp((e.t - e.d) / e.dur);
    const k = (e.drop ? easeOut : easeIO)(u);
    return { u, x: Math.round(e.fx + (e.tx - e.fx) * k), y: Math.round(e.fy + (e.ty - e.fy) * k) };
  }
  // When each cell of an entity settles into its new text: left to right, a little ragged.
  const th = (e: Ent, c: number) => 0.1 + 0.5 * (c / Math.max(e.s0.length, e.s1.length, 1)) + 0.25 * hash(e.seed, c);

  function snap(e: Ent) {
    const { u, x, y } = state(e);
    const n = Math.max(e.s0.length, e.s1.length);
    let s = "";
    for (let c = 0; c < n; c++) {
      const c0 = e.v0 ? (e.s0[c] ?? " ") : " ";
      const c1 = e.v1 ? (e.s1[c] ?? " ") : " ";
      s += u >= th(e, c) - 0.11 ? c1 : c0;
    }
    e.a0 = e.v0 && e.v1 ? e.a0 + (e.a1 - e.a0) * u : e.v1 ? e.a1 : e.a0;
    e.h0 = u >= 0.5 ? e.h1 : e.h0;
    e.s0 = s.replace(/\s+$/, "");
    e.v0 = /\S/.test(e.s0);
    e.fx = x;
    e.fy = y;
    e.drop = false;
  }

  function retarget(m: Map<string, Spec>) {
    for (const [id, sp] of m) {
      let e = ents.get(id);
      const had = !!e;
      if (e) snap(e);
      else {
        const fromY = sp.drop !== undefined ? sp.y - sp.drop : sp.y;
        e = { seed: seedOf(id), fx: sp.x, fy: fromY, tx: sp.x, ty: sp.y, s0: "", s1: "", a0: sp.a, a1: sp.a, h0: false, h1: false, v0: false, v1: false, t: 0, d: 0, dur: 1, drop: false, top: id.startsWith("rail"), w: 0 };
        if (sp.drop !== undefined) {
          e.s0 = sp.s;
          e.v0 = true;
          e.drop = true;
        }
        ents.set(id, e);
      }
      e.tx = sp.x;
      e.ty = sp.y;
      e.s1 = sp.s;
      e.v1 = true;
      e.a1 = sp.a;
      e.h1 = !!sp.hot;
      e.w = sp.w ?? 0;
      e.t = 0;
      e.d = sp.d ?? 0.04 + 0.2 * clamp((sp.y - T) / H);
      const dist = Math.max(Math.abs(e.tx - e.fx), Math.abs(e.ty - e.fy));
      e.dur = dist ? clamp(0.3 + dist * 0.018, 0.4, 0.9) : had || !e.v0 ? 0.45 : 0.01;
    }
    for (const [id, e] of ents) {
      if (m.has(id) || !e.v1) continue;
      e.w = 0;
      snap(e);
      e.tx = e.fx;
      e.ty = e.fy;
      e.v1 = false;
      e.t = 0;
      e.d = 0.12 * hash(e.seed, 9);
      e.dur = 0.35;
    }
  }

  function put(g: Grid, x: number, y: number, ch: string, a: number, hot = false, top = false) {
    if (ch === " " || !ch || a < 0.02) return;
    if (x < 1 || x > cols - 2 || y > rows - 2 || y < (top ? 1 : 3)) return;
    g.put(x, y, ch, a, hot);
  }

  const moving = (e: Ent) => e.t > e.d && e.t < e.d + e.dur && (e.fx !== e.tx || e.fy !== e.ty);

  function drawEnt(g: Grid, e: Ent) {
    const { u, x, y } = state(e);
    if (e.w && moving(e)) for (let c = 0; c < e.w; c++) if (x + c >= 1 && x + c <= cols - 2 && y >= 3 && y <= rows - 2) g.put(x + c, y, " ", 0);
    const n = Math.max(e.s0.length, e.s1.length);
    const mix = e.v0 && e.v1 ? e.a0 + (e.a1 - e.a0) * u : e.v1 ? e.a1 : e.a0;
    const tick = Math.floor(clock * 20);
    for (let c = 0; c < n; c++) {
      const c0 = e.v0 ? (e.s0[c] ?? " ") : " ";
      const c1 = e.v1 ? (e.s1[c] ?? " ") : " ";
      if (c0 === c1) {
        put(g, x + c, y, c1, mix, u >= 0.5 ? e.h1 : e.h0, e.top);
        continue;
      }
      const k = th(e, c);
      // A cell flickers through noise just before it settles; briefly when it is only clearing.
      const win = c1 === " " ? 0.06 : 0.12;
      if (u >= k) put(g, x + c, y, c1, e.a1, e.h1, e.top);
      else if (u > 0 && u >= k - win) put(g, x + c, y, NOISE[(hash(e.seed + c, tick) * NOISE.length) | 0], 0.08 + 0.24 * Math.max(e.a0, e.a1), false, e.top);
      else put(g, x + c, y, c0, e.a0, e.h0, e.top);
    }
  }

  // ---- What only one step draws, on top of the entities ------------------------------------------
  // pres below 1 scrambles it out (or in), a cell at a time.
  function writer(g: Grid, pres: number, salt: number) {
    const tick = Math.floor(clock * 20);
    return (x: number, y: number, s: string, a: number, hot = false) => {
      for (let k = 0; k < s.length; k++) {
        const ch = s[k];
        if (ch === " ") continue;
        const X = x + k;
        if (pres >= 1) put(g, X, y, ch, a, hot);
        else {
          const h = hash(X * 13 + salt, y * 29 - salt);
          if (pres > h) put(g, X, y, ch, a, hot);
          else if (pres > h - 0.12) put(g, X, y, NOISE[(hash(X + tick, y) * NOISE.length) | 0], 0.06 + 0.2 * a);
        }
      }
    };
  }

  const cellAt = (id: string) => {
    for (let i = 0; i < 3; i++)
      for (let k = 0; k < files[i].lines.length; k++) for (const p of files[i].lines[k]) if (p[1] === id) return { i, k, dx: p[0], s: p[2] };
    return null;
  };

  function overlay(g: Grid, step: number, phase: number, ts: number, tp: number, pres: number) {
    const w = writer(g, pres, step * 7 + phase + 1);
    if (step === 0) {
      files.forEach((f, i) => {
        const r = ts - landAt[i];
        if (r >= 0) w(up[i].x, up[i].metaY, r < 0.5 ? "received" : f.meta, r < 0.5 ? 0.9 : 0.28, r < 0.5);
      });
      // More files keep arriving, each dropping into the pile of its kind.
      let landed = 0;
      const order = [1, 2, 0];
      for (let j = 0; ; j++) {
        const at = 1.9 + j * 1.35;
        if (at > ts) break;
        const i = order[j % 3];
        const x = up[i].x + Math.floor(cw / 2) - 1;
        const stop = up[i].y - 1;
        const y = 3 + Math.floor((ts - at) / 0.045);
        if (y <= stop) {
          w(x, y, files[i].kind, 0.5);
          if (y - 1 >= 3) w(x + 1, y - 1, ":", 0.18);
          if (y - 2 >= 3) w(x + 1, y - 2, ".", 0.1);
        } else {
          landed++;
          if (y - stop < 7) w(up[i].x, up[i].y, files[i].name, 0.95, true);
        }
      }
      w(gx0, capY, `inbox  ${3 + landed} files`, 0.45);
      const nt = "no template";
      w(gx0 + 3 * cw + 2 * gap - nt.length, capY, nt, 0.28);
    } else if (step === 1) {
      if (bx + 19 < rx - 2) w(bx + 10, y2, "read-only", 0.24);
      const order = [1, 0, 2];
      figures.forEach((f, k) => {
        const s0 = f.from;
        const e0 = rx - 2;
        const grow = clamp((ts - 0.7 - 0.1 * k) / 0.35);
        const n = Math.ceil(grow * (e0 - s0 + 1));
        for (let c = 0; c < n; c++) if ((e0 - c - s0) % 2 === 0) w(e0 - c, f.y, ".", 0.2);
      });
      if (ts >= 1) {
        const idx = Math.floor((ts - 1) / 3) % 3;
        const lt = (ts - 1) % 3;
        const f = figures[order[idx]];
        const s0 = f.from;
        const e0 = rx - 2;
        const run = clamp(lt / 0.5);
        const head = e0 - Math.round(run * (e0 - s0));
        for (let x = head; x <= e0; x++) w(x, f.y, "-", 0.5);
        if (run < 1) w(head, f.y, "<", 1, true);
        else if (lt < 2.8) {
          const c = cellAt(`v.${f.id.slice(4)}`);
          if (c) w(f.x, f.y, c.s, 1, true);
          w(rx, f.y, f.s, 0.95);
        }
      }
    } else if (step === 2) {
      let n = 0;
      const total = MAPS[phase].reduce((s, gr) => s + gr.src.length, 0);
      const hi = tp > 1.7 ? Math.floor((tp - 1.7) / 0.9) % total : -1;
      MAPS[phase].forEach((grp, gi) => {
        const ty = sy3 + grpY[gi];
        grp.src.forEach(([, s, , score], k) => {
          const y = sy3 + srcY[n];
          const path: [number, number, string][] = [];
          const pair = grp.src.length > 1;
          for (let x = x0; x < (pair ? jx : fx - 1); x++) path.push([x, y, "-"]);
          if (pair) {
            path.push([jx, y, k === 0 ? "." : "'"]);
            const dir = ty > y ? 1 : -1;
            for (let yy = y + dir; yy !== ty; yy += dir) path.push([jx, yy, "|"]);
            path.push([jx, ty, "+"]);
            for (let x = jx + 1; x < fx - 1; x++) path.push([x, ty, "-"]);
          }
          const start = 0.35 + n * 0.11;
          const prog = clamp((tp - start) / 0.35);
          const lit = n === hi;
          // A lit mapping re-scores: its digits roll for a moment, then settle.
          const roll = lit && (tp - 1.7) % 0.9 < 0.3;
          const shown = roll ? score.slice(0, 4) + String(Math.floor(hash(n, Math.floor(clock * 24)) * 30) + 70) : score;
          if (prog > 0) w(methX, y, shown, lit ? 1 : 0.3, lit);
          const cnt = Math.ceil(prog * path.length);
          for (let c = 0; c < cnt; c++) w(path[c][0], path[c][1], path[c][2], lit ? 0.85 : 0.22, lit);
          if (lit) {
            w(sx, y, s, 1);
            w(fx, ty, FIELD[grp.f], 1);
          }
          n++;
        });
      });
    } else if (step === 3) {
      const fw = FRAMEWORKS[phase];
      const hi = tp > 1.8 ? Math.floor((tp - 1.8) / 0.8) % fw.rows.length : -1;
      fw.rows.forEach(([key], k) => {
        const y = gold[phase].rowOf(key);
        const item = fw.items.find((it) => it[2] === key);
        const code = item?.[0] ?? "";
        const s0 = valX + 8;
        const e0 = codeX - 2;
        const grow = clamp((tp - 0.65 - 0.08 * k) / 0.3);
        const n = Math.ceil(grow * (e0 - s0 + 1));
        if (k === hi) {
          for (let x = s0; x <= e0; x++) w(x, y, "-", 0.5);
          w(e0, y, ">", 1, true);
          w(codeX, y, code, 1);
          if (labels && item) w(codeX + 8, y, item[1], 0.8);
        } else for (let c = 0; c < n; c++) if ((c & 1) === 0) w(s0 + c, y, ".", 0.2);
      });
    } else if (step === 4) {
      const q = QUESTIONS[phase];
      // Typed from 0.3 s, then the query, then the answer, by about 1.4 s.
      const tq = 0.3 + q.q.length * 0.022;
      const typed = clamp(Math.floor((tp - 0.3) / 0.022), 0, q.q.length);
      w(ax, y5, ">", 0.5);
      w(ax + 2, y5, q.q.slice(0, typed), 0.92);
      if (typed < q.q.length || (tp < tq + 0.35 && Math.floor(tp * 5) % 2 === 0)) w(ax + 2 + typed, y5, "_", 1, true);
      q.query.forEach((line, i) => {
        const p = clamp((tp - tq - 0.05 - 0.06 * i) / 0.2);
        if (p > 0) writer(g, Math.min(pres, p), 40 + i)(ax + 2, y5 + 1 + i, line, 0.42);
      });
      const pv = clamp((tp - tq - 0.2) / 0.2);
      if (pv > 0) writer(g, Math.min(pres, pv), 50)(ax + 2, y5 + 4, q.via, 0.24);
      const pa = clamp((tp - tq - 0.3) / 0.25);
      if (pa > 0) {
        const wa = writer(g, Math.min(pres, pa), 60 + phase);
        wa(ax, y5 + 6, `= ${q.ans}`, 1, true);
        wa(ax + 2, y5 + 7, `cites ${q.cites.map((c) => `r${c + 1}`).join(", ")}`, 0.45);
        q.cites.forEach((c) => {
          const [key, src] = SOURCE_ROWS[c];
          const y = rowY5(c);
          wa(ax, y, `r${c + 1}`, 0.7);
          wa(ax + 4, y, FIELD[key], 0.95);
          wa(ax + 21, y, VALUE[key], 0.95);
          wa(ax + 29, y, src, 0.6);
          wa(ax + 38, y, "<", 1, true);
        });
      }
    } else if (step === 5) {
      const per = 1.3;
      const full = 3 * per + 1.8;
      const lt = ts - 0.7;
      // Held still, every answer is approved, entered and checked.
      const l = reduced ? 3 * per + 0.5 : lt < 0 ? -1 : lt % full;
      const fade = l < 0 ? 1 : clamp((full - l) / 0.35);
      const wr = writer(g, Math.min(pres, fade), 70 + Math.floor(Math.max(0, lt) / full));
      REVIEW.forEach(([key], k) => {
        const local = l < 0 ? -1 : l - k * per;
        const val = VALUE[key];
        const ok = local >= 0;
        const rw = ok ? wr : w;
        rw(qx + 32, dY(k), ok ? "[x]" : "[ ]", ok ? 0.8 : 0.3, ok && local < 0.3);
        if (W >= 52) rw(qx + 36, dY(k), ok ? "approved" : "pending", ok ? 0.4 : 0.2);
        w(qx + 7, pY(k), "[", 0.22);
        w(qx + 20, pY(k), "]", 0.22);
        if (local >= 0.1 && local < 0.4) {
          // The approved value drops out of its row first, then crosses to the portal.
          const f = (local - 0.1) / 0.3;
          const fxp = clamp((f - 0.25) / 0.75);
          wr(Math.round(qx + 24 - 15 * fxp), Math.max(dY(k) + 1, Math.round(dY(k) + (pY(k) - dY(k)) * f)), val, 0.9);
        } else if (local >= 0.4) {
          const n = Math.min(val.length, Math.floor((local - 0.4) / 0.06));
          wr(qx + 9, pY(k), val.slice(0, n), local >= 1 ? 0.8 : 0.95);
          if (n < val.length) wr(qx + 9 + n, pY(k), "_", 1, true);
          else if (local < 1) wr(qx + 22, pY(k), "..", 0.4);
          else wr(qx + 22, pY(k), "ok", local < 1.3 ? 1 : 0.6, local < 1.3);
        }
      });
      const agent = W >= 52 ? "computer-use agent" : "agent";
      w(R - m6 - agent.length + 1, py, agent, 0.3);
      const c = ts % 24;
      const n = reduced ? 3345 : Math.min(3345, 2980 + Math.floor(c * 24));
      const done = n >= 3345;
      w(qx, cntY, "checked", 0.3);
      w(qx + 8, cntY, `${fmt(n)} / 3,345`, done ? 0.9 : 0.55);
      const mt = "matched 96%";
      w(R - m6 - mt.length + 1, cntY, mt, done ? 1 : 0.6, done);
    }
  }

  // ---- The story's clock ----------------------------------------------------------------------------
  let at = -1;
  let phase = 0;
  let ts = 0;
  let tp = 0;
  let prev: { at: number; phase: number; ts: number; tp: number } | null = null;
  let left = 9;
  let drawn = false;
  let warm = 0;

  function apply(m: Map<string, Spec>) {
    retarget(m);
    if (at === 0 && phase === 0) files.forEach((_, i) => {
      const e = ents.get(`n${i}`);
      landAt[i] = e ? e.d + e.dur : 0;
    });
  }

  function advance(dt: number) {
    clock += dt;
    ts += dt;
    tp += dt;
    left += dt;
    for (const [id, e] of ents) {
      e.t += dt;
      if (!e.v1 && e.t >= e.d + e.dur) ents.delete(id);
    }
    const per = PERIOD[at];
    if (per && tp >= per) {
      prev = { at, phase, ts, tp };
      left = 0;
      phase = (phase + 1) % PHASES[at];
      tp = 0;
      apply(layout(at, phase));
    }
  }

  return {
    stage(n) {
      n = clamp(Math.round(n), 0, STEPS.length - 1);
      if (n === at) return;
      if (at >= 0) {
        prev = { at, phase, ts, tp };
        left = 0;
      }
      at = n;
      phase = 0;
      ts = 0;
      tp = 0;
      apply(layout(at, 0));
      // Held still, each step shows the picture after its key action.
      if (reduced) {
        for (let k = 0; k < 90; k++) advance(1 / 30);
        left = 9;
      }
    },
    step(dt) {
      if (at < 0) return;
      // Skip most of the warm-up so the sheet opens on the files dropping in.
      if (!drawn && !reduced) {
        if (warm >= 0.25) return;
        warm += dt;
      }
      advance(dt);
    },
    draw(g) {
      drawn = true;
      g.put(2, 1, "ENGINE", 0.5);
      // What is still sits underneath; what is moving passes over it.
      for (const e of ents.values()) if (!moving(e)) drawEnt(g, e);
      for (const e of ents.values()) if (moving(e)) drawEnt(g, e);
      if (prev && left < 0.4) overlay(g, prev.at, prev.phase, prev.ts, prev.tp, 1 - left / 0.4);
      // A new step's overlay scrambles in once the entities have started moving.
      if (at >= 0) overlay(g, at, phase, ts, tp, clamp((ts - 0.2) / 0.35));
    },
  };
}
