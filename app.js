// app.js v5
// ・表：ポップアップに戻す（1×1→9×9の1画面グリッド）
// ・認識：プレビューで固定表示／候補から選ぶモーダル／数字キーパッド
// ・採点：各設問ごとに ans=a*b を保持し、数値で比較

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
  previewBtn: document.getElementById('previewBtn'),
  undoBtn: document.getElementById('undoBtn'),
  clearBtn: document.getElementById('clearBtn'),
  againBtn: document.getElementById('againBtn'),
  restartBtn: document.getElementById('restartBtn'),
  fx: document.getElementById('fx'),
  canvas: document.getElementById('drawCanvas'),
  // 表モーダル
  showTableBtn: document.getElementById('showTableBtn'),
  tableModal: document.getElementById('tableModal'),
  closeModal: document.getElementById('closeModal'),
  kukuGrid: document.getElementById('kukuGrid'),
  // 数値入力
  openNumpadBtn: document.getElementById('openNumpadBtn'),
  npModal: document.getElementById('numpadModal'),
  npDisplay: document.getElementById('npDisplay'),
  npOk: document.getElementById('npOk'),
  npCancel: document.getElementById('npCancel'),
  npBk: document.getElementById('npBk'),
  // 候補選択
  openCandidatesBtn: document.getElementById('openCandidatesBtn'),
  candModal: document.getElementById('candModal'),
  candButtons: document.getElementById('candButtons'),
  candCancel: document.getElementById('candCancel'),
  // デバッグ
  recogText: document.getElementById('recogText'),
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

// ===== 九九出題＆判定 =====
let quiz = [];
let idx = 0;
let score = 0;
let history = []; // {l,r,ans,user,ok,recogDbg}

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
  els.recogText.textContent = '—';
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
    p.innerHTML = `Q${i+1}: ${h.l}×${h.r}＝<strong>${h.ans}</strong> ／ あなた：<strong class="${h.ok?'ok':'ng'}">${h.user}</strong> ／ 認識: <span class="muted">${h.recogDbg}</span>`;
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

// ===== 前処理（Otsu + クロージング + 28x28） =====
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
function centerAndResizeTo28(canSrc, bbox){
  const {img,W,H} = canSrc; // ImageData + size
  const {minX,minY,maxX,maxY} = bbox;
  const sw = maxX-minX+1, sh = maxY-minY+1;
  const PAD=6, segW=sw+PAD*2, segH=sh+PAD*2;

  const src = document.createElement('canvas'); src.width=segW; src.height=segH;
  const sctx = src.getContext('2d');
  const seg = sctx.createImageData(segW,segH);
  // 白=255、黒=0。img.dataは0/1で与える
  for(let y=0;y<sh;y++){
    for(let x=0;x<sw;x++){
      const v = img[(minY+y)*W + (minX+x)] ? 255 : 0;
      const p = ((y+PAD)*segW + (x+PAD)) * 4;
      seg.data[p]=seg.data[p+1]=seg.data[p+2]=v; seg.data[p+3]=255;
    }
  }
  sctx.putImageData(seg,0,0);

  const can = document.createElement('canvas'); can.width=28; can.height=28;
  const c2 = can.getContext('2d');
  const scale=Math.min(20/segW, 20/segH);
  const dw=Math.max(1,Math.round(segW*scale));
  const dh=Math.max(1,Math.round(segH*scale));
  const dx=Math.floor((28-dw)/2);
  const dy=Math.floor((28-dh)/2);
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

  const im=tctx.getImageData(0,0,W,H); const g=new Uint8ClampedArray(W*H);
  for(let i=0,p=0;i<im.data.length;i+=4,p++){ const v=(im.data[i]+im.data[i+1]+im.data[i+2])/3; g[p]=255 - v; }
  const thr=otsuThreshold(g);
  const bw=new Uint8ClampedArray(W*H); for(let i=0;i<g.length;i++) bw[i] = g[i] > thr ? 1 : 0;
  const closed = erode(dilate(bw,W,H), W, H);

  // bbox 全体
  let minX=W, minY=H, maxX=-1, maxY=-1;
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    if(closed[y*W+x]){ if(x<minX)minX=x; if(y<minY)minY=y; if(x>maxX)maxX=x; if(y>maxY)maxY=y; }
  }
  if(maxX<0) return [];

  // 桁分割（縦プロファイル）
  const col=new Uint32Array(W);
  for(let x=0;x<W;x++){ let s=0; for(let y=0;y<H;y++) s+=closed[y*W+x]; col[x]=s; }
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
  const targets=merged.length?merged:[[minX,maxX]];

  // 28x28 作成
  const canvases=[];
  for(const [sx,ex] of targets){
    // 局所bbox
    let tminY=H, tmaxY=-1;
    for(let y=0;y<H;y++){ for(let x=sx;x<=ex;x++){ if(closed[y*W+x]){ if(y<tminY)tminY=y; if(y>tmaxY)tmaxY=y; } } }
    if(tmaxY<0){ tminY=minY; tmaxY=maxY; }
    const can=centerAndResizeTo28({img:closed,W,H},{minX:sx,minY:tminY,maxX:ex,maxY:tmaxY});
    if(can) canvases.push(can);
  }
  return canvases;
}

