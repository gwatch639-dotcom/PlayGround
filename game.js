(() => {
  'use strict';

  /* ============================================================
     Stadtleben — ein echtes Leben. Keine Waffen. Nur Alltag.
     Vanilla Canvas 2D · Touch / Tastatur / Gyroskop
     ============================================================ */

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  const TAU = Math.PI * 2;
  const angleLerp = (a, b, t) => {
    let d = ((b - a + Math.PI * 3) % TAU) - Math.PI;
    return a + d * t;
  };
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const rng = mulberry32(20261030);
  const pick = arr => arr[Math.floor(rng() * arr.length)];
  const pickR = (arr, r) => arr[Math.floor(r() * arr.length)];

  function rr(c, x, y, w, h, r = 6) {
    const rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    c.beginPath();
    c.moveTo(x + rad, y);
    c.arcTo(x + w, y, x + w, y + h, rad);
    c.arcTo(x + w, y + h, x, y + h, rad);
    c.arcTo(x, y + h, x, y, rad);
    c.arcTo(x, y, x + w, y, rad);
    c.closePath();
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = clamp((n >> 16) + amt, 0, 255);
    const g = clamp(((n >> 8) & 255) + amt, 0, 255);
    const b = clamp((n & 255) + amt, 0, 255);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  const fmtEuro = n => (n < 0 ? '−€ ' : '€ ') + Math.abs(Math.round(n));
  const pad2 = n => String(n).padStart(2, '0');
  const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const DAYS_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  const dayIndex = d => (d - 1) % 7;
  const clockString = mins => { const m = ((mins % 1440) + 1440) % 1440; return pad2(Math.floor(m / 60)) + ':' + pad2(Math.floor(m % 60)); };
  const fmtDistance = px => { const m = Math.max(1, Math.round(px * 0.62)); return m >= 1000 ? (m / 1000).toFixed(1).replace('.', ',') + ' km' : m + ' m'; };

  /* ------------------------------- DOM ------------------------------- */
  const dom = {
    canvas: $('#game'), ctx: $('#game').getContext('2d'),
    hud: $('#hud'), money: $('#money'), dateText: $('#dateText'), clockText: $('#clockText'), weatherText: $('#weatherText'),
    barHunger: $('#barHunger'), barEnergy: $('#barEnergy'), barMood: $('#barMood'),
    objective: $('#objectiveCard'), objKicker: $('#objKicker'), objTitle: $('#objTitle'), objSub: $('#objSub'), objDist: $('#objDist'), objIcon: $('#objIcon use'),
    avatar: $('#avatar'),
    phoneBtn: $('#phoneBtn'), phoneBadge: $('#phoneBadge'), tiltPill: $('#tiltPill'),
    joystick: $('#joystick'), joyThumb: $('#joyThumb'),
    speedo: $('#speedo'), speedVal: $('#speedVal'),
    actionBtn: $('#actionBtn'), actionLabel: $('#actionLabel'), actionIcon: $('#actionIcon use'),
    contextHint: $('#contextHint'), toasts: $('#toasts'), controlsHint: $('#controlsHint'), fade: $('#fade'),
    start: $('#startScreen'), startBtn: $('#startBtn'), startBtnText: $('#startBtnText'), startLive: $('#startLiveText'), saveInfo: $('#saveInfo'), resetLink: $('#resetLink'),
    tiltStart: $('#tiltToggleStart'), startSwitch: $('#tiltToggleStart .switch'),
    phoneOverlay: $('#phoneOverlay'), phoneTitle: $('#phoneTitle'), phoneEyebrow: $('#phoneEyebrow'), phoneClock: $('#phoneClock'),
    phoneSettingsBtn: $('#phoneSettingsBtn'), phoneCloseBtn: $('#phoneCloseBtn'), phoneBody: $('#phoneBody'),
    phoneWeather: $('#phoneWeather'), phoneSunset: $('#phoneSunset'),
    phoneHunger: $('#phoneHunger'), phoneEnergy: $('#phoneEnergy'), phoneMood: $('#phoneMood'), phoneDayMood: $('#phoneDayMood'),
    messageList: $('#messageList'), messageCount: $('#messageCount'), activeJob: $('#activeJob'), jobList: $('#jobList'),
    phoneMap: $('#phoneMap'), mapCaption: $('#mapCaption'),
    bankBalance: $('#bankBalance'), bankIn: $('#bankIn'), bankList: $('#bankList'),
    setTilt: $('#setTilt'), setSound: $('#setSound'), calibrateBtn: $('#calibrateBtn'), resetPhone: $('#resetPhone'),
    sheetOverlay: $('#sheetOverlay'), sheetKicker: $('#sheetKicker'), sheetTitle: $('#sheetTitle'), sheetDesc: $('#sheetDesc'), sheetMeta: $('#sheetMeta'), sheetOptions: $('#sheetOptions'), sheetFoot: $('#sheetFoot'), sheetClose: $('#sheetClose'),
    shiftOverlay: $('#shiftOverlay'), shiftClose: $('#shiftClose'), serveBtn: $('#serveBtn'), shiftNeedle: $('#shiftNeedle'), shiftHits: $('#shiftHits'), shiftFeedback: $('#shiftFeedback'), shiftDots: $('#shiftDots'), shiftCup: $('#shiftCup'),
  };

  /* ----------------------------- constants ---------------------------- */
  const MARGIN = 80, BLOCK = 340, ROAD = 120, COLS = 6, ROWS = 5;
  const WORLD_W = MARGIN * 2 + COLS * BLOCK + (COLS - 1) * ROAD;
  const WORLD_H = MARGIN * 2 + ROWS * BLOCK + (ROWS - 1) * ROAD;
  const blockX = c => MARGIN + c * (BLOCK + ROAD);
  const blockY = r => MARGIN + r * (BLOCK + ROAD);
  const roadX = c => MARGIN + c * (BLOCK + ROAD) + BLOCK + ROAD / 2;
  const roadY = r => MARGIN + r * (BLOCK + ROAD) + BLOCK + ROAD / 2;
  const INSET = 32;
  const TIME_SCALE = 2; // 1 real second = 2 game minutes

  const BLOCK_DEFS = {
    '0,0': { name: 'Haus Hafenblick', kind: 'home', wall: '#c27a5b', roof: '#8c4e3a', trim: '#f0e4ce', style: 'gable', shape: 'A', poi: 'home' },
    '1,0': { name: 'Kaffee Kollektiv', kind: 'cafe', wall: '#e4d6bb', roof: '#4f6e5b', trim: '#f9f2e4', style: 'flat', shape: 'A', poi: 'cafe', accent: '#d98a55' },
    '2,0': { name: 'Frischmarkt', kind: 'market', wall: '#d9c79f', roof: '#b6573d', trim: '#f8ecd7', style: 'flat', shape: 'A', poi: 'market', accent: '#e89a55' },
    '3,0': { name: 'Kontor 24', kind: 'office', wall: '#b7c4c2', roof: '#53696c', trim: '#eef0e9', style: 'flat', shape: 'C' },
    '4,0': { name: 'Lindenhof', kind: 'apartment', wall: '#c9a17e', roof: '#7e5a47', trim: '#f2e7d5', style: 'gable', shape: 'A' },
    '5,0': { name: 'Körnerwerk', kind: 'bakery', wall: '#e8d7b8', roof: '#a57147', trim: '#fbf3e4', style: 'gable', shape: 'B', poi: 'bakery', accent: '#b7804d' },
    '0,1': { name: 'Apotheke am Markt', kind: 'pharmacy', wall: '#e8e4d7', roof: '#4f7a66', trim: '#fbf8ee', style: 'flat', shape: 'A', poi: 'pharmacy', accent: '#57846e' },
    '1,1': { name: 'Seitenweise', kind: 'bookshop', wall: '#c6aaa3', roof: '#6b4650', trim: '#f5e8df', style: 'gable', shape: 'B', poi: 'bookshop', accent: '#8b5a63' },
    '2,1': { name: 'Stadtpark', kind: 'park' },
    '3,1': { name: 'Galerie Nord', kind: 'gallery', wall: '#e6e2d8', roof: '#6c7074', trim: '#fbfaf3', style: 'flat', shape: 'C', poi: 'gallery', accent: '#7d8388' },
    '4,1': { name: 'Kraftwerk', kind: 'gym', wall: '#b8b3a9', roof: '#414642', trim: '#ece8de', style: 'flat', shape: 'A', poi: 'gym', accent: '#e26a45' },
    '5,1': { name: 'Casa Lora', kind: 'apartment', wall: '#d5baa1', roof: '#7a5647', trim: '#f6ead9', style: 'gable', shape: 'A' },
    '0,2': { name: 'Kurier Hub', kind: 'courier', wall: '#d2b16a', roof: '#646964', trim: '#f4ead2', style: 'flat', shape: 'A', poi: 'courier', accent: '#e8b155' },
    '1,2': { name: 'Taxi 24', kind: 'taxi', wall: '#e3cf8e', roof: '#3f4a47', trim: '#fbf4d9', style: 'flat', shape: 'A', poi: 'taxi', accent: '#e8b155' },
    '2,2': { name: 'Brunnenplatz', kind: 'plaza' },
    '3,2': { name: 'Lichtspiel', kind: 'cinema', wall: '#b7867b', roof: '#5a3033', trim: '#f0dfd6', style: 'flat', shape: 'A', poi: 'cinema', accent: '#d7553e' },
    '4,2': { name: 'Tonraum', kind: 'music', wall: '#b9a4c4', roof: '#594b6d', trim: '#f1e9f4', style: 'gable', shape: 'B', poi: 'music', accent: '#8d75a4' },
    '5,2': { name: 'Hotel Morgen', kind: 'hotel', wall: '#e5d4b2', roof: '#795c47', trim: '#fbf3e2', style: 'flat', shape: 'A', poi: 'hotel', accent: '#b58a54' },
    '0,3': { name: 'Stadtbad', kind: 'pool', wall: '#a8c8c6', roof: '#3e777c', trim: '#eaf5f1', style: 'flat', shape: 'A', poi: 'pool', accent: '#5aa9ad' },
    '1,3': { name: 'Bistro Klein', kind: 'bistro', wall: '#cf8e69', roof: '#7d4132', trim: '#f7e7d8', style: 'gable', shape: 'B', poi: 'bistro', accent: '#c46b49' },
    '2,3': { name: 'Studio West', kind: 'studio', wall: '#c1c6bd', roof: '#56635e', trim: '#f0f1ea', style: 'flat', shape: 'C' },
    '3,3': { name: 'Lindenplatz', kind: 'park-small' },
    '4,3': { name: 'Wohnhof 9', kind: 'apartment', wall: '#d2b69e', roof: '#7b5648', trim: '#f6eadb', style: 'gable', shape: 'A' },
    '5,3': { name: 'Werkstatt Süd', kind: 'workshop', wall: '#b99a79', roof: '#6a5b4a', trim: '#f0e5d6', style: 'flat', shape: 'B' },
    '0,4': { name: 'Rathaus', kind: 'townhall', wall: '#d9c8a5', roof: '#8c6b4c', trim: '#fbf2df', style: 'flat', shape: 'A', poi: 'townhall', accent: '#b89456' },
    '1,4': { name: 'Markthalle', kind: 'markthalle', wall: '#c9c0a2', roof: '#526a4e', trim: '#f5efdc', style: 'flat', shape: 'A', poi: 'markthalle', accent: '#759168' },
    '2,4': { name: 'Hafenloft', kind: 'apartment', wall: '#c0a58e', roof: '#6e4c3f', trim: '#f4e8d9', style: 'gable', shape: 'A' },
    '3,4': { name: 'Gärtnerei', kind: 'garden', wall: '#cfe0d0', roof: '#4f7a5f', trim: '#f1f8ef', style: 'glass', shape: 'B', poi: 'garden', accent: '#6e9b75' },
    '4,4': { name: 'Kleine Welt', kind: 'daycare', wall: '#e4c9b8', roof: '#b26058', trim: '#fbf0e7', style: 'gable', shape: 'A' },
    '5,4': { name: 'Radio 88', kind: 'radio', wall: '#b9c4d0', roof: '#4f5d75', trim: '#eef3f8', style: 'flat', shape: 'A' },
  };

  const SPRITE = {
    home: 'home', cafe: 'coffee', market: 'cart', bakery: 'food', pharmacy: 'info', bookshop: 'chat',
    gym: 'dumbbell', courier: 'package', taxi: 'car', cinema: 'film', hotel: 'home', pool: 'spark',
    bistro: 'food', markthalle: 'cart', garden: 'spark', townhall: 'info', gallery: 'spark', music: 'sound',
    bench: 'users', fountain: 'spark', foodtruck: 'food', nora: 'users',
  };
  const VERBS = {
    home: 'Nach Hause', cafe: 'Bestellen', market: 'Einkaufen', bakery: 'Kaufen', pharmacy: 'Apotheke',
    bookshop: 'Stöbern', gym: 'Training', courier: 'Kurier', taxi: 'Taxi', cinema: 'Kino', hotel: 'Zimmer',
    pool: 'Schwimmen', bistro: 'Essen', markthalle: 'Markt', garden: 'Garten', townhall: 'Rathaus',
    gallery: 'Galerie', music: 'Musik', bench: 'Pause', fountain: 'Wunsch', foodtruck: 'Essen',
  };

  /* ------------------------------- state ------------------------------ */
  const defaultState = () => ({
    phase: 'intro',
    time: 8 * 60 + 10,
    day: 1,
    money: 180,
    hunger: 78,
    energy: 84,
    mood: 72,
    outfit: 0,
    tutorial: 0,
    nora: 'new',
    job: null,
    transactions: [],
    stats: { jobs: 0, deliveries: 0, rides: 0, coffees: 0, shifts: 0, meets: 0, earned: 0 },
    rentDay: 1,
    wishDay: 0,
    difficulty: 1,
    player: { x: 250, y: 470, angle: Math.PI / 2, walk: 0, car: null },
    phoneOpen: false,
    sheetOpen: false,
    shift: null,
    sound: true,
    tilt: false,
    startTime: 17 * 60 + 20,
    introT: 0,
    lowWarn: { hunger: false, energy: false },
    phonePage: 'home',
    timeAcc: 0, saveAcc: 0, stepAcc: 0, animTime: 0,
  });
  let state = defaultState();
  let pendingSave = null;
  let hasSave = false;
  let resetting = false;

  const world = {
    blocks: [], buildings: [], colliders: [], circleColliders: [], ellipseColliders: [],
    pois: [], deliverySpots: [], cars: [], npcCars: [], peds: [], trees: [], lamps: [],
    park: null, plaza: null, smallPark: null, staticCanvas: null,
  };

  const cam = { x: 1170, y: 1170, zoom: 1, viewW: 0, viewH: 0, shake: 0 };
  const viewport = { w: 0, h: 0, dpr: 1 };
  const input = { x: 0, y: 0, active: false, keys: new Set(), joystick: false, sprint: false };
  const tilt = { enabled: false, listening: false, permitted: false, base: null, raw: { x: 0, y: 0 }, vec: { x: 0, y: 0 }, last: 0 };
  const audio = { ctx: null, master: null, engine: null, engineGain: null, ambient: null, ready: false };

  const OUTFITS = ['#e0674c', '#4f7f69', '#d9a849', '#6d7fa8', '#a06686', '#3f6d75'];
  const OUTFIT_NAMES = ['Ziegelrot', 'Waldgrün', 'Senfgelb', 'Nachtblau', 'Pflaume', 'Petrol'];
  const SKIN = ['#e3b090', '#c98d69', '#9a6348', '#6d442f', '#f0c7a5', '#b97b55'];
  const PED_CLOTHES = ['#c9614a', '#597c68', '#d3a24b', '#67789b', '#9c657c', '#4f7b83', '#846b58', '#b9b09d', '#3e4e45'];

  /* ============================ world build =========================== */
  function createBuilding(def, c, r) {
    const x0 = blockX(c) + INSET;
    const y0 = blockY(r) + INSET;
    const full = BLOCK - INSET * 2;
    const b = {
      id: `${c},${r}`, c, r, def, name: def.name, kind: def.kind,
      wall: def.wall || '#c7bfae', roof: def.roof || '#6b6f68', trim: def.trim || '#f2ebdd',
      accent: def.accent || '#e8b155', style: def.style || 'flat', shape: def.shape || 'A',
      x: x0, y: y0, w: full, h: full, extras: [], yard: null, door: null,
    };
    if (def.shape === 'B') {
      b.h = 204;
      b.yard = { x: x0, y: y0 + 204, w: full, h: full - 204 };
      b.extras.push({ x: x0 + full - 68, y: y0 + 214, w: 56, h: 48, kind: 'shed' });
    } else if (def.shape === 'C') {
      b.w = 130;
      b.extras.push({ x: x0 + 146, y: y0, w: 130, h: full, kind: 'secondary' });
    }
    b.door = { x: b.x + b.w / 2, y: b.y + b.h + 17 };
    b.collide = [{ x: b.x, y: b.y, w: b.w, h: b.h }];
    b.extras.forEach(e => { if (e.kind === 'secondary') b.collide.push({ x: e.x, y: e.y, w: e.w, h: e.h }); });
    return b;
  }

  function addPoi(poi) {
    const sprite = poi.sprite || SPRITE[poi.kind] || 'pin';
    const verb = poi.verb || VERBS[poi.kind] || 'Ansehen';
    world.pois.push(Object.assign({ radius: 82, sprite, verb }, poi));
  }

  function buildWorld() {
    world.blocks.length = 0; world.buildings.length = 0; world.colliders.length = 0;
    world.circleColliders.length = 0; world.ellipseColliders.length = 0;
    world.pois.length = 0; world.deliverySpots.length = 0; world.cars.length = 0;
    world.npcCars.length = 0; world.peds.length = 0; world.trees.length = 0; world.lamps.length = 0;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const def = BLOCK_DEFS[`${c},${r}`];
        const block = { c, r, x: blockX(c), y: blockY(r), def };
        world.blocks.push(block);
        if (def.kind === 'park') { world.park = block; continue; }
        if (def.kind === 'plaza') { world.plaza = block; continue; }
        if (def.kind === 'park-small') { world.smallPark = block; continue; }
        const b = createBuilding(def, c, r);
        block.building = b;
        world.buildings.push(b);
        b.collide.forEach(rect => world.colliders.push(Object.assign({ building: b }, rect)));
        if (def.poi) {
          addPoi({
            id: `${c},${r}-${def.poi}`, kind: def.poi, name: def.name,
            x: b.door.x, y: b.door.y, building: b, poi: true,
          });
        }
      }
    }

    // park pond + benches
    const park = world.park;
    world.pond = { x: park.x + 170, y: park.y + 150, rx: 76, ry: 47 };
    world.ellipseColliders.push({ x: world.pond.x, y: world.pond.y, rx: world.pond.rx + 7, ry: world.pond.ry + 7 });
    addPoi({ id: 'park-bench', kind: 'bench', name: 'Parkbank', x: park.x + 92, y: park.y + 300, verb: 'Hinsetzen', sprite: 'users' });
    addPoi({ id: 'park-bench-2', kind: 'bench', name: 'Bank am Teich', x: park.x + 278, y: park.y + 210, verb: 'Hinsetzen', sprite: 'users' });

    // plaza fountain + food truck
    const plaza = world.plaza;
    world.fountain = { x: plaza.x + 170, y: plaza.y + 170, r: 43 };
    world.circleColliders.push({ x: world.fountain.x, y: world.fountain.y, r: world.fountain.r + 4 });
    addPoi({ id: 'fountain', kind: 'fountain', name: 'Brunnen', x: plaza.x + 170, y: plaza.y + 236, verb: 'Wunsch', sprite: 'spark' });
    world.truck = { x: plaza.x + 236, y: plaza.y + 248, w: 80, h: 38, angle: -0.06 };
    world.colliders.push({ x: world.truck.x, y: world.truck.y, w: world.truck.w, h: world.truck.h, truck: true });
    addPoi({ id: 'foodtruck', kind: 'foodtruck', name: 'Bude 7', x: plaza.x + 276, y: plaza.y + 296, verb: 'Essen', sprite: 'food' });

    // small park bench
    const sp = world.smallPark;
    addPoi({ id: 'linden-bench', kind: 'bench', name: 'Lindenbank', x: sp.x + 170, y: sp.y + 170, verb: 'Hinsetzen', sprite: 'users' });

    // delivery addresses: every real front door except service hubs
    world.pois.forEach(p => {
      if (p.building && !['courier', 'taxi'].includes(p.kind)) {
        world.deliverySpots.push({ x: p.x, y: p.y, name: p.name, kind: p.kind });
      }
    });

    buildCars();
    buildTrees();
    buildLamps();
    buildPeds();
    buildNpcCars();
    buildStaticCanvas();
  }

  function buildCars() {
    world.cars = [
      { id: 'red', name: 'Roter Flitzer', type: 'compact', x: 444, y: 302, angle: -Math.PI / 2, speed: 0, color: '#b8523f', trim: '#e7dcc7', driver: false },
      { id: 'taxi', name: 'Taxi 24', type: 'taxi', x: 690, y: 1374, angle: 0, speed: 0, color: '#e7b84d', trim: '#26312e', driver: false },
      { id: 'van', name: 'Kurier Van', type: 'van', x: 516, y: 1162, angle: Math.PI / 2, speed: 0, color: '#d8d3c3', trim: '#6f7a70', driver: false },
      { id: 'green', name: 'Grüner Kombi', type: 'wagon', x: 900, y: 712, angle: -Math.PI / 2, speed: 0, color: '#587969', trim: '#e8dfcc', driver: false },
    ];
  }

  function buildTrees() {
    const addTree = (x, y, r, type) => {
      const tone = rng();
      world.trees.push({ x, y, r, type, tone, sway: rng() * TAU, flowers: rng() < .18 });
    };
    for (const block of world.blocks) {
      if (block.def.kind === 'park' || block.def.kind === 'plaza' || block.def.kind === 'park-small') continue;
      const doorX = block.building ? block.building.door.x : -999;
      const candidates = [block.x + 48, block.x + 112, block.x + 228, block.x + 292];
      candidates.forEach((x, i) => {
        if (Math.abs(x - doorX) < 58) return;
        if (rng() < .45) return;
        addTree(x, block.y + BLOCK - 18 - rng() * 4, 18 + rng() * 7, rng() < .16 ? 'cypress' : 'round');
      });
      if (block.building && block.building.yard && rng() < .9) {
        addTree(block.x + 58 + rng() * 160, block.y + 258, 15 + rng() * 6, 'round');
      }
    }
    const park = world.park;
    for (let i = 0; i < 14; i++) {
      let x, y, tries = 0;
      do {
        x = park.x + 40 + rng() * (BLOCK - 80);
        y = park.y + 40 + rng() * (BLOCK - 80);
        tries++;
      } while (tries < 30 && dist(x, y, world.pond.x, world.pond.y) < 108);
      addTree(x, y, 18 + rng() * 12, rng() < .2 ? 'cypress' : 'round');
    }
    const sp = world.smallPark;
    for (let i = 0; i < 7; i++) addTree(sp.x + 50 + rng() * 240, sp.y + 50 + rng() * 240, 17 + rng() * 9, rng() < .2 ? 'cypress' : 'round');
    const plaza = world.plaza;
    for (let i = 0; i < 4; i++) addTree(plaza.x + 45 + (i % 2) * 250, plaza.y + 45 + Math.floor(i / 2) * 250, 14, 'planter');
  }

  function buildLamps() {
    for (const block of world.blocks) {
      world.lamps.push({ x: block.x + 13, y: block.y + BLOCK - 13, seed: rng() });
      world.lamps.push({ x: block.x + BLOCK - 13, y: block.y + 13, seed: rng() });
    }
    const plaza = world.plaza;
    world.lamps.push({ x: plaza.x + 34, y: plaza.y + 34, seed: .3 });
    world.lamps.push({ x: plaza.x + BLOCK - 34, y: plaza.y + BLOCK - 34, seed: .7 });
  }

  function buildPeds() {
    const phrases = ['Schöner Tag, oder?', 'Der Kaffee da vorne ist stark.', 'Im Park ist es heute ruhig.', 'Hast du die Miete schon gezahlt?', 'Ich nehme heute das Rad.', 'Die Stadt wird immer voller.', 'Am Brunnen gibt es freies WLAN.', 'Nur keinen Stress.'];
    world.blocks.forEach((block, bi) => {
      if (block.def.kind === 'park' || block.def.kind === 'park-small') return;
      const count = block.def.kind === 'plaza' ? 4 : 2 + (rng() < .5 ? 1 : 0);
      for (let i = 0; i < count; i++) {
        const inset = 14 + rng() * 8;
        world.peds.push({
          block, inset, t: rng() * (BLOCK * 4), speed: 16 + rng() * 14,
          dir: rng() < .5 ? 1 : -1, color: pick(PED_CLOTHES), skin: pick(SKIN),
          bag: rng() < .35, umbrella: false, phase: rng() * TAU,
          x: block.x, y: block.y, angle: 0, idle: block.def.kind === 'plaza' && rng() < .45,
          phrase: pick(phrases), bubble: 0,
        });
      }
    });
    // park walkers & sitters
    for (let i = 0; i < 5; i++) {
      const park = world.park;
      world.peds.push({
        block: park, inset: 18 + rng() * 7, t: rng() * (BLOCK * 4), speed: 12 + rng() * 10,
        dir: rng() < .5 ? 1 : -1, color: pick(PED_CLOTHES), skin: pick(SKIN), bag: rng() < .3,
        phase: rng() * TAU, x: park.x, y: park.y, angle: 0, idle: false, phrase: pick(phrases), bubble: 0,
      });
    }
    for (let i = 0; i < 3; i++) {
      world.peds.push({
        block: world.park, inset: 14, t: 0, speed: 0, dir: 1, color: pick(PED_CLOTHES), skin: pick(SKIN),
        bag: false, phase: rng() * TAU, x: world.park.x + 88 + rng() * 170, y: world.park.y + 250 + rng() * 50,
        angle: pick([0, Math.PI]), idle: true, phrase: pick(phrases), bubble: 0,
      });
    }
  }

  function makeLoop(x1, x2, y1, y2, clockwise) {
    const off = 25;
    let pts;
    if (clockwise) {
      pts = [
        { x: x1 + off, y: y1 + off }, { x: x2 - off, y: y1 + off },
        { x: x2 - off, y: y2 - off }, { x: x1 + off, y: y2 - off },
      ];
    } else {
      pts = [
        { x: x1 + off, y: y2 - off }, { x: x2 - off, y: y2 - off },
        { x: x2 - off, y: y1 + off }, { x: x1 + off, y: y1 + off },
      ];
    }
    const segs = [];
    let total = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const len = dist(a.x, a.y, b.x, b.y);
      segs.push({ a, b, len, start: total, angle: Math.atan2(b.y - a.y, b.x - a.x) });
      total += len;
    }
    return { points: pts, segs, len: total };
  }

  function pointOnLoop(loop, d) {
    d = ((d % loop.len) + loop.len) % loop.len;
    for (const s of loop.segs) {
      if (d <= s.start + s.len) {
        const t = (d - s.start) / s.len;
        return { x: lerp(s.a.x, s.b.x, t), y: lerp(s.a.y, s.b.y, t), angle: s.angle };
      }
    }
    const s = loop.segs[0];
    return { x: s.a.x, y: s.a.y, angle: s.angle };
  }

  function buildNpcCars() {
    const loops = [
      { loop: makeLoop(roadX(0), roadX(2), roadY(0), roadY(2), true), cars: 2 },
      { loop: makeLoop(roadX(1), roadX(4), roadY(1), roadY(3), false), cars: 2 },
      { loop: makeLoop(roadX(0), roadX(3), roadY(0), roadY(3), true), cars: 2 },
      { loop: makeLoop(roadX(2), roadX(4), roadY(0), roadY(2), false), cars: 2 },
    ];
    const colors = ['#b95743', '#d8c47b', '#5b7d72', '#78889d', '#a5695f', '#c2b39b', '#617b63', '#b68b4d'];
    loops.forEach((entry, li) => {
      for (let i = 0; i < entry.cars; i++) {
        const pt = pointOnLoop(entry.loop, (i / entry.cars) * entry.loop.len + li * 23);
        world.npcCars.push({
          loop: entry.loop, d: (i / entry.cars) * entry.loop.len + li * 23,
          speed: 48 + rng() * 30, x: pt.x, y: pt.y, angle: pt.angle,
          color: colors[(li * 2 + i) % colors.length], trim: '#e6dfcf', type: rng() < .25 ? 'van' : 'compact',
        });
      }
    });
  }

  /* =========================== static city =========================== */
  function seedFrom(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function shadowRect(s, x, y, w, h, rad = 7, alpha = .22) {
    s.fillStyle = `rgba(21,27,23,${alpha})`;
    rr(s, x, y, w, h, rad); s.fill();
  }

  function drawStaticShadow(s, x, y, w, h) {
    s.fillStyle = 'rgba(22,28,24,.24)';
    rr(s, x + 15, y + 20, w, h, 8); s.fill();
  }

  function buildStaticCanvas() {
    const cv = document.createElement('canvas');
    cv.width = WORLD_W; cv.height = WORLD_H;
    const s = cv.getContext('2d');
    s.fillStyle = '#313733';
    s.fillRect(0, 0, WORLD_W, WORLD_H);

    // asphalt grain
    for (let i = 0; i < 4200; i++) {
      const x = rng() * WORLD_W, y = rng() * WORLD_H;
      s.fillStyle = rng() < .5 ? 'rgba(255,255,255,.022)' : 'rgba(0,0,0,.04)';
      s.fillRect(x, y, 1 + rng() * 2, 1 + rng() * 3);
    }
    for (let i = 0; i < 45; i++) {
      const x = rng() * WORLD_W, y = rng() * WORLD_H;
      s.strokeStyle = 'rgba(0,0,0,.06)';
      s.lineWidth = 1;
      s.beginPath(); s.moveTo(x, y); s.lineTo(x + 16 + rng() * 45, y + (rng() - .5) * 4); s.stroke();
    }

    // outer sidewalk frame
    s.fillStyle = '#d6ccb8';
    s.fillRect(0, 0, WORLD_W, MARGIN);
    s.fillRect(0, WORLD_H - MARGIN, WORLD_W, MARGIN);
    s.fillRect(0, 0, MARGIN, WORLD_H);
    s.fillRect(WORLD_W - MARGIN, 0, MARGIN, WORLD_H);
    s.strokeStyle = 'rgba(70,67,58,.22)';
    s.lineWidth = 2;
    s.strokeRect(MARGIN - 1, MARGIN - 1, WORLD_W - MARGIN * 2 + 2, WORLD_H - MARGIN * 2 + 2);

    drawStreetNames(s);
    drawRoadMarkings(s);

    for (const block of world.blocks) drawBlockGround(s, block);
    for (const b of world.buildings) drawBuildingStatic(s, b);
    drawStaticProps(s);
    drawOuterGreen(s);

    world.staticCanvas = cv;
  }

  function drawStreetNames(s) {
    s.save();
    s.font = '600 11px Outfit, sans-serif';
    if ('letterSpacing' in s) s.letterSpacing = '4px';
    s.fillStyle = 'rgba(246,240,228,.17)';
    s.textAlign = 'center';
    s.textBaseline = 'middle';
    s.fillText('HAFENSTRASSE', 780, roadY(0));
    s.fillText('LINDENALLEE', 1710, roadY(1));
    s.fillText('MARKTSTRASSE', 690, roadY(2));
    s.fillText('RINGSTRASSE', 1920, roadY(3));
    s.save();
    s.translate(roadX(0), 1420); s.rotate(-Math.PI / 2); s.fillText('KANALWEG', 0, 0); s.restore();
    s.save();
    s.translate(roadX(2), 820); s.rotate(-Math.PI / 2); s.fillText('PARKALLEE', 0, 0); s.restore();
    s.save();
    s.translate(roadX(4), 1600); s.rotate(-Math.PI / 2); s.fillText('BAHNHOFSTR.', 0, 0); s.restore();
    s.restore();
  }

  function drawRoadMarkings(s) {
    const xs = [], ys = [];
    for (let c = 0; c < COLS - 1; c++) xs.push(roadX(c));
    for (let r = 0; r < ROWS - 1; r++) ys.push(roadY(r));

    // center dashes
    s.fillStyle = 'rgba(244,238,225,.34)';
    for (const x of xs) {
      for (let y = MARGIN + 30; y < WORLD_H - MARGIN - 20; y += 38) {
        if (ys.some(iy => Math.abs(y - iy) < 82)) continue;
        s.fillRect(x - 1.5, y, 3, 17);
      }
    }
    for (const y of ys) {
      for (let x = MARGIN + 30; x < WORLD_W - MARGIN - 20; x += 38) {
        if (xs.some(ix => Math.abs(x - ix) < 82)) continue;
        s.fillRect(x, y - 1.5, 17, 3);
      }
    }

    // side edge lines
    s.strokeStyle = 'rgba(244,238,225,.1)';
    s.lineWidth = 1.5;
    for (const x of xs) {
      s.beginPath(); s.moveTo(x - 51, MARGIN); s.lineTo(x - 51, WORLD_H - MARGIN); s.stroke();
      s.beginPath(); s.moveTo(x + 51, MARGIN); s.lineTo(x + 51, WORLD_H - MARGIN); s.stroke();
    }
    for (const y of ys) {
      s.beginPath(); s.moveTo(MARGIN, y - 51); s.lineTo(WORLD_W - MARGIN, y - 51); s.stroke();
      s.beginPath(); s.moveTo(MARGIN, y + 51); s.lineTo(WORLD_W - MARGIN, y + 51); s.stroke();
    }

    // crosswalks
    for (const ix of xs) for (const iy of ys) drawCrosswalks(s, ix, iy);

    // manholes
    const holes = [[660, 470], [1120, 930], [1560, 1390], [2010, 1840], [470, 1120], [1390, 470], [2230, 940], [930, 1840]];
    holes.forEach(([x, y], i) => {
      s.fillStyle = 'rgba(24,28,25,.4)';
      s.beginPath(); s.ellipse(x, y, 13, 10, i * .4, 0, TAU); s.fill();
      s.strokeStyle = 'rgba(200,195,180,.12)';
      s.lineWidth = 1;
      s.beginPath(); s.ellipse(x, y, 13, 10, i * .4, 0, TAU); s.stroke();
    });

    // parking bays
    s.strokeStyle = 'rgba(244,238,225,.25)';
    s.lineWidth = 2;
    const bays = [[424, 260, 40, 92], [646, 1354, 92, 40], [496, 1120, 40, 92], [858, 668, 84, 40]];
    bays.forEach(([x, y, w, h]) => { rr(s, x, y, w, h, 3); s.stroke(); });

    // painted 30
    s.save();
    s.font = '700 20px Outfit, sans-serif';
    s.fillStyle = 'rgba(244,238,225,.15)';
    s.textAlign = 'center'; s.textBaseline = 'middle';
    s.fillText('30', 300, roadY(2) + 1);
    s.fillText('30', roadX(2) + 1, 1600);
    s.restore();
  }

  function drawCrosswalks(s, ix, iy) {
    s.fillStyle = 'rgba(244,238,225,.55)';
    for (let i = -2; i <= 2; i++) {
      s.fillRect(ix + i * 20 - 6, iy - 86, 10, 20);
      s.fillRect(ix + i * 20 - 6, iy + 66, 10, 20);
      s.fillRect(ix - 86, iy + i * 20 - 6, 20, 10);
      s.fillRect(ix + 66, iy + i * 20 - 6, 20, 10);
    }
    s.fillStyle = 'rgba(244,238,225,.15)';
    s.fillRect(ix - 58, iy + 57, 116, 2);
    s.fillRect(ix - 58, iy - 59, 116, 2);
  }

  function drawBlockGround(s, block) {
    const { x, y, def } = block;
    s.fillStyle = '#d7cdb9';
    rr(s, x, y, BLOCK, BLOCK, 5); s.fill();

    // paving joints
    s.strokeStyle = 'rgba(84,78,66,.055)';
    s.lineWidth = 1;
    for (let i = 20; i < BLOCK; i += 30) {
      s.beginPath(); s.moveTo(x + i, y); s.lineTo(x + i, y + BLOCK); s.stroke();
      s.beginPath(); s.moveTo(x, y + i); s.lineTo(x + BLOCK, y + i); s.stroke();
    }
    s.strokeStyle = 'rgba(70,66,57,.24)';
    s.lineWidth = 2.5;
    rr(s, x + 1, y + 1, BLOCK - 2, BLOCK - 2, 5); s.stroke();

    if (def.kind === 'park') { drawParkGround(s, block, false); return; }
    if (def.kind === 'park-small') { drawParkGround(s, block, true); return; }
    if (def.kind === 'plaza') { drawPlazaGround(s, block); return; }

    const b = block.building;
    s.fillStyle = '#c7bfad';
    rr(s, x + 17, y + 17, BLOCK - 34, BLOCK - 34, 4); s.fill();
    s.strokeStyle = 'rgba(80,75,64,.08)';
    for (let i = 17; i < BLOCK - 17; i += 22) {
      s.beginPath(); s.moveTo(x + i, y + 18); s.lineTo(x + i, y + BLOCK - 18); s.stroke();
      s.beginPath(); s.moveTo(x + 18, y + i); s.lineTo(x + BLOCK - 18, y + i); s.stroke();
    }

    if (b.yard) {
      const yd = b.yard;
      s.fillStyle = '#7c9266';
      rr(s, yd.x + 4, yd.y + 3, yd.w - 8, yd.h - 8, 6); s.fill();
      s.fillStyle = 'rgba(84,107,65,.2)';
      for (let i = 0; i < 18; i++) {
        s.beginPath();
        s.arc(yd.x + 12 + rng() * (yd.w - 24), yd.y + 10 + rng() * (yd.h - 20), 2 + rng() * 4, 0, TAU);
        s.fill();
      }
      // path to the door
      s.strokeStyle = '#d0bf9c';
      s.lineWidth = 19;
      s.lineCap = 'round';
      s.beginPath();
      s.moveTo(b.door.x, yd.y + yd.h - 2);
      s.quadraticCurveTo(b.door.x + 8, yd.y + 18, b.door.x, b.y + b.h + 8);
      s.stroke();
      // bike + bins
      drawBike(s, x + 44, y + BLOCK - 28, -.2);
      drawBin(s, x + BLOCK - 38, y + BLOCK - 44);
    }
    if (b.shape === 'C') {
      s.fillStyle = 'rgba(95,103,84,.22)';
      s.fillRect(b.x + b.w + 1, b.y, 15, b.h);
      drawBin(s, b.x + b.w + 7, b.y + 46);
      drawBike(s, b.x + b.w + 8, b.y + 200, Math.PI / 2);
    }
    // subtle storefront spill on sidewalk
    if (b.def.poi) {
      const g = s.createRadialGradient(b.door.x, b.door.y, 2, b.door.x, b.door.y, 42);
      g.addColorStop(0, 'rgba(246,235,208,.22)');
      g.addColorStop(1, 'rgba(246,235,208,0)');
      s.fillStyle = g;
      s.fillRect(b.door.x - 45, b.door.y - 45, 90, 90);
    }
  }

  function drawParkGround(s, block, small) {
    const x = block.x + 18, y = block.y + 18, w = BLOCK - 36, h = BLOCK - 36;
    s.fillStyle = small ? '#799066' : '#718b5d';
    rr(s, x, y, w, h, 8); s.fill();
    // grass texture
    for (let i = 0; i < 170; i++) {
      s.strokeStyle = rng() < .5 ? 'rgba(48,68,38,.18)' : 'rgba(168,190,137,.16)';
      const gx = x + rng() * w, gy = y + rng() * h;
      s.beginPath(); s.moveTo(gx, gy); s.lineTo(gx + (rng() - .5) * 5, gy - 3 - rng() * 4); s.stroke();
    }
    // paths
    s.strokeStyle = '#d8c7a3';
    s.lineWidth = 22; s.lineCap = 'round'; s.lineJoin = 'round';
    s.beginPath();
    s.moveTo(block.x + 40, block.y + BLOCK - 18);
    s.bezierCurveTo(block.x + 60, block.y + 210, block.x + 220, block.y + 280, block.x + 270, block.y + 220);
    s.stroke();
    s.beginPath();
    s.moveTo(block.x + 30, block.y + 55);
    s.bezierCurveTo(block.x + 130, block.y + 90, block.x + 210, block.y + 60, block.x + 305, block.y + 96);
    s.stroke();
    if (!small) {
      // pond
      const p = world.pond;
      s.fillStyle = '#cfc0a0';
      s.beginPath(); s.ellipse(p.x, p.y, p.rx + 10, p.ry + 10, 0, 0, TAU); s.fill();
      s.fillStyle = '#3f6b6b';
      s.beginPath(); s.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, TAU); s.fill();
      s.fillStyle = 'rgba(125,184,171,.24)';
      s.beginPath(); s.ellipse(p.x - 14, p.y - 13, p.rx * .55, p.ry * .4, -.2, 0, TAU); s.fill();
      s.strokeStyle = 'rgba(225,234,214,.17)';
      s.lineWidth = 1.5;
      for (let i = 0; i < 5; i++) {
        s.beginPath();
        s.ellipse(p.x + (rng() - .5) * 90, p.y + (rng() - .5) * 46, 14 + rng() * 18, 3 + rng() * 3, 0, 0, TAU);
        s.stroke();
      }
      // reeds
      for (let i = 0; i < 18; i++) {
        const a = rng() * TAU;
        const rx = p.x + Math.cos(a) * (p.rx + 2);
        const ry = p.y + Math.sin(a) * (p.ry + 2);
        s.strokeStyle = 'rgba(64,89,54,.7)';
        s.beginPath(); s.moveTo(rx, ry); s.lineTo(rx + 2, ry - 9 - rng() * 6); s.stroke();
      }
      // little bridge
      s.save();
      s.translate(p.x - 5, p.y + 2);
      s.rotate(.05);
      s.fillStyle = '#a77b51';
      s.fillRect(-46, -14, 92, 28);
      s.strokeStyle = 'rgba(70,45,28,.35)';
      s.lineWidth = 1.5;
      for (let i = -40; i < 44; i += 8) { s.beginPath(); s.moveTo(i, -14); s.lineTo(i, 14); s.stroke(); }
      s.fillStyle = '#8b633f';
      s.fillRect(-46, -16, 92, 3); s.fillRect(-46, 13, 92, 3);
      s.restore();
    } else {
      // little flower circle
      s.fillStyle = '#c6b48e';
      s.beginPath(); s.arc(block.x + 170, block.y + 170, 48, 0, TAU); s.fill();
      s.fillStyle = '#6c8b5a';
      s.beginPath(); s.arc(block.x + 170, block.y + 170, 38, 0, TAU); s.fill();
      for (let i = 0; i < 22; i++) {
        const a = i / 22 * TAU;
        s.fillStyle = i % 3 === 0 ? '#e0a15f' : i % 3 === 1 ? '#e9d4be' : '#bd6b62';
        s.beginPath();
        s.arc(block.x + 170 + Math.cos(a) * (12 + i % 3 * 8), block.y + 170 + Math.sin(a) * (12 + i % 3 * 8), 2.2, 0, TAU);
        s.fill();
      }
    }
    // benches, static (POIs)
    drawBench(s, block.x + 92, block.y + 300, 0);
    if (!small) drawBench(s, block.x + 278, block.y + 210, Math.PI);
    drawBench(s, block.x + 250, block.y + 90, Math.PI / 2);
    // flower beds
    for (let i = 0; i < 7; i++) {
      const fx = block.x + 34 + rng() * (BLOCK - 68);
      const fy = block.y + 34 + rng() * (BLOCK - 68);
      if (dist(fx, fy, world.pond ? world.pond.x : 0, world.pond ? world.pond.y : 0) < 100) continue;
      s.fillStyle = 'rgba(194,177,141,.4)';
      s.beginPath(); s.arc(fx, fy, 5, 0, TAU); s.fill();
      for (let k = 0; k < 4; k++) {
        s.fillStyle = rng() < .5 ? '#e7b063' : '#e7ded0';
        s.beginPath(); s.arc(fx + (rng() - .5) * 6, fy + (rng() - .5) * 6, 1.8, 0, TAU); s.fill();
      }
    }
  }

  function drawPlazaGround(s, block) {
    const x = block.x + 18, y = block.y + 18, w = BLOCK - 36, h = BLOCK - 36;
    s.fillStyle = '#cfc1a6';
    rr(s, x, y, w, h, 7); s.fill();
    s.strokeStyle = 'rgba(98,89,72,.1)';
    s.lineWidth = 1;
    for (let i = 0; i < w; i += 22) {
      s.beginPath(); s.moveTo(x + i, y); s.lineTo(x + i, y + h); s.stroke();
    }
    for (let j = 0; j < h; j += 18) {
      s.beginPath(); s.moveTo(x, y + j); s.lineTo(x + w, y + j); s.stroke();
    }
    const f = world.fountain;
    // stone ring + water
    s.fillStyle = '#b9aa8e';
    s.beginPath(); s.arc(f.x, f.y, f.r + 12, 0, TAU); s.fill();
    s.fillStyle = '#8f8068';
    s.beginPath(); s.arc(f.x, f.y, f.r + 5, 0, TAU); s.fill();
    s.fillStyle = '#47787c';
    s.beginPath(); s.arc(f.x, f.y, f.r, 0, TAU); s.fill();
    s.strokeStyle = 'rgba(230,244,240,.24)';
    s.lineWidth = 2;
    s.beginPath(); s.arc(f.x, f.y, f.r - 7, 0, TAU); s.stroke();
    // center pedestal
    s.fillStyle = '#d0c3a9';
    s.beginPath(); s.arc(f.x, f.y, 13, 0, TAU); s.fill();
    s.fillStyle = '#a89a80';
    s.beginPath(); s.arc(f.x, f.y, 9, 0, TAU); s.fill();
    s.fillStyle = '#c9b48b';
    s.beginPath(); s.arc(f.x, f.y - 3, 5.5, 0, TAU); s.fill();
    // benches around fountain
    drawBench(s, f.x - 74, f.y + 60, .5);
    drawBench(s, f.x + 88, f.y - 56, Math.PI - .5);
    drawBench(s, f.x - 108, f.y - 32, Math.PI / 2);
    // planters at corners
    [[44, 44], [BLOCK - 44, 44], [44, BLOCK - 44], [BLOCK - 44, BLOCK - 44]].forEach(([ox, oy], i) => {
      s.fillStyle = '#9e8c6f';
      s.beginPath(); s.arc(block.x + ox, block.y + oy, 13, 0, TAU); s.fill();
      s.fillStyle = '#597a53';
      s.beginPath(); s.arc(block.x + ox, block.y + oy, 10, 0, TAU); s.fill();
    });
    drawTruckStatic(s, world.truck);
    // string light poles + cables
    s.strokeStyle = 'rgba(42,47,42,.55)';
    s.lineWidth = 1.5;
    const corners = [[44, 44], [BLOCK - 44, 44], [BLOCK - 44, BLOCK - 44], [44, BLOCK - 44]];
    for (let i = 0; i < 4; i++) {
      const a = corners[i], b = corners[(i + 1) % 4];
      s.beginPath();
      s.moveTo(block.x + a[0], block.y + a[1]);
      s.quadraticCurveTo(block.x + (a[0] + b[0]) / 2, block.y + (a[1] + b[1]) / 2 + 20, block.x + b[0], block.y + b[1]);
      s.stroke();
    }
    corners.forEach(([ox, oy]) => {
      s.fillStyle = '#454c42';
      s.beginPath(); s.arc(block.x + ox, block.y + oy, 3.5, 0, TAU); s.fill();
    });
  }

  function drawTruckStatic(s, t) {
    s.save();
    s.translate(t.x + t.w / 2, t.y + t.h / 2);
    s.rotate(t.angle);
    s.fillStyle = 'rgba(22,28,24,.24)';
    rr(s, -t.w / 2 + 6, -t.h / 2 + 7, t.w, t.h, 8); s.fill();
    s.fillStyle = '#f1e7d3';
    rr(s, -t.w / 2, -t.h / 2, t.w, t.h, 7); s.fill();
    s.fillStyle = '#c85b42';
    rr(s, -t.w / 2, -t.h / 2, 26, t.h, 6); s.fill();
    s.fillStyle = '#2d3a33';
    rr(s, -t.w / 2 + 8, -t.h / 2 + 7, 13, 12, 3); s.fill();
    s.fillStyle = 'rgba(75,105,94,.8)';
    s.fillRect(-4, -8, 22, 15);
    s.strokeStyle = 'rgba(94,73,47,.4)';
    s.strokeRect(-4, -8, 22, 15);
    // awning
    s.fillStyle = '#e4b35a';
    for (let i = 0; i < 6; i++) s.fillRect(-1 + i * 7, t.h / 2 - 1, 7, 7);
    s.fillStyle = '#26332c';
    s.beginPath(); s.arc(24, t.h / 2 - 1, 4, 0, TAU); s.fill();
    s.fillStyle = '#4b514b';
    s.beginPath(); s.arc(-25, t.h / 2 + 2, 5, 0, TAU); s.fill();
    s.beginPath(); s.arc(25, t.h / 2 + 2, 5, 0, TAU); s.fill();
    s.restore();
    // signage
    s.save();
    s.fillStyle = '#22322a';
    rr(s, t.x + t.w / 2 - 32, t.y + t.h / 2 - 28, 64, 15, 4); s.fill();
    s.fillStyle = '#f1e7d3';
    s.font = '700 8px Outfit, sans-serif';
    s.textAlign = 'center'; s.textBaseline = 'middle';
    s.fillText('BUDE 7', t.x + t.w / 2, t.y + t.h / 2 - 20);
    s.restore();
  }

  function drawBench(s, x, y, angle) {
    s.save();
    s.translate(x, y); s.rotate(angle);
    s.fillStyle = 'rgba(20,27,22,.2)';
    rr(s, -20, 8, 46, 10, 3); s.fill();
    s.fillStyle = '#8c6742';
    s.fillRect(-22, -5, 44, 7);
    s.fillRect(-22, 4, 44, 5);
    s.fillStyle = '#5c452f';
    s.fillRect(-18, -4, 36, 4);
    s.fillStyle = '#4b4e46';
    s.fillRect(-17, 9, 4, 5); s.fillRect(13, 9, 4, 5);
    s.restore();
  }

  function drawBin(s, x, y) {
    s.fillStyle = 'rgba(20,27,22,.2)';
    s.beginPath(); s.arc(x + 2, y + 3, 7, 0, TAU); s.fill();
    s.fillStyle = '#4f5c51';
    s.beginPath(); s.arc(x, y, 6, 0, TAU); s.fill();
    s.fillStyle = '#38453b';
    s.beginPath(); s.arc(x, y, 4, 0, TAU); s.fill();
  }

  function drawBike(s, x, y, angle) {
    s.save(); s.translate(x, y); s.rotate(angle);
    s.strokeStyle = '#3f4742'; s.lineWidth = 1.5;
    s.beginPath(); s.arc(-9, 0, 5, 0, TAU); s.stroke();
    s.beginPath(); s.arc(9, 0, 5, 0, TAU); s.stroke();
    s.beginPath(); s.moveTo(-9, 0); s.lineTo(-2, -7); s.lineTo(6, -7); s.lineTo(9, 0); s.lineTo(0, 0); s.lineTo(-2, -7); s.stroke();
    s.restore();
  }

  function drawBuildingStatic(s, b) {
    const pr = mulberry32(seedFrom(b.name));
    drawStaticShadow(s, b.x, b.y, b.w, b.h);
    b.extras.forEach(e => { if (e.kind === 'shed') shadowRect(s, e.x + 8, e.y + 10, e.w, e.h, 4, .2); });

    // wall / facade base
    s.fillStyle = shade(b.wall, -20);
    rr(s, b.x, b.y, b.w, b.h, 7); s.fill();
    s.strokeStyle = 'rgba(40,36,30,.28)';
    s.lineWidth = 1.5;
    rr(s, b.x, b.y, b.w, b.h, 7); s.stroke();

    const rx = b.x + 5, ry = b.y + 5, rw = b.w - 10, rh = b.h - 10;
    s.save();
    rr(s, rx, ry, rw, rh, 5); s.clip();
    if (b.style === 'gable') {
      s.fillStyle = shade(b.roof, 2);
      s.fillRect(rx, ry, rw, rh);
      if (rw >= rh) {
        const ridge = ry + rh * .42;
        s.fillStyle = shade(b.roof, 15);
        s.fillRect(rx, ry, rw, ridge - ry);
        s.fillStyle = shade(b.roof, -9);
        s.fillRect(rx, ridge, rw, ry + rh - ridge);
        s.strokeStyle = 'rgba(255,255,255,.17)'; s.lineWidth = 1.4;
        s.beginPath(); s.moveTo(rx, ridge); s.lineTo(rx + rw, ridge); s.stroke();
        s.strokeStyle = 'rgba(35,25,20,.11)'; s.lineWidth = 1;
        for (let i = rx + 10; i < rx + rw; i += 12) {
          s.beginPath(); s.moveTo(i, ry + 2); s.lineTo(i, ridge - 2); s.stroke();
          s.beginPath(); s.moveTo(i + 6, ridge + 2); s.lineTo(i + 6, ry + rh - 2); s.stroke();
        }
      } else {
        const ridge = rx + rw * .42;
        s.fillStyle = shade(b.roof, 14);
        s.fillRect(rx, ry, ridge - rx, rh);
        s.fillStyle = shade(b.roof, -8);
        s.fillRect(ridge, ry, rx + rw - ridge, rh);
        s.strokeStyle = 'rgba(255,255,255,.15)';
        s.beginPath(); s.moveTo(ridge, ry); s.lineTo(ridge, ry + rh); s.stroke();
      }
    } else if (b.style === 'glass') {
      s.fillStyle = shade(b.roof, 3);
      s.fillRect(rx, ry, rw, rh);
      s.strokeStyle = 'rgba(232,245,240,.35)';
      s.lineWidth = 1;
      for (let x = rx + 14; x < rx + rw; x += 30) { s.beginPath(); s.moveTo(x, ry); s.lineTo(x, ry + rh); s.stroke(); }
      for (let y = ry + 14; y < ry + rh; y += 30) { s.beginPath(); s.moveTo(rx, y); s.lineTo(rx + rw, y); s.stroke(); }
      s.fillStyle = 'rgba(188,224,218,.16)';
      s.fillRect(rx, ry, rw, rh);
    } else {
      s.fillStyle = b.roof;
      s.fillRect(rx, ry, rw, rh);
      s.fillStyle = 'rgba(255,255,255,.045)';
      for (let y = ry + 8; y < ry + rh; y += 14) s.fillRect(rx, y, rw, 1);
      s.strokeStyle = shade(b.roof, 26);
      s.lineWidth = 2;
      s.strokeRect(rx + 7, ry + 7, rw - 14, rh - 14);
      s.strokeStyle = 'rgba(0,0,0,.14)';
      s.strokeRect(rx + 3, ry + 3, rw - 6, rh - 6);
    }
    s.restore();

    drawRoofDetails(s, b, rw, rh, pr);
    drawStorefront(s, b);

    b.extras.forEach(e => {
      if (e.kind === 'secondary') drawSecondaryBuilding(s, b, e, pr);
      if (e.kind === 'shed') drawShed(s, e);
    });
  }

  function drawRoofDetails(s, b, rw, rh, pr) {
    const x = b.x + 5, y = b.y + 5;
    const inside = (pad) => ({
      x: x + pad + pr() * Math.max(1, rw - pad * 2 - 30),
      y: y + pad + pr() * Math.max(1, rh - pad * 2 - 30),
    });

    if (b.style !== 'gable' || b.kind === 'apartment') {
      // generic AC / vents
      const n = 2 + Math.floor(pr() * 2);
      for (let i = 0; i < n; i++) {
        const p = inside(18);
        drawAC(s, p.x, p.y, 11 + pr() * 9, 8 + pr() * 6, pr);
      }
    }
    if (b.kind === 'home' || b.kind === 'apartment') {
      const p = inside(30);
      drawWaterTank(s, p.x, p.y, 9);
      if (pr() < .8) drawSkylight(s, b.x + 18 + pr() * (b.w - 55), b.y + 24 + pr() * (b.h - 70), 18, 12);
    }
    if (['market', 'office', 'courier', 'gym', 'pool', 'studio', 'radio'].includes(b.kind)) {
      drawSolar(s, b.x + 18 + pr() * 18, b.y + 18 + pr() * 20, 40, 25, pr);
      if (b.kind === 'pool' || b.kind === 'gym') drawSkylight(s, b.x + b.w * .55, b.y + b.h * .34, 32, 20);
    }
    if (b.kind === 'cafe') {
      drawUmbrella(s, b.x + b.w * .3, b.y + b.h * .33, 15, b.accent);
      drawUmbrella(s, b.x + b.w * .68, b.y + b.h * .26, 12, '#e9dfcd');
      s.fillStyle = 'rgba(80,120,86,.7)';
      s.beginPath(); s.arc(b.x + b.w * .2, b.y + b.h * .5, 7, 0, TAU); s.fill();
      s.beginPath(); s.arc(b.x + b.w * .82, b.y + b.h * .55, 6, 0, TAU); s.fill();
    }
    if (b.kind === 'bakery') {
      s.fillStyle = '#665347';
      rr(s, b.x + b.w - 45, b.y + 25, 18, 18, 3); s.fill();
      s.fillStyle = '#403a35';
      rr(s, b.x + b.w - 42, b.y + 28, 12, 12, 2); s.fill();
    }
    if (b.kind === 'courier') {
      s.save();
      s.fillStyle = 'rgba(246,240,228,.2)';
      s.font = '700 16px Outfit, sans-serif';
      if ('letterSpacing' in s) s.letterSpacing = '5px';
      s.textAlign = 'center'; s.textBaseline = 'middle';
      s.fillText('KURIER', b.x + b.w / 2, b.y + b.h / 2);
      s.restore();
    }
    if (b.kind === 'taxi') {
      s.fillStyle = 'rgba(246,240,228,.9)';
      rr(s, b.x + b.w / 2 - 34, b.y + b.h / 2 - 16, 68, 32, 6); s.fill();
      s.fillStyle = '#28312d';
      s.font = '800 19px Outfit, sans-serif';
      s.textAlign = 'center'; s.textBaseline = 'middle';
      s.fillText('TAXI 24', b.x + b.w / 2, b.y + b.h / 2 + 1);
    }
    if (b.kind === 'cinema') {
      s.fillStyle = '#3a1d20';
      rr(s, b.x + 22, b.y + b.h - 56, b.w - 44, 28, 4); s.fill();
      s.fillStyle = '#ecc870';
      s.font = '700 15px Outfit, sans-serif';
      if ('letterSpacing' in s) s.letterSpacing = '4px';
      s.textAlign = 'center'; s.textBaseline = 'middle';
      s.fillText('LICHTSPIEL', b.x + b.w / 2, b.y + b.h - 41);
      s.fillStyle = 'rgba(255,230,170,.55)';
      for (let i = 0; i < 10; i++) {
        s.beginPath(); s.arc(b.x + 34 + i * 23, b.y + b.h - 60, 1.6, 0, TAU); s.fill();
      }
    }
    if (b.kind === 'hotel') {
      s.fillStyle = '#78a7a2';
      rr(s, b.x + b.w * .5, b.y + 24, b.w * .36, b.h * .22, 5); s.fill();
      s.strokeStyle = 'rgba(240,246,238,.4)';
      s.strokeRect(b.x + b.w * .5 + 4, b.y + 28, b.w * .36 - 8, b.h * .22 - 8);
      s.fillStyle = '#e7dcc7';
      for (let i = 0; i < 3; i++) s.fillRect(b.x + b.w * .54 + i * 18, b.y + 32, 8, 3);
    }
    if (b.kind === 'townhall') {
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      s.fillStyle = 'rgba(20,27,22,.25)';
      s.beginPath(); s.arc(cx + 5, cy + 7, 30, 0, TAU); s.fill();
      s.fillStyle = '#c8b693';
      s.beginPath(); s.arc(cx, cy, 29, 0, TAU); s.fill();
      s.fillStyle = '#7f6847';
      s.beginPath(); s.arc(cx, cy, 24, 0, TAU); s.fill();
      s.fillStyle = '#f2e8d2';
      s.beginPath(); s.arc(cx, cy, 17, 0, TAU); s.fill();
      s.strokeStyle = '#514636'; s.lineWidth = 2;
      s.beginPath(); s.moveTo(cx, cy); s.lineTo(cx, cy - 10); s.moveTo(cx, cy); s.lineTo(cx + 6, cy + 2); s.stroke();
      s.fillStyle = '#3d443e';
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * TAU;
        s.beginPath(); s.arc(cx + Math.cos(a) * 22, cy + Math.sin(a) * 22, 1.2, 0, TAU); s.fill();
      }
      s.strokeStyle = 'rgba(30,26,20,.5)'; s.lineWidth = 2;
      s.beginPath(); s.arc(cx, cy, 29, 0, TAU); s.stroke();
    }
    if (b.kind === 'pharmacy') {
      const cx = b.x + b.w - 28, cy = b.y + 30;
      s.fillStyle = '#f4f1e5';
      s.beginPath(); s.arc(cx, cy, 12, 0, TAU); s.fill();
      s.fillStyle = '#4f8469';
      s.fillRect(cx - 2.5, cy - 8, 5, 16);
      s.fillRect(cx - 8, cy - 2.5, 16, 5);
    }
    if (b.kind === 'garden') {
      s.fillStyle = 'rgba(76,112,74,.75)';
      for (let i = 0; i < 9; i++) {
        const px = b.x + 25 + (i % 3) * 30, py = b.y + 24 + Math.floor(i / 3) * 26;
        s.beginPath(); s.arc(px, py, 7, 0, TAU); s.fill();
      }
    }
    if (b.kind === 'radio') {
      s.strokeStyle = 'rgba(240,240,230,.65)';
      s.lineWidth = 1.5;
      s.beginPath(); s.moveTo(b.x + b.w - 34, b.y + b.h - 24); s.lineTo(b.x + b.w - 34, b.y + 34); s.stroke();
      s.beginPath(); s.moveTo(b.x + b.w - 34, b.y + 34); s.lineTo(b.x + b.w - 46, b.y + 46); s.stroke();
      s.beginPath(); s.moveTo(b.x + b.w - 34, b.y + 48); s.lineTo(b.x + b.w - 44, b.y + 58); s.stroke();
      s.fillStyle = '#d95f46';
      s.beginPath(); s.arc(b.x + b.w - 34, b.y + 34, 2.5, 0, TAU); s.fill();
    }
    if (b.kind === 'music' || b.kind === 'gallery' || b.kind === 'bookshop') {
      // rooftop courtyard tables
      s.fillStyle = 'rgba(120,150,104,.7)';
      s.beginPath(); s.arc(b.x + b.w * .72, b.y + b.h * .72, 9, 0, TAU); s.fill();
      drawBench(s, b.x + b.w * .68, b.y + b.h * .8, 0);
    }
  }

  function drawAC(s, x, y, w, h, pr) {
    s.fillStyle = 'rgba(20,27,22,.22)';
    rr(s, x + 2, y + 3, w, h, 2); s.fill();
    s.fillStyle = '#b7b8ad';
    rr(s, x, y, w, h, 2); s.fill();
    s.fillStyle = '#8e9288';
    for (let i = 2; i < h - 1; i += 3) s.fillRect(x + 2, y + i, w - 4, 1);
    s.strokeStyle = 'rgba(255,255,255,.25)';
    rr(s, x, y, w, h, 2); s.stroke();
  }
  function drawWaterTank(s, x, y, r) {
    s.fillStyle = 'rgba(20,27,22,.2)';
    s.beginPath(); s.arc(x + 2, y + 3, r + 1, 0, TAU); s.fill();
    s.fillStyle = '#9e9f93';
    s.beginPath(); s.arc(x, y, r, 0, TAU); s.fill();
    s.strokeStyle = '#777b70'; s.lineWidth = 1.5;
    s.beginPath(); s.arc(x, y, r - 3, 0, TAU); s.stroke();
    s.fillStyle = '#70776c';
    s.beginPath(); s.arc(x, y, 2, 0, TAU); s.fill();
  }
  function drawSkylight(s, x, y, w, h) {
    s.fillStyle = 'rgba(20,27,22,.25)';
    rr(s, x + 2, y + 3, w, h, 2); s.fill();
    s.fillStyle = 'rgba(126,168,172,.75)';
    rr(s, x, y, w, h, 2); s.fill();
    s.strokeStyle = 'rgba(236,247,240,.45)'; s.lineWidth = 1;
    s.beginPath(); s.moveTo(x + w / 2, y); s.lineTo(x + w / 2, y + h); s.stroke();
    s.beginPath(); s.moveTo(x, y + h / 2); s.lineTo(x + w, y + h / 2); s.stroke();
  }
  function drawSolar(s, x, y, w, h, pr) {
    s.save();
    s.translate(x, y);
    s.rotate(-.03);
    s.fillStyle = 'rgba(20,27,22,.2)';
    rr(s, 2, 3, w, h, 2); s.fill();
    s.fillStyle = '#2d4f63';
    rr(s, 0, 0, w, h, 2); s.fill();
    s.strokeStyle = 'rgba(143,191,205,.65)'; s.lineWidth = 1;
    for (let i = 8; i < w; i += 9) { s.beginPath(); s.moveTo(i, 0); s.lineTo(i, h); s.stroke(); }
    for (let j = 7; j < h; j += 8) { s.beginPath(); s.moveTo(0, j); s.lineTo(w, j); s.stroke(); }
    s.strokeStyle = 'rgba(255,255,255,.25)';
    rr(s, 0, 0, w, h, 2); s.stroke();
    s.restore();
  }
  function drawUmbrella(s, x, y, r, color) {
    s.fillStyle = 'rgba(20,27,22,.2)';
    s.beginPath(); s.arc(x + 2, y + 3, r, 0, TAU); s.fill();
    for (let i = 0; i < 6; i++) {
      s.fillStyle = i % 2 ? '#f2e8d5' : color;
      s.beginPath(); s.moveTo(x, y);
      s.arc(x, y, r, i / 6 * TAU, (i + 1) / 6 * TAU);
      s.closePath(); s.fill();
    }
    s.fillStyle = '#5a4a38';
    s.beginPath(); s.arc(x, y, 2.2, 0, TAU); s.fill();
  }

  function drawStorefront(s, b) {
    const y = b.y + b.h;
    const doorX = b.door.x;
    const signW = Math.min(104, b.w - 22);
    const isShop = !!b.def.poi;
    // sidewalk spill
    if (isShop) {
      s.fillStyle = 'rgba(248,239,219,.3)';
      rr(s, doorX - 30, y - 4, 60, 19, 5); s.fill();
      const g = s.createLinearGradient(0, y, 0, y + 25);
      g.addColorStop(0, 'rgba(35,48,40,.18)');
      g.addColorStop(1, 'rgba(35,48,40,0)');
      s.fillStyle = g;
      s.fillRect(doorX - 27, y, 54, 25);
      // awning
      s.save();
      s.fillStyle = 'rgba(20,27,22,.15)';
      rr(s, doorX - signW / 2 + 2, y + 5, signW, 13, 2); s.fill();
      for (let i = 0; i < 8; i++) {
        s.fillStyle = i % 2 ? b.trim : b.accent;
        s.fillRect(doorX - signW / 2 + i * (signW / 8), y + 2, signW / 8 + .5, 11);
      }
      s.fillStyle = 'rgba(0,0,0,.15)';
      s.fillRect(doorX - signW / 2, y + 12, signW, 1);
      s.restore();
      // sign
      s.fillStyle = 'rgba(29,42,34,.92)';
      rr(s, doorX - signW / 2, y - 26, signW, 16, 3); s.fill();
      s.fillStyle = 'rgba(247,239,222,.92)';
      s.font = '600 7.5px Outfit, sans-serif';
      if ('letterSpacing' in s) s.letterSpacing = '1.2px';
      s.textAlign = 'center'; s.textBaseline = 'middle';
      let label = b.name.toUpperCase();
      if (label.length > 16) label = label.slice(0, 15) + '…';
      s.fillText(label, doorX, y - 18);
      if ('letterSpacing' in s) s.letterSpacing = '0px';
    }
    // door
    s.fillStyle = 'rgba(31,37,32,.9)';
    rr(s, doorX - 9, y - 9, 18, 14, 2); s.fill();
    s.fillStyle = 'rgba(238,191,98,.35)';
    rr(s, doorX - 6, y - 7, 12, 9, 1); s.fill();
    s.fillStyle = 'rgba(246,240,228,.14)';
    s.fillRect(doorX - 22, y + 1, 44, 2);

    // street furniture
    if (b.kind === 'cafe' || b.kind === 'bistro') {
      for (const side of [-1, 1]) {
        const tx = doorX + side * 57;
        if (tx < b.x - 20 || tx > b.x + b.w + 20) continue;
        s.fillStyle = 'rgba(20,27,22,.18)';
        s.beginPath(); s.arc(tx + 2, y + 22, 9, 0, TAU); s.fill();
        s.fillStyle = '#e8deca';
        s.beginPath(); s.arc(tx, y + 20, 8, 0, TAU); s.fill();
        s.fillStyle = '#9b7c52';
        s.beginPath(); s.arc(tx, y + 20, 1.5, 0, TAU); s.fill();
        s.fillStyle = '#57645a';
        s.beginPath(); s.arc(tx - 11, y + 25, 3, 0, TAU); s.fill();
        s.beginPath(); s.arc(tx + 11, y + 25, 3, 0, TAU); s.fill();
      }
    }
    if (b.kind === 'market' || b.kind === 'markthalle') {
      for (let i = 0; i < 2; i++) {
        const cx = doorX + (i ? 40 : -46);
        s.fillStyle = '#b9894c';
        rr(s, cx - 8, y + 13, 16, 12, 2); s.fill();
        s.strokeStyle = 'rgba(83,56,28,.35)';
        s.strokeRect(cx - 6, y + 15, 12, 8);
      }
    }
    if (b.kind === 'bakery') {
      s.fillStyle = '#4d4032';
      rr(s, doorX + 30, y + 12, 18, 20, 2); s.fill();
      s.fillStyle = '#f1e6cf';
      s.font = '600 5.5px Outfit, sans-serif';
      s.textAlign = 'center'; s.textBaseline = 'middle';
      s.fillText('FRISCH', doorX + 39, y + 19);
      s.fillText('TÄGLICH', doorX + 39, y + 25);
    }
    if (b.kind === 'home') {
      s.fillStyle = '#7f8e73';
      s.beginPath(); s.arc(doorX - 28, y + 7, 6, 0, TAU); s.fill();
      s.beginPath(); s.arc(doorX + 28, y + 7, 6, 0, TAU); s.fill();
      s.fillStyle = 'rgba(240,225,196,.6)';
      s.fillRect(doorX - 12, y + 2, 24, 5);
    }
    if (b.kind === 'hotel') {
      s.fillStyle = '#6d806b';
      s.beginPath(); s.arc(doorX - 36, y + 8, 7, 0, TAU); s.fill();
      s.beginPath(); s.arc(doorX + 36, y + 8, 7, 0, TAU); s.fill();
    }
  }

  function drawSecondaryBuilding(s, b, e, pr) {
    s.fillStyle = 'rgba(22,28,24,.22)';
    rr(s, e.x + 10, e.y + 13, e.w, e.h, 6); s.fill();
    s.fillStyle = shade(b.wall, -18);
    rr(s, e.x, e.y, e.w, e.h, 6); s.fill();
    s.fillStyle = shade(b.roof, 6);
    rr(s, e.x + 5, e.y + 5, e.w - 10, e.h - 10, 4); s.fill();
    s.strokeStyle = 'rgba(255,255,255,.1)';
    s.strokeRect(e.x + 9, e.y + 9, e.w - 18, e.h - 18);
    for (let i = 0; i < 2; i++) drawAC(s, e.x + 18 + pr() * (e.w - 50), e.y + 18 + pr() * 55, 13, 9, pr);
    // door
    s.fillStyle = 'rgba(30,36,31,.8)';
    rr(s, e.x + e.w / 2 - 7, e.y + e.h - 7, 14, 10, 2); s.fill();
    // awning
    s.fillStyle = b.accent;
    s.fillRect(e.x + e.w / 2 - 20, e.y + e.h - 1, 40, 4);
  }

  function drawShed(s, e) {
    s.fillStyle = 'rgba(22,28,24,.22)';
    rr(s, e.x + 5, e.y + 7, e.w, e.h, 3); s.fill();
    s.fillStyle = '#a47a50';
    rr(s, e.x, e.y, e.w, e.h, 3); s.fill();
    s.fillStyle = '#7b593a';
    s.fillRect(e.x + 4, e.y + 3, e.w - 8, e.h * .42);
    s.strokeStyle = 'rgba(65,45,27,.35)';
    s.lineWidth = 1;
    for (let i = 8; i < e.w - 4; i += 7) { s.beginPath(); s.moveTo(e.x + i, e.y + 3); s.lineTo(e.x + i, e.y + e.h - 4); s.stroke(); }
    s.fillStyle = '#5b412b';
    s.fillRect(e.x + e.w / 2 - 5, e.y + e.h / 2, 10, e.h / 2);
  }

  function drawStaticProps(s) {
    // corner bins & hydrants
    for (const block of world.blocks) {
      if (rng() < .4) drawBin(s, block.x + 24, block.y + BLOCK - 34);
      if (rng() < .25) {
        s.fillStyle = '#b85b45';
        s.beginPath(); s.arc(block.x + BLOCK - 27, block.y + BLOCK - 27, 4, 0, TAU); s.fill();
        s.fillStyle = '#d4765f';
        s.beginPath(); s.arc(block.x + BLOCK - 27, block.y + BLOCK - 27, 2, 0, TAU); s.fill();
      }
      if (rng() < .3) {
        const x = block.x + BLOCK - 30, y = block.y + 45;
        s.strokeStyle = '#4a534b'; s.lineWidth = 1.2;
        s.beginPath(); s.arc(x, y, 7, 0, TAU); s.stroke();
        s.beginPath(); s.arc(x + 12, y, 7, 0, TAU); s.stroke();
        s.beginPath(); s.moveTo(x, y); s.lineTo(x + 12, y); s.stroke();
      }
    }
    // bus stop near plaza (north street)
    const p = world.plaza;
    s.fillStyle = 'rgba(20,27,22,.18)';
    rr(s, p.x - 64, p.y + 6, 96, 30, 4); s.fill();
    s.fillStyle = '#4f5c52';
    rr(s, p.x - 62, p.y + 4, 92, 26, 3); s.fill();
    s.fillStyle = 'rgba(164,199,182,.3)';
    rr(s, p.x - 58, p.y + 7, 84, 17, 2); s.fill();
    s.fillStyle = '#e9dec7';
    rr(s, p.x - 58, p.y + 26, 84, 4, 1); s.fill();
    s.fillStyle = '#d7c9ac';
    s.font = '600 7px Outfit, sans-serif';
    s.textAlign = 'center';
    s.fillText('HALTESTELLE', p.x - 16, p.y + 19);
  }

  function drawOuterGreen(s) {
    // framing hedges + small lawns along the outer sidewalk
    s.fillStyle = '#6f8b5c';
    const bands = [
      [0, 22, WORLD_W, 18], [0, WORLD_H - 40, WORLD_W, 18],
      [22, 0, 18, WORLD_H], [WORLD_W - 40, 0, 18, WORLD_H],
    ];
    bands.forEach(([x, y, w, h]) => { rr(s, x, y, w, h, 6); s.fill(); });
    for (let i = 0; i < 45; i++) {
      s.fillStyle = rng() < .5 ? 'rgba(45,68,38,.35)' : 'rgba(160,184,132,.25)';
      s.beginPath();
      s.arc(20 + rng() * (WORLD_W - 40), rng() < .5 ? 24 : WORLD_H - 24, 4 + rng() * 5, 0, TAU);
      s.fill();
    }
    // outer trees
    for (let i = 0; i < 10; i++) {
      const x = 120 + i * 280;
      world.trees.push({ x, y: 46, r: 16 + rng() * 5, type: 'round', tone: rng(), sway: rng() * TAU, flowers: false });
      world.trees.push({ x, y: WORLD_H - 44, r: 16 + rng() * 5, type: 'round', tone: rng(), sway: rng() * TAU, flowers: false });
    }
    for (let i = 0; i < 5; i++) {
      const y = 300 + i * 420;
      world.trees.push({ x: 44, y, r: 15 + rng() * 4, type: 'round', tone: rng(), sway: rng() * TAU, flowers: false });
      world.trees.push({ x: WORLD_W - 44, y, r: 15 + rng() * 4, type: 'round', tone: rng(), sway: rng() * TAU, flowers: false });
    }
  }

  /* ============================ game logic ============================ */
  function toast(text, style = '', icon = 'info', ttl = 3400) {
    const el = document.createElement('div');
    el.className = 'toast' + (style ? ' ' + style : '');
    el.innerHTML = `<span class="toast-ico"><svg class="ico"><use href="#i-${icon}"/></svg></span><span>${text}</span>`;
    dom.toasts.appendChild(el);
    while (dom.toasts.children.length > 3) dom.toasts.firstElementChild.remove();
    setTimeout(() => {
      el.classList.add('is-out');
      setTimeout(() => el.remove(), 320);
    }, ttl);
  }

  function addTransaction(label, amount, icon = 'wallet') {
    state.transactions.unshift({ label, amount, day: state.day, time: clockString(state.time), icon });
    if (state.transactions.length > 24) state.transactions.length = 24;
  }

  function addMoney(amount, label, icon) {
    const n = Math.round(amount);
    state.money += n;
    if (n > 0) state.stats.earned += n;
    addTransaction(label, n, icon);
    updateHud();
  }

  function spend(amount, label, icon) {
    const n = Math.round(amount);
    if (state.money < n) { toast('Dafür reicht das Geld gerade nicht.', 'accent', 'wallet'); return false; }
    state.money -= n;
    addTransaction(label, -n, icon);
    updateHud();
    return true;
  }

  function changeStat(key, amount) {
    state[key] = clamp(state[key] + amount, 0, 100);
    if (key === 'hunger' && state.hunger > 34) state.lowWarn.hunger = false;
    if (key === 'energy' && state.energy > 30) state.lowWarn.energy = false;
    updateHud();
  }

  function applyRentIfDue() {
    if (state.rentDay >= state.day) return;
    if (state.time < 6 * 60) return;
    state.rentDay = state.day;
    state.money -= 24;
    addTransaction('Tagesmiete', -24, 'home');
    toast(`Miete abgebucht: <strong>−€ 24</strong> · Tag ${state.day}`, 'accent', 'home', 4200);
    changeStat('mood', -2);
  }

  function advanceMinutes(mins, decay = true) {
    if (!(mins > 0)) return;
    if (decay) {
      state.hunger = clamp(state.hunger - mins * 0.044, 0, 100);
      state.energy = clamp(state.energy - mins * 0.027, 0, 100);
      state.mood = clamp(state.mood - mins * 0.011, 0, 100);
    }
    state.time += mins;
    while (state.time >= 1440) { state.time -= 1440; state.day++; }
    applyRentIfDue();
    if (state.hunger < 20 && !state.lowWarn.hunger) {
      state.lowWarn.hunger = true;
      toast('Dein Magen knurrt. Zeit für etwas zu essen.', 'accent', 'food', 4200);
    }
    if (state.energy < 15 && !state.lowWarn.energy) {
      state.lowWarn.energy = true;
      toast('Du bist müde. Ein Nickerchen wäre klug.', 'accent', 'bolt', 4200);
    }
    updateHud();
  }

  function getPoi(id) { return world.pois.find(p => p.id === id); }

  function getJobTarget() {
    if (!state.job) return null;
    const j = state.job;
    if (j.type === 'courier') {
      if (j.stage === 'pickup') {
        const hub = getPoi('0,2-courier');
        return hub ? { x: hub.x, y: hub.y, name: hub.name, label: 'Paket abholen', icon: 'package' } : null;
      }
      const s = j.stops[j.index];
      return s ? { x: s.x, y: s.y, name: s.name, label: 'Paket abgeben', icon: 'package' } : null;
    }
    if (j.type === 'taxi') {
      if (j.stage === 'pickup') return Object.assign({ label: 'Fahrgast abholen', icon: 'users' }, j.pickup);
      return Object.assign({ label: 'Fahrgast absetzen', icon: 'pin' }, j.destination);
    }
    return null;
  }

  function getObjective() {
    const job = state.job;
    if (job) {
      const t = getJobTarget();
      if (!t) return null;
      if (job.type === 'courier') {
        const prog = job.stage === 'pickup' ? 'Tour annehmen' : `Stopp ${job.index + 1} von ${job.stops.length}`;
        return { x: t.x, y: t.y, kicker: 'KURIER · ' + prog.toUpperCase(), title: t.label, sub: t.name, icon: 'package', color: '#e8b155' };
      }
      return { x: t.x, y: t.y, kicker: 'TAXI · ' + (job.stage === 'pickup' ? 'ABHOLUNG' : 'FAHRT'), title: t.label, sub: t.name, icon: 'car', color: '#e8b155' };
    }
    if (state.tutorial === 0) {
      const cafe = getPoi('1,0-cafe');
      if (cafe) return { x: cafe.x, y: cafe.y, kicker: 'DEIN ERSTER TAG', title: 'Trink einen Kaffee', sub: 'Kaffee Kollektiv · 2 Min.', icon: 'coffee', color: '#e8b155' };
    }
    if (state.tutorial === 1) {
      return { x: null, y: null, kicker: 'DEIN ERSTER JOB', title: 'Öffne dein Phone', sub: 'Jobs · Auftrag annehmen', icon: 'phone', color: '#f26a4b' };
    }
    if (state.nora === 'accepted') {
      return { x: world.fountain.x, y: world.fountain.y + 76, kicker: 'VERABREDUNG', title: 'Nora treffen', sub: 'Brunnenplatz', icon: 'users', color: '#f26a4b' };
    }
    return null;
  }

  function completeCoffeeQuest() {
    if (state.tutorial !== 0) return;
    state.tutorial = 1;
    toast('Kaffee in der Hand. Jetzt fehlt nur noch ein Job.', 'good', 'coffee', 4200);
    setTimeout(() => toast('Öffne dein Phone und nimm deinen ersten Auftrag an.', 'accent', 'phone', 4600), 1200);
    updateHud();
    saveGame();
  }

  function completeJobQuest() {
    if (state.tutorial !== 1) return;
    state.tutorial = 2;
    changeStat('mood', 4);
    toast('Erster Auftrag angenommen. Die Stadt wartet.', 'good', 'spark', 4200);
    updateHud();
    saveGame();
  }

  /* ----------------------------- collision ---------------------------- */
  function rectCollides(x, y, r, rect) {
    const cx = clamp(x, rect.x, rect.x + rect.w);
    const cy = clamp(y, rect.y, rect.y + rect.h);
    return (x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r;
  }

  function collidesAt(x, y, r = 10) {
    if (x < 18 + r || y < 18 + r || x > WORLD_W - 18 - r || y > WORLD_H - 18 - r) return true;
    for (const rect of world.colliders) if (rectCollides(x, y, r, rect)) return true;
    for (const c of world.circleColliders) if (dist(x, y, c.x, c.y) < c.r + r) return true;
    for (const e of world.ellipseColliders) {
      const nx = (x - e.x) / (e.rx + r), ny = (y - e.y) / (e.ry + r);
      if (nx * nx + ny * ny < 1) return true;
    }
    return false;
  }

  function moveWithCollision(obj, nx, ny, r) {
    let hit = false;
    if (!collidesAt(nx, obj.y, r)) obj.x = nx; else hit = true;
    if (!collidesAt(obj.x, ny, r)) obj.y = ny; else hit = true;
    return hit;
  }

  /* ------------------------------- input ------------------------------ */
  function keyboardVector() {
    const k = input.keys;
    let x = 0, y = 0;
    if (k.has('a') || k.has('arrowleft')) x -= 1;
    if (k.has('d') || k.has('arrowright')) x += 1;
    if (k.has('w') || k.has('arrowup')) y -= 1;
    if (k.has('s') || k.has('arrowdown')) y += 1;
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    return { x, y, mag: Math.min(1, m), source: m ? 'key' : null };
  }

  function tiltVector() {
    if (!tilt.enabled || !tilt.permitted) return { x: 0, y: 0, mag: 0 };
    const m = Math.hypot(tilt.vec.x, tilt.vec.y);
    return { x: tilt.vec.x, y: tilt.vec.y, mag: m };
  }

  function getWalkInput() {
    const kb = keyboardVector();
    if (kb.mag > .08) return kb;
    if (input.joystick && (Math.abs(input.x) > .05 || Math.abs(input.y) > .05)) {
      return { x: input.x, y: input.y, mag: Math.min(1, Math.hypot(input.x, input.y)), source: 'stick' };
    }
    const tv = tiltVector();
    if (tv.mag > .14) {
      const m = Math.min(1, tv.mag * 1.25);
      return { x: tv.x / (tv.mag || 1) * m, y: tv.y / (tv.mag || 1) * m, mag: m, source: 'tilt' };
    }
    return { x: 0, y: 0, mag: 0, source: null };
  }

  function getDriveInput() {
    const kb = keyboardVector();
    if (kb.source === 'key') return { steer: kb.x, throttle: -kb.y, source: 'key' };
    if (input.joystick && (Math.abs(input.x) > .04 || Math.abs(input.y) > .04)) {
      return { steer: input.x, throttle: -input.y, source: 'stick' };
    }
    if (tilt.enabled && tilt.permitted) {
      const tv = tiltVector();
      if (tv.mag > .1) return { steer: clamp(tv.x * 1.3, -1, 1), throttle: clamp(.42 - tv.y * .8, -.35, 1), source: 'tilt' };
    }
    return { steer: 0, throttle: 0, source: null };
  }

  /* ----------------------------- tilt / gyro --------------------------- */
  function isLandscape() {
    return window.innerWidth > window.innerHeight;
  }

  function onOrientation(e) {
    if (e.beta == null || e.gamma == null) return;
    let x = e.gamma, y = e.beta;
    if (isLandscape()) { x = e.beta; y = e.gamma; }
    tilt.raw.x = x; tilt.raw.y = y; tilt.last = performance.now();
    if (!tilt.base) tilt.base = { x, y };
    const dx = x - tilt.base.x, dy = y - tilt.base.y;
    const tx = clamp(dx / 24, -1, 1);
    const ty = clamp(dy / 24, -1, 1);
    const dead = .08;
    tilt.vec.x = Math.abs(tx) < dead ? 0 : (tx - Math.sign(tx) * dead) / (1 - dead);
    tilt.vec.y = Math.abs(ty) < dead ? 0 : (ty - Math.sign(ty) * dead) / (1 - dead);
  }

  async function enableTilt(showMessage = true) {
    if (tilt.enabled) return true;
    if (!('DeviceOrientationEvent' in window)) {
      if (showMessage) toast('Dieses Gerät hat keinen Bewegungssensor.', 'accent', 'tilt', 3600);
      return false;
    }
    try {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== 'granted') {
          if (showMessage) toast('Bewegungszugriff wurde nicht erlaubt.', 'accent', 'tilt', 4000);
          return false;
        }
      }
      tilt.permitted = true;
      if (!tilt.listening) {
        window.addEventListener('deviceorientation', onOrientation, true);
        tilt.listening = true;
      }
      tilt.enabled = true;
      tilt.base = null;
      state.tilt = true;
      updateTiltUI();
      if (showMessage) toast('Neigung aktiv. Halte das Gerät kurz still zum Kalibrieren.', 'good', 'tilt', 4200);
      saveGame();
      return true;
    } catch (err) {
      if (showMessage) toast('Bewegungszugriff nicht möglich. Du kannst den Joystick nutzen.', 'accent', 'tilt', 4200);
      return false;
    }
  }

  function disableTilt() {
    tilt.enabled = false;
    state.tilt = false;
    tilt.vec.x = tilt.vec.y = 0;
    updateTiltUI();
    toast('Neigung aus. Joystick bleibt aktiv.', '', 'walk', 2800);
    saveGame();
  }

  function toggleTilt() {
    if (tilt.enabled) disableTilt(); else enableTilt(true);
  }

  function calibrateTilt() {
    if (!tilt.enabled) { toggleTilt(); return; }
    tilt.base = { x: tilt.raw.x, y: tilt.raw.y };
    toast('Neigung neu kalibriert.', 'good', 'tilt', 2600);
  }

  function updateTiltUI() {
    dom.tiltPill.classList.toggle('is-hidden', !tilt.enabled);
    [dom.tiltStart, dom.setTilt].forEach(el => {
      if (!el) return;
      el.classList.toggle('is-on', tilt.enabled);
      el.setAttribute('aria-checked', tilt.enabled ? 'true' : 'false');
    });
    const sw = dom.tiltStart.querySelector('.switch');
    if (sw) sw.classList.toggle('is-on', tilt.enabled);
  }

  /* ------------------------------- audio ------------------------------ */
  function initAudio() {
    if (audio.ready || state.sound === false) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audio.ctx = new AC();
      const master = audio.ctx.createGain();
      master.gain.value = .26;
      master.connect(audio.ctx.destination);
      audio.master = master;

      // city air
      const len = audio.ctx.sampleRate * 2;
      const buf = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
      const data = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + .012 * white) / 1.012;
        data[i] = last * 2.4;
      }
      const src = audio.ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const lp = audio.ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 540;
      const ambGain = audio.ctx.createGain(); ambGain.gain.value = .09;
      src.connect(lp).connect(ambGain).connect(master);
      src.start();
      audio.ambient = ambGain;

      // engine
      const osc = audio.ctx.createOscillator();
      osc.type = 'sawtooth'; osc.frequency.value = 46;
      const ef = audio.ctx.createBiquadFilter();
      ef.type = 'lowpass'; ef.frequency.value = 160;
      const eg = audio.ctx.createGain(); eg.gain.value = 0;
      osc.connect(ef).connect(eg).connect(master);
      osc.start();
      audio.engine = { osc, filter: ef, gain: eg };
      audio.ready = true;
    } catch (e) { /* audio is optional */ }
  }

  function sfx(kind) {
    if (!audio.ready || !state.sound) return;
    const c = audio.ctx, t = c.currentTime;
    const g = c.createGain();
    g.connect(audio.master);
    if (kind === 'click') {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 560;
      g.gain.setValueAtTime(.06, t); g.gain.exponentialRampToValueAtTime(.001, t + .08);
      o.connect(g); o.start(t); o.stop(t + .09);
    } else if (kind === 'cash') {
      [880, 1320].forEach((f, i) => {
        const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
        const gg = c.createGain();
        gg.gain.setValueAtTime(.0001, t + i * .06);
        gg.gain.exponentialRampToValueAtTime(.08, t + i * .06 + .01);
        gg.gain.exponentialRampToValueAtTime(.001, t + i * .06 + .18);
        o.connect(gg).connect(audio.master);
        o.start(t + i * .06); o.stop(t + i * .06 + .2);
      });
    } else if (kind === 'good') {
      [523, 659, 784].forEach((f, i) => {
        const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
        const gg = c.createGain();
        const at = t + i * .075;
        gg.gain.setValueAtTime(.0001, at);
        gg.gain.exponentialRampToValueAtTime(.07, at + .015);
        gg.gain.exponentialRampToValueAtTime(.001, at + .28);
        o.connect(gg).connect(audio.master);
        o.start(at); o.stop(at + .3);
      });
    } else if (kind === 'step') {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(55, t + .07);
      g.gain.setValueAtTime(.035, t); g.gain.exponentialRampToValueAtTime(.001, t + .08);
      o.connect(g); o.start(t); o.stop(t + .09);
    } else if (kind === 'miss') {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(95, t + .18);
      g.gain.setValueAtTime(.05, t); g.gain.exponentialRampToValueAtTime(.001, t + .2);
      o.connect(g); o.start(t); o.stop(t + .21);
    }
  }

  function updateEngineAudio(speed) {
    if (!audio.ready) return;
    const t = audio.ctx.currentTime;
    const active = state.player.car ? 1 : 0;
    audio.engine.gain.gain.setTargetAtTime(active * (0.012 + Math.min(1, Math.abs(speed) / 300) * .035), t, .12);
    audio.engine.osc.frequency.setTargetAtTime(40 + Math.min(1, Math.abs(speed) / 300) * 55, t, .12);
    audio.engine.filter.frequency.setTargetAtTime(120 + Math.min(1, Math.abs(speed) / 300) * 260, t, .12);
  }

  function setSound(on) {
    state.sound = on;
    if (on) { initAudio(); if (audio.ready && audio.ctx.state === 'suspended') audio.ctx.resume(); }
    if (audio.master) audio.master.gain.setTargetAtTime(on ? .26 : 0, audio.ctx.currentTime, .05);
    dom.setSound.classList.toggle('is-on', on);
    dom.setSound.setAttribute('aria-checked', on ? 'true' : 'false');
    saveGame();
  }

  /* ================================ jobs ============================== */
  function randomSpot(exclude = []) {
    const pool = world.deliverySpots.filter(s => !exclude.some(e => e && e.name === s.name));
    return pool[Math.floor(rng() * pool.length)] || world.deliverySpots[0];
  }

  function startCourierJob() {
    if (state.job) { toast('Du hast bereits einen Auftrag laufen.', 'accent', 'package'); return false; }
    state.job = { type: 'courier', stage: 'pickup', index: 0, stops: [], reward: 0 };
    completeJobQuest();
    toast('Kurier-Tour angenommen. Hol das Paket im Kurier Hub.', 'good', 'package', 4200);
    updateHud();
    saveGame();
    return true;
  }

  function pickupCourier() {
    const j = state.job;
    if (!j || j.type !== 'courier' || j.stage !== 'pickup') return;
    const stops = [];
    const used = [];
    for (let i = 0; i < 3; i++) {
      const spot = randomSpot(used);
      used.push(spot);
      stops.push({ x: spot.x, y: spot.y, name: spot.name });
    }
    j.stops = stops; j.stage = 'dropoff'; j.index = 0;
    sfx('good');
    toast('Drei Pakete an Bord. Erster Stopp ist markiert.', 'good', 'package', 3800);
    updateHud();
    saveGame();
  }

  function deliverCourier() {
    const j = state.job;
    if (!j || j.type !== 'courier' || j.stage !== 'dropoff') return;
    const stop = j.stops[j.index];
    addMoney(22, `Kurier · ${stop.name}`, 'package');
    state.stats.deliveries++;
    j.index++;
    if (j.index >= j.stops.length) {
      addMoney(18, 'Kurier · Tourbonus', 'spark');
      state.stats.jobs++;
      state.job = null;
      sfx('cash');
      toast('Tour abgeschlossen. <strong>+€ 84</strong> verdient.', 'good', 'package', 4600);
      changeStat('mood', 5);
    } else {
      sfx('cash');
      toast(`Paket abgegeben. Nächster Stopp: ${j.stops[j.index].name}`, 'good', 'check', 3800);
      changeStat('mood', 1);
    }
    updateHud();
    saveGame();
  }

  function startTaxiJob() {
    if (state.job) { toast('Du hast bereits einen Auftrag laufen.', 'accent', 'car'); return false; }
    const pickup = randomSpot();
    state.job = { type: 'taxi', stage: 'pickup', pickup: { x: pickup.x, y: pickup.y, name: pickup.name }, destination: null, fare: 0, index: 0 };
    completeJobQuest();
    if (!state.player.car) toast('Für Taxi-Fahrten brauchst du ein Auto. Am Taxistand steht eins.', 'accent', 'car', 4600);
    else toast('Taxi-Auftrag angenommen. Fahrgast ist markiert.', 'good', 'car', 3800);
    updateHud();
    saveGame();
    return true;
  }

  function pickupTaxi() {
    const j = state.job;
    if (!j || j.type !== 'taxi' || j.stage !== 'pickup') return;
    if (!state.player.car) { toast('Du brauchst ein Auto, um den Fahrgast mitzunehmen.', 'accent', 'car', 3600); return; }
    const destination = randomSpot([j.pickup]);
    const d = dist(j.pickup.x, j.pickup.y, destination.x, destination.y);
    const fare = Math.round(clamp(16 + d * 0.011, 18, 42));
    j.destination = { x: destination.x, y: destination.y, name: destination.name };
    j.stage = 'dropoff'; j.fare = fare;
    sfx('good');
    toast(`Fahrgast eingestiegen. Ziel: ${destination.name}`, 'good', 'users', 3800);
    updateHud();
    saveGame();
  }

  function deliverTaxi() {
    const j = state.job;
    if (!j || j.type !== 'taxi' || j.stage !== 'dropoff') return;
    const tip = state.mood >= 70 ? 4 : 0;
    const pay = j.fare + tip;
    addMoney(pay, 'Taxifahrt', 'car');
    if (tip) addMoney(tip, 'Trinkgeld', 'star');
    state.stats.rides++;
    state.stats.jobs++;
    state.job = null;
    sfx('cash');
    toast(`Fahrgast abgesetzt. <strong>+€ ${pay}</strong>${tip ? ' inkl. Trinkgeld' : ''}.`, 'good', 'car', 4400);
    changeStat('mood', 3);
    updateHud();
    saveGame();
  }

  function cancelJob() {
    if (!state.job) return;
    state.job = null;
    toast('Auftrag aufgegeben. Kein Stress.', '', 'info', 2800);
    updateHud();
    saveGame();
  }

  function performJobAction() {
    const t = getJobTarget();
    if (!t) return;
    const px = state.player.car ? state.player.car.x : state.player.x;
    const py = state.player.car ? state.player.car.y : state.player.y;
    if (dist(px, py, t.x, t.y) > 98) return;
    if (state.job.type === 'courier') {
      if (state.job.stage === 'pickup') pickupCourier(); else deliverCourier();
    } else if (state.job.type === 'taxi') {
      if (state.job.stage === 'pickup') pickupTaxi(); else deliverTaxi();
    }
  }

  /* ============================== sheets ============================== */
  function optionMarkup(o, i) {
    const price = o.price == null ? '' : `<span class="opt-price ${o.price === 0 ? 'free' : ''}">${o.price === 0 ? 'Gratis' : '€ ' + o.price}</span>`;
    return `<button class="sheet-option ${o.style || ''}" data-opt="${i}" ${o.disabled ? 'disabled' : ''}>
      <span class="opt-icon"><svg class="ico"><use href="#i-${o.icon || 'spark'}"/></svg></span>
      <span class="opt-copy"><strong>${o.label}</strong>${o.sub ? `<span>${o.sub}</span>` : ''}</span>
      ${price}
    </button>`;
  }

  function openSheet(cfg) {
    state.sheetOpen = true;
    dom.sheetKicker.textContent = cfg.kicker || 'IN DER STADT';
    dom.sheetTitle.textContent = cfg.title || '';
    dom.sheetDesc.textContent = cfg.desc || '';
    dom.sheetDesc.style.display = cfg.desc ? '' : 'none';
    dom.sheetMeta.innerHTML = (cfg.meta || []).map(m => `<span>${m}</span>`).join('');
    dom.sheetOptions.innerHTML = (cfg.options || []).map(optionMarkup).join('');
    dom.sheetFoot.textContent = cfg.foot || '';
    dom.sheetFoot.style.display = cfg.foot ? '' : 'none';
    dom.sheetOverlay.classList.remove('is-hidden');
    dom.sheetOverlay.setAttribute('aria-hidden', 'false');
    (cfg.options || []).forEach((o, i) => {
      const btn = dom.sheetOptions.querySelector(`[data-opt="${i}"]`);
      if (!btn) return;
      btn.addEventListener('click', () => {
        sfx('click');
        const keep = o.fn ? o.fn() : undefined;
        if (keep !== false) closeSheet();
      });
    });
    updateAction();
  }

  function closeSheet() {
    if (!state.sheetOpen) return;
    state.sheetOpen = false;
    dom.sheetOverlay.classList.add('is-hidden');
    dom.sheetOverlay.setAttribute('aria-hidden', 'true');
    updateAction();
  }

  function sleepToMorning() {
    closeSheet();
    dom.fade.classList.add('is-on');
    setTimeout(() => {
      state.day++;
      state.time = 7 * 60;
      state.energy = 100;
      state.hunger = Math.max(0, state.hunger - 14);
      state.mood = Math.min(100, state.mood + 5);
      applyRentIfDue();
      updateHud();
      saveGame();
      dom.fade.classList.remove('is-on');
      setTimeout(() => toast(`Guten Morgen. Tag ${state.day} beginnt.`, 'good', 'sun', 3800), 500);
    }, 620);
  }

  function nap() {
    closeSheet();
    advanceMinutes(120);
    changeStat('energy', 34);
    changeStat('hunger', -5);
    changeStat('mood', 2);
    toast('Kurzes Nickerchen. <strong>+34 Energie</strong>', 'good', 'moon', 3000);
    saveGame();
  }

  function cycleOutfit() {
    state.outfit = (state.outfit + 1) % OUTFITS.length;
    toast(`Outfit: <strong>${OUTFIT_NAMES[state.outfit]}</strong>`, '', 'shirt', 2400);
    updateAvatar();
    saveGame();
    return false;
  }

  function openPoiSheet(poi) {
    const kind = poi.kind;
    const base = { kicker: 'IN DER STADT', title: poi.name, meta: [], options: [], foot: 'Keine Waffen. Nur Entscheidungen.' };
    const night = state.time < 6 * 60 || state.time > 22 * 60;

    if (kind === 'home') {
      base.kicker = 'ZUHAUSE';
      base.desc = 'Deine kleine Wohnung riecht nach Regen und kaltem Kaffee. Draußen wird die Stadt langsam leise.';
      base.meta = ['Miete € 24 / Tag', `Outfit: ${OUTFIT_NAMES[state.outfit]}`];
      base.options = [
        { icon: 'moon', label: 'Bis morgen schlafen', sub: 'Energie voll · Hunger und Laune regenerieren', price: 0, fn: sleepToMorning, style: 'good' },
        { icon: 'bolt', label: 'Nickerchen machen', sub: '2 Stunden · +34 Energie', price: 0, fn: nap },
        { icon: 'shirt', label: 'Outfit wechseln', sub: 'Ein anderes Ich, dieselbe Stadt', price: 0, fn: cycleOutfit },
        { icon: 'coffee', label: 'Kurz durchatmen', sub: '30 Minuten · +6 Laune', price: 0, fn: () => { advanceMinutes(30); changeStat('mood', 6); toast('Ein ruhiger Moment für dich.', 'good', 'smile'); saveGame(); } },
      ];
    } else if (kind === 'cafe') {
      const open = state.time >= 7 * 60 && state.time <= 22 * 60;
      base.kicker = 'KAFFEE KOLLEKTIV';
      base.desc = 'Hinter der Theke zischt die Maschine. Auf der Kreidetafel steht heute: „Ein guter Tag beginnt mit einem schlechten Espresso.“';
      base.meta = ['Geöffnet 07–22', 'Barista-Schicht 08–18'];
      base.options = [
        { icon: 'coffee', label: 'Flat White', sub: '+16 Energie · +3 Hunger', price: 3, fn: () => {
          if (!spend(3, 'Flat White', 'coffee')) return false;
          changeStat('energy', 16); changeStat('hunger', 3); changeStat('mood', 2);
          state.stats.coffees++; sfx('cash');
          toast('Der erste Schluck fühlt sich nach einem Neuanfang an.', 'good', 'coffee', 3200);
          completeCoffeeQuest(); saveGame();
        } },
        { icon: 'food', label: 'Mittagsteller', sub: '+46 Hunger · +3 Laune', price: 12, fn: () => {
          if (!spend(12, 'Mittagsteller', 'food')) return false;
          advanceMinutes(25); changeStat('hunger', 46); changeStat('mood', 3); sfx('cash');
          toast('Hausgemacht, ehrlich, ein bisschen zu viel Soße.', 'good', 'food'); saveGame();
        } },
        { icon: 'coffee', label: 'Barista-Schicht', sub: open ? '5 Bestellungen · bis € 45' : 'Nur 08–18 Uhr', price: 0, disabled: !open, fn: startShift, style: 'accent' },
        { icon: 'users', label: 'Am Fenster sitzen', sub: '20 Minuten · +5 Laune', price: 0, fn: () => { advanceMinutes(20); changeStat('mood', 5); toast('Du schaust den Menschen beim Vorbeigehen zu.', '', 'smile'); saveGame(); } },
      ];
    } else if (kind === 'market') {
      base.kicker = 'FRISCHMARKT';
      base.desc = 'Alles, was du brauchst, steht in Reih und Glied. Die Kühltruhe summt in einem freundlichen Ton.';
      base.meta = ['Geöffnet 08–20', 'Frisch & lokal'];
      base.options = [
        { icon: 'food', label: 'Snack für unterwegs', sub: '+18 Hunger', price: 4, fn: () => { if (!spend(4, 'Snack', 'food')) return false; changeStat('hunger', 18); sfx('cash'); toast('Schnell, ehrlich, zufriedenstellend.', 'good', 'food'); saveGame(); } },
        { icon: 'cart', label: 'Wocheneinkauf', sub: '+52 Hunger · +3 Laune', price: 18, fn: () => { if (!spend(18, 'Wocheneinkauf', 'cart')) return false; advanceMinutes(20); changeStat('hunger', 52); changeStat('mood', 3); sfx('cash'); toast('Der Kühlschrank ist wieder kein Museum.', 'good', 'cart'); saveGame(); } },
        { icon: 'spark', label: 'Blumenstrauß', sub: '+12 Laune · passt auf jeden Tisch', price: 9, fn: () => { if (!spend(9, 'Blumenstrauß', 'spark')) return false; changeStat('mood', 12); sfx('cash'); toast('Gelbe Tulpen. Die Stadt wirkt gleich weicher.', 'good', 'spark'); saveGame(); } },
      ];
    } else if (kind === 'bakery') {
      base.kicker = 'KÖRNERWERK';
      base.desc = 'Es riecht nach Butter und warmem Mehl. Die Türglocke klingelt, als hättest du sie persönlich begrüßt.';
      base.meta = ['Geöffnet 06–18', 'Backstube'];
      base.options = [
        { icon: 'food', label: 'Croissant', sub: '+20 Hunger · +2 Laune', price: 4, fn: () => { if (!spend(4, 'Croissant', 'food')) return false; changeStat('hunger', 20); changeStat('mood', 2); sfx('cash'); toast('Butterig. Krümelig. Richtig.', 'good', 'food'); saveGame(); } },
        { icon: 'coffee', label: 'Kaffee to go', sub: '+15 Energie', price: 3, fn: () => { if (!spend(3, 'Kaffee to go', 'coffee')) return false; changeStat('energy', 15); sfx('cash'); toast('Ein Pappbecher voller Entschlossenheit.', 'good', 'coffee'); saveGame(); } },
        { icon: 'cart', label: 'Brot für zuhause', sub: '+25 Hunger · hält bis morgen', price: 5, fn: () => { if (!spend(5, 'Brot', 'cart')) return false; changeStat('hunger', 25); changeStat('mood', 2); sfx('cash'); toast('Noch warm. Du isst die Hälfte auf dem Heimweg.', 'good', 'food'); saveGame(); } },
      ];
    } else if (kind === 'pharmacy') {
      base.kicker = 'APOTHEKE AM MARKT';
      base.desc = 'Ruhiges Licht, saubere Regale. Die Apothekerin nickt dir zu, als wüsste sie, dass du zu wenig schläfst.';
      base.meta = ['Geöffnet 08–19', 'Ohne Rezept'];
      base.options = [
        { icon: 'bolt', label: 'Vitamine', sub: '+12 Energie', price: 6, fn: () => { if (!spend(6, 'Vitamine', 'pharmacy')) return false; changeStat('energy', 12); sfx('cash'); toast('Du fühlst dich sofort ein bisschen wacher.', 'good', 'bolt'); saveGame(); } },
        { icon: 'smile', label: 'Gute Ratschläge', sub: '+6 Laune · 10 Minuten', price: 0, fn: () => { advanceMinutes(10); changeStat('mood', 6); toast('„Trink Wasser. Und geh früher ins Bett.“', '', 'chat'); saveGame(); } },
      ];
    } else if (kind === 'bookshop') {
      base.kicker = 'SEITENWEISE';
      base.desc = 'Bücher bis unter die Decke. Ein Sessel steht so, als hätte er auf dich gewartet.';
      base.meta = ['Geöffnet 10–19', 'Inhaber: Jule'];
      base.options = [
        { icon: 'star', label: 'Roman kaufen', sub: '+16 Laune · 45 Minuten lesen', price: 14, fn: () => { if (!spend(14, 'Roman', 'star')) return false; advanceMinutes(45); changeStat('mood', 16); sfx('cash'); toast('Du liest drei Seiten und vergisst die Zeit.', 'good', 'star'); saveGame(); } },
        { icon: 'chat', label: 'Mit Jule reden', sub: '+4 Laune · 15 Minuten', price: 0, fn: () => { advanceMinutes(15); changeStat('mood', 4); toast('Jule empfiehlt dir ein Buch über Städte und Zufälle.', '', 'chat'); saveGame(); } },
      ];
    } else if (kind === 'gym') {
      base.kicker = 'KRAFTWERK';
      base.desc = 'Stahl, Schweiß und ein Bass, der irgendwo unter der Decke wohnt. Niemand hier trägt Waffen. Nur Wasserflaschen.';
      base.meta = ['Geöffnet 06–23', 'Tageskarte € 9'];
      base.options = [
        { icon: 'dumbbell', label: 'Training', sub: '+14 Laune · −12 Energie · 60 Min.', price: 9, disabled: state.energy < 18, fn: () => { if (!spend(9, 'Gym-Tag', 'dumbbell')) return false; advanceMinutes(60); changeStat('mood', 14); changeStat('energy', -12); sfx('good'); toast('Du hast mehr geschafft, als du dir vorgenommen hast.', 'good', 'dumbbell'); saveGame(); } },
        { icon: 'sun', label: 'Duschen', sub: '+6 Energie · +3 Laune · 15 Min.', price: 4, fn: () => { if (!spend(4, 'Dusche', 'sun')) return false; advanceMinutes(15); changeStat('energy', 6); changeStat('mood', 3); toast('Warmes Wasser, kühler Kopf.', 'good', 'sun'); saveGame(); } },
      ];
    } else if (kind === 'cinema') {
      base.kicker = 'LICHTSPIEL';
      base.desc = 'Roter Samt, Popcorn und ein Film, den du schon fast vergessen hast. Für zwei Stunden gehört die Stadt jemand anderem.';
      base.meta = ['Letzte Vorstellung 22:30', 'Saal 2'];
      base.options = [
        { icon: 'film', label: 'Abendfilm', sub: '+24 Laune · +8 Hunger · 105 Min.', price: 11, fn: () => { if (!spend(11, 'Kinoticket', 'film')) return false; advanceMinutes(105); changeStat('mood', 24); changeStat('hunger', 8); sfx('good'); toast('Der Abspann läuft. Du bleibst noch sitzen.', 'good', 'film'); saveGame(); } },
        { icon: 'food', label: 'Popcorn', sub: '+18 Hunger · +5 Laune', price: 5, fn: () => { if (!spend(5, 'Popcorn', 'food')) return false; changeStat('hunger', 18); changeStat('mood', 5); sfx('cash'); toast('Zu viel Butter. Genau richtig.', 'good', 'food'); saveGame(); } },
      ];
    } else if (kind === 'hotel') {
      base.kicker = 'HOTEL MORGEN';
      base.desc = 'Die Lobby riecht nach frischen Handtüchern und Fernweh. Manchmal muss man nicht weit weg, um anzukommen.';
      base.meta = ['Rezeption 24 h', 'Zimmer ab € 38'];
      base.options = [
        { icon: 'moon', label: 'Zimmer nehmen', sub: 'Bis morgen schlafen · Energie voll', price: 38, fn: () => { if (!spend(38, 'Hotelzimmer', 'home')) return false; setTimeout(sleepToMorning, 120); } },
        { icon: 'coffee', label: 'Nur in der Lobby sitzen', sub: '+5 Laune · 20 Minuten', price: 0, fn: () => { advanceMinutes(20); changeStat('mood', 5); toast('Du beobachtest Reisende mit zu vielen Taschen.', '', 'users'); saveGame(); } },
      ];
    } else if (kind === 'pool') {
      base.kicker = 'STADTBAD';
      base.desc = 'Chlor, Kacheln und das Echo von Wasser. Deine Gedanken werden langsamer, sobald du ins Becken steigst.';
      base.meta = ['Geöffnet 07–21', 'Schwimmbad'];
      base.options = [
        { icon: 'spark', label: 'Bahnenschwimmen', sub: '+16 Laune · −12 Energie · 45 Min.', price: 8, disabled: state.energy < 15, fn: () => { if (!spend(8, 'Stadtbad', 'spark')) return false; advanceMinutes(45); changeStat('mood', 16); changeStat('energy', -12); sfx('good'); toast('Vierzig Bahnen. Danach fühlt sich alles leichter an.', 'good', 'spark'); saveGame(); } },
        { icon: 'sun', label: 'Auf der Wiese liegen', sub: '+8 Laune · 30 Minuten', price: 4, fn: () => { if (!spend(4, 'Wiese', 'sun')) return false; advanceMinutes(30); changeStat('mood', 8); toast('Die Sonne trocknet deine Schultern.', 'good', 'sun'); saveGame(); } },
      ];
    } else if (kind === 'bistro') {
      base.kicker = 'BISTRO KLEIN';
      base.desc = 'Sechs Tische, eine offene Küche, ein Hund unter der Theke. Hier isst man, weil man Zeit hat.';
      base.meta = ['Geöffnet 12–23', 'Tageskarte'];
      base.options = [
        { icon: 'food', label: 'Pasta des Tages', sub: '+55 Hunger · +3 Laune', price: 14, fn: () => { if (!spend(14, 'Pasta', 'food')) return false; advanceMinutes(35); changeStat('hunger', 55); changeStat('mood', 3); sfx('cash'); toast('Zitrone, Butter, ein bisschen Magie.', 'good', 'food'); saveGame(); } },
        { icon: 'star', label: 'Kuchen', sub: '+10 Hunger · +8 Laune', price: 6, fn: () => { if (!spend(6, 'Kuchen', 'star')) return false; changeStat('hunger', 10); changeStat('mood', 8); sfx('cash'); toast('Der Hund bekommt keinen Krümel. Du schon.', 'good', 'star'); saveGame(); } },
        { icon: 'users', label: 'Ein Glas Wasser', sub: 'Fensterplatz · 20 Minuten', price: 0, fn: () => { advanceMinutes(20); changeStat('mood', 4); toast('Manchmal reicht ein Platz am Fenster.', '', 'users'); saveGame(); } },
      ];
    } else if (kind === 'markthalle') {
      base.kicker = 'MARKTHALLE';
      base.desc = 'Stände voller Oliven, Brot und Blumen. Die Händler*innen kennen sich beim Vornamen.';
      base.meta = ['Geöffnet 08–18', 'Wochenmarkt'];
      base.options = [
        { icon: 'cart', label: 'Marktbox', sub: '+55 Hunger · +3 Laune', price: 12, fn: () => { if (!spend(12, 'Marktbox', 'cart')) return false; changeStat('hunger', 55); changeStat('mood', 3); sfx('cash'); toast('Tomaten, Käse, ein Bund Basilikum.', 'good', 'cart'); saveGame(); } },
        { icon: 'coffee', label: 'Smoothie', sub: '+12 Energie', price: 5, fn: () => { if (!spend(5, 'Smoothie', 'coffee')) return false; changeStat('energy', 12); toast('Grün, kalt, überraschend gut.', 'good', 'coffee'); saveGame(); } },
      ];
    } else if (kind === 'garden') {
      base.kicker = 'GÄRTNEREI';
      base.desc = 'Gewächshäuser voller feuchter Luft. Ein kleiner Hund schläft zwischen den Tomatenstauden.';
      base.meta = ['Geöffnet 09–18', 'Zimmerpflanzen'];
      base.options = [
        { icon: 'spark', label: 'Zimmerpflanze kaufen', sub: '+10 Laune · ein grüner Mitbewohner', price: 10, fn: () => { if (!spend(10, 'Zimmerpflanze', 'spark')) return false; changeStat('mood', 10); sfx('cash'); toast('Du trägst eine Monstera nach Hause. Sie trägt dich zurück.', 'good', 'spark'); saveGame(); } },
        { icon: 'coffee', label: 'Kräutertee', sub: '+8 Energie · +2 Laune', price: 3, fn: () => { if (!spend(3, 'Kräutertee', 'coffee')) return false; changeStat('energy', 8); changeStat('mood', 2); toast('Minze, direkt aus dem Beet.', 'good', 'coffee'); saveGame(); } },
      ];
    } else if (kind === 'townhall') {
      base.kicker = 'RATHAUS';
      base.desc = 'Hohe Decken, leise Schritte, ein Schalter für alles und ein Formular für jeden Fall.';
      base.meta = ['Geöffnet 08–17', 'Bürgerbüro'];
      base.options = [
        { icon: 'map', label: 'Stadtarchiv ansehen', sub: '+5 Laune · 30 Minuten', price: 0, fn: () => { advanceMinutes(30); changeStat('mood', 5); toast('Alte Fotos deiner Straße, als hier noch Bäume ohne Autos standen.', '', 'map'); saveGame(); } },
        { icon: 'chat', label: 'Mit dem Bürgeramt reden', sub: '+2 Laune · 15 Minuten', price: 0, fn: () => { advanceMinutes(15); changeStat('mood', 2); toast('„Formular 3B. Aber eigentlich reicht auch ein Kaffee.“', '', 'chat'); saveGame(); } },
      ];
    } else if (kind === 'gallery') {
      base.kicker = 'GALERIE NORD';
      base.desc = 'Weiße Räume, große Fenster, Kunst, die man erst beim zweiten Blick versteht.';
      base.meta = ['Geöffnet 11–19', 'Wechselausstellung'];
      base.options = [
        { icon: 'spark', label: 'Ausstellung ansehen', sub: '+12 Laune · 40 Minuten', price: 5, fn: () => { if (!spend(5, 'Ausstellung', 'spark')) return false; advanceMinutes(40); changeStat('mood', 12); toast('Du bleibst vor einem Bild stehen, ohne zu wissen warum.', 'good', 'spark'); saveGame(); } },
        { icon: 'users', label: 'Nur kurz reinschauen', sub: '+5 Laune · 15 Minuten', price: 0, fn: () => { advanceMinutes(15); changeStat('mood', 5); toast('Die Aufsicht nickt. Du nickst zurück.', '', 'spark'); saveGame(); } },
      ];
    } else if (kind === 'music') {
      base.kicker = 'TONRAUM';
      base.desc = 'Aus einem Fenster im ersten Stock hört man jemanden Klavier üben. Es klingt nach einem guten Abend.';
      base.meta = ['Hofkonzert 19:30', 'Probebetrieb'];
      base.options = [
        { icon: 'sound', label: 'Hofkonzert hören', sub: '+15 Laune · 60 Minuten', price: 6, fn: () => { if (!spend(6, 'Hofkonzert', 'sound')) return false; advanceMinutes(60); changeStat('mood', 15); sfx('good'); toast('Drei Songs, ein lauer Abend, kein Handyempfang.', 'good', 'sound'); saveGame(); } },
        { icon: 'chat', label: 'Mit den Musiker*innen reden', sub: '+4 Laune · 20 Minuten', price: 0, fn: () => { advanceMinutes(20); changeStat('mood', 4); toast('„Musik ist auch nur Stadt, die man hören kann.“', '', 'chat'); saveGame(); } },
      ];
    } else if (kind === 'bench') {
      base.kicker = 'PARKBANK';
      base.desc = 'Von hier aus siehst du Bäume, Hunde und Menschen, die es nicht eilig haben.';
      base.meta = ['Kostenlos', 'Schattenplatz'];
      base.options = [
        { icon: 'users', label: 'Pause machen', sub: '+7 Laune · 20 Minuten', price: 0, fn: () => { advanceMinutes(20); changeStat('mood', 7); toast('Du atmest dreimal tief durch. Es hilft.', 'good', 'smile'); saveGame(); } },
        { icon: 'smile', label: 'Vögel beobachten', sub: '+5 Laune · 30 Minuten', price: 0, fn: () => { advanceMinutes(30); changeStat('mood', 5); toast('Ein Rotkehlchen streitet mit einem Spatz. Der Spatz gewinnt.', '', 'spark'); saveGame(); } },
      ];
    } else if (kind === 'fountain') {
      base.kicker = 'BRUNNENPLATZ';
      base.desc = 'Das Wasser plätschert seit Jahrzehnten dieselbe Melodie. Münzen liegen am Grund, Wünsche auch.';
      base.meta = ['Kostenlos', 'Ein Wunsch pro Tag'];
      const canWish = state.wishDay !== state.day;
      base.options = [
        { icon: 'spark', label: canWish ? 'Einen Wunsch machen' : 'Wunsch schon verbraucht', sub: canWish ? '+8 Laune · heute ist noch alles möglich' : 'Komm morgen wieder', price: 0, disabled: !canWish, fn: () => { state.wishDay = state.day; changeStat('mood', 8); toast('Du wirfst eine Münze. Sie sinkt langsam. Du lächelst.', 'good', 'spark'); saveGame(); } },
        { icon: 'users', label: 'Am Wasser sitzen', sub: '+3 Laune · 15 Minuten', price: 0, fn: () => { advanceMinutes(15); changeStat('mood', 3); toast('Ein Kind jagt eine Taube. Die Taube ist unbeeindruckt.', '', 'users'); saveGame(); } },
      ];
      if (state.nora === 'accepted') {
        base.options.unshift({ icon: 'users', label: 'Nora treffen', sub: 'Sie sitzt am Brunnen und wartet', price: 0, style: 'accent', fn: openNoraSheet });
      }
    } else if (kind === 'foodtruck') {
      base.kicker = 'BUDE 7';
      base.desc = 'Ein Foodtruck, ein Grill, ein Handy am Lautsprecher. Die Schlange ist kurz, der Duft lang.';
      base.meta = ['Geöffnet 11–22', 'Streetfood'];
      base.options = [
        { icon: 'food', label: 'Currywurst', sub: '+34 Hunger · +2 Laune', price: 7, fn: () => { if (!spend(7, 'Currywurst', 'food')) return false; changeStat('hunger', 34); changeStat('mood', 2); sfx('cash'); toast('Pappteller, Holzgabel, glücklich.', 'good', 'food'); saveGame(); } },
        { icon: 'coffee', label: 'Limonade', sub: '+8 Energie', price: 3, fn: () => { if (!spend(3, 'Limonade', 'coffee')) return false; changeStat('energy', 8); toast('Eiskalt und ein bisschen zu süß.', 'good', 'coffee'); saveGame(); } },
      ];
    } else if (kind === 'courier') {
      base.kicker = 'KURIER HUB';
      base.desc = 'Kartons, Rollen, ein Handscanner. Auf dem Whiteboard steht: „Nicht rennen. Aber auch nicht trödeln.“';
      base.meta = ['Aufträge 08–20', 'Zu Fuß oder mit Auto'];
      if (state.job && state.job.type === 'courier') {
        if (state.job.stage === 'pickup') {
          base.options = [{ icon: 'package', label: 'Pakete abholen', sub: 'Drei Stopps warten auf dich', price: 0, style: 'good', fn: () => { pickupCourier(); } }];
        } else {
          base.options = [{ icon: 'package', label: 'Tour läuft', sub: `Nächster Stopp: ${state.job.stops[state.job.index].name}`, price: 0, disabled: true, fn: () => {} }];
        }
      } else {
        base.options = [{ icon: 'package', label: 'Kurier-Tour starten', sub: '3 Stopps · € 22 pro Paket + Bonus', price: 0, style: 'good', fn: () => { if (startCourierJob()) return true; return false; } }];
      }
    } else if (kind === 'taxi') {
      base.kicker = 'TAXI 24';
      base.desc = 'Ein Funkgerät knackt, der Fahrer trinkt Kaffee aus einem Pappbecher. Der Wagen wartet draußen.';
      base.meta = ['24 h', 'Auto erforderlich'];
      if (state.job && state.job.type === 'taxi') {
        base.options = [{ icon: 'car', label: 'Tour läuft', sub: state.job.stage === 'pickup' ? 'Fahrgast abholen' : `Ziel: ${state.job.destination.name}`, price: 0, disabled: true, fn: () => {} }];
      } else {
        base.options = [{ icon: 'car', label: 'Taxi-Auftrag annehmen', sub: 'Fahrgast abholen · € 18–42', price: 0, style: 'good', fn: () => { if (startTaxiJob()) return true; return false; } }];
      }
    } else {
      base.options = [{ icon: 'info', label: 'Ort ansehen', sub: 'Hier passiert gerade nichts Besonderes.', price: 0 }];
    }
    if (night && ['cafe', 'market', 'bakery', 'pharmacy', 'bookshop', 'gym', 'cinema', 'hotel', 'pool', 'bistro', 'markthalle', 'garden', 'townhall', 'gallery', 'music'].includes(kind)) {
      const closed = ['market', 'bakery', 'pharmacy', 'bookshop', 'markthalle', 'garden', 'townhall', 'gallery'].includes(kind);
      if (closed) base.meta.push('Jetzt geschlossen');
    }
    openSheet(base);
  }

  function openNoraSheet() {
    closeSheet();
    setTimeout(() => {
      openSheet({
        kicker: 'VERABREDUNG · BRUNNENPLATZ',
        title: 'Nora',
        desc: '„Hey, du bist wirklich gekommen. Ich dachte schon, du lässt mich mit dem Brunnen reden.“ Sie lacht, und die Stadt wird für einen Moment leiser.',
        meta: ['Deine Nachbarin', 'Ein guter Abend'],
        options: [
          { icon: 'users', label: 'Zusammen am Brunnen sitzen', sub: '+18 Laune · 30 Minuten', price: 0, style: 'good', fn: () => {
            state.nora = 'met'; state.stats.meets++; advanceMinutes(30); changeStat('mood', 18); sfx('good');
            toast('Ihr redet, bis die Lichter angehen. <strong>+18 Laune</strong>', 'good', 'users', 4800);
            saveGame(); renderPhone();
          } },
          { icon: 'coffee', label: 'Kaffee holen', sub: '€ 3 · +10 Laune', price: 3, fn: () => {
            if (!spend(3, 'Kaffee für Nora', 'coffee')) return false;
            state.nora = 'met'; state.stats.meets++; advanceMinutes(25); changeStat('mood', 10); changeStat('energy', 8); sfx('cash');
            toast('Nora nimmt den Becher. „Genau richtig.“', 'good', 'coffee', 4200);
            saveGame(); renderPhone();
          } },
        ],
        foot: 'Keine Waffen. Keine Eile. Nur ein Abend.',
      });
    }, 120);
  }

  function acceptNora() {
    state.nora = 'accepted';
    toast('Treffen mit Nora markiert: Brunnenplatz.', 'good', 'users', 4200);
    renderPhone(); updateHud(); saveGame();
  }
  function declineNora() {
    state.nora = 'declined';
    toast('Vielleicht ein andermal. Die Stadt läuft nicht weg.', '', 'chat', 3200);
    renderPhone(); updateHud(); saveGame();
  }

  /* ============================== barista ============================= */
  function startShift() {
    closeSheet();
    if (state.shift) return;
    state.shift = { pos: .2, dir: 1, speed: .58, hits: 0, misses: 0, index: 0, results: [], done: false, finished: false };
    dom.shiftHits.textContent = '0';
    dom.shiftFeedback.textContent = 'Bereit für die erste Tasse.';
    dom.shiftFeedback.className = 'shift-feedback';
    dom.shiftDots.innerHTML = '<i></i><i></i><i></i><i></i><i></i>';
    dom.shiftNeedle.style.left = '20%';
    dom.shiftOverlay.classList.remove('is-hidden');
    dom.shiftOverlay.setAttribute('aria-hidden', 'false');
    dom.shiftCup.style.transform = 'scale(1)';
    sfx('good');
    updateAction();
  }

  function updateShift(dt) {
    const s = state.shift;
    if (!s || s.done) return;
    s.pos += s.dir * s.speed * dt;
    if (s.pos >= 1) { s.pos = 1; s.dir = -1; }
    if (s.pos <= 0) { s.pos = 0; s.dir = 1; }
    dom.shiftNeedle.style.left = (s.pos * 100).toFixed(2) + '%';
  }

  function serveCoffee() {
    const s = state.shift;
    if (!s || s.done) return;
    const hit = s.pos >= .37 && s.pos <= .63;
    s.results.push(hit);
    if (hit) { s.hits++; sfx('good'); } else { s.misses++; sfx('miss'); }
    dom.shiftHits.textContent = String(s.hits);
    dom.shiftFeedback.textContent = hit ? 'Perfekt. Die Crema sitzt.' : 'Daneben. Der nächste wird besser.';
    dom.shiftFeedback.className = 'shift-feedback ' + (hit ? 'good' : 'bad');
    const dots = dom.shiftDots.querySelectorAll('i');
    if (dots[s.index]) dots[s.index].className = hit ? 'hit' : 'miss';
    s.index++;
    s.speed = Math.min(1.03, s.speed + .075);
    s.pos = .5; s.dir = 1;
    if (s.index >= 5) {
      s.done = true;
      setTimeout(finishShift, 700);
    }
  }

  function finishShift() {
    const s = state.shift;
    if (!s) return;
    if (s.finished) return;
    s.finished = true;
    const pay = s.hits * 7 + (s.hits === 5 ? 10 : 0);
    if (pay > 0) addMoney(pay, 'Café-Schicht', 'coffee');
    state.stats.shifts++;
    state.stats.coffees += s.hits;
    advanceMinutes(60);
    changeStat('mood', s.hits >= 4 ? 8 : 3);
    dom.shiftOverlay.classList.add('is-hidden');
    dom.shiftOverlay.setAttribute('aria-hidden', 'true');
    state.shift = null;
    sfx(s.hits >= 3 ? 'cash' : 'click');
    toast(`Schicht beendet. <strong>${s.hits}/5</strong> perfekt · <strong>+€ ${pay}</strong>`, s.hits >= 4 ? 'good' : '', 'coffee', 4600);
    updateHud(); saveGame();
  }

  /* ============================== phone ============================== */
  function openPhone(page) {
    if (state.phase !== 'play') return;
    state.phoneOpen = true;
    dom.phoneOverlay.classList.remove('is-hidden');
    dom.phoneOverlay.setAttribute('aria-hidden', 'false');
    showPage(page || state.phonePage || 'home');
    updateAction();
    sfx('click');
  }

  function closePhone() {
    state.phoneOpen = false;
    dom.phoneOverlay.classList.add('is-hidden');
    dom.phoneOverlay.setAttribute('aria-hidden', 'true');
    updateAction();
  }

  function showPage(page) {
    state.phonePage = page;
    $$('.phone-page').forEach(el => el.classList.toggle('is-active', el.dataset.page === page));
    $$('.phone-tab').forEach(el => el.classList.toggle('is-active', el.dataset.tab === page));
    const titles = {
      home: ['Guten Morgen,<br>Mika.', 'DEIN PHONE'],
      jobs: ['Was liegt<br>an?', 'AUFTRÄGE'],
      map: ['Die Stadt<br>im Blick.', 'KARTE'],
      bank: ['Dein<br>Konto.', 'BANK'],
      settings: ['Einstel&shy;lungen.', 'SYSTEM'],
    };
    const t = titles[page] || titles.home;
    dom.phoneTitle.innerHTML = t[0];
    dom.phoneEyebrow.textContent = t[1] + ` · TAG ${state.day}`;
    const greet = greeting();
    if (page === 'home') dom.phoneTitle.innerHTML = greet + ',<br>Mika.';
    dom.phoneBody.scrollTop = 0;
    renderPhone();
    if (page === 'map') requestAnimationFrame(drawPhoneMap);
  }

  function greeting() {
    const h = (state.time / 60) % 24;
    if (h < 5) return 'Gute Nacht';
    if (h < 11) return 'Guten Morgen';
    if (h < 17) return 'Guten Tag';
    if (h < 22) return 'Guten Abend';
    return 'Gute Nacht';
  }

  function weatherInfo() {
    const h = (state.time / 60) % 24;
    if (h < 6 || h >= 22) return { temp: '13°', text: 'Klar · kühl', long: 'Klar · 13° · leichte Brise' };
    if (h < 9) return { temp: '15°', text: 'Morgendunst', long: 'Morgendunst · 15° · windstill' };
    if (h < 17) return { temp: '21°', text: 'Sonnig · leicht windig', long: 'Sonnig · 21° · leichte Brise' };
    if (h < 20) return { temp: '19°', text: 'Goldene Stunde', long: 'Goldene Stunde · 19° · klar' };
    return { temp: '16°', text: 'Klar · Abendluft', long: 'Klar · 16° · Abendluft' };
  }

  function renderPhone() {
    if (!state.phoneOpen) return;
    const w = weatherInfo();
    dom.phoneClock.textContent = clockString(state.time);
    dom.phoneWeather.textContent = w.text;
    dom.phoneSunset.textContent = 'Sonnenuntergang 20:42';
    dom.phoneEyebrow.textContent = (state.phonePage === 'settings' ? 'SYSTEM' : state.phonePage === 'jobs' ? 'AUFTRÄGE' : state.phonePage === 'map' ? 'KARTE' : state.phonePage === 'bank' ? 'BANK' : 'DEIN PHONE') + ` · TAG ${state.day}`;
    dom.phoneHunger.style.width = state.hunger + '%';
    dom.phoneEnergy.style.width = state.energy + '%';
    dom.phoneMood.style.width = state.mood + '%';
    dom.phoneDayMood.textContent = state.mood > 75 ? 'leicht' : state.mood > 50 ? 'ruhig' : state.mood > 25 ? 'müde' : 'durchwachsen';
    renderMessages();
    renderJobs();
    renderBank();
    dom.setTilt.classList.toggle('is-on', tilt.enabled);
    dom.setTilt.setAttribute('aria-checked', tilt.enabled ? 'true' : 'false');
    dom.setSound.classList.toggle('is-on', state.sound);
    dom.setSound.setAttribute('aria-checked', state.sound ? 'true' : 'false');
    if (state.phonePage === 'map') requestAnimationFrame(drawPhoneMap);
    updatePhoneBadge();
  }

  function renderMessages() {
    const cards = [];
    if (state.nora === 'new') {
      cards.push(`<article class="message-card">
        <div class="message-top"><span class="message-avatar">N</span><span class="message-name">Nora</span><span class="message-time">vor 5 Min.</span></div>
        <p>„Hey Mika! Bist du neu hier? Ich sitze oft am Brunnen im Stadtpark. Wenn du magst: Kaffee und ein bisschen Stadtgerede?“</p>
        <div class="message-actions"><button data-msg="accept-nora">Zusagen</button><button class="ghost" data-msg="decline-nora">Später</button></div>
      </article>`);
    } else if (state.nora === 'accepted') {
      cards.push(`<article class="message-card">
        <div class="message-top"><span class="message-avatar">N</span><span class="message-name">Nora</span><span class="message-time">heute</span></div>
        <p>„Super! Ich bin am Brunnen. Kein Stress, ich warte.“</p>
        <div class="message-actions"><button data-msg="go-map">Treffen auf Karte</button></div>
      </article>`);
    } else if (state.nora === 'met') {
      cards.push(`<article class="message-card is-done">
        <div class="message-top"><span class="message-avatar">N</span><span class="message-name">Nora</span><span class="message-time">heute</span></div>
        <p>„Danke für den Abend. Lass uns das wiederholen. Die Stadt ist schöner mit dir.“</p>
      </article>`);
    } else {
      cards.push(`<article class="message-card is-done">
        <div class="message-top"><span class="message-avatar">N</span><span class="message-name">Nora</span><span class="message-time">gestern</span></div>
        <p>„Vielleicht ein andermal. Ich bin oft im Park.“</p>
      </article>`);
    }
    cards.push(`<article class="message-card">
      <div class="message-top"><span class="message-avatar stadt">S</span><span class="message-name">Stadtleben</span><span class="message-time">08:00</span></div>
      <p>Willkommen in der Stadt. Keine Waffen. Keine Helden. Nur Alltag, Jobs und die kleinen Entscheidungen dazwischen.</p>
      <div class="message-actions"><button data-msg="go-jobs">Jobs ansehen</button><button class="ghost" data-msg="go-map">Karte</button></div>
    </article>`);
    if (state.tutorial === 0) {
      cards.push(`<article class="message-card">
        <div class="message-top"><span class="message-avatar cafe">K</span><span class="message-name">Kaffee Kollektiv</span><span class="message-time">heute</span></div>
        <p>Der erste Kaffee geht fast aufs Haus. € 3, ein freundliches Gesicht und ein Platz am Fenster warten im Norden.</p>
        <div class="message-actions"><button class="ghost" data-msg="go-home-close">Alles klar</button></div>
      </article>`);
    }
    dom.messageList.innerHTML = cards.join('');
    const count = (state.nora === 'new' ? 1 : 0) + (state.tutorial === 1 ? 1 : 0);
    dom.messageCount.textContent = count > 0 ? `${count} neu` : 'alles gelesen';
  }

  function renderJobs() {
    const job = state.job;
    if (job) {
      const target = getJobTarget();
      const total = job.type === 'courier' ? 3 : 1;
      const done = job.type === 'courier' ? job.index : 0;
      const segments = Array.from({ length: total }, (_, i) => `<i class="${i < done ? 'done' : ''}"></i>`).join('');
      const pay = job.type === 'courier' ? '€ 22 / Stopp + € 18 Bonus' : `€ ${job.fare || '18–42'} Fahrt`;
      dom.activeJob.innerHTML = `<div class="active-job">
        <div class="active-job-top">LAUFENDER AUFTRAG</div>
        <h3>${job.type === 'courier' ? 'Kurier-Tour' : 'Taxifahrt'}</h3>
        <p>${target ? target.label + ' · ' + target.name : 'Ziel wird geladen …'}</p>
        <div class="active-job-progress">${segments}</div>
        <div class="active-job-foot"><strong>${pay}</strong><button data-job="cancel">Aufgeben</button></div>
      </div>`;
    } else {
      dom.activeJob.innerHTML = '';
    }
    const canStart = !job;
    const cafeOpen = state.time >= 8 * 60 && state.time <= 18 * 60;
    const cafe = getPoi('1,0-cafe');
    const nearCafe = cafe && dist(state.player.x, state.player.y, cafe.x, cafe.y) < 110;
    dom.jobList.innerHTML = `
      <article class="job-card">
        <div class="job-top">
          <div class="job-icon courier"><svg class="ico"><use href="#i-package"/></svg></div>
          <div class="job-copy"><h4>Kurier-Tour</h4><p>Drei Pakete, drei Adressen. Zu Fuß oder mit dem Auto.</p>
            <div class="job-tags"><span class="job-tag">3 Stopps</span><span class="job-tag">Flexibel</span></div>
          </div>
          <div class="job-pay"><strong>€ 84</strong><span>pro Tour</span></div>
        </div>
        <div class="job-bottom"><span class="job-availability"><i></i>verfügbar</span><button class="job-start" data-job="courier" ${canStart ? '' : 'disabled'}>Starten</button></div>
      </article>
      <article class="job-card">
        <div class="job-top">
          <div class="job-icon taxi"><svg class="ico"><use href="#i-car"/></svg></div>
          <div class="job-copy"><h4>Taxi-Fahrt</h4><p>Fahrgäste durch die Stadt bringen. Ein Auto ist Pflicht.</p>
            <div class="job-tags"><span class="job-tag">Auto</span><span class="job-tag">18–42 €</span></div>
          </div>
          <div class="job-pay"><strong>€ 18+</strong><span>pro Fahrt</span></div>
        </div>
        <div class="job-bottom"><span class="job-availability ${state.player.car ? '' : 'closed'}"><i></i>${state.player.car ? 'Auto bereit' : 'Auto nötig'}</span><button class="job-start" data-job="taxi" ${canStart ? '' : 'disabled'}>Starten</button></div>
      </article>
      <article class="job-card">
        <div class="job-top">
          <div class="job-icon cafe"><svg class="ico"><use href="#i-coffee"/></svg></div>
          <div class="job-copy"><h4>Café-Schicht</h4><p>Fünf Bestellungen, eine ruhige Hand. Nur vor Ort.</p>
            <div class="job-tags"><span class="job-tag">08–18 Uhr</span><span class="job-tag">Timing</span></div>
          </div>
          <div class="job-pay"><strong>€ 45</strong><span>maximal</span></div>
        </div>
        <div class="job-bottom"><span class="job-availability ${cafeOpen && nearCafe ? '' : 'closed'}"><i></i>${!cafeOpen ? 'geschlossen' : nearCafe ? 'du bist da' : 'am Café'}</span><button class="job-start" data-job="cafe" ${canStart && cafeOpen && nearCafe ? '' : 'disabled'}>Schicht</button></div>
      </article>`;
  }

  function renderBank() {
    dom.bankBalance.textContent = fmtEuro(state.money);
    const todayIn = state.transactions.filter(t => t.day === state.day && t.amount > 0).reduce((a, b) => a + b.amount, 0);
    dom.bankIn.textContent = fmtEuro(todayIn);
    if (!state.transactions.length) {
      dom.bankList.innerHTML = '<div class="bank-empty">Noch keine Buchungen. Der Tag ist jung.</div>';
      return;
    }
    dom.bankList.innerHTML = state.transactions.map(t => `<div class="bank-row">
      <span class="bank-ico"><svg class="ico"><use href="#i-${t.icon || 'wallet'}"/></svg></span>
      <span class="bank-copy"><strong>${t.label}</strong><span>Tag ${t.day} · ${t.time}</span></span>
      <span class="bank-amount ${t.amount < 0 ? 'neg' : ''}">${t.amount > 0 ? '+' : ''}${fmtEuro(t.amount)}</span>
    </div>`).join('');
  }

  function updatePhoneBadge() {
    const count = (state.nora === 'new' ? 1 : 0) + (state.tutorial === 1 ? 1 : 0);
    dom.phoneBadge.classList.toggle('is-hidden', count === 0);
    dom.phoneBadge.textContent = String(count);
  }

  function drawPhoneMap() {
    const cvs = dom.phoneMap;
    const rect = cvs.getBoundingClientRect();
    if (!rect.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cvs.width = Math.round(rect.width * dpr);
    cvs.height = Math.round(rect.height * dpr);
    const c = cvs.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width, h = rect.height;
    const scale = Math.min(w / WORLD_W, h / WORLD_H);
    const ox = (w - WORLD_W * scale) / 2, oy = (h - WORLD_H * scale) / 2;
    c.fillStyle = '#c9c1b1'; c.fillRect(0, 0, w, h);
    c.save(); c.translate(ox, oy); c.scale(scale, scale);
    // blocks
    for (const b of world.blocks) {
      if (b.def.kind === 'park' || b.def.kind === 'park-small') c.fillStyle = '#9fb58a';
      else if (b.def.kind === 'plaza') c.fillStyle = '#e2d6bd';
      else c.fillStyle = '#eee7d7';
      rr(c, b.x, b.y, BLOCK, BLOCK, 8); c.fill();
      if (b.building) {
        c.fillStyle = '#b8a78d';
        for (const r of b.building.collide) { rr(c, r.x, r.y, r.w, r.h, 4); c.fill(); }
      }
    }
    const p = world.park;
    c.fillStyle = '#7fa8a5';
    c.beginPath(); c.ellipse(world.pond.x, world.pond.y, world.pond.rx, world.pond.ry, 0, 0, TAU); c.fill();
    c.fillStyle = '#5c8f91';
    c.beginPath(); c.arc(world.fountain.x, world.fountain.y, world.fountain.r, 0, TAU); c.fill();
    // trees
    c.fillStyle = 'rgba(83,112,71,.55)';
    for (const t of world.trees) { c.beginPath(); c.arc(t.x, t.y, Math.max(7, t.r * .8), 0, TAU); c.fill(); }
    // poi dots
    for (const poi of world.pois) {
      if (['bench', 'fountain', 'foodtruck'].includes(poi.kind)) continue;
      c.fillStyle = ['courier', 'taxi'].includes(poi.kind) ? '#3e6a55' : ['cafe', 'market', 'bakery', 'bistro', 'markthalle'].includes(poi.kind) ? '#b46248' : '#6e7a6a';
      c.beginPath(); c.arc(poi.x, poi.y, 11 / scale * .5, 0, TAU); c.fill();
    }
    // labels for key places
    c.font = `600 ${9 / scale}px Outfit, sans-serif`;
    c.textAlign = 'center'; c.fillStyle = 'rgba(35,44,37,.72)';
    const labels = [['Zuhause', world.pois.find(p => p.kind === 'home')], ['Kaffee', world.pois.find(p => p.kind === 'cafe')], ['Kurier', world.pois.find(p => p.kind === 'courier')], ['Taxi', world.pois.find(p => p.kind === 'taxi')], ['Park', { x: p.x + 170, y: p.y + 130 }], ['Brunnen', { x: world.fountain.x, y: world.fountain.y - 55 }]];
    labels.forEach(([text, po]) => { if (po) c.fillText(text, po.x, po.y - 13 / scale); });
    // target
    const obj = getObjective();
    if (obj && obj.x != null) {
      c.strokeStyle = '#d99c34'; c.lineWidth = 3 / scale;
      c.beginPath(); c.arc(obj.x, obj.y, 26 / scale, 0, TAU); c.stroke();
      c.fillStyle = '#d99c34';
      c.beginPath(); c.arc(obj.x, obj.y, 7 / scale, 0, TAU); c.fill();
    }
    // player
    const px = state.player.car ? state.player.car.x : state.player.x;
    const py = state.player.car ? state.player.car.y : state.player.y;
    c.save(); c.translate(px, py); c.rotate(state.player.car ? state.player.car.angle : state.player.angle);
    c.fillStyle = '#f26a4b';
    c.beginPath(); c.moveTo(14 / scale, 0); c.lineTo(-8 / scale, 8 / scale); c.lineTo(-4 / scale, 0); c.lineTo(-8 / scale, -8 / scale); c.closePath(); c.fill();
    c.strokeStyle = '#fff8ea'; c.lineWidth = 2 / scale; c.stroke();
    c.restore();
    c.restore();
    // frame
    c.strokeStyle = 'rgba(35,44,37,.12)'; c.lineWidth = 1; c.strokeRect(1, 1, w - 2, h - 2);
    dom.mapCaption.textContent = obj ? `Ziel: ${obj.title} · ${obj.sub}` : 'Kein aktives Ziel. Öffne Jobs für deinen nächsten Auftrag.';
  }

  /* ================================= HUD ============================= */
  function nearestPoi(radius = 84) {
    let best = null, bestD = radius;
    for (const poi of world.pois) {
      const d = dist(state.player.x, state.player.y, poi.x, poi.y);
      if (d < bestD) { bestD = d; best = poi; }
    }
    return best;
  }

  function nearestCar(radius = 92) {
    let best = null, bestD = radius;
    for (const car of world.cars) {
      if (car.driver) continue;
      const d = dist(state.player.x, state.player.y, car.x, car.y);
      if (d < bestD) { bestD = d; best = car; }
    }
    return best;
  }

  function enterCar(car) {
    state.player.car = car;
    car.driver = true;
    car.speed = 0;
    state.player.x = car.x; state.player.y = car.y;
    state.player.angle = car.angle;
    toast(`<strong>${car.name}</strong> · Aussteigen mit dem runden Button.`, '', 'car', 3200);
    sfx('click');
    updateAction(); updateHud(); saveGame();
  }

  function exitCar() {
    const car = state.player.car;
    if (!car) return;
    const offsets = [42, -42, 52, -52, -64];
    let placed = false;
    const perp = car.angle + Math.PI / 2;
    for (const off of offsets) {
      const x = car.x + Math.cos(perp) * off;
      const y = car.y + Math.sin(perp) * off;
      if (!collidesAt(x, y, 11)) { state.player.x = x; state.player.y = y; placed = true; break; }
    }
    if (!placed) { state.player.x = car.x; state.player.y = car.y; }
    state.player.angle = car.angle;
    car.driver = false;
    car.speed = 0;
    state.player.car = null;
    sfx('click');
    updateAction(); updateHud(); saveGame();
  }

  function getContext() {
    if (state.phase !== 'play' || state.phoneOpen || state.sheetOpen || state.shift) return null;
    const inCar = state.player.car;
    const px = inCar ? inCar.x : state.player.x;
    const py = inCar ? inCar.y : state.player.y;
    const jt = getJobTarget();
    if (jt && dist(px, py, jt.x, jt.y) < 98) {
      const short = { 'Paket abholen': 'Abholen', 'Paket abgeben': 'Abgeben', 'Fahrgast abholen': 'Abholen', 'Fahrgast absetzen': 'Absetzen' };
      return { label: short[jt.label] || jt.label, icon: jt.icon, fn: performJobAction, sub: jt.name, x: jt.x, y: jt.y, r: 42 };
    }
    if (inCar) return { label: 'Aussteigen', icon: 'walk', fn: exitCar, sub: inCar.name, x: inCar.x, y: inCar.y, r: 30 };
    if (state.nora === 'accepted' && dist(state.player.x, state.player.y, world.fountain.x, world.fountain.y + 66) < 110) {
      return { label: 'Nora', icon: 'users', fn: openNoraSheet, sub: 'Brunnenplatz', x: world.fountain.x, y: world.fountain.y + 66, r: 52 };
    }
    const poi = nearestPoi(86);
    if (poi) return { label: poi.verb, icon: poi.sprite, fn: () => openPoiSheet(poi), sub: poi.name, x: poi.x, y: poi.y, r: 28 };
    const car = nearestCar(92);
    if (car) return { label: 'Einsteigen', icon: 'car', fn: () => enterCar(car), sub: car.name, x: car.x, y: car.y, r: 34 };
    return null;
  }

  let actionContext = null;
  let actionSig = '';
  function updateAction() {
    const ctx = getContext();
    actionContext = ctx;
    if (!ctx) {
      dom.actionBtn.classList.add('is-hidden');
      dom.contextHint.classList.add('is-hidden');
      actionSig = '';
      return;
    }
    const sig = ctx.label + '|' + ctx.sub + '|' + ctx.icon;
    if (sig !== actionSig) {
      actionSig = sig;
      dom.actionLabel.textContent = ctx.label;
      dom.actionIcon.setAttribute('href', '#i-' + ctx.icon);
      dom.contextHint.innerHTML = `<kbd>E</kbd><span>${ctx.label}</span><span style="opacity:.5">${ctx.sub || ''}</span>`;
    }
    dom.actionBtn.classList.remove('is-hidden');
    dom.contextHint.classList.remove('is-hidden');
  }

  function updateAvatar() {
    dom.avatar.style.background = `linear-gradient(145deg, ${shade(OUTFITS[state.outfit], -25)}, ${OUTFITS[state.outfit]})`;
    dom.avatar.style.color = '#f8f3e7';
    dom.avatar.querySelector('span').textContent = 'MS';
  }

  function updateObjective() {
    const obj = getObjective();
    if (!obj) {
      dom.objective.classList.add('is-hidden');
      return;
    }
    dom.objective.classList.remove('is-hidden');
    dom.objKicker.textContent = obj.kicker;
    dom.objTitle.textContent = obj.title;
    dom.objSub.textContent = obj.sub;
    dom.objIcon.setAttribute('href', '#i-' + obj.icon);
    const iconWrap = dom.objIcon.closest('.objective-icon');
    if (iconWrap) {
      iconWrap.style.color = obj.color || 'var(--gold)';
      iconWrap.style.background = (obj.color || '#e8b155') + '24';
    }
    if (obj.x == null) {
      dom.objDist.textContent = 'PHONE';
    } else {
      const px = state.player.car ? state.player.car.x : state.player.x;
      const py = state.player.car ? state.player.car.y : state.player.y;
      dom.objDist.textContent = fmtDistance(dist(px, py, obj.x, obj.y));
    }
  }

  function updateHud() {
    dom.money.textContent = fmtEuro(state.money);
    dom.dateText.textContent = `${DAYS[dayIndex(state.day)]} · Tag ${state.day}`;
    dom.clockText.textContent = clockString(state.time);
    const w = weatherInfo();
    dom.weatherText.textContent = `${w.temp} ${w.text.split(' · ')[0].toLowerCase()}`;
    const setBar = (el, val, warn) => {
      el.style.width = clamp(val, 0, 100) + '%';
      el.closest('.need').classList.toggle('is-low', warn);
    };
    setBar(dom.barHunger, state.hunger, state.hunger < 20);
    setBar(dom.barEnergy, state.energy, state.energy < 15);
    setBar(dom.barMood, state.mood, state.mood < 18);
    const badge = (state.nora === 'new' ? 1 : 0) + (state.tutorial === 1 ? 1 : 0);
    dom.phoneBadge.classList.toggle('is-hidden', badge === 0);
    dom.phoneBadge.textContent = String(badge);
    dom.tiltPill.classList.toggle('is-hidden', !tilt.enabled);
    updateObjective();
    const car = state.player.car;
    dom.speedo.classList.toggle('is-hidden', !car);
    if (car) dom.speedVal.textContent = String(Math.round(Math.abs(car.speed) * .42));
    dom.phoneClock.textContent = clockString(state.time);
  }

  /* ================================ save ============================= */
  const SAVE_KEY = 'stadtleben.save.v1';

  function serializeGame() {
    const cars = {};
    world.cars.forEach(c => { cars[c.id] = { x: c.x, y: c.y, angle: c.angle }; });
    return {
      version: 1, savedAt: Date.now(),
      time: state.time, day: state.day, money: state.money,
      hunger: state.hunger, energy: state.energy, mood: state.mood,
      outfit: state.outfit, tutorial: state.tutorial, nora: state.nora,
      job: state.job, transactions: state.transactions, stats: state.stats,
      rentDay: state.rentDay, wishDay: state.wishDay,
      player: { x: state.player.x, y: state.player.y, angle: state.player.angle },
      carId: state.player.car ? state.player.car.id : null,
      cars, sound: state.sound, tilt: state.tilt,
    };
  }

  function saveGame() {
    if (resetting || state.phase !== 'play') return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(serializeGame())); } catch (e) { /* private mode */ }
  }

  function readSaveMeta() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || data.version !== 1) return null;
      pendingSave = data; hasSave = true;
      return data;
    } catch (e) { return null; }
  }

  function updateStartScreen() {
    if (hasSave && pendingSave) {
      dom.startBtnText.textContent = 'Weiterleben';
      dom.saveInfo.textContent = `Tag ${pendingSave.day} · ${fmtEuro(pendingSave.money)} · ${pendingSave.stats?.jobs || 0} Aufträge`;
      dom.resetLink.classList.remove('is-hidden');
    } else {
      dom.startBtnText.textContent = 'Leben starten';
      dom.saveInfo.textContent = '';
      dom.resetLink.classList.add('is-hidden');
    }
  }

  function applySave(data) {
    if (!data) return false;
    state.money = Number.isFinite(data.money) ? data.money : 180;
    state.time = Number.isFinite(data.time) ? data.time : 490;
    state.day = Number.isFinite(data.day) ? data.day : 1;
    state.hunger = clamp(Number(data.hunger) || 0, 0, 100);
    state.energy = clamp(Number(data.energy) || 0, 0, 100);
    state.mood = clamp(Number(data.mood) || 0, 0, 100);
    state.outfit = Number.isFinite(data.outfit) ? data.outfit : 0;
    state.tutorial = Number.isFinite(data.tutorial) ? data.tutorial : 0;
    state.nora = data.nora || 'new';
    state.job = data.job || null;
    state.transactions = Array.isArray(data.transactions) ? data.transactions : [];
    state.stats = Object.assign({ jobs: 0, deliveries: 0, rides: 0, coffees: 0, shifts: 0, meets: 0, earned: 0 }, data.stats || {});
    state.rentDay = Number.isFinite(data.rentDay) ? data.rentDay : state.day;
    state.wishDay = Number.isFinite(data.wishDay) ? data.wishDay : 0;
    state.sound = data.sound !== false;
    state.tilt = false;
    state.lowWarn = { hunger: state.hunger < 20, energy: state.energy < 15 };
    if (data.player) {
      state.player.x = Number(data.player.x) || 250;
      state.player.y = Number(data.player.y) || 470;
      state.player.angle = Number(data.player.angle) || 0;
    }
    if (data.cars && Array.isArray(world.cars)) {
      world.cars.forEach(c => {
        const sc = data.cars[c.id];
        if (sc) { c.x = sc.x; c.y = sc.y; c.angle = sc.angle; }
        c.driver = false;
      });
    }
    state.player.car = null;
    if (data.carId) {
      const car = world.cars.find(c => c.id === data.carId);
      if (car) {
        car.driver = true;
        state.player.car = car;
      }
    }
    state.phase = 'play';
    state.phoneOpen = false; state.sheetOpen = false; state.shift = null;
    dom.setSound.classList.toggle('is-on', state.sound);
    updateAvatar();
    updateHud();
    return true;
  }

  function resetProgress() {
    resetting = true;
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
    location.reload();
  }

  /* ============================== camera ============================= */
  function baseZoom() {
    const min = Math.min(viewport.w, viewport.h);
    return clamp(min / 720, .82, 1.06);
  }

  function resize() {
    viewport.w = Math.max(320, window.innerWidth);
    viewport.h = Math.max(320, window.innerHeight);
    viewport.dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    dom.canvas.width = Math.round(viewport.w * viewport.dpr);
    dom.canvas.height = Math.round(viewport.h * viewport.dpr);
    dom.canvas.style.width = viewport.w + 'px';
    dom.canvas.style.height = viewport.h + 'px';
    cam.zoom = baseZoom() * (state.phase === 'intro' ? 1.04 : 1);
    clampCamera();
    if (state.phoneOpen && state.phonePage === 'map') requestAnimationFrame(drawPhoneMap);
  }

  function clampCamera() {
    const vw = viewport.w / cam.zoom;
    const vh = viewport.h / cam.zoom;
    cam.x = vw >= WORLD_W ? WORLD_W / 2 : clamp(cam.x, vw / 2, WORLD_W - vw / 2);
    cam.y = vh >= WORLD_H ? WORLD_H / 2 : clamp(cam.y, vh / 2, WORLD_H - vh / 2);
  }

  function updateCamera(dt) {
    const car = state.player.car;
    const tx = car ? car.x : state.player.x;
    const ty = car ? car.y : state.player.y;
    let lookX = 0, lookY = 0;
    if (car) {
      lookX = Math.cos(car.angle) * car.speed * .16;
      lookY = Math.sin(car.angle) * car.speed * .16;
    } else {
      lookX = Math.cos(state.player.angle) * 8;
      lookY = Math.sin(state.player.angle) * 8;
    }
    const k = 1 - Math.exp(-(car ? 4.8 : 6.6) * dt);
    cam.x += (tx + lookX - cam.x) * k;
    cam.y += (ty + lookY - cam.y) * k;
    const wantZoom = baseZoom() * (car ? 1 - Math.min(.16, Math.abs(car.speed) / 1900) : 1);
    cam.zoom += (wantZoom - cam.zoom) * (1 - Math.exp(-3 * dt));
    clampCamera();
  }

  function worldToScreen(x, y) {
    return {
      x: (x - cam.x) * cam.zoom + viewport.w / 2,
      y: (y - cam.y) * cam.zoom + viewport.h / 2,
    };
  }

  /* =========================== world updates ========================= */
  function updateTimeFlow(dt) {
    state.timeAcc += dt * TIME_SCALE;
    const whole = Math.floor(state.timeAcc);
    if (whole > 0) {
      state.timeAcc -= whole;
      advanceMinutes(whole, true);
    }
  }

  function updatePlayerWalk(dt) {
    const p = state.player;
    const move = getWalkInput();
    const tired = state.energy < 12 ? .72 : 1;
    const speed = (input.sprint ? 208 : 148) * tired;
    const step = move.mag > .025 ? speed * move.mag * dt : 0;
    if (step > 0) {
      const nx = p.x + move.x * speed * dt;
      const ny = p.y + move.y * speed * dt;
      const hit = moveWithCollision(p, nx, ny, 10.5);
      const moved = dist(p.x, p.y, p.x + move.x * step, p.y + move.y * step);
      p.walk += moved * .16;
      state.stepAcc += moved;
      if (state.stepAcc > (input.sprint ? 30 : 25)) {
        state.stepAcc = 0;
        sfx('step');
      }
      if (hit && Math.abs(move.mag) > .5) cam.shake = Math.max(cam.shake, .9);
      p.angle = angleLerp(p.angle, Math.atan2(move.y, move.x), 1 - Math.exp(-14 * dt));
    } else {
      p.walk += dt * 1.4;
      state.stepAcc = 0;
    }
    p.moving = step > 0;
    p.speed = speed * move.mag;
  }

  function updatePlayerCar(dt) {
    const car = state.player.car;
    if (!car) return;
    const ctrl = getDriveInput();
    const throttle = ctrl.throttle;
    const steer = ctrl.steer;

    if (throttle > .02) car.speed += 268 * throttle * dt;
    else if (throttle < -.02) car.speed += 190 * throttle * dt;
    else car.speed *= Math.max(0, 1 - 1.75 * dt);

    if (input.sprint && Math.abs(car.speed) > 4) car.speed *= Math.max(0, 1 - 3.6 * dt);
    if (Math.abs(throttle) < .02) car.speed *= Math.max(0, 1 - .45 * dt);
    car.speed = clamp(car.speed, -132, 342);

    if (Math.abs(car.speed) > 4) {
      const grip = .3 + Math.min(1, Math.abs(car.speed) / 235);
      car.angle += steer * 2.15 * grip * Math.sign(car.speed) * dt;
    } else if (Math.abs(steer) > .1) {
      car.angle += steer * .5 * dt;
    }

    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    const hit = moveWithCollision(car, nx, ny, 17);
    if (hit) {
      if (Math.abs(car.speed) > 55) {
        cam.shake = Math.max(cam.shake, Math.min(7, Math.abs(car.speed) * .022));
        sfx('miss');
      }
      car.speed *= -.26;
    }
    state.player.x = car.x;
    state.player.y = car.y;
    state.player.angle = car.angle;
    dom.speedVal.textContent = String(Math.round(Math.abs(car.speed) * .42));
    updateEngineAudio(car.speed);
  }

  function loopPedPosition(p) {
    const e = BLOCK - p.inset * 2;
    const per = e * 4;
    let d = ((p.t % per) + per) % per;
    if (d < e) {
      p.x = p.block.x + p.inset + d;
      p.y = p.block.y + p.inset;
      p.angle = 0;
    } else if (d < e * 2) {
      p.x = p.block.x + BLOCK - p.inset;
      p.y = p.block.y + p.inset + (d - e);
      p.angle = Math.PI / 2;
    } else if (d < e * 3) {
      p.x = p.block.x + BLOCK - p.inset - (d - e * 2);
      p.y = p.block.y + BLOCK - p.inset;
      p.angle = Math.PI;
    } else {
      p.x = p.block.x + p.inset;
      p.y = p.block.y + BLOCK - p.inset - (d - e * 3);
      p.angle = -Math.PI / 2;
    }
  }

  function updatePeds(dt) {
    const px = state.player.car ? state.player.car.x : state.player.x;
    const py = state.player.car ? state.player.car.y : state.player.y;
    let hasBubble = world.peds.some(p => p.bubble > 0);
    for (const p of world.peds) {
      if (!p.idle) {
        p.t += p.dir * p.speed * dt;
        loopPedPosition(p);
        p.phase += dt * (2.4 + p.speed * .08);
      } else {
        p.phase += dt * 1.1;
      }
      if (p.bubble > 0) p.bubble -= dt;
      p.bubbleCd = (p.bubbleCd || 0) - dt;
      if (!p.idle && p.bubble <= 0 && p.bubbleCd <= 0 && !hasBubble && dist(px, py, p.x, p.y) < 126 && rng() < dt * 1.4) {
        p.bubble = 3.4;
        p.bubbleCd = 9 + rng() * 6;
        hasBubble = true;
      }
    }
  }

  function updateNpcCars(dt) {
    for (const car of world.npcCars) {
      car.d += car.speed * dt;
      const pt = pointOnLoop(car.loop, car.d);
      car.x = pt.x; car.y = pt.y; car.angle = pt.angle;
    }
  }

  function update(dt) {
    state.animTime += dt;
    updateTimeFlow(dt);
    if (state.player.car) updatePlayerCar(dt);
    else updatePlayerWalk(dt);
    updatePeds(dt);
    updateNpcCars(dt);
    cam.shake = Math.max(0, cam.shake - dt * 20);
    state.saveAcc += dt;
    if (state.saveAcc > 18) {
      state.saveAcc = 0;
      saveGame();
    }
  }

  /* ============================== drawing ============================ */
  function nightAmount(mins) {
    const h = (mins / 60) % 24;
    if (h < 4.5) return .8;
    if (h < 7) return .8 * (1 - smooth(4.5, 7, h));
    if (h < 18.6) return 0;
    if (h < 21.2) return .8 * smooth(18.6, 21.2, h);
    return .8;
  }

  function drawGlow(c, x, y, r, alpha, warm = '255,214,150') {
    if (alpha <= .002) return;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${warm},${alpha})`);
    g.addColorStop(.45, `rgba(${warm},${alpha * .36})`);
    g.addColorStop(1, `rgba(${warm},0)`);
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  }

  function drawTree(c, t, time) {
    const sway = Math.sin(time * 1.15 + t.sway) * 1.7;
    c.save();
    c.translate(t.x, t.y);
    c.fillStyle = 'rgba(22,30,24,.22)';
    c.beginPath(); c.ellipse(7, 7, t.r * .9, t.r * .48, 0, 0, TAU); c.fill();

    if (t.type === 'planter') {
      c.fillStyle = '#8b7a61';
      rr(c, -t.r * .54, -t.r * .3, t.r * 1.08, t.r * .75, 3); c.fill();
      c.fillStyle = '#6d5e49';
      rr(c, -t.r * .47, -t.r * .25, t.r * .94, t.r * .18, 2); c.fill();
    } else {
      c.fillStyle = '#6b4f39';
      rr(c, -2.2, -12, 4.4, 15, 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,.08)';
      c.fillRect(-1.4, -11, 1.3, 12);
    }

    const roundPalettes = [
      ['#507547', '#698f58', '#3f603c'],
      ['#597d4b', '#769a60', '#476a41'],
      ['#496f44', '#638755', '#365736'],
      ['#617f4a', '#839d62', '#48683f'],
    ];
    const pal = roundPalettes[Math.floor(t.tone * roundPalettes.length) % roundPalettes.length];
    const cy = -t.r * (t.type === 'planter' ? .48 : .76);
    c.fillStyle = pal[2];
    c.beginPath(); c.arc(sway * .5, cy + 1, t.r * .86, 0, TAU); c.fill();
    c.fillStyle = pal[0];
    c.beginPath(); c.arc(-t.r * .24 + sway, cy - 1, t.r * .66, 0, TAU); c.fill();
    c.beginPath(); c.arc(t.r * .28 + sway, cy - 2, t.r * .6, 0, TAU); c.fill();
    c.beginPath(); c.arc(sway, cy - t.r * .4, t.r * .67, 0, TAU); c.fill();
    c.fillStyle = pal[1];
    c.beginPath(); c.arc(-t.r * .22 + sway, cy - t.r * .34, t.r * .38, 0, TAU); c.fill();
    c.beginPath(); c.arc(t.r * .26 + sway, cy - t.r * .26, t.r * .3, 0, TAU); c.fill();
    c.fillStyle = 'rgba(224,240,197,.16)';
    c.beginPath(); c.arc(-t.r * .12 + sway, cy - t.r * .55, t.r * .22, 0, TAU); c.fill();

    if (t.type === 'cypress') {
      c.fillStyle = pal[2];
      c.beginPath(); c.ellipse(sway * .3, -t.r * .82, t.r * .55, t.r * 1.18, 0, 0, TAU); c.fill();
      c.fillStyle = pal[0];
      c.beginPath(); c.ellipse(sway, -t.r * .95, t.r * .27, t.r * .8, 0, 0, TAU); c.fill();
    }
    if (t.flowers) {
      const cols = ['#f2bfc1', '#f5d97b', '#e9e5d2'];
      for (let i = 0; i < 5; i++) {
        const a = i * 2.1 + t.sway;
        c.fillStyle = cols[i % cols.length];
        c.beginPath();
        c.arc(Math.cos(a) * t.r * .52 + sway, cy + Math.sin(a) * t.r * .34, 1.9, 0, TAU);
        c.fill();
      }
    }
    c.restore();
  }

  function drawLampPost(c, l, time, night) {
    c.save();
    c.translate(l.x, l.y);
    c.fillStyle = 'rgba(20,27,22,.22)';
    c.beginPath(); c.ellipse(3, 3, 7, 3.5, 0, 0, TAU); c.fill();
    c.strokeStyle = '#3c4740';
    c.lineWidth = 2.1;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -16); c.stroke();
    c.fillStyle = '#515e55';
    rr(c, -3.4, -20, 6.8, 5, 2); c.fill();
    c.fillStyle = night > .12 ? `rgba(255,222,166,${.65 + Math.sin(time * 2 + l.seed * 9) * .06})` : '#d8d2bd';
    c.beginPath(); c.arc(0, -17.4, 2.1, 0, TAU); c.fill();
    c.restore();
  }

  function drawPerson(c, o) {
    const moving = !!o.moving;
    const swing = Math.sin(o.phase) * (moving ? 2.8 : .5);
    c.save();
    c.translate(o.x, o.y);
    c.fillStyle = 'rgba(18,25,20,.26)';
    c.beginPath(); c.ellipse(1, 2, 7.2, 3.8, 0, 0, TAU); c.fill();
    c.rotate((o.angle || 0) + Math.PI / 2);
    if (o.scale) c.scale(o.scale, o.scale);

    c.fillStyle = shade(o.color, -34);
    rr(c, -5.4, 2 + swing * .34, 4.2, 7.2, 2.1); c.fill();
    rr(c, 1.2, 2 - swing * .34, 4.2, 7.2, 2.1); c.fill();
    c.fillStyle = '#2b2c29';
    rr(c, -5.6, 7.2 + swing * .34, 4.7, 2.5, 1.2); c.fill();
    rr(c, 1, 7.2 - swing * .34, 4.7, 2.5, 1.2); c.fill();

    c.strokeStyle = shade(o.color, -8);
    c.lineWidth = 3.2;
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(-6, -6); c.lineTo(-8, 2 - swing * .5); c.stroke();
    c.beginPath(); c.moveTo(6, -6); c.lineTo(8, 2 + swing * .5); c.stroke();

    c.fillStyle = o.color;
    rr(c, -6.4, -9.2, 12.8, 12.4, 4.8); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.2)';
    c.lineWidth = .8;
    rr(c, -6.4, -9.2, 12.8, 12.4, 4.8); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.11)';
    rr(c, -4.9, -8.3, 9.8, 2.2, 1.1); c.fill();

    if (o.bag) {
      c.fillStyle = '#8a6a46';
      rr(c, 6.2, -7.4, 4.1, 7.2, 1.5); c.fill();
      c.strokeStyle = '#5b452e'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(7.1, -7.4); c.lineTo(6.1, -2.2); c.stroke();
    }

    c.fillStyle = o.skin;
    c.beginPath(); c.arc(0, -11.4, 5.2, 0, TAU); c.fill();
    c.fillStyle = o.hair || '#3d2c23';
    c.beginPath(); c.arc(0, -12.7, 5.1, Math.PI * .96, Math.PI * 2.04); c.fill();
    c.beginPath(); c.arc(-2.5, -14.2, 2.5, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.18)';
    c.beginPath(); c.arc(-1.7, -12.8, 1.15, 0, TAU); c.fill();
    c.restore();
  }

  function drawPed(c, p, time) {
    drawPerson(c, {
      x: p.x, y: p.y, angle: p.angle, color: p.color, skin: p.skin,
      phase: p.phase, moving: !p.idle, bag: p.bag, scale: .94,
    });
    if (p.bubble > 0) {
      const text = p.phrase.length > 25 ? p.phrase.slice(0, 24) + '…' : p.phrase;
      c.save();
      c.font = '600 8px Outfit, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const tw = c.measureText(text).width;
      const bw = tw + 13;
      c.fillStyle = 'rgba(250,246,236,.95)';
      rr(c, p.x - bw / 2, p.y - 50, bw, 16, 6); c.fill();
      c.beginPath();
      c.moveTo(p.x - 3, p.y - 35);
      c.lineTo(p.x + 4, p.y - 35);
      c.lineTo(p.x, p.y - 30);
      c.closePath(); c.fill();
      c.fillStyle = '#2d372f';
      c.fillText(text, p.x, p.y - 42);
      c.restore();
    }
  }

  function carDims(car) {
    if (car.type === 'van') return { l: 58, w: 26 };
    if (car.type === 'wagon') return { l: 51, w: 23.5 };
    if (car.type === 'taxi') return { l: 47, w: 23 };
    return { l: 44, w: 22 };
  }

  function drawCar(c, car, night) {
    const { l, w } = carDims(car);
    c.save();
    c.translate(car.x, car.y);
    c.fillStyle = 'rgba(17,23,19,.3)';
    c.beginPath(); c.ellipse(4, 5.5, l * .53, w * .58, car.angle, 0, TAU); c.fill();
    c.rotate(car.angle);

    c.fillStyle = '#222724';
    rr(c, -l * .31 - 4, -w * .58, 9, 4.8, 2); c.fill();
    rr(c, l * .31 - 5, -w * .58, 9, 4.8, 2); c.fill();
    rr(c, -l * .31 - 4, w * .58 - 4.8, 9, 4.8, 2); c.fill();
    rr(c, l * .31 - 5, w * .58 - 4.8, 9, 4.8, 2); c.fill();

    c.fillStyle = shade(car.color, 7);
    rr(c, -l / 2, -w / 2, l, w, 8); c.fill();
    c.strokeStyle = shade(car.color, -40);
    c.lineWidth = 1.1;
    rr(c, -l / 2, -w / 2, l, w, 8); c.stroke();

    c.fillStyle = shade(car.color, 23);
    c.beginPath();
    c.moveTo(-l * .08, -w * .48);
    c.lineTo(l * .22, -w * .34);
    c.lineTo(l * .22, w * .34);
    c.lineTo(-l * .08, w * .48);
    c.closePath(); c.fill();

    c.fillStyle = shade(car.color, -24);
    rr(c, -l * .3, -w * .36, l * .43, w * .72, 5); c.fill();
    c.fillStyle = 'rgba(188,220,219,.58)';
    rr(c, l * .11, -w * .3, l * .115, w * .6, 2); c.fill();
    c.fillStyle = 'rgba(168,205,209,.43)';
    rr(c, -l * .33, -w * .29, l * .07, w * .58, 2); c.fill();

    if (car.type === 'taxi') {
      c.fillStyle = '#f4d982';
      rr(c, -5, -w * .53, 11, 4.6, 2); c.fill();
      c.fillStyle = 'rgba(40,45,38,.7)';
      c.fillRect(-1.8, -w * .53 + 1.8, 4.4, 1.1);
    }
    if (car.type === 'van') {
      c.strokeStyle = 'rgba(53,58,51,.28)';
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(l * .03, -w * .46); c.lineTo(l * .03, w * .46); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.07)';
      rr(c, l * .06, -w * .4, l * .33, w * .8, 3); c.fill();
    }

    c.fillStyle = '#ffe9ae';
    c.beginPath(); c.arc(l / 2 - 3.2, -w * .29, 2.1, 0, TAU); c.fill();
    c.beginPath(); c.arc(l / 2 - 3.2, w * .29, 2.1, 0, TAU); c.fill();
    c.fillStyle = '#bc4b3d';
    c.beginPath(); c.arc(-l / 2 + 3, -w * .29, 1.7, 0, TAU); c.fill();
    c.beginPath(); c.arc(-l / 2 + 3, w * .29, 1.7, 0, TAU); c.fill();

    if (car.driver) {
      c.fillStyle = 'rgba(226,176,141,.75)';
      c.beginPath(); c.arc(-2, -w * .17, 2.7, 0, TAU); c.fill();
      c.fillStyle = 'rgba(57,42,34,.8)';
      c.beginPath(); c.arc(-2.5, -w * .17 - .8, 1.7, 0, TAU); c.fill();
    }
    if (state.player.car === car) {
      c.strokeStyle = 'rgba(246,240,228,.45)';
      c.lineWidth = 1.2;
      rr(c, -l / 2 - 1.5, -w / 2 - 1.5, l + 3, w + 3, 9); c.stroke();
    }
    c.restore();
  }

  function drawGroundMarkers(c, time) {
    const obj = getObjective();
    if (obj && obj.x != null) {
      const pulse = 1 + Math.sin(time * 3.2) * .09;
      c.save();
      c.strokeStyle = (obj.color || '#e8b155') + '88';
      c.lineWidth = 2;
      c.setLineDash([7, 7]);
      c.beginPath(); c.arc(obj.x, obj.y, 29 * pulse, 0, TAU); c.stroke();
      c.setLineDash([]);
      c.fillStyle = (obj.color || '#e8b155') + '1f';
      c.beginPath(); c.arc(obj.x, obj.y, 24, 0, TAU); c.fill();
      c.restore();
    }
    if (actionContext && !state.player.car) {
      c.save();
      c.strokeStyle = 'rgba(246,240,228,.65)';
      c.lineWidth = 1.4;
      c.setLineDash([3, 5]);
      c.beginPath(); c.arc(actionContext.x, actionContext.y, 22 + Math.sin(time * 4) * 2, 0, TAU); c.stroke();
      c.restore();
    }
  }

  function drawObjectiveBeacon(c, time) {
    const obj = getObjective();
    if (!obj || obj.x == null) return;
    const bob = Math.sin(time * 3.4) * 4;
    c.save();
    c.translate(obj.x, obj.y - 54 + bob);
    c.fillStyle = 'rgba(20,29,23,.42)';
    c.beginPath(); c.arc(0, 36 - bob, 5, 0, TAU); c.fill();
    c.fillStyle = obj.color || '#e8b155';
    c.beginPath();
    c.moveTo(0, 15);
    c.lineTo(-8, 2);
    c.lineTo(-3.4, 2);
    c.lineTo(-3.4, -10);
    c.lineTo(3.4, -10);
    c.lineTo(3.4, 2);
    c.lineTo(8, 2);
    c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,250,238,.72)';
    c.lineWidth = 1;
    c.stroke();
    c.fillStyle = 'rgba(255,250,238,.9)';
    c.beginPath(); c.arc(0, -3.5, 1.7, 0, TAU); c.fill();
    c.restore();
  }

  function drawLighting(c, time, view) {
    const n = nightAmount(state.time);
    if (n < .015) return;
    const h = (state.time / 60) % 24;
    const dusk = h > 18.1 && h < 21.4 ? Math.sin((h - 18.1) / 3.3 * Math.PI) * .09 : 0;
    if (dusk > .005) {
      c.fillStyle = `rgba(255,129,76,${dusk})`;
      c.fillRect(view.x - 60, view.y - 60, view.w + 120, view.h + 120);
    }
    c.fillStyle = `rgba(12,21,34,${n * .6})`;
    c.fillRect(view.x - 60, view.y - 60, view.w + 120, view.h + 120);

    c.save();
    c.globalCompositeOperation = 'lighter';
    const mx = 130;
    for (const l of world.lamps) {
      if (l.x < view.x - mx || l.x > view.x + view.w + mx || l.y < view.y - mx || l.y > view.y + view.h + mx) continue;
      drawGlow(c, l.x, l.y - 14, 92, .5 * n);
      drawGlow(c, l.x, l.y - 14, 32, .45 * n, '255,232,184');
    }
    for (const b of world.buildings) {
      if (b.x < view.x - 180 || b.x > view.x + view.w + 180 || b.y < view.y - 180 || b.y > view.y + view.h + 180) continue;
      const door = b.door;
      drawGlow(c, door.x, door.y - 6, 42, .28 * n);
      const pr = mulberry32(seedFrom(b.name));
      const count = 2 + Math.floor(pr() * 3);
      for (let i = 0; i < count; i++) {
        if (pr() < .35) continue;
        const wx = b.x + 18 + pr() * Math.max(10, b.w - 36);
        const wy = b.y + b.h - 4;
        c.fillStyle = `rgba(255,214,151,${.62 * n})`;
        c.fillRect(wx, wy, 6, 3.2);
        drawGlow(c, wx + 3, wy + 1.6, 18, .3 * n);
      }
    }
    for (const car of world.npcCars) {
      const fx = car.x + Math.cos(car.angle) * 22;
      const fy = car.y + Math.sin(car.angle) * 22;
      drawGlow(c, fx, fy, 26, .17 * n, '255,227,171');
    }
    const pc = state.player.car;
    if (pc) {
      c.save();
      c.translate(pc.x, pc.y);
      c.rotate(pc.angle);
      const beam = c.createLinearGradient(16, 0, 190, 0);
      beam.addColorStop(0, `rgba(255,236,189,${.19 * n})`);
      beam.addColorStop(.55, `rgba(255,224,155,${.07 * n})`);
      beam.addColorStop(1, 'rgba(255,214,140,0)');
      c.fillStyle = beam;
      c.beginPath();
      c.moveTo(16, -7);
      c.lineTo(188, -53);
      c.lineTo(188, 53);
      c.lineTo(16, 7);
      c.closePath(); c.fill();
      c.restore();
      drawGlow(c, pc.x + Math.cos(pc.angle) * 24, pc.y + Math.sin(pc.angle) * 24, 42, .34 * n);
    }
    c.restore();
  }

  function drawAmbient(c, time) {
    const w = viewport.w, h = viewport.h;
    c.save();
    c.globalAlpha = .19;
    for (let i = 0; i < 10; i++) {
      const x = ((i * 197 + time * (6 + i * 1.1)) % (w + 90)) - 45;
      const y = ((i * 143 + Math.sin(time * .55 + i * 1.7) * 26 + time * 3.2) % (h + 90)) - 45;
      c.fillStyle = i % 2 ? '#f2e4c9' : '#a7bf92';
      c.beginPath();
      c.ellipse(x, y, 2.7, 1.25, Math.sin(time * .8 + i) * 1.7, 0, TAU);
      c.fill();
    }
    c.restore();
  }

  function drawEdgeObjective(c, time) {
    const obj = getObjective();
    if (!obj || obj.x == null) return;
    const p = worldToScreen(obj.x, obj.y);
    const w = viewport.w, h = viewport.h;
    const m = 68;
    if (p.x > m && p.x < w - m && p.y > m && p.y < h - m) return;
    const cx = w / 2, cy = h / 2;
    const dx = p.x - cx, dy = p.y - cy;
    const tx = Math.abs(dx) > .001 ? ((dx > 0 ? w - m - cx : m - cx) / dx) : Infinity;
    const ty = Math.abs(dy) > .001 ? ((dy > 0 ? h - m - cy : m - cy) / dy) : Infinity;
    const k = Math.min(Math.abs(tx), Math.abs(ty));
    const ex = cx + dx * k;
    const ey = cy + dy * k;
    const ang = Math.atan2(dy, dx);
    c.save();
    c.translate(ex, ey);
    c.fillStyle = 'rgba(18,28,22,.82)';
    c.strokeStyle = 'rgba(232,177,85,.5)';
    c.lineWidth = 1;
    c.beginPath(); c.arc(0, 0, 18, 0, TAU); c.fill(); c.stroke();
    c.rotate(ang);
    c.fillStyle = obj.color || '#e8b155';
    c.beginPath();
    c.moveTo(9, 0); c.lineTo(-4, -6.5); c.lineTo(-1.5, 0); c.lineTo(-4, 6.5);
    c.closePath(); c.fill();
    c.restore();

    const distText = fmtDistance(dist(state.player.car ? state.player.car.x : state.player.x, state.player.car ? state.player.car.y : state.player.y, obj.x, obj.y));
    c.save();
    c.font = '600 9px Outfit, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const lx = ex - Math.cos(ang) * 34;
    const ly = ey - Math.sin(ang) * 34;
    const tw = c.measureText(distText).width;
    c.fillStyle = 'rgba(18,28,22,.7)';
    rr(c, lx - tw / 2 - 6, ly - 8, tw + 12, 16, 8); c.fill();
    c.fillStyle = 'rgba(246,240,228,.85)';
    c.fillText(distText, lx, ly + .5);
    c.restore();
  }

  function render(time) {
    const c = dom.ctx;
    const w = viewport.w, h = viewport.h;
    c.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#1b261f';
    c.fillRect(0, 0, w, h);

    const shake = cam.shake > .15 ? cam.shake : 0;
    const sx = shake ? (Math.random() - .5) * shake : 0;
    const sy = shake ? (Math.random() - .5) * shake : 0;
    const vw = w / cam.zoom, vh = h / cam.zoom;
    const view = { x: cam.x - vw / 2, y: cam.y - vh / 2, w: vw, h: vh };
    const sourceX = clamp(view.x, 0, Math.max(0, WORLD_W - vw));
    const sourceY = clamp(view.y, 0, Math.max(0, WORLD_H - vh));
    const sourceW = Math.min(WORLD_W, vw);
    const sourceH = Math.min(WORLD_H, vh);
    const night = nightAmount(state.time);

    c.save();
    c.translate(w / 2 + sx, h / 2 + sy);
    c.scale(cam.zoom, cam.zoom);
    c.translate(-cam.x, -cam.y);

    if (world.staticCanvas) c.drawImage(world.staticCanvas, sourceX, sourceY, sourceW, sourceH, sourceX, sourceY, sourceW, sourceH);
    if (state.phase === 'play') drawGroundMarkers(c, time);

    const items = [];
    const margin = 110;
    const visible = (x, y) => x > view.x - margin && x < view.x + view.w + margin && y > view.y - margin && y < view.y + view.h + margin;
    for (const t of world.trees) if (visible(t.x, t.y)) items.push({ y: t.y, type: 'tree', ref: t });
    for (const p of world.peds) if (visible(p.x, p.y)) items.push({ y: p.y, type: 'ped', ref: p });
    for (const l of world.lamps) if (visible(l.x, l.y)) items.push({ y: l.y, type: 'lamp', ref: l });
    for (const car of world.cars) if (visible(car.x, car.y)) items.push({ y: car.y, type: 'car', ref: car });
    for (const car of world.npcCars) if (visible(car.x, car.y)) items.push({ y: car.y, type: 'car', ref: car });
    if (!state.player.car) items.push({ y: state.player.y, type: 'player', ref: state.player });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) {
      if (it.type === 'tree') drawTree(c, it.ref, time);
      else if (it.type === 'ped') drawPed(c, it.ref, time);
      else if (it.type === 'lamp') drawLampPost(c, it.ref, time, night);
      else if (it.type === 'car') drawCar(c, it.ref, night);
      else if (it.type === 'player') {
        drawPerson(c, {
          x: state.player.x, y: state.player.y, angle: state.player.angle,
          color: OUTFITS[state.outfit], skin: SKIN[0], phase: state.player.walk,
          moving: state.player.moving, bag: false, scale: 1.18,
        });
      }
    }

    drawLighting(c, time, view);
    if (state.phase === 'play') drawObjectiveBeacon(c, time);
    c.restore();

    drawAmbient(c, time);
    if (state.phase === 'play') drawEdgeObjective(c, time);
  }

  /* =============================== loop ============================== */
  let lastFrame = 0;
  let actionTimer = 0;

  function frame(now) {
    const dt = clamp((now - lastFrame) / 1000 || .016, .001, .05);
    lastFrame = now;
    if (state.phase === 'intro') {
      state.introT += dt;
      const t = state.introT;
      cam.x = world.fountain.x + Math.sin(t * .09) * 170;
      cam.y = world.fountain.y + Math.cos(t * .065) * 74;
      cam.zoom = baseZoom() * 1.04;
      clampCamera();
    } else if (state.phase === 'play') {
      const paused = state.phoneOpen || state.sheetOpen || !!state.shift;
      if (state.shift) updateShift(dt);
      if (!paused) update(dt);
      else updateEngineAudio(0);
      updateCamera(dt);
      actionTimer += dt;
      if (actionTimer > .16) {
        actionTimer = 0;
        updateAction();
      }
    }
    render(now / 1000);
    requestAnimationFrame(frame);
  }

  /* =============================== start ============================= */
  function startGame() {
    let loaded = false;
    if (hasSave && pendingSave) loaded = applySave(pendingSave);

    if (!loaded) {
      state.phase = 'play';
      state.timeAcc = 0;
      state.saveAcc = 0;
      state.stepAcc = 0;
      state.phonePage = 'home';
    }
    state.phase = 'play';
    state.phoneOpen = false;
    state.sheetOpen = false;
    state.shift = null;

    const focus = state.player.car || state.player;
    cam.x = focus.x;
    cam.y = focus.y;
    cam.zoom = baseZoom();
    clampCamera();

    dom.start.classList.add('is-gone');
    dom.start.setAttribute('aria-hidden', 'true');
    dom.hud.classList.remove('is-hidden');
    dom.fade.classList.add('is-on');
    setTimeout(() => dom.fade.classList.remove('is-on'), 520);
    dom.controlsHint.classList.remove('is-faded');
    setTimeout(() => dom.controlsHint.classList.add('is-faded'), 14000);

    initAudio();
    if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
    updateAvatar();
    updateHud();
    updateAction();
    updateTiltUI();
    sfx('good');
    saveGame();

    setTimeout(() => {
      if (state.phase !== 'play') return;
      if (loaded) toast(`Willkommen zurück. <strong>Tag ${state.day}</strong> · ${fmtEuro(state.money)}`, 'good', 'home', 4200);
      else toast('Willkommen in der Stadt. <strong>Keine Waffen. Nur Alltag.</strong>', 'good', 'spark', 4800);
    }, 850);
  }

  /* ============================== inputs ============================= */
  function isBlockingUI() {
    return state.phase !== 'play' || state.phoneOpen || state.sheetOpen || !!state.shift;
  }

  function setupJoystick() {
    const el = dom.joystick;
    if (!el) return;
    let pointerId = null;
    let limit = 42;

    function move(e) {
      if (e.pointerId !== pointerId) return;
      const r = el.getBoundingClientRect();
      limit = r.width * .34;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const len = Math.hypot(dx, dy);
      if (len > limit) { dx = dx / len * limit; dy = dy / len * limit; }
      input.x = dx / limit;
      input.y = dy / limit;
      dom.joyThumb.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
    }

    function start(e) {
      if (isBlockingUI()) return;
      e.preventDefault();
      pointerId = e.pointerId;
      input.joystick = true;
      dom.joyThumb.style.transition = 'none';
      if (el.setPointerCapture) { try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
      move(e);
    }

    function end(e) {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      input.joystick = false;
      input.x = 0; input.y = 0;
      dom.joyThumb.style.transition = '';
      dom.joyThumb.style.transform = '';
    }

    el.addEventListener('pointerdown', start);
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }

  function bindEvents() {
    dom.actionBtn.addEventListener('click', () => {
      if (!actionContext) return;
      sfx('click');
      actionContext.fn();
    });

    dom.phoneBtn.addEventListener('click', () => {
      if (state.phoneOpen) closePhone(); else openPhone('home');
    });
    dom.tiltPill.addEventListener('click', calibrateTilt);

    dom.phoneCloseBtn.addEventListener('click', closePhone);
    dom.phoneSettingsBtn.addEventListener('click', () => showPage('settings'));
    $$('.phone-tab').forEach(tab => {
      tab.addEventListener('click', () => { sfx('click'); showPage(tab.dataset.tab); });
    });

    dom.phoneBody.addEventListener('click', e => {
      const msgBtn = e.target.closest('[data-msg]');
      if (msgBtn) {
        const msg = msgBtn.dataset.msg;
        sfx('click');
        if (msg === 'accept-nora') acceptNora();
        else if (msg === 'decline-nora') declineNora();
        else if (msg === 'go-map') showPage('map');
        else if (msg === 'go-jobs') showPage('jobs');
        else if (msg === 'go-home-close') closePhone();
        return;
      }
      const jobBtn = e.target.closest('[data-job]');
      if (!jobBtn || jobBtn.disabled) return;
      const job = jobBtn.dataset.job;
      if (job === 'courier') {
        if (startCourierJob()) closePhone();
      } else if (job === 'taxi') {
        if (startTaxiJob()) closePhone();
      } else if (job === 'cafe') {
        const cafe = getPoi('1,0-cafe');
        const open = state.time >= 8 * 60 && state.time <= 18 * 60;
        if (cafe && open && dist(state.player.x, state.player.y, cafe.x, cafe.y) < 120) {
          closePhone();
          startShift();
        } else {
          toast('Geh zum Kaffee Kollektiv, um die Schicht zu starten.', 'accent', 'coffee', 3400);
        }
      } else if (job === 'cancel') {
        cancelJob();
        renderPhone();
      }
    });

    dom.setTilt.addEventListener('click', toggleTilt);
    dom.calibrateBtn.addEventListener('click', calibrateTilt);
    dom.setSound.addEventListener('click', () => { sfx('click'); setSound(!state.sound); });
    dom.resetPhone.addEventListener('click', () => {
      if (window.confirm('Neues Leben beginnen? Geld, Aufträge und Fortschritt werden gelöscht.')) resetProgress();
    });

    dom.sheetClose.addEventListener('click', closeSheet);
    dom.sheetOverlay.addEventListener('click', e => { if (e.target === dom.sheetOverlay) closeSheet(); });
    dom.phoneOverlay.addEventListener('click', e => { if (e.target === dom.phoneOverlay) closePhone(); });

    dom.shiftClose.addEventListener('click', () => { if (state.shift) finishShift(); });
    dom.serveBtn.addEventListener('click', serveCoffee);

    dom.startBtn.addEventListener('click', startGame);
    dom.resetLink.addEventListener('click', () => {
      if (window.confirm('Neues Leben beginnen? Der gespeicherte Fortschritt wird gelöscht.')) resetProgress();
    });
    dom.tiltStart.addEventListener('click', toggleTilt);

    window.addEventListener('keydown', e => {
      const k = (e.key || '').toLowerCase();
      if (state.phase === 'intro') {
        if (k === 'enter' || k === ' ') { e.preventDefault(); startGame(); }
        return;
      }
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (k === 'escape') {
        if (state.phoneOpen) closePhone();
        else if (state.sheetOpen) closeSheet();
        else if (state.shift) finishShift();
        return;
      }
      if (k === 'p') {
        if (state.shift || state.sheetOpen) return;
        e.preventDefault();
        if (state.phoneOpen) closePhone(); else openPhone('home');
        return;
      }
      if (state.shift) {
        if (k === ' ') serveCoffee();
        return;
      }
      if (isBlockingUI()) return;
      if (k === 'e') {
        if (actionContext) { sfx('click'); actionContext.fn(); }
        return;
      }
      if (k === 'shift') input.sprint = true;
      input.keys.add(k);
    });
    window.addEventListener('keyup', e => {
      const k = (e.key || '').toLowerCase();
      if (k === 'shift') input.sprint = false;
      input.keys.delete(k);
    });
    window.addEventListener('blur', () => {
      input.keys.clear();
      input.joystick = false;
      input.x = input.y = 0;
      input.sprint = false;
      dom.joyThumb.style.transform = '';
    });

    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 220));

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) saveGame();
      else lastFrame = performance.now();
    });

    window.addEventListener('pointerdown', () => {
      if (!audio.ready) initAudio();
      if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
    }, { passive: true });

    setupJoystick();
  }

  /* ================================ init ============================= */
  function init() {
    buildWorld();
    for (const t of world.trees) {
      if (t.x > MARGIN + 8 && t.x < WORLD_W - MARGIN - 8 && t.y > MARGIN + 8 && t.y < WORLD_H - MARGIN - 8) {
        world.circleColliders.push({ x: t.x, y: t.y, r: Math.max(5, Math.min(9, t.r * .3)) });
      }
    }
    resize();
    bindEvents();
    readSaveMeta();
    updateStartScreen();
    updateAvatar();
    updateHud();
    updateTiltUI();
    dom.startLive.textContent = `LIVE · ${clockString(state.time)} · BRUNNENPLATZ`;
    lastFrame = performance.now();
    requestAnimationFrame(frame);
  }

  init();
})();



