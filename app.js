// ============================
//  app.js v9.2（完全版）
//  ・やさしい/ふつう/ちょうせん（10/20/30問）
//  ・難易度別 8bit BGM（3曲）
//  ・BGM切り替え時に前の曲を完全停止（無音にしてから切り替え）
//  ・多重再生防止
//  ・効果音（正解/不正解/コンボ/進化/結果）
//  ・恐竜レベル / スター / 九九表 / 結果画面
// ============================

let AC = null;          // AudioContext
let bgmOn = false;      // BGM 再生中フラグ
let bgmTimer = null;    // BGM ループ用 interval
let bgmBarSec = 0;      // 1小節の長さ（秒）
let currentBgm = "easy";// "easy" | "normal" | "hard"

// ★ BGM専用ゲインノード（ここを 0 にすると全BGMが即ミュート）
let bgmGain = null;

/* ========= Audio 初期化 ========= */
function initAudio(){
  if(!AC){
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if(!Ctx) return;
    AC = new Ctx();
  }
  // BGM専用ゲインが未作成なら作る
  if(!bgmGain && AC){
    bgmGain = AC.createGain();
    bgmGain.gain.value = 1.0;
    bgmGain.connect(AC.destination);
  }
}

/* ========= 効果音（SE） ========= */
function playSE(type){
  if(!AC) return;
  const osc = AC.createOscillator();
  const gain = AC.createGain();
  osc.connect(gain);
  gain.connect(AC.destination); // SE は直接スピーカーへ（BGMとは別）

  function end(t){
    osc.start();
    osc.stop(AC.currentTime + t);
  }

  if(type === "OK"){
    osc.type = "sine";
    osc.frequency.setValueAtTime(900, AC.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1500, AC.currentTime + 0.28);
    gain.gain.setValueAtTime(0.3, AC.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.28);
    end(0.28); return;
  }

  if(type === "NG"){
    osc.type = "square";
    osc.frequency.setValueAtTime(220, AC.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, AC.currentTime + 0.32);
    gain.gain.setValueAtTime(0.3, AC.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.32);
    end(0.32); return;
  }

  if(type === "COMBO2"){
    osc.type = "triangle";
    osc.frequency.setValueAtTime(700, AC.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1000, AC.currentTime + 0.15);
    gain.gain.value = 0.2;
    end(0.15); return;
  }

  if(type === "COMBO3"){
    osc.type = "sine";
    osc.frequency.setValueAtTime(900, AC.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1600, AC.currentTime + 0.22);
    gain.gain.value = 0.25;
    end(0.22); return;
  }

  if(type === "COMBO4"){
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(800, AC.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2000, AC.currentTime + 0.28);
    gain.gain.value = 0.28;
    end(0.28); return;
  }

  if(type === "LEVELUP"){
    osc.type = "square";
    osc.frequency.setValueAtTime(600, AC.currentTime);
    osc.frequency.linearRampToValueAtTime(1200, AC.currentTime + 0.25);
    gain.gain.value = 0.25;
    end(0.25); return;
  }

  if(type === "RESULT"){
    osc.type = "square";
    osc.frequency.setValueAtTime(800, AC.currentTime);
    osc.frequency.linearRampToValueAtTime(1200, AC.currentTime + 0.12);
    osc.frequency.linearRampToValueAtTime(1000, AC.currentTime + 0.24);
    gain.gain.value = 0.25;
    end(0.28); return;
  }
}

/* ========= 3種類のBGMパターン ========= */

// --- やさしい（Cメジャー / ゆっくり） ---
const BGM_EASY_MELODY = [
  {freq:523.25,len:0.25},{freq:587.33,len:0.25},{freq:659.25,len:0.25},{freq:783.99,len:0.25},
  {freq:659.25,len:0.25},{freq:587.33,len:0.25},{freq:523.25,len:0.25},{freq:0,len:0.25}
];
const BGM_EASY_BASS = [
  {freq:130.81,len:0.5},{freq:0,len:0.25},{freq:98.00,len:0.5},{freq:0,len:0.25}
];

