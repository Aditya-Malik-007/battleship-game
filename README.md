# Battleship — 2 Player

A browser-based 2-player Battleship game. No server required. Open index.html in any browser to play.

---

## How to Run

Double-click index.html. That is all.

---

## Files

    index.html   Page structure and screens
    style.css    All visual styling
    game.js      All game logic

---

## How to Play

### Setup Phase

1. Player 1 places all 5 ships on the grid.
2. Press H to place a ship horizontally, V to place vertically.
3. Hover over the grid to preview the ship position.
4. Click to confirm placement. Red preview means invalid position.
5. Once all ships are placed, hand the device to Player 2.
6. Player 2 repeats the same process.

### Battle Phase

- Players take turns clicking on the enemy board to fire.
- HIT is shown in red with an X mark.
- MISS is shown with a small dot.
- The first player to sink all enemy ships wins.
- After a HIT, the same player fires again.
- After a MISS, the turn passes to the other player.

---

## Ships

    Carrier      5 cells
    Battleship   4 cells
    Cruiser      3 cells
    Submarine    3 cells
    Destroyer    2 cells

---

## Controls

    H            Switch placement to horizontal
    V            Switch placement to vertical
    Mouse click  Place ship / Fire at enemy

---

## Notes

- No installation or build step needed.
- Works in any modern browser (Chrome, Firefox, Edge).
- Both players share the same screen. The handoff screen separates each player turn.