const COLORS = [
  "#ff4d4d",
  "#4da6ff",
  "#33cc66",
  "#ff9933",
  "#cc66ff",
  "#ffe066",
  "#00cccc",
  "#ff66a3"
];

const letters = ["ا", "ب", "ت", "ث", "ج", "ح", "خ", "د", "ر", "ز", "س", "ش", "ص", "ض", "ط", "ع", "غ", "ف", "ق", "ك", "ل", "م", "ن", "ه", "و"];
const FALLAH_QUESTIONS_BASE = "https://questions.fallah.fun/data/letters/arabic";
const LETTER_SOURCE_MAP = {
  "ا": "أ",
  "ه": "هـ"
};

const encodedEditTag = "RWRpdCBCeSBUeWxlci1UZWxncmFtLEBsMmwybDJs";

try {
  const decodedEditTag = atob(encodedEditTag);
  console.info(decodedEditTag);
} catch (error) {
//
}

let team1Color = COLORS[0];
let team2Color = COLORS[1];

let boardState = Array(5).fill(null).map(() => Array(5).fill(null));
let selectedHex = null;
let lastSelectedHex = null;
let currentLetter = "";
let currentQuestionData = null;
let isQuestionLoading = false;

let currentTimer = null;
let timerRemaining = 30;
let timerDuration = 30;
let isTimerRunning = false;
let hasTimerStarted = false;

let deleteMode = null;
const letterQuestionsCache = {};

let startMode = "letters";

let currentTurn = null;
let gameStarted = false;

const teamStartingLetters = {
  team1: "",
  team2: ""
};

const homeScreen = document.getElementById("homeScreen");
const gameScreen = document.getElementById("gameScreen");
const setupPage1 = document.getElementById("setupPage1");
const setupPage2 = document.getElementById("setupPage2");

const goToOptionsBtn = document.getElementById("goToOptionsBtn");
const backToTeamsBtn = document.getElementById("backToTeamsBtn");
const startGameBtn = document.getElementById("startGameBtn");

const questionBar = document.getElementById("questionBar");
const timerText = document.getElementById("timerText");
const timerFill = document.getElementById("timerFill");
const timerDurationLabel = document.getElementById("timerDurationLabel");
const startTimerBtn = document.getElementById("startTimerBtn");
const pauseTimerBtn = document.getElementById("pauseTimerBtn");
const resetTimerBtn = document.getElementById("resetTimerBtn");
const turnBadge = document.getElementById("turnBadge");
const startModeHint = document.getElementById("startModeHint");
const lettersStartBox = document.getElementById("lettersStartBox");
const gameFooter = document.querySelector(".gameFooter");

const topEdge = document.getElementById("topEdge");
const bottomEdge = document.getElementById("bottomEdge");
const leftEdge = document.getElementById("leftEdge");
const rightEdge = document.getElementById("rightEdge");

const answerTeam1 = document.getElementById("answerTeam1");
const answerTeam2 = document.getElementById("answerTeam2");

const team1Box = document.getElementById("team1Box");
const team2Box = document.getElementById("team2Box");

const verifyTeam1Btn = document.querySelector('.verifyBtn[data-team="team1"]');
const verifyTeam2Btn = document.querySelector('.verifyBtn[data-team="team2"]');

function getOpponent(team) {
  return team === "team1" ? "team2" : "team1";
}

function getTeamTitle(team) {
  return document.getElementById(`${team}Title`).innerText;
}

