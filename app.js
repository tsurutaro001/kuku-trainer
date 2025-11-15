/* =====================================================
   app.js v12
   ===================================================== */

let AC = null;
let bgmOn = false;
let bgmTimer = null;
let bgmGain = null;
let currentBgm = "easy";
let bgmSpeedFactor = 1.0;
let bgmNodes = [];

/* --------- Audio / BGM --------- */
function initAudio() {
  if (!AC) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    AC = new Ctx();
  }
  if (!bgmGain && AC) {
    bgmGain = AC.createGain();
    bgmGain.gain.value = 1.0;
    bgmGain.connect(AC.destination);
  }
}

function playSE(type) {
  if (!AC) return;
  const osc = AC.createOscillator();
  const gain = AC.createGain();
  osc.connect(gain); gain.connect(AC.destination);
  const end = t => { osc.start(); osc.stop(AC.currentTime + t); };

  switch (type) {
    case "OK":
      osc.type = "sine";
      osc.frequency.setValueAtTime(900, AC.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1500, AC.currentTime + 0.28);
      gain.gain.setValueAtTime(0.3, AC.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.28);
      end(0.28); return;
    case "NG":
      osc.type = "square";
      osc.frequency.setValueAtTime(220, AC.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, AC.currentTime + 0.32);
      gain.gain.setValueAtTime(0.3, AC.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.32);
      end(0.32); return;
    case "COMBO2":
      osc.type = "triangle";
      osc.frequency.setValueAtTime(700, AC.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1000, AC.currentTime + 0.15);
      gain.gain.value = 0.2;
      end(0.15); return;
    case "COMBO3":
      osc.type = "sine";
      osc.frequency.setValueAtTime(900, AC.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1600, AC.currentTime + 0.22);
      gain.gain.value = 0.25;
      end(0.22); return;
    case "COMBO4":
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(800, AC.currentTime);
      osc.frequency.exponentialRampToValueAtTime(2000, AC.currentTime + 0.28);
      gain.gain.value = 0.28;
      end(0.28); return;
    case "LEVELUP":
      osc.type = "square";
      osc.frequency.setValueAtTime(600, AC.currentTime);
      osc.frequency.linearRampToValueAtTime(1200, AC.currentTime + 0.25);
      gain.gain.value = 0.25;
      end(0.25); return;
    case "RESULT":
      osc.type = "square";
      osc.frequency.setValueAtTime(800, AC.currentTime);
      osc.frequency.linearRampToValueAtTime(1200, AC.currentTime + 0.12);
      osc.frequency.linearRampToValueAtTime(1000, AC.currentTime + 0.24);
      gain.gain.value = 0.25;
      end(0.28); return;
  }
}

/* BGM データ（略記） */
const BGM_EASY_MELODY = [
  {freq:523.25,len:0.25},{freq:587.33,len:0.25},{freq:659.25,len:0.25},{freq:783.99,len:0.25},
  {freq:659.25,len:0.25},{freq:587.33,len:0.25},{freq:523.25,len:0.25},{freq:0,len:0.25}
];
const BGM_EASY_BASS = [
  {freq:130.81,len:0.5},{freq:0,len:0.25},{freq:98.00 ,len:0.5},{freq:0,len:0.25}
];
const BGM_NORMAL_MELODY = [
  {freq:659.25,len:0.20},{freq:783.99,len:0.20},{freq:987.77,len:0.20},{freq:1046.50,len:0.20},
  {freq:987.77,len:0.20},{freq:783.99,len:0.20},{freq:659.25,len:0.20},{freq:0,len:0.20},
  {freq:523.25,len:0.20},{freq:659.25,len:0.20},{freq:783.99,len:0.20},{freq:987.77,len:0.20},
  {freq:783.99,len:0.20},{freq:659.25,len:0.20},{freq:523.25,len:0.20},{freq:0,len:0.20}
];
const BGM_NORMAL_BASS = [
  {freq:130.81,len:0.40},{freq:0,len:0.10},{freq:196.00,len:0.40},{freq:0,len:0.10},
  {freq:146.83,len:0.40},{freq:0,len:0.10},{freq:196.00,len:0.40},{freq:0,len:0.10}
];
const BGM_HARD_MELODY = [
  {freq:440.00,len:0.15},{freq:523.25,len:0.15},{freq:587.33,len:0.15},{freq:659.25,len:0.15},
  {freq:587.33,len:0.15},{freq:523.25,len:0.15},{freq:440.00,len:0.15},{freq:0,len:0.15},
  {freq:659.25,len:0.15},{freq:698.46,len:0.15},{freq:880.00,len:0.15},{freq:987.77,len:0.15},
  {freq:880.00,len:0.15},{freq:698.46,len:0.15},{freq:659.25,len:0.15},{freq:0,len:0.15}
];
const BGM_HARD_BASS = [
  {freq:110.00,len:0.30},{freq:0,len:0.10},{freq:146.83,len:0.30},{freq:0,len:0.10},
  {freq:110.00,len:0.30},{freq:0,len:0.10},{freq:196.00,len:0.30},{freq:0,len:0.10}
];

