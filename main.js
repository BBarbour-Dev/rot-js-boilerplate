import { Game } from '/game.js';

let game;

document.addEventListener('DOMContentLoaded', () => (game = new Game().init()));

const restartBtn = document.querySelector('[data-restart]');
restartBtn.addEventListener('click', () => (game = new Game().init()));
