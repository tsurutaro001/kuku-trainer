/* =====================================================
   app.js
   九九れんしゅうアプリ：
   BGM / きょうりゅう / コンボ / 夜モード / 九九Tips
===================================================== */

// ------------------------------
// Audio / BGM 状態
// ------------------------------
let AC = null;
let bgmState = "off"; // "off" | "starting" | "playing"
let bgmTimer = null;
let bgmGain = null;
let bgmNodes = [];
let currentBgm = "easy"; // "easy" | "normal" | "hard" | "night"
let bgmSpeedFactor = 1.0;
let bgmSectionIndex = 0;

// ------------------------------
// ゲーム状態
// ------------------------------
let nightMode = false;      // タイトル長押しでON（ちょうむず）
let legendaryFlag = false;  // でんせつドラゴン登場フラグ

let quiz = [];
let idx = 0;
let correctCount = 0;
let wrongCount = 0;
let totalQuestions = 10;
let score = 0;
let combo = 0;
let currentInput = "";
let answerHistory = [];
let challengeMode = false;

let timeLeft = 0;
let timeTimerId = null;     // 本番タイマー
let preCountTimerId = null; // 3,2,1カウントダウン用
let isPreCounting = false;
let lastStage = 1;
let kukuHintShown = false;  // 使わないが互換用

// ------------------------------
// 九九 Tips（裏ワザ系 厳選12）
// ------------------------------
const KUKU_TIPS = [
  "9のだんは「10のだん−その数」で一瞬で出せるよ。9×8→80−8＝72のように、10のだんを使うと別世界の速さ！",
  "8×7＝56は、7×7＝49に7を1回足しただけだよ。49＋7＝56と覚えると、ぜったい忘れにくくなる！",
  "6のだんは「5のだん＋もう1つ」で求められるよ。6×8＝40＋8＝48。むずかしい式ほどこの裏ワザが強い！",
  "4のだんは「2のだんを2回くり返す」だけ。2のだんができれば、4のだんはもうクリアしているんだ。",
  "7×6＝42は「7×3を2倍」で出せるよ。21×2＝42。分けて考えるとびっくりするくらいスッキリ！",
  "8のだんは「4のだんを2回」。4×8＝32→32＋32＝64。困ったら半分のだんで考えるのがコツだよ。",
  "7×8が覚えにくいときは、前後の答えで挟んでみよう。6×8＝48と8×8＝64、その真ん中が56になるよ。",
  "5のだんの答えは、奇数なら「5」、偶数なら「0」でおわるよ。最後の一けたを見れば一気に判断できる！",
  "11×n（1〜9）は数字を2回書くだけ。7→77、9→99。11の性質を知ると計算がちょっと楽しくなるよ。",
  "12のだんは「10倍＋2倍」で考えると最強。12×7＝70＋14＝84。2けた九九もこわくなくなる！",
  "9のだんは答えの十の位と一の位を足すと必ず9になるよ。63→6＋3＝9、72→7＋2＝9。ミスチェックにも使える！",
  "3のだんは「1×nと2×nの合体」。3×9＝9＋18＝27。“1＋2”でできているだんだと思うと自然に覚えられるよ。"
];

// ------------------------------
// DOM
// ------------------------------
const els = {
  title: document.getElementById("title"),
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
  tableModal: document.getElementById("tableModal"),
  closeModal: document.getElementById("closeModal"),
  kukuGrid: document.getElementById("kukuGrid"),
  bgmToggle: document.getElementById("bgmToggle"),
  timeDisplay: document.getElementById("timeDisplay"),
  kukuFloatingBtn: document.getElementById("kukuFloatingBtn"),
  kukuHint: document.getElementById("kukuHint")
};

const modeBtns = document.querySelectorAll(".mode-btn");
const keys = document.querySelectorAll(".key");
const modalBackdrop = document.querySelector("#tableModal .modal-backdrop");

// ------------------------------
// Audio 初期化
// ------------------------------
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

// ------------------------------
// 効果音
// ------------------------------
function playSE(type) {
  if (!AC) return;

  const osc = AC.createOscillator();
  const gain = AC.createGain();
  osc.connect(gain);
  gain.connect(AC.destination);

  const now = AC.currentTime;
  const end = (t) => {
    osc.start();
    osc.stop(now + t);
  };

  switch (type) {
    case "OK":
      osc.type = "sine";
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(1500, now + 0.25);
      gain.gain.value = 0.25;
      end(0.25);
      return;

    case "NG":
      osc.type = "square";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.28);
      gain.gain.value = 0.25;
      end(0.28);
      return;

    case "COMBO2":
      osc.type = "triangle";
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.exponentialRampToValueAtTime(1000, now + 0.16);
      gain.gain.value = 0.2;
      end(0.16);
      return;

    case "COMBO3":
      osc.type = "sine";
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(1600, now + 0.20);
      gain.gain.value = 0.25;
      end(0.20);
      return;

    case "COMBO4":
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(2000, now + 0.26);
      gain.gain.value = 0.28;
      end(0.26);
      return;

    case "LEVELUP":
      osc.type = "square";
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.linearRampToValueAtTime(1200, now + 0.25);
      gain.gain.value = 0.25;
      end(0.25);
      return;

    case "DINO":
      osc.type = "triangle";
      osc.frequency.setValueAtTime(1000, now);
      osc.frequency.exponentialRampToValueAtTime(1600, now + 0.20);
      gain.gain.value = 0.3;
      end(0.20);
      return;

    case "ROAR": {
      if (bgmGain && AC) {
        const base = currentBgm === "night" ? 2.0 : 1.0;
        bgmGain.gain.setValueAtTime(base * 0.3, now);
        bgmGain.gain.linearRampToValueAtTime(base, now + 0.6);
      }
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.35);
      osc.frequency.exponentialRampToValueAtTime(130, now + 0.5);
      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.5);
      end(0.5);
      return;
    }
  }
}

