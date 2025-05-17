// index.js

// —— DOM references ——
const difficultySelect = document.getElementById('difficultySelect');
const themeSelect      = document.getElementById('themeSelect');
const startBtn         = document.getElementById('startButton');
const resetBtn         = document.getElementById('resetButton');
const hintBtn          = document.getElementById('hintButton');
const timeDisplay      = document.getElementById('time');
const clickDisplay     = document.getElementById('clickCount');
const matchedDisp      = document.getElementById('pairsMatched');
const toWinDisp        = document.getElementById('pairsToWin');
const cardContainer    = document.querySelector('.card-container');
const winMsg           = document.getElementById('winMessage');
const overMsg          = document.getElementById('gameOver');

// —— Difficulty settings ——
const levelConfig = {
  easy:   { rows: 4, cols: 4, time: 20,  hints: 1 },
  medium: { rows: 6, cols: 6, time: 60,  hints: 2 },
  hard:   { rows: 8, cols: 8, time: 90, hints: 3 }
};

// —— Back-image mapping ——
const backImages = {
  classic: 'back.webp',
  dark:    'back.webp',
  forest:  'back.webp'
};
let currentTheme = themeSelect.value;

// —— State variables ——
let clickCount, pairsMatched, pairsToWin, timeLeft;
let flippedCards, lockBoard, timerInterval, gameStarted;
let hintsUsed  = 0;
let hintLimit  = 0;

// —— Theme application function ——
function applyTheme(theme) {
  currentTheme = theme;
  document.body.classList.remove('theme-classic','theme-dark','theme-forest');
  document.body.classList.add(`theme-${theme}`);
  // also swap out existing card backs
  document.querySelectorAll('.card .back').forEach(img => {
    img.src = backImages[theme];
  });
}
applyTheme(currentTheme);
themeSelect.addEventListener('change', e => applyTheme(e.target.value));

// —— Card click handler ——
function handleCardClick() {
  if (!gameStarted || lockBoard) return;
  if (this.classList.contains('flip') || this.classList.contains('matched')) return;

  clickCount++;
  clickDisplay.textContent = clickCount;

  this.classList.add('flip');
  flippedCards.push(this);

  if (flippedCards.length === 2) checkMatch();
}

// —— Match checking ——
function checkMatch() {
  const [c1, c2] = flippedCards;
  const isMatch = c1.querySelector('.front').src === c2.querySelector('.front').src;

  if (isMatch) {
    c1.classList.add('matched');
    c2.classList.add('matched');
    pairsMatched++;
    matchedDisp.textContent = pairsMatched;
    toWinDisp.textContent = pairsToWin - pairsMatched;
    if (pairsMatched === pairsToWin) endWin();
    resetBoard();
  } else {
    lockBoard = true;
    setTimeout(() => {
      c1.classList.remove('flip');
      c2.classList.remove('flip');
      resetBoard();
    }, 1000);
  }
}

function resetBoard() {
  flippedCards = [];
  lockBoard = false;
}

// —— Start timer ——
function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      return endGameOver();
    }
    timeLeft--;
    timeDisplay.textContent = formatTime(timeLeft);
  }, 1000);
}

// —— Hint: reveal all cards for 1 second ——
hintBtn.addEventListener('click', () => {
  if (!gameStarted || lockBoard) return;
  // don't allow more than the allotted hints
  if (hintsUsed >= hintLimit) return;

  // consume one hint
  hintsUsed++;
  updateHintButton();
  if (hintsUsed >= hintLimit) {
    hintBtn.disabled = true;
  }

  // show all cards briefly
  const cards = Array.from(document.querySelectorAll('.card'));
  cards.forEach(c => c.classList.add('flip'));
  lockBoard = true;
  setTimeout(() => {
    cards.forEach(c => {
      if (!c.classList.contains('matched')) {
        c.classList.remove('flip');
      }
    });
    lockBoard = false;
  }, 1000);
});

function updateHintButton() {
  hintBtn.textContent = `Hint (${hintLimit - hintsUsed})`;
}

// —— Start game ——
async function startGame() {
  const lvl = difficultySelect.value;
  const { rows, cols, time } = levelConfig[lvl];
  const totalCards = rows * cols;

  pairsToWin   = totalCards / 2;
  timeLeft     = time;
  clickCount   = 0;
  pairsMatched = 0;
  flippedCards = [];
  lockBoard    = false;
  gameStarted  = false;

  clickDisplay.textContent = 0;
  matchedDisp.textContent  = 0;
  toWinDisp.textContent    = pairsToWin;
  timeDisplay.textContent  = formatTime(timeLeft);
  winMsg.classList.add('hidden');
  overMsg.classList.add('hidden');
  startBtn.disabled = true;
  resetBtn.disabled = false;
  // Set hint limit based on difficulty
  hintLimit = levelConfig[lvl].hints;
  hintsUsed = 0;
  hintBtn.disabled = false;

  updateHintButton();

  // Set grid column count
  cardContainer.style.gridTemplateColumns = `repeat(${cols}, minmax(0,1fr))`;

  // Generate card data
  await populateCards(pairsToWin);

  // Bind click events
  document.querySelectorAll('.card').forEach(card =>
    card.addEventListener('click', handleCardClick)
  );

  gameStarted = true;
  startTimer();
}

// —— Reset game ——
function resetGame() {
  clearInterval(timerInterval);
  cardContainer.innerHTML = '';
  startBtn.disabled = false;
  hintBtn.disabled  = true;
}

// —— Win / Game Over ——
function endWin() {
  clearInterval(timerInterval);
  gameStarted = false;
  winMsg.classList.remove('hidden');
}
function endGameOver() {
  gameStarted = false;
  lockBoard = true;
  overMsg.classList.remove('hidden');
}

// —— Time formatting ——
function formatTime(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// —— Generate card data with multiple fallbacks via PokeAPI ——
async function populateCards(pairCount) {
  cardContainer.innerHTML = '';
  const listRes = await fetch('https://pokeapi.co/api/v2/pokemon?limit=151');
  const all     = (await listRes.json()).results;

  const picks = [];
  while (picks.length < pairCount) {
    const idx = Math.floor(Math.random() * all.length);
    if (!picks.includes(all[idx])) picks.push(all[idx]);
  }

  const cardData = [];
  await Promise.all(picks.map(async p => {
    const detail = await fetch(p.url).then(r => r.json());
    const id     = detail.id;

    const fallbacks = [
      detail.sprites.other?.['official-artwork']?.front_default,
      detail.sprites.other?.dream_world?.front_default,
      detail.sprites.front_default,
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
      'placeholder.png'
    ].filter(Boolean);

    const src = fallbacks.shift();
    for (let i = 0; i < 2; i++) {
      cardData.push({ src, fallbacks: [...fallbacks], alt: p.name });
    }
  }));

  cardData.sort(() => Math.random() - 0.5);

  for (const { src, fallbacks, alt } of cardData) {
    const card = document.createElement('div');
    card.className = 'card';

    const imgFront = document.createElement('img');
    imgFront.className = 'front';
    imgFront.src = src;
    imgFront.alt = alt;
    imgFront.onerror = () => {
      if (fallbacks.length) imgFront.src = fallbacks.shift();
    };

    const imgBack = document.createElement('img');
    imgBack.className = 'back';
    imgBack.src = backImages[currentTheme];
    imgBack.alt = 'Card Back';
    imgBack.onerror = () => { imgBack.src = 'back.webp'; };

    card.append(imgFront, imgBack);
    cardContainer.appendChild(card);
  }
}

// —— Button event bindings ——
startBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', resetGame);