function stopBGM() {
  bgmOn = false;
  if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; }
  if (AC && bgmGain) {
    bgmGain.gain.setValueAtTime(0, AC.currentTime);
  }
  bgmNodes.forEach(o => { try { o.stop(); } catch(e){} });
  bgmNodes = [];
}

function scheduleBgmBar() {
  if (!AC || !bgmOn || !bgmGain) return;
  let MELODY, BASS;
  if (currentBgm === "easy") { MELODY = BGM_EASY_MELODY; BASS = BGM_EASY_BASS; }
  else if (currentBgm === "normal") { MELODY = BGM_NORMAL_MELODY; BASS = BGM_NORMAL_BASS; }
  else { MELODY = BGM_HARD_MELODY; BASS = BGM_HARD_BASS; }

  const now = AC.currentTime;
  let tMel = now, tBass = now;
  const volMel = 0.07, volBass = 0.04;

  MELODY.forEach(n => {
    const len = n.len * bgmSpeedFactor;
    if (n.freq > 0) {
      const o = AC.createOscillator(), g = AC.createGain();
      o.connect(g); g.connect(bgmGain);
      o.type = "square";
      o.frequency.setValueAtTime(n.freq, tMel);
      g.gain.setValueAtTime(volMel, tMel);
      g.gain.exponentialRampToValueAtTime(0.0001, tMel+len*0.9);
      o.start(tMel); o.stop(tMel+len);
      bgmNodes.push(o);
    }
    tMel += len;
  });

  BASS.forEach(n => {
    const len = n.len * bgmSpeedFactor;
    if (n.freq > 0) {
      const o = AC.createOscillator(), g = AC.createGain();
      o.connect(g); g.connect(bgmGain);
      o.type = "square";
      o.frequency.setValueAtTime(n.freq, tBass);
      g.gain.setValueAtTime(volBass, tBass);
      g.gain.exponentialRampToValueAtTime(0.0001, tBass+len*0.9);
      o.start(tBass); o.stop(tBass+len);
      bgmNodes.push(o);
    }
    tBass += len;
  });
}

function startBGM() {
  initAudio();
  if (!AC || !bgmGain) return;
  if (AC.state === "suspended") AC.resume();

  stopBGM();
  bgmGain.gain.setValueAtTime(1.0, AC.currentTime);
  bgmOn = true;

  const MELODY =
    currentBgm === "easy"   ? BGM_EASY_MELODY :
    currentBgm === "normal" ? BGM_NORMAL_MELODY :
                              BGM_HARD_MELODY;
  const barSec = MELODY.reduce((s,n)=>s+n.len*bgmSpeedFactor,0);

  scheduleBgmBar();
  bgmTimer = setInterval(scheduleBgmBar, barSec * 1000);
}

/* --------- DOM --------- */
const els = {
  qNo: document.getElementById("qNo"),
  qTotal: document.getElementById("qTotal"),
  left: document.getElementById("left"),
  right: document.getElementById("right"),
  score: document.getElementById("score"),
  answerBox: document.getElementById("answerBox"),
  quizCard: document.getElementById("quizCard"),
  resultCard: document.getElementById("resultCard"),
  finalScore: document.getElementById("finalScore"),
  summaryList: document.getElementById("summaryList"),
  submitBtn: document.getElementById("submitBtn"),
  againBtn: document.getElementById("againBtn"),
  restartBtn: document.getElementById("restartBtn"),
  keyBk: document.getElementById("keyBk"),
  keyClr: document.getElementById("keyClr"),
  fx: document.getElementById("fx"),
  dinoArea: document.getElementById("dinoArea"),
  dinoEmoji: document.getElementById("dinoEmoji"),
  dinoName: document.getElementById("dinoName"),
  dinoMsg: document.getElementById("dinoMsg"),
  comboBadge: document.getElementById("comboBadge"),
  starFill: document.getElementById("starFill"),
  showTableBtn: document.getElementById("showTableBtn"),
  tableModal: document.getElementById("tableModal"),
  closeModal: document.getElementById("closeModal"),
  kukuGrid: document.getElementById("kukuGrid"),
  bg