// 結果ジングル
function playResultJingle(score, reason) {
  if (!AC) return;
  const osc = AC.createOscillator();
  const gain = AC.createGain();
  osc.connect(gain);
  gain.connect(AC.destination);

  const now = AC.currentTime;

  if (reason === "timeup" || reason === "gameover") {
    // やさしめの「おつかれ」音
    osc.type = "triangle";
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(392, now + 0.25);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
    osc.start();
    osc.stop(now + 0.25);
    return;
  }

  if (score === 100) {
    // ちょっと派手な上昇フレーズ
    const freqs = [523, 659, 784, 1046];
    freqs.forEach((f, i) => {
      const o = AC.createOscillator();
      const g = AC.createGain();
      o.connect(g);
      g.connect(AC.destination);
      o.type = "square";
      const t0 = now + i * 0.09;
      o.frequency.setValueAtTime(f, t0);
      g.gain.setValueAtTime(0.18, t0);
      g.gain.linearRampToValueAtTime(0.01, t0 + 0.08);
      o.start(t0);
      o.stop(t0 + 0.1);
    });
    return;
  }

  if (score >= 80) {
    // 明るめ「やったね」音
    osc.type = "sine";
    osc.frequency.setValueAtTime(659, now);
    osc.frequency.linearRampToValueAtTime(784, now + 0.2);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
    osc.start();
    osc.stop(now + 0.2);
    return;
  }

  // それ未満：やさしい「もう一回いこ？」音
  osc.type = "sine";
  osc.frequency.setValueAtTime(523, now);
  osc.frequency.linearRampToValueAtTime(440, now + 0.25);
  gain.gain.setValueAtTime(0.17, now);
  gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
  osc.start();
  osc.stop(now + 0.25);
}

// ------------------------------
// BGM 用ユーティリティ
// ------------------------------
function makeTone(freq, len) {
  return { freq, len };
}

// EASY: 4セクション
const BGM_EASY = [
  {
    // 1: イントロ
    melody: [
      makeTone(523, 0.25), makeTone(587, 0.25),
      makeTone(659, 0.25), makeTone(783, 0.25),
      makeTone(659, 0.25), makeTone(587, 0.25),
      makeTone(523, 0.25), makeTone(0,   0.25)
    ],
    bass: [
      makeTone(130, 0.5), makeTone(0, 0.25),
      makeTone(98,  0.5), makeTone(0, 0.25)
    ]
  },
  {
    // 2: さんすう教室
    melody: [
      makeTone(587, 0.25), makeTone(659, 0.25),
      makeTone(783, 0.25), makeTone(880, 0.25),
      makeTone(783, 0.25), makeTone(659, 0.25),
      makeTone(587, 0.25), makeTone(0,   0.25)
    ],
    bass: [
      makeTone(98,  0.5), makeTone(0, 0.25),
      makeTone(146, 0.5), makeTone(0, 0.25)
    ]
  },
  {
    // 3: きょうりゅうとおさんぽ
    melody: [
      makeTone(659, 0.25), makeTone(523, 0.25),
      makeTone(587, 0.25), makeTone(659, 0.25),
      makeTone(587, 0.25), makeTone(523, 0.25),
      makeTone(440, 0.25), makeTone(0,   0.25)
    ],
    bass: [
      makeTone(130, 0.5), makeTone(0, 0.25),
      makeTone(130, 0.5), makeTone(0, 0.25)
    ]
  },
  {
    // 4: ゴール前キラキラ
    melody: [
      makeTone(783, 0.25), makeTone(880, 0.25),
      makeTone(987, 0.25), makeTone(1046,0.25),
      makeTone(987, 0.25), makeTone(880, 0.25),
      makeTone(783, 0.25), makeTone(0,   0.25)
    ],
    bass: [
      makeTone(146, 0.5), makeTone(0, 0.25),
      makeTone(196, 0.5), makeTone(0, 0.25)
    ]
  }
];

