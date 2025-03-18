import { Enemy } from './enemy.js';
import { Player } from './player.js';

export class Game {
  constructor() {
    this.display = null;
    this.scheduler = new ROT.Scheduler.Simple();
    this.player = null;
    this.map = {};
    this.fov = null;
    this.fovCells = null;
    this.explored = new Set();
    this.enemies = [];
    this.visibleEnemies = [];
  }

  static destroy(gameInstance) {
    const container = document.querySelector('#game-container');
    container.innerHTML = '';
    gameInstance = null;
  }

  init() {
    this.display = new ROT.Display({
      width: 80,
      height: 24,
      fontSize: 16
    });
    document
      .querySelector('#game-container')
      .appendChild(this.display.getContainer());

    this.generateMap(5);
    this.createPlayer();

    this.scheduler.add(this.player, true);
    this.enemies.forEach((enemy) => this.scheduler.add(enemy, true));

    this.bindInput();
    this.update();
  }

  generateMap(enemyCount) {
    const digger = new ROT.Map.Digger(80, 24);
    this.map = {};
    this.enemies = [];
    const floorCells = [];

    const digCallback = (x, y, wall) => {
      const key = `${x},${y}`;
      this.map[key] = wall ? 'wall' : 'floor';
      if (!wall) floorCells.push({ x, y });
    };

    digger.create(digCallback.bind(this));

    // Place enemies
    for (let i = 0; i < enemyCount; i++) {
      const index = Math.floor(ROT.RNG.getUniform() * floorCells.length);
      const { x, y } = floorCells.splice(index, 1)[0];

      if (i >= 3) {
        this.enemies.push(new Enemy(this, x, y, 5, 15));
      } else {
        this.enemies.push(new Enemy(this, x, y));
      }
    }
  }

  createPlayer() {
    // Find random starting position
    while (!this.player) {
      const x = Math.floor(ROT.RNG.getUniform() * 80);
      const y = Math.floor(ROT.RNG.getUniform() * 24);
      if (
        this.map[`${x},${y}`] === 'floor' &&
        !this.enemies.some((e) => e.x === x && e.y === y)
      ) {
        this.player = new Player(this, x, y);
      }
    }
  }

  update() {
    const lightPasses = (x, y) => {
      const key = `${x},${y}`;
      return this.map[key] === 'floor';
    };

    this.fov = new ROT.FOV.PreciseShadowcasting(lightPasses);

    this.fovCells = new Set();

    // Draw visible area
    this.fov.compute(
      this.player.x,
      this.player.y,
      this.player.vision,
      (x, y, r, visibility) => {
        const key = `${x},${y}`;
        this.explored.add(key);
        this.fovCells.add({ key, visibility });
      }
    );

    this.draw();
  }

  draw() {
    this.display.clear();

    this.fovCells.forEach(({ key, visibility }) => {
      const [x, y] = key.split(',').map(Number);
      // Determine base color based on visibility
      let color;
      if (visibility < 0.3) color = '#666';
      else if (visibility < 0.6) color = '#999';
      else color = '#fff';

      // Draw terrain
      const terrainChar = this.map[key] === 'wall' ? '#' : '.';
      this.display.draw(x, y, terrainChar, color);
    });

    // Draw explored but not visible areas
    this.explored.forEach((key) => {
      const hasKey = Array.from(this.fovCells).some((item) => item.key === key);
      if (!hasKey) {
        const [x, y] = key.split(',').map(Number);
        const terrainChar = this.map[key] === 'wall' ? '#' : '.';
        this.display.draw(x, y, terrainChar, '#444444');
      }
    });

    this.enemies.forEach((enemy) => {
      const key = `${enemy.x},${enemy.y}`;
      const hasKey = Array.from(this.fovCells).some((item) => item.key === key);
      if (hasKey) {
        const isTarget =
          this.visibleEnemies[this.player.currentTargetIndex] === enemy;
        const bgColor = isTarget ? 'white' : null;
        this.display.draw(enemy.x, enemy.y, 'e', 'red', bgColor);
      }
    });

    // Filter enemies in player's FOV
    this.visibleEnemies = this.enemies.filter((enemy) => {
      const key = `${enemy.x},${enemy.y}`;
      const hasKey = Array.from(this.fovCells).some((item) => {
        return item.key === key;
      });
      return hasKey;
    });

    // Draw player on top
    this.display.draw(this.player.x, this.player.y, '@', '#ff0');
  }

  bindInput() {
    window.addEventListener('keydown', (e) => {
      if (this.handleEvent(e.code)) {
        e.preventDefault();
      }
    });
  }

  handleEvent(code) {
    const keyMap = {
      ArrowUp: 0,
      ArrowRight: 1,
      ArrowDown: 2,
      ArrowLeft: 3,
      KeyZ: 'cycle',
      KeyX: 'shoot',
      Space: 'wait'
    };

    switch (keyMap[code]) {
      case 0:
      case 1:
      case 2:
      case 3:
        this.player.move(keyMap[code]);
        break;
      case 'cycle':
        this.player.cycleTarget();
        break;
      case 'shoot':
        this.player.shootTarget();
        break;
      case 'wait':
        console.log('waiting...');
        this.player.wait();
        break;
    }
    return true;
  }
}
