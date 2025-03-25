import { Game } from './game.js';
import { chebyshev, shuffleArray } from './utils.js';

export class Enemy {
  constructor(x, y, range = 1, vision = 8) {
    this.id = Math.random().toString(36).substring(2, 9);
    this.x = x;
    this.y = y;
    this.spawnX = x;
    this.spawnY = y;
    this.aggro = false;
    this.path = [];
    this.range = range;
    this.vision = vision;
    this.hp = 3;
    this.hpMax = 3;
    this.name = `Enemy ${range > 1 ? 'gunman' : 'brute'}`;
  }

  act() {
    if (!this.aggro && this.checkPlayerVisibility()) {
      this.aggro = true;
    }
    if (this.aggro) {
      // Calculate distance to player
      const distance = chebyshev(this.x, this.y, Game.player.x, Game.player.y);
      if (
        this.range > 1 &&
        distance <= this.range &&
        this.checkPlayerVisibility()
      ) {
        this.shoot(Game.player);
      } else {
        this.moveTowardsPlayer();
      }
    }
    this.endTurn();
  }

  endTurn() {
    const next = Game.scheduler.next();
    if (!next) return;
    Game.updateFOV();
    next.act();
  }

  checkPlayerVisibility() {
    const fov = new ROT.FOV.PreciseShadowcasting(
      (x, y) => Game.map[`${x},${y}`] === 'floor'
    );
    let playerVisible = false;
    fov.compute(this.x, this.y, this.vision, (x, y) => {
      if (x === Game.player.x && y === Game.player.y) playerVisible = true;
    });
    return playerVisible;
  }

  moveTowardsPlayer() {
    // Create pathfinder with enemy-aware passability check
    const pathfinder = new ROT.Path.AStar(
      Game.player.x,
      Game.player.y,
      (x, y) => {
        // Check if cell is floor and not occupied by other enemies
        const isFloor = Game.map[`${x},${y}`] === 'floor';
        const hasEnemy = Game.enemies.some(
          (e) => e !== this && e.x === x && e.y === y
        );
        return isFloor && !hasEnemy;
      },
      { topology: 4 }
    );
    this.path = [];
    pathfinder.compute(this.x, this.y, (x, y) => this.path.push([x, y]));
    if (this.path.length > 1) {
      const [nextX, nextY] = this.path[1];
      // Check if another enemy is already in the target position
      const positionBlocked = Game.enemies.some(
        (e) => e !== this && e.x === nextX && e.y === nextY
      );
      if (!positionBlocked) {
        this.tryMove(nextX, nextY);
      } else {
        // Find alternative path around the blockage
        this.findAlternativeRoute();
      }
    }
  }

  findAlternativeRoute() {
    // Try moving in adjacent directions as fallback
    const directions = shuffleArray([0, 1, 2, 3]); // Up, Right, Down, Left
    const dirs = ROT.DIRS[4];
    for (const dir of directions) {
      const [dx, dy] = dirs[dir];
      const newX = this.x + dx;
      const newY = this.y + dy;

      if (!this.isPositionBlocked(newX, newY)) {
        this.tryMove(newX, newY);
        return;
      }
    }
  }

  returnToSpawn() {
    if (this.x === this.spawnX && this.y === this.spawnY) {
      this.aggro = false;
      return;
    }
    const pathfinder = new ROT.Path.AStar(
      this.spawnX,
      this.spawnY,
      (x, y) => Game.map[`${x},${y}`] === 'floor',
      { topology: 4 }
    );
    const returnPath = [];
    pathfinder.compute(this.x, this.y, (x, y) => {
      returnPath.push([x, y]);
    });
    if (returnPath.length > 1) {
      const [nextX, nextY] = returnPath[1];
      this.tryMove(nextX, nextY);
    }
  }

  isPositionBlocked(x, y) {
    return (
      Game.map[`${x},${y}`] === 'wall' ||
      Game.enemies.some((e) => e.x === x && e.y === y) ||
      (Game.player.x === x && Game.player.y === y)
    );
  }

  tryMove(x, y) {
    if (!this.isPositionBlocked(x, y)) {
      this.x = x;
      this.y = y;
    }
    // Check for collision with player
    if (x === Game.player.x && y === Game.player.y) {
      this.melee(Game.player);
    }
  }

  shoot(target) {
    const roll = ROT.RNG.getPercentage();
    if (roll <= 50) {
      Game.addLog(`:: ${this.name} shoots you for 1 damage.`);
      target.takeDamage(1);
    } else {
      Game.addLog(`:: ${this.name} shoots at you and misses.`);
    }
  }

  melee(target) {
    Game.addLog(`:: ${this.name} strikes you for 1 damage.`);
    target.takeDamage(1);
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) this.die();
  }

  die() {
    Game.addLog(`:: ${this.name} is defeated.`);
    Game.scheduler.remove(this);
    Game.enemies = Game.enemies.filter((e) => e.id !== this.id);
    Game.checkWinCondition();
  }
}
