// app.js
// 九九・出題管理・手書き認識（tfjs MNIST）・UI

const els = {
  qNo: document.getElementById('qNo'),
  left: document.getElementById('left'),
  right: document.getElementById('right'),
  score: document.getElementById('score'),
  quizCard: document.getElementById('quizCard'),
  resultCard: document.getElementById('resultCard'),
  finalScore: document.getElementById('finalScore'),
  summaryList: document.getElementById('summaryList'),
  submitBtn: document.getElementById('submitBtn'),
  undoBtn: document.getElementById('undoBtn'),
  clearBtn: document.getElementById('clearBtn'),
  againBtn: document.getElementById('againBtn'),
  restartBtn: document.getElementById('restartBtn'),
  showTableBtn: document.getElementById('showTableBtn'),
  tableModal: document.getElementById('tableModal'),
  closeModal: document.getElementById('closeModal'),
  fx: document.getElementById('fx'),
  canvas: document.getElementById('drawCanvas'),
};

// ===== 手書きキャンバス =====
const ctx = els.canvas.getContext('2d');
const DPR = Math.max(1, window.devicePixelRatio || 1);

// scale canvas for crisp lines on mobile HiDPI
function scaleCanvas() {
  const w = els.canvas.clientWidth;
  const h = els.canvas.clientHeight;
  els.canvas.width = Math.round(w * DPR);
  els.canvas.height = Math.round(h * DPR);
  ctx.scale(DPR, DPR);
  clearCanvas();
}
function clearCanvas() {
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,els.canvas.width, els.canvas.height);
  ctx.restore();
  // draw faint grid baseline
  ctx.strokeStyle = "#1f2740";
  ctx.lineWidth = 1;
  const margin = 8;
  ctx.strokeRect(margin, margin, els.canvas.clientWidth - margin*2, els.canvas.clientHeight - margin*2);
}
window.addEventListener('resize', scaleCanvas);
scaleCanvas();

// drawing
let drawing = false;
let paths = []; // each path is an array of points
let currentPath = [];
const pen = { color: '#e6ecff', width: 8, cap: 'round', join: 'round' };

function pt(ev){
  const rect = els.canvas.getBoundingClientRect();
  const x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - rect.left;
  const y = (ev.touches ? ev.touches[0].clientY : ev.clientY) - rect.top;
  return {x, y};
}
function drawLineSegment(p1, p2){
  ctx.strokeStyle = pen.color;
  ctx.lineWidth = pen.width;
  ctx.lineCap = pen.cap;
  ctx.lineJoin = pen.join;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
}

function startDraw(ev){
  ev.preventDefault();
  drawing = true;
  currentPath = [];
  const p = pt(ev);
  currentPath.push(p);
}
function moveDraw(ev){
  if(!drawing) return;
  ev.preventDefault();
  const p = pt(ev);
  const last = currentPath[currentPath.length-1];
  drawLineSegment(last, p);
  currentPath.push(p);
}
function endDraw(ev){
  if(!drawing) return;
  ev.preventDefault();
  drawing = false;
  if(currentPath.length>0){
    paths.push(currentPath);
  }
}

['mousedown','touchstart'].forEach(e=>els.canvas.addEventListener(e,startDraw,{passive:false}));
['mousemove','touchmove'].forEach(e=>els.canvas.addEventListener(e,moveDraw,{passive:false}));
['mouseup','mouseleave','touchend','touchcancel'].forEach(e=>els.canvas.addEventListener(e,endDraw,{passive:false}));

function redrawAll(){
  clearCanvas();
  for(const path of paths){
    for(let i=1;i<path.length;i++){
      drawLineSegment(path[i-1], path[i]);
    }
  }
}

els.clearBtn.addEventListener('click', ()=>{
  paths = [];
  redrawAll();
  feedback('');
});
els.undoBtn.addEventListener('click', ()=>{
  paths.pop();
  redrawAll();
  feedback('');
});

// ===== 九九出題 =====
let quiz = [];
let idx = 0;
let score = 0;
let history = []; // {l,r,ans,user,ok}

function makeQuiz(){
  // 全81組から20問（重複なし）
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
  quiz = all.slice(0,20);
  idx = 0; score = 0; history = [];
  updateUI();
}
function updateUI(){
  els.qNo.textContent = String(idx+1);
  els.left.textContent = String(quiz[idx][0]);
  els.right.textContent = String(quiz[idx][1]);
  els.score.textContent = String(score);
  // reset drawing
  paths = [];
  redrawAll();
  feedback('');
}

function feedback(msg, ok=null){
  els.fx.className = 'fx';
  if(ok===true){ els.fx.classList.add('ok'); els.fx.textContent = '⭕️ 正解！'; }
  else if(ok===false){ els.fx.classList.add('ng'); els.fx.textContent = '❌ 不正解'; }
  else { els.fx.textContent = msg || ''; }
}

