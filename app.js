// app.js
// 九九・出題管理・手書き認識（さらに寛容 + 失敗時は数字キーパッド）・UI

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
  openNumpadBtn: document.getElementById('openNumpadBtn'),
  npModal: document.getElementById('numpadModal'),
  npDisplay: document.getElementById('npDisplay'),
  npOk: document.getElementById('npOk'),
  npCancel: document.getElementById('npCancel'),
  npBk: document.getElementById('npBk'),
};

// ===== 手書きキャンバス =====
const ctx = els.canvas.getContext('2d');
const DPR = Math.max(1, window.devicePixelRatio || 1);

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
  ctx.strokeStyle = "#1f2740";
  ctx.lineWidth = 1;
  const margin = 8;
  ctx.strokeRect(margin, margin, els.canvas.clientWidth - margin*2, els.canvas.clientHeight - margin*2);
}
window.addEventListener('resize', scaleCanvas);
scaleCanvas();

// drawing
let drawing = false;
let paths = [];
let currentPath = [];
const pen = { color: '#e6ecff', width: 14, cap: 'round', join: 'round' };

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
function startDraw(ev){ ev.preventDefault(); drawing = true; currentPath = [pt(ev)]; }
function moveDraw(ev){
  if(!drawing) return;
  ev.preventDefault();
  const p = pt(ev); const last = currentPath[currentPath.length-1];
  drawLineSegment(last, p); currentPath.push(p);
}
function endDraw(ev){
  if(!drawing) return;
  ev.preventDefault(); drawing = false;
  if(currentPath.length>0) paths.push(currentPath);
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

els.clearBtn.addEventListener('click', ()=>{ paths = []; redrawAll(); feedback(''); });
els.undoBtn.addEventListener('click', ()=>{ paths.pop(); redrawAll(); feedback(''); });

// ===== 九九出題 =====
let quiz = [];
let idx = 0;
let score = 0;
let history = []; // {l,r,ans,user,ok}

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
  paths = []; redrawAll(); feedback('');
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

// ===== MNIST モデル =====
let model = null;
async function loadModel(){
  const url = 'https://storage.googleapis.com/tfjs-models/tfjs/mnist_transfer_cnn_v1/model.json';
  model = await tf.loadLayersModel(url);
}
loadModel().catch(console.error);

// ===== 前処理（さらに寛容：Otsu + クロージング = 膨張→収縮） =====
function otsuThreshold(gray){
  const hist = new Array(256).fill(0); for(const v of gray) hist[v]++;
  const total = gray.length;
  let sum=0; for(let t=0;t<256;t++) sum += t*hist[t];
  let sumB=0, wB=0, varMax=0, thr=96;
  for(let t=0;t<256;t++){
    wB += hist[t]; if(!wB) continue;
    const wF = total - wB; if(!wF) break;
    sumB += t*hist[t];
    const mB = sumB/wB, mF = (sum-sumB)/wF;
    const between = wB*wF*(mB-mF)*(mB-mF);
    if(between>varMax){ varMax=between; thr=t; }
  }
  return thr;
}
function dilate(bw,W,H){
  const out=new Uint8ClampedArray(bw.length);
  for(let y=0;y<H;y++){
    for(let x=0;x<W;x++){
      let on=0;
      for(let j=-1;j<=1;j++) for(let i=-1;i<=1;i++){
        const xx=x+i, yy=y+j; if(xx<0||yy<0||xx>=W||yy>=H) continue;
        if(bw[yy*W+xx]){ on=1; break; }
      }
      out[y*W+x]=on?1:0;
    }
  }
  return out;
}
function erode(bw,W,H){
  const out=new Uint8ClampedArray(bw.length);
  for(let y=0;y<H;y++){
    for(let x=0;x<W;x++){
      let on=1;
      for(let j=-1;j<=1;j++) for(let i=-1;i<=1;i++){
        const xx=x+i, yy=y+j; if(xx<0||yy<0||xx>=W||yy>=H){ on=0; break; }
        if(!bw[yy*W+xx]){ on=0; break; }
      }
      out[y*W+x]=on?1:0;
    }
  }
  return out;
}

function centerAndResize(bw,W,H){
  let minX=W, minY=H, maxX=-1, maxY=-1, mass=0, cx=0, cy=0;
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    const v=bw[y*W+x]; if(v){ if(x<minX)minX=x; if(y<minY)minY=y; if(x>maxX)maxX=x; if(y>maxY)maxY=y; mass++; cx+=x; cy+=y; }
  }
  if(mass===0) return null; cx/=mass; cy/=mass;

  const sw=maxX-minX+1, sh=maxY-minY+1, PAD=6;
  const segW=sw+PAD*2, segH=sh+PAD*2;
  const seg=new Uint8ClampedArray(segW*segH);

  for(let y=0;y<sh;y++) for(let x=0;x<sw;x++){
    const v=bw[(minY+y)*W+(minX+x)];
    seg[(y+PAD)*segW+(x+PAD)] = v?255:0;
  }

  const scale=Math.min(20/segW, 20/segH);
  const dw=Math.max(1,Math.round(segW*scale));
  const dh=Math.max(1,Math.round(segH*scale));

  const can=document.createElement('canvas'); can.width=28; can.height=28;
  const c2=can.getContext('2d');

  // 重心が中央に来るよう微調整（±2px）
  const dx=Math.floor((28-dw)/2) + Math.round((14 - cx*scale%28)/8);
  const dy=Math.floor((28-dh)/2) + Math.round((14 - cy*scale%28)/8);

  const src=document.createElement('canvas'); src.width=segW; src.height=segH;
  const sctx=src.getContext('2d');
  const imgData=sctx.createImageData(segW,segH);
  for(let i=0;i<seg.length;i++){
    imgData.data[i*4+0]=seg[i]; imgData.data[i*4+1]=seg[i]; imgData.data[i*4+2]=seg[i]; imgData.data[i*4+3]=255;
  }
  sctx.putImageData(imgData,0,0);

  c2.fillStyle='black'; c2.fillRect(0,0,28,28);
  c2.imageSmoothingEnabled=true;
  c2.drawImage(src,0,0,segW,segH,dx,dy,dw,dh);

  return can;
}