// NORMAL: 4セクション
const BGM_NORMAL = [
  {
    // 1: 軽くダッシュ
    melody: [
      makeTone(659, 0.20), makeTone(783, 0.20),
      makeTone(987, 0.20), makeTone(1046,0.20),
      makeTone(987, 0.20), makeTone(783, 0.20),
      makeTone(659, 0.20), makeTone(0,   0.20)
    ],
    bass: [
      makeTone(130, 0.4), makeTone(0, 0.1),
      makeTone(196, 0.4), makeTone(0, 0.1)
    ]
  },
  {
    // 2: 集中モード
    melody: [
      makeTone(523, 0.20), makeTone(587, 0.20),
      makeTone(659, 0.20), makeTone(783, 0.20),
      makeTone(659, 0.20), makeTone(587, 0.20),
      makeTone(523, 0.20), makeTone(0,   0.20)
    ],
    bass: [
      makeTone(196, 0.4), makeTone(0, 0.1),
      makeTone(146, 0.4), makeTone(0, 0.1)
    ]
  },
  {
    // 3: 盛り上がり
    melody: [
      makeTone(659, 0.20), makeTone(698, 0.20),
      makeTone(783, 0.20), makeTone(987, 0.20),
      makeTone(783, 0.20), makeTone(698, 0.20),
      makeTone(659, 0.20), makeTone(0,   0.20)
    ],
    bass: [
      makeTone(196, 0.4), makeTone(0, 0.1),
      makeTone(196, 0.4), makeTone(0, 0.1)
    ]
  },
  {
    // 4: ループへの架け橋
    melody: [
      makeTone(587, 0.20), makeTone(659, 0.20),
      makeTone(698, 0.20), makeTone(783, 0.20),
      makeTone(698, 0.20), makeTone(659, 0.20),
      makeTone(587, 0.20), makeTone(0,   0.20)
    ],
    bass: [
      makeTone(146, 0.4), makeTone(0, 0.1),
      makeTone(130, 0.4), makeTone(0, 0.1)
    ]
  }
];

// HARD: 4セクション
const BGM_HARD = [
  {
    // 1: 緊張スタート
    melody: [
      makeTone(440, 0.15), makeTone(523, 0.15),
      makeTone(587, 0.15), makeTone(659, 0.15),
      makeTone(587, 0.15), makeTone(523, 0.15),
      makeTone(440, 0.15), makeTone(0,   0.15)
    ],
    bass: [
      makeTone(110, 0.3), makeTone(0, 0.1),
      makeTone(146, 0.3), makeTone(0, 0.1)
    ]
  },
  {
    // 2: プレッシャーゾーン
    melody: [
      makeTone(659, 0.15), makeTone(698, 0.15),
      makeTone(880, 0.15), makeTone(987, 0.15),
      makeTone(880, 0.15), makeTone(698, 0.15),
      makeTone(659, 0.15), makeTone(0,   0.15)
    ],
    bass: [
      makeTone(110, 0.3), makeTone(0, 0.1),
      makeTone(196, 0.3), makeTone(0, 0.1)
    ]
  },
  {
    // 3: 攻めモード
    melody: [
      makeTone(523, 0.15), makeTone(587, 0.15),
      makeTone(659, 0.15), makeTone(783, 0.15),
      makeTone(659, 0.15), makeTone(587, 0.15),
      makeTone(523, 0.15), makeTone(0,   0.15)
    ],
    bass: [
      makeTone(146, 0.3), makeTone(0, 0.1),
      makeTone(196, 0.3), makeTone(0, 0.1)
    ]
  },
  {
    // 4: 小休止
    melody: [
      makeTone(493, 0.15), makeTone(523, 0.15),
      makeTone(587, 0.15), makeTone(659, 0.15),
      makeTone(587, 0.15), makeTone(523, 0.15),
      makeTone(493, 0.15), makeTone(0,   0.15)
    ],
    bass: [
      makeTone(130, 0.3), makeTone(0, 0.1),
      makeTone(130, 0.3), makeTone(0, 0.1)
    ]
  }
];

// NIGHT: 幽霊屋敷風 4セクション
const BGM_NIGHT = [
  {
    // 1: 入口
    melody: [
      makeTone(392, 0.30), makeTone(0,   0.10),
      makeTone(370, 0.25), makeTone(0,   0.10),
      makeTone(349, 0.20), makeTone(0,   0.20),
      makeTone(311, 0.30), makeTone(0,   0.10)
    ],
    bass: [
      makeTone(98,  0.4),  makeTone(0, 0.2),
      makeTone(82,  0.4),  makeTone(0, 0.2)
    ]
  },
  {
    // 2: 遠くのオルガン
    melody: [
      makeTone(311, 0.25), makeTone(0,   0.15),
      makeTone(262, 0.20), makeTone(0,   0.15),
      makeTone(233, 0.20), makeTone(0,   0.20),
      makeTone(262, 0.25), makeTone(0,   0.15)
    ],
    bass: [
      makeTone(82,  0.4),  makeTone(0, 0.1),
      makeTone(110, 0.4),  makeTone(0, 0.1)
    ]
  },
  {
    // 3: 足音リズム
    melody: [
      makeTone(233, 0.25), makeTone(0,   0.15),
      makeTone(208, 0.25), makeTone(0,   0.15),
      makeTone(196, 0.25), makeTone(0,   0.15),
      makeTone(233, 0.25), makeTone(0,   0.15)
    ],
    bass: [
      makeTone(98,  0.4),  makeTone(0, 0.1),
      makeTone(98,  0.4),  makeTone(0, 0.1)
    ]
  },
  {
    // 4: 一瞬の静けさ
    melody: [
      makeTone(262, 0.20), makeTone(0,   0.20),
      makeTone(311, 0.20), makeTone(0,   0.20),
      makeTone(349, 0.20), makeTone(0,   0.20),
      makeTone(392, 0.20), makeTone(0,   0.20)
    ],
    bass: [
      makeTone(82,  0.4),  makeTone(0, 0.1),
      makeTone(82,  0.4),  makeTone(0, 0.1)
    ]
  }
];

