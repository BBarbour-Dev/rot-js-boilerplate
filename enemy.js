import { shuffleArray } from './helpers.js';

export class Enemy {
  constructor(game, x, y, range = 1) {
    this.game = game;
    this.id = Math.random().toString(36).substring(2, 9);
    this.x = x;
    this.y = y;
    this.spawnX = x;
    this.spawnY = y;
    this.aggro = false;
    this.path = [];
    this.range = range;
  }

  act() {
    if (this.checkPlayerVisibility()) {
      this.aggro = true;
      this.moveTowardsPlayer();
    } else if (this.aggro) {
      this.returnToSpawn();
    }

    this.game.update();

    const next = this.game.scheduler.next();
    next.act();
  }

  checkPlayerVisibility() {
    const fov = new ROT.FOV.PreciseShadowcasting(
      (x, y) => this.game.map[`${x},${y}`] === 'floor'
    );
    let playerVisible = false;

    fov.compute(this.x, this.y, 8, (x, y) => {
      if (x === this.game.player.x && y === this.game.player.y) {
        playerVisible = true;
      }
    });
    return playerVisible;
  }

  moveTowardsPlayer() {
    // Create pathfinder with enemy-aware passability check
    const pathfinder = new ROT.Path.AStar(
      this.game.player.x,
      this.game.player.y,
      (x, y) => {
        // Check if cell is floor and not occupied by other enemies
        const isFloor = this.game.map[`${x},${y}`] === 'floor';
        const hasEnemy = this.game.enemies.some(
          (e) => e !== this && e.x === x && e.y === y
        );
        return isFloor && !hasEnemy;
      },
      { topology: 4 }
    );

    this.path = [];
    pathfinder.compute(this.x, this.y, (x, y) => {
      this.path.push([x, y]);
    });

    if (this.path.length > 1) {
      const [nextX, nextY] = this.path[1];

      // Check if another enemy is already in the target position
      const positionBlocked = this.game.enemies.some(
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
      (x, y) => this.game.map[`${x},${y}`] === 'floor',
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
      this.game.map[`${x},${y}`] === 'wall' ||
      this.game.enemies.some((e) => e.x === x && e.y === y) ||
      (this.game.player.x === x && this.game.player.y === y)
    );
  }

  tryMove(x, y) {
    if (!this.isPositionBlocked(x, y)) {
      this.x = x;
      this.y = y;
    }

    // Check for collision with player
    if (x === this.game.player.x && y === this.game.player.y) {
      console.log(`Enemy ${this.id} strikes you.`);
    }
  }
}
