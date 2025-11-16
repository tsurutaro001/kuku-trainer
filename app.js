/* =====================================================
   app.js
   - 九九練習アプリ（きょうりゅう・BGM・コンボ付き）
===================================================== */

let AC = null;
let bgmOn = false;
let bgmTimer = null;
let bgmGain = null;
let currentBgm = "easy";
let bgmSpeedFactor = 1.0;
let bgmNodes = [];
let bgmSectionIndex = 0; // その難易度の中で、どのセクションを再生するか

let nightMode = false;   // タイトル長押しで切り替え
let rainbowFlag = false; // 10コンボ時の虹きょうりゅう演出

/* -----------------------------------------------------
   Audio / BGM 初期化
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

/* 効果音（OK / NG / コンボ / レベルアップ / 結果） */
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
      osc.frequency.exponentialRampToValueAtTime(1500, AC.currentTime + 0.28);
      gain.gain.setValueAtTime(0.3, AC.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.28);
      end(0.28);
      return;
    case "NG":
      osc.type = "square";
      osc.frequency.setValueAtTime(220, AC.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, AC.currentTime + 0.32);
      gain.gain.setValueAtTime(0.3, AC.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.32);
      end(0.32);
      return;
    case "COMBO2":
      osc.type = "triangle";
      osc.frequency.setValueAtTime(700, AC.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1000, AC.currentTime + 0.15);
      gain.gain.value = 0.2;
      end(0.15);
      return;
    case "COMBO3":
      osc.type = "sine";
      osc.frequency.setValueAtTime(900, AC.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1600, AC.currentTime + 0.22);
      gain.gain.value = 0.25;
      end(0.22);
      return;
    case "COMBO4":
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(800, AC.currentTime);
      osc.frequency.exponentialRampToValueAtTime(2000, AC.currentTime + 0.28);
      gain.gain.value = 0.28;
      end(0.28);
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
      osc.frequency.linearRampToValueAtTime(1000, AC.currentTime + 0.24);
      gain.gain.value = 0.25;
      end(0.28);
      return;
  }
}

/* -----------------------------------------------------
   BGM パターン（各難易度 3 セクション）
----------------------------------------------------- */
// やさしい：E1（導入）E2（ちょっと盛り上がり）E3（落ち着く）
const BGM_EASY_SECTIONS = [
  {
    melody: [
      { freq: 523.25, len: 0.25 },
      { freq: 587.33, len: 0.25 },
      { freq: 659.25, len: 0.25 },
      { freq: 783.99, len: 0.25 },
      { freq: 659.25, len: 0.25 },
      { freq: 587.33, len: 0.25 },
      { freq: 523.25, len: 0.25 },
      { freq: 0,      len: 0.25 }
    ],
    bass: [
      { freq: 130.81, len: 0.5 },
      { freq: 0,      len: 0.25 },
      { freq: 98.00,  len: 0.5 },
      { freq: 0,      len: 0.25 }
    ]
  },
  {
    melody: [
      { freq: 587.33, len: 0.25 },
      { freq: 659.25, len: 0.25 },
      { freq: 783.99, len: 0.25 },
      { freq: 880.00, len: 0.25 },
      { freq: 783.99, len: 0.25 },
      { freq: 659.25, len: 0.25 },
      { freq: 587.33, len: 0.25 },
      { freq: 0,      len: 0.25 }
    ],
    bass: [
      { freq: 98.00,  len: 0.5 },
      { freq: 0,      len: 0.25 },
      { freq: 146.83, len: 0.5 },
      { freq: 0,      len: 0.25 }
    ]
  },
  {
    melody: [
      { freq: 659.25, len: 0.25 },
      { freq: 523.25, len: 0.25 },
      { freq: 587.33, len: 0.25 },
      { freq: 659.25, len: 0.25 },
      { freq: 587.33, len: 0.25 },
      { freq: 523.25, len: 0.25 },
      { freq: 440.00, len: 0.25 },
      { freq: 0,      len: 0.25 }
    ],
    bass: [
      { freq: 130.81, len: 0.5 },
      { freq: 0,      len: 0.25 },
      { freq: 130.81, len: 0.5 },
      { freq: 0,      len: 0.25 }
    ]
  }
];

