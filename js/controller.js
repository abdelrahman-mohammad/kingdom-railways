import elements from "./elements.js";
import data from "./data.js";
import { Attempt, GameBoard, Player, Tile } from "./model.js";

// === DOM Elements ===
const {
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
} = elements;

// === Game State ===
let {
  player,
  board,
  difficulty,
  time,
  timeInterval,
  currentAttempt,
  currentDifficulty,
  TILE_TYPES,
  LEVEL_NAMES,
  LEVEL_TEMPLATES,
} = data;

// === Initialization ===
export function loadOptions() {
  player = Player.from(
    JSON.parse(localStorage.getItem("player")) || new Player("")
  );
  playerNameInput.value = player.getName();
  updateCurrentPlayer(player);

  difficulty = parseInt(localStorage.getItem("difficulty") || 5);
  updateDifficulty(difficulty);

  if (player.getName().length > 0 && difficulty)
    startButton.removeAttribute("disabled");
}

// === Event Listeners ===
export function listenToEvents() {
  setupMenuEvents();
  setupGameEvents();
  setupLeaderboardEvents();
  setupControls();
}

// === Menu Event Handlers ===
function setupMenuEvents() {
  playerNameInput.addEventListener("input", handlePlayerNameInput);
  easyButton.addEventListener("click", () => updateDifficulty(5));
  hardButton.addEventListener("click", () => updateDifficulty(7));
  rulesButton.addEventListener("click", () => rules.classList.remove("hidden"));
  rulesCloseBtn.addEventListener("click", () => rules.classList.add("hidden"));
  startButton.addEventListener("click", showLevels);
  levelsCloseBtn.addEventListener("click", () =>
    levels.classList.add("hidden")
  );
  levelsGrid.addEventListener("click", (event) => handleLevelSelection(event));
  randomLevelButton.addEventListener("click", handleRandomLevelSelection);
}

function handlePlayerNameInput(event) {
  const value = event.target.value.trim();
  let newPlayer = new Player(value);
  updateCurrentPlayer(newPlayer);
  startButton.disabled = !player.getName().length;
}

function handleRandomLevelSelection() {
  const levelsData = LEVEL_NAMES[difficulty];
  const randomIndex = Math.floor(Math.random() * levelsData.length);
  const randomLevel = levelsData[randomIndex];
  startGame(randomLevel);
  levels.classList.add("hidden");
}

function showLevels() {
  levelsGrid.innerHTML = "";
  const levelsData = LEVEL_NAMES[difficulty];
  levelsData.forEach((levelName, index) => {
    const levelElement = document.createElement("div");
    levelElement.classList.add("level-card", "flex-column");
    levelElement.setAttribute("data-level", index + 1);

    const img = document.createElement("img");
    img.src = `./pics/levels/${difficulty === 5 ? "easy" : "hard"}/level${
      index + 1
    }.png`;
    img.alt = `Level ${index + 1}`;
    img.classList.add("level-card__image");

    const name = document.createElement("p");
    name.textContent = levelName;
    name.classList.add("level-card__name", "text-style-base");

    const bestTime = document.createElement("p");
    const bestTimeValue = player.getBestTime(levelName);
    const minutes = bestTimeValue
      ? Math.floor(bestTimeValue / 60)
          .toString()
          .padStart(2, "0")
      : "00";
    const seconds = bestTimeValue
      ? (bestTimeValue % 60).toString().padStart(2, "0")
      : "00";
    bestTime.textContent = `Best Time: ${minutes}:${seconds}`;
    bestTime.classList.add("level-card__time", "text-style-base");

    const status = document.createElement("p");
    status.textContent = player.hasCompletedLevel(levelName)
      ? "Completed"
      : "Not Complete";
    status.classList.add("level-card__status", "text-style-base");
    if (player.hasCompletedLevel(levelName))
      status.classList.add("level-card__status--completed");

    levelElement.appendChild(img);
    levelElement.appendChild(name);
    levelElement.appendChild(bestTime);
    levelElement.appendChild(status);

    levelsGrid.appendChild(levelElement);
  });

  levels.classList.remove("hidden");
}

function handleLevelSelection(event) {
  const levelElement = event.target.closest("[data-level]");
  if (!levelElement) return;

  const level = parseInt(levelElement.dataset.level);
  levels.classList.add("hidden");
  startGame(LEVEL_NAMES[difficulty][level - 1]);
}

// === Game Event Handlers ===
function setupGameEvents() {
  resetButton.addEventListener("click", handleReset);
  mainMenuBtn.addEventListener("click", handleMainMenu);
  gameBoard.addEventListener("contextmenu", handleContextMenu);
  gameBoard.addEventListener("game-complete", handleGameComplete);
}

