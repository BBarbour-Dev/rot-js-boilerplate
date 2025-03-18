// Helper function to shuffle directions
export function shuffleArray(array) {
  return array.sort(() => Math.random() - 0.5);
}

export const chebyshev = (x1, y1, x2, y2) => {
  return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
};
