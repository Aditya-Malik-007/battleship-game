// -- Configuration --

const GRID_SIZE = 10;        // 10x10 board
const CELL_SIZE = 44;        // size of each cell in pixels
const CELL_GAP  = 3;         // gap between cells
const CANVAS_PX = GRID_SIZE * CELL_SIZE + (GRID_SIZE - 1) * CELL_GAP;

const SHIPS = [
  { name: 'Carrier',    length: 5 },
  { name: 'Battleship', length: 4 },
  { name: 'Cruiser',    length: 3 },
  { name: 'Submarine',  length: 3 },
  { name: 'Destroyer',  length: 2 },
];

// Possible values stored in each grid cell
const WATER = 0;   // untouched water
const SHIP  = 1;   // a ship occupies this cell
const HIT   = 2;   // ship was hit here
const MISS  = 3;   // fired here but missed

// Canvas drawing colors for each cell state
const COLORS = {
  [WATER]: '#0d1a2e',
  [SHIP]:  '#1e6040',
  [HIT]:   '#802020',
  [MISS]:  '#1a2030',
  grid:    '#1a2a40',
  hover:   'rgba(180, 160, 80, 0.45)',
  invalid: 'rgba(160, 40,  40, 0.45)',
};


// -- Game State --

let boards       = [];     // boards[0] = P1 grid, boards[1] = P2 grid
let setupPlayer  = 0;      // player currently placing ships (0 or 1)
let shipIndex    = 0;      // which ship is being placed right now
let isHorizontal = true;   // direction of ship placement
let battlePlayer = 0;      // whose turn it is during battle
let setupHover   = null;   // [row, col] mouse is over on setup grid
let battleHover  = null;   // [row, col] mouse is over on enemy grid
let statusMsg    = '';     // message shown during battle


// -- Utility --

// Short helper to get a DOM element by id
function getEl(id) {
  return document.getElementById(id);
}

// Show one screen and hide all others
function showScreen(screenId) {
  ['home', 'setup', 'handoff', 'battle', 'win'].forEach(id => {
    getEl(id).classList.toggle('off', id !== screenId);
  });
}

// Create a blank GRID_SIZE x GRID_SIZE board filled with WATER
function createGrid() {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(WATER));
}


// -- Canvas Drawing --