// ふつう：N1, N2, N3
const BGM_NORMAL_SECTIONS = [
  {
    melody: [
      { freq: 659.25, len: 0.20 },
      { freq: 783.99, len: 0.20 },
      { freq: 987.77, len: 0.20 },
      { freq: 1046.5, len: 0.20 },
      { freq: 987.77, len: 0.20 },
      { freq: 783.99, len: 0.20 },
      { freq: 659.25, len: 0.20 },
      { freq: 0,      len: 0.20 }
    ],
    bass: [
      { freq: 130.81, len: 0.40 },
      { freq: 0,      len: 0.10 },
      { freq: 196.00, len: 0.40 },
      { freq: 0,      len: 0.10 }
    ]
  },
  {
    melody: [
      { freq: 523.25, len: 0.20 },
      { freq: 587.33, len: 0.20 },
      { freq: 659.25, len: 0.20 },
      { freq: 783.99, len: 0.20 },
      { freq: 659.25, len: 0.20 },
      { freq: 587.33, len: 0.20 },
      { freq: 523.25, len: 0.20 },
      { freq: 0,      len: 0.20 }
    ],
    bass: [
      { freq: 196.00, len: 0.40 },
      { freq: 0,      len: 0.10 },
      { freq: 146.83, len: 0.40 },
      { freq: 0,      len: 0.10 }
    ]
  },
  {
    melody: [
      { freq: 659.25, len: 0.20 },
      { freq: 698.46, len: 0.20 },
      { freq: 783.99, len: 0.20 },
      { freq: 987.77, len: 0.20 },
      { freq: 783.99, len: 0.20 },
      { freq: 698.46, len: 0.20 },
      { freq: 659.25, len: 0.20 },
      { freq: 0,      len: 0.20 }
    ],
    bass: [
      { freq: 196.00, len: 0.40 },
      { freq: 0,      len: 0.10 },
      { freq: 196.00, len: 0.40 },
      { freq: 0,      len: 0.10 }
    ]
  }
];

// ちょうせん：H1, H2, H3
const BGM_HARD_SECTIONS = [
  {
    melody: [
      { freq: 440.00, len: 0.15 },
      { freq: 523.25, len: 0.15 },
      { freq: 587.33, len: 0.15 },
      { freq: 659.25, len: 0.15 },
      { freq: 587.33, len: 0.15 },
      { freq: 523.25, len: 0.15 },
      { freq: 440.00, len: 0.15 },
      { freq: 0,      len: 0.15 }
    ],
    bass: [
      { freq: 110.00, len: 0.30 },
      { freq: 0,      len: 0.10 },
      { freq: 146.83, len: 0.30 },
      { freq: 0,      len: 0.10 }
    ]
  },
  {
    melody: [
      { freq: 659.25, len: 0.15 },
      { freq: 698.46, len: 0.15 },
      { freq: 880.00, len: 0.15 },
      { freq: 987.77, len: 0.15 },
      { freq: 880.00, len: 0.15 },
      { freq: 698.46, len: 0.15 },
      { freq: 659.25, len: 0.15 },
      { freq: 0,      len: 0.15 }
    ],
    bass: [
      { freq: 110.00, len: 0.30 },
      { freq: 0,      len: 0.10 },
      { freq: 196.00, len: 0.30 },
      { freq: 0,      len: 0.10 }
    ]
  },
  {
    melody: [
      { freq: 523.25, len: 0.15 },
      { freq: 587.33, len: 0.15 },
      { freq: 659.25, len: 0.15 },
      { freq: 783.99, len: 0.15 },
      { freq: 659.25, len: 0.15 },
      { freq: 587.33, len: 0.15 },
      { freq: 523.25, len: 0.15 },
      { freq: 0,      len: 0.15 }
    ],
    bass: [
      { freq: 146.83, len: 0.30 },
      { freq: 0,      len: 0.10 },
      { freq: 196.00, len: 0.30 },
      { freq: 0,      len: 0.10 }
    ]
  }
];

/* BGM 停止 */
function stopBGM() {
  bgmOn = false;
  if (bgmTimer) {
    clearInterval(bgmTimer);
    bgmTimer = null;
  }
  if (AC && bgmGain) {
    bgmGain.gain.setValueAtTime(0, AC.currentTime);
  }
  bgmNodes.forEach((o) => {
    try { o.stop(); } catch (e) {}
  });
  bgmNodes = [];
}

