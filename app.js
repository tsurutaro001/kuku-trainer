// app.js v6.2
// ・常設キーパッド方式（最大2桁）
// ・九九表は「列×行」＝（列=段, 行=かける数）。セル表示は j×i。
//   → 2の段は [上ヘッダ2の列] に「2×1, 2×2, …, 2×9」

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
let history = [];
let currentInput = '';

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

// ---- キーパッド ----
function appendDigit(d){
  if(currentInput.length >= 2) return; // 2桁まで
  if(currentInput === '0'){ currentInput = d; } else { currentInput += d; }
  renderAnswer();
}
function backspace(){ currentInput = currentInput.slice(0,-1); renderAnswer(); }
function clearAnswer(){ currentInput = ''; renderAnswer(); }

document.querySelectorAll('.key').forEach(btn=>{
  const t = btn.textContent.trim();
  if(/^\d$/.test(t)){ btn.addEventListener('click', ()=> appendDigit(t)); }
});
els.keyBk.addEventListener('click', backspace);
els.keyClr.addEventListener('click', clearAnswer);

// ---- 採点 ----
els.submitBtn.addEventListener('click', ()=>{
  const [a,b] = quiz[idx];
  const ans = a*b;

  if(!currentInput.length){ feedback('数字を入力してください'); return; }
  const user = parseInt(currentInput,10);
  const ok = (user === ans);

  if(ok){
    score += 5; // 20問×5点 = 100点
    try{ confetti && confetti({ particleCount: 120, spread: 70, origin:{ y: .7 } }); }catch{}
  }
  feedback('', ok);

  history.push({l:a, r:b, ans, user, ok});

  setTimeout(()=>{
    if(idx<19){ idx++; updateUI(); }
    else{ showResult(); }
  }, ok ? 450 : 650);
});

function feedback(msg, ok=null){
  els.fx.className='fx';
  if(ok===true){ els.fx.classList.add('ok'); els.fx.textContent='🟡 正解！すごい！'; }
  else if(ok===false){ els.fx.classList.add('ng'); els.fx.textContent='🪲 ざんねん… つぎがんばろう！'; }
  else { els.fx.textContent=msg||''; }
}

function showResult(){
  els.quizCard.classList.add('hidden');
  els.resultCard.classList.remove('hidden');
  els.finalScore.textContent = String(score);
  const div = els.summaryList;
  div.innerHTML='';
  history.forEach((h,i)=>{
    const p=document.createElement('p');
    p.innerHTML=`Q${i+1}: ${h.l}×${h.r}＝<strong>${h.ans}</strong> ／ あなた：<strong class="${h.ok?'ok':'ng'}">${h.user}</strong>`;
    div.appendChild(p);
  });
}

els.againBtn.addEventListener('click', ()=>{ els.resultCard.classList.add('hidden'); els.quizCard.classList.remove('hidden'); makeQuiz(); });
els.restartBtn.addEventListener('click', ()=>{ els.resultCard.classList.add('hidden'); els.quizCard.classList.remove('hidden'); makeQuiz(); });

// ---- 九九表（列×行：セルは j×i）----
els.showTableBtn.addEventListener('click', ()=>{ buildKukuGrid(); openModal(true); });
els.closeModal.addEventListener('click', ()=> openModal(false));
els.tableModal.querySelector('.modal-backdrop').addEventListener('click', ()=> openModal(false));

function openModal(show){
  els.tableModal.classList.toggle('hidden', !show);
  els.tableModal.setAttribute('aria-hidden', show?'false':'true');
}

function buildKukuGrid(){
  const wrap=document.createElement('div');
  wrap.className='kuku-grid';
  const table=document.createElement('table');
  table.className='kuku-table';
  const thead=document.createElement('thead');
  const trh=document.createElement('tr');

  // 角：×、上ヘッダ：段（1..9）＝列
  const corner=document.createElement('th');
  corner.textContent='×';
  corner.className='hd';
  trh.appendChild(corner);
  for(let j=1;j<=9;j++){
    const th=document.createElement('th');
    th.textContent=j;       // 列（段）
    th.className='hd';
    trh.appendChild(th);
  }
  thead.appendChild(trh);
  table.appendChild(thead);

  // 左ヘッダ：かける数（1..9）＝行
  const tbody=document.createElement('tbody');
  for(let i=1;i<=9;i++){
    const tr=document.createElement('tr');
    const th=document.createElement('th');
    th.textContent=i;       // 行（かける数）
    th.className='hd';
    tr.appendChild(th);

    for(let j=1;j<=9;j++){
      const td=document.createElement('td');
      td.className='expr';
      td.textContent=`${j}×${i}=${i*j}`;  // ← 列×行（j×i）2の段は 2×1, 2×2, …
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);

  els.kukuGrid.innerHTML='';
  els.kukuGrid.appendChild(wrap);
}

// ---- 初期化 ----
makeQuiz();
