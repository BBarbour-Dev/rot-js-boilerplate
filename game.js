import { Enemy } from './enemy.js';
import { Player } from './player.js';

export class Game {
  constructor() {
    this.display = null;
    this.scheduler = new ROT.Scheduler.Simple();
    this.player = null;
    this.map = {};
    this.fov = null;
    this.explored = new Set();
    this.enemies = [];
  }

  init() {
    this.display = new ROT.Display({
      width: 80,
      height: 24,
      fontSize: 16
    });
    document
      .getElementById('game-container')
      .appendChild(this.display.getContainer());

    this.generateMap(5);
    this.createPlayer();

    this.scheduler.add(this.player, true);
    this.enemies.forEach((enemy) => this.scheduler.add(enemy, true));

    this.bindInput();
    this.updateFOV();
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
      this.enemies.push(new Enemy(this, x, y));
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

  updateFOV() {
    const lightPasses = (x, y) => {
      const key = `${x},${y}`;
      return this.map[key] === 'floor';
    };

    this.fov = new ROT.FOV.PreciseShadowcasting(lightPasses);
    this.refreshDisplay();
  }

  refreshDisplay() {
    this.display.clear();

    const currentVisible = new Set();

    // Draw visible area
    this.fov.compute(
      this.player.x,
      this.player.y,
      10,
      (x, y, r, visibility) => {
        const key = `${x},${y}`;
        this.explored.add(key);
        currentVisible.add(key);

        // Determine base color based on visibility
        let color;
        if (visibility < 0.3) color = '#666';
        else if (visibility < 0.6) color = '#999';
        else color = '#fff';

        // Draw terrain
        const terrainChar = this.map[key] === 'wall' ? '#' : '.';
        this.display.draw(x, y, terrainChar, color);

        // Draw enemies in FOV
        const enemy = this.enemies.find((e) => e.x === x && e.y === y);
        if (enemy) {
          this.display.draw(x, y, 'e', '#ff0000');
        }
      }
    );

    // Draw explored but not visible areas
    this.explored.forEach((key) => {
      if (!currentVisible.has(key)) {
        const [x, y] = key.split(',').map(Number);
        const terrainChar = this.map[key] === 'wall' ? '#' : '.';
        this.display.draw(x, y, terrainChar, '#444444');
      }
    });

    // Draw player on top
    this.display.draw(this.player.x, this.player.y, '@', '#ff0');
  }

  isPositionBlocked(x, y) {
    return (
      this.map[`${x},${y}`] === 'wall' ||
      this.enemies.some((e) => e.x === x && e.y === y) ||
      (this.player.x === x && this.player.y === y)
    );
  }

  bindInput() {
    window.addEventListener('keydown', (e) => {
      if (this.handleEvent(e.code)) {
        e.preventDefault();
      }
    });
  }

  async handleEvent(code) {
    console.log(code);
    const keyMap = {
      ArrowUp: 0, // up
      ArrowRight: 1, // right
      ArrowDown: 2, // down
      ArrowLeft: 3 // left
    };
    switch (true) {
      case code in keyMap:
        await this.player.move(keyMap[code]);
        return true;
      case code === 'KeyW':
        console.log('wait');
        await this.player.wait();
        return true;
      default:
        return false;
    }
  }
}
