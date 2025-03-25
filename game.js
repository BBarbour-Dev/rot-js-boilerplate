import { Enemy } from './enemy.js';
import { Player } from './player.js';
import { updateUI } from './utils.js';

export const Game = {
  display: null,
  player: null,
  map: {},
  fov: null,
  fovCells: null,
  explored: new Set(),
  scheduler: null,
  enemies: [],
  isLooking: false,
  cursorX: null,
  cursorY: null,
  isAiming: false,
  aimX: null,
  aimY: null,
  victory: false,
  log: [],
  info: '',

  init() {
    this.display = new ROT.Display({
      width: 48,
      height: 24,
      fontSize: 16,
      forceSquareRatio: true
    });
    document
      .getElementById('game-container')
      .appendChild(this.display.getContainer());
    this.generateMap();
    this.createPlayer();
    this.scheduler = new ROT.Scheduler.Simple();
    this.scheduler.add(this.player, true);
    this.enemies.forEach((e) => this.scheduler.add(e, true));
    this.bindInput();
    this.updateFOV();
  },

  generateMap() {
    const digger = new ROT.Map.Digger(44, 22);

    const floorCells = [];

    this.map = {};

    const digCallback = (x, y, wall) => {
      const key = `${x},${y}`;
      this.map[key] = wall ? 'wall' : 'floor';
      if (!wall) floorCells.push({ x, y });
    };

    digger.create(digCallback.bind(this));

    for (let i = 0; i < 5; i++) {
      const index = Math.floor(ROT.RNG.getUniform() * floorCells.length);
      const { x, y } = floorCells.splice(index, 1)[0];
      if (i >= 3) {
        this.enemies.push(new Enemy(x, y, 5, 15));
      } else {
        this.enemies.push(new Enemy(x, y));
      }
    }
  },

  createPlayer() {
    // Find random starting position
    while (!this.player) {
      const x = Math.floor(ROT.RNG.getUniform() * 48);
      const y = Math.floor(ROT.RNG.getUniform() * 24);
      if (this.map[`${x},${y}`] === 'floor') {
        this.player = new Player(x, y);
      }
    }
  },

  updateFOV() {
    const lightPasses = (x, y) => {
      const key = `${x},${y}`;
      return this.map[key] === 'floor';
    };
    this.fov = new ROT.FOV.PreciseShadowcasting(lightPasses);
    this.fovCells = new Set();
    this.refreshDisplay();
  },

  refreshDisplay() {
    // Only draw visible cells
    this.display.clear();
    this.fov.compute(
      this.player.x,
      this.player.y,
      15,
      (x, y, r, visibility) => {
        const key = `${x},${y}`;
        if (this.map[key]) {
          this.explored.add(key);
          this.fovCells.add(key);
          let color = '#fff';
          if (visibility < 0.3) color = '#666';
          else if (visibility < 0.6) color = '#999';
          const ch = this.map[key] === 'wall' ? '#' : '.';
          this.display.draw(x, y, ch, color);
        }
      }
    );
    this.explored.forEach((key) => {
      const hasKey = this.fovCells.has(key);
      if (!hasKey) {
        const [x, y] = key.split(',').map(Number);
        const terrainChar = this.map[key] === 'wall' ? '#' : '.';
        this.display.draw(x, y, terrainChar, '#444444');
      }
    });
    this.enemies.forEach((enemy) => {
      const key = `${enemy.x},${enemy.y}`;
      const hasKey = this.fovCells.has(key);
      if (hasKey) {
        this.display.draw(enemy.x, enemy.y, 'e', 'red');
      }
    });
    // Draw player
    this.display.draw(this.player.x, this.player.y, '@', 'lime');
    if (this.isLooking) {
      this.display.drawOver(
        this.cursorX,
        this.cursorY,
        null,
        null,
        'cornflowerblue'
      );
    }
    if (this.isAiming) {
      const hasTarget = !!this.getEnemyAt(this.aimX, this.aimY);
      const color = hasTarget ? '#ff0000' : '#ffff00';
      this.display.drawOver(this.aimX, this.aimY, null, 'black', color);
    }
    updateUI();
  },

  bindInput() {
    window.addEventListener('keydown', (e) => {
      if (this.handleEvent(e.code)) {
        e.preventDefault();
      }
    });
  },

  logTileInfo(x, y) {
    const tile = this.map[`${x},${y}`];
    let message = '';
    const occupant = this.enemies.find(
      (enemy) => enemy.x === x && enemy.y === y
    );
    if (occupant) {
      message += `${occupant.name} / `;
    } else if (this.player.x === x && this.player.y === y)
      message += `You are here / `;
    if (tile === 'floor') message += 'Concrete Floor';
    else if (tile === 'wall') message += 'Bunker Wall';
    this.info = message;
  },

  handleEvent(keyCode) {
    if (this.player.frozen) return false;
    if (keyCode === 'KeyW') {
      this.addLog(':: You wait 1 turn.');
      this.player.endTurn();
      return true;
    }
    if (keyCode === 'KeyR' && !this.isAiming) {
      this.player.reload();
      return true;
    }
    if (keyCode === 'KeyF') {
      if (!this.isAiming) {
        // Enter aim mode
        this.isAiming = true;
        this.aimX = this.player.x;
        this.aimY = this.player.y;
      } else {
        // Execute shot
        if (this.player.shoot()) this.player.endTurn();
      }
      this.refreshDisplay();
      return true;
    }
    // Look mode activation
    if (keyCode === 'KeyL' && !this.isLooking) {
      // 'L' key
      this.isLooking = true;
      this.cursorX = this.player.x;
      this.cursorY = this.player.y;
      this.logTileInfo(this.cursorX, this.cursorY);
      this.refreshDisplay();
      return true;
    }
    if (this.isLooking) {
      // Exit look mode
      if (keyCode === 'Escape' || keyCode === 'KeyL') {
        // Escape or Toggle
        this.isLooking = false;
        this.info = '';
        this.refreshDisplay();
        return true;
      }
      // Look mode movement
      const moveKeys = {
        ArrowUp: [0, -1], // up
        ArrowRight: [1, 0], // right
        ArrowDown: [0, 1], // down
        ArrowLeft: [-1, 0] // left
      };
      if (keyCode in moveKeys) {
        const [dx, dy] = moveKeys[keyCode];
        const newX = this.cursorX + dx;
        const newY = this.cursorY + dy;
        // Only move cursor within visible area
        if (this.fovCells.has(`${newX},${newY}`)) {
          this.cursorX = newX;
          this.cursorY = newY;
          this.logTileInfo(newX, newY);
        }
        Game.updateFOV();
        return true;
      }
    }

    if (this.isAiming) {
      // Handle aiming movement
      const aimMove = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0]
      }[keyCode];
      if (aimMove) {
        const [dx, dy] = aimMove;
        this.aimX = Math.max(0, Math.min(79, this.aimX + dx));
        this.aimY = Math.max(0, Math.min(23, this.aimY + dy));
        this.logTileInfo(this.aimX, this.aimY);
        this.refreshDisplay();
        return true;
      }
      // Cancel aiming
      if (keyCode === 'Escape') {
        this.isAiming = false;
        this.info = '';
        this.refreshDisplay();
        return true;
      }
    }
    // Original movement code
    const keyMap = {
      ArrowUp: 0,
      ArrowRight: 1,
      ArrowDown: 2,
      ArrowLeft: 3
    };
    if (keyCode in keyMap) {
      this.player.move(keyMap[keyCode]);
      return true;
    }
    return false;
  },

  checkWinCondition() {
    if (this.enemies.length > 0) return;
    this.addLog(':: Victory! Enemies eliminated.');
    this.victory = true;
  },

  getEnemyAt(x, y) {
    return Game.enemies.find((e) => e.x === x && e.y === y);
  },

  addLog(string) {
    this.log.push(string);
    this.info = '';
  }
};