function handleReset() {
  if (isKeybaordControl) return;

  clearInterval(timeInterval);
  time = 0;
  startTimer();

  gameBoard.classList.remove("completed");
  board.reset();
  board.render();

  if (currentAttempt) {
    const newAttempt = new Attempt(
      currentAttempt.levelName,
      time,
      currentAttempt.difficulty,
      board
    );
    player.addAttempt(newAttempt);
    currentAttempt = newAttempt;
  }

  player.save();
}

function handleMainMenu() {
  clearInterval(timeInterval);
  currentAttempt = null;
  mainMenu.classList.remove("hidden");
  gameWrapper.classList.add("hidden");
  player.save();
  document.title = "Main Menu | Railways";
}

function handleContextMenu(event) {
  if (!currentAttempt) return;
  event.preventDefault();
}

function handleGameComplete() {
  if (!currentAttempt) return;
  gameBoard.setAttribute("data-after", `Completed in ${time} seconds`);
  clearInterval(timeInterval);
  player.completeLevel(currentAttempt.levelName);
  currentAttempt.completed = true;
  player.save();
}

// === Leaderboard Event Handlers ===
function setupLeaderboardEvents() {
  leaderboardBtn.addEventListener("click", () => {
    leaderboard.classList.remove("hidden");
    mainMenu.classList.add("hidden");
    updateLeaderboard();
  });

  leaderboardCloseBtn.addEventListener("click", () => {
    leaderboard.classList.add("hidden");
    mainMenu.classList.remove("hidden");
  });

  difficultyFilters.forEach((button) => {
    button.addEventListener("click", () => {
      difficultyFilters.forEach((btn) => btn.removeAttribute("data-selected"));
      button.setAttribute("data-selected", "");
      currentDifficulty = button.dataset.filter;
      updateLeaderboard();
    });
  });
}

// === Controls Setup ===
let isKeybaordControl = false;
let isMouseDown = false;
let isMiddleMouseDown = false;

let drag = false;
let lastPlacedTile = null;
let updatedTilesIndices = [];
let hitInvalidTile = false;
let lastSelectedTile = null;

function setupControls() {
  document.addEventListener("keydown", handleKeyDown);
  gameBoard.addEventListener("mouseover", handleMouseOver);
  gameBoard.addEventListener("mousemove", handleMouseMove);
  gameBoard.addEventListener("mousedown", handleMouseDown);
  gameBoard.addEventListener("mouseup", handleMouseUp);
}

function handleKeyDown(event) {
  if (!currentAttempt) return;
  isKeybaordControl = true;

  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
    board.moveSelection(event.key);
    board.render();
    return;
  }

  const selectedTile = board.getSelectedTile();
  if (event.key === " ") selectedTile.cycle();
  else if (event.key === "Shift") selectedTile.rotate(90);
  else if (event.key === "Control") selectedTile.reset();
  board.render();
}

function handleMouseOver(event) {
  if (
    isKeybaordControl ||
    !currentAttempt ||
    !event.target.hasAttribute("data-col")
  )
    return;

  const previousSelected = gameBoard.querySelector("[data-tile-selected]");
  if (previousSelected) previousSelected.removeAttribute("data-tile-selected");

  const row = parseInt(event.target.dataset.row);
  const col = parseInt(event.target.dataset.col);
  const targetTile = event.target.closest("[data-tile]");
  targetTile.setAttribute("data-tile-selected", "");

  board.setSelectedTile(row, col);
}

function handleMouseMove() {
  drag = true;
  isKeybaordControl = false;

  const selectedTile = board.getSelectedTile();

  if (
    isMiddleMouseDown &&
    selectedTile.type !== TILE_TYPES.OASIS &&
    selectedTile.type !== TILE_TYPES.EMPTY
  ) {
    selectedTile.reset();
    selectedTile.render(board);
    return;
  }

  if (hitInvalidTile || !isMouseDown || !currentAttempt) return;

  if (
    updatedTilesIndices.includes(`${selectedTile.row}${selectedTile.col}`) ||
    selectedTile.type === TILE_TYPES.OASIS
  )
    return;

  if (!lastPlacedTile) {
    selectedTile.addRail();
    lastPlacedTile = selectedTile;
    updatedTilesIndices.push(`${selectedTile.row}${selectedTile.col}`);
    selectedTile.render(board);
    return;
  }

  const direction = selectedTile.directionToNeighbor(lastPlacedTile);
  if (!direction) return;
  if (
    selectedTile.canConnectFrom(direction) &&
    attemptTilesConnection(lastPlacedTile, selectedTile)
  ) {
    lastPlacedTile = selectedTile;
    updatedTilesIndices.push(`${selectedTile.row}${selectedTile.col}`);
    board.render();
  } else hitInvalidTile = true;
}

