// app.js v6（手書き→常設キーパッド方式）
// ・0〜9 キー、⌫（バックスペース）、クリア
// ・最大2桁まで入力 → 送信で採点（ans = a*b と数値比較）
// ・20問、重複なし、正解で+5点（満点100）
// ・九九表はポップアップで1画面グリッド表示（式形式）

const els = {
  qNo: document.getElementById('qNo'),
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
  // 表モーダル
  showTableBtn: document.getElementById('showTableBtn'),
  tableModal: document.getElementById('tableModal'),
  closeModal: document.getElementById('closeModal'),
  kukuGrid: document.getElementById('kukuGrid'),
};

let quiz = [];
let idx = 0;
let score = 0;
let history = []; // {l,r,ans,user,ok}
let currentInput = ''; // 回答入力（文字列 0〜2桁）

// ---- 出題作成（重複なし20問） ----
function makeQuiz(){
  const all = [];
  for(let a=1;a<=9;a++){ for(let b=1;b<=9;b++){ all.push([a,b]); } }
  for(let i=all.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [all[i],all[j]]=[all[j],all[i]]; }
  quiz = all.slice(0,20);
  idx = 0; score = 0; history = [];
  updateUI();
}

function updateUI(){
  els.qNo.textContent = String(idx+1);
  els.left.textContent = String(quiz[idx][0]);
  els.right.textContent = String(quiz[idx][1]);
  els.score.textContent = String(score);
  currentInput = '';
  renderAnswer();
  feedback('');
}

function renderAnswer(){
  els.answerBox.textContent = currentInput.length ? currentInput : '□';
}

// ---- キーパッド動作 ----
function appendDigit(d){
  if(currentInput.length >= 2) return; // 81までなので最大2桁
  if(currentInput === '0'){ currentInput = d; } else { currentInput += d; }
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
  // “クリア”と“⌫”は個別IDで処理するので、数字キーのみ拾う
  const t = btn.textContent.trim();
  if(/^\d$/.test(t)){
    btn.addEventListener('click', ()=> appendDigit(t));
  }
});
els.keyBk.addEventListener('click', backspace);
els.keyClr.addEventListener('click', clearAnswer);

// ---- 採点 ----
els.submitBtn.addEventListener('click', ()=>{
  const [a,b] = quiz[idx];
  const ans = a*b;

  // 入力が空なら無視
  if(!currentInput.length){ feedback('数字を入力してください'); return; }
  const userNumber = parseInt(currentInput,10);
  const ok = (Number(userNumber) === Number(ans));

  if(ok){
    score += 5; // 20問×5点 = 100
    try{ confetti && confetti({ particleCount: 80, spread: 60, origin:{ y: .7 } }); }catch{}
  }
  feedback('', ok);

  history.push({ l:a, r:b, ans, user:userNumber, ok });

  setTimeout(()=>{
    if(idx<19){ idx++; updateUI(); }
    else{
      els.finalScore.textContent = String(score);
      showResult();
    }
  }, ok ? 450 : 650);
});

function feedback(msg, ok=null){
  els.fx.className = 'fx';
  if(ok===true){ els.fx.classList.add('ok'); els.fx.textContent = '⭕️ 正解！'; }
  else if(ok===false){ els.fx.classList.add('ng'); els.fx.textContent = '❌ 不正解'; }
  else { els.fx.textContent = msg || ''; }
}

function showResult(){
  els.quizCard.classList.add('hidden');
  els.resultCard.classList.remove('hidden');
  const div = els.summaryList;
  div.innerHTML = '';
  history.forEach((h,i)=>{
    const p = document.createElement('p');
    p.innerHTML = `Q${i+1}: ${h.l}×${h.r}＝<strong>${h.ans}</strong> ／ あなた：<strong class="${h.ok?'ok':'ng'}">${h.user}</strong>`;
    div.appendChild(p);
  });
}

// ---- 再挑戦・最初から ----
els.againBtn.addEventListener('click', ()=>{ els.resultCard.classList.add('hidden'); els.quizCard.classList.remove('hidden'); makeQuiz(); });
els.restartBtn.addEventListener('click', ()=>{ els.resultCard.classList.add('hidden'); els.quizCard.classList.remove('hidden'); makeQuiz(); });

// ---- 九九表（ポップアップ／1画面）----
els.showTableBtn.addEventListener('click', ()=>{ buildKukuGrid(); openModal(true); });
els.closeModal.addEventListener('click', ()=> openModal(false));
els.tableModal.querySelector('.modal-backdrop').addEventListener('click', ()=> openModal(false));

function openModal(show){
  els.tableModal.classList.toggle('hidden', !show);
  els.tableModal.setAttribute('aria-hidden', show ? 'false':'true');
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
    th.textContent = j;
    th.className = 'hd';
    trh.appendChild(th);
  }
  thead.appendChild(trh);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for(let i=1;i<=9;i++){
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent = i;
    th.className = 'hd';
    tr.appendChild(th);
    for(let j=1;j<=9;j++){
      const td = document.createElement('td');
      td.className = 'expr';
      td.textContent = `${i}×${j}=${i*j}`;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);

  els.kukuGrid.innerHTML = '';
  els.kukuGrid.appendChild(wrap);
}

// ---- 初期化 ----
makeQuiz();
