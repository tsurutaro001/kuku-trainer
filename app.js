// app.js v8.2
// ・問題数を 10/20/30 から選択可能
// ・スコア = 正解率 × 100（四捨五入）
// ・キーパッド入力
// ・九九表（列×行）
// ・恐竜レベル＆スターゲージ
// ・正解音 / 不正解音 / コンボ音 / レベルアップ音（WebAudio生成）

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
  // 恐竜＆スター
  dinoEmoji: document.getElementById('dinoEmoji'),
  dinoName: document.getElementById('dinoName'),
  dinoMsg: document.getElementById('dinoMsg'),
  starFill: document.getElementById('starFill'),
  // 表モーダル
  showTableBtn: document.getElementById('showTableBtn'),
  tableModal: document.getElementById('tableModal'),
  closeModal: document.getElementById('closeModal'),
  kukuGrid: document.getElementById('kukuGrid'),
};

const modeButtons = document.querySelectorAll('.mode-btn');

let quiz = [];
let idx = 0;
let score = 0;
let correctCount = 0;
let totalQuestions = 20; // デフォルト
let history = [];
let currentInput = '';

let combo = 0;           // 連続正解数
let lastRatioLevel = 1;  // 恐竜レベルの変化検知用（1〜3）

/* ===== スコア表示更新 ===== */
function updateScoreDisplay() {
  els.score.textContent = String(score);
}

/* ===== 効果音（WebAudioで生成） ===== */
function playSE(type){
  const AC = window.AudioContext || window.webkitAudioContext;
  if(!AC) return;
  const ctx = new AC();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  function finish(t){
    osc.start();
    osc.stop(ctx.currentTime + t);
  }

  // 正解：キラッ✨
  if(type === 'OK'){
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.28);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
    finish(0.28);
    return;
  }

  // 不正解：ブブー
  if(type === 'NG'){
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.32);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);
    finish(0.32);
    return;
  }

  // コンボ音（2連：ポン）
  if(type === 'COMBO2'){
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(700, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
    finish(0.15);
    return;
  }

  // コンボ音（3連：ピロリン♪）
  if(type === 'COMBO3'){
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.22);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
    finish(0.22);
    return;
  }

  // コンボ音（4連以上：シャキーン✨）
  if(type === 'COMBO4'){
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.28);
    gain.gain.setValueAtTime(0.28, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
    finish(0.28);
    return;
  }

  // レベルアップ音（ファンファーレ）
  if(type === 'LEVELUP'){
    osc.type = 'square';
    osc.frequency.setValueAtTime(500, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.12);
    osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.24);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
    finish(0.3);
    return;
  }
}

/* ===== 出題作成（重複なし totalQuestions 問） ===== */
function makeQuiz(){
  const all = [];
  for(let a=1;a<=9;a++){
    for(let b=1;b<=9;b++){
      all.push([a,b]);
    }
  }
  for(let i=all.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [all[i],all[j]] = [all[j],all[i]];
  }
  quiz = all.slice(0,totalQuestions);
  idx = 0;
  score = 0;
  correctCount = 0;
  history = [];
  currentInput = '';
  combo = 0;
  lastRatioLevel = 1;
  els.qTotal.textContent = String(totalQuestions);
  updateUI();
  updateBuddy();
}

/* ===== UI更新 ===== */
function updateUI(){
  els.qNo.textContent = String(idx+1);
  els.left.textContent = String(quiz[idx][0]);
  els.right.textContent = String(quiz[idx][1]);
  updateScoreDisplay();
  currentInput = '';
  renderAnswer();
  feedback('');
}

/* ===== 回答入力 ===== */
function renderAnswer(){
  els.answerBox.textContent = currentInput.length ? currentInput : '□';
}
function appendDigit(d){
  if(currentInput.length >= 2) return;
  if(currentInput === '0'){ currentInput = d; }
  else { currentInput += d; }
  renderAnswer();
}
function backspace(){
  currentInput = currentInput.slice(0,-1);
  renderAnswer();
}
function clearAnswer(){
  currentInput = '';
  renderAnswer();
}

document.querySelectorAll('.key').forEach(btn=>{
  const t = btn.textContent.trim();
  if(/^\d$/.test(t)){
    btn.addEventListener('click', ()=> appendDigit(t));
  }
});
els.keyBk.addEventListener('click', backspace);
els.keyClr.addEventListener('click', clearAnswer);

/* ===== モード切替（10/20/30問） ===== */
modeButtons.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const n = parseInt(btn.dataset.qCount,10);
    if(!n || n === totalQuestions) return;
    totalQuestions = n;
    modeButtons.forEach(b=>b.classList.toggle('active', b === btn));
    makeQuiz();
  });
});

