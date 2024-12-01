import data from "./data.js";

export class Tile {
  constructor(type, row, col, rotation = 0) {
    this.type = type;
    this.row = row;
    this.col = col;
    this.rotation = rotation;
    this.connections = [];
    this.element = this.createTileElement();
  }

  static createBasic(type, rotation = 0) {
    return new Tile(type, null, null, rotation);
  }

  createTileElement() {
    const div = document.createElement("div");
    div.className = "board__tile";
    div.setAttribute("data-tile", "");
    const img = document.createElement("img");
    img.className = "board__tile-image";
    img.src = this.getImagePath();
    img.dataset.row = this.row;
    img.dataset.col = this.col;
    img.dataset.rotation = this.rotation;
    img.style.transform = `rotate(${this.rotation}deg)`;
    div.appendChild(img);
    return div;
  }

  render(board, checkCompletion = true) {
    const img = this.element.querySelector("img");
    img.src = this.getImagePath();
    img.dataset.row = this.row;
    img.dataset.col = this.col;
    img.dataset.rotation = this.rotation;
    img.style.transform = `rotate(${this.rotation}deg)`;
    if (board.isSelectedTile(this.row, this.col))
      this.element.setAttribute("data-tile-selected", "");
    else this.element.removeAttribute("data-tile-selected");

    if (checkCompletion) {
      this.checkConnections(board);
      board.checkComplete();
    }
  }

  getImagePath() {
    return `./pics/tiles/${this.type}.png`;
  }

  setRotation(degrees) {
    this.rotation = degrees % 360;
  }

  updateType(type) {
    this.type = type;
  }

  cycle() {
    switch (this.type) {
      case data.TILE_TYPES.EMPTY:
        this.updateType(data.TILE_TYPES.STRAIGHT_RAIL);
        break;
      case data.TILE_TYPES.STRAIGHT_RAIL:
        this.updateType(data.TILE_TYPES.CURVE_RAIL);
        break;
      case data.TILE_TYPES.CURVE_RAIL:
        this.updateType(data.TILE_TYPES.STRAIGHT_RAIL);
        break;
      case data.TILE_TYPES.BRIDGE:
        this.updateType(data.TILE_TYPES.BRIDGE_RAIL);
        break;
      case data.TILE_TYPES.MOUNTAIN:
        this.updateType(data.TILE_TYPES.MOUNTAIN_RAIL);
        break;
    }
  }

  isComplete() {
    return this.type !== "oasis" ? this.connections.length === 2 : true;
  }

  checkConnections(board) {
    if (!this.type.includes("rail")) return;
    this.connections = [];
    let newConnections = data.TILE_CONNECTIONS[this.type][this.rotation];
    newConnections.forEach((connection) => {
      const neighborTile = this.getNeighborTile(connection, board);
      if (!neighborTile || !neighborTile.type.includes("rail")) return;

      if (
        this.getConnectionDirections().includes(connection) &&
        neighborTile
          .getConnectionDirections()
          .includes(neighborTile.directionToNeighbor(this))
      ) {
        this.connectFrom(connection);
      }
    });
  }

  getNeighborTile(direction, board) {
    let neighborRow = this.row;
    let neighborCol = this.col;

    switch (direction) {
      case "top":
        neighborRow--;
        break;
      case "right":
        neighborCol++;
        break;
      case "bottom":
        neighborRow++;
        break;
      case "left":
        neighborCol--;
        break;
    }

    if (
      neighborRow < 0 ||
      neighborRow >= board.size ||
      neighborCol < 0 ||
      neighborCol >= board.size
    )
      return null;

    return board.getTile(neighborRow, neighborCol);
  }

  rotate(degrees) {
    if (this.type !== "straight_rail" && this.type !== "curve_rail") return;
    this.connections = [];
    this.rotation = (this.rotation + degrees) % 360;
  }

  connectFrom(direction) {
    this.connections.push(direction);
  }

  // Returns true if the tile can connect from the given direction
  canConnectFrom(direction) {
    if (this.connections.length >= 2) return false;
    return this.openConnections().includes(direction);
  }

  // Returns the directions that are not connected to
  openConnections() {
    return data.TILE_CONNECTIONS[this.type][this.rotation].filter(
      (connection) => !this.connections.includes(connection)
    );
  }

  // Returns the directions that this tile can connect to
  getConnectionDirections() {
    return data.TILE_CONNECTIONS[this.type][this.rotation];
  }

  isNeighbor(tile) {
    return Math.abs(this.row - tile.row) + Math.abs(this.col - tile.col) === 1;
  }

  directionToNeighbor(tile) {
    if (!this.isNeighbor(tile)) return null;
    if (this.col - tile.col === -1) return "right";
    if (this.col - tile.col === 1) return "left";
    if (this.row - tile.row === -1) return "bottom";
    if (this.row - tile.row === 1) return "top";
  }

  addRail() {
    if (this.type === "empty") {
      this.type = "straight_rail";
    } else if (this.type === "straight_rail") {
      this.type = "curve_rail";
    } else if (this.type === "bridge") {
      this.type = "bridge_rail";
    } else if (this.type === "mountain") {
      this.type = "mountain_rail";
    }
  }

  reset() {
    this.connections = [];
    if (this.type === "straight_rail" || this.type === "curve_rail") {
      this.type = "empty";
    } else if (this.type === "bridge_rail") {
      this.type = "bridge";
    } else if (this.type === "mountain_rail") {
      this.type = "mountain";
    }
  }
}