function getNormalizedName(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function showSetupPage(pageNumber) {
  setupPage1.classList.toggle("active", pageNumber === 1);
  setupPage2.classList.toggle("active", pageNumber === 2);
}

function syncStartLetterLabels() {
  const name1 = document.getElementById("team1NameInput").value.trim() || "الفريق الأول";
  const name2 = document.getElementById("team2NameInput").value.trim() || "الفريق الثاني";
  document.getElementById("team1StartLabel").textContent = `حرف بداية ${name1}`;
  document.getElementById("team2StartLabel").textContent = `حرف بداية ${name2}`;
}

function updateTurnUI() {
  const isTeam1Turn = currentTurn === "team1";
  const isTeam2Turn = currentTurn === "team2";

  if (isTeam1Turn || isTeam2Turn) {
    turnBadge.textContent = `أولوية اختيار الحرف: ${getTeamTitle(currentTurn)}`;
  } else {
    turnBadge.textContent = "أولوية اختيار الحرف: متاحة للفريقين";
  }

  team1Box.classList.toggle("activeTurn", isTeam1Turn);
  team2Box.classList.toggle("activeTurn", isTeam2Turn);

  answerTeam1.disabled = false;
  answerTeam2.disabled = false;

  verifyTeam1Btn.disabled = false;
  verifyTeam2Btn.disabled = false;
}

function updateTimerDurationUI() {
  timerDurationLabel.textContent = String(timerDuration);
  resetTimerState();
}

function resetTimerVisual() {
  timerText.textContent = String(timerRemaining);
  const width = timerDuration > 0 ? (timerRemaining / timerDuration) * 100 : 0;
  timerFill.style.width = `${Math.max(0, width)}%`;
}

function resetTimerState() {
  stopTimer();
  timerRemaining = timerDuration;
  hasTimerStarted = false;
  resetTimerVisual();
  pauseTimerBtn.textContent = "إيقاف المؤقت";
}

function stopTimer() {
  clearInterval(currentTimer);
  isTimerRunning = false;
}

function runTimerFromCurrent() {
  stopTimer();
  if (timerRemaining <= 0) {
    timerRemaining = timerDuration;
  }

  pauseTimerBtn.textContent = "إيقاف المؤقت";
  isTimerRunning = true;
  hasTimerStarted = true;
  currentTimer = setInterval(() => {
    timerRemaining -= 1;
    resetTimerVisual();

    if (timerRemaining <= 0) {
      onTimeEnded();
    }
  }, 1000);
}

function startRoundTimer() {
  if (!selectedHex || !currentQuestionData) {
    alert("لا يوجد سؤال نشط لبدء المؤقت");
    return;
  }

  if (isTimerRunning) return;

  if (!hasTimerStarted || timerRemaining <= 0) {
    timerRemaining = timerDuration;
    resetTimerVisual();
  }

  runTimerFromCurrent();
  questionBar.textContent = `الحرف: ${currentLetter} - ${currentQuestionData.question}`;
}

function onTimeEnded() {
  stopTimer();
  timerRemaining = 0;
  resetTimerVisual();
  pauseTimerBtn.textContent = "إيقاف المؤقت";

  if (!selectedHex || !currentQuestionData) {
    questionBar.textContent = "انتهى الوقت ⏰";
    return;
  }

  questionBar.textContent = `انتهى الوقت ⏰ السؤال الحالي: ${currentQuestionData.question}. يمكنك إعادة المؤقت أو تبديل السؤال.`;
}

function pauseOrResumeTimer() {
  if (!selectedHex || !currentQuestionData) {
    alert("لا يوجد سؤال نشط لإيقاف المؤقت");
    return;
  }

  if (isTimerRunning) {
    stopTimer();
    pauseTimerBtn.textContent = "استئناف المؤقت";
    return;
  }

  if (!hasTimerStarted) {
    alert("اضغط زر بدء المؤقت أولًا.");
    return;
  }

  if (timerRemaining <= 0) {
    alert("انتهى وقت السؤال. اضغط إعادة المؤقت أو غيّر السؤال.");
    return;
  }

  runTimerFromCurrent();
  questionBar.textContent = `الحرف: ${currentLetter} - ${currentQuestionData.question}`;
}

function resetRoundTimer() {
  resetTimerState();
}

function mapLetterForSource(letter) {
  return LETTER_SOURCE_MAP[letter] || letter;
}

function buildLetterQuestionsUrl(letter) {
  const sourceLetter = mapLetterForSource(letter);
  const fileName = `حرف ${sourceLetter}.json`;
  return `${FALLAH_QUESTIONS_BASE}/${encodeURIComponent(fileName)}`;
}

async function loadQuestionsByLetter(letter) {
  const sourceLetter = mapLetterForSource(letter);
  if (Object.prototype.hasOwnProperty.call(letterQuestionsCache, sourceLetter)) {
    return letterQuestionsCache[sourceLetter];
  }

  try {
    const response = await fetch(buildLetterQuestionsUrl(letter));
    if (!response.ok) {
      return [];
    }

    const rawData = await response.json();
    if (!Array.isArray(rawData)) {
      return [];
    }

    const questions = rawData.filter((item) =>
      item &&
      typeof item.question === "string" &&
      typeof item.answer === "string" &&
      item.question.trim() &&
      item.answer.trim()
    );

    letterQuestionsCache[sourceLetter] = questions;
    return questions;
  } catch (error) {
    return [];
  }
}

function pickRandomQuestion(questions, excludeQuestionText = "") {
  if (!Array.isArray(questions) || questions.length === 0) {
    return null;
  }

  const filtered = excludeQuestionText
    ? questions.filter((item) => item.question !== excludeQuestionText)
    : questions;

  const source = filtered.length > 0 ? filtered : questions;
  return source[Math.floor(Math.random() * source.length)] || null;
}

function normalizeArabicForMatch(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/أ|إ|آ/g, "ا");
}

