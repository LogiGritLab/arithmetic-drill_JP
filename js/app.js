/**
 * 計算練習アプリ
 * たし算・ひき算・かけ算・わり算 / 1〜3けた
 */

const OP_META = {
  add: { labelJa: 'たし算', symbol: '＋' },
  sub: { labelJa: 'ひき算', symbol: '−' },
  mul: { labelJa: 'かけ算', symbol: '×' },
  div: { labelJa: 'わり算', symbol: '÷' }
};

const DIGIT_OPTIONS = {
  add: [1, 2, 3],
  sub: [1, 2, 3],
  mul: [1, 2, 3],
  div: [1, 2, 3]
};

const HINTS = {
  add: {
    1: '',
    2: 'くりあがりに注意',
    3: '位ごとに計算してみよう'
  },
  sub: {
    1: '',
    2: 'くりさがりに注意',
    3: '位ごとに計算してみよう'
  },
  mul: {
    1: '',
    2: '筆算のイメージで',
    3: '筆算のイメージで'
  },
  div: {
    1: 'わりきれる問題です',
    2: 'わりきれる問題です',
    3: 'わりきれる問題です'
  }
};

// DOM
const numAEl = document.getElementById('numA');
const numBEl = document.getElementById('numB');
const opSymbolEl = document.getElementById('opSymbol');
const answerDisplay = document.getElementById('answerDisplay');
const answerArea = document.getElementById('answerArea');
const answerInput = document.getElementById('answerInput');
const inputHint = document.getElementById('inputHint');
const feedbackEl = document.getElementById('feedback');
const feedbackTextEl = document.getElementById('feedbackText');
const nextProblemBtn = document.getElementById('nextProblemBtn');
const problemEl = document.getElementById('problem');
const hintNote = document.getElementById('hintNote');
const subTitle = document.getElementById('subTitle');
const opMenu = document.getElementById('opMenu');
const digitMenu = document.getElementById('digitMenu');
const digit3Btn = document.getElementById('digit3Btn');
const keypad = document.getElementById('keypad');
const correctCountEl = document.getElementById('correctCount');
const wrongCountEl = document.getElementById('wrongCount');
const streakCountEl = document.getElementById('streakCount');
const resetBtn = document.getElementById('resetBtn');

const INPUT_HINT_IDLE = '';
const INPUT_HINT_ACTIVE = 'キーボードで数字を入力できます（Enterで答える）';

// State
let currentOp = 'add';
let currentDigits = 1;
let a = 0;
let b = 0;
let answerBuffer = '';
let correctCount = 0;
let wrongCount = 0;
let streak = 0;
let locked = false;
let problemTimer = null;

let lastA = null;
let lastB = null;

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateNumbers() {
  const maxVal = Math.pow(10, currentDigits) - 1; 
  const minVal = currentDigits === 1 ? 0 : Math.pow(10, currentDigits - 1); 

  let newA = 0;
  let newB = 0;

  for (let i = 0; i < 200; i++) {
    let isTooEasy = false;

    if (currentOp === 'add') {
      newA = randInt(minVal, maxVal);
      newB = randInt(currentDigits === 1 ? 0 : 1, maxVal);
      if (newA === 0 || newB === 0) isTooEasy = true;
      if (Math.random() < 0.5) { 
        let tmp = newA; newA = newB; newB = tmp;
      }
    } 
    else if (currentOp === 'sub') {
      newA = randInt(minVal, maxVal);
      newB = randInt(currentDigits === 1 ? 0 : 1, newA);
      if (newA === 0 || newB === 0 || newA === newB) isTooEasy = true;
    } 
    else if (currentOp === 'mul') {
      newA = randInt(minVal, maxVal);
      if (currentDigits === 1) {
        newB = randInt(0, 9);
        if (newA <= 1 || newB <= 1) isTooEasy = true;
      } else {
        newB = randInt(2, maxVal); 
      }
      if (Math.random() < 0.5) {
        let tmp = newA; newA = newB; newB = tmp;
      }
    } 
    else if (currentOp === 'div') {
      if (currentDigits === 1) {
        newA = randInt(1, 9);
        const divisors = [];
        for (let d = 1; d <= newA; d++) {
          if (newA % d === 0) divisors.push(d);
        }
        newB = divisors[randInt(0, divisors.length - 1)];
        if (newB === 1 || newA === newB) isTooEasy = true;
      } else {
        newA = randInt(minVal, maxVal);
        const divisors = [];
        for (let d = 2; d < newA; d++) {
          if (newA % d === 0) divisors.push(d);
        }
        if (divisors.length === 0) continue; 
        newB = divisors[randInt(0, divisors.length - 1)];
      }
    }

    if (isTooEasy && Math.random() < 0.9) continue;
    if (newA === lastA && newB === lastB) continue;

    break;
  }

  a = newA;
  b = newB;
  lastA = a;
  lastB = b;
}