function canvasToDigits(canvas){
  const W=canvas.clientWidth, H=canvas.clientHeight;
  const tmp=document.createElement('canvas'); tmp.width=W; tmp.height=H;
  const tctx=tmp.getContext('2d');
  tctx.fillStyle='#000'; tctx.fillRect(0,0,W,H); tctx.drawImage(canvas,0,0,W,H);

  const img=tctx.getImageData(0,0,W,H);
  const g=new Uint8ClampedArray(W*H);
  for(let i=0,p=0;i<img.data.length;i+=4,p++){ const v=(img.data[i]+img.data[i+1]+img.data[i+2])/3; g[p]=255 - v; }

  const thr=otsuThreshold(g);
  const bw=new Uint8ClampedArray(W*H);
  for(let i=0;i<g.length;i++) bw[i] = g[i] > thr ? 1 : 0;

  // 途切れを繋ぐ（膨張→収縮＝クロージング）
  const bwd = erode(dilate(bw,W,H), W, H);

  // 桁分割
  const col=new Uint32Array(W);
  for(let x=0;x<W;x++){ let s=0; for(let y=0;y<H;y++) s+=bwd[y*W+x]; col[x]=s; }
  const spans=[]; let on=false, sx=0;
  for(let x=0;x<W;x++){ if(!on && col[x]>0){ on=true; sx=x; } if(on && col[x]===0){ on=false; spans.push([sx,x-1]); } }
  if(on) spans.push([sx,W-1]);

  // ノイズ除去＆近接マージ
  const merged=[]; const MINW=10, GAP=8;
  for(const [a,b] of spans){
    if(b-a+1<MINW) continue;
    if(merged.length && a-merged[merged.length-1][1]<=GAP){ merged[merged.length-1][1]=b; }
    else merged.push([a,b]);
  }
  const targets=merged.length?merged:[[0,W-1]];

  const canvases=[];
  for(const [sx2,ex2] of targets){
    const local=new Uint8ClampedArray(W*H);
    for(let y=0;y<H;y++) for(let x=sx2;x<=ex2;x++){ local[y*W+x]=bwd[y*W+x]; }
    const can=centerAndResize(local,W,H); if(can) canvases.push(can);
  }
  return canvases;
}

// ===== 推論：各桁 top2 を保持し、正解と一致する組み合わせがあれば採用 =====
async function predictCandidates(){
  if(!model){ feedback('モデル読み込み中…'); await loadModel().catch(()=>{}); if(!model) throw new Error('model not loaded'); }
  if(paths.length===0) throw new Error('empty');
  redrawAll();
  const digits=canvasToDigits(els.canvas);
  if(digits.length===0) throw new Error('no digits');

  const perDigit=[];
  for(const dc of digits){
    const pred=tf.tidy(()=> tf.browser.fromPixels(dc,1).mean(2).toFloat().div(255).reshape([1,28,28,1]).asType('float32'));
    const data=await model.predict(pred).data(); pred.dispose();
    const arr=Array.from(data).map((v,i)=>({i,v})).sort((a,b)=>b.v-a.v);
    // しきい値を緩く（top1>=0.18 で採用、足りなければ top2>=0.15）
    const cand=[];
    if(arr[0].v>=0.18) cand.push(arr[0]);
    if(arr[1].v>=0.15) cand.push(arr[1]);
    // それでも空なら top1 を入れる
    if(cand.length===0) cand.push(arr[0]);
    perDigit.push(cand.slice(0,2));
  }
  return perDigit;
}

