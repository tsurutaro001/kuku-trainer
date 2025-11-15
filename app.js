/* =====================================================
   app.js v11
   - BGMアイコン制御
   - コンボ演出強化
   - 恐竜進化（🦎→🐊→🦖→🌋🦖🦕🌋）
   - スキン切り替え
   - キーパッド一時無効化
   ===================================================== */

let AC = null;
let bgmOn = false;
let bgmTimer = null;
let bgmGain = null;
let currentBgm = "easy";
let bgmSpeedFactor = 1.0;
let bgmNodes = [];

/* ---------- Audio / BGM ---------- */
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

/* 効果音 */
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

/* BGMパターン */
const BGM_EASY_MELODY = [
  {freq:523.25,len:0.25},{freq:587.33,len:0.25},{freq:659.25,len:0.25},{freq:783.99,len:0.25},
  {freq:659.25,len:0.25},{freq:587.33,len:0.25},{freq:523.25,len:0.25},{freq:0,len:0.25}
];
const BGM_EASY_BASS = [
  {freq:130.81,len:0.5},{freq:0,len:0.25},{freq:98.00,len:0.5},{freq:0,len:0.25}
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
  if (currentBgm === "easy") {
    MELODY = BGM_EASY_MELODY; BASS = BGM_EASY_BASS;
  } else if (currentBgm === "normal") {
    MELODY = BGM_NORMAL_MELODY; BASS = BGM_NORMAL_BASS;
  } else {
    MELODY = BGM_HARD_MELODY; BASS = BGM_HARD_BASS;
  }

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

/* ---------- DOM ---------- */
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
  bgmToggle: document.getElementById("bgmToggle"),
  timeDisplay: document.getElementById("timeDisplay")
};
const modeBtns = document.querySelectorAll(".mode-btn");
const keys = document.querySelectorAll(".key");

/* ---------- 状態 ---------- */
let quiz = [], idx = 0, correctCount = 0, wrongCount = 0, totalQuestions = 10;
let score = 0, combo = 0, currentInput = "", history = [];
let challengeMode = false;
let timeLeft = 0, timeTimerId = null;
let lastStage = 1;