// --- ふつう（スピード感 / 明るめ） ---
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

// --- ちょうせん（Aマイナー / ラスボス感） ---
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

/* ========= BGM 完全停止 ========= */
function stopBGM(){
  bgmOn = false;

  // interval 停止
  if(bgmTimer){
    clearInterval(bgmTimer);
    bgmTimer = null;
  }

  // BGMゲインを 0 にして、すでにスケジュールされた音も即ミュート
  if(AC && bgmGain){
    bgmGain.gain.setValueAtTime(0, AC.currentTime);
  }
}

/* ========= BGM 1小節分のスケジュール ========= */
function scheduleBgmBar(){
  if(!AC || !bgmOn || !bgmGain) return;

  let MELODY, BASS;
  if(currentBgm === "easy"){
    MELODY = BGM_EASY_MELODY;
    BASS   = BGM_EASY_BASS;
  }else if(currentBgm === "normal"){
    MELODY = BGM_NORMAL_MELODY;
    BASS   = BGM_NORMAL_BASS;
  }else{
    MELODY = BGM_HARD_MELODY;
    BASS   = BGM_HARD_BASS;
  }

  const now = AC.currentTime;
  let tMel = now;
  let tBass = now;

  const volMel = 0.07;
  const volBass = 0.04;

  // メロディ
  MELODY.forEach(note=>{
    const len = note.len;
    if(note.freq > 0){
      const osc = AC.createOscillator();
      const gain = AC.createGain();

      osc.connect(gain);
      gain.connect(bgmGain); // ★ BGM専用ゲインにつなぐ

      osc.type = "square";
      osc.frequency.setValueAtTime(note.freq, tMel);

      gain.gain.setValueAtTime(volMel, tMel);
      gain.gain.exponentialRampToValueAtTime(0.0001, tMel + len * 0.9);

      osc.start(tMel);
      osc.stop(tMel + len);
    }
    tMel += len;
  });

  // ベース
  BASS.forEach(note=>{
    const len = note.len;
    if(note.freq > 0){
      const osc = AC.createOscillator();
      const gain = AC.createGain();

      osc.connect(gain);
      gain.connect(bgmGain); // ★ BGM専用ゲインにつなぐ

      osc.type = "square";
      osc.frequency.setValueAtTime(note.freq, tBass);

      gain.gain.setValueAtTime(volBass, tBass);
      gain.gain.exponentialRampToValueAtTime(0.0001, tBass + len * 0.9);

      osc.start(tBass);
      osc.stop(tBass + len);
    }
    tBass += len;
  });
}

/* ========= BGM 開始 ========= */
function startBGM(){
  initAudio();
  if(!AC || !bgmGain) return;

  if(AC.state === "suspended"){
    AC.resume();
  }

  // 多重防止のため、必ず完全停止から
  stopBGM();

  // 新しい曲のために BGM ゲインを1に戻す
  bgmGain.gain.setValueAtTime(1.0, AC.currentTime);

  bgmOn = true;

  const MELODY =
    currentBgm === "easy"   ? BGM_EASY_MELODY :
    currentBgm === "normal" ? BGM_NORMAL_MELODY :
                              BGM_HARD_MELODY;

  bgmBarSec = MELODY.reduce((s,n)=>s+n.len, 0);

  // 1小節分を即スケジュール
  scheduleBgmBar();

  // 以降ループ
  bgmTimer = setInterval(scheduleBgmBar, bgmBarSec * 1000);
}

