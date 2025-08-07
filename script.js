// --- Game State Variables ---
let board = [];
let solvedBoard = [];
let selectedCell = null;
let lives = 3;
let timer = 0;
let timerInterval = null;

const boardElement = document.getElementById('board');
const numberPlatformElement = document.getElementById('number-platform');
const livesContainer = document.getElementById('lives-container');
const timerElement = document.getElementById('timer');
const endGameMessage = document.getElementById('end-game-message');
const messageText = document.getElementById('message-text');
const playAgainBtn = document.getElementById('play-again-btn');

// --- Sudoku Generation Algorithm ---
function generateSudoku() {
    let grid = Array(9).fill(null).map(() => Array(9).fill(0));
    function solve() {
        let empty = findEmptyCell(grid);
        if (!empty) return true;
        let [row, col] = empty;
        let numbers = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

        for (let num of numbers) {
            if (isValid(grid, row, col, num)) {
                grid[row][col] = num;
                if (solve()) return true;
                grid[row][col] = 0;
            }
        }
        return false;
    }
    solve();
    solvedBoard = grid.map(row => [...row]);

    let difficulty = 45; 
    let puzzle = grid.map(row => [...row]);
    let cellsToRemove = shuffle(Array.from({ length: 81 }, (_, i) => i));

    for (let i = 0; i < difficulty; i++) {
        let index = cellsToRemove[i];
        let row = Math.floor(index / 9);
        let col = index % 9;
        puzzle[row][col] = null;
    }
    
    board = puzzle;
}

function findEmptyCell(grid) {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (grid[row][col] === 0) return [row, col];
        }
    }
    return null;
}

function isValid(grid, row, col, num) {
    for (let i = 0; i < 9; i++) {
        if (grid[row][i] === num || grid[i][col] === num) return false;
    }
    let startRow = Math.floor(row / 3) * 3;
    let startCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (grid[startRow + i][startCol + j] === num) return false;
        }
    }
    return true;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// --- Game Rendering and Interaction ---
function renderBoard() {
    boardElement.innerHTML = '';
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            if (board[row][col] !== null) {
                cell.textContent = board[row][col];
                cell.classList.add('fixed');
            } else {
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.addEventListener('click', handleCellClick);
            }
            boardElement.appendChild(cell);
        }
    }
}

function renderNumberPlatform() {
    numberPlatformElement.innerHTML = '';
    for (let i = 1; i <= 9; i++) {
        const numberButton = document.createElement('div');
        numberButton.classList.add('number-button');
        numberButton.textContent = i;
        numberButton.dataset.number = i;
        numberButton.addEventListener('click', handleNumberClick);
        numberPlatformElement.appendChild(numberButton);
    }
    
    // NEW: Create and add the Erase button
    const eraseButton = document.createElement('div');
    eraseButton.classList.add('number-button', 'erase-button');
    eraseButton.innerHTML = '<i class="fas fa-eraser"></i>';
    eraseButton.addEventListener('click', handleEraseClick);
    numberPlatformElement.appendChild(eraseButton);
}

function handleCellClick(event) {
    clearHighlights();
    selectedCell = event.target;
    selectedCell.classList.add('selected');

    const row = parseInt(selectedCell.dataset.row);
    const col = parseInt(selectedCell.dataset.col);

    highlightRelatedCells(row, col);
    
    const clickedNumberText = selectedCell.textContent;
    if (clickedNumberText !== '') {
        const clickedNumber = parseInt(clickedNumberText);
        document.querySelectorAll('.cell').forEach(cell => {
            if (parseInt(cell.textContent) === clickedNumber) {
                cell.classList.add('same-number-highlight');
            }
        });
    }

    // UPDATED: Allow editing of any non-fixed cell
    if (!selectedCell.classList.contains('fixed')) {
        numberPlatformElement.style.display = 'grid';
    } else {
        numberPlatformElement.style.display = 'none';
    }
}

function highlightRelatedCells(row, col) {
    const cells = boardElement.children;
    for (let i = 0; i < 81; i++) {
        const cellRow = Math.floor(i / 9);
        const cellCol = i % 9;
        const cell = cells[i];

        if (cellRow === row || cellCol === col || (Math.floor(cellRow / 3) === Math.floor(row / 3) && Math.floor(cellCol / 3) === Math.floor(col / 3))) {
            cell.classList.add('highlight');
        }
    }
}

function clearHighlights() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('highlight', 'selected', 'same-number-highlight');
    });
}

