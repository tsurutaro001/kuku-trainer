// app.js v8.3（安定版）
// ・10/20/30問切替 修正
// ・効果音が動作するよう AudioContext をユーザー操作内で生成
// ・スターゲージ 正しく上昇
// ・レベルアップ正しく発火
// ・コンボ音、正解音、不正解音すべて正常動作

let AC = null; // AudioContext は1回だけ作る（スマホ対策）

function initAudio(){
  if(!AC){
    AC = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playSE(type){
  if(!AC) return;
  const osc = AC.createOscillator();
  const gain = AC.createGain();
  osc.connect(gain);
  gain.connect(AC.destination);

  function end(t){
    osc.start();
    osc.stop(AC.currentTime + t);
  }

  // =============================
  // 正解音：キラッ✨
  // =============================
  if(type === "OK"){
    osc.type = "sine";
    osc.frequency.setValueAtTime(900, AC.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1500, AC.currentTime + 0.28);

    gain.gain.setValueAtTime(0.3, AC.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.28);

    end(0.28);
    return;
  }

  // =============================
  // 不正解音：ブブー
  // =============================
  if(type === "NG"){
    osc.type = "square";
    osc.frequency.setValueAtTime(220, AC.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, AC.currentTime + 0.32);

    gain.gain.setValueAtTime(0.3, AC.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.32);

    end(0.32);
    return;
  }

  // =============================
  // コンボ音
  // =============================
  if(type === "COMBO2"){
    osc.type = "triangle";
    osc.frequency.setValueAtTime(700, AC.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1000, AC.currentTime + 0.15);
    gain.gain.value = 0.2;
    end(0.15);
    return;
  }

  if(type === "COMBO3"){
    osc.type = "sine";
    osc.frequency.setValueAtTime(900, AC.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1600, AC.currentTime + 0.22);
    gain.gain.value = 0.25;
    end(0.22);
    return;
  }

  if(type === "COMBO4"){
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(800, AC.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2000, AC.currentTime + 0.28);
    gain.gain.value = 0.28;
    end(0.28);
    return;
  }

  // =============================
  // レベルアップ音
  // =============================
  if(type === "LEVELUP"){
    osc.type = "square";
    osc.frequency.setValueAtTime(600, AC.currentTime);
    osc.frequency.linearRampToValueAtTime(1200, AC.currentTime + 0.25);
    gain.gain.value = 0.25;
    end(0.25);
    return;
  }
}

// ===== DOM =====
const els = {
  qNo: document.getElementById('qNo'),
  qTotal: document.getElementById('qTotal'),
  left: document.getElementById('left'),
  right: document.getElementById('right'),
  score: document.getElementById('score'),
  answerBox: document.getElementById('answerBox'),
  quizCard: document.getElementById('quizCard'),
  resultCard: document.getElementById('resultCard'),
  finalScore: document.getElementById('finalScore'),
  summaryList: document.getElementById('summaryList'),
  submitBtn: document.getElementById('submitBtn'),
  againBtn: document.getElementById('againBtn'),
  restartBtn: document.getElementById('restartBtn'),
  keyBk: document.getElementById('keyBk'),
  keyClr: document.getElementById('keyClr'),
  fx: document.getElementById('fx'),
  dinoEmoji: document.getElementById('dinoEmoji'),
  dinoName: document.getElementById('dinoName'),
  dinoMsg: document.getElementById('dinoMsg'),
  starFill: document.getElementById('starFill'),
  showTableBtn: document.getElementById('showTableBtn'),
  tableModal: document.getElementById('tableModal'),
  closeModal: document.getElementById('closeModal'),
  kukuGrid: document.getElementById('kukuGrid'),
};

const modeBtns = document.querySelectorAll(".mode-btn");

let quiz = [];
let idx = 0;
let correctCount = 0;
let totalQuestions = 20;
let score = 0;
let combo = 0;
let lastLevel = 1;
let currentInput = "";
let history = [];

// ===== 問題生成 =====
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
    [all[i], all[j]] = [all[j], all[i]];
  }

  quiz = all.slice(0,totalQuestions);
  idx = 0;
  correctCount = 0;
  combo = 0;
  lastLevel = 1;
  score = 0;
  history = [];
  currentInput = "";

  els.qTotal.textContent = totalQuestions;
  updateUI();
  updateBuddy();
}

