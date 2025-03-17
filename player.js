export class Player {
  constructor(game, x, y) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.moves = 2;
    this.speed = 2;
    this.frozen = false;
  }

  async act() {
    this.frozen = false;
  }

  async move(direction) {
    if (this.frozen) return;
    const dirs = ROT.DIRS[4];
    const [dx, dy] = dirs[direction];
    const newX = this.x + dx;
    const newY = this.y + dy;
    const key = `${newX},${newY}`;

    if (
      this.game.map[key] === 'floor' &&
      !this.game.enemies.some((e) => e.x === newX && e.y === newY)
    ) {
      this.x = newX;
      this.y = newY;
      this.game.updateFOV();
      this.moves -= 1;
    }

    if (this.moves < 1) {
      this.moves = 2;
      this.frozen = true;
      const next = this.game.scheduler.next();
      await next.act();
    }
  }

  async wait() {
    this.frozen = true;
    const next = this.game.scheduler.next();
    await next.act();
  }
}