// ===== 認識（各桁top2）・プレビュー・候補生成 =====
let lastCandidates = []; // 直近プレビューの上位組み合わせ

async function recognizeTop2(){
  if(!model){ await loadModel().catch(()=>{}); if(!model) throw new Error('model not loaded'); }
  if(paths.length===0) throw new Error('empty');
  redrawAll();
  const digits=canvasToDigits(els.canvas);
  if(digits.length===0) throw new Error('no digits');

  const perDigit=[];
  const parts=[];
  for(const dc of digits){
    const pred=tf.tidy(()=> tf.browser.fromPixels(dc,1).mean(2).toFloat().div(255).reshape([1,28,28,1]).asType('float32'));
    const data=await model.predict(pred).data(); pred.dispose();
    const arr=Array.from(data).map((v,i)=>({i,v})).sort((a,b)=>b.v-a.v);
    const t1=arr[0], t2=arr[1];
    perDigit.push([t1, t2]);
    parts.push(`${t1.i}(${t1.v.toFixed(2)})/${t2.i}(${t2.v.toFixed(2)})`);
  }
  // 組合せ（最大 3桁なら8通り程度）
  const combos=[];
  function dfs(pos, digits, conf){
    if(pos===perDigit.length){ combos.push({num: parseInt(digits.join(''),10), conf}); return; }
    for(const c of perDigit[pos]){
      dfs(pos+1, digits.concat(c.i), conf*c.v);
    }
  }
  dfs(0, [], 1);
  combos.sort((a,b)=>b.conf-a.conf);
  lastCandidates = combos.slice(0,9); // 候補最大9件
  const previewBest = lastCandidates[0] ? `${lastCandidates[0].num}（信頼度 ${lastCandidates[0].conf.toFixed(2)}）` : '—';
  els.recogText.textContent = `${previewBest} 〔 ${parts.join(' | ')} 〕`;
  return lastCandidates;
}

// プレビュー
els.previewBtn.addEventListener('click', async ()=>{
  try{ await recognizeTop2(); }catch(e){ els.recogText.textContent = '（認識できませんでした）'; }
});

// 候補から選ぶ
els.openCandidatesBtn.addEventListener('click', async ()=>{
  if(!lastCandidates.length){
    try{ await recognizeTop2(); }catch(e){ els.recogText.textContent = '（認識できませんでした）'; return; }
  }
  els.candButtons.innerHTML = '';
  lastCandidates.forEach(c=>{
    const btn = document.createElement('button');
    btn.textContent = String(c.num);
    btn.addEventListener('click', ()=>{
      els.recogText.textContent = `${c.num} 〔候補選択〕`;
      closeCand();
    });
    els.candButtons.appendChild(btn);
  });
  openCand();
});
function openCand(){
  els.candModal.classList.remove('hidden'); els.candModal.setAttribute('aria-hidden','false');
}
function closeCand(){
  els.candModal.classList.add('hidden'); els.candModal.setAttribute('aria-hidden','true');
}
els.candCancel.addEventListener('click', closeCand);

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

// ===== 採点（確実に比較） =====
els.submitBtn.addEventListener('click', async ()=>{
  const [a,b] = quiz[idx];
  const ans = a*b;
  let userNumber = null;
  let dbg = '';

  // 1) まずプレビュー済みのテキストに数字があればそれを採用
  const fromText = (els.recogText.textContent || '').match(/\b\d+\b/);
  if(fromText){ userNumber = parseInt(fromText[0],10); dbg = els.recogText.textContent; }

  // 2) まだ決まっていない場合は認識を実行
  if(userNumber === null || Number.isNaN(userNumber)){
    try{
      const combos = await recognizeTop2();
      userNumber = combos[0]?.num;
      dbg = els.recogText.textContent;
    }catch(e){
      // 3) それでもダメならキーパッド
      const fallback = await openNumpad('');
      if(fallback===null) return;
      const n = parseInt(fallback,10);
      if(Number.isNaN(n)){ feedback('数字を入力してください'); return; }
      userNumber = n; dbg = 'manual';
      els.recogText.textContent = `${n} 〔manual〕`;
    }
  }

  const ok = (Number(userNumber) === Number(ans));
  if(ok){ score += 5; try{ confetti && confetti({ particleCount: 80, spread: 60, origin:{ y: .7 } }); }catch{} }
  feedback('', ok);

  history.push({ l:a, r:b, ans, user:userNumber, ok, recogDbg: dbg });

  setTimeout(()=>{
    if(idx<19){ idx++; updateUI(); }
    else{ els.finalScore.textContent = String(score); showResult(); }
  }, ok ? 450 : 650);
});

els.againBtn.addEventListener('click', ()=>{ els.resultCard.classList.add('hidden'); els.quizCard.classList.remove('hidden'); makeQuiz(); });
els.restartBtn.addEventListener('click', ()=>{ els.resultCard.classList.add('hidden'); els.quizCard.classList.remove('hidden'); makeQuiz(); });

// ===== 表（ポップアップ／1画面グリッド） =====
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

// 初期化
makeQuiz();

// iOS ダブルタップ拡大の誤発火対策
let lastTouch = 0;
document.addEventListener('touchend', (e)=>{
  const now = Date.now();
  if(now - lastTouch < 350){ e.preventDefault(); }
  lastTouch = now;
}, {passive:false});