// perDigit = [[{i,v},{i,v}], ...] から候補数字の組み合わせを列挙（最大 2^3=8 通りまで実用十分）
function combineCandidates(perDigit){
  const out=[];
  function dfs(pos, digits, conf){
    if(pos===perDigit.length){ out.push({num: parseInt(digits.join(''),10), conf}); return; }
    for(const c of perDigit[pos]){
      dfs(pos+1, digits.concat(c.i), conf * c.v);
    }
  }
  dfs(0, [], 1);
  // 信頼度で降順
  out.sort((a,b)=>b.conf - a.conf);
  return out;
}

// ===== 数字キーパッド =====
let npResolve = null;
function openNumpad(initial=''){
  els.npDisplay.textContent = initial;
  els.npModal.classList.remove('hidden'); els.npModal.setAttribute('aria-hidden','false');
  return new Promise((resolve)=>{ npResolve = resolve; });
}
function closeNumpad(){
  els.npModal.classList.add('hidden'); els.npModal.setAttribute('aria-hidden','true');
  if(npResolve){ npResolve(null); npResolve = null; }
}
document.querySelectorAll('.np').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const v = btn.textContent.trim();
    if(v==='⌫'){ els.npDisplay.textContent = els.npDisplay.textContent.slice(0,-1); }
    else { els.npDisplay.textContent += v; }
  });
});
els.npOk.addEventListener('click', ()=>{
  const val = els.npDisplay.textContent.trim();
  if(npResolve){ npResolve(val); npResolve = null; }
  closeNumpad();
});
els.npCancel.addEventListener('click', closeNumpad);
els.npBk.addEventListener('click', ()=>{ els.npDisplay.textContent = els.npDisplay.textContent.slice(0,-1); });
els.openNumpadBtn.addEventListener('click', ()=> openNumpad(''));

// ===== 回答処理 =====
els.submitBtn.addEventListener('click', async ()=>{
  const [a,b] = quiz[idx];
  const ans = a*b;
  let userNumber = null;
  let ok = false;

  try{
    const perDigit = await predictCandidates();
    const combos = combineCandidates(perDigit).slice(0,8); // 上位8通りだけ試す
    // どれかが正解ならそれを採用（認識の取りこぼし救済）
    const hit = combos.find(c => c.num === ans);
    if(hit){ userNumber = hit.num; ok = true; }
    else{
      // 正解は無かった → 最も確からしい値を回答として採用
      userNumber = combos[0]?.num ?? NaN;
      ok = (userNumber === ans);
    }
  }catch(e){
    // 推論失敗 → 数字キーパッドへ
    const fallback = await openNumpad('');
    if(fallback===null) return;
    const n = parseInt(fallback,10);
    if(Number.isNaN(n)){ feedback('数字を入力してください'); return; }
    userNumber = n; ok = (userNumber === ans);
  }

  if(ok){
    score += 5; // 20問×5点 = 100点
    try{ confetti && confetti({ particleCount: 80, spread: 60, origin:{ y: .7 } }); }catch{}
  }
  feedback('', ok);

  history.push({ l:a, r:b, ans, user:userNumber, ok });

  setTimeout(()=>{
    if(idx<19){ idx++; updateUI(); }
    else{ els.finalScore.textContent = String(score); showResult(); }
  }, ok ? 450 : 650);
});

els.againBtn.addEventListener('click', ()=>{ els.resultCard.classList.add('hidden'); els.quizCard.classList.remove('hidden'); makeQuiz(); });
els.restartBtn.addEventListener('click', ()=>{ els.resultCard.classList.add('hidden'); els.quizCard.classList.remove('hidden'); makeQuiz(); });

// モーダル（九九表）
els.showTableBtn.addEventListener('click', ()=>{
  buildKukuExpressions(); // 毎回再生成（キャッシュ/古いJS対策）
  openModal(true);
});
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
      const left  = `${a}×${y}=${a*y}`;
      const right = b ? `${b}×${y}=${b*y}` : '';
      const line = document.createElement('div');
      line.className = 'kline';
      line.innerHTML = b ? `<span>${left}</span><span>${right}</span>` : `<span>${left}</span>`;
      body.appendChild(line);
    }
    const old = root.querySelector('#kuku-body');
    if (old) old.replaceWith(body); else root.appendChild(body);
  };

  groups.forEach((g,i)=>{
    const btn = document.createElement('button');
    btn.className = 'btn ghost';
    btn.textContent = g.length===2 ? `${g[0]} & ${g[1]}` : `${g[0]}`;
    btn.addEventListener('click', ()=>{ current=i; render(); });
    nav.appendChild(btn);
  });
  root.appendChild(nav);
  render();
}

// 初期化
buildKukuExpressions();
makeQuiz();

// iOS ダブルタップ拡大の誤発火対策
let lastTouch = 0;
document.addEventListener('touchend', (e)=>{
  const now = Date.now();
  if(now - lastTouch < 350){ e.preventDefault(); }
  lastTouch = now;
}, {passive:false});
