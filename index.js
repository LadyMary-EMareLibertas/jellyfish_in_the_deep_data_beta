const jellyfish = document.getElementById("jellyfish");
const statusText = document.getElementById("statusText");
const timerLine = document.getElementById("timerLine");
const stageDisplay = document.getElementById("stageDisplay");
const cycleDisplay = document.getElementById("cycleDisplay");
const lengthDisplay = document.getElementById("lengthDisplay");
const polypVisual = document.getElementById("polypVisual");

// 기준 시간 (UTC) — 해파리 생애 시작 시점
const originTime = new Date("2025-06-11T00:00:00Z");

// 상태별 표시 이름
const phaseLabelMap = {
  polyp: "폴립",
  ephyra: "이피라",
  medusa: "메두사",
  medusaEnd: "플립으로 돌아갈 준비 중",
};

// 상태별 지속 시간 (초)
const phaseDurations = {
  polyp: 5, // 259200, // 3일
  ephyra: 5, //604800, // 7일
  medusa: 5, //604800, // 7일
  medusaEnd: 5, // 259200, // 3일
};

// 초를 일, 시간, 분, 초로 포맷팅
function formatTime(seconds) {
  const d = Math.floor(seconds / (60 * 60 * 24));
  const h = Math.floor((seconds % (60 * 60 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  let result = [];
  if (d > 0) result.push(`${d}일`);
  if (h > 0 || d > 0) result.push(`${h}시간`);
  if (m > 0 || h > 0 || d > 0) result.push(`${m}분`);
  result.push(`${s}초`);

  return result.join(" ");
}

// 성장 카운트다운 업데이트
function updateTimerCountdown() {
  const { secondsInCycle, phase } = getCycleAndPhase();
  let remainingSec = 0;
  let total = 0;

  for (const [key, dur] of Object.entries(phaseDurations)) {
    total += dur;
    if (key === phase) {
      remainingSec = total - secondsInCycle;
      break;
    }
  }

  timerLine.innerHTML = `다음 성장까지: ${formatTime(remainingSec)}`;
}

// 성장률 (단계별 몸길이 증가 속도)
const growthRates = {
  polyp: 0,
  ephyra: 0.01,
  medusa: 0.01,
  medusaEnd: 0.005,
};

// 현재까지 흐른 시간에 따라 phase 결정
function getPhaseByElapsed(seconds) {
  let total = 0;
  for (const [phase, duration] of Object.entries(phaseDurations)) {
    total += duration;
    if (seconds < total) return phase;
  }
  return "polyp"; // 끝나면 다음 cycle로 돌아가므로 초기화
}

// 절대시간 기준 상태 계산
function getCycleAndPhase() {
  const totalCycleTime = Object.values(phaseDurations).reduce(
    (a, b) => a + b,
    0
  );
  const now = Date.now();
  const elapsed = Math.floor((now - originTime.getTime()) / 1000);

  const cycle = Math.floor(elapsed / totalCycleTime) + 1;
  const secondsInCycle = elapsed % totalCycleTime;
  const phase = getPhaseByElapsed(secondsInCycle);

  return { cycle, phase, secondsInCycle };
}

// 현재 phase에 따라 해파리 표시 여부 결정
function isJellyfishVisible(phase) {
  return phase === "ephyra" || phase === "medusa" || phase === "medusaEnd";
}

// UTC-5 기준 날짜 키 생성 (상태 메시지 하루 1회 변경용)
function getTodayKey() {
  const now = new Date();
  now.setHours(now.getHours() - 5);
  return now.toISOString().split("T")[0];
}

// 상태 메시지 로딩 (localStorage는 그대로 사용 가능)
function loadDailyStatus(phase) {
  const todayKey = getTodayKey();
  const savedKey = localStorage.getItem("statusDate");
  const savedPhase = localStorage.getItem("statusPhase");
  const savedStatus = localStorage.getItem("statusText");

  const phaseChanged = phase !== savedPhase;
  const dateChanged = todayKey !== savedKey;

  if (!phaseChanged && !dateChanged && savedStatus) return savedStatus;

  const group = statusMessages[phase] || ["해파리는 존재를 감춘다."];
  const message = group[Math.floor(Math.random() * group.length)];

  localStorage.setItem("statusDate", todayKey);
  localStorage.setItem("statusPhase", phase);
  localStorage.setItem("statusText", message);

  return message;
}

// 화면 업데이트
function updateDisplay() {
  const { cycle, phase } = getCycleAndPhase();
  stageDisplay.textContent = phaseLabelMap[phase] || "???";
  cycleDisplay.textContent = cycle;
  statusText.textContent = loadDailyStatus(phase);

  if (isJellyfishVisible(phase)) {
    jellyfish.style.display = "block";
    jellyfish.src = phase === "ephyra" ? "ephyra.gif" : "medusa.gif";
    polypVisual.style.display = "none";
  } else {
    jellyfish.style.display = "none";
    polypVisual.style.display = phase === "polyp" ? "block" : "none";
  }
}

function updateTimerCountdown() {
  const { secondsInCycle, phase } = getCycleAndPhase();
  let remainingSec = 0;
  let total = 0;

  for (const [key, dur] of Object.entries(phaseDurations)) {
    total += dur;
    if (key === phase) {
      remainingSec = total - secondsInCycle;
      break;
    }
  }

  timerLine.innerHTML = `다음 성장까지: ${formatTime(remainingSec)}`;
}

// 몸길이 계산
function updateBodyLength() {
  const { secondsInCycle, phase } = getCycleAndPhase();
  let growth = 0;
  let elapsed = 0;
  let total = 0;

  for (const [key, dur] of Object.entries(phaseDurations)) {
    if (key === phase) {
      elapsed = secondsInCycle - total;
      growth = elapsed * (growthRates[key] || 0);
      break;
    }
    total += dur;
  }

  lengthDisplay.textContent = `${growth.toFixed(2)} cm`;
}

// 해파리 움직임 설정
let pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let angle = Math.random() * 2 * Math.PI;
let speed = 1.2;
let lastDirectionChange = Date.now();
let directionChangeInterval = 3000;

function move() {
  const { phase } = getCycleAndPhase();
  if (!isJellyfishVisible(phase)) return;

  const now = Date.now();
  if (now - lastDirectionChange > directionChangeInterval) {
    angle += ((Math.random() - 0.5) * Math.PI) / 6;
    lastDirectionChange = now;
  }

  pos.x += Math.cos(angle) * speed;
  pos.y += Math.sin(angle) * speed;

  const margin = 32;
  const nudge = 10;

  function randomAngle() {
    return Math.random() * 2 * Math.PI;
  }

  if (pos.x <= 0) {
    pos.x = 0 + nudge;
    angle = randomAngle();
  }
  if (pos.x >= window.innerWidth - margin) {
    pos.x = window.innerWidth - margin - nudge;
    angle = randomAngle();
  }
  if (pos.y <= 0) {
    pos.y = 0 + nudge;
    angle = randomAngle();
  }
  if (pos.y >= window.innerHeight - margin) {
    pos.y = window.innerHeight - margin - nudge;
    angle = randomAngle();
  }

  jellyfish.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
}
// 매일 5시에 상태 메시지 초기화
function scheduleDailyStatusReset() {
  const now = new Date();
  const next = new Date();
  next.setHours(5, 0, 0, 0);
  if (now >= next) next.setDate(next.getDate() + 1);
  const timeoutMs = next - now;

  setTimeout(() => {
    localStorage.removeItem("statusDate");
    localStorage.removeItem("statusPhase");
    localStorage.removeItem("statusText");
    updateDisplay();
    scheduleDailyStatusReset();
  }, timeoutMs);
}

function init() {
  updateDisplay();
  setInterval(updateDisplay, 1000);
  setInterval(updateTimerCountdown, 1000);
  setInterval(updateBodyLength, 300);
  setInterval(move, 100); // ✅ 이거 추가
  scheduleDailyStatusReset();
}

// 상태 메시지 그룹
const statusMessages = {
  polyp: [
    "새로운 삶을 준비하고 있습니다.",
    "폴립 상태입니다.",
    "폴립은 성장 중입니다.",
    "다음 회차를 기다리고 있습니다.",
  ],
  ephyra: [
    "아직 해파리처럼 생기지 않았지만 해피리랍니다.",
    "성장 중입니다.",
    "해파리로 성장하는 중입니다.",
    "배고파",
    "배불러",
    "추워",
    "따뜻해",
    "행복해",
    "슬퍼",
    "화가 나",
    "놀라워",
  ],
  medusa: [
    "해파리는 여전히 성장 중입니다.",
    "배고파",
    "배불러",
    "추워",
    "따뜻해",
    "행복해",
    "슬퍼",
    "즐거워",
    "우울해",
    "화가 나",
    "외로워",
    "다른 해파리도 있을까?",
    "여긴 어디일까?",
    "전기 좋아",
  ],
  medusaEnd: [
    "해파리는 회귀를 준비 중입니다. ",
    "이제 다시 시작할 때가 되었어",
    "이번 회차도 즐거웠어",
    "다음 회차도 기대돼",
    "해파리는 다시 폴립으로 돌아갈 준비 중입니다.",
  ],
};

//init 시작
init();
