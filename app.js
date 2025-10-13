// app.js
// 九九・出題管理・手書き認識（tfjs MNIST 寛容版）・UI

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
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  clearCanvas();
}
function clearCanvas() {
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,els.canvas.width, els.canvas.height);
  ctx.restore();
  // draw faint frame
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
const pen = { color: '#e6ecff', width: 12, cap: 'round', join: 'round' };

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
  const url = 'https://storage.googleapis.com/tfjs-models/tfjs/mnist_transfer_cnn_v1/model.json';
  model = await tf.loadLayersModel(url);
}
loadModel().catch(console.error);

// ===== 画像前処理（寛容版） =====
// 1) 2値化(Otsu近似) 2) 3x3膨張 3) バウンディングボックス抽出
// 4) 重心(Center of Mass)で28x28中央へ配置 5) 桁分割ロバスト化

function otsuThreshold(gray) {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;

  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];

  let sumB = 0, wB = 0, wF = 0, varMax = 0, thresh = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > varMax) { varMax = between; thresh = t; }
  }
  return thresh;
}

function dilate(bw, W, H) {
  const out = new Uint8ClampedArray(bw.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let on = 0;
      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          const xx = x + i, yy = y + j;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          if (bw[yy * W + xx]) { on = 1; break; }
        }
        if (on) break;
      }
      out[y * W + x] = on ? 1 : 0;
    }
  }
  return out;
}

function centerAndResize(bw, W, H) {
  let minX = W, minY = H, maxX = -1, maxY = -1;
  let mass = 0, cx = 0, cy = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = bw[y * W + x];
      if (v) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        mass++;
        cx += x; cy += y;
      }
    }
  }
  if (mass === 0) return null;
  cx /= mass; cy /= mass;

  const sw = maxX - minX + 1, sh = maxY - minY + 1;
  const PAD = 4;
  const segW = sw + PAD * 2, segH = sh + PAD * 2;
  const seg = new Uint8ClampedArray(segW * segH);

  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const v = bw[(minY + y) * W + (minX + x)];
      seg[(y + PAD) * segW + (x + PAD)] = v ? 255 : 0;
    }
  }

  const scale = Math.min(20 / segW, 20 / segH);
  const dw = Math.max(1, Math.round(segW * scale));
  const dh = Math.max(1, Math.round(segH * scale));

  const can = document.createElement('canvas');
  can.width = 28; can.height = 28;
  const c2 = can.getContext('2d');
  const src = document.createElement('canvas');
  src.width = segW; src.height = segH;
  const sctx = src.getContext('2d');
  const imgData = sctx.createImageData(segW, segH);
  for (let i = 0; i < seg.length; i++) {
    imgData.data[i * 4 + 0] = seg[i];
    imgData.data[i * 4 + 1] = seg[i];
    imgData.data[i * 4 + 2] = seg[i];
    imgData.data[i * 4 + 3] = 255;
  }
  sctx.putImageData(imgData, 0, 0);

  c2.fillStyle = 'black';
  c2.fillRect(0, 0, 28, 28);
  const dx = Math.floor((28 - dw) / 2);
  const dy = Math.floor((28 - dh) / 2);
  c2.imageSmoothingEnabled = true;
  c2.drawImage(src, 0, 0, segW, segH, dx, dy, dw, dh);

  return can;
}

function canvasToDigits(canvas) {
  const W = canvas.clientWidth, H = canvas.clientHeight;
  const tmp = document.createElement('canvas');
  tmp.width = W; tmp.height = H;
  const tctx = tmp.getContext('2d');
  tctx.fillStyle = '#000'; tctx.fillRect(0, 0, W, H);
  tctx.drawImage(canvas, 0, 0, W, H);

  // Gray & invert (白=ストローク)
  const img = tctx.getImageData(0, 0, W, H);
  const g = new Uint8ClampedArray(W * H);
  for (let i = 0, p = 0; i < img.data.length; i += 4, p++) {
    const v = (img.data[i] + img.data[i + 1] + img.data[i + 2]) / 3;
    g[p] = 255 - v;
  }

  const thr = otsuThreshold(g);
  const bw = new Uint8ClampedArray(W * H);
  for (let i = 0; i < g.length; i++) bw[i] = g[i] > thr ? 1 : 0;

  const bwd = dilate(bw, W, H);

  // 桁分割
  const col = new Uint32Array(W);
  for (let x = 0; x < W; x++) {
    let s = 0;
    for (let y = 0; y < H; y++) s += bwd[y * W + x];
    col[x] = s;
  }
  const spans = [];
  let inStroke = false, sx = 0;
  for (let x = 0; x < W; x++) {
    if (!inStroke && col[x] > 0) { inStroke = true; sx = x; }
    if (inStroke && col[x] === 0) { inStroke = false; spans.push([sx, x - 1]); }
  }
  if (inStroke) spans.push([sx, W - 1]);

  // ノイズ除去＆近接マージ
  const merged = [];
  const MINW = 10, GAP = 6;
  for (const [a, b] of spans) {
    if (b - a + 1 < MINW) continue;
    if (merged.length && a - merged[merged.length - 1][1] <= GAP) {
      merged[merged.length - 1][1] = b;
    } else {
      merged.push([a, b]);
    }
  }
  const targets = merged.length ? merged : [[0, W - 1]];

  // 28x28へ
  const canvases = [];
  for (const [sx2, ex2] of targets) {
    const local = new Uint8ClampedArray(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = sx2; x <= ex2; x++) {
        local[y * W + x] = bwd[y * W + x];
      }
    }
    const can = centerAndResize(local, W, H);
    if (can) canvases.push(can);
  }
  return canvases;
}