// ------------------------------
// BGM停止
// ------------------------------
function stopBGM() {
  if (!AC || !bgmGain) return;

  if (bgmTimer) {
    clearInterval(bgmTimer);
    bgmTimer = null;
  }
  bgmGain.gain.setValueAtTime(0, AC.currentTime);

  bgmNodes.forEach((o) => {
    try { o.stop(); } catch (e) {}
  });
  bgmNodes = [];

  bgmState = "off";
}

// ------------------------------
// 1小節分スケジュール
// ------------------------------
function scheduleBgmBar() {
  if (!AC || !bgmGain) return;
  if (bgmState !== "playing") return;

  let SECT;
  if (currentBgm === "easy")        SECT = BGM_EASY;
  else if (currentBgm === "normal") SECT = BGM_NORMAL;
  else if (currentBgm === "hard")   SECT = BGM_HARD;
  else                              SECT = BGM_NIGHT;

  const s = SECT[bgmSectionIndex % SECT.length];
  const MELODY = s.melody;
  const BASS   = s.bass;

  const now = AC.currentTime;
  let tMel = now;
  let tBass = now;

  MELODY.forEach((n) => {
    const len = n.len * bgmSpeedFactor;
    if (n.freq > 0) {
      const o = AC.createOscillator();
      const g = AC.createGain();
      o.connect(g);
      g.connect(bgmGain);
      o.type = (currentBgm === "night" ? "triangle" : "square");
      o.frequency.setValueAtTime(n.freq, tMel);

      const baseAmp = (currentBgm === "night" ? 0.12 : 0.07);

      if (currentBgm === "night") {
        const attack = Math.min(0.02, len / 4);
        const release = Math.min(0.02, len / 4);
        const sustainStart = tMel + attack;
        const sustainEnd   = tMel + len - release;

        g.gain.setValueAtTime(0.0001, tMel);
        g.gain.linearRampToValueAtTime(baseAmp, sustainStart);
        g.gain.setValueAtTime(baseAmp, sustainEnd);
        g.gain.linearRampToValueAtTime(0.0001, tMel + len);
      } else {
        g.gain.setValueAtTime(baseAmp, tMel);
      }

      o.start(tMel);
      o.stop(tMel + len);
      bgmNodes.push(o);
    }
    tMel += len;
  });

  BASS.forEach((n) => {
    const len = n.len * bgmSpeedFactor;
    if (n.freq > 0) {
      const o = AC.createOscillator();
      const g = AC.createGain();
      o.connect(g);
      g.connect(bgmGain);
      o.type = (currentBgm === "night" ? "sine" : "square");
      o.frequency.setValueAtTime(n.freq, tBass);

      const baseAmp = (currentBgm === "night" ? 0.10 : 0.04);

      if (currentBgm === "night") {
        const attack = Math.min(0.02, len / 4);
        const release = Math.min(0.02, len / 4);
        const sustainStart = tBass + attack;
        const sustainEnd   = tBass + len - release;

        g.gain.setValueAtTime(0.0001, tBass);
        g.gain.linearRampToValueAtTime(baseAmp, sustainStart);
        g.gain.setValueAtTime(baseAmp, sustainEnd);
        g.gain.linearRampToValueAtTime(0.0001, tBass + len);
      } else {
        g.gain.setValueAtTime(baseAmp, tBass);
      }

      o.start(tBass);
      o.stop(tBass + len);
      bgmNodes.push(o);
    }
    tBass += len;
  });

  bgmSectionIndex++;
}

// ------------------------------
// BGM開始（夜モードは音量2.0）
// ------------------------------
function startBGM() {
  initAudio();
  if (!AC || !bgmGain) return;

  // すでに再生中なら一度止める
  if (bgmTimer) {
    clearInterval(bgmTimer);
    bgmTimer = null;
  }
  bgmNodes.forEach((o) => {
    try { o.stop(); } catch (e) {}
  });
  bgmNodes = [];

  bgmState = "playing";
  bgmGain.gain.value = (currentBgm === "night" ? 2.0 : 1.0);
  bgmSectionIndex = 0;

  let SECT;
  if (currentBgm === "easy")        SECT = BGM_EASY;
  else if (currentBgm === "normal") SECT = BGM_NORMAL;
  else if (currentBgm === "hard")   SECT = BGM_HARD;
  else                              SECT = BGM_NIGHT;

  const barSec = SECT[0].melody.reduce(
    (s, n) => s + n.len * bgmSpeedFactor,
    0
  );

  scheduleBgmBar();
  bgmTimer = setInterval(scheduleBgmBar, barSec * 1000);
}

// タブ切り替え
document.addEventListener("visibilitychange", () => {
  if (!AC) return;
  if (document.visibilityState === "hidden") {
    AC.suspend();
  } else {
    if (bgmState === "playing") {
      AC.resume().then(() => {
        startBGM();
      });
    }
  }
});

// ------------------------------
// タイマー関連
// ------------------------------
function stopTimer() {
  if (timeTimerId) {
    clearInterval(timeTimerId);
    timeTimerId = null;
  }
}

function cancelPreCountdown() {
  if (preCountTimerId) {
    clearInterval(preCountTimerId);
    preCountTimerId = null;
  }
  isPreCounting = false;
  els.timeDisplay.classList.remove("countdown");
}