function showResult(){
  els.quizCard.classList.add('hidden');
  els.resultCard.classList.remove('hidden');
  els.finalScore.textContent = String(score);
  const div = document.getElementById('summaryList');
  div.innerHTML = '';
  history.forEach((h,i)=>{
    const p = document.createElement('p');
    p.innerHTML = `Q${i+1}: ${h.l}×${h.r}＝<strong>${h.ans}</strong> ／ あなたの回答：<strong class="${h.ok?'ok':'ng'}">${h.user}</strong>`;
    div.appendChild(p);
  });
}

// ===== MNIST 認識モデル =====
let model = null;
async function loadModel(){
  // 事前学習済み MNIST（tfjs）を読み込み
  // 出典: 公開 URL の tfjs モデル（mnist_transfer_cnn_v1）を使用
  const url = 'https://storage.googleapis.com/tfjs-models/tfjs/mnist_transfer_cnn_v1/model.json'; // :contentReference[oaicite:2]{index=2}
  model = await tf.loadLayersModel(url);
}
loadModel().catch(console.error);

// 画像前処理：キャンバス → 2値化 → 水平分割（桁切り出し）→ 28x28 正規化
function canvasToDigits(canvas){
  const tmp = document.createElement('canvas');
  const W = canvas.clientWidth, H = canvas.clientHeight;
  tmp.width = W; tmp.height = H;
  const tctx = tmp.getContext('2d');
  tctx.fillStyle = '#000'; tctx.fillRect(0,0,W,H);
  tctx.drawImage(canvas,0,0,W,H);

  const img = tctx.getImageData(0,0,W,H);
  const data = img.data;

  // グレースケール & 2値化
  const bw = new Uint8ClampedArray(W*H);
  for(let y=0;y<H;y++){
    for(let x=0;x<W;x++){
      const i = (y*W + x)*4;
      const r=data[i], g=data[i+1], b=data[i+2];
      const v = (r+g+b)/3;
      bw[y*W + x] = v>220 ? 0 : (v>30 ? 255 : 255); // 線が明るいので反転不要
    }
  }

  // 垂直方向の空白列を探し、分割
  const colSum = new Uint32Array(W);
  for(let x=0;x<W;x++){
    let sum=0;
    for(let y=0;y<H;y++){
      sum += bw[y*W+x]>0 ? 1 : 0;
    }
    colSum[x]=sum;
  }
  const gaps = [];
  for(let x=1;x<W;x++){
    if(colSum[x]===0 && colSum[x-1]>0) gaps.push(x); // 開始
  }
  // スパンを抽出
  const spans = [];
  let inStroke=false, start=0;
  for(let x=0;x<W;x++){
    if(!inStroke && colSum[x]>0){ inStroke=true; start=x; }
    if(inStroke && colSum[x]===0){ inStroke=false; spans.push([start, x-1]); }
  }
  if(inStroke) spans.push([start, W-1]);

  // 細かいノイズ除去（幅が小さすぎるもの除外）
  const filtered = spans.filter(([s,e]) => (e-s+1)>=8);

  // 1桁も検出できない場合は全体を1つとして扱う
  const targets = filtered.length>0 ? filtered : [[0,W-1]];

  // 各スパンを28x28にリサイズ（縦横の余白を確保しつつアスペクト比維持）
  const digitCanvases = [];
  for(const [sx,ex] of targets){
    const segW = ex-sx+1;
    const seg = document.createElement('canvas');
    const segCtx = seg.getContext('2d');
    seg.width = 28; seg.height = 28;
    segCtx.fillStyle = 'black'; segCtx.fillRect(0,0,28,28);

    // 該当領域のバウンディングボックス（上下）を特定
    let top=0, bottom=H-1;
    outerTop:
    for(let y=0;y<H;y++){
      for(let x=sx;x<=ex;x++){
        if(bw[y*W+x]>0){ top=y; break outerTop; }
      }
    }
    outerBottom:
    for(let y=H-1;y>=0;y--){
      for(let x=sx;x<=ex;x++){
        if(bw[y*W+x]>0){ bottom=y; break outerBottom; }
      }
    }
    const segH = Math.max(1, bottom-top+1);

    // スケール計算（最大 20x20 に収め、中心に配置）
    const box = 20;
    const scale = Math.min(box/segW, box/segH);
    const dw = Math.max(1, Math.round(segW*scale));
    const dh = Math.max(1, Math.round(segH*scale));
    const dx = Math.floor((28 - dw)/2);
    const dy = Math.floor((28 - dh)/2);

    // draw
    const crop = document.createElement('canvas');
    crop.width = segW; crop.height = segH;
    const cropCtx = crop.getContext('2d');
    cropCtx.putImageData(new ImageData(
      new Uint8ClampedArray(segW*segH*4), segW, segH
    ),0,0); // placeholder to allocate

    // 手早く描画：元キャンバスから drawImage（sx,top,segW,segH）
    segCtx.imageSmoothingEnabled = true;
    segCtx.drawImage(tmp, sx, top, segW, segH, dx, dy, dw, dh);

    digitCanvases.push(seg);
  }
  return digitCanvases;
}

