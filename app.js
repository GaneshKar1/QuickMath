/* ==========================================================================
   QUICKMATH GAME CONTROLLER & MATHEMATICS ENGINE
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // --- APPLICATION STATE ---
  const state = {
    // Configurations
    selectedOperations: ['arithmetic', 'multiplication'],
    answerMode: 'multiple-choice',
    timeLimit: 8, // seconds (null for no timer)
    
    // Live Stats
    score: 0,
    streak: 0,
    totalAnswered: 0,
    totalCorrect: 0,
    
    // Personal Bests (LocalStorage)
    highScore: 0,
    maxStreak: 0,
    
    // Game Loop Variables
    isPlaying: false,
    currentProblem: null,
    timerInterval: null,
    timerStart: null,
    timerDurationMs: 8000,
    isInputLocked: false,
    
    // Review Session Data
    lastIncorrectQuestion: null
  };

  // --- DOM ELEMENT SELECTORS ---
  // Screens
  const menuScreen = document.getElementById('menu-screen');
  const gameScreen = document.getElementById('game-screen');
  const summaryScreen = document.getElementById('summary-screen');

  // Configurations
  const optArithmetic = document.getElementById('opt-arithmetic');
  const optMultiplication = document.getElementById('opt-multiplication');
  const labelArithmetic = document.getElementById('label-arithmetic');
  const labelMultiplication = document.getElementById('label-multiplication');
  const configError = document.getElementById('config-error');
  const answerModeRadios = document.getElementsByName('answer-mode');
  const timeLimitRadios = document.getElementsByName('time-limit');

  // Menu Buttons & Stats
  const startBtn = document.getElementById('start-btn');
  const exitBtn = document.getElementById('exit-btn');
  const bestScoreVal = document.getElementById('best-score');
  const bestStreakVal = document.getElementById('best-streak');

  // HUD
  const quitBtn = document.getElementById('quit-btn');
  const hudScore = document.getElementById('hud-score');
  const hudStreak = document.getElementById('hud-streak');
  const streakIndicator = document.getElementById('streak-indicator');
  const timerContainer = document.getElementById('timer-container');
  const timerBar = document.getElementById('timer-bar');

  // Question Card
  const questionCard = document.getElementById('question-card');
  const questionText = document.getElementById('question-text');

  // Interactive Inputs
  const mcContainer = document.getElementById('mc-container');
  const choiceButtons = document.querySelectorAll('.choice-btn');
  const fibContainer = document.getElementById('fib-container');
  const fibForm = document.getElementById('fib-form');
  const fibInput = document.getElementById('fib-input');

  // Summary Screen Elements
  const summaryReason = document.getElementById('summary-reason');
  const finalScore = document.getElementById('final-score');
  const finalStreak = document.getElementById('final-streak');
  const finalAccuracy = document.getElementById('final-accuracy');
  const missedReviewContainer = document.getElementById('missed-review-container');
  const reviewQuestion = document.getElementById('review-question');
  const reviewUserAnswer = document.getElementById('review-user-answer');
  const reviewCorrectAnswer = document.getElementById('review-correct-answer');
  const restartBtn = document.getElementById('restart-btn');
  const menuBtn = document.getElementById('menu-btn');

  // --- INITIALIZATION ---
  initApp();

  function initApp() {
    loadLocalStats();
    setupEventListeners();
    validateConfig();
  }

  // --- LOCAL STORAGE BINDINGS ---
  function loadLocalStats() {
    state.highScore = parseInt(localStorage.getItem('quickmath_high_score')) || 0;
    state.maxStreak = parseInt(localStorage.getItem('quickmath_max_streak')) || 0;
    
    bestScoreVal.textContent = state.highScore;
    bestStreakVal.textContent = state.maxStreak;
  }

  function saveLocalStats() {
    let newBest = false;
    if (state.score > state.highScore) {
      state.highScore = state.score;
      localStorage.setItem('quickmath_high_score', state.highScore);
      newBest = true;
    }
    if (state.streak > state.maxStreak) {
      state.maxStreak = state.streak;
      localStorage.setItem('quickmath_max_streak', state.maxStreak);
      newBest = true;
    }
    
    // Refresh stats layout
    bestScoreVal.textContent = state.highScore;
    bestStreakVal.textContent = state.maxStreak;
    return newBest;
  }

  // --- EVENT HANDLERS SETUP ---
  function setupEventListeners() {
    // Checkbox focus validations
    [optArithmetic, optMultiplication].forEach(cb => {
      cb.addEventListener('change', () => {
        validateConfig();
      });
    });

    // Handle menu action buttons
    startBtn.addEventListener('click', () => {
      if (validateConfig()) {
        startGame();
      }
    });

    exitBtn.addEventListener('click', () => {
      // Return app to clear/blank splash state
      menuScreen.classList.remove('active');
      gameScreen.classList.remove('active');
      summaryScreen.classList.remove('active');
      
      // Inject a sleek minimalist splash overlay that resets the app context
      const splash = document.createElement('div');
      splash.className = 'splash-exit-screen';
      splash.innerHTML = `
        <div class="splash-inner">
          <svg class="splash-icon animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10"/>
          </svg>
          <h2>Session Terminated</h2>
          <p>QuickMath has closed successfully.</p>
          <button id="reopen-app" class="btn btn-primary">Launch Trainer</button>
        </div>
      `;
      document.body.appendChild(splash);
      
      document.getElementById('reopen-app').addEventListener('click', () => {
        document.body.removeChild(splash);
        menuScreen.classList.add('active');
        loadLocalStats();
      });
    });

    // In-game Exit Button
    quitBtn.addEventListener('click', () => {
      endGame(true); // Terminate by choice
    });

    // Multiple Choice selections
    choiceButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (state.isInputLocked) return;
        const selectedVal = parseFloat(btn.querySelector('.choice-value').textContent);
        handleAnswerSubmission(selectedVal, btn);
      });
    });

    // Fill-in-the-blank submission
    fibForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (state.isInputLocked) return;
      
      const userValRaw = fibInput.value.trim();
      if (userValRaw === "") return;
      
      const userVal = parseFloat(userValRaw);
      handleAnswerSubmission(userVal, null);
    });

    // Summary buttons
    restartBtn.addEventListener('click', () => {
      startGame();
    });

    menuBtn.addEventListener('click', () => {
      showScreen(menuScreen);
      loadLocalStats();
    });

    // Keyboard Shortcuts mapping (Optiver & Akuna pro styling)
    document.addEventListener('keydown', (e) => {
      // Escape key exits gameplay immediately
      if (e.key === 'Escape' && state.isPlaying) {
        endGame(true);
        return;
      }

      // If active screen is summary, Space/Enter plays again
      if (summaryScreen.classList.contains('active')) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          startGame();
          return;
        }
      }

      // Key bindings (1, 2, 3, 4) for Multiple Choice Mode
      if (state.isPlaying && state.answerMode === 'multiple-choice' && !state.isInputLocked) {
        if (['1', '2', '3', '4'].includes(e.key)) {
          const index = parseInt(e.key) - 1;
          const targetBtn = choiceButtons[index];
          if (targetBtn) {
            targetBtn.click();
            targetBtn.classList.add('active-keypress');
            setTimeout(() => targetBtn.classList.remove('active-keypress'), 150);
          }
        }
      }
    });
  }

  // --- CONFIG VALIDATION ---
  function validateConfig() {
    const isArithmetic = optArithmetic.checked;
    const isMultiplication = optMultiplication.checked;
    
    if (!isArithmetic && !isMultiplication) {
      configError.classList.remove('hidden');
      startBtn.disabled = true;
      startBtn.style.opacity = '0.5';
      startBtn.style.cursor = 'not-allowed';
      return false;
    } else {
      configError.classList.add('hidden');
      startBtn.disabled = false;
      startBtn.style.opacity = '1';
      startBtn.style.cursor = 'pointer';
      return true;
    }
  }

  // --- SCREEN ROUTER NAVIGATION ---
  function showScreen(targetScreen) {
    [menuScreen, gameScreen, summaryScreen].forEach(screen => {
      screen.classList.remove('active');
    });
    targetScreen.classList.add('active');
  }

  // --- GAMEPLAY SESSION CONTROLLER ---
  function startGame() {
    // 1. Read parameters
    state.selectedOperations = [];
    if (optArithmetic.checked) state.selectedOperations.push('arithmetic');
    if (optMultiplication.checked) state.selectedOperations.push('multiplication');

    // Read Input Mode
    for (let radio of answerModeRadios) {
      if (radio.checked) {
        state.answerMode = radio.value;
        break;
      }
    }

    // Read Timer Config
    state.timeLimit = null;
    for (let radio of timeLimitRadios) {
      if (radio.checked) {
        const val = radio.value;
        state.timeLimit = val === 'none' ? null : parseInt(val);
        break;
      }
    }

    // 2. Initialize Game variables
    state.isPlaying = true;
    state.score = 0;
    state.streak = 0;
    state.totalAnswered = 0;
    state.totalCorrect = 0;
    state.isInputLocked = false;
    state.lastIncorrectQuestion = null;

    // Reset HUD
    hudScore.textContent = '00';
    hudStreak.textContent = '0';
    streakIndicator.classList.remove('has-streak');
    
    // Toggle active interface options
    if (state.answerMode === 'multiple-choice') {
      mcContainer.classList.add('active');
      fibContainer.classList.remove('active');
    } else {
      mcContainer.classList.remove('active');
      fibContainer.classList.add('active');
      fibInput.value = '';
    }

    if (state.timeLimit) {
      timerContainer.classList.add('active');
      state.timerDurationMs = state.timeLimit * 1000;
    } else {
      timerContainer.classList.remove('active');
    }

    // Move views
    showScreen(gameScreen);

    // 3. Generate initial question
    nextQuestion();
  }

  function nextQuestion() {
    state.isInputLocked = false;
    
    // Clear inputs & classes
    fibInput.value = '';
    choiceButtons.forEach(btn => {
      btn.className = 'choice-btn';
    });
    questionCard.className = 'question-container';

    // Generate math puzzle
    const opType = state.selectedOperations[Math.floor(Math.random() * state.selectedOperations.length)];
    state.currentProblem = generateMathProblem(opType);
    
    // Render question
    questionText.textContent = state.currentProblem.formattedExpression;

    // Render interactive answers
    if (state.answerMode === 'multiple-choice') {
      // Load and shuffle choices
      const shuffledOptions = [...state.currentProblem.distractors];
      shuffledOptions.push(state.currentProblem.correctAnswer);
      shuffleArray(shuffledOptions);

      choiceButtons.forEach((btn, index) => {
        btn.querySelector('.choice-value').textContent = formatVal(shuffledOptions[index]);
      });
    } else {
      // Focus the blank field immediately for rapid mental inputs
      setTimeout(() => {
        fibInput.focus();
      }, 50);
    }

    // Launch countdown timer
    if (state.timeLimit) {
      startCountdownTimer();
    }
  }

  // --- MATH PUZZLE ENGINE ---
  function generateMathProblem(opType) {
    let num1, num2, operator, correctAnswer, formattedExpression;
    
    if (opType === 'arithmetic') {
      // Sub-type choices: +, -, or /
      const subOps = ['+', '-', '/'];
      const chosenOp = subOps[Math.floor(Math.random() * subOps.length)];
      
      if (chosenOp === '+') {
        operator = '+';
        // 70% double digit, 30% triple digit sums
        if (Math.random() < 0.7) {
          num1 = getRandomInt(15, 99);
          num2 = getRandomInt(15, 99);
        } else {
          num1 = getRandomInt(100, 999);
          num2 = getRandomInt(100, 999);
        }
        correctAnswer = num1 + num2;
        formattedExpression = `${num1} + ${num2}`;
      } else if (chosenOp === '-') {
        operator = '-';
        // 70% double digit, 30% triple digit differences
        if (Math.random() < 0.7) {
          num1 = getRandomInt(15, 99);
          num2 = getRandomInt(12, num1 - 2); // Avoid negative results
        } else {
          num1 = getRandomInt(100, 999);
          num2 = getRandomInt(15, num1 - 5);
        }
        correctAnswer = num1 - num2;
        formattedExpression = `${num1} - ${num2}`;
      } else {
        operator = '/';
        // Divisors optimized for clean single decimals or clean integers
        const cleanDivisors = [2, 3, 4, 5, 8, 10];
        num2 = cleanDivisors[Math.floor(Math.random() * cleanDivisors.length)];
        
        // Pick integer quotient
        const q = getRandomInt(3, 45);
        
        // 50% chance clean whole number, 50% chance decimal (if applicable)
        if (Math.random() < 0.5 || [3, 8].includes(num2)) {
          // Division with integer result
          num1 = q * num2;
          correctAnswer = q;
        } else {
          // Divisors with clean single decimals
          let fraction = 0.5;
          if (num2 === 5) {
            fraction = [0.2, 0.4, 0.6, 0.8][Math.floor(Math.random() * 4)];
          } else if (num2 === 10) {
            fraction = getRandomInt(1, 9) / 10;
          } else if (num2 === 4) {
            // allows .5 only to keep exactly one decimal
            fraction = 0.5;
          }
          
          correctAnswer = Math.round((q + fraction) * 10) / 10;
          num1 = Math.round((q + fraction) * num2 * 10) / 10;
        }
        formattedExpression = `${num1} ÷ ${num2}`;
      }
    } else {
      // Speed Double-Digit Multiplication
      operator = '×';
      num1 = getRandomInt(12, 99);
      num2 = getRandomInt(12, 99);
      
      // Quant practice standard optimization: avoid multiplying by clean multiples of 10
      while (num1 % 10 === 0) num1 = getRandomInt(12, 99);
      while (num2 % 10 === 0) num2 = getRandomInt(12, 99);
      
      correctAnswer = num1 * num2;
      formattedExpression = `${num1} × ${num2}`;
    }

    // Build the Plausible Distractors Matrix
    const distractors = generateDistractors(correctAnswer, num1, num2, operator);

    return {
      num1,
      num2,
      operator,
      correctAnswer,
      formattedExpression,
      distractors
    };
  }

  function generateDistractors(ans, n1, n2, op) {
    const candidates = new Set();
    
    // Strategy 1: Off by 10 and 100
    candidates.add(ans + 10);
    candidates.add(ans - 10);
    candidates.add(ans + 100);
    candidates.add(ans - 100);

    // Strategy 2: Unit digits swap / carries error
    if (ans > 15) {
      candidates.add(ans + 2);
      candidates.add(ans - 2);
      candidates.add(ans + 4);
      candidates.add(ans - 4);
    }

    // Strategy 3: Quant close multiplier mistakes (Off-by-1 multipliers)
    if (op === '×') {
      candidates.add(ans + n1);
      candidates.add(ans - n1);
      candidates.add(ans + n2);
      candidates.add(ans - n2);
    }
    
    // Strategy 4: Digit transpose
    const ansStr = ans.toString();
    if (ansStr.length >= 2) {
      // Swap units and tens
      const digits = ansStr.split('');
      const len = digits.length;
      const temp = digits[len - 1];
      digits[len - 1] = digits[len - 2];
      digits[len - 2] = temp;
      const transposed = parseFloat(digits.join(''));
      candidates.add(transposed);
    }

    // Filter to valid distinct positive alternatives
    const validPlausibleList = Array.from(candidates).filter(c => {
      return c !== ans && c > 0 && Number.isFinite(c);
    });

    // Shuffle and pick top 3
    shuffleArray(validPlausibleList);
    
    const finalDistractors = [];
    for (let i = 0; i < 3; i++) {
      if (validPlausibleList[i] !== undefined) {
        finalDistractors.push(validPlausibleList[i]);
      } else {
        // Fallback for extreme division numbers or small operands
        let fallback = ans;
        while (fallback === ans || fallback <= 0 || finalDistractors.includes(fallback)) {
          fallback = ans + getRandomInt(-5, 5);
        }
        finalDistractors.push(fallback);
      }
    }

    return finalDistractors;
  }

  // --- SUB-PIXEL PROGRESS TIMER BINDING ---
  function startCountdownTimer() {
    clearInterval(state.timerInterval);
    state.timerStart = performance.now();
    
    state.timerInterval = setInterval(() => {
      const elapsed = performance.now() - state.timerStart;
      const remaining = Math.max(0, state.timerDurationMs - elapsed);
      state.timeLeft = remaining / 1000;
      
      const percent = (remaining / state.timerDurationMs) * 100;
      timerBar.style.width = `${percent}%`;
      
      // Set indicator warning colors
      if (percent > 50) {
        timerBar.style.backgroundColor = 'var(--success-solid)';
      } else if (percent > 25) {
        timerBar.style.backgroundColor = 'hsl(35, 100%, 50%)'; // Orange alert
      } else {
        timerBar.style.backgroundColor = 'var(--error-solid)'; // Red alert
      }

      // Time Over condition
      if (remaining <= 0) {
        clearInterval(state.timerInterval);
        state.timeLeft = 0;
        handleTimeOut();
      }
    }, 16); // ~60fps smooth animation transitions
  }

  // --- SUBMISSION AND VALIDATION LOOPS ---
  function handleAnswerSubmission(userVal, choiceElement) {
    state.isInputLocked = true;
    clearInterval(state.timerInterval);
    state.totalAnswered += 1;

    const correctVal = state.currentProblem.correctAnswer;
    const isCorrect = Math.abs(userVal - correctVal) < 0.001; // Support safe floating decimal comparison

    if (isCorrect) {
      // --- CORRECT PATHWAY ---
      state.totalCorrect += 1;
      state.streak += 1;
      
      // Calculate optimized score: base points (10) + speed bonus (remaining time scale)
      let questionPoints = 10;
      if (state.timeLimit && state.timeLeft > 0) {
        const speedBonus = Math.max(1, Math.round(state.timeLeft * 2.5));
        questionPoints += speedBonus;
      }
      state.score += questionPoints;

      // HUD dynamic updates
      hudScore.textContent = state.score < 10 ? `0${state.score}` : state.score;
      hudStreak.textContent = state.streak;
      
      if (state.streak >= 3) {
        streakIndicator.classList.add('has-streak');
      }

      // Flash Green Correct Anim
      questionCard.classList.add('correct-flash');
      
      if (state.answerMode === 'multiple-choice' && choiceElement) {
        choiceElement.classList.add('correct');
      }

      // Wait brief fraction and generate next
      setTimeout(() => {
        nextQuestion();
      }, 400);

    } else {
      // --- INCORRECT PATHWAY ---
      state.lastIncorrectQuestion = {
        question: state.currentProblem.formattedExpression,
        userAnswer: userVal,
        correctAnswer: correctVal
      };

      // Play Error Red Shake
      questionCard.classList.add('error-shake');

      if (state.answerMode === 'multiple-choice') {
        if (choiceElement) choiceElement.classList.add('incorrect');
        // Highlight correct element in green for feedback
        choiceButtons.forEach(btn => {
          const btnVal = parseFloat(btn.querySelector('.choice-value').textContent);
          if (Math.abs(btnVal - correctVal) < 0.001) {
            btn.classList.add('correct');
          }
        });
      } else {
        // Flash input red
        fibInput.style.borderColor = 'var(--error-solid)';
        fibInput.style.boxShadow = '0 0 15px var(--error-glow)';
      }

      // Give 1.2s to visually inspect the error feedback before moving to Game Over
      setTimeout(() => {
        endGame(false, 'Calculation Error');
      }, 1200);
    }
  }

  function handleTimeOut() {
    state.isInputLocked = true;
    state.totalAnswered += 1;
    
    state.lastIncorrectQuestion = {
      question: state.currentProblem.formattedExpression,
      userAnswer: 'TIME OUT',
      correctAnswer: state.currentProblem.correctAnswer
    };

    questionCard.classList.add('error-shake');
    
    if (state.answerMode === 'multiple-choice') {
      choiceButtons.forEach(btn => {
        const btnVal = parseFloat(btn.querySelector('.choice-value').textContent);
        if (Math.abs(btnVal - state.currentProblem.correctAnswer) < 0.001) {
          btn.classList.add('correct');
        }
      });
    } else {
      fibInput.style.borderColor = 'var(--error-solid)';
      fibInput.placeholder = 'TIME EXPIRED';
    }

    setTimeout(() => {
      endGame(false, 'Time Expired');
    }, 1200);
  }

  // --- POST SESSION TERMINATION ROUTINES ---
  function endGame(isQuitByUser, reasonStr = 'Session Terminated') {
    state.isPlaying = false;
    clearInterval(state.timerInterval);

    if (isQuitByUser) {
      showScreen(menuScreen);
      loadLocalStats();
      return;
    }

    // Save PBs to LocalStorage
    const isNewBest = saveLocalStats();
    
    // Set up Game Over summary outputs
    summaryReason.textContent = isNewBest ? '⭐ New Personal Best! ⭐' : reasonStr;
    finalScore.textContent = state.score;
    finalStreak.textContent = state.streak;
    
    const accuracy = state.totalAnswered > 0 ? Math.round((state.totalCorrect / state.totalAnswered) * 100) : 0;
    finalAccuracy.textContent = `${accuracy}%`;

    // Render Missed Question Box
    if (state.lastIncorrectQuestion) {
      missedReviewContainer.classList.remove('hidden');
      reviewQuestion.textContent = state.lastIncorrectQuestion.question;
      reviewUserAnswer.textContent = state.lastIncorrectQuestion.userAnswer;
      reviewCorrectAnswer.textContent = formatVal(state.lastIncorrectQuestion.correctAnswer);
    } else {
      missedReviewContainer.classList.add('hidden');
    }

    // Render transition to summary dashboard screen
    showScreen(summaryScreen);
  }

  // --- MATH UTILITIES ---
  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  function formatVal(val) {
    // Format to 1 decimal place only if there is a fractional value
    return val % 1 === 0 ? val : Math.round(val * 10) / 10;
  }
});
