// ============================
//  app.js v9.1（完全版）
//  ・やさしい/ふつう/ちょうせん（10/20/30問）
//  ・難易度別 8bit BGM（3曲）
//  ・多重再生防止 / 切替即反映
//  ・効果音（正解/不正解/コンボ/結果/進化）
//  ・恐竜レベル / スター演出 / 九九表
// ============================

let AC = null;
let bgmOn = false;
let bgmTimer = null;
let bgmBarSec = 0;
let currentBgm = "easy"; // easy | normal | hard

function initAudio(){
  if(!AC){
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if(!Ctx) return;
    AC = new Ctx();
  }
}

/* ========= 効果音 ========= */
function playSE(type){
  if(!AC) return;
  const osc = AC.createOscillator();
  const gain = AC.createGain();
  osc.connect(gain);
  gain.connect(AC.destination);

  function end(t){ osc.start(); osc.stop(AC.currentTime + t); }

  if(type === "OK"){
    osc.type="sine";
    osc.frequency.setValueAtTime(900,AC.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1500,AC.currentTime+0.28);
    gain.gain.setValueAtTime(0.3,AC.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+0.28);
    end(0.28); return;
  }

  if(type === "NG"){
    osc.type="square";
    osc.frequency.setValueAtTime(220,AC.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110,AC.currentTime+0.32);
    gain.gain.setValueAtTime(0.3,AC.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+0.32);
    end(0.32); return;
  }

  if(type==="COMBO2"){
    osc.type="triangle";
    osc.frequency.setValueAtTime(700,AC.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1000,AC.currentTime+0.15);
    gain.gain.value=0.2;
    end(0.15); return;
  }

  if(type==="COMBO3"){
    osc.type="sine";
    osc.frequency.setValueAtTime(900,AC.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1600,AC.currentTime+0.22);
    gain.gain.value=0.25;
    end(0.22); return;
  }

  if(type==="COMBO4"){
    osc.type="sawtooth";
    osc.frequency.setValueAtTime(800,AC.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2000,AC.currentTime+0.28);
    gain.gain.value=0.28;
    end(0.28); return;
  }

  if(type==="LEVELUP"){
    osc.type="square";
    osc.frequency.setValueAtTime(600,AC.currentTime);
    osc.frequency.linearRampToValueAtTime(1200,AC.currentTime+0.25);
    gain.gain.value=0.25;
    end(0.25); return;
  }

  if(type==="RESULT"){
    osc.type="square";
    osc.frequency.setValueAtTime(800,AC.currentTime);
    osc.frequency.linearRampToValueAtTime(1200,AC.currentTime+0.12);
    osc.frequency.linearRampToValueAtTime(1000,AC.currentTime+0.24);
    gain.gain.value=0.25;
    end(0.28); return;
  }
}

/* ========= 3種類のBGM定義 ========= */

// ---- やさしい（現行） ----
const BGM_EASY_MELODY = [
  {freq:523.25,len:0.25},{freq:587.33,len:0.25},{freq:659.25,len:0.25},{freq:783.99,len:0.25},
  {freq:659.25,len:0.25},{freq:587.33,len:0.25},{freq:523.25,len:0.25},{freq:0,len:0.25}
];
const BGM_EASY_BASS = [
  {freq:130.81,len:0.5},{freq:0,len:0.25},{freq:98.00,len:0.5},{freq:0,len:0.25}
];

// ---- ふつう（スピードUP） ----
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

// ---- ちょうせん（ラスボス） ----
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

/* ========= BGM再生スケジューラ ========= */
function scheduleBgmBar(){
  if(!AC || !bgmOn) return;

  let MELODY, BASS;
  if(currentBgm==="easy"){MELODY=BGM_EASY_MELODY;BASS=BGM_EASY_BASS;}
  else if(currentBgm==="normal"){MELODY=BGM_NORMAL_MELODY;BASS=BGM_NORMAL_BASS;}
  else {MELODY=BGM_HARD_MELODY;BASS=BGM_HARD_BASS;}

  const now = AC.currentTime;
  let tMel = now;
  let tBass = now;

  const volMel=0.07, volBass=0.04;

  MELODY.forEach(n=>{
    if(n.freq>0){
      const o=AC.createOscillator(), g=AC.createGain();
      o.connect(g); g.connect(AC.destination);
      o.type="square";
      o.frequency.setValueAtTime(n.freq,tMel);
      g.gain.setValueAtTime(volMel,tMel);
      g.gain.exponentialRampToValueAtTime(0.001,tMel+n.len*0.9);
      o.start(tMel); o.stop(tMel+n.len);
    }
    tMel+=n.len;
  });

  BASS.forEach(n=>{
    if(n.freq>0){
      const o=AC.createOscillator(), g=AC.createGain();
      o.connect(g); g.connect(AC.destination);
      o.type="square";
      o.frequency.setValueAtTime(n.freq,tBass);
      g.gain.setValueAtTime(volBass,tBass);
      g.gain.exponentialRampToValueAtTime(0.001,tBass+n.len*0.9);
      o.start(tBass); o.stop(tBass+n.len);
    }
    tBass+=n.len;
  });
}