function handleNumberClick(event) {
    if (!selectedCell || selectedCell.classList.contains('fixed')) return;

    const number = parseInt(event.currentTarget.dataset.number);
    const row = parseInt(selectedCell.dataset.row);
    const col = parseInt(selectedCell.dataset.col);

    board[row][col] = number;
    selectedCell.textContent = number;
    selectedCell.classList.remove('correct', 'wrong');

    if (board[row][col] === solvedBoard[row][col]) {
        selectedCell.classList.add('correct');
        checkNumberPlatform();
        if (checkWinCondition()) {
            endGame(true);
        }
    } else {
        selectedCell.classList.add('wrong');
        loseLife();
    }
    
    numberPlatformElement.style.display = 'none';
    clearHighlights();
    selectedCell = null;
}

// NEW: Function to handle the erase button click
function handleEraseClick() {
    if (!selectedCell || selectedCell.classList.contains('fixed')) return;

    const row = parseInt(selectedCell.dataset.row);
    const col = parseInt(selectedCell.dataset.col);

    board[row][col] = null; // Clear from board state
    selectedCell.textContent = ''; // Clear from DOM
    selectedCell.classList.remove('correct', 'wrong');

    checkNumberPlatform(); // Re-enable number button if it was disabled
    
    numberPlatformElement.style.display = 'none';
    clearHighlights();
    selectedCell = null;
}

function checkNumberPlatform() {
    for(let i = 1; i <= 9; i++) {
        let count = 0;
        document.querySelectorAll('.cell').forEach(cell => {
            if(parseInt(cell.textContent) === i) {
                count++;
            }
        });
        const numberButton = document.querySelector(`.number-button[data-number="${i}"]`);
        if (count === 9) {
            numberButton.classList.add('disabled');
        } else {
            numberButton.classList.remove('disabled');
        }
    }
}

function checkWinCondition() {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (board[row][col] !== solvedBoard[row][col]) {
                return false;
            }
        }
    }
    return true;
}

// --- Game State Management ---
function startTimer() {
    timer = 0;
    timerElement.textContent = '00:00';
    if(timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timer++;
        const minutes = Math.floor(timer / 60).toString().padStart(2, '0');
        const seconds = (timer % 60).toString().padStart(2, '0');
        timerElement.textContent = `${minutes}:${seconds}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

function loseLife() {
    lives--;
    const hearts = livesContainer.querySelectorAll('.fas');
    if (lives >= 0 && hearts[lives]) {
        hearts[lives].classList.add('heartbreak');
    }

    if (lives === 0) {
        endGame(false);
    }
}

function endGame(isWin) {
    stopTimer();
    messageText.classList.remove('win-animation', 'lose-animation');
    
    endGameMessage.classList.add('visible');
    playAgainBtn.style.display = 'block';

    if (isWin) {
        messageText.textContent = "YOU WON!";
        messageText.classList.add('win-animation');
        celebrationAnimation();
    } else {
        messageText.textContent = "GAME OVER";
        messageText.classList.add('lose-animation');
        revealAnswers();
    }
}

function revealAnswers() {
    const cells = boardElement.children;
    for (let i = 0; i < 81; i++) {
        const cell = cells[i];
        const row = Math.floor(i / 9);
        const col = i % 9;
        if (!cell.classList.contains('fixed')) {
            cell.textContent = solvedBoard[row][col];
            cell.classList.remove('wrong', 'correct');
            cell.classList.add('fixed');
        }
    }
}

function celebrationAnimation() {
    const colors = ['#f44336', '#2196f3', '#4caf50', '#ffeb3b', '#ff9800'];
    for (let i = 0; i < 150; i++) {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti-piece');
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = `${Math.random() * 100}vw`;
        confetti.style.animationDelay = `${Math.random() * 2}s`;
        confetti.style.animationDuration = `${3 + Math.random() * 4}s`;
        document.getElementById('confetti-container').appendChild(confetti);
    }
}

function resetGame() {
    lives = 3;
    selectedCell = null;
    endGameMessage.classList.remove('visible');
    playAgainBtn.style.display = 'none';
    messageText.classList.remove('win-animation', 'lose-animation');

    livesContainer.innerHTML = `
        <i class="fas fa-heart"></i>
        <i class="fas fa-heart"></i>
        <i class="fas fa-heart"></i>
    `;
    document.getElementById('confetti-container').innerHTML = '';
    
    generateSudoku();
    renderBoard();
    renderNumberPlatform();
    checkNumberPlatform();
    startTimer();
}

// --- Initialize the Game ---
document.addEventListener('DOMContentLoaded', () => {
    playAgainBtn.addEventListener('click', resetGame);
    resetGame();
});
            