async function getQuestionFromFallah(letter, excludeQuestionText = "") {
  const questions = await loadQuestionsByLetter(letter);
  return pickRandomQuestion(questions, excludeQuestionText);
}

function normalizeAnswerForComparison(text) {
  return normalizeArabicForMatch(String(text || ""))
    .replace(/\s+/g, "")
    .replace(/[^ء-يa-z0-9]/g, "");
}

function splitExpectedAnswerOptions(answerText) {
  const raw = String(answerText || "")
    .replace(/[()]/g, " ")
    .replace(/ــ+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!raw) return [];

  const parts = raw
    .split(/\s*(?:،|,|؛|;|\/|\||\n|:|(?:\bأو\b)|(?:\bاو\b))\s*/u)
    .map((part) => part.trim())
    .filter(Boolean);

  return [raw, ...parts];
}

function matchesExpectedAnswer(userAnswer, expectedAnswer, mode) {
  const userNormalized = normalizeAnswerForComparison(userAnswer);
  if (!userNormalized) return false;

  const options = splitExpectedAnswerOptions(expectedAnswer)
    .map((item) => normalizeAnswerForComparison(item))
    .filter(Boolean);

  if (options.length === 0) return false;

  if (mode === "strict") {
    return options.some((option) => option === userNormalized);
  }

  return options.some((option) => {
    if (option === userNormalized) return true;
    if (option.includes(userNormalized) && userNormalized.length >= 4) return true;
    if (userNormalized.includes(option) && option.length >= 4) return true;
    return false;
  });
}

function normalizeAnswer(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/^ال/, "")
    .replace(/أ|إ|آ/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, "")
    .replace(/[^ء-ي]/g, "");
}

function isValidWord(word, letter) {
  if (!word) return false;
  const normalized = normalizeAnswer(word);
  const normalizedLetter = normalizeAnswer(letter);
  if (!normalizedLetter || !normalized.startsWith(normalizedLetter)) return false;
  if (normalized.length < 3) return false;
  if (!/^[ء-ي]+$/.test(normalized)) return false;
  return true;
}

function showResultIcon(isCorrect) {
  const icon = document.getElementById("resultIcon");
  icon.innerHTML = isCorrect ? "✔" : "✖";
  icon.className = isCorrect ? "showIcon correct" : "showIcon wrong";
  setTimeout(() => {
    icon.className = "";
  }, 1200);
}

function clearSelection() {
  if (lastSelectedHex) {
    lastSelectedHex.classList.remove("selectedHex");
    lastSelectedHex = null;
  }
  selectedHex = null;
  currentLetter = "";
  currentQuestionData = null;
}

function createGrid() {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  const shuffled = [...letters].sort(() => 0.5 - Math.random());
  let index = 0;

  for (let r = 0; r < 5; r += 1) {
    const row = document.createElement("div");
    row.className = "row";

    for (let c = 0; c < 5; c += 1) {
      const hex = document.createElement("div");
      hex.className = "hex";
      hex.textContent = shuffled[index];
      index += 1;

      hex.dataset.row = String(r);
      hex.dataset.col = String(c);

      hex.addEventListener("click", () => onHexClick(hex));
      row.appendChild(hex);
    }

    grid.appendChild(row);
  }
}