export class GameBoard {
  constructor(element, difficulty, levelTemplate) {
    this.element = element;
    this.size = difficulty;
    this.tiles = this.initializeBoardFromTemplate(levelTemplate);
    this.selectedTileX = 0;
    this.selectedTileY = 0;
  }

  initializeBoardFromTemplate(template) {
    if (!this.element) {
      console.error("Game board element not found!");
      return [];
    }

    this.element.innerHTML = "";
    this.element.style.gridTemplateColumns = `repeat(${this.size}, 1fr)`;

    const board = [];
    for (let row = 0; row < this.size; row++) {
      board[row] = [];
      for (let col = 0; col < this.size; col++) {
        const templateTile = template[row][col];
        let tile;

        if (templateTile instanceof Tile) {
          tile = new Tile(templateTile.type, row, col, templateTile.rotation);
          tile.connections = [...templateTile.connections];
        } else {
          tile = new Tile(
            templateTile.type || templateTile,
            row,
            col,
            templateTile.rotation || 0
          );
          if (templateTile.connections) {
            tile.connections = [...templateTile.connections];
          }
        }

        board[row][col] = tile;
        tile.render(this, false);
        this.element.appendChild(tile.element);
      }
    }
    return board;
  }

  render() {
    this.tiles.forEach((row) => row.forEach((tile) => tile.render(this)));
  }

  getTile(row, col) {
    if (!this.tiles[row][col]) return null;
    return this.tiles[row][col];
  }

  moveSelection(direction) {
    switch (direction) {
      case "ArrowUp":
        this.selectedTileX = Math.max(0, this.selectedTileX - 1);
        break;
      case "ArrowDown":
        this.selectedTileX = Math.min(this.size - 1, this.selectedTileX + 1);
        break;
      case "ArrowLeft":
        this.selectedTileY = Math.max(0, this.selectedTileY - 1);
        break;
      case "ArrowRight":
        this.selectedTileY = Math.min(this.size - 1, this.selectedTileY + 1);
        break;
    }
  }

  isSelectedTile(row, col) {
    return this.selectedTileX === row && this.selectedTileY === col;
  }

  setSelectedTile(row, col) {
    this.selectedTileX = row;
    this.selectedTileY = col;
  }

  getSelectedTile() {
    return this.getTile(this.selectedTileX, this.selectedTileY);
  }

  isComplete() {
    return this.tiles.every((row) => row.every((tile) => tile.isComplete()));
  }

  checkComplete() {
    if (!this.isComplete()) return false;

    this.element.classList.add("completed");
    const event = new CustomEvent("game-complete");
    this.element.dispatchEvent(event);
    return true;
  }

  checkTileConnections() {
    this.tiles.forEach((row) =>
      row.forEach((tile) => tile.checkConnections(this))
    );
  }

  reset() {
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        this.tiles[row][col].reset();
      }
    }
  }

  toJSON() {
    return {
      size: this.size,
      tiles: this.tiles,
      selectedTileX: this.selectedTileX,
      selectedTileY: this.selectedTileY,
    };
  }

  static from(obj) {
    const element = document.querySelector("[data-game-board]");
    const gameBoard = new GameBoard(element, obj.size, obj.tiles);
    gameBoard.selectedTileX = obj.selectedTileX;
    gameBoard.selectedTileY = obj.selectedTileY;

    return gameBoard;
  }
}

export class Player {
  constructor(name) {
    this.name = name;
    this.attempts = [];
    this.completedLevels = [];
    this.bestTimes = {};
  }

  static from(obj) {
    let player = new Player(obj.name);
    player.attempts = obj.attempts;
    player.completedLevels = obj.completedLevels;
    player.bestTimes = obj.bestTimes || {};
    return player;
  }

  getBestTime(levelName) {
    return this.bestTimes[levelName] || null;
  }

  addAttempt(attempt) {
    this.attempts.push(attempt);
  }

  setLastAttemptTime(time) {
    if (this.attempts.length === 0) return;
    this.attempts[this.attempts.length - 1].time = time;
  }

  completeLevel(levelName) {
    const currentTime = this.attempts[this.attempts.length - 1].time;

    if (!this.bestTimes[levelName] || currentTime < this.bestTimes[levelName])
      this.bestTimes[levelName] = currentTime;

    if (!this.completedLevels.includes(levelName))
      this.completedLevels.push(levelName);
  }

  getName() {
    return this.name;
  }

  hasCompletedLevel(level) {
    return this.completedLevels.includes(level);
  }

  save() {
    localStorage.setItem("player", JSON.stringify(this));

    let players = JSON.parse(localStorage.getItem("players")) || [];
    if (!players.find((p) => p.name === this.name)) players.push(this);
    else players = players.map((p) => (p.name === this.name ? this : p));
    localStorage.setItem("players", JSON.stringify(players));
  }
}

export class Attempt {
  constructor(levelName, time, difficulty, board) {
    this.levelName = levelName;
    this.time = time;
    this.difficulty = difficulty;
    this.board = board;
    this.completed = false;
    this.date = new Date().toISOString();
  }

  toJSON() {
    return {
      levelName: this.levelName,
      time: this.time,
      difficulty: this.difficulty,
      board: this.board?.toJSON(),
      completed: this.completed,
      date: this.date,
    };
  }
}