// Draw the full game grid onto a canvas element
function drawGrid(canvas, grid, hideShips, highlightCells, highlightOk) {
  if (highlightCells === undefined) highlightCells = [];
  if (highlightOk    === undefined) highlightOk    = true;

  canvas.width  = CANVAS_PX;
  canvas.height = CANVAS_PX;

  const ctx = canvas.getContext('2d');

  // Put highlight cells into a Set for fast lookup
  const highlightSet = new Set(highlightCells.map(function(rc) {
    return rc[0] + ',' + rc[1];
  }));

  for (var row = 0; row < GRID_SIZE; row++) {
    for (var col = 0; col < GRID_SIZE; col++) {
      var x = col * (CELL_SIZE + CELL_GAP);
      var y = row * (CELL_SIZE + CELL_GAP);

      // If hiding ships (enemy board), treat SHIP cells as WATER
      var value = grid[row][col];
      if (value === SHIP && hideShips) {
        value = WATER;
      }

      // Fill cell background
      ctx.fillStyle = COLORS[value];
      ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

      // Draw hover highlight on top
      if (highlightSet.has(row + ',' + col)) {
        ctx.fillStyle = highlightOk ? COLORS.hover : COLORS.invalid;
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      }

      // Draw cell border
      ctx.strokeStyle = COLORS.grid;
      ctx.strokeRect(x + 0.5, y + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);

      // Draw X cross for a hit cell
      if (value === HIT) {
        ctx.strokeStyle = '#c06060';
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.moveTo(x + 8,             y + 8);
        ctx.lineTo(x + CELL_SIZE - 8, y + CELL_SIZE - 8);
        ctx.moveTo(x + CELL_SIZE - 8, y + 8);
        ctx.lineTo(x + 8,             y + CELL_SIZE - 8);
        ctx.stroke();
        ctx.lineWidth = 1;
      }

      // Draw small dot for a miss cell
      if (value === MISS) {
        ctx.fillStyle = '#304050';
        ctx.beginPath();
        ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

// Convert a mouse event into a [row, col] on the given canvas
// Returns null if the mouse is outside the grid or in a gap
function getHoveredCell(canvas, event) {
  var rect = canvas.getBoundingClientRect();
  var px   = event.clientX - rect.left;
  var py   = event.clientY - rect.top;

  var col = Math.floor(px / (CELL_SIZE + CELL_GAP));
  var row = Math.floor(py / (CELL_SIZE + CELL_GAP));

  var inCellX = (px % (CELL_SIZE + CELL_GAP)) < CELL_SIZE;
  var inCellY = (py % (CELL_SIZE + CELL_GAP)) < CELL_SIZE;
  var inBounds = row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE;

  if (!inCellX || !inCellY || !inBounds) {
    return null;
  }
  return [row, col];
}


// -- Ship Placement --

// Get all grid cells a ship would cover if placed at (row, col)
function getShipCells(row, col) {
  var size  = SHIPS[shipIndex].length;
  var cells = [];
  for (var i = 0; i < size; i++) {
    var r = row + (isHorizontal ? 0 : i);
    var c = col + (isHorizontal ? i : 0);
    cells.push([r, c]);
  }
  return cells;
}

// Check every cell is inside the board and empty
function canPlaceShip(grid, cells) {
  return cells.every(function(rc) {
    var r = rc[0];
    var c = rc[1];
    return r >= 0 && r < GRID_SIZE &&
           c >= 0 && c < GRID_SIZE &&
           grid[r][c] === WATER;
  });
}

// Write SHIP into every cell
function placeShip(grid, cells) {
  cells.forEach(function(rc) {
    grid[rc[0]][rc[1]] = SHIP;
  });
}

// Returns true if any SHIP cells remain on the board
function hasShipsLeft(grid) {
  return grid.some(function(row) {
    return row.indexOf(SHIP) !== -1;
  });
}


// -- Rendering --

function renderSetup() {
  var canvas = getEl('sCanvas');
  var grid   = boards[setupPlayer];

  // Compute preview cells for the current hover position
  var hoverCells = [];
  var hoverOk    = true;
  if (setupHover !== null) {
    hoverCells = getShipCells(setupHover[0], setupHover[1]);
    hoverOk    = canPlaceShip(grid, hoverCells);
  }

  drawGrid(canvas, grid, false, hoverCells, hoverOk);

  getEl('setupTitle').textContent =
    'PLAYER ' + (setupPlayer + 1) + ' -- PLACE SHIPS (' + (shipIndex + 1) + ' / ' + SHIPS.length + ')';

  // Build ship checklist sidebar
  var listHTML = '';
  for (var i = 0; i < SHIPS.length; i++) {
    var state = '';
    if (i < shipIndex)  state = 'done';
    if (i === shipIndex) state = 'cur';
    listHTML += '<div class="ship ' + state + '">' + SHIPS[i].name + ' [' + SHIPS[i].length + ']</div>';
  }
  getEl('shipList').innerHTML = listHTML;
}

function renderBattle() {
  getEl('battleTitle').textContent = 'PLAYER ' + (battlePlayer + 1) + ' -- FIRE';
  getEl('hitMsg').textContent      = statusMsg;

  // Left board: current player's own fleet (ships visible)
  drawGrid(getEl('mCanvas'), boards[battlePlayer], false);

  // Right board: enemy fleet (ships hidden), plus hover highlight
  var enemyGrid  = boards[1 - battlePlayer];
  var hoverCells = [];
  var hoverOk    = false;

  if (battleHover !== null) {
    var r = battleHover[0];
    var c = battleHover[1];
    var alreadyFired = (enemyGrid[r][c] === HIT || enemyGrid[r][c] === MISS);
    hoverCells = [[r, c]];
    hoverOk    = !alreadyFired;
  }

  drawGrid(getEl('eCanvas'), enemyGrid, true, hoverCells, hoverOk);
}


// -- Game Flow --

function startGame() {
  boards       = [createGrid(), createGrid()];
  setupPlayer  = 0;
  shipIndex    = 0;
  isHorizontal = true;
  setDirection(true);
  showScreen('setup');
  renderSetup();
}

function setDirection(horizontal) {
  isHorizontal = horizontal;
  getEl('btnH').classList.toggle('active',  horizontal);
  getEl('btnV').classList.toggle('active', !horizontal);
  renderSetup();
}

function continueSetup() {
  setupPlayer  = 1;
  shipIndex    = 0;
  isHorizontal = true;
  setDirection(true);
  showScreen('setup');
  renderSetup();
}

function startBattle() {
  battlePlayer = 0;
  statusMsg    = '';
  battleHover  = null;
  showScreen('battle');
  renderBattle();
}

function goHome() {
  showScreen('home');
}


// -- Setup Events --

getEl('sCanvas').addEventListener('mousemove', function(e) {
  setupHover = getHoveredCell(getEl('sCanvas'), e);
  renderSetup();
});

getEl('sCanvas').addEventListener('mouseleave', function() {
  setupHover = null;
  renderSetup();
});

getEl('sCanvas').addEventListener('click', function(e) {
  var cell = getHoveredCell(getEl('sCanvas'), e);
  if (cell === null) return;

  var cells = getShipCells(cell[0], cell[1]);

  if (!canPlaceShip(boards[setupPlayer], cells)) {
    getEl('setupMsg').textContent = 'Invalid position -- try somewhere else.';
    return;
  }

  getEl('setupMsg').textContent = '';
  placeShip(boards[setupPlayer], cells);
  shipIndex++;

  if (shipIndex === SHIPS.length) {
    // All ships placed for this player
    if (setupPlayer === 0) {
      showScreen('handoff');   // hand device to player 2
    } else {
      startBattle();           // both done -- fight!
    }
  } else {
    renderSetup();
  }
});


// -- Battle Events --

getEl('eCanvas').addEventListener('mousemove', function(e) {
  battleHover = getHoveredCell(getEl('eCanvas'), e);
  renderBattle();
});

getEl('eCanvas').addEventListener('mouseleave', function() {
  battleHover = null;
  renderBattle();
});

getEl('eCanvas').addEventListener('click', function(e) {
  var cell = getHoveredCell(getEl('eCanvas'), e);
  if (cell === null) return;

  var row       = cell[0];
  var col       = cell[1];
  var enemyGrid = boards[1 - battlePlayer];
  var cellValue = enemyGrid[row][col];

  if (cellValue === HIT || cellValue === MISS) {
    statusMsg = 'Already fired there.';
    renderBattle();
    return;
  }

  var isHit = (cellValue === SHIP);
  enemyGrid[row][col] = isHit ? HIT : MISS;

  // Check if all enemy ships are sunk -- game over
  if (isHit && !hasShipsLeft(enemyGrid)) {
    renderBattle();
    getEl('winTitle').textContent = 'PLAYER ' + (battlePlayer + 1) + ' WINS';
    setTimeout(function() { showScreen('win'); }, 400);
    return;
  }

  statusMsg = isHit ? 'HIT' : 'MISS';

  // Switch turn only on a miss
  if (!isHit) {
    battlePlayer = 1 - battlePlayer;
  }

  renderBattle();
});


// -- Keyboard Shortcuts --

document.addEventListener('keydown', function(e) {
  var onSetupScreen = !getEl('setup').classList.contains('off');
  if (!onSetupScreen) return;

  if (e.key === 'h' || e.key === 'H') setDirection(true);
  if (e.key === 'v' || e.key === 'V') setDirection(false);
});