async function onHexClick(hex) {
  if (!gameStarted) return;

  const row = Number(hex.dataset.row);
  const col = Number(hex.dataset.col);

  if (deleteMode) {
    tryDeleteOpponentCell(hex, row, col);
    return;
  }

  if (isQuestionLoading) return;
  if (boardState[row][col]) return;

  if (selectedHex && selectedHex !== hex) {
    alert("أكمل السؤال الحالي أولًا أو استخدم زر تبديل السؤال");
    return;
  }

  if (lastSelectedHex) {
    lastSelectedHex.classList.remove("selectedHex");
  }

  selectedHex = hex;
  lastSelectedHex = hex;
  hex.classList.add("selectedHex");

  currentLetter = hex.textContent;
  currentQuestionData = null;
  questionBar.textContent = `جاري تحميل سؤال لحرف ${currentLetter}...`;

  isQuestionLoading = true;
  const questionData = await getQuestionFromFallah(currentLetter);
  isQuestionLoading = false;

  if (selectedHex !== hex) {
    return;
  }

  if (!questionData) {
    questionBar.textContent = `لا توجد أسئلة متاحة لحرف ${currentLetter} ضمن تصنيف ${getSelectedCategoryLabel()}`;
    clearSelection();
    return;
  }

  currentQuestionData = questionData;
  questionBar.textContent = `الحرف: ${currentLetter} - ${questionData.question} (اضغط زر "بدء المؤقت")`;
  resetTimerState();
}

function checkPath(team) {
  const visited = Array(5).fill(null).map(() => Array(5).fill(false));
  const queue = [];

  if (team === "team1") {
    for (let r = 0; r < 5; r += 1) {
      if (boardState[r][0] === team) {
        queue.push([r, 0]);
        visited[r][0] = true;
      }
    }
  } else {
    for (let c = 0; c < 5; c += 1) {
      if (boardState[0][c] === team) {
        queue.push([0, c]);
        visited[0][c] = true;
      }
    }
  }

  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];

  while (queue.length > 0) {
    const [r, c] = queue.shift();

    if (team === "team1" && c === 4) return true;
    if (team === "team2" && r === 4) return true;

    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= 5 || nc < 0 || nc >= 5) continue;
      if (visited[nr][nc]) continue;
      if (boardState[nr][nc] !== team) continue;

      visited[nr][nc] = true;
      queue.push([nr, nc]);
    }
  }

  return false;
}

function endGame(msg) {
  stopTimer();
  document.getElementById("winScreen").style.display = "flex";
  document.getElementById("winTitle").innerText = msg;
  startConfetti();
}

function checkWin() {
  if (checkPath("team1")) {
    endGame(`🏆 فاز ${document.getElementById("team1Title").innerText}`);
    return true;
  }

  if (checkPath("team2")) {
    endGame(`🏆 فاز ${document.getElementById("team2Title").innerText}`);
    return true;
  }

  return false;
}

function verifyAnswer(team) {
  if (!gameStarted) return;

  if (!isTimerRunning && timerRemaining <= 0) {
    alert("انتهى وقت السؤال. أعد المؤقت أو غيّر السؤال.");
    return;
  }

  if (!selectedHex) {
    alert("اختر خلية أولًا");
    return;
  }

  if (!currentQuestionData || !currentQuestionData.answer) {
    alert("لم يتم تحميل السؤال بعد");
    return;
  }

  const inputElement = team === "team1" ? answerTeam1 : answerTeam2;
  const input = inputElement.value.trim();
  const activeQuestionText = `الحرف: ${currentLetter} - ${currentQuestionData.question}`;

  function showWrongAnswer(message) {
    showResultIcon(false);
    questionBar.textContent = `${message}. ${activeQuestionText}`;
  }

  if (!input) {
    showWrongAnswer("الرجاء إدخال الإجابة، الخانة فارغة");
    return;
  }

  if (!isValidWord(input, currentLetter)) {
    showWrongAnswer("إجابة غير صحيحة - الكلمة لا تبدأ بالحرف المطلوب");
    return;
  }

  const isAnswerMatched = matchesExpectedAnswer(input, currentQuestionData.answer, "easy");
  if (!isAnswerMatched) {
    showWrongAnswer("إجابة غير صحيحة لهذا السؤال");
    return;
  }

  const row = Number(selectedHex.dataset.row);
  const col = Number(selectedHex.dataset.col);

  selectedHex.style.background = team === "team1" ? team1Color : team2Color;
  boardState[row][col] = team;

  showResultIcon(true);

  answerTeam1.value = "";
  answerTeam2.value = "";

  clearSelection();

  if (checkWin()) {
    return;
  }

  currentTurn = team;
  updateTurnUI();

  resetTimerState();

  questionBar.textContent = `إجابة صحيحة لـ ${getTeamTitle(team)}. اختاروا الحرف التالي.`;
}