/* ========= DOM 取得 ========= */
const els = {
  qNo:        document.getElementById('qNo'),
  qTotal:     document.getElementById('qTotal'),
  left:       document.getElementById('left'),
  right:      document.getElementById('right'),
  score:      document.getElementById('score'),
  answerBox:  document.getElementById('answerBox'),
  quizCard:   document.getElementById('quizCard'),
  resultCard: document.getElementById('resultCard'),
  finalScore: document.getElementById('finalScore'),
  summaryList:document.getElementById('summaryList'),
  submitBtn:  document.getElementById('submitBtn'),
  againBtn:   document.getElementById('againBtn'),
  restartBtn: document.getElementById('restartBtn'),
  keyBk:      document.getElementById('keyBk'),
  keyClr:     document.getElementById('keyClr'),
  fx:         document.getElementById('fx'),
  dinoEmoji:  document.getElementById('dinoEmoji'),
  dinoName:   document.getElementById('dinoName'),
  dinoMsg:    document.getElementById('dinoMsg'),
  starFill:   document.getElementById('starFill'),
  showTableBtn:document.getElementById('showTableBtn'),
  tableModal: document.getElementById('tableModal'),
  closeModal: document.getElementById('closeModal'),
  kukuGrid:   document.getElementById('kukuGrid'),
  bgmToggle:  document.getElementById('bgmToggle'),
};
const modeBtns = document.querySelectorAll(".mode-btn");

/* ========= クイズ状態 ========= */
let quiz = [];
let idx = 0;
let correctCount = 0;
let totalQuestions = 20;
let score = 0;
let combo = 0;
let lastLevel = 1;
let currentInput = "";
let history = [];

/* ========= 問題生成 ========= */
function makeQuiz(){
  const all = [];
  for(let a=1;a<=9;a++){
    for(let b=1;b<=9;b++){
      all.push([a,b]);
    }
  }
  // シャッフル
  for(let i=all.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [all[i],all[j]] = [all[j],all[i]];
  }

  quiz = all.slice(0, totalQuestions);

  idx = 0;
  correctCount = 0;
  score = 0;
  combo = 0;
  lastLevel = 1;
  currentInput = "";
  history = [];

  els.qTotal.textContent = totalQuestions;
  updateUI();
  updateBuddy();
}

/* ========= UI更新 ========= */
function updateUI(){
  els.qNo.textContent = idx + 1;
  els.left.textContent = quiz[idx][0];
  els.right.textContent = quiz[idx][1];
  els.score.textContent = score;
  currentInput = "";
  renderAnswer();
  feedback("");
}

function renderAnswer(){
  els.answerBox.textContent = currentInput || "□";
}

/* ========= キーパッド ========= */
document.querySelectorAll(".key").forEach(btn=>{
  const t = btn.textContent.trim();
  if(/^\d$/.test(t)){
    btn.onclick = ()=>{
      initAudio();
      if(currentInput.length < 2){
        currentInput += t;
        renderAnswer();
      }
    };
  }
});

els.keyBk.onclick = ()=>{
  initAudio();
  currentInput = currentInput.slice(0,-1);
  renderAnswer();
};

els.keyClr.onclick = ()=>{
  initAudio();
  currentInput = "";
  renderAnswer();
};

/* ========= 採点 ========= */
els.submitBtn.onclick = ()=>{
  initAudio();
  if(!currentInput){
    feedback("数字を入力してね", null);
    return;
  }

  const [a,b] = quiz[idx];
  const ans = a*b;
  const user = parseInt(currentInput,10);
  const ok = (user === ans);

  if(ok){
    correctCount++;
    combo++;
    playSE("OK");
    spawnStar();
    if(combo === 2) playSE("COMBO2");
    if(combo === 3) playSE("COMBO3");
    if(combo >= 4) playSE("COMBO4");
  }else{
    combo = 0;
    playSE("NG");
  }

  score = Math.round((correctCount / totalQuestions) * 100);
  els.score.textContent = score;

  history.push({a,b,ans,user,ok});
  feedback("", ok);
  updateBuddy();

  setTimeout(()=>{
    if(idx < totalQuestions - 1){
      idx++;
      updateUI();
    }else{
      showResult();
    }
  }, ok ? 1000 : 1200);
};

/* ========= 表示系（エフェクト） ========= */
function feedback(msg, ok){
  els.fx.className = "fx";
  if(ok === true){
    els.fx.classList.add("ok");
    els.fx.textContent = "🌟 せいかい！";
  }else if(ok === false){
    els.fx.classList.add("ng");
    els.fx.textContent = "🪲 ざんねん！";
  }else{
    els.fx.textContent = msg || "";
  }
}