// ===== 推論（しきい値緩和 & 上位候補救済） =====
async function predictNumber() {
  if (!model) {
    feedback('モデル読み込み中…');
    await loadModel().catch(()=>{});
    if (!model) throw new Error('model not loaded');
  }
  if (paths.length === 0) throw new Error('empty');

  redrawAll();
  const digits = canvasToDigits(els.canvas);
  if (digits.length === 0) throw new Error('no digits');

  const numbers = [];
  for (const dc of digits) {
    const pred = tf.tidy(() => {
      const img = tf.browser.fromPixels(dc, 1)
        .mean(2)
        .toFloat()
        .div(255)
        .reshape([1, 28, 28, 1]);
      return model.predict(img);
    });
    const data = await pred.data();
    pred.dispose();

    const arr = Array.from(data).map((v, i) => ({i, v})).sort((a,b)=>b.v-a.v);
    const top1 = arr[0], top2 = arr[1];
    const chosen = (top1.v >= 0.25) ? top1.i : (top2.v >= 0.22 ? top2.i : -1);

    numbers.push(chosen);
  }

  if (numbers.includes(-1)) throw new Error('unconfident');
  const num = parseInt(numbers.join(''), 10);
  if (Number.isNaN(num)) throw new Error('nan');
  return num;
}

// ===== イベント =====
els.submitBtn.addEventListener('click', async ()=>{
  const [a,b] = quiz[idx];
  const ans = a*b;
  let userNumber = null;

  try{
    userNumber = await predictNumber();
  }catch(e){
    const fallback = prompt('手書きの認識に失敗しました。数字で入力してください:');
    if(fallback===null) return;
    const n = parseInt(fallback,10);
    if(Number.isNaN(n)){ feedback('数字を入力してください'); return; }
    userNumber = n;
  }

  const ok = (userNumber === ans);
  if(ok){
    score += 5; // 20問×5点 = 100点
    try{ confetti && confetti({ particleCount: 80, spread: 60, origin:{ y: .7 } }); }catch{}
  }
  feedback('', ok);

  history.push({ l:a, r:b, ans, user:userNumber, ok });

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

// 「1×1=1 | 2×1=2」形式の表
function buildKukuExpressions(){
  const root = document.getElementById('kukutable');
  root.innerHTML = '';

  const nav = document.createElement('div');
  nav.className = 'kuku-nav';
  const groups = [[1,2],[3,4],[5,6],[7,8],[9]];
  let current = 0;

  const render = ()=>{
    const body = document.createElement('div');
    body.id = 'kuku-body';
    for(let y=1; y<=9; y++){
      const a = groups[current][0];
      const b = groups[current][1] || null;
      const left = `${a}×${y}=${a*y}`;
      const right = b ? `${b}×${y}=${b*y}` : '';
      const line = document.createElement('div');
      line.className = 'kline';
      line.innerHTML = b ? `<span>${left}</span><span>${right}</span>` : `<span>${left}</span>`;
      body.appendChild(line);
    }
    const old = root.querySelector('#kuku-body');
    if (old) old.replaceWith(body); else root.appendChild(body);
  };

  groups.forEach((g, i)=>{
    const btn = document.createElement('button');
    btn.className = 'btn ghost';
    btn.textContent = g.length===2 ? `${g[0]} & ${g[1]}` : `${g[0]}`;
    btn.addEventListener('click', ()=>{ current = i; render(); });
    nav.appendChild(btn);
  });
  root.appendChild(nav);
  render();
}

// 初期化
buildKukuExpressions();
makeQuiz();

// 使いやすさ：ダブルタップ拡大の誤発火対策（iOS）
let lastTouch = 0;
document.addEventListener('touchend', (e)=>{
  const now = Date.now();
  if(now - lastTouch < 350){ e.preventDefault(); }
  lastTouch = now;
}, {passive:false});
