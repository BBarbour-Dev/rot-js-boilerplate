import { Game } from './game.js';
import { chebyshev } from './utils.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.frozen = false;
    this.hp = 6;
    this.hpMax = 6;
    this.ammo = 4;
    this.ammoMax = 4;
    this.range = 8;
  }

  act() {
    if (Game.victory) return;
    this.frozen = false;
  }

  move(direction) {
    if (this.frozen) return;
    const dirs = ROT.DIRS[4];
    const [dx, dy] = dirs[direction];
    const newX = this.x + dx;
    const newY = this.y + dy;
    const key = `${newX},${newY}`;
    const occupyingEnemy = Game.enemies.find(
      (e) => e.x === newX && e.y === newY
    );
    if (occupyingEnemy) {
      this.melee(occupyingEnemy);
      return;
    }
    if (Game.map[key] === 'floor' && !occupyingEnemy) {
      this.x = newX;
      this.y = newY;
      this.endTurn();
    }
  }

  endTurn() {
    this.frozen = true;
    const next = Game.scheduler.next();
    if (!next) return;
    Game.isAiming = false;
    Game.updateFOV();
    next.act();
  }

  melee(target) {
    const dmg = Math.round(ROT.RNG.getUniform() * 4) + 1;
    Game.addLog(`:: You strike the ${target.name} for ${dmg} damage.`);
    target.takeDamage(dmg);
    if (Game.victory) {
      this.frozen = true;
      return;
    }
    this.endTurn();
  }

  reload() {
    this.ammo = this.ammoMax;
    Game.addLog(':: You reload your gun.');
    this.endTurn();
  }

  shoot() {
    if (this.ammo <= 0) {
      Game.info = 'Click! Out of ammo.';
      this.reload();
    }
    const clear = Game.fovCells.has(`${Game.aimX},${Game.aimY}`);
    const enemy = Game.getEnemyAt(Game.aimX, Game.aimY);
    if (!clear) {
      Game.info = 'No enemy visible.';
      return;
    }
    if (!enemy) {
      Game.info = 'No enemy at location.';
      return;
    }
    const distance = chebyshev(this.x, this.y, enemy.x, enemy.y);
    if (distance > this.range) {
      Game.info = 'Enemy out of range.';
      return;
    }
    this.ammo--;
    Game.addLog(`:: You shoot the ${enemy.name} for 2 damage.`);
    enemy.takeDamage(2);
    if (Game.victory) {
      this.frozen = true;
      return;
    }
    return true;
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.frozen = true;
      Game.scheduler.clear();
      Game.display.draw(this.x, this.y, 'X', 'red');
      Game.addLog(':: You are defeated. Reload the page to try again.');
      return;
    }
  }
}