// 本番タイマー開始
function startTimer(seconds = 60) {
  stopTimer();
  cancelPreCountdown();

  timeLeft = seconds;
  els.timeDisplay.classList.remove("hidden");
  els.timeDisplay.textContent = String(timeLeft);

  timeTimerId = setInterval(() => {
    timeLeft--;
    els.timeDisplay.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timeTimerId);
      timeTimerId = null;
      showResult("timeup");
    }
  }, 1000);
}

// ちょうせん用 カウントダウン
function runChallengeCountdown() {
  stopTimer();
  cancelPreCountdown();

  let count = 3;
  isPreCounting = true;
  els.timeDisplay.classList.remove("hidden");
  els.timeDisplay.classList.add("countdown");
  els.timeDisplay.textContent = count;

  setKeypadEnabled(false);
  els.submitBtn.disabled = true;

  preCountTimerId = setInterval(() => {
    count--;
    if (count > 0) {
      els.timeDisplay.textContent = count;
    } else {
      clearInterval(preCountTimerId);
      preCountTimerId = null;
      isPreCounting = false;
      els.timeDisplay.textContent = "すたーと！";
      playSE("OK");
      setTimeout(() => {
        els.timeDisplay.classList.remove("countdown");
        setKeypadEnabled(true);
        els.submitBtn.disabled = false;
        startTimer(60);
      }, 600);
    }
  }, 1000);
}

// 夜モード用 カウントダウン
function runNightCountdown() {
  stopTimer();
  cancelPreCountdown();

  let count = 3;
  isPreCounting = true;
  els.timeDisplay.classList.remove("hidden");
  els.timeDisplay.classList.add("countdown");
  els.timeDisplay.textContent = count;

  setKeypadEnabled(false);
  els.submitBtn.disabled = true;

  preCountTimerId = setInterval(() => {
    count--;
    if (count > 0) {
      els.timeDisplay.textContent = count;
    } else {
      clearInterval(preCountTimerId);
      preCountTimerId = null;
      isPreCounting = false;
      els.timeDisplay.textContent = "すたーと！";
      playSE("OK");
      setTimeout(() => {
        els.timeDisplay.classList.remove("countdown");
        setKeypadEnabled(true);
        els.submitBtn.disabled = false;
        startTimer(90);
      }, 600);
    }
  }, 1000);
}

// ------------------------------
// 問題生成
// ------------------------------
function makeQuiz() {
  const all = [];
  if (nightMode) {
    // 夜モード：10〜19 × 1〜9
    for (let a = 10; a <= 19; a++) {
      for (let b = 1; b <= 9; b++) all.push([a, b]);
    }
  } else {
    // 通常：1〜9 × 1〜9
    for (let a = 1; a <= 9; a++) {
      for (let b = 1; b <= 9; b++) all.push([a, b]);
    }
  }

  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  quiz = all.slice(0, totalQuestions);

  idx = 0;
  correctCount = 0;
  wrongCount = 0;
  score = 0;
  combo = 0;
  currentInput = "";
  answerHistory = [];
  lastStage = 1;
  legendaryFlag = false;

  bgmSpeedFactor = 1.0;

  stopTimer();
  cancelPreCountdown();
  els.timeDisplay.classList.add("hidden");
  els.timeDisplay.textContent = "";

  els.qTotal.textContent = totalQuestions;
  updateUI();
  updateBuddy();
  updateComboUI();
  setKeypadEnabled(true);
  els.submitBtn.disabled = false;
}

// ------------------------------
// UI 更新
// ------------------------------
function updateUI() {
  els.qNo.textContent = idx + 1;
  els.left.textContent = quiz[idx][0];
  els.right.textContent = quiz[idx][1];
  els.score.textContent = score;
  currentInput = "";
  renderAnswer();
  feedback("");
}

function renderAnswer() {
  els.answerBox.textContent = currentInput || "□";
}

function setKeypadEnabled(enabled) {
  keys.forEach((k) => {
    if (enabled) k.classList.remove("disabled");
    else k.classList.add("disabled");
  });
}

// ------------------------------
// キーパッド
// ------------------------------
keys.forEach((btn) => {
  const t = btn.textContent.trim();
  if (/^\d$/.test(t)) {
    btn.onclick = () => {
      initAudio();
      if (btn.classList.contains("disabled")) return;
      const maxLen = nightMode ? 3 : 2;
      if (currentInput.length < maxLen) {
        currentInput += t;
        renderAnswer();
      }
    };
  }
});

els.keyBk.onclick = () => {
  initAudio();
  if (els.keyBk.classList.contains("disabled")) return;
  currentInput = currentInput.slice(0, -1);
  renderAnswer();
};

els.keyClr.onclick = () => {
  initAudio();
  if (els.keyClr.classList.contains("disabled")) return;
  currentInput = "";
  renderAnswer();
};