function enableDeleteMode(usingTeam, helpElement) {
  const opponent = getOpponent(usingTeam);
  const hasOpponentCells = boardState.some((row) => row.some((cell) => cell === opponent));

  if (!hasOpponentCells) {
    alert("لا توجد خلايا للمنافس حاليًا");
    return false;
  }

  deleteMode = { usingTeam, opponent, helpElement };
  questionBar.textContent = "وضع الحذف مفعّل: اختر خلية من خلايا الخصم للحذف";

  document.querySelectorAll(".hex").forEach((hex) => {
    const row = Number(hex.dataset.row);
    const col = Number(hex.dataset.col);
    if (boardState[row][col] === opponent) {
      hex.classList.add("deleteTarget");
    }
  });

  return true;
}

function clearDeleteMode() {
  deleteMode = null;
  document.querySelectorAll(".hex").forEach((hex) => hex.classList.remove("deleteTarget"));
}

function tryDeleteOpponentCell(hex, row, col) {
  if (!deleteMode) return;

  if (boardState[row][col] !== deleteMode.opponent) {
    alert("اختر خلية تابعة للمنافس فقط");
    return;
  }

  boardState[row][col] = null;
  hex.style.background = "";

  if (deleteMode.helpElement) {
    deleteMode.helpElement.classList.add("usedHelp");
  }

  clearDeleteMode();

  if (selectedHex && currentQuestionData) {
    questionBar.textContent = `الحرف: ${currentLetter} - ${currentQuestionData.question}`;
  } else {
    questionBar.textContent = "تم حذف خلية من المنافس";
  }
}

function getHintText(answer) {
  const options = splitExpectedAnswerOptions(answer);
  const firstOption = options[0] || String(answer || "").trim();
  const normalized = normalizeAnswerForComparison(firstOption);
  const hintLength = normalized.length;
  const firstLetter = firstOption ? firstOption.trim().charAt(0) : "؟";
  return `تلميح: الإجابة تبدأ بحرف ${firstLetter} وعدد أحرفها تقريبًا ${hintLength}`;
}

function setupHelpButtons() {
  document.querySelectorAll(".helpBtn").forEach((help) => {
    help.addEventListener("click", () => {
      if (help.classList.contains("usedHelp")) return;

      const usingTeam = help.parentElement.id === "helpsTeam1" ? "team1" : "team2";
      const type = help.dataset.help;

      if (type === "call") {
        if (!currentQuestionData || !currentQuestionData.answer) {
          alert("اختر سؤالًا أولًا لتستخدم اتصال بصديق");
          return;
        }

        alert(getHintText(currentQuestionData.answer));
        help.classList.add("usedHelp");
      }

      if (type === "delete") {
        enableDeleteMode(usingTeam, help);
      }
    });
  });
}

let confettiPieces = [];
let confettiRunning = false;

function startConfetti() {
  const canvas = document.getElementById("confettiCanvas");
  const ctx = canvas.getContext("2d");

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  confettiPieces = [];
  for (let i = 0; i < 150; i += 1) {
    confettiPieces.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - 500,
      size: Math.random() * 8 + 4,
      speed: Math.random() * 3 + 2,
      angle: Math.random() * 360
    });
  }

  confettiRunning = true;

  function animate() {
    if (!confettiRunning) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    confettiPieces.forEach((p) => {
      ctx.fillStyle = `hsl(${Math.random() * 360},100%,60%)`;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      p.y += p.speed;
      p.x += Math.sin(p.angle);
      p.angle += 0.05;
      if (p.y > canvas.height) p.y = -10;
    });

    requestAnimationFrame(animate);
  }

  animate();
}

function restartGame() {
  location.reload();
}

function createColorBoxes(containerId, team) {
  const container = document.getElementById(containerId);

  COLORS.forEach((color, index) => {
    const box = document.createElement("div");
    box.className = "colorBox";
    box.style.background = color;

    if ((team === "team1" && index === 0) || (team === "team2" && index === 1)) {
      box.classList.add("selectedColor");
    }

    box.addEventListener("click", () => {
      container.querySelectorAll(".colorBox").forEach((b) => b.classList.remove("selectedColor"));
      box.classList.add("selectedColor");

      if (team === "team1") {
        team1Color = color;
        updateColorStyle("setupTeam1", color);
      } else {
        team2Color = color;
        updateColorStyle("setupTeam2", color);
      }
    });

    container.appendChild(box);
  });
}

