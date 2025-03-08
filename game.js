import { generateTerrain, createInitialEntities, updateUnits, updateEnemyAI } from './entities.js';
import { updateUI, initUI } from './ui.js';
import { isVisibleOnScreen, getEntityAtPosition, getResourceAtPosition } from './utils.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.minimap = document.getElementById('minimap');
        this.minimapCtx = this.minimap.getContext('2d');

        this.worldWidth = 4000;
        this.worldHeight = 4000;

        this.camera = { x: this.worldWidth / 2, y: this.worldHeight / 2, width: 0, height: 0, scale: 1 };

        this.player = {
            gold: 500, wood: 300, food: 400, population: 10, populationLimit: 15, color: 'blue',
            buildings: [], units: []
        };
        this.enemy = {
            gold: 500, wood: 300, food: 400, population: 10, populationLimit: 15, color: 'red',
            buildings: [], units: []
        };

        this.terrain = { trees: [], goldMines: [] };
        this.buildMode = null;
        this.selectedUnits = [];

        this.mouse = {
            x: 0, y: 0, worldX: 0, worldY: 0, down: false, startX: 0, startY: 0,
            selectionBox: { startX: 0, startY: 0, endX: 0, endY: 0, active: false }
        };

        this.fps = 0;
        this.lastTimestamp = 0;
        this.fpsCounter = document.getElementById('fps-counter');
        this.gameOverScreen = document.getElementById('gameOverScreen');
        this.gameOverMessage = document.getElementById('gameOverMessage');
        this.resetButton = document.getElementById('resetButton');
        this.gameOver = false;

        this.init();
    }

    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.handleMouseWheel(e));
        this.minimap.addEventListener('mousedown', (e) => {
            const minimapRect = this.minimap.getBoundingClientRect();
            const minimapX = e.clientX - minimapRect.left;
            const minimapY = e.clientY - minimapRect.top;
            this.camera.x = (minimapX / this.minimap.width) * this.worldWidth;
            this.camera.y = (minimapY / this.minimap.height) * this.worldHeight;
        });
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));

        this.resetButton.addEventListener('click', () => this.resetGame());

        initUI(this);

        this.terrain = generateTerrain(this.worldWidth, this.worldHeight);
        createInitialEntities(this);
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight - 100;
        this.camera.width = this.canvas.width;
        this.camera.height = this.canvas.height;
    }

    gameLoop(timestamp) {
        const deltaTime = timestamp - this.lastTimestamp;
        this.lastTimestamp = timestamp;
        this.fps = Math.round(1000 / deltaTime);
        this.fpsCounter.textContent = `FPS: ${this.fps}`;
        if (!this.gameOver) {
            this.update(deltaTime);
            this.render();
        }
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    update(deltaTime) {
        updateUnits(this, this.player.units, this.enemy, deltaTime);
        updateUnits(this, this.enemy.units, this.player, deltaTime);
        updateEnemyAI(this, deltaTime);
        updateUI(this);
        this.checkVictoryConditions();
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.ctx.translate(-this.camera.x * this.camera.scale + this.canvas.width / 2, -this.camera.y * this.camera.scale + this.canvas.height / 2);
        this.ctx.scale(this.camera.scale, this.camera.scale);
        this.drawGrid();
        this.drawTerrain();
        this.drawEntities();
        if (this.mouse.selectionBox.active) this.drawSelectionBox();
        if (this.buildMode) this.drawBuildingGhost();
        this.ctx.restore();
        this.drawMinimap();
    }

    drawGrid() {
        const gridSize = 100;
        const startX = Math.floor(this.camera.x - this.camera.width / (2 * this.camera.scale) / gridSize) * gridSize;
        const startY = Math.floor(this.camera.y - this.camera.height / (2 * this.camera.scale) / gridSize) * gridSize;
        const endX = Math.ceil(this.camera.x + this.camera.width / (2 * this.camera.scale) / gridSize) * gridSize;
        const endY = Math.ceil(this.camera.y + this.camera.height / (2 * this.camera.scale) / gridSize) * gridSize;

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        for (let x = startX; x <= endX; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, endY);
            this.ctx.stroke();
        }
        for (let y = startY; y <= endY; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(endX, y);
            this.ctx.stroke();
        }
    }

    drawTerrain() {
        for (let tree of this.terrain.trees) {
            if (isVisibleOnScreen(this, tree.x, tree.y, tree.size)) {
                this.ctx.fillStyle = '#228B22';
                this.ctx.beginPath();
                this.ctx.arc(tree.x, tree.y, tree.size, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillStyle = '#8B4513';
                this.ctx.beginPath();
                this.ctx.arc(tree.x, tree.y, tree.size / 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        for (let mine of this.terrain.goldMines) {
            if (isVisibleOnScreen(this, mine.x, mine.y, mine.size)) {
                this.ctx.fillStyle = '#DAA520';
                this.ctx.beginPath();
                this.ctx.arc(mine.x, mine.y, mine.size, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillStyle = '#B8860B';
                this.ctx.beginPath();
                this.ctx.arc(mine.x, mine.y, mine.size * 0.7, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }

    drawEntities() {
        for (let building of this.player.buildings) {
            if (isVisibleOnScreen(this, building.x, building.y, building.width)) this.drawBuilding(building, this.player.color);
        }
        for (let building of this.enemy.buildings) {
            if (isVisibleOnScreen(this, building.x, building.y, building.width)) this.drawBuilding(building, this.enemy.color);
        }
        for (let unit of this.player.units) {
            if (isVisibleOnScreen(this, unit.x, unit.y, unit.size)) this.drawUnit(unit, this.player.color);
        }
        for (let unit of this.enemy.units) {
            if (isVisibleOnScreen(this, unit.x, unit.y, unit.size)) this.drawUnit(unit, this.enemy.color);
        }
    }

    drawBuilding(building, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(building.x - building.width / 2, building.y - building.height / 2, building.width, building.height);
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(building.x - building.width / 2, building.y - building.height / 2, building.width, building.height);
        this.drawHealthBar(building.x, building.y - building.height / 2 - 10, building.width, 5, building.health / building.maxHealth);
    }

    drawUnit(unit, color) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(unit.x, unit.y, unit.size, 0, Math.PI * 2);
        this.ctx.fill();
        if (unit.selected) {
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(unit.x, unit.y, unit.size + 2, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        this.drawHealthBar(unit.x, unit.y - unit.size - 5, unit.size * 2, 3, unit.health / unit.maxHealth);
    }

    drawHealthBar(x, y, width, height, percentage) {
        this.ctx.fillStyle = '#800000';
        this.ctx.fillRect(x - width / 2, y - height / 2, width, height);
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(x - width / 2, y - height / 2, width * percentage, height);
    }

    drawSelectionBox() {
        const { startX, startY, endX, endY } = this.mouse.selectionBox;
        const worldStartX = (startX - this.canvas.width / 2) / this.camera.scale + this.camera.x;
        const worldStartY = (startY - this.canvas.height / 2) / this.camera.scale + this.camera.y;
        const worldEndX = (endX - this.canvas.width / 2) / this.camera.scale + this.camera.x;
        const worldEndY = (endY - this.canvas.height / 2) / this.camera.scale + this.camera.y;
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(worldStartX, worldStartY, worldEndX - worldStartX, worldEndY - worldStartY);
    }

    drawBuildingGhost() {
        let width = { 'townHall': 80, 'house': 40, 'barrack': 60 }[this.buildMode];
        let height = width;
        const canBuild = this.canBuildAt(this.mouse.worldX, this.mouse.worldY, width, height);
        this.ctx.fillStyle = canBuild ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)';
        this.ctx.fillRect(this.mouse.worldX - width / 2, this.mouse.worldY - height / 2, width, height);
        this.ctx.strokeStyle = canBuild ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 0, 0, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(this.mouse.worldX - width / 2, this.mouse.worldY - height / 2, width, height);
    }

    drawMinimap() {
        this.minimapCtx.clearRect(0, 0, this.minimap.width, this.minimap.height);
        this.minimapCtx.fillStyle = '#0f380f';
        this.minimapCtx.fillRect(0, 0, this.minimap.width, this.minimap.height);
        const scaleX = this.minimap.width / this.worldWidth;
        const scaleY = this.minimap.height / this.worldHeight;

        this.minimapCtx.fillStyle = '#228B22';
        for (let tree of this.terrain.trees) this.minimapCtx.fillRect(tree.x * scaleX - 1, tree.y * scaleY - 1, 2, 2);
        this.minimapCtx.fillStyle = '#DAA520';
        for (let mine of this.terrain.goldMines) this.minimapCtx.fillRect(mine.x * scaleX - 2, mine.y * scaleY - 2, 4, 4);
        this.minimapCtx.fillStyle = this.player.color;
        for (let building of this.player.buildings) this.minimapCtx.fillRect((building.x - building.width / 2) * scaleX, (building.y - building.height / 2) * scaleY, building.width * scaleX, building.height * scaleY);
        this.minimapCtx.fillStyle = this.enemy.color;
        for (let building of this.enemy.buildings) this.minimapCtx.fillRect((building.x - building.width / 2) * scaleX, (building.y - building.height / 2) * scaleY, building.width * scaleX, building.height * scaleY);
        this.minimapCtx.fillStyle = this.player.color;
        for (let unit of this.player.units) this.minimapCtx.fillRect(unit.x * scaleX - 1, unit.y * scaleY - 1, 2, 2);
        this.minimapCtx.fillStyle = this.enemy.color;
        for (let unit of this.enemy.units) this.minimapCtx.fillRect(unit.x * scaleX - 1, unit.y * scaleY - 1, 2, 2);
        this.minimapCtx.strokeStyle = '#fff';
        this.minimapCtx.lineWidth = 1;
        const viewportX = (this.camera.x - this.camera.width / (2 * this.camera.scale)) * scaleX;
        const viewportY = (this.camera.y - this.camera.height / (2 * this.camera.scale)) * scaleY;
        const viewportWidth = (this.camera.width / this.camera.scale) * scaleX;
        const viewportHeight = (this.camera.height / this.camera.scale) * scaleY;
        this.minimapCtx.strokeRect(viewportX, viewportY, viewportWidth, viewportHeight);
    }

    handleMouseDown(e) {
        if (this.gameOver) return;
        this.mouse.down = true;
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        this.mouse.startX = mouseX;
        this.mouse.startY = mouseY;
        this.mouse.selectionBox = { startX: mouseX, startY: mouseY, endX: mouseX, endY: mouseY, active: true };
        this.mouse.worldX = (mouseX - this.canvas.width / 2) / this.camera.scale + this.camera.x;
        this.mouse.worldY = (mouseY - this.canvas.height / 2) / this.camera.scale + this.camera.y;

        const minimapRect = this.minimap.getBoundingClientRect();
        if (e.clientX >= minimapRect.left && e.clientX <= minimapRect.right && e.clientY >= minimapRect.top && e.clientY <= minimapRect.bottom) {
            this.mouse.selectionBox.active = false;
            return;
        }

        if (this.buildMode) {
            this.tryBuildBuilding();
            return;
        }
        if (e.button === 2) {
            this.issueOrderToSelectedUnits();
            return;
        }
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        this.mouse.x = mouseX;
        this.mouse.y = mouseY;
        this.mouse.worldX = (mouseX - this.canvas.width / 2) / this.camera.scale + this.camera.x;
        this.mouse.worldY = (mouseY - this.canvas.height / 2) / this.camera.scale + this.camera.y;
        if (this.mouse.down && this.mouse.selectionBox.active) {
            this.mouse.selectionBox.endX = mouseX;
            this.mouse.selectionBox.endY = mouseY;
        }
    }

    handleMouseUp(e) {
        this.mouse.down = false;
        if (this.mouse.selectionBox.active) {
            this.selectUnitsInSelectionBox();
            this.mouse.selectionBox.active = false;
        }
    }

    handleMouseWheel(e) {
        e.preventDefault();
        const zoomAmount = 0.1;
        const prevScale = this.camera.scale;
        if (e.deltaY < 0) this.camera.scale = Math.min(prevScale * (1 + zoomAmount), 2.0);
        else this.camera.scale = Math.max(prevScale * (1 - zoomAmount), 0.5);
    }

    handleKeyDown(e) {
        switch (e.key) {
            case 'Escape':
                this.buildMode = null;
                for (let unit of this.player.units) unit.selected = false;
                this.selectedUnits = [];
                break;
            case 'ArrowUp':
            case 'w': this.camera.y -= 20 / this.camera.scale; break;
            case 'ArrowDown':
            case 's': this.camera.y += 20 / this.camera.scale; break;
            case 'ArrowLeft':
            case 'a': this.camera.x -= 20 / this.camera.scale; break;
            case 'ArrowRight':
            case 'd': this.camera.x += 20 / this.camera.scale; break;
        }
        this.camera.x = Math.max(0, Math.min(this.worldWidth, this.camera.x));
        this.camera.y = Math.max(0, Math.min(this.worldHeight, this.camera.y));
    }

    selectUnitsInSelectionBox() {
        for (let unit of this.player.units) unit.selected = false;
        this.selectedUnits = [];
        const { startX, startY, endX, endY } = this.mouse.selectionBox;
        const worldStartX = (startX - this.canvas.width / 2) / this.camera.scale + this.camera.x;
        const worldStartY = (startY - this.canvas.height / 2) / this.camera.scale + this.camera.y;
        const worldEndX = (endX - this.canvas.width / 2) / this.camera.scale + this.camera.x;
        const worldEndY = (endY - this.canvas.height / 2) / this.camera.scale + this.camera.y;
        const left = Math.min(worldStartX, worldEndX);
        const right = Math.max(worldStartX, worldEndX);
        const top = Math.min(worldStartY, worldEndY);
        const bottom = Math.max(worldStartY, worldEndY);
        for (let unit of this.player.units) {
            if (unit.x >= left && unit.x <= right && unit.y >= top && unit.y <= bottom) {
                unit.selected = true;
                this.selectedUnits.push(unit);
            }
        }
    }

    issueOrderToSelectedUnits() {
        if (this.selectedUnits.length === 0) return;
        let targetEnemy = getEntityAtPosition(this, this.mouse.worldX, this.mouse.worldY, this.enemy);

        if (targetEnemy) {
            for (let unit of this.selectedUnits) {
                unit.task = 'attack';
                unit.taskTarget = targetEnemy;
                const freePos = this.findFreePositionAroundTarget(targetEnemy, unit, [...this.player.units, ...this.enemy.units]);
                unit.targetX = freePos.x;
                unit.targetY = freePos.y;
            }
            return;
        }

        let targetResource = getResourceAtPosition(this, this.mouse.worldX, this.mouse.worldY);
        if (targetResource) {
            for (let unit of this.selectedUnits) {
                if (unit.type === 'worker') {
                    unit.task = 'gather';
                    unit.taskTarget = targetResource;
                    unit.targetX = targetResource.x;
                    unit.targetY = targetResource.y;
                }
            }
            return;
        }

        for (let unit of this.selectedUnits) {
            const offsetX = Math.random() * 40 - 20;
            const offsetY = Math.random() * 40 - 20;
            unit.targetX = this.mouse.worldX + offsetX;
            unit.targetY = this.mouse.worldY + offsetY;
            unit.task = null;
            unit.taskTarget = null;
        }
    }

    findFreePositionAroundTarget(target, unit, allUnits) {
        const isBuilding = !target.type;
        const targetSize = isBuilding ? (target.width / 2 + unit.range + 10) : (target.size + unit.range + 10);
        const angleStep = Math.PI / 8;
        let foundPosition = null;

        for (let angle = 0; angle < 2 * Math.PI; angle += angleStep) {
            const testX = target.x + Math.cos(angle) * targetSize;
            const testY = target.y + Math.sin(angle) * targetSize;
            let isFree = true;

            for (let otherUnit of allUnits) {
                if (otherUnit === unit) continue;
                const dx = testX - otherUnit.x;
                const dy = testY - otherUnit.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < unit.size + otherUnit.size + 5) {
                    isFree = false;
                    break;
                }
            }

            if (isFree) {
                foundPosition = { x: testX, y: testY };
                break;
            }
        }

        return foundPosition || { x: target.x + (Math.random() * 20 - 10), y: target.y + (Math.random() * 20 - 10) };
    }

    checkVictoryConditions() {
        const playerTownHalls = this.player.buildings.filter(b => b.type === 'townHall').length;
        const enemyTownHalls = this.enemy.buildings.filter(b => b.type === 'townHall').length;

        if (enemyTownHalls === 0) this.endGame(true);
        else if (playerTownHalls === 0) this.endGame(false);
    }

    endGame(playerWon) {
        this.gameOver = true;
        this.gameOverMessage.textContent = playerWon ? 'Wygrałeś!' : 'Przegrałeś!';
        this.gameOverScreen.style.display = 'flex';
    }

    resetGame() {
        this.gameOver = false;
        this.gameOverScreen.style.display = 'none';
        this.player = { gold: 500, wood: 300, food: 400, population: 10, populationLimit: 15, color: 'blue', buildings: [], units: [] };
        this.enemy = { gold: 500, wood: 300, food: 400, population: 10, populationLimit: 15, color: 'red', buildings: [], units: [] };
        this.terrain = { trees: [], goldMines: [] };
        this.buildMode = null;
        this.selectedUnits = [];
        this.terrain = generateTerrain(this.worldWidth, this.worldHeight);
        createInitialEntities(this);
    }

    tryBuildBuilding() {
        const costs = { 'townHall': { gold: 300, wood: 200 }, 'house': { gold: 100, wood: 150 }, 'barrack': { gold: 200, wood: 150 } };
        const sizes = { 'townHall': 80, 'house': 40, 'barrack': 60 };
        const cost = costs[this.buildMode];
        const width = sizes[this.buildMode];
        const height = width;

        if (this.player.gold < cost.gold || this.player.wood < cost.wood) return;
        if (!this.canBuildAt(this.mouse.worldX, this.mouse.worldY, width, height)) return;

        const health = { 'townHall': 1000, 'house': 300, 'barrack': 500 }[this.buildMode];
        this.player.buildings.push({ type: this.buildMode, x: this.mouse.worldX, y: this.mouse.worldY, width, height, health, maxHealth: health });
        this.player.gold -= cost.gold;
        this.player.wood -= cost.wood;
        if (this.buildMode === 'house') this.player.populationLimit += 5;
        this.buildMode = null;
        document.querySelectorAll('.btn').forEach(button => button.classList.remove('selected'));
    }

    canBuildAt(x, y, width, height) {
        if (x - width / 2 < 0 || x + width / 2 > this.worldWidth || y - height / 2 < 0 || y + height / 2 > this.worldHeight) return false;
        for (let building of [...this.player.buildings, ...this.enemy.buildings]) {
            if (x + width / 2 > building.x - building.width / 2 && x - width / 2 < building.x + building.width / 2 &&
                y + height / 2 > building.y - building.height / 2 && y - height / 2 < building.y + building.height / 2) return false;
        }
        for (let tree of this.terrain.trees) {
            if (x + width / 2 > tree.x - tree.size && x - width / 2 < tree.x + tree.size &&
                y + height / 2 > tree.y - tree.size && y - height / 2 < tree.y + tree.size) return false;
        }
        for (let mine of this.terrain.goldMines) {
            if (x + width / 2 > mine.x - mine.size && x - width / 2 < mine.x + mine.size &&
                y + height / 2 > mine.y - mine.size && y - height / 2 < mine.y + mine.size) return false;
        }
        return true;
    }
}