async function predictNumber(){
  if(!model){
    // モデル未ロード時は読み込み待ちのメッセージ
    feedback('モデル読み込み中…');
    await loadModel().catch(()=>{});
    if(!model){ throw new Error('model not loaded'); }
  }
  if(paths.length===0) throw new Error('empty');

  // 1) 表示キャンバスを再描画（太線をビットマップ化）
  redrawAll();

  // 2) 分割して各桁を推論
  const digits = canvasToDigits(els.canvas);
  const preds = [];
  for(const dc of digits){
    const t = tf.tidy(()=>{
      const img = tf.browser.fromPixels(dc, 1) // grayscale(まだRGB)→1ch扱い
        .mean(2) // to 1 channel
        .toFloat()
        .div(255.0)
        .reshape([1,28,28,1]);
      return model.predict(img);
    });
    const data = await predsToIndex(t);
    preds.push(data);
    t.dispose?.();
  }
  // 低信頼のときはフォールバック：-1 とする
  const numbers = preds.map(p => (p.conf>0.5 ? p.digit : -1));
  if(numbers.includes(-1)) throw new Error('unconfident');

  // 桁を連結して整数化
  const num = parseInt(numbers.join(''), 10);
  if(Number.isNaN(num)) throw new Error('nan');
  return num;
}
async function predsToIndex(t){
  const arr = await t.data();
  let maxI=0, maxV=arr[0];
  for(let i=1;i<10;i++){
    if(arr[i]>maxV){ maxV=arr[i]; maxI=i; }
  }
  return {digit:maxI, conf:maxV};
}

// ===== イベント =====
els.submitBtn.addEventListener('click', async ()=>{
  const [a,b] = quiz[idx];
  const ans = a*b;
  let userNumber = null;

  try{
    userNumber = await predictNumber();
  }catch(e){
    // フォールバック：簡易数値キーパッドで入力（環境依存や推論失敗時用）
    const fallback = prompt('手書きの認識に失敗しました。数字で入力してください:');
    if(fallback===null) return;
    const n = parseInt(fallback,10);
    if(Number.isNaN(n)){ feedback('数字を入力してください'); return; }
    userNumber = n;
  }

  const ok = (userNumber === ans);
  if(ok){
    score += 5; // 20問×5点 = 100点
    confetti && confetti({ particleCount: 80, spread: 60, origin:{ y: .7 } });
  }
  feedback('', ok);

  history.push({ l:a, r:b, ans, user:userNumber, ok });

  // 次へ
  setTimeout(()=>{
    if(idx<19){
      idx++;
      updateUI();
    }else{
      els.finalScore.textContent = String(score);
      showResult();
    }
  }, ok ? 500 : 650);
});

els.againBtn.addEventListener('click', ()=>{ els.resultCard.classList.add('hidden'); els.quizCard.classList.remove('hidden'); makeQuiz(); });
els.restartBtn.addEventListener('click', ()=>{ els.resultCard.classList.add('hidden'); els.quizCard.classList.remove('hidden'); makeQuiz(); });

// モーダル（九九表）
els.showTableBtn.addEventListener('click', ()=> openModal(true));
els.closeModal.addEventListener('click', ()=> openModal(false));
els.tableModal.querySelector('.modal-backdrop').addEventListener('click', ()=> openModal(false));

function openModal(show){
  els.tableModal.classList.toggle('hidden', !show);
  els.tableModal.setAttribute('aria-hidden', show ? 'false':'true');
}

function buildKuku(){
  const root = document.getElementById('kukutable');
  const frag = document.createDocumentFragment();
  // 見出し行
  const hd = document.createElement('div');
  hd.className = 'hd cell h'; hd.textContent = '×';
  frag.appendChild(hd);
  for(let j=1;j<=9;j++){
    const c = document.createElement('div');
    c.className='hd cell h'; c.textContent=j;
    frag.appendChild(c);
  }
  for(let i=1;i<=9;i++){
    const r = document.createElement('div');
    r.className='hd cell h'; r.textContent=i;
    frag.appendChild(r);
    for(let j=1;j<=9;j++){
      const c = document.createElement('div');
      c.className='cell'; c.textContent = (i*j);
      frag.appendChild(c);
    }
  }
  root.appendChild(frag);
}

// 初期化
buildKuku();
makeQuiz();

// 使いやすさ：ダブルタップ拡大の誤発火対策（iOS）
let lastTouch = 0;
document.addEventListener('touchend', (e)=>{
  const now = Date.now();
  if(now - lastTouch < 350){ e.preventDefault(); }
  lastTouch = now;
}, {passive:false});