// ===== UI更新 =====
function updateUI(){
  els.qNo.textContent = idx+1;
  els.left.textContent = quiz[idx][0];
  els.right.textContent = quiz[idx][1];
  els.score.textContent = score;
  currentInput = "";
  renderAnswer();
  feedback("");
}

// ===== 入力関係 =====
function renderAnswer(){
  els.answerBox.textContent = currentInput || "□";
}

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

// ===== 採点 =====
els.submitBtn.onclick = ()=>{
  initAudio();

  if(!currentInput){
    feedback("数字を入力してね", null);
    return;
  }

  const [a,b] = quiz[idx];
  const ans = a*b;
  const user = parseInt(currentInput);
  const ok = (user === ans);

  if(ok){
    correctCount++;
    combo++;
    playSE("OK");
    spawnStar();

    if(combo === 2) playSE("COMBO2");
    if(combo === 3) playSE("COMBO3");
    if(combo >= 4) playSE("COMBO4");

  } else {
    combo = 0;
    playSE("NG");
  }

  // スコア（正解率×100）
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

// ===== フィードバック =====
function feedback(msg, ok){
  els.fx.className = "fx";
  if(ok === true){
    els.fx.classList.add("ok");
    els.fx.textContent = "🌟 せいかい！";
  }else if(ok === false){
    els.fx.classList.add("ng");
    els.fx.textContent = "🪲 ざんねん！";
  }else{
    els.fx.textContent = msg;
  }
}

// ===== 恐竜バディ =====
function updateBuddy(){
  const ratio = correctCount / totalQuestions;

  // スター
  els.starFill.style.width = (ratio*100)+"%";

  // レベル判定
  let level = 1;
  if(ratio >= 0.7) level = 3;
  else if(ratio >= 0.35) level = 2;

  if(level > lastLevel){
    playSE("LEVELUP");
  }
  lastLevel = level;

  // 表示
  if(level===1){
    els.dinoEmoji.textContent = "🦕";
  }else if(level===2){
    els.dinoEmoji.textContent = "🦖";
  }else{
    els.dinoEmoji.textContent = "🦖🔥";
  }
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

// ===== 星アニメ =====
function spawnStar(){
  const star = document.createElement("div");
  star.textContent = "⭐";
  star.className = "starburst";
  document.body.appendChild(star);
  setTimeout(()=>star.remove(),1000);
}

// ===== 結果 =====
function showResult(){
  els.quizCard.classList.add("hidden");
  els.resultCard.classList.remove("hidden");
  els.finalScore.textContent = score;

  els.summaryList.innerHTML = history.map((h,i)=>
    `Q${i+1}：${h.a}×${h.b}＝${h.ans} / あなた：<strong class="${h.ok?'ok':'ng'}">${h.user}</strong>`
  ).join("<br>");
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

// ===== 九九表 =====
els.showTableBtn.onclick = ()=>{
  buildKukuGrid();
  els.tableModal.classList.remove("hidden");
};

els.closeModal.onclick = ()=>{
  els.tableModal.classList.add("hidden");
};
els.tableModal.querySelector(".modal-backdrop").onclick = ()=>{
  els.tableModal.classList.add("hidden");
};

function buildKukuGrid(){
  let html = `<table class="kuku-table"><thead><tr><th class="hd">×</th>`;
  for(let j=1;j<=9;j++) html += `<th class="hd">${j}</th>`;
  html += `</tr></thead><tbody>`;

  for(let i=1;i<=9;i++){
    html += `<tr><th class="hd">${i}</th>`;
    for(let j=1;j<=9;j++){
      html += `<td class="expr">${j}×${i}=${i*j}</td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table>";

  els.kukuGrid.innerHTML = html;
}

// ===== モード切替 =====
modeBtns.forEach(btn=>{
  btn.onclick = ()=>{
    modeBtns.forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");

    totalQuestions = Number(btn.dataset.qcount);
    makeQuiz();
  };
});

// ===== 初期化 =====
makeQuiz();