function handleMouseDown(event) {
  drag = false;
  if (event.button === 0) isMouseDown = true;
  if (event.button === 1) isMiddleMouseDown = true;
  updatedTilesIndices = [];
  lastPlacedTile = null;
  lastSelectedTile = board.getSelectedTile();
  event.preventDefault();
}

function handleMouseUp(event) {
  event.preventDefault();
  isMouseDown = false;
  isMiddleMouseDown = false;
  hitInvalidTile = false;

  board.checkTileConnections();
  const selectedTile = board.getSelectedTile();

  if (
    lastSelectedTile.row !== selectedTile.row ||
    lastSelectedTile.col !== selectedTile.col
  )
    return;

  if (event.button === 2) selectedTile.rotate(90);
  if (!drag && event.button === 0) selectedTile.cycle();
  if (!drag && event.button === 1) selectedTile.reset();

  board.render();
}

// === Timer Functions ===
function startTimer(initialTime = 0) {
  clearInterval(timeInterval);
  time = initialTime;
  updateTimeDisplay();

  timeInterval = setInterval(() => {
    time++;
    if (currentAttempt) {
      currentAttempt.time = time;
      currentAttempt.board = board;
      player.save();
    }
    updateTimeDisplay();
  }, 1000);
}

function updateTimeDisplay() {
  const minutes = Math.floor(time / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (time % 60).toString().padStart(2, "0");
  elapsedTimeDisplay.textContent = `${minutes}:${seconds}`;
}

// === Game State Management ===
function updateCurrentPlayer(value) {
  player = value;
  playerNameDisplay.textContent =
    player.getName().length > 10
      ? player.getName().slice(0, 10) + "..."
      : player.getName();
}

function updateDifficulty(value) {
  difficulty = value;
  if (difficulty === 5) {
    easyButton.setAttribute("data-selected", true);
    hardButton.removeAttribute("data-selected");
  } else {
    hardButton.setAttribute("data-selected", true);
    easyButton.removeAttribute("data-selected");
  }
  localStorage.setItem("difficulty", difficulty);
}

function startGame(levelName) {
  let attempt;
  const attempts = player.attempts.filter((a) => a.levelName === levelName);

  if (!attempts.length || attempts[attempts.length - 1].completed) {
    time = 0;
  }

  if (attempts.length > 0 && !attempts[attempts.length - 1].completed) {
    attempt = attempts[attempts.length - 1];
    board = GameBoard.from(attempt.board);
    time = attempt.time;
  } else {
    board = createGameBoard(levelName, difficulty);
    attempt = new Attempt(levelName, time, difficulty, board);
    player.addAttempt(attempt);
  }

  if (board && board.element) {
    gameBoard.classList.remove("completed");
    board.render();
    currentAttempt = attempt;
    startTimer(time);
    player.save();
    document.title = `${levelName} | Railways`;
    mainMenu.classList.add("hidden");
    gameWrapper.classList.remove("hidden");
  } else {
    console.error("Failed to initialize game board");
  }
}

function createGameBoard(levelName, difficulty) {
  let template = LEVEL_TEMPLATES[difficulty][levelName];
  return new GameBoard(gameBoard, difficulty, template);
}

function updateLeaderboard() {
  leaderboardList.innerHTML = "";
  const players = JSON.parse(localStorage.getItem("players")) || [];
  const difficultySize = currentDifficulty === "easy" ? 5 : 7;
  const levels = LEVEL_NAMES[difficultySize];

  levels.forEach((levelName) => {
    const levelScores = players
      .filter((player) => player.bestTimes && player.bestTimes[levelName])
      .map((player) => ({
        playerName: player.name,
        time: player.bestTimes[levelName],
        date:
          player.attempts.find(
            (attempt) => attempt.levelName === levelName && attempt.completed
          )?.date || new Date().toISOString(),
      }))
      .sort((a, b) => a.time - b.time)
      .slice(0, 5);

    const levelEntry = document.createElement("div");
    levelEntry.className = "leaderboard__level flex-column";

    const levelHeader = document.createElement("div");
    levelHeader.className = "leaderboard__level-name text-style-base";
    levelHeader.textContent = levelName;
    levelEntry.appendChild(levelHeader);

    levelScores.forEach((score, index) => {
      const scoreEntry = document.createElement("div");
      scoreEntry.className = "leaderboard__score flex-row";

      const rank = document.createElement("span");
      rank.className = "leaderboard__rank";
      rank.textContent = `${index + 1}.`;

      const player = document.createElement("span");
      player.className = "leaderboard__player";
      player.textContent = score.playerName;

      const time = document.createElement("span");
      time.className = "leaderboard__time";
      const minutes = Math.floor(score.time / 60)
        .toString()
        .padStart(2, "0");
      const seconds = (score.time % 60).toString().padStart(2, "0");
      time.textContent = `${minutes}:${seconds}`;

      const date = document.createElement("span");
      date.className = "leaderboard__date";
      date.textContent = new Date(score.date).toLocaleDateString();

      scoreEntry.appendChild(rank);
      scoreEntry.appendChild(player);
      scoreEntry.appendChild(time);
      scoreEntry.appendChild(date);
      levelEntry.appendChild(scoreEntry);
    });

    if (levelScores.length === 0) {
      const noScores = document.createElement("div");
      noScores.className = "leaderboard__score--empty text-style-base";
      noScores.textContent = "No scores yet";
      levelEntry.appendChild(noScores);
    }

    leaderboardList.appendChild(levelEntry);
  });
}

function attemptTilesConnection(lastTile, newTile) {
  const direction = lastTile.directionToNeighbor(newTile);
  const oppositeDirection = newTile.directionToNeighbor(lastTile);
  if (!direction || !oppositeDirection) return false;

  lastTile.connectFrom(direction);
  const lastTileTypeAndRotation = getTileTypeAndRotation(lastTile);
  if (!lastTileTypeAndRotation) return false;

  if (
    Tile.createBasic(
      lastTileTypeAndRotation.type || lastTile.type,
      lastTileTypeAndRotation.rotation
    ).canConnectFrom(direction)
  ) {
    lastTile.updateType(lastTileTypeAndRotation.type || lastTile.type);
    lastTile.setRotation(lastTileTypeAndRotation.rotation);

    newTile.connectFrom(oppositeDirection);
    const newTileTypeAndRotation = getTileTypeAndRotation(newTile);
    if (!newTileTypeAndRotation) return false;
    newTile.updateType(newTileTypeAndRotation.type || newTile.type);
    newTile.setRotation(newTileTypeAndRotation.rotation);
    return true;
  } else {
    lastTile.connections.pop();
    return false;
  }
}

function getTileTypeAndRotation(tile) {
  let type = null;
  let rotation = 0;
  if (tile.type === TILE_TYPES.BRIDGE || tile.type === TILE_TYPES.BRIDGE_RAIL)
    return { type: TILE_TYPES.BRIDGE_RAIL, rotation: tile.rotation };
  if (
    tile.type === TILE_TYPES.MOUNTAIN ||
    tile.type === TILE_TYPES.MOUNTAIN_RAIL
  )
    return { type: TILE_TYPES.MOUNTAIN_RAIL, rotation: tile.rotation };

  if (tile.connections.length > 2) {
    return;
  }

  if (tile.connections.length === 2) {
    if (
      tile.connections.includes("top") &&
      tile.connections.includes("bottom")
    ) {
      type = TILE_TYPES.STRAIGHT_RAIL;
    } else if (
      tile.connections.includes("left") &&
      tile.connections.includes("right")
    ) {
      type = TILE_TYPES.STRAIGHT_RAIL;
      rotation = 90;
    } else if (
      tile.connections.includes("bottom") &&
      tile.connections.includes("right")
    ) {
      type = TILE_TYPES.CURVE_RAIL;
    } else if (
      tile.connections.includes("bottom") &&
      tile.connections.includes("left")
    ) {
      type = TILE_TYPES.CURVE_RAIL;
      rotation = 90;
    } else if (
      tile.connections.includes("top") &&
      tile.connections.includes("left")
    ) {
      type = TILE_TYPES.CURVE_RAIL;
      rotation = 180;
    } else if (
      tile.connections.includes("top") &&
      tile.connections.includes("right")
    ) {
      type = TILE_TYPES.CURVE_RAIL;
      rotation = 270;
    }
  } else {
    if (tile.connections.includes("top")) {
      type = TILE_TYPES.STRAIGHT_RAIL;
    } else if (tile.connections.includes("right")) {
      type = TILE_TYPES.STRAIGHT_RAIL;
      rotation = 90;
    } else if (tile.connections.includes("bottom")) {
      type = TILE_TYPES.STRAIGHT_RAIL;
      rotation = 180;
    } else if (tile.connections.includes("left")) {
      type = TILE_TYPES.STRAIGHT_RAIL;
      rotation = 270;
    }
  }

  return { type, rotation };
}