function correctAnswer() {
  switch (currentOp) {
    case 'add': return a + b;
    case 'sub': return a - b;
    case 'mul': return a * b;
    case 'div': return Math.floor(a / b);
    default: return 0;
  }
}

function syncAnswerUI() {
  if (answerBuffer === '') {
    answerDisplay.textContent = '?';
    answerDisplay.classList.remove('filled');
  } else {
    answerDisplay.textContent = answerBuffer;
    answerDisplay.classList.add('filled');
  }
  answerInput.value = answerBuffer;
}

function setInputFocused(focused) {
  answerArea.classList.toggle('is-focused', focused);
  inputHint.classList.toggle('is-active', focused);
  inputHint.textContent = focused ? INPUT_HINT_ACTIVE : INPUT_HINT_IDLE;
}

function focusAnswerInput() {
  answerInput.focus({ preventScroll: true });
  setInputFocused(true);
}

function clearAnswer() {
  answerBuffer = '';
  syncAnswerUI();
}

function resetResultColor() {
  answerArea.classList.remove('is-ok', 'is-ng');
}

function showResultColor(kind) {
  resetResultColor();
  answerArea.classList.add(kind === 'ok' ? 'is-ok' : 'is-ng');
}

function appendDigit(digit) {
  if (locked) return;
  if (answerBuffer === '0') {
    answerBuffer = String(digit);
  } else if (answerBuffer.length < 7) { 
    answerBuffer += String(digit);
  }
  syncAnswerUI();
}

function backspace() {
  if (locked) return;
  answerBuffer = answerBuffer.slice(0, -1);
  syncAnswerUI();
}

