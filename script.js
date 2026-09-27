/**
 * TIC TAC TOE - CORE GAME LOGIC & INTERACTION ENGINE
 * Vanilla JavaScript (ES6+)
 * 
 * Features:
 * - Robust 2-Player Turn Logic & 3x3 Matrix State
 * - Win (8 Combinations) & Draw Detection
 * - Strike-through Line & Highlight System
 * - Synthesized Audio Effects using Web Audio API (Zero External Assets)
 * - Canvas-based Celebration Particle Confetti
 * - Keyboard Accessibility & Modal System
 * - LocalStorage Persistent Scoreboard
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================================================
  // 1. STATE & CONSTANTS
  // ==========================================================================
  
  const WINNING_COMBINATIONS = [
    { combo: [0, 1, 2], class: 'row-0' },
    { combo: [3, 4, 5], class: 'row-1' },
    { combo: [6, 7, 8], class: 'row-2' },
    { combo: [0, 3, 6], class: 'col-0' },
    { combo: [1, 4, 7], class: 'col-1' },
    { combo: [2, 5, 8], class: 'col-2' },
    { combo: [0, 4, 8], class: 'diag-main' },
    { combo: [2, 4, 6], class: 'diag-anti' }
  ];

  const SVG_X = `
    <svg class="mark-svg mark-x" viewBox="0 0 100 100" aria-label="X">
      <path d="M 22 22 L 78 78" />
      <path d="M 78 22 L 22 78" />
    </svg>
  `;

  const SVG_O = `
    <svg class="mark-svg mark-o" viewBox="0 0 100 100" aria-label="O">
      <circle cx="50" cy="50" r="36" />
    </svg>
  `;

  let boardState = ['', '', '', '', '', '', '', '', ''];
  let currentPlayer = 'X';
  let isGameActive = true;
  let moveCount = 0;

  let scores = {
    X: 0,
    O: 0,
    ties: 0
  };

  let soundEnabled = true;

  // ==========================================================================
  // 2. DOM ELEMENTS
  // ==========================================================================
  const cells = document.querySelectorAll('.cell');
  const gameBoard = document.getElementById('game-board');
  const strikeLine = document.getElementById('strike-line');
  const statusBanner = document.getElementById('status-banner');
  const statusIcon = document.getElementById('status-icon');
  const statusMessage = document.getElementById('status-message');

  const playerXCard = document.getElementById('player-x-card');
  const playerOCard = document.getElementById('player-o-card');
  const playerXBadge = document.getElementById('player-x-badge');
  const playerOBadge = document.getElementById('player-o-badge');

  const scoreXDisplay = document.getElementById('score-x');
  const scoreODisplay = document.getElementById('score-o');
  const scoreTiesDisplay = document.getElementById('score-ties');

  const resetRoundBtn = document.getElementById('reset-round-btn');
  const resetAllBtn = document.getElementById('reset-all-btn');
  const soundToggleBtn = document.getElementById('sound-toggle-btn');
  const soundOnIcon = document.getElementById('sound-on-icon');
  const soundOffIcon = document.getElementById('sound-off-icon');

  const rulesBtn = document.getElementById('rules-btn');
  const rulesModal = document.getElementById('rules-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const gotItBtn = document.getElementById('got-it-btn');

  const confettiCanvas = document.getElementById('confetti-canvas');

  // ==========================================================================
  // 3. SYNTHESIZED AUDIO ENGINE (Web Audio API)
  // ==========================================================================
  class SoundEngine {
    constructor() {
      this.ctx = null;
    }

    init() {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    playMoveSound(player) {
      if (!soundEnabled) return;
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = player === 'X' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(player === 'X' ? 440 : 330, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(player === 'X' ? 880 : 660, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    }

    playWinSound() {
      if (!soundEnabled) return;
      this.init();
      if (!this.ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.09);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.09 + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(this.ctx.currentTime + idx * 0.09);
        osc.stop(this.ctx.currentTime + idx * 0.09 + 0.25);
      });
    }

    playDrawSound() {
      if (!soundEnabled) return;
      this.init();
      if (!this.ctx) return;

      const notes = [440, 392, 349.23];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.12);

        gain.gain.setValueAtTime(0.12, this.ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.12 + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(this.ctx.currentTime + idx * 0.12);
        osc.stop(this.ctx.currentTime + idx * 0.12 + 0.2);
      });
    }

    playButtonSound() {
      if (!soundEnabled) return;
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    }
  }

  const soundEngine = new SoundEngine();

  // ==========================================================================
  // 4. CONFETTI PARTICLE SYSTEM
  // ==========================================================================
  class ConfettiEffect {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.particles = [];
      this.animationFrame = null;
      this.resize();
      window.addEventListener('resize', () => this.resize());
    }

    resize() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }

    launch(winner) {
      this.cancel();
      this.particles = [];
      const particleCount = 80;
      const colors = winner === 'X' 
        ? ['#00f2fe', '#4facfe', '#ffffff', '#38ef7d']
        : ['#ff2a6d', '#ff6584', '#ffffff', '#fbc531'];

      for (let i = 0; i < particleCount; i++) {
        this.particles.push({
          x: this.canvas.width / 2 + (Math.random() * 200 - 100),
          y: this.canvas.height / 2 + (Math.random() * 50 - 25),
          radius: Math.random() * 5 + 3,
          color: colors[Math.floor(Math.random() * colors.length)],
          vx: (Math.random() - 0.5) * 16,
          vy: (Math.random() - 0.8) * 18,
          gravity: 0.45,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 12,
          opacity: 1
        });
      }

      this.animate();
    }

    animate() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      let hasActiveParticles = false;

      for (let p of this.particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.98;
        p.rotation += p.rotationSpeed;
        p.opacity -= 0.012;

        if (p.opacity > 0 && p.y < this.canvas.height) {
          hasActiveParticles = true;
          this.ctx.save();
          this.ctx.translate(p.x, p.y);
          this.ctx.rotate((p.rotation * Math.PI) / 180);
          this.ctx.fillStyle = p.color;
          this.ctx.globalAlpha = Math.max(0, p.opacity);
          this.ctx.fillRect(-p.radius, -p.radius, p.radius * 2, p.radius * 2);
          this.ctx.restore();
        }
      }

      if (hasActiveParticles) {
        this.animationFrame = requestAnimationFrame(() => this.animate());
      } else {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }

    cancel() {
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
      }
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  const confetti = new ConfettiEffect(confettiCanvas);

  // ==========================================================================
  // 5. STORAGE & INITIALIZATION
  // ==========================================================================
  function loadPersistedState() {
    try {
      const savedScores = localStorage.getItem('tictactoe_scores');
      if (savedScores) {
        scores = JSON.parse(savedScores);
      }
      const savedSound = localStorage.getItem('tictactoe_sound');
      if (savedSound !== null) {
        soundEnabled = savedSound === 'true';
      }
    } catch (e) {
      console.warn('LocalStorage not available, running in-memory only.', e);
    }

    updateScoreDisplay(false);
    updateSoundUI();
  }

  function savePersistedScores() {
    try {
      localStorage.setItem('tictactoe_scores', JSON.stringify(scores));
    } catch (e) {
      // Ignore storage write errors
    }
  }

  function savePersistedSound() {
    try {
      localStorage.setItem('tictactoe_sound', String(soundEnabled));
    } catch (e) {
      // Ignore storage write errors
    }
  }

  // ==========================================================================
  // 6. UI UPDATE HELPERS
  // ==========================================================================
  function updateTurnUI() {
    gameBoard.setAttribute('data-current-turn', currentPlayer);

    if (currentPlayer === 'X') {
      playerXCard.classList.add('active');
      playerOCard.classList.remove('active');
      playerXBadge.textContent = 'Current Turn';
      playerOBadge.textContent = 'Waiting';

      statusBanner.className = 'status-banner turn-x';
      statusIcon.textContent = '⚡';
      statusMessage.textContent = "Player X's Turn to Move";
    } else {
      playerOCard.classList.add('active');
      playerXCard.classList.remove('active');
      playerOBadge.textContent = 'Current Turn';
      playerXBadge.textContent = 'Waiting';

      statusBanner.className = 'status-banner turn-o';
      statusIcon.textContent = '✨';
      statusMessage.textContent = "Player O's Turn to Move";
    }
  }

  function updateScoreDisplay(animate = true) {
    scoreXDisplay.textContent = scores.X;
    scoreODisplay.textContent = scores.O;
    scoreTiesDisplay.textContent = scores.ties;

    if (animate) {
      scoreXDisplay.classList.remove('score-bump');
      scoreODisplay.classList.remove('score-bump');
      scoreTiesDisplay.classList.remove('score-bump');
      void scoreXDisplay.offsetWidth; // Force reflow
      if (isGameActive === false) {
        if (currentPlayer === 'X') scoreXDisplay.classList.add('score-bump');
        else if (currentPlayer === 'O') scoreODisplay.classList.add('score-bump');
      }
    }
  }

  function updateSoundUI() {
    if (soundEnabled) {
      soundOnIcon.classList.remove('hidden');
      soundOffIcon.classList.add('hidden');
      soundToggleBtn.setAttribute('aria-label', 'Sound Effects Enabled (Click to Mute)');
    } else {
      soundOnIcon.classList.add('hidden');
      soundOffIcon.classList.remove('hidden');
      soundToggleBtn.setAttribute('aria-label', 'Sound Effects Muted (Click to Enable)');
    }
  }

  // ==========================================================================
  // 7. CORE GAME LOGIC
  // ==========================================================================

  /**
   * Handle user clicking/triggering a cell
   * @param {number} index - Index of the board cell (0-8)
   */
  function handleCellAction(index) {
    // 1. Guard against inactive game or already occupied cell
    if (!isGameActive || boardState[index] !== '') {
      return;
    }

    // 2. Update board data model
    boardState[index] = currentPlayer;
    moveCount++;

    // 3. Render symbol in the DOM
    const targetCell = cells[index];
    targetCell.innerHTML = currentPlayer === 'X' ? SVG_X : SVG_O;
    targetCell.classList.add('occupied');
    targetCell.classList.add(currentPlayer === 'X' ? 'cell-x' : 'cell-o');
    targetCell.setAttribute('aria-label', `Cell ${index + 1} marked by Player ${currentPlayer}`);
    targetCell.setAttribute('disabled', 'true');

    // 4. Play audio feedback
    soundEngine.playMoveSound(currentPlayer);

    // 5. Evaluate game state
    const winResult = checkWin();
    if (winResult) {
      handleWin(winResult);
      return;
    }

    if (checkDraw()) {
      handleDraw();
      return;
    }

    // 6. Switch turn to next player
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    updateTurnUI();
  }

  /**
   * Evaluates all 8 winning combinations
   * @returns {Object|null} Matching combination info or null
   */
  function checkWin() {
    for (const winCombo of WINNING_COMBINATIONS) {
      const [a, b, c] = winCombo.combo;
      if (
        boardState[a] !== '' &&
        boardState[a] === boardState[b] &&
        boardState[a] === boardState[c]
      ) {
        return {
          winner: boardState[a],
          combo: winCombo.combo,
          strikeClass: winCombo.class
        };
      }
    }
    return null;
  }

  /**
   * Evaluates if board is fully filled without winner
   * @returns {boolean}
   */
  function checkDraw() {
    return moveCount === 9 || boardState.every(cell => cell !== '');
  }

  /**
   * Handles Player Win state
   */
  function handleWin(winResult) {
    isGameActive = false;
    const { winner, combo, strikeClass } = winResult;

    // Increment win count
    scores[winner]++;
    savePersistedScores();
    updateScoreDisplay(true);

    // Lock board
    gameBoard.classList.add('game-locked');

    // Highlight winning cells
    combo.forEach(idx => {
      cells[idx].classList.add('winning-cell');
    });

    // Display strike-through line
    strikeLine.className = `strike-line ${strikeClass} strike-${winner.toLowerCase()}`;

    // Update Status Banner
    statusBanner.className = `status-banner winner-banner winner-${winner.toLowerCase()}`;
    statusIcon.textContent = '🏆';
    statusMessage.textContent = `Player ${winner} Claims Victory!`;

    // Visual card state
    if (winner === 'X') {
      playerXCard.classList.add('active');
      playerOCard.classList.remove('active');
      playerXBadge.textContent = 'Winner! 🎉';
      playerOBadge.textContent = 'Defeated';
    } else {
      playerOCard.classList.add('active');
      playerXCard.classList.remove('active');
      playerOBadge.textContent = 'Winner! 🎉';
      playerXBadge.textContent = 'Defeated';
    }

    // Sound and Confetti
    soundEngine.playWinSound();
    confetti.launch(winner);
  }

  /**
   * Handles Draw (Stalemate) state
   */
  function handleDraw() {
    isGameActive = false;
    scores.ties++;
    savePersistedScores();
    updateScoreDisplay(true);

    gameBoard.classList.add('game-locked');

    // Update status banner
    statusBanner.className = 'status-banner draw-banner';
    statusIcon.textContent = '🤝';
    statusMessage.textContent = "It's a Stalemate (Draw)!";

    playerXBadge.textContent = 'Draw';
    playerOBadge.textContent = 'Draw';
    playerXCard.classList.remove('active');
    playerOCard.classList.remove('active');

    soundEngine.playDrawSound();
  }

  /**
   * Starts a fresh round while preserving existing match scores
   */
  function resetRound() {
    boardState = ['', '', '', '', '', '', '', '', ''];
    currentPlayer = 'X';
    isGameActive = true;
    moveCount = 0;

    // Reset visual board
    gameBoard.classList.remove('game-locked');
    strikeLine.className = 'strike-line hidden';
    confetti.cancel();

    cells.forEach((cell, idx) => {
      cell.innerHTML = '';
      cell.className = 'cell';
      cell.removeAttribute('disabled');
      cell.setAttribute('aria-label', `Cell ${idx + 1}, Row ${Math.floor(idx / 3) + 1} Column ${(idx % 3) + 1}`);
    });

    updateTurnUI();
    soundEngine.playButtonSound();
  }

  /**
   * Completely resets both the board and the scoreboard history
   */
  function resetAllScores() {
    scores = { X: 0, O: 0, ties: 0 };
    savePersistedScores();
    updateScoreDisplay(false);
    resetRound();
  }

  // ==========================================================================
  // 8. EVENT LISTENERS & KEYBOARD CONTROLS
  // ==========================================================================

  // Board Cell Clicks
  cells.forEach(cell => {
    cell.addEventListener('click', (e) => {
      const index = parseInt(cell.getAttribute('data-cell-index'), 10);
      handleCellAction(index);
    });
  });

  // Action Buttons
  resetRoundBtn.addEventListener('click', () => {
    resetRound();
  });

  resetAllBtn.addEventListener('click', () => {
    if (scores.X > 0 || scores.O > 0 || scores.ties > 0) {
      const confirmed = window.confirm('Are you sure you want to reset all match scores to zero?');
      if (!confirmed) return;
    }
    resetAllScores();
  });

  // Sound Toggle
  soundToggleBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    savePersistedSound();
    updateSoundUI();
    if (soundEnabled) soundEngine.playButtonSound();
  });

  // Modal Rules Triggers
  function openRules() {
    rulesModal.classList.remove('hidden');
    soundEngine.playButtonSound();
    gotItBtn.focus();
  }

  function closeRules() {
    rulesModal.classList.add('hidden');
    soundEngine.playButtonSound();
  }

  rulesBtn.addEventListener('click', openRules);
  closeModalBtn.addEventListener('click', closeRules);
  gotItBtn.addEventListener('click', closeRules);

  rulesModal.addEventListener('click', (e) => {
    if (e.target === rulesModal) closeRules();
  });

  // Global Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    // 1. Close Modal on Escape
    if (e.key === 'Escape' && !rulesModal.classList.contains('hidden')) {
      closeRules();
      return;
    }

    // If modal is currently open, don't trigger board keys
    if (!rulesModal.classList.contains('hidden')) return;

    // 2. Restart Round Shortcut (Key 'R' / 'r')
    if (e.key === 'r' || e.key === 'R') {
      resetRound();
      return;
    }

    // 3. Number Keys 1-9 (Maps 1-9 to Cells 0-8)
    if (e.key >= '1' && e.key <= '9') {
      const cellIndex = parseInt(e.key, 10) - 1;
      if (cellIndex >= 0 && cellIndex < 9) {
        handleCellAction(cellIndex);
      }
    }
  });

  // Keyboard navigation within the 3x3 grid (Arrow keys)
  cells.forEach((cell, idx) => {
    cell.addEventListener('keydown', (e) => {
      let targetIdx = idx;
      switch (e.key) {
        case 'ArrowRight':
          if (idx % 3 < 2) targetIdx = idx + 1;
          break;
        case 'ArrowLeft':
          if (idx % 3 > 0) targetIdx = idx - 1;
          break;
        case 'ArrowDown':
          if (idx < 6) targetIdx = idx + 3;
          break;
        case 'ArrowUp':
          if (idx > 2) targetIdx = idx - 3;
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          handleCellAction(idx);
          return;
        default:
          return;
      }
      if (targetIdx !== idx && cells[targetIdx]) {
        e.preventDefault();
        cells[targetIdx].focus();
      }
    });
  });

  // ==========================================================================
  // 9. BOOTSTRAP APP
  // ==========================================================================
  loadPersistedState();
  updateTurnUI();
});