/* ========= 恐竜・スター ========= */
function updateBuddy(){
  const ratio = totalQuestions ? (correctCount / totalQuestions) : 0;
  els.starFill.style.width = (ratio * 100) + "%";

  let level = 1;
  if(ratio >= 0.7) level = 3;
  else if(ratio >= 0.35) level = 2;

  if(level > lastLevel){
    playSE("LEVELUP");
  }
  lastLevel = level;

  els.dinoEmoji.textContent =
    (level === 1) ? "🦕" :
    (level === 2) ? "🦖" : "🦖🔥";

  els.dinoName.textContent = `きょうりゅうレベル ${level}`;

  if(ratio === 1){
    els.dinoMsg.textContent = "ぜんもんせいかい！すごい！";
  }else if(ratio > 0.7){
    els.dinoMsg.textContent = "あとちょっと！";
  }else if(ratio > 0.3){
    els.dinoMsg.textContent = "いいちょうし！";
  }else{
    els.dinoMsg.textContent = "がんばろう！";
  }
}

/* ========= スター演出 ========= */
function spawnStar(){
  const star = document.createElement("div");
  star.textContent = "⭐";
  star.className = "starburst";
  document.body.appendChild(star);
  setTimeout(()=>star.remove(),1000);
}

/* ========= 結果画面 ========= */
function showResult(){
  els.quizCard.classList.add("hidden");
  els.resultCard.classList.remove("hidden");
  els.finalScore.textContent = score;

  els.summaryList.innerHTML = history.map((h,i)=>
    `Q${i+1}：${h.a}×${h.b}＝${h.ans} ／ あなた：<strong class="${h.ok?'ok':'ng'}">${h.user}</strong>`
  ).join("<br>");

  playSE("RESULT");
}

els.againBtn.onclick = ()=>{
  els.resultCard.classList.add("hidden");
  els.quizCard.classList.remove("hidden");
  makeQuiz();
};

els.restartBtn.onclick = ()=>{
  els.resultCard.classList.add("hidden");
  els.quizCard.classList.remove("hidden");
  makeQuiz();
};

/* ========= 九九表 ========= */
els.showTableBtn.onclick = ()=>{
  buildKukuGrid();
  els.tableModal.classList.remove("hidden");
};
els.closeModal.onclick = ()=> els.tableModal.classList.add("hidden");
els.tableModal.querySelector(".modal-backdrop").onclick = ()=> els.tableModal.classList.add("hidden");

function buildKukuGrid(){
  let html = `<table class="kuku-table"><thead><tr><th class="hd">×</th>`;
  for(let j=1;j<=9;j++) html += `<th class="hd">${j}</th>`;
  html += `</tr></thead><tbody>`;
  for(let i=1;i<=9;i++){
    html += `<tr><th class="hd">${i}</th>`;
    for(let j=1;j<=9;j++){
      html += `<td class="expr">${j}×${i}=${i*j}</td>`;
    }
    html += `</tr>`;
  }
  html += `</tbody></table>`;
  els.kukuGrid.innerHTML = html;
}

/* ========= 難易度＋BGM切替 ========= */
modeBtns.forEach(btn=>{
  btn.onclick = ()=>{
    initAudio();

    modeBtns.forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");

    const n = Number(btn.dataset.qcount);
    totalQuestions = n;

    if(n === 10)      currentBgm = "easy";
    else if(n === 20) currentBgm = "normal";
    else if(n === 30) currentBgm = "hard";

    // BGM ONの場合は「一度完全停止 → 新BGMスタート」
    if(bgmOn){
      startBGM();
    }

    makeQuiz();
  };
});

/* ========= BGMトグルボタン ========= */
els.bgmToggle.onclick = ()=>{
  initAudio();
  if(!AC || !bgmGain) return;

  if(!bgmOn){
    startBGM();
    els.bgmToggle.textContent = "♪ BGM きる";
  }else{
    stopBGM();
    els.bgmToggle.textContent = "♪ BGM おん";
  }
};

/* ========= 初期化 ========= */
makeQuiz();