function applyModeUI() {
  const meta = OP_META[currentOp];
  const allowedDigits = DIGIT_OPTIONS[currentOp];

  const digit3Allowed = allowedDigits.includes(3);
  digit3Btn.disabled = !digit3Allowed;
  digit3Btn.setAttribute('aria-disabled', digit3Allowed ? 'false' : 'true');

  if (!allowedDigits.includes(currentDigits)) {
    currentDigits = allowedDigits[0];
  }

  subTitle.textContent = `${currentDigits}けたの${meta.labelJa}`;
  opSymbolEl.textContent = meta.symbol;
  document.title = '四則演算 練習サイト';

  problemEl.classList.remove('compact', 'tight');
  if (currentDigits === 2 || currentOp === 'mul' || currentOp === 'div') {
    problemEl.classList.add('compact');
  }
  if (currentDigits === 3 || (currentOp === 'mul' && currentDigits >= 2) || (currentOp === 'div' && currentDigits >= 2)) {
    problemEl.classList.add('tight');
  }

  hintNote.textContent = HINTS[currentOp][currentDigits] || '';

  opMenu.querySelectorAll('.chip').forEach((btn) => {
    const active = btn.dataset.op === currentOp;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  digitMenu.querySelectorAll('.chip').forEach((btn) => {
    const d = Number(btn.dataset.digits);
    const active = d === currentDigits;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });
}

function setKeypadEnabled(enabled) {
  keypad.querySelectorAll('.key').forEach((key) => {
    key.disabled = !enabled;
  });
}

function newProblem() {
  if (problemTimer) {
    clearTimeout(problemTimer);
    problemTimer = null;
  }

  generateNumbers();
  numAEl.textContent = a;
  numBEl.textContent = b;
  clearAnswer();
  resetResultColor();
  
  feedbackTextEl.textContent = '';
  feedbackEl.className = 'feedback empty';
  nextProblemBtn.hidden = true;
  
  locked = false;
  setKeypadEnabled(true);
  focusAnswerInput();
}

function setOp(op) {
  if (!OP_META[op]) return;
  if (op === currentOp) {
    focusAnswerInput();
    return;
  }
  currentOp = op;
  applyModeUI();
  newProblem();
}

function setDigits(digits) {
  const d = Number(digits);
  if (!DIGIT_OPTIONS[currentOp].includes(d)) return;
  if (d === currentDigits) {
    focusAnswerInput();
    return;
  }
  currentDigits = d;
  applyModeUI();
  newProblem();
}

function updateScoreboard() {
  correctCountEl.textContent = correctCount;
  wrongCountEl.textContent = wrongCount;
  streakCountEl.textContent = streak;
}

function submitAnswer() {
  if (locked) return;
  if (answerBuffer === '') return;

  const userAnswer = parseInt(answerBuffer, 10);
  if (Number.isNaN(userAnswer)) return;

  const answer = correctAnswer();
  locked = true;
  setKeypadEnabled(false);

  if (userAnswer === answer) {
    correctCount += 1;
    streak += 1;
    feedbackEl.className = 'feedback ok';
    feedbackTextEl.textContent = `正解！ ${a} ${OP_META[currentOp].symbol} ${b} ＝ ${answer}`;
    nextProblemBtn.hidden = true;
    showResultColor('ok');
    
    problemTimer = setTimeout(newProblem, 600);
  } else {
    wrongCount += 1;
    streak = 0;
    feedbackEl.className = 'feedback ng';
    feedbackTextEl.textContent = `不正解… 正解は ${answer}`;
    nextProblemBtn.hidden = false;
    showResultColor('ng');
    
    setTimeout(() => {
      nextProblemBtn.focus();
    }, 50);
  }
  updateScoreboard();
}

/* Events */
opMenu.addEventListener('click', (e) => {
  const btn = e.target.closest('.chip');
  if (!btn || btn.disabled) return;
  setOp(btn.dataset.op);
});

digitMenu.addEventListener('click', (e) => {
  const btn = e.target.closest('.chip');
  if (!btn || btn.disabled) return;
  setDigits(btn.dataset.digits);
});

keypad.addEventListener('click', (e) => {
  const btn = e.target.closest('.key');
  if (!btn || btn.disabled) return;

  const key = btn.dataset.key;
  if (key === 'clear') {
    clearAnswer();
  } else if (key === 'back') {
    backspace();
  } else if (key === 'submit') {
    submitAnswer();
  } else {
    appendDigit(key);
  }
  focusAnswerInput();
});

answerArea.addEventListener('click', (e) => {
  e.preventDefault();
  focusAnswerInput();
});

answerInput.addEventListener('focus', () => {
  setInputFocused(true);
});

answerInput.addEventListener('blur', () => {
  setTimeout(() => {
    if (document.activeElement !== answerInput) {
      setInputFocused(false);
    }
  }, 0);
});

nextProblemBtn.addEventListener('click', () => {
  newProblem();
});

answerInput.addEventListener('keydown', (e) => {
  if (locked) {
    if (e.key === 'Enter' && !nextProblemBtn.hidden) {
      e.preventDefault();
      nextProblemBtn.click();
    } else {
      e.preventDefault();
    }
    return;
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    submitAnswer();
    return;
  }
  if (e.key === 'Backspace') {
    e.preventDefault();
    backspace();
    return;
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    clearAnswer();
    return;
  }
  if (e.key >= '0' && e.key <= '9') {
    e.preventDefault();
    appendDigit(e.key);
    return;
  }
  if (e.key.length === 1) {
    e.preventDefault();
  }
});

document.addEventListener('keydown', (e) => {
  const tag = (e.target && e.target.tagName) || '';
  const target = e.target;

  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  if (target === answerArea || answerArea.contains(target)) {
    if (e.key === 'Enter') {
      if (locked && !nextProblemBtn.hidden) {
        e.preventDefault();
        nextProblemBtn.click();
      } else if (!locked) {
        e.preventDefault();
        submitAnswer();
      }
      return;
    }
  } else if (tag === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) {
    return;
  }

  if (locked) {
    if (e.key === 'Enter' && !nextProblemBtn.hidden) {
      e.preventDefault();
      nextProblemBtn.click();
    }
    return;
  }

  if (e.key === 'Enter') {
    e.preventDefault();
    submitAnswer();
  } else if (e.key === 'Backspace') {
    e.preventDefault();
    backspace();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    clearAnswer();
  } else if (e.key >= '0' && e.key <= '9') {
    e.preventDefault();
    appendDigit(e.key);
    setInputFocused(true);
  }
});

problemEl.addEventListener('click', (e) => {
  if (e.target.closest('.answer-area')) return;
  focusAnswerInput();
});

resetBtn.addEventListener('click', () => {
  correctCount = 0;
  wrongCount = 0;
  streak = 0;
  updateScoreboard();
  newProblem();
});

// Init
applyModeUI();
updateScoreboard();
newProblem();