function updateColorStyle(boxId, color) {
  const box = document.getElementById(boxId);
  box.classList.add("glow");
  box.style.boxShadow = `0 0 24px ${color}, 0 0 40px ${color}`;
  box.style.borderColor = color;
}

function applyGameTeamStyles() {
  const team1Title = document.getElementById("team1Title");
  const team2Title = document.getElementById("team2Title");

  team1Title.style.color = team1Color;
  team2Title.style.color = team2Color;

  team1Box.style.borderColor = team1Color;
  team1Box.style.boxShadow = `0 0 18px ${team1Color}`;

  team2Box.style.borderColor = team2Color;
  team2Box.style.boxShadow = `0 0 18px ${team2Color}`;

  leftEdge.style.background = team1Color;
  rightEdge.style.background = team1Color;
  topEdge.style.background = team2Color;
  bottomEdge.style.background = team2Color;
}

function buildChoiceGroup(groupId, onChange) {
  const container = document.getElementById(groupId);
  if (!container) return;

  container.querySelectorAll(".choiceBtn").forEach((button) => {
    button.addEventListener("click", () => {
      container.querySelectorAll(".choiceBtn").forEach((btn) => btn.classList.remove("selectedChoice"));
      button.classList.add("selectedChoice");
      onChange(button.dataset.value || "");
    });
  });

  const selected = container.querySelector(".choiceBtn.selectedChoice");
  if (selected) {
    onChange(selected.dataset.value || "");
  }
}

function createStartLetterChoices(containerId, team, defaultLetter = "") {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  letters.forEach((letter) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "letterBtn";
    button.textContent = letter;

    button.addEventListener("click", () => {
      container.querySelectorAll(".letterBtn").forEach((btn) => btn.classList.remove("selectedLetter"));
      button.classList.add("selectedLetter");
      teamStartingLetters[team] = letter;
    });

    container.appendChild(button);
  });

  if (defaultLetter && letters.includes(defaultLetter)) {
    const defaultButton = Array.from(container.querySelectorAll(".letterBtn"))
      .find((button) => button.textContent === defaultLetter);

    if (defaultButton) {
      defaultButton.classList.add("selectedLetter");
      teamStartingLetters[team] = defaultLetter;
    }
  }
}

function pickRandomTeam() {
  return Math.random() < 0.5 ? "team1" : "team2";
}

function pickRandomLetter() {
  return letters[Math.floor(Math.random() * letters.length)] || letters[0];
}

function findHexByLetter(letter) {
  return Array.from(document.querySelectorAll("#grid .hex"))
    .find((hex) => hex.textContent === letter) || null;
}

function startOpeningQuestionByLetter(letter) {
  if (!letter) return;

  const openingHex = findHexByLetter(letter);
  if (!openingHex) {
    questionBar.textContent = `لم يتم العثور على خلية لحرف ${letter}. اختر خلية يدويًا للبدء.`;
    return;
  }

  onHexClick(openingHex);
}

function startGame() {
  const team1NameInput = document.getElementById("team1NameInput").value.trim();
  const team2NameInput = document.getElementById("team2NameInput").value.trim();

  const team1Name = team1NameInput || "الفريق الأول";
  const team2Name = team2NameInput || "الفريق الثاني";

  if (getNormalizedName(team1Name) === getNormalizedName(team2Name)) {
    alert("يجب اختيار اسم مختلف لكل فريق");
    return;
  }

  if (team1Color === team2Color) {
    alert("يجب اختيار لون مختلف لكل فريق");
    return;
  }

  let openingLetter = "";

  if (startMode === "letters") {
    if (!teamStartingLetters.team1 || !teamStartingLetters.team2) {
      alert("اختر حرفًا لكل فريق أولًا");
      return;
    }

    currentTurn = pickRandomTeam();
    openingLetter = teamStartingLetters[currentTurn];
  } else {
    currentTurn = null;
    openingLetter = pickRandomLetter();
  }

  document.getElementById("team1Title").innerText = team1Name;
  document.getElementById("team2Title").innerText = team2Name;

  applyGameTeamStyles();
  updateTurnUI();

  homeScreen.style.display = "none";
  gameScreen.style.display = "block";
  if (gameFooter) gameFooter.style.display = "block";
  gameStarted = true;

  resetTimerState();

  if (startMode === "letters") {
    questionBar.textContent = `تم اختيار ${getTeamTitle(currentTurn)} عشوائيًا ليبدأ بحرف ${openingLetter}.`;
    startOpeningQuestionByLetter(openingLetter);
    return;
  }

  questionBar.textContent = `تمت القرعة على حرف البداية: ${openingLetter}. الفريق الذي يجيب صحيحًا يختار الحرف التالي.`;
  startOpeningQuestionByLetter(openingLetter);
}