/* ========= BGM停止 ========= */
function stopBGM(){
  bgmOn=false;
  if(bgmTimer){
    clearInterval(bgmTimer);
    bgmTimer=null;
  }
}

/* ========= BGM開始（多重再生防止） ========= */
function startBGM(){
  if(!AC) return;
  if(AC.state==="suspended") AC.resume();

  stopBGM(); // まず止める（多重防止）

  bgmOn=true;

  const MELODY =
    (currentBgm==="easy") ? BGM_EASY_MELODY :
    (currentBgm==="normal") ? BGM_NORMAL_MELODY :
    BGM_HARD_MELODY;

  bgmBarSec = MELODY.reduce((s,n)=>s+n.len,0);

  scheduleBgmBar();
  bgmTimer = setInterval(scheduleBgmBar, bgmBarSec*1000);
}

/* ========= DOM ========= */
const els={
  qNo:document.getElementById('qNo'),
  qTotal:document.getElementById('qTotal'),
  left:document.getElementById('left'),
  right:document.getElementById('right'),
  score:document.getElementById('score'),
  answerBox:document.getElementById('answerBox'),
  quizCard:document.getElementById('quizCard'),
  resultCard:document.getElementById('resultCard'),
  finalScore:document.getElementById('finalScore'),
  summaryList:document.getElementById('summaryList'),
  submitBtn:document.getElementById('submitBtn'),
  againBtn:document.getElementById('againBtn'),
  restartBtn:document.getElementById('restartBtn'),
  keyBk:document.getElementById('keyBk'),
  keyClr:document.getElementById('keyClr'),
  fx:document.getElementById('fx'),
  dinoEmoji:document.getElementById('dinoEmoji'),
  dinoName:document.getElementById('dinoName'),
  dinoMsg:document.getElementById('dinoMsg'),
  starFill:document.getElementById('starFill'),
  showTableBtn:document.getElementById('showTableBtn'),
  tableModal:document.getElementById('tableModal'),
  closeModal:document.getElementById('closeModal'),
  kukuGrid:document.getElementById('kukuGrid'),
  bgmToggle:document.getElementById('bgmToggle')
};

const modeBtns=document.querySelectorAll(".mode-btn");

/* ========= クイズ状態 ========= */
let quiz=[],idx=0,correctCount=0,totalQuestions=20,score=0,combo=0,lastLevel=1,currentInput="",history=[];

/* ========= 問題生成 ========= */
function makeQuiz(){
  const all=[];
  for(let a=1;a<=9;a++)for(let b=1;b<=9;b++)all.push([a,b]);
  for(let i=all.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [all[i],all[j]]=[all[j],all[i]];
  }
  quiz=all.slice(0,totalQuestions);

  idx=0;correctCount=0;score=0;combo=0;lastLevel=1;currentInput="";history=[];
  els.qTotal.textContent=totalQuestions;
  updateUI();updateBuddy();
}

/* ========= UI ========= */
function updateUI(){
  els.qNo.textContent=idx+1;
  els.left.textContent=quiz[idx][0];
  els.right.textContent=quiz[idx][1];
  els.score.textContent=score;
  currentInput="";
  renderAnswer();
  feedback("");
}
function renderAnswer(){ els.answerBox.textContent=currentInput||"□"; }

/* ========= キーパッド ========= */
document.querySelectorAll(".key").forEach(btn=>{
  const t=btn.textContent.trim();
  if(/^\d$/.test(t)){
    btn.onclick=()=>{
      initAudio();
      if(currentInput.length<2){
        currentInput+=t;
        renderAnswer();
      }
    };
  }
});
els.keyBk.onclick=()=>{initAudio();currentInput=currentInput.slice(0,-1);renderAnswer();};
els.keyClr.onclick=()=>{initAudio();currentInput="";renderAnswer();};