/* タイマー */
function startTimer() {
  timeLeft = 60;
  els.timeDisplay.textContent = "60";
  els.timeDisplay.classList.remove("hidden");
  timeTimerId = setInterval(() => {
    timeLeft--;
    els.timeDisplay.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timeTimerId);
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

/* ---------- 問題生成 ---------- */
function makeQuiz() {
  const all = [];
  for (let a = 1; a <= 9; a++) for (let b = 1; b <= 9; b++) all.push([a,b]);
  for (let i = all.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  quiz = all.slice(0, totalQuestions);

  idx = 0; correctCount = 0; wrongCount = 0; score = 0;
  combo = 0; currentInput = ""; history = [];
  lastStage = 1;
  if (challengeMode) startTimer(); else stopTimer();

  els.qTotal.textContent = totalQuestions;
  updateUI();
  updateBuddy();
}

/* UI更新 */
function updateUI() {
  els.qNo.textContent = idx + 1;
  els.left.textContent = quiz[idx][0];
  els.right.textContent = quiz[idx][1];
  els.score.textContent = score;
  currentInput = "";
  renderAnswer();
  feedback("");
  updateComboUI();
}

/* 回答表示 */
function renderAnswer() {
  els.answerBox.textContent = currentInput || "□";
}

/* キーパッド有効/無効 */
function setKeypadEnabled(enabled) {
  keys.forEach(k => {
    if (enabled) {
      k.classList.remove("disabled");
    } else {
      k.classList.add("disabled");
    }
  });
}

/* キーパッド入力 */
keys.forEach(btn => {
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

/* 採点 */
els.submitBtn.onclick = () => {
  initAudio();
  if (!currentInput) {
    feedback("数字を入力してね", null);
    return;
  }

  const [a,b] = quiz[idx];
  const ans = a * b;
  const user = parseInt(currentInput, 10);
  const ok = (user === ans);

  // 正解時のポヨン
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
    return showResult("gameover");
  }

  score = Math.round((correctCount / totalQuestions) * 100);
  els.score.textContent = score;

  history.push({a,b,ans,user,ok});
  feedback("", ok);
  updateBuddy();
  updateComboUI();
  updateComboBgmSpeed();

  // 採点中は一瞬キーパッド無効
  setKeypadEnabled(false);

  setTimeout(() => {
    setKeypadEnabled(true);
    if (idx < totalQuestions - 1) {
      idx++;
      updateUI();
    } else {
      showResult();
    }
  }, ok ? 700 : 900);
};

/* コンボ表示・BGM速度 */
function updateComboUI() {
  if (combo >= 2) {
    els.comboBadge.textContent = combo + "コンボ！🔥";
    els.comboBadge.classList.add("combo-show");
    if (combo >= 10) els.comboBadge.classList.add("combo-hot");
    else els.comboBadge.classList.remove("combo-hot");
  } else {
    els.comboBadge.classList.remove("combo-show","combo-hot");
    els.comboBadge.textContent = "";
  }
}

function updateComboBgmSpeed() {
  const old = bgmSpeedFactor;
  if (combo >= 8) bgmSpeedFactor = 0.6;
  else if (combo >= 4) bgmSpeedFactor = 0.8;
  else bgmSpeedFactor = 1.0;

  if (old !== bgmSpeedFactor && bgmOn) {
    startBGM();
  }
}

/* フィードバック */
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

/* 恐竜＆スキン（進化 C：🦎→🐊→🦖→🌋🦖🦕🌋） */
function updateBuddy() {
  const ratio = totalQuestions ? correctCount / totalQuestions : 0;
  els.starFill.style.width = (ratio * 100) + "%";

  // ステージ判定（1〜4）
  let stage = 1;
  if (ratio >= 0.75) stage = 4;
  else if (ratio >= 0.5) stage = 3;
  else if (ratio >= 0.25) stage = 2;

  // 進化時アニメ
  if (stage > lastStage) {
    els.dinoEmoji.classList.add("dino-bounce");
    playSE("LEVELUP");
    setTimeout(() => els.dinoEmoji.classList.remove("dino-bounce"), 600);
  }
  lastStage = stage;

  // 絵文字
  let emoji = "🦎";
  if (stage === 2) emoji = "🐊";
  else if (stage === 3) emoji = "🦖";
  else if (stage === 4) emoji = "🌋🦖🦕🌋";

  els.dinoEmoji.textContent = emoji;
  els.dinoName.textContent = `レベル ${stage}`;

  // メッセージ
  if (ratio === 1)      els.dinoMsg.textContent = "ぜんもんせいかい！きょうりゅうもびっくり！";
  else if (ratio >= .8) els.dinoMsg.textContent = "あとちょっとでパーフェクト！";
  else if (ratio >= .5) els.dinoMsg.textContent = "いいちょうし！このままつづけよう！";
  else if (ratio > 0)   els.dinoMsg.textContent = "すこしずつできてきたよ！";
  else                  els.dinoMsg.textContent = "がんばろう！";

  // スキン（①②③④）
  els.dinoArea.classList.remove("skin-forest","skin-desert","skin-volcano","skin-supervolcano");
  if (stage === 1) els.dinoArea.classList.add("skin-forest");
  else if (stage === 2) els.dinoArea.classList.add("skin-desert");
  else if (stage === 3) els.dinoArea.classList.add("skin-volcano");
  else els.dinoArea.classList.add("skin-supervolcano");
}

/* スター演出 */
function spawnStar() {
  const star = document.createElement("div");
  star.textContent = "⭐";
  star.className = "starburst";
  document.body.appendChild(star);
  setTimeout(() => star.remove(), 700);
}

/* 結果 */
function showResult(reason = "") {
  els.quizCard.classList.add("hidden");
  els.resultCard.classList.remove("hidden");
  stopTimer();

  let medal = "";
  if (score >= 95) medal = "🥇 金メダル！";
  else if (score >= 80) medal = "🥈 銀メダル！";
  else if (score >= 60) medal = "🥉 銅メダル！";
  else medal = "💪 またチャレンジしよう！";

  let msg = "";
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

  if (reason === "timeup") els.finalScore.textContent = "じかんぎれ！";
  else if (reason === "gameover") els.finalScore.textContent = "ゲームオーバー！";
  else els.finalScore.textContent = score + "てん";

  const historyHtml = history.map((h,i)=>
    `Q${i+1}: ${h.a}×${h.b}=${h.ans} ／ あなた：<strong class="${h.ok?'ok':'ng'}">${h.user}</strong>`
  ).join("<br>");

  els.summaryList.innerHTML =
    `<div class="medal">${medal}</div><p>${msg}</p><hr>` +
    historyHtml;

  playSE("RESULT");
  if (score === 100 && typeof confetti === "function") {
    confetti({particleCount:100,spread:70,origin:{y:0.7}});
    setTimeout(()=>confetti({particleCount:80,spread:100,origin:{y:0.5}}),400);
  }
}

/* 九九表 */
function openKukuModal() {
  buildKukuGrid();
  els.tableModal.classList.remove("hidden");
}
els.showTableBtn.onclick = openKukuModal;
els.closeModal.onclick = () => els.tableModal.classList.add("hidden");
els.tableModal.querySelector(".modal-backdrop").onclick =
  () => els.tableModal.classList.add("hidden");

function buildKukuGrid() {
  let html = `<table class="kuku-table"><thead><tr><th class="hd">×</th>`;
  for (let j=1;j<=9;j++) html += `<th class="hd">${j}</th>`;
  html += `</tr></thead><tbody>`;
  for (let i=1;i<=9;i++) {
    html += `<tr><th class="hd">${i}</th>`;
    for (let j=1;j<=9;j++) {
      html += `<td class="expr">${j}×${i}=${i*j}</td>`;
    }
    html += `</tr>`;
  }
  html += `</tbody></table>`;
  els.kukuGrid.innerHTML = html;
}

/* 難易度切替 */
modeBtns.forEach(btn => {
  btn.onclick = () => {
    initAudio();
    modeBtns.forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");

    const n = Number(btn.dataset.qcount);
    totalQuestions = n;
    document.body.classList.remove("bg-easy","bg-normal","bg-hard");

    if (n === 10) {
      currentBgm = "easy"; challengeMode = false;
      document.body.classList.add("bg-easy");
    } else if (n === 20) {
      currentBgm = "normal"; challengeMode = false;
      document.body.classList.add("bg-normal");
    } else {
      currentBgm = "hard"; challengeMode = true;
      document.body.classList.add("bg-hard");
    }

    if (bgmOn) startBGM();
    makeQuiz();
  };
});

/* BGMトグル（アイコン＋色） */
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

/* 結果画面のボタン */
els.againBtn.onclick = () => {
  initAudio();
  els.resultCard.classList.add("hidden");
  els.quizCard.classList.remove("hidden");
  makeQuiz();
};

els.restartBtn.onclick = () => {
  initAudio();
  modeBtns.forEach(b=>b.classList.remove("active"));
  const easyBtn = [...modeBtns].find(b=>b.dataset.qcount==="10");
  if (easyBtn) easyBtn.classList.add("active");
  totalQuestions = 10;
  currentBgm = "easy";
  challengeMode = false;
  document.body.classList.remove("bg-easy","bg-normal","bg-hard");
  document.body.classList.add("bg-easy");
  if (bgmOn) startBGM();
  els.resultCard.classList.add("hidden");
  els.quizCard.classList.remove("hidden");
  makeQuiz();
};

/* 初期化 */
els.bgmToggle.textContent = "🔇";
els.bgmToggle.classList.add("bgm-off");
makeQuiz();