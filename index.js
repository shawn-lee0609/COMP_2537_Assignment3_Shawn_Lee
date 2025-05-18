// index.js

// —— Power-up state ——
let matchTimestamps = [];

// —— DOM references ——
const currentTimeDisplay = document.getElementById('currentTime');
const difficultySelect = document.getElementById('difficultySelect');
const themeSelect = document.getElementById('themeSelect');
const startBtn = document.getElementById('startButton');
const resetBtn = document.getElementById('resetButton');
const hintBtn = document.getElementById('hintButton');
const timeDisplay = document.getElementById('time');
const clickDisplay = document.getElementById('clickCount');
const matchedDisp = document.getElementById('pairsMatched');
const toWinDisp = document.getElementById('pairsToWin');
const cardContainer = document.querySelector('.card-container');
const winMsg = document.getElementById('winMessage');
const overMsg = document.getElementById('gameOver');

function updateCurrentTime() {
  const now = new Date();
  currentTimeDisplay.textContent = now.toLocaleTimeString();
}

updateCurrentTime();
setInterval(updateCurrentTime, 1000);

// —— Difficulty settings ——
const levelConfig = {
  easy: { rows: 2, cols: 4, time: 20, hints: 2 },
  medium: { rows: 4, cols: 6, time: 40, hints: 2 },
  hard: { rows: 6, cols: 8, time: 60, hints: 2 }
};

// —— Back-image mapping ——
const backImages = {
  classic: 'back.webp',
  dark: 'back.webp',
  forest: 'back.webp'
};
let currentTheme = themeSelect.value;

// —— State variables ——
let clickCount, pairsMatched, pairsToWin, timeLeft;
let flippedCards, lockBoard, timerInterval, gameStarted;
let hintsUsed = 0;
let hintLimit = 0;

// —— Theme application function ——
function applyTheme(theme) {
  currentTheme = theme;
  document.body.classList.remove('theme-classic', 'theme-dark', 'theme-forest');
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
  lockBoard = true;         // prevent extra clicks
  const [c1, c2] = flippedCards;
  const isMatch =
    c1.querySelector('.front').src === c2.querySelector('.front').src;

  if (isMatch) {
    // 1) mark cards matched
    c1.classList.add('matched');
    c2.classList.add('matched');

    // 2) update counters
    pairsMatched++;
    matchedDisp.textContent = pairsMatched;
    toWinDisp.textContent = pairsToWin - pairsMatched;

    // 3) power-up: 3 matches within 10s → +10s
    const now = Date.now();
    matchTimestamps.push(now);
    matchTimestamps = matchTimestamps.filter(t => now - t <= 10000);
    if (matchTimestamps.length >= 3) {
      timeLeft += 10;
      timeDisplay.textContent = formatTime(timeLeft);
      showPowerUp('+10s!');
      matchTimestamps = [];   // only fire once per triple
    }

    // 4) check for win
    if (pairsMatched === pairsToWin) {
      return endWin();
    }

    // 5) ready for next turn
    resetBoard();

  } else {
    // not a match → flip back after a short delay
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

  // clear any partial selection so hint won't "remember" the first card
  flippedCards = [];

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

  pairsToWin = totalCards / 2;
  timeLeft = time;
  clickCount = 0;
  pairsMatched = 0;
  flippedCards = [];
  lockBoard = false;
  gameStarted = false;
  matchTimestamps = [];
  clickDisplay.textContent = 0;
  matchedDisp.textContent = 0;
  toWinDisp.textContent = pairsToWin;
  timeDisplay.textContent = formatTime(timeLeft);
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
  // 1. Stop timer and clear cards
  clearInterval(timerInterval);
  cardContainer.innerHTML = '';

  matchTimestamps = [];

  // 2. Re-enable/disable controls
  startBtn.disabled = false;
  resetBtn.disabled = true;
  hintBtn.disabled = true;

  // 3. Hide any end-of-game messages
  winMsg.classList.add('hidden');
  overMsg.classList.add('hidden');

  // 4. Reset all your state variables
  clickCount = 0;
  pairsMatched = 0;
  hintsUsed = 0;

  // 5. Re-derive initial values from the selected difficulty
  const lvl = difficultySelect.value;
  const { rows, cols, time, hints } = levelConfig[lvl];
  pairsToWin = (rows * cols) / 2;
  hintLimit = hints;
  timeLeft = time;

  // 6. Push those resets back into the UI
  clickDisplay.textContent = clickCount;
  matchedDisp.textContent = pairsMatched;
  toWinDisp.textContent = pairsToWin;
  timeDisplay.textContent = formatTime(timeLeft);
  hintBtn.textContent = `Hint (${hintLimit - hintsUsed})`;
}

/**
 * Briefly show a floating bonus message.
 */
function showPowerUp(text) {
  const popup = document.createElement('div');
  popup.className = 'power-up-popup';
  popup.textContent = text;
  document.body.appendChild(popup);
  // remove after animation
  setTimeout(() => popup.remove(), 1200);
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
  const all = (await listRes.json()).results;

  const picks = [];
  while (picks.length < pairCount) {
    const idx = Math.floor(Math.random() * all.length);
    if (!picks.includes(all[idx])) picks.push(all[idx]);
  }

  const cardData = [];
  await Promise.all(picks.map(async p => {
    const detail = await fetch(p.url).then(r => r.json());
    const id = detail.id;

    const fallbacks = [
      // official art
      detail.sprites.other?.['official-artwork']?.front_default,
      // Dream World line drawing
      detail.sprites.other?.dream_world?.front_default,
      // Home “3D” render
      detail.sprites.other?.home?.front_default,
      // standard front sprite
      detail.sprites.front_default,
      // raw GitHub CDN mirrors
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${id}.png`,
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
      // guaranteed remote placeholder
      'https://via.placeholder.com/120?text=No+Img'
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