async function changeQuestion() {
  if (!selectedHex || !currentLetter || isQuestionLoading) {
    return;
  }

  questionBar.textContent = `جاري تحميل سؤال آخر لحرف ${currentLetter}...`;
  isQuestionLoading = true;

  const nextQuestion = await getQuestionFromFallah(
    currentLetter,
    currentQuestionData ? currentQuestionData.question : ""
  );

  isQuestionLoading = false;

  if (!selectedHex) return;

  if (!nextQuestion) {
    questionBar.textContent = `لا يوجد سؤال آخر لحرف ${currentLetter} ضمن تصنيف ${getSelectedCategoryLabel()}`;
    return;
  }

  currentQuestionData = nextQuestion;
  questionBar.textContent = `الحرف: ${currentLetter} - ${nextQuestion.question} (اضغط زر "بدء المؤقت")`;
  resetTimerState();
}

function setupEvents() {
  goToOptionsBtn.addEventListener("click", () => {
    syncStartLetterLabels();
    showSetupPage(2);
  });

  backToTeamsBtn.addEventListener("click", () => {
    showSetupPage(1);
  });

  startGameBtn.addEventListener("click", startGame);

  document.getElementById("changeQuestionBtn").addEventListener("click", changeQuestion);
  startTimerBtn.addEventListener("click", startRoundTimer);
  pauseTimerBtn.addEventListener("click", pauseOrResumeTimer);
  resetTimerBtn.addEventListener("click", resetRoundTimer);

  verifyTeam1Btn.addEventListener("click", () => verifyAnswer("team1"));
  verifyTeam2Btn.addEventListener("click", () => verifyAnswer("team2"));

  answerTeam1.addEventListener("keydown", (event) => {
    if (event.key === "Enter") verifyAnswer("team1");
  });

  answerTeam2.addEventListener("keydown", (event) => {
    if (event.key === "Enter") verifyAnswer("team2");
  });

  document.getElementById("restartBtn").addEventListener("click", restartGame);

  document.getElementById("team1NameInput").addEventListener("input", syncStartLetterLabels);
  document.getElementById("team2NameInput").addEventListener("input", syncStartLetterLabels);
}

function initChoices() {
  buildChoiceGroup("timerChoices", (value) => {
    const parsed = Number(value);
    timerDuration = Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
    updateTimerDurationUI();
  });

  buildChoiceGroup("startModeChoices", (value) => {
    startMode = value === "letters" ? "letters" : "lottery";

    if (startMode === "letters") {
      lettersStartBox.classList.remove("hidden");
      startModeHint.textContent = "كل فريق يختار حرفًا، ثم يتم اختيار فريق البداية عشوائيًا ويبدأ بحرفه.";
      return;
    }

    lettersStartBox.classList.add("hidden");
    startModeHint.textContent = "تتم قرعة حرف البداية فقط، وبعد كل إجابة صحيحة يختار الفريق الفائز الحرف التالي.";
  });
}

function init() {
  createColorBoxes("team1Colors", "team1");
  createColorBoxes("team2Colors", "team2");

  updateColorStyle("setupTeam1", team1Color);
  updateColorStyle("setupTeam2", team2Color);

  createStartLetterChoices("team1StartLetters", "team1", "ا");
  createStartLetterChoices("team2StartLetters", "team2", "ب");

  syncStartLetterLabels();
  initChoices();

  createGrid();
  setupHelpButtons();
  setupEvents();

  resetTimerState();
  updateTurnUI();
}

init();
