// Main Menu
const mainMenu = document.querySelector("[data-main-menu]");
const playerNameInput = document.querySelector("[data-player-name-input]");
const easyButton = document.querySelector("[data-easy-btn]");
const hardButton = document.querySelector("[data-hard-btn]");
const rulesButton = document.querySelector("[data-rules-btn]");
const startButton = document.querySelector("[data-start-btn]");

// Rules
const rules = document.querySelector("[data-rules]");
const rulesCloseBtn = document.querySelector("[data-rules-close-btn]");

// Leaderboard
const leaderboard = document.querySelector("[data-leaderboard]");
const leaderboardList = document.querySelector("[data-leaderboard-list]");
const leaderboardCloseBtn = document.querySelector(
  "[data-leaderboard-close-btn]"
);
const difficultyFilters = document.querySelectorAll(
  "[data-leaderboard-filter-btn]"
);
const leaderboardBtn = document.querySelector("[data-leaderboard-btn]");

// Levels
const levels = document.querySelector("[data-levels]");
const levelsCloseBtn = document.querySelector("[data-levels-close-btn]");
const levelsGrid = document.querySelector("[data-levels-grid]");
const randomLevelButton = document.querySelector("[data-random-level-btn]");

// Game
const gameWrapper = document.querySelector("[data-game-wrapper]");
const playerNameDisplay = document.querySelector("[data-player-name-display]");
const elapsedTimeDisplay = document.querySelector(
  "[data-elapsed-time-display]"
);
const gameBoard = document.querySelector("[data-game-board]");
const resetButton = document.querySelector("[data-reset-btn]");
const mainMenuBtn = document.querySelector("[data-main-menu-btn]");

export default {
  mainMenu,
  playerNameInput,
  easyButton,
  hardButton,
  rulesButton,
  startButton,
  gameWrapper,
  playerNameDisplay,
  elapsedTimeDisplay,
  gameBoard,
  resetButton,
  mainMenuBtn,
  rules,
  rulesCloseBtn,
  levels,
  levelsCloseBtn,
  levelsGrid,
  randomLevelButton,
  leaderboard,
  leaderboardList,
  leaderboardCloseBtn,
  difficultyFilters,
  leaderboardBtn,
};