/* ========= 採点 ========= */
els.submitBtn.onclick=()=>{
  initAudio();
  if(!currentInput){feedback("数字を入力してね",null);return;}
  const[a,b]=quiz[idx];const ans=a*b;const user=parseInt(currentInput,10);const ok=(user===ans);

  if(ok){
    correctCount++;combo++;
    playSE("OK");spawnStar();
    if(combo===2)playSE("COMBO2");
    if(combo===3)playSE("COMBO3");
    if(combo>=4)playSE("COMBO4");
  }else{
    combo=0;playSE("NG");
  }

  score=Math.round((correctCount/totalQuestions)*100);
  els.score.textContent=score;

  history.push({a,b,ans,user,ok});
  feedback("",ok);
  updateBuddy();

  setTimeout(()=>{
    if(idx<totalQuestions-1){idx++;updateUI();}
    else showResult();
  }, ok?1000:1200);
};

/* ========= 演出系 ========= */
function feedback(msg,ok){
  els.fx.className="fx";
  if(ok===true){els.fx.classList.add("ok");els.fx.textContent="🌟 せいかい！";}
  else if(ok===false){els.fx.classList.add("ng");els.fx.textContent="🪲 ざんねん！";}
  else els.fx.textContent=msg||"";
}

function updateBuddy(){
  const ratio=correctCount/totalQuestions;
  els.starFill.style.width=(ratio*100)+"%";

  let level=1;
  if(ratio>=0.7)level=3;
  else if(ratio>=0.35)level=2;

  if(level>lastLevel)playSE("LEVELUP");
  lastLevel=level;

  els.dinoEmoji.textContent=(level===1)?"🦕":(level===2)?"🦖":"🦖🔥";
  els.dinoName.textContent=`きょうりゅうレベル ${level}`;

  els.dinoMsg.textContent=
    ratio===1 ? "ぜんもんせいかい！すごい！" :
    ratio>0.7 ? "あとちょっと！" :
    ratio>0.3 ? "いいちょうし！" : "がんばろう！";
}

function spawnStar(){
  const star=document.createElement("div");
  star.textContent="⭐";
  star.className="starburst";
  document.body.appendChild(star);
  setTimeout(()=>star.remove(),1000);
}

/* ========= 結果 ========= */
function showResult(){
  els.quizCard.classList.add("hidden");
  els.resultCard.classList.remove("hidden");
  els.finalScore.textContent=score;
  els.summaryList.innerHTML=history.map((h,i)=>
    `Q${i+1}：${h.a}×${h.b}＝${h.ans} ／ あなた：<strong class="${h.ok?'ok':'ng'}">${h.user}</strong>`
  ).join("<br>");
  playSE("RESULT");
}
els.againBtn.onclick=()=>{els.resultCard.classList.add("hidden");els.quizCard.classList.remove("hidden");makeQuiz();};
els.restartBtn.onclick=()=>{els.resultCard.classList.add("hidden");els.quizCard.classList.remove("hidden");makeQuiz();};

/* ========= 九九表 ========= */
els.showTableBtn.onclick=()=>{buildKukuGrid();els.tableModal.classList.remove("hidden");};
els.closeModal.onclick=()=>els.tableModal.classList.add("hidden");
els.tableModal.querySelector(".modal-backdrop").onclick=()=>els.tableModal.classList.add("hidden");

function buildKukuGrid(){
  let html=`<table class="kuku-table"><thead><tr><th class="hd">×</th>`;
  for(let j=1;j<=9;j++)html+=`<th class="hd">${j}</th>`;
  html+=`</tr></thead><tbody>`;
  for(let i=1;i<=9;i++){
    html+=`<tr><th class="hd">${i}</th>`;
    for(let j=1;j<=9;j++){
      html+=`<td class="expr">${j}×${i}=${i*j}</td>`;
    }
    html+=`</tr>`;
  }
  html+=`</tbody></table>`;
  els.kukuGrid.innerHTML=html;
}

/* ========= 難易度＋BGM切替 ========= */
modeBtns.forEach(btn=>{
  btn.onclick=()=>{
    initAudio();

    modeBtns.forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");

    const n=Number(btn.dataset.qcount);
    totalQuestions=n;

    if(n===10)currentBgm="easy";
    else if(n===20)currentBgm="normal";
    else if(n===30)currentBgm="hard";

    if(bgmOn) startBGM();

    makeQuiz();
  };
});

/* ========= BGMトグル ========= */
els.bgmToggle.onclick=()=>{
  initAudio();
  if(!AC)return;

  if(!bgmOn){
    startBGM();
    els.bgmToggle.textContent="♪ BGM きる";
  }else{
    stopBGM();
    els.bgmToggle.textContent="♪ BGM おん";
  }
};

/* ========= 初期化 ========= */
makeQuiz();