// ------------------------------
// 採点
// ------------------------------
els.submitBtn.onclick = () => {
  initAudio();
  if (!currentInput) {
    feedback("数字を入力してね", null);
    return;
  }

  const [a, b] = quiz[idx];
  const ans = a * b;
  const user = parseInt(currentInput, 10);
  const ok = user === ans;

  els.answerBox.classList.add("answer-pop");
  setTimeout(() => els.answerBox.classList.remove("answer-pop"), 180);

  if (ok) {
    correctCount++;
    combo++;
    playSE("OK");
    spawnStar();
    if (combo === 2) playSE("COMBO2");
    if (combo === 3) playSE("COMBO3");
    if (combo >= 4) playSE("COMBO4");
  } else {
    combo = 0;
    wrongCount++;
    playSE("NG");
  }

  if (challengeMode && !nightMode && wrongCount >= 3) {
    showResult("gameover");
    return;
  }

  score = Math.round((correctCount / totalQuestions) * 100);
  els.score.textContent = score;

  answerHistory.push({ a, b, ans, user, ok });
  feedback("", ok);
  updateBuddy();
  updateComboUI();
  updateComboBgmSpeed();

  setKeypadEnabled(false);

  setTimeout(() => {
    setKeypadEnabled(true);
    if (idx < totalQuestions - 1) {
      idx++;
      updateUI();
      updateBuddy();
    } else {
      showResult();
    }
  }, ok ? 700 : 900);
};

// ------------------------------
// コンボ表示 & BGMスピード
// ------------------------------
function updateComboUI() {
  const badge = els.comboBadge;
  if (combo >= 2) {
    badge.classList.remove("combo-show", "combo-hot");
    void badge.offsetWidth;
    badge.textContent = `${combo}コンボ！🔥`;
    if (combo >= 8) badge.classList.add("combo-hot");
    badge.classList.add("combo-show");
  } else {
    badge.classList.remove("combo-show", "combo-hot");
    badge.textContent = "";
  }
}

function updateComboBgmSpeed() {
  const old = bgmSpeedFactor;

  if (currentBgm === "easy") {
    if (combo >= 8) bgmSpeedFactor = 0.7;
    else if (combo >= 4) bgmSpeedFactor = 0.85;
    else bgmSpeedFactor = 1.0;
  } else if (currentBgm === "normal") {
    if (combo >= 8) bgmSpeedFactor = 0.85;
    else if (combo >= 4) bgmSpeedFactor = 0.9;
    else bgmSpeedFactor = 1.0;
  } else if (currentBgm === "hard") {
    if (combo >= 8) bgmSpeedFactor = 0.9;
    else if (combo >= 4) bgmSpeedFactor = 0.95;
    else bgmSpeedFactor = 1.0;
  } else {
    // night
    if (combo >= 8) bgmSpeedFactor = 0.9;
    else bgmSpeedFactor = 1.0;
  }

  if (old !== bgmSpeedFactor && bgmState === "playing") {
    startBGM();
  }
}

// ------------------------------
// メッセージ
// ------------------------------
function feedback(msg, ok) {
  els.fx.className = "fx";
  if (ok === true) {
    els.fx.classList.add("ok");
    els.fx.textContent = "✨ せいかい！";
  } else if (ok === false) {
    els.fx.classList.add("ng");
    els.fx.textContent = "🪲 ざんねん！";
  } else {
    els.fx.textContent = msg || "";
  }
}

// ------------------------------
// きょうりゅうエリア
// ------------------------------
function updateBuddy() {
  const prevLegend = legendaryFlag;

  let stage = 1;
  if (correctCount >= 15) stage = 4;
  else if (correctCount >= 10) stage = 3;
  else if (correctCount >= 5) stage = 2;

  const newLegend = correctCount >= 20;
  legendaryFlag = newLegend;

  const ratio = totalQuestions ? correctCount / totalQuestions : 0;
  els.starFill.style.width = ratio * 100 + "%";

  if (stage > lastStage && !legendaryFlag) {
    els.dinoEmoji.classList.add("dino-bounce");
    playSE("LEVELUP");
    setTimeout(
      () => els.dinoEmoji.classList.remove("dino-bounce"),
      600
    );
  }

  if (legendaryFlag && !prevLegend) {
    playSE("ROAR");
  }
  lastStage = stage;

  els.dinoArea.classList.remove(
    "skin-forest",
    "skin-desert",
    "skin-volcano",
    "skin-super"
  );
  if (stage === 1) els.dinoArea.classList.add("skin-forest");
  else if (stage === 2) els.dinoArea.classList.add("skin-desert");
  else if (stage === 3) els.dinoArea.classList.add("skin-volcano");
  else els.dinoArea.classList.add("skin-super");

  if (legendaryFlag) {
    els.starFill.style.background =
      "linear-gradient(90deg, #f97316, #eab308, #22c55e, #3b82f6, #a855f7)";
    els.dinoEmoji.textContent = "🐉🔥⚡";
    els.dinoName.textContent = "でんせつのドラゴン";
    els.dinoMsg.textContent = "でんせつのドラゴンとうじょう！！";
  } else {
    els.starFill.style.background =
      "linear-gradient(90deg, #ffeb8b, #ffcc00)";

    let emoji = "🦎";
    if (stage === 2) emoji = "🐊";
    else if (stage === 3) emoji = "🦖";
    else if (stage === 4) emoji = "🌋🦖🦕🌋";
    if (nightMode) emoji = "🌙🦖";

    els.dinoEmoji.textContent = emoji;
    els.dinoName.textContent = `レベル ${stage}`;

    if (ratio === 1) {
      els.dinoMsg.textContent = "ぜんもんせいかい！きょうりゅうもびっくり！";
    } else if (ratio >= 0.8) {
      els.dinoMsg.textContent = "とてもいい！つぎは100点をめざそう！";
    } else if (ratio >= 0.5) {
      els.dinoMsg.textContent = "いいちょうし！このままつづけよう！";
    } else if (ratio > 0) {
      els.dinoMsg.textContent = "すこしずつできてきたよ！";
    } else {
      els.dinoMsg.textContent = "がんばろう！";
    }
  }
}