/* ===== 採点処理 ===== */
els.submitBtn.addEventListener('click', ()=>{
  const [a,b] = quiz[idx];
  const ans = a*b;

  if(!currentInput.length){
    feedback('数字を入力してください', null);
    return;
  }
  const user = parseInt(currentInput,10);
  const ok = (user === ans);

  if(ok){
    correctCount++;
    combo++;
    playSE('OK');
    spawnStar();

    if(combo === 2) playSE('COMBO2');
    if(combo === 3) playSE('COMBO3');
    if(combo >= 4) playSE('COMBO4');
  }else{
    playSE('NG');
    combo = 0;
  }

  // 正解率 × 100 （四捨五入）
  score = Math.round((correctCount / totalQuestions) * 100);
  updateScoreDisplay();

  feedback('', ok);
  history.push({l:a, r:b, ans, user, ok});
  updateBuddy();

  const delay = ok ? 1200 : 1600;
  setTimeout(()=>{
    if(idx < totalQuestions - 1){
      idx++;
      updateUI();
    }else{
      showResult();
    }
  }, delay);
});

function feedback(msg, ok=null){
  els.fx.className = 'fx';
  if(ok === true){
    els.fx.classList.add('ok');
    els.fx.textContent = '🌟 正解！すごい！';
  }else if(ok === false){
    els.fx.classList.add('ng');
    els.fx.textContent = '🪲 ざんねん… つぎはできるよ！';
  }else{
    els.fx.textContent = msg || '';
  }
}

/* ===== 恐竜＆スター ===== */
function updateBuddy(){
  const ratio = totalQuestions ? (correctCount / totalQuestions) : 0;

  // スターゲージ
  els.starFill.style.width = (ratio * 100) + '%';

  // レベル（割合で判定）
  let level = 1;
  let emoji = '🦕';
  if(ratio >= 0.7){
    level = 3; emoji = '🦖🔥';
  }else if(ratio >= 0.35){
    level = 2; emoji = '🦖';
  }

  // レベルアップ検知
  if(level > lastRatioLevel){
    playSE('LEVELUP');
  }
  lastRatioLevel = level;

  els.dinoEmoji.textContent = emoji;
  els.dinoName.textContent = `きょうりゅうレベル ${level}`;

  // メッセージ
  if(correctCount === 0){
    els.dinoMsg.textContent = 'スタート！ がんばろう！';
  }else if(ratio < 0.25){
    els.dinoMsg.textContent = 'いいね！ どんどん とこう！';
  }else if(ratio < 0.5){
    els.dinoMsg.textContent = 'そのちょうし！ もう少しでレベルアップ！';
  }else if(ratio < 0.75){
    els.dinoMsg.textContent = 'つよい！ ほとんどおぼえてるね！';
  }else if(ratio < 1){
    els.dinoMsg.textContent = 'あと少しでコンプリート！';
  }else{
    els.dinoMsg.textContent = 'ぜんもんせいかい！ きょうりゅうマスター！';
  }
}

/* 正解スター */
function spawnStar(){
  const star = document.createElement('div');
  star.textContent = '⭐️';
  star.className = 'starburst';
  document.body.appendChild(star);
  setTimeout(()=> star.remove(), 1000);
}

/* ===== 結果 ===== */
function showResult(){
  els.quizCard.classList.add('hidden');
  els.resultCard.classList.remove('hidden');
  els.finalScore.textContent = String(score);
  const div = els.summaryList;
  div.innerHTML = '';
  history.forEach((h,i)=>{
    const p = document.createElement('p');
    p.innerHTML = `Q${i+1}: ${h.l}×${h.r}＝<strong>${h.ans}</strong> ／ あなた：<strong class="${h.ok?'ok':'ng'}">${h.user}</strong>`;
    div.appendChild(p);
  });
}

els.againBtn.addEventListener('click', ()=>{
  els.resultCard.classList.add('hidden');
  els.quizCard.classList.remove('hidden');
  makeQuiz();
});
els.restartBtn.addEventListener('click', ()=>{
  els.resultCard.classList.add('hidden');
  els.quizCard.classList.remove('hidden');
  makeQuiz();
});

/* ===== 九九表（列×行：セルは j×i） ===== */
els.showTableBtn.addEventListener('click', ()=>{
  buildKukuGrid();
  openModal(true);
});
els.closeModal.addEventListener('click', ()=> openModal(false));
els.tableModal.querySelector('.modal-backdrop').addEventListener('click', ()=> openModal(false));

function openModal(show){
  els.tableModal.classList.toggle('hidden', !show);
  els.tableModal.setAttribute('aria-hidden', show ? 'false' : 'true');
}

function buildKukuGrid(){
  const wrap = document.createElement('div');
  wrap.className = 'kuku-grid';

  const table = document.createElement('table');
  table.className = 'kuku-table';

  const thead = document.createElement('thead');
  const trh = document.createElement('tr');

  const corner = document.createElement('th');
  corner.textContent = '×';
  corner.className = 'hd';
  trh.appendChild(corner);

  for(let j=1;j<=9;j++){
    const th = document.createElement('th');
    th.textContent = j; // 列（段）
    th.className = 'hd';
    trh.appendChild(th);
  }
  thead.appendChild(trh);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for(let i=1;i<=9;i++){
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent = i; // 行（かける数）
    th.className = 'hd';
    tr.appendChild(th);

    for(let j=1;j<=9;j++){
      const td = document.createElement('td');
      td.className = 'expr';
      td.textContent = `${j}×${i}=${i*j}`; // 列×行
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);

  els.kukuGrid.innerHTML = '';
  els.kukuGrid.appendChild(wrap);
}

/* ===== 初期化 ===== */
makeQuiz();