/* 1 セクション分スケジュール */
function scheduleBgmBar() {
  if (!AC || !bgmOn || !bgmGain) return;

  let SECTIONS;
  if (currentBgm === "easy") SECTIONS = BGM_EASY_SECTIONS;
  else if (currentBgm === "normal") SECTIONS = BGM_NORMAL_SECTIONS;
  else SECTIONS = BGM_HARD_SECTIONS;

  const section = SECTIONS[bgmSectionIndex % SECTIONS.length];
  const MELODY = section.melody;
  const BASS   = section.bass;

  const now = AC.currentTime;
  let tMel = now, tBass = now;
  const volMel = 0.07, volBass = 0.04;

  MELODY.forEach((n) => {
    const len = n.len * bgmSpeedFactor;
    if (n.freq > 0) {
      const o = AC.createOscillator();
      const g = AC.createGain();
      o.connect(g); g.connect(bgmGain);
      o.type = "square";
      o.frequency.setValueAtTime(n.freq, tMel);
      g.gain.setValueAtTime(volMel, tMel);
      g.gain.exponentialRampToValueAtTime(0.0001, tMel + len * 0.9);
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
      o.type = "square";
      o.frequency.setValueAtTime(n.freq, tBass);
      g.gain.setValueAtTime(volBass, tBass);
      g.gain.exponentialRampToValueAtTime(0.0001, tBass + len * 0.9);
      o.start(tBass);
      o.stop(tBass + len);
      bgmNodes.push(o);
    }
    tBass += len;
  });

  // 次は別のセクションへ（E1→E2→E3→E2→E3… のようなループもあり）
  bgmSectionIndex++;
}

/* BGM 開始（現在の難易度とスピードで） */
function startBGM() {
  initAudio();
  if (!AC || !bgmGain) return;
  if (AC.state === "suspended") AC.resume();

  stopBGM();
  bgmGain.gain.setValueAtTime(1.0, AC.currentTime);
  bgmOn = true;

  // 最初に使うセクション
  bgmSectionIndex = 0;

  let SECTIONS;
  if (currentBgm === "easy") SECTIONS = BGM_EASY_SECTIONS;
  else if (currentBgm === "normal") SECTIONS = BGM_NORMAL_SECTIONS;
  else SECTIONS = BGM_HARD_SECTIONS;

  const firstSection = SECTIONS[0];
  const barSec = firstSection.melody.reduce(
    (s, n) => s + n.len * bgmSpeedFactor,
    0
  );

  scheduleBgmBar();
  bgmTimer = setInterval(scheduleBgmBar, barSec * 1000);
}

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
const keys     = document.querySelectorAll(".key");

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
  els.timeDisplay.textContent = "60";
  els.timeDisplay.classList.remove("hidden");
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
  els.timeDisplay.classList.add("hidden");
}

/* -----------------------------------------------------
   問題生成
----------------------------------------------------- */
function makeQuiz() {
  const all = [];
  for (let a = 1; a <= 9; a++) {
    for (let b = 1; b <= 9; b++) all.push([a, b]);
  }
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  quiz = all.slice(0, totalQuestions);

  idx = 0;
  correctCount = 0;
  wrongCount   = 0;
  score        = 0;
  combo        = 0;
  currentInput = "";
  answerHistory = [];
  lastStage     = 1;
  rainbowFlag   = false;

  // コンボ表示リセット
  updateComboUI();

  // BGM 速さリセット
  bgmSpeedFactor = 1.0;
  if (bgmOn) startBGM();

  if (challengeMode) startTimer();
  else stopTimer();

  els.qTotal.textContent = totalQuestions;
  updateUI();
  updateBuddy();
}

/* -----------------------------------------------------
   UI 更新
----------------------------------------------------- */
function updateUI() {
  els.qNo.textContent   = idx + 1;
  els.left.textContent  = quiz[idx][0];
  els.right.textContent = quiz[idx][1];
  els.score.textContent = score;
  currentInput = "";
  rainbowFlag = false;
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
    else         k.classList.add("disabled");
  });
}