els.dinoEmoji.addEventListener("click", () => {
  initAudio();
  els.dinoEmoji.classList.add("dino-jump");
  playSE("DINO");
  setTimeout(() => els.dinoEmoji.classList.remove("dino-jump"), 400);
});

// ------------------------------
// スター演出
// ------------------------------
function spawnStar() {
  const star = document.createElement("div");
  star.textContent = "⭐";
  star.className = "starburst";
  star.style.position = "fixed";
  star.style.left = "50%";
  star.style.top = "50%";
  star.style.transform = "translate(-50%, -50%)";
  star.style.fontSize = "32px";
  star.style.pointerEvents = "none";
  star.style.animation = "starPop 0.7s ease-out";
  document.body.appendChild(star);
  setTimeout(() => star.remove(), 700);
}

// ------------------------------
// 結果画面
// ------------------------------
function showResult(reason = "") {
  els.quizCard.classList.add("hidden");
  els.resultCard.classList.remove("hidden");
  stopTimer();
  cancelPreCountdown();
  els.timeDisplay.classList.add("hidden");
  els.timeDisplay.textContent = "";

  modeBtns.forEach((b) => b.classList.add("disabled"));

  let medal;
  if (score >= 95) medal = "🥇 金メダル！";
  else if (score >= 80) medal = "🥈 銀メダル！";
  else if (score >= 60) medal = "🥉 銅メダル！";
  else medal = "💪 またチャレンジしよう！";

  let msg;
  if (reason === "timeup") {
    msg = "じかんぎれ…でもここまでよくがんばったね！";
  } else if (reason === "gameover") {
    msg = "まちがいが3回になったよ。つぎはもっと気をつけてみよう！";
  } else if (score === 100) {
    msg = "ぜんもんせいかい！きょうりゅうも大よろこび！";
  } else if (score >= 80) {
    msg = "とてもいい点数！つぎは100点をめざそう！";
  } else if (score >= 60) {
    msg = "あとすこしで金メダル！もう一回やってみよう！";
  } else {
    msg =
      "すこしむずかしかったかな？きょうりゅうといっしょにれんしゅうしよう！";
  }

  if (reason === "timeup") {
    els.finalScore.textContent = "じかんぎれ！";
  } else if (reason === "gameover") {
    els.finalScore.textContent = "ゲームオーバー！";
  } else {
    els.finalScore.textContent = score + "てん";
  }

  const historyHtml = answerHistory
    .map(
      (h, i) =>
        `Q${i + 1}: ${h.a}×${h.b}=${h.ans} ／ あなた：<strong class="${
          h.ok ? "ok" : "ng"
        }">${h.user}</strong>`
    )
    .join("<br>");

  els.summaryList.innerHTML =
    `<details><summary>くわしいきろくを見る</summary>` +
    `<div class="medal">${medal}</div><p>${msg}</p><hr>` +
    historyHtml +
    `</details>`;

  playResultJingle(score, reason);

  if (score === 100 && typeof confetti === "function") {
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.7 } });
    setTimeout(
      () =>
        confetti({
          particleCount: 80,
          spread: 100,
          origin: { y: 0.5 }
        }),
      400
    );
  }

  if (challengeMode && score >= 95 && typeof confetti === "function") {
    setTimeout(
      () =>
        confetti({
          particleCount: 150,
          spread: 120,
          origin: { y: 0.6 },
          colors: ["#ffa500", "#22c55e", "#3b82f6", "#a855f7"]
        }),
      800
    );
  }
}

