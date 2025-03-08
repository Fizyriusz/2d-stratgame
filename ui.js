export function initUI(game) {
    document.getElementById('buildTownHall').addEventListener('click', () => game.setBuildMode('townHall'));
    document.getElementById('buildHouse').addEventListener('click', () => game.setBuildMode('house'));
    document.getElementById('buildBarrack').addEventListener('click', () => game.setBuildMode('barrack'));
    document.getElementById('trainWorker').addEventListener('click', () => game.trainUnit('worker'));
    document.getElementById('trainWarrior').addEventListener('click', () => game.trainUnit('warrior'));
    document.getElementById('trainArcher').addEventListener('click', () => game.trainUnit('archer'));

    const buttons = document.querySelectorAll('.btn');
    const tooltip = document.getElementById('tooltip');
    buttons.forEach(button => {
        button.addEventListener('mouseover', (e) => {
            const rect = button.getBoundingClientRect();
            tooltip.textContent = button.getAttribute('data-tooltip');
            tooltip.style.display = 'block';
            tooltip.style.left = `${rect.left}px`;
            tooltip.style.top = `${rect.top - 30}px`;
        });
        button.addEventListener('mouseout', () => tooltip.style.display = 'none');
    });
}

export function updateUI(game) {
    document.getElementById('gold').textContent = game.player.gold;
    document.getElementById('wood').textContent = game.player.wood;
    document.getElementById('food').textContent = game.player.food;
    document.getElementById('population').textContent = `${game.player.population}/${game.player.populationLimit}`;
}

Game.prototype.setBuildMode = function(mode) {
    this.buildMode = mode;
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => button.classList.remove('selected'));
    document.getElementById(`build${mode.charAt(0).toUpperCase() + mode.slice(1)}`).classList.add('selected');
};

Game.prototype.trainUnit = function(type) {
    const costs = { 'worker': { gold: 50, wood: 0 }, 'warrior': { gold: 100, wood: 0 }, 'archer': { gold: 75, wood: 50 } };
    const stats = { 'worker': { size: 8, speed: 1.5, health: 50, attack: 5, range: 10, attackSpeed: 1 }, 'warrior': { size: 10, speed: 1.2, health: 100, attack: 15, range: 15, attackSpeed: 1 }, 'archer': { size: 9, speed: 1.3, health: 70, attack: 10, range: 100, attackSpeed: 0.8 } };
    const cost = costs[type];

    if (this.player.gold < cost.gold || this.player.wood < cost.wood || this.player.population >= this.player.populationLimit) return;

    const spawnBuilding = type === 'worker' ? this.player.buildings.find(b => b.type === 'townHall') : this.player.buildings.find(b => b.type === 'barrack');
    if (!spawnBuilding) return;

    this.player.units.push({ type, x: spawnBuilding.x + Math.random() * 60 - 30, y: spawnBuilding.y + Math.random() * 60 - 30, targetX: null, targetY: null, size: stats[type].size, speed: stats[type].speed, health: stats[type].health, maxHealth: stats[type].health, attack: stats[type].attack, range: stats[type].range, attackSpeed: stats[type].attackSpeed, lastAttack: 0, selected: false, task: null, taskTarget: null });
    this.player.gold -= cost.gold;
    this.player.wood -= cost.wood;
    this.player.population++;
};