/* -----------------------------------------------------
   キーパッド入力
----------------------------------------------------- */
keys.forEach((btn) => {
  const t = btn.textContent.trim();
  if (/^\d$/.test(t)) {
    btn.onclick = () => {
      initAudio();
      if (btn.classList.contains("disabled")) return;
      if (currentInput.length < 2) {
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
  const ans  = a * b;
  const user = parseInt(currentInput, 10);
  const ok   = (user === ans);

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
   コンボ表示＆虹きょうりゅう
----------------------------------------------------- */
function updateComboUI() {
  const badge = els.comboBadge;

  if (combo >= 2) {
    badge.classList.remove("combo-show", "combo-hot");
    void badge.offsetWidth;

    badge.textContent = `${combo}コンボ！🔥`;
    if (combo >= 10) badge.classList.add("combo-hot");
    badge.classList.add("combo-show");

    // 10コンボ以上で一時的に虹きょうりゅう
    if (combo >= 10 && !rainbowFlag) {
      rainbowFlag = true;
      els.dinoEmoji.textContent = "🌈🦖";
      els.dinoMsg.textContent = "スーパーれんしゅうタイム！";
      els.starFill.style.background =
        "linear-gradient(90deg, #f97316, #eab308, #22c55e, #3b82f6, #a855f7)";
      setTimeout(() => {
        // 次の updateBuddy で上書きされるので、ここではバー色だけ戻す
        els.starFill.style.background =
          "linear-gradient(90deg, #ffeb8b, #ffcc00)";
        updateBuddy();
      }, 1200);
    }
  } else {
    badge.classList.remove("combo-show", "combo-hot");
    badge.textContent = "";
  }
}

/* コンボに応じた BGM 速度 */
function updateComboBgmSpeed() {
  const old = bgmSpeedFactor;
  if (combo >= 8)      bgmSpeedFactor = 0.6;
  else if (combo >= 4) bgmSpeedFactor = 0.8;
  else                 bgmSpeedFactor = 1.0;

  if (old !== bgmSpeedFactor && bgmOn) startBGM();
}

/* -----------------------------------------------------
   メッセージ
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
   きょうりゅうエリア
----------------------------------------------------- */
function updateBuddy() {
  const ratio = totalQuestions ? correctCount / totalQuestions : 0;
  els.starFill.style.width = (ratio * 100) + "%";

  let stage = 1;
  if (ratio >= 0.75)      stage = 4;
  else if (ratio >= 0.5)  stage = 3;
  else if (ratio >= 0.25) stage = 2;

  if (stage > lastStage) {
    els.dinoEmoji.classList.add("dino-bounce");
    playSE("LEVELUP");
    setTimeout(() => els.dinoEmoji.classList.remove("dino-bounce"), 600);
  }
  lastStage = stage;

  let emoji = "🦎";
  if (stage === 2) emoji = "🐊";
  else if (stage === 3) emoji = "🦖";
  else if (stage === 4) emoji = "🌋🦖🦕🌋";

  // 夜モードのときはムーンきょうりゅう
  if (nightMode) emoji = "🌙🦖";

  els.dinoEmoji.textContent = emoji;
  els.dinoName.textContent = `レベル ${stage}`;

  if (ratio === 1) {
    els.dinoMsg.textContent = "ぜんもんせいかい！きょうりゅうもびっくり！";
  } else if (ratio >= 0.8) {
    els.dinoMsg.textContent = "あとちょっとでパーフェクト！";
  } else if (ratio >= 0.5) {
    els.dinoMsg.textContent = "いいちょうし！このままつづけよう！";
  } else if (ratio > 0) {
    els.dinoMsg.textContent = "すこしずつできてきたよ！";
  } else {
    els.dinoMsg.textContent = "がんばろう！";
  }

  els.dinoArea.classList.remove(
    "skin-forest", "skin-desert", "skin-volcano", "skin-super"
  );
  if (stage === 1)      els.dinoArea.classList.add("skin-forest");
  else if (stage === 2) els.dinoArea.classList.add("skin-desert");
  else if (stage === 3) els.dinoArea.classList.add("skin-volcano");
  else                  els.dinoArea.classList.add("skin-super");
}

/* スター演出 */
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

  // 結果画面中は難易度変更を禁止
  modeBtns.forEach((b) => b.classList.add("disabled"));

  let medal;
  if (score >= 95)      medal = "🥇 金メダル！";
  else if (score >= 80) medal = "🥈 銀メダル！";
  else if (score >= 60) medal = "🥉 銅メダル！";
  else                  medal = "💪 またチャレンジしよう！";

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
    msg = "すこしむずかしかったかな？きょうりゅうといっしょにれんしゅうしよう！";
  }

  if (reason === "timeup")      els.finalScore.textContent = "じかんぎれ！";
  else if (reason === "gameover") els.finalScore.textContent = "ゲームオーバー！";
  else                           els.finalScore.textContent = score + "てん";

  const historyHtml = answerHistory
    .map((h, i) =>
      `Q${i + 1}: ${h.a}×${h.b}=${h.ans} ／ あなた：<strong class="${h.ok ? "ok" : "ng"}">${h.user}</strong>`
    ).join("<br>");

  els.summaryList.innerHTML =
    `<div class="medal">${medal}</div><p>${msg}</p><hr>` +
    historyHtml;

  playSE("RESULT");

  // 通常の花火
  if (score === 100 && typeof confetti === "function") {
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.7 } });
    setTimeout(
      () =>
        confetti({ particleCount: 80, spread: 100, origin: { y: 0.5 } }),
      400
    );
  }

  // ちょうせんモードで 95 点以上なら特別花火
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
els.closeModal.onclick      = () => els.tableModal.classList.add("hidden");

const modalBackdrop = document.querySelector("#tableModal .modal-backdrop");
if (modalBackdrop) {
  modalBackdrop.onclick = () => els.tableModal.classList.add("hidden");
}

/* 九九表を生成（列×行の順）＋9×9長押しでヒント */
function buildKukuGrid() {
  let html = `<table class="kuku-table"><thead><tr><th class="hd">×</th>`;
  for (let j = 1; j <= 9; j++) {
    html += `<th class="hd">${j}</th>`;
  }
  html += `</tr></thead><tbody>`;

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
    html += `</tr>`;
  }
  html += `</tbody></table>`;
  els.kukuGrid.innerHTML = html;

  // ヒントは一度だけ
  if (!kukuHintShown) {
    const cell = els.kukuGrid.querySelector('td.expr[data-i="9"][data-j="9"]');
    if (cell) {
      let timer = null;
      const start = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          if (!kukuHintShown) {
            kukuHintShown = true;
            els.kukuHint.textContent =
              "ひみつヒント：9のだんは、指をおって数えるとおぼえやすいよ！";
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
      ["mouseup", "mouseleave", "touchend", "touchcancel"].forEach((ev) =>
        cell.addEventListener(ev, cancel)
      );
    }
  }
}

/* -----------------------------------------------------
   難易度切り替え
----------------------------------------------------- */
modeBtns.forEach((btn) => {
  btn.onclick = () => {
    initAudio();
    if (btn.classList.contains("disabled")) return;

    modeBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const n = Number(btn.dataset.qcount);
    totalQuestions = n;

    document.body.classList.remove("bg-easy", "bg-normal", "bg-hard");

    if (n === 10) {
      currentBgm = "easy";
      challengeMode = false;
      document.body.classList.add("bg-easy");
    } else if (n === 20) {
      currentBgm = "normal";
      challengeMode = false;
      document.body.classList.add("bg-normal");
    } else {
      currentBgm = "hard";
      challengeMode = true;
      document.body.classList.add("bg-hard");
    }

    if (bgmOn) startBGM();
    makeQuiz();
  };
});

/* -----------------------------------------------------
   BGM ON/OFF トグル
----------------------------------------------------- */
els.bgmToggle.onclick = () => {
  initAudio();
  if (!AC || !bgmGain) return;

  if (!bgmOn) {
    startBGM();
    els.bgmToggle.textContent = "🔊";
    els.bgmToggle.classList.add("bgm-on");
    els.bgmToggle.classList.remove("bgm-off");
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
  enableModes();
  els.resultCard.classList.add("hidden");
  els.quizCard.classList.remove("hidden");
  makeQuiz();
};

els.restartBtn.onclick = () => {
  initAudio();
  fullResetToEasy();
};

/* -----------------------------------------------------
   タイトルタップ：完全リセット
   長押し：夜モード切り替え
----------------------------------------------------- */
function fullResetToEasy() {
  enableModes();

  modeBtns.forEach((b) => b.classList.remove("active"));
  const easyBtn = [...modeBtns].find((b) => b.dataset.qcount === "10");
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

function toggleNightMode() {
  nightMode = !nightMode;
  if (nightMode) {
    document.body.classList.add("night-mode");
  } else {
    document.body.classList.remove("night-mode");
  }
  updateBuddy();
}

// タイトルの短押し/長押し判定
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
    }, 900); // 0.9秒以上で長押し扱い
  };

  const end = (e) => {
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