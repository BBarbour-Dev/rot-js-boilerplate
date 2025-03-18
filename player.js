export class Player {
  constructor(game, x, y) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.vision = 15;
    this.moves = 2;
    this.speed = 2;
    this.frozen = false;
    this.currentTargetIndex = -1;
  }

  act() {
    this.moves = this.speed;
    this.frozen = false;
  }

  move(direction) {
    if (this.frozen) return;

    const dirs = ROT.DIRS[4];
    const [dx, dy] = dirs[direction];
    const newX = this.x + dx;
    const newY = this.y + dy;
    const key = `${newX},${newY}`;

    const occupyingEnemy = this.game.enemies.find(
      (e) => e.x === newX && e.y === newY
    );

    if (occupyingEnemy) {
      this.melee(occupyingEnemy);
      this.endTurn();
      this.game.update();
      return;
    }

    if (this.game.map[key] === 'floor' && !occupyingEnemy) {
      this.x = newX;
      this.y = newY;
      this.game.update();
      this.moves -= 1;
    }

    if (this.moves < 1) this.endTurn();
  }

  wait() {
    this.endTurn();
  }

  endTurn() {
    this.frozen = true;
    this.moves = 0;
    const next = this.game.scheduler.next();
    next.act();
  }

  cycleTarget() {
    if (this.game.visibleEnemies.length === 0) {
      this.currentTargetIndex = -1;
      return;
    }

    this.currentTargetIndex =
      (this.currentTargetIndex + 1) % this.game.visibleEnemies.length;
    this.game.update();
  }

  shootTarget() {
    if (!this.game.visibleEnemies[this.currentTargetIndex]) return;

    const target = this.game.visibleEnemies[this.currentTargetIndex];
    console.log(`Shooting ${target.id}`);
    this.endTurn();
  }

  melee(enemy) {
    console.log(`Melee ${enemy.id}`);
  }
}
