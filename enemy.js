export class Enemy {
  constructor(game, x, y) {
    this.game = game;
    this.id = Math.random().toString(36).substr(2, 9);
    this.x = x;
    this.y = y;
    this.spawnX = x;
    this.spawnY = y;
    this.aggro = false;
    this.path = [];
  }

  async act() {
    if (this.checkPlayerVisibility()) {
      this.aggro = true;
      this.moveTowardsPlayer();
    } else if (this.aggro) {
      this.returnToSpawn();
    }

    this.game.updateFOV();

    await new Promise((resolve) => setTimeout(resolve, 100));

    const next = this.game.scheduler.next();
    await next.act();
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
    const pathfinder = new ROT.Path.AStar(
      this.game.player.x,
      this.game.player.y,
      (x, y) => this.game.map[`${x},${y}`] === 'floor',
      { topology: 4 }
    );

    this.path = [];
    pathfinder.compute(this.x, this.y, (x, y) => {
      this.path.push([x, y]);
    });

    if (this.path.length > 1) {
      const [nextX, nextY] = this.path[1];
      this.tryMove(nextX, nextY);
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

  tryMove(x, y) {
    if (!this.game.isPositionBlocked(x, y)) {
      this.x = x;
      this.y = y;
    }

    // Check for collision with player
    if (x === this.game.player.x && y === this.game.player.y) {
      console.log(`You are hit by enemy ${this.id}`);
    }
  }
}
