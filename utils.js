import { Game } from './game.js';

export function shuffleArray(array) {
  return array.sort(() => Math.random() - 0.5);
}

export function chebyshev(x1, y1, x2, y2) {
  return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
}

export function updateUI() {
  const { player } = Game;
  const statusEl = document.querySelector('[data-status]');
  statusEl.innerText = `HP: ${player.hp}/${player.hpMax} :: Ammo: ${player.ammo}/${player.ammoMax}`;
  const infoEl = document.querySelector('[data-info]');
  infoEl.innerText = Game.info;
  const logEl = document.querySelector('[data-log]');
  let logHtml = '';
  const logReverse = Game.log.toReversed();
  logReverse.forEach((entry, index) => {
    if (index === 0) logHtml += /*html*/ `<span>${entry}</span>`;
    else logHtml += /*html*/ `<span style="color: gray">${entry}</span>`;
  });
  logEl.innerHTML = logHtml;
}