// ------------------------------
// 九九表
// ------------------------------
function buildKukuGrid() {
  let html =
    '<table class="kuku-table"><thead><tr><th class="hd">×</th>';
  for (let j = 1; j <= 9; j++) {
    html += `<th class="hd">${j}</th>`;
  }
  html += "</tr></thead><tbody>";

  for (let i = 1; i <= 9; i++) {
    html += `<tr><th class="hd">${i}</th>`;
    for (let j = 1; j <= 9; j++) {
      const ans = i * j;
      html += `
        <td class="expr" data-i="${i}" data-j="${j}">
          <span class="expr-main">${j}×${i}</span>
          <span class="expr-sub">=${ans}</span>
        </td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table>";
  els.kukuGrid.innerHTML = html;
}

function openKukuModal() {
  buildKukuGrid();
  const tip = KUKU_TIPS[Math.floor(Math.random() * KUKU_TIPS.length)];
  els.kukuHint.textContent = "💡 " + tip;
  els.kukuHint.style.display = "block";
  els.tableModal.classList.remove("hidden");
}

els.kukuFloatingBtn.onclick = openKukuModal;
els.closeModal.onclick = () => els.tableModal.classList.add("hidden");
if (modalBackdrop) {
  modalBackdrop.onclick = () => els.tableModal.classList.add("hidden");
}

// ------------------------------
// 難易度切り替え
// ------------------------------
function enableModes() {
  modeBtns.forEach((b) => b.classList.remove("disabled"));
}

modeBtns.forEach((btn) => {
  btn.onclick = () => {
    initAudio();
    if (btn.classList.contains("disabled")) return;
    if (nightMode) {
      // 夜モード中は難易度変更不可
      return;
    }

    // どのタイミングでも既存タイマーはクリア
    stopTimer();
    cancelPreCountdown();

    modeBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const n = Number(btn.dataset.qcount);
    totalQuestions = n;
    challengeMode = (n === 30);

    document.body.classList.remove("bg-easy", "bg-normal", "bg-hard");

    if (n === 10) {
      currentBgm = "easy";
      document.body.classList.add("bg-easy");
    } else if (n === 20) {
      currentBgm = "normal";
      document.body.classList.add("bg-normal");
    } else {
      currentBgm = "hard";
      document.body.classList.add("bg-hard");
    }

    if (bgmState === "playing") startBGM();
    makeQuiz();

    if (challengeMode) {
      runChallengeCountdown();
    }
  };
});

// ------------------------------
// BGM トグル
// ------------------------------
els.bgmToggle.onclick = () => {
  initAudio();
  if (!AC || !bgmGain) return;

  if (bgmState === "off") {
    // ON にする
    bgmState = "starting";
    els.bgmToggle.textContent = "🔊";
    els.bgmToggle.classList.add("bgm-on");
    els.bgmToggle.classList.remove("bgm-off");

    if (AC.state === "suspended") {
      AC.resume().then(() => {
        startBGM();
      });
    } else {
      startBGM();
    }
  } else {
    // OFF にする
    stopBGM();
    els.bgmToggle.textContent = "🔇";
    els.bgmToggle.classList.add("bgm-off");
    els.bgmToggle.classList.remove("bgm-on");
  }
};

// ------------------------------
// 結果画面ボタン
// ------------------------------
els.againBtn.onclick = () => {
  initAudio();
  if (!nightMode) enableModes();
  els.resultCard.classList.add("hidden");
  els.quizCard.classList.remove("hidden");
  makeQuiz();
  if (challengeMode && !nightMode) {
    runChallengeCountdown();
  } else if (nightMode) {
    runNightCountdown();
  }
};

function fullResetToEasy() {
  stopTimer();
  cancelPreCountdown();
  els.timeDisplay.classList.add("hidden");
  els.timeDisplay.textContent = "";

  nightMode = false;
  legendaryFlag = false;
  document.body.classList.remove("night-mode");

  enableModes();

  modeBtns.forEach((b) => b.classList.remove("active"));
  const easyBtn = [...modeBtns].find(
    (b) => b.dataset.qcount === "10"
  );
  if (easyBtn) easyBtn.classList.add("active");

  totalQuestions = 10;
  currentBgm = "easy";
  challengeMode = false;

  document.body.classList.remove("bg-easy", "bg-normal", "bg-hard");
  document.body.classList.add("bg-easy");

  if (bgmState === "playing") startBGM();
  els.resultCard.classList.add("hidden");
  els.quizCard.classList.remove("hidden");
  makeQuiz();
}

els.restartBtn.onclick = () => {
  initAudio();
  fullResetToEasy();
};

// ------------------------------
// 夜モード ON/OFF（タイトル長押し）
// ------------------------------
function toggleNightMode() {
  nightMode = !nightMode;
  legendaryFlag = false;

  stopTimer();
  cancelPreCountdown();
  els.timeDisplay.classList.add("hidden");
  els.timeDisplay.textContent = "";

  if (nightMode) {
    document.body.classList.add("night-mode");
    currentBgm = "night";

    totalQuestions = 30; // 夜モードは常に30問
    challengeMode = false;

    modeBtns.forEach((b) => b.classList.add("disabled"));

    if (bgmState === "playing") startBGM();
    makeQuiz();
    updateBuddy();
    runNightCountdown();
  } else {
    document.body.classList.remove("night-mode");

    totalQuestions = 10;
    challengeMode = false;
    currentBgm = "easy";

    enableModes();
    modeBtns.forEach((b) => b.classList.remove("active"));
    const easyBtn = [...modeBtns].find(
      (b) => b.dataset.qcount === "10"
    );
    if (easyBtn) easyBtn.classList.add("active");

    document.body.classList.remove("bg-easy", "bg-normal", "bg-hard");
    document.body.classList.add("bg-easy");

    if (bgmState === "playing") startBGM();
    makeQuiz();
    updateBuddy();
  }
}

// タイトル短押し / 長押し
(() => {
  let pressTimer = null;
  let longPressed = false;

  const start = (e) => {
    e.preventDefault();
    longPressed = false;
    if (pressTimer) clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      longPressed = true;
      toggleNightMode();
    }, 900);
  };

  const end = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
    if (!longPressed) {
      fullResetToEasy();
    }
  };

  els.title.addEventListener("mousedown", start);
  els.title.addEventListener("touchstart", start);
  ["mouseup", "mouseleave", "touchend", "touchcancel"].forEach((ev) =>
    els.title.addEventListener(ev, end)
  );
})();

// ------------------------------
// 初期化
// ------------------------------
els.bgmToggle.textContent = "🔇";
els.bgmToggle.classList.add("bgm-off");
document.body.classList.add("bg-easy");
makeQuiz();