/* =====================================================
   app.js
   九九練習アプリ：BGM / きょうりゅう / コンボ / 夜モード
===================================================== */

let AC = null;
let bgmOn = false;
let bgmTimer = null;
let bgmGain = null;
let bgmNodes = [];
let currentBgm = "easy"; // "easy" | "normal" | "hard" | "night"
let bgmSpeedFactor = 1.0;
let bgmSectionIndex = 0;

let nightMode = false;      // タイトル長押しでON（ちょうむず）
let legendaryFlag = false;  // 10コンボ以上で伝説ドラゴン

/* -----------------------------------------------------
   Audio 初期化
----------------------------------------------------- */
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

/* -----------------------------------------------------
   効果音
----------------------------------------------------- */
function playSE(type) {
  if (!AC) return;

  const osc = AC.createOscillator();
  const gain = AC.createGain();
  osc.connect(gain);
  gain.connect(AC.destination);

  const end = (t) => {
    osc.start();
    osc.stop(AC.currentTime + t);
  };

  switch (type) {
    case "OK":
      osc.type = "sine";
      osc.frequency.setValueAtTime(900, AC.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1500, AC.currentTime + 0.25);
      gain.gain.value = 0.25;
      end(0.25);
      return;

    case "NG":
      osc.type = "square";
      osc.frequency.setValueAtTime(220, AC.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, AC.currentTime + 0.28);
      gain.gain.value = 0.25;
      end(0.28);
      return;

    case "COMBO2":
      osc.type = "triangle";
      osc.frequency.setValueAtTime(700, AC.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1000, AC.currentTime + 0.16);
      gain.gain.value = 0.2;
      end(0.16);
      return;

    case "COMBO3":
      osc.type = "sine";
      osc.frequency.setValueAtTime(900, AC.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1600, AC.currentTime + 0.20);
      gain.gain.value = 0.25;
      end(0.20);
      return;

    case "COMBO4":
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(800, AC.currentTime);
      osc.frequency.exponentialRampToValueAtTime(2000, AC.currentTime + 0.26);
      gain.gain.value = 0.28;
      end(0.26);
      return;

    case "LEVELUP":
      osc.type = "square";
      osc.frequency.setValueAtTime(600, AC.currentTime);
      osc.frequency.linearRampToValueAtTime(1200, AC.currentTime + 0.25);
      gain.gain.value = 0.25;
      end(0.25);
      return;

    case "RESULT":
      osc.type = "square";
      osc.frequency.setValueAtTime(800, AC.currentTime);
      osc.frequency.linearRampToValueAtTime(1200, AC.currentTime + 0.12);
      osc.frequency.linearRampToValueAtTime(900, AC.currentTime + 0.24);
      gain.gain.value = 0.25;
      end(0.28);
      return;

    case "DINO": // きょうりゅうタップ
      osc.type = "triangle";
      osc.frequency.setValueAtTime(1000, AC.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1600, AC.currentTime + 0.20);
      gain.gain.value = 0.3;
      end(0.20);
      return;
  }
}

/* -----------------------------------------------------
   🎵 BGMセクション
----------------------------------------------------- */
function makeTone(freq, len) {
  return { freq, len };
}

/* --- やさしい（明るめ） --- */
const BGM_EASY = [
  {
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
  }
];

/* --- ふつう（テンポアップ） --- */
const BGM_NORMAL = [
  {
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
  }
];

/* --- ちょうせん（緊張感） --- */
const BGM_HARD = [
  {
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
  }
];

/* --- 👻 ちょうむず（夜モード）幽霊屋敷風 --- */
const BGM_NIGHT = [
  {
    melody: [
      makeTone(392, 0.30), makeTone(0,   0.10), // G4
      makeTone(370, 0.25), makeTone(0,   0.10), // F#
      makeTone(349, 0.20), makeTone(0,   0.20), // F
      makeTone(311, 0.30), makeTone(0,   0.10)  // Eb
    ],
    bass: [
      makeTone(98,  0.4),  makeTone(0, 0.2),
      makeTone(82,  0.4),  makeTone(0, 0.2)
    ]
  },
  {
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
  }
];

/* -----------------------------------------------------
   BGM 停止
----------------------------------------------------- */
function stopBGM() {
  if (!AC || !bgmGain) return;
  bgmOn = false;

  if (bgmTimer) {
    clearInterval(bgmTimer);
    bgmTimer = null;
  }
  bgmGain.gain.setValueAtTime(0, AC.currentTime);

  bgmNodes.forEach((o) => {
    try { o.stop(); } catch (e) {}
  });
  bgmNodes = [];
}

/* -----------------------------------------------------
   1小節分をスケジュール
----------------------------------------------------- */
function scheduleBgmBar() {
  if (!AC || !bgmOn || !bgmGain) return;

  let SECT;
  if (currentBgm === "easy")      SECT = BGM_EASY;
  else if (currentBgm === "normal") SECT = BGM_NORMAL;
  else if (currentBgm === "hard")   SECT = BGM_HARD;
  else                              SECT = BGM_NIGHT;

  const s = SECT[bgmSectionIndex % SECT.length];
  const MELODY = s.melody;
  const BASS   = s.bass;

  const now = AC.currentTime;
  let tMel = now, tBass = now;

  MELODY.forEach((n) => {
    const len = n.len * bgmSpeedFactor;
    if (n.freq > 0) {
      const o = AC.createOscillator();
      const g = AC.createGain();
      o.connect(g); g.connect(bgmGain);
      o.type = (currentBgm === "night" ? "triangle" : "square");
      o.frequency.setValueAtTime(n.freq, tMel);
      g.gain.value = (currentBgm === "night" ? 0.15 : 0.07);
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
      o.connect(g); g.connect(bgmGain);
      o.type = (currentBgm === "night" ? "sine" : "square");
      o.frequency.setValueAtTime(n.freq, tBass);
      g.gain.value = (currentBgm === "night" ? 0.10 : 0.04);
      o.start(tBass);
      o.stop(tBass + len);
      bgmNodes.push(o);
    }
    tBass += len;
  });

  bgmSectionIndex++;
}

/* -----------------------------------------------------
   BGM 開始
----------------------------------------------------- */
function startBGM() {
  initAudio();
  if (!AC || !bgmGain) return;

  const doStart = () => {
    stopBGM();
    bgmOn = true;
    // 夜モードだけ音量アップ
    bgmGain.gain.value = (currentBgm === "night" ? 1.4 : 1.0);
    bgmSectionIndex = 0;

    let SECT;
    if (currentBgm === "easy")      SECT = BGM_EASY;
    else if (currentBgm === "normal") SECT = BGM_NORMAL;
    else if (currentBgm === "hard")   SECT = BGM_HARD;
    else                              SECT = BGM_NIGHT;

    const barSec = SECT[0].melody.reduce(
      (s, n) => s + n.len * bgmSpeedFactor,
      0
    );

    scheduleBgmBar();
    bgmTimer = setInterval(scheduleBgmBar, barSec * 1000);
  };

  if (AC.state === "suspended") {
    AC.resume().then(doStart);
  } else {
    doStart();
  }
}

/* タブ復帰でBGM安定 */
document.addEventListener("visibilitychange", () => {
  if (!AC || !bgmGain) return;
  if (document.visibilityState === "visible") {
    if (bgmOn) {
      if (AC.state === "suspended") {
        AC.resume().then(startBGM);
      } else {
        startBGM();
      }
    }
  } else {
    if (bgmOn) stopBGM();
  }
});

/* -----------------------------------------------------
   DOM 取得
----------------------------------------------------- */
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

/* -----------------------------------------------------
   状態管理
----------------------------------------------------- */
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
let timeTimerId = null;
let lastStage = 1;
let kukuHintShown = false;

/* -----------------------------------------------------
   タイマー（ちょうせん用）
----------------------------------------------------- */
function startTimer() {
  timeLeft = 60;
  els.timeDisplay.classList.remove("hidden");
  els.timeDisplay.classList.remove("countdown");
  els.timeDisplay.textContent = "60";
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
function stopTimer() {
  if (timeTimerId) {
    clearInterval(timeTimerId);
    timeTimerId = null;
  }
}

/* ちょうせんモード開始前のカウントダウン */
function runChallengeCountdown() {
  stopTimer();
  let count = 3;
  els.timeDisplay.classList.remove("hidden");
  els.timeDisplay.classList.add("countdown");
  els.timeDisplay.textContent = count;
  setKeypadEnabled(false);
  els.submitBtn.disabled = true;

  const timer = setInterval(() => {
    count--;
    if (count > 0) {
      els.timeDisplay.textContent = count;
    } else {
      clearInterval(timer);
      els.timeDisplay.textContent = "すたーと！";
      playSE("OK");
      setTimeout(() => {
        els.timeDisplay.classList.remove("countdown");
        setKeypadEnabled(true);
        els.submitBtn.disabled = false;
        startTimer();
      }, 600);
    }
  }, 1000);
}

/* -----------------------------------------------------
   問題生成
   通常：1〜9×1〜9
   夜モード：10〜19×1〜9
----------------------------------------------------- */
function makeQuiz() {
  const all = [];
  if (nightMode) {
    for (let a = 10; a <= 19; a++) {
      for (let b = 1; b <= 9; b++) all.push([a, b]);
    }
  } else {
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
  if (bgmOn) startBGM();

  stopTimer();
  els.timeDisplay.classList.add("hidden");
  els.timeDisplay.textContent = "";

  els.qTotal.textContent = totalQuestions;
  updateUI();
  updateBuddy();
  updateComboUI();
  setKeypadEnabled(true);
  els.submitBtn.disabled = false;
}

/* -----------------------------------------------------
   UI更新
----------------------------------------------------- */
function updateUI() {
  els.qNo.textContent = idx + 1;
  els.left.textContent = quiz[idx][0];
  els.right.textContent = quiz[idx][1];
  els.score.textContent = score;
  currentInput = "";
  renderAnswer();
  feedback("");
}

/* 回答欄 */
function renderAnswer() {
  els.answerBox.textContent = currentInput || "□";
}

/* キーパッド有効/無効 */
function setKeypadEnabled(enabled) {
  keys.forEach((k) => {
    if (enabled) k.classList.remove("disabled");
    else k.classList.add("disabled");
  });
}

/* -----------------------------------------------------
   キーパッド入力（夜モードは3桁まで）
----------------------------------------------------- */
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

/* -----------------------------------------------------
   採点処理
----------------------------------------------------- */
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
    legendaryFlag = false; // ドラゴン終了
    playSE("NG");
  }

  if (challengeMode && wrongCount >= 3) {
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

/* -----------------------------------------------------
   コンボ表示＆BGMスピード
----------------------------------------------------- */
function updateComboUI() {
  const badge = els.comboBadge;

  if (combo >= 2) {
    badge.classList.remove("combo-show", "combo-hot");
    void badge.offsetWidth;

    badge.textContent = `${combo}コンボ！🔥`;
    if (combo >= 10) badge.classList.add("combo-hot");
    badge.classList.add("combo-show");

    if (combo >= 10 && !legendaryFlag) {
      legendaryFlag = true;
      updateBuddy(); // ドラゴン発動
    }
  } else {
    badge.classList.remove("combo-show", "combo-hot");
    badge.textContent = "";
    if (legendaryFlag) {
      legendaryFlag = false;
      updateBuddy(); // ドラゴン解除
    }
  }
}

function updateComboBgmSpeed() {
  const old = bgmSpeedFactor;
  if (combo >= 8) bgmSpeedFactor = 0.6;
  else if (combo >= 4) bgmSpeedFactor = 0.8;
  else bgmSpeedFactor = 1.0;

  if (old !== bgmSpeedFactor && bgmOn) startBGM();
}

/* -----------------------------------------------------
   メッセージ表示
----------------------------------------------------- */
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

/* -----------------------------------------------------
   きょうりゅうエリア（伝説ドラゴン対応）
----------------------------------------------------- */
function updateBuddy() {
  const ratio = totalQuestions ? correctCount / totalQuestions : 0;
  els.starFill.style.width = ratio * 100 + "%";

  let stage = 1;
  if (ratio >= 0.75) stage = 4;
  else if (ratio >= 0.5) stage = 3;
  else if (ratio >= 0.25) stage = 2;

  if (stage > lastStage && !legendaryFlag) {
    els.dinoEmoji.classList.add("dino-bounce");
    playSE("LEVELUP");
    setTimeout(
      () => els.dinoEmoji.classList.remove("dino-bounce"),
      600
    );
  }
  lastStage = stage;

  // 背景スキン
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

  // ゲージ色＆表示
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

/* きょうりゅうタップ：ジャンプ＋効果音 */
els.dinoEmoji.addEventListener("click", () => {
  initAudio();
  els.dinoEmoji.classList.add("dino-jump");
  playSE("DINO");
  setTimeout(() => els.dinoEmoji.classList.remove("dino-jump"), 400);
});

/* -----------------------------------------------------
   スター演出
----------------------------------------------------- */
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

/* -----------------------------------------------------
   結果画面
----------------------------------------------------- */
function showResult(reason = "") {
  els.quizCard.classList.add("hidden");
  els.resultCard.classList.remove("hidden");
  stopTimer();
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

  if (reason === "timeup")
    els.finalScore.textContent = "じかんぎれ！";
  else if (reason === "gameover")
    els.finalScore.textContent = "ゲームオーバー！";
  else els.finalScore.textContent = score + "てん";

  const historyHtml = answerHistory
    .map(
      (h, i) =>
        `Q${i + 1}: ${h.a}×${h.b}=${h.ans} ／ あなた：<strong class="${
          h.ok ? "ok" : "ng"
        }">${h.user}</strong>`
    )
    .join("<br>");

  els.summaryList.innerHTML =
    `<div class="medal">${medal}</div><p>${msg}</p><hr>` +
    historyHtml;

  playSE("RESULT");

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

/* -----------------------------------------------------
   九九表モーダル
----------------------------------------------------- */
function openKukuModal() {
  buildKukuGrid();
  els.tableModal.classList.remove("hidden");
}

els.kukuFloatingBtn.onclick = openKukuModal;
els.closeModal.onclick = () => els.tableModal.classList.add("hidden");

const modalBackdrop = document.querySelector(
  "#tableModal .modal-backdrop"
);
if (modalBackdrop) {
  modalBackdrop.onclick = () => els.tableModal.classList.add("hidden");
}

/* 九九表（9×9 長押しでヒント） */
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

  if (!kukuHintShown) {
    const cell = els.kukuGrid.querySelector(
      'td.expr[data-i="9"][data-j="9"]'
    );
    if (cell) {
      let timer = null;
      const start = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          if (!kukuHintShown) {
            kukuHintShown = true;
            els.kukuHint.textContent =
              "ひみつヒント：9のだんは、指を10本たてて「おった指の前が十のくらい・うしろが一のくらい」で計算できるよ！";
            els.kukuHint.style.display = "block";
          }
        }, 800);
      };
      const cancel = () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      };
      cell.addEventListener("mousedown", start);
      cell.addEventListener("touchstart", start);
      ["mouseup", "mouseleave", "touchend", "touchcancel"].forEach(
        (ev) => cell.addEventListener(ev, cancel)
      );
    }
  }
}

/* -----------------------------------------------------
   難易度切り替え（夜モード中は無効）
----------------------------------------------------- */
modeBtns.forEach((btn) => {
  btn.onclick = () => {
    initAudio();
    if (btn.classList.contains("disabled")) return;
    if (nightMode) return; // 夜モード中は変更不可

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

    if (bgmOn) startBGM();
    makeQuiz();
    if (challengeMode) runChallengeCountdown();
  };
});

/* -----------------------------------------------------
   BGM ON/OFF トグル（resumeを確実に）
----------------------------------------------------- */
els.bgmToggle.onclick = () => {
  initAudio();
  if (!AC || !bgmGain) return;

  if (!bgmOn) {
    const doPlay = () => {
      startBGM();
      els.bgmToggle.textContent = "🔊";
      els.bgmToggle.classList.add("bgm-on");
      els.bgmToggle.classList.remove("bgm-off");
    };
    if (AC.state === "suspended") {
      AC.resume().then(doPlay);
    } else {
      doPlay();
    }
  } else {
    stopBGM();
    els.bgmToggle.textContent = "🔇";
    els.bgmToggle.classList.add("bgm-off");
    els.bgmToggle.classList.remove("bgm-on");
  }
};

/* -----------------------------------------------------
   結果画面ボタン
----------------------------------------------------- */
function enableModes() {
  modeBtns.forEach((b) => b.classList.remove("disabled"));
}

els.againBtn.onclick = () => {
  initAudio();
  if (!nightMode) enableModes(); // 夜モード中は無効のまま
  els.resultCard.classList.add("hidden");
  els.quizCard.classList.remove("hidden");
  makeQuiz();
  if (challengeMode) runChallengeCountdown();
};

els.restartBtn.onclick = () => {
  initAudio();
  fullResetToEasy();
};

/* -----------------------------------------------------
   完全リセット（やさしい＋通常モードに戻す）
----------------------------------------------------- */
function fullResetToEasy() {
  stopTimer();
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

  if (bgmOn) startBGM();
  els.resultCard.classList.add("hidden");
  els.quizCard.classList.remove("hidden");
  makeQuiz();
}

/* -----------------------------------------------------
   夜モード切り替え（タイトル長押し）
   - ON時：難易度ボタン無効化＋タイマー停止
----------------------------------------------------- */
function toggleNightMode() {
  nightMode = !nightMode;
  legendaryFlag = false;

  if (nightMode) {
    document.body.classList.add("night-mode");
    currentBgm = "night";

    // ちょうせん中ならタイマー停止＆非表示
    challengeMode = false;
    stopTimer();
    els.timeDisplay.classList.add("hidden");
    els.timeDisplay.textContent = "";

    // 難易度ボタン無効化
    modeBtns.forEach((b) => b.classList.add("disabled"));
  } else {
    document.body.classList.remove("night-mode");
    // 難易度ボタン再有効化
    enableModes();

    // 現在の問題数に応じて通常BGMへ
    if (totalQuestions === 10) currentBgm = "easy";
    else if (totalQuestions === 20) currentBgm = "normal";
    else currentBgm = "hard";
  }

  if (bgmOn) startBGM();
  makeQuiz();
  updateBuddy();
}

/* タイトルの短押し / 長押し */
(() => {
  let pressTimer = null;
  let longPressed = false;

  const start = (e) => {
    e.preventDefault();
    longPressed = false;
    if (pressTimer) clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      longPressed = true;
      toggleNightMode(); // 夜モードON/OFF
    }, 900); // 0.9秒以上で長押し
  };

  const end = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
    if (!longPressed) {
      // 通常タップ → 完全リセット
      fullResetToEasy();
    }
  };

  els.title.addEventListener("mousedown", start);
  els.title.addEventListener("touchstart", start);
  ["mouseup", "mouseleave", "touchend", "touchcancel"].forEach((ev) =>
    els.title.addEventListener(ev, end)
  );
})();

/* -----------------------------------------------------
   初期化
----------------------------------------------------- */
els.bgmToggle.textContent = "🔇";
els.bgmToggle.classList.add("bgm-off");
document.body.classList.add("bg-easy");
makeQuiz();