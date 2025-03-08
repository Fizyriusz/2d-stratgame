export function generateTerrain(worldWidth, worldHeight) {
    const terrain = { trees: [], goldMines: [] };
    for (let i = 0; i < 200; i++) {
        terrain.trees.push({
            x: Math.random() * worldWidth,
            y: Math.random() * worldHeight,
            size: 10 + Math.random() * 10,
            resources: 100 + Math.floor(Math.random() * 100)
        });
    }
    for (let i = 0; i < 20; i++) {
        terrain.goldMines.push({
            x: Math.random() * worldWidth,
            y: Math.random() * worldHeight,
            size: 30,
            resources: 1000 + Math.floor(Math.random() * 1000)
        });
    }
    return terrain;
}

export function createInitialEntities(game) {
    game.player.buildings.push({ type: 'townHall', x: game.worldWidth / 4, y: game.worldHeight / 2, width: 80, height: 80, health: 1000, maxHealth: 1000 });
    game.player.buildings.push({ type: 'house', x: game.worldWidth / 4 - 100, y: game.worldHeight / 2, width: 40, height: 40, health: 300, maxHealth: 300 });
    game.player.populationLimit += 5;

    game.player.units = [
        ...Array(3).fill().map(() => ({ type: 'worker', x: game.worldWidth / 4 + Math.random() * 60 - 30, y: game.worldHeight / 2 + Math.random() * 60 - 30, targetX: null, targetY: null, size: 8, speed: 1.5, health: 50, maxHealth: 50, attack: 5, range: 10, attackSpeed: 1, lastAttack: 0, selected: false, task: null, taskTarget: null })),
        ...Array(2).fill().map(() => ({ type: 'archer', x: game.worldWidth / 4 - 100 + Math.random() * 40 - 20, y: game.worldHeight / 2 + Math.random() * 40 - 20, targetX: null, targetY: null, size: 9, speed: 1.3, health: 70, maxHealth: 70, attack: 10, range: 100, attackSpeed: 0.8, lastAttack: 0, selected: false, task: null, taskTarget: null })),
        ...Array(3).fill().map(() => ({ type: 'warrior', x: game.worldWidth / 4 - 100 + Math.random() * 40 - 20, y: game.worldHeight / 2 + 50 + Math.random() * 40 - 20, targetX: null, targetY: null, size: 10, speed: 1.2, health: 100, maxHealth: 100, attack: 15, range: 15, attackSpeed: 1, lastAttack: 0, selected: false, task: null, taskTarget: null }))
    ];

    game.enemy.buildings.push({ type: 'townHall', x: (game.worldWidth / 4) * 3, y: game.worldHeight / 2, width: 80, height: 80, health: 1000, maxHealth: 1000 });
    game.enemy.buildings.push({ type: 'house', x: (game.worldWidth / 4) * 3 + 100, y: game.worldHeight / 2, width: 40, height: 40, health: 300, maxHealth: 300 });
    game.enemy.populationLimit += 5;

    game.enemy.units = [
        ...Array(3).fill().map(() => ({ type: 'worker', x: (game.worldWidth / 4) * 3 + Math.random() * 60 - 30, y: game.worldHeight / 2 + Math.random() * 60 - 30, targetX: null, targetY: null, size: 8, speed: 1.5, health: 50, maxHealth: 50, attack: 5, range: 10, attackSpeed: 1, lastAttack: 0, task: null, taskTarget: null })),
        ...Array(2).fill().map(() => ({ type: 'archer', x: (game.worldWidth / 4) * 3 + 100 + Math.random() * 40 - 20, y: game.worldHeight / 2 + Math.random() * 40 - 20, targetX: null, targetY: null, size: 9, speed: 1.3, health: 70, maxHealth: 70, attack: 10, range: 100, attackSpeed: 0.8, lastAttack: 0, task: null, taskTarget: null })),
        ...Array(3).fill().map(() => ({ type: 'warrior', x: (game.worldWidth / 4) * 3 + 100 + Math.random() * 40 - 20, y: game.worldHeight / 2 + 50 + Math.random() * 40 - 20, targetX: null, targetY: null, size: 10, speed: 1.2, health: 100, maxHealth: 100, attack: 15, range: 15, attackSpeed: 1, lastAttack: 0, task: null, taskTarget: null }))
    ];

    game.player.population = game.player.units.length;
    game.enemy.population = game.enemy.units.length;
}

export function updateUnits(game, units, opponent, deltaTime) {
    const timestamp = Date.now();
    const allUnits = [...game.player.units, ...game.enemy.units];

    for (let unit of units) {
        if (!unit.task && units === game.enemy.units) {
            for (let enemyUnit of opponent.units) {
                if (enemyUnit.task === 'attack' && enemyUnit.taskTarget === unit) {
                    unit.task = 'attack';
                    unit.taskTarget = enemyUnit;
                    break;
                }
            }
        }

        if (unit.targetX !== null && unit.targetY !== null) {
            const dx = unit.targetX - unit.x;
            const dy = unit.targetY - unit.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const speed = unit.speed * (deltaTime / 16);

            let moveX = 0, moveY = 0;
            if (distance > 5) {
                moveX = (dx / distance) * Math.min(speed, distance);
                moveY = (dy / distance) * Math.min(speed, distance);
            }

            let collision = false;
            for (let otherUnit of allUnits) {
                if (unit === otherUnit) continue;
                const odx = otherUnit.x - (unit.x + moveX);
                const ody = otherUnit.y - (unit.y + moveY);
                const odistance = Math.sqrt(odx * odx + ody * ody);
                if (odistance < unit.size + otherUnit.size) {
                    collision = true;
                    const overlap = unit.size + otherUnit.size - odistance;
                    const pushX = (odx / odistance) * overlap * 0.3;
                    const pushY = (ody / odistance) * overlap * 0.3;
                    unit.x -= pushX;
                    unit.y -= pushY;
                    otherUnit.x += pushX;
                    otherUnit.y += pushY;
                }
            }

            if (!collision && distance > 5) {
                unit.x += moveX;
                unit.y += moveY;
            } else if (distance <= 5) {
                unit.targetX = null;
                unit.targetY = null;
            }
        }

        if (unit.task === 'attack' && unit.taskTarget) {
            const target = unit.taskTarget;
            let targetExists = false;
            let isBuilding = false;

            if (target.type && opponent.units.includes(target)) targetExists = true;
            else if (opponent.buildings.includes(target)) {
                targetExists = true;
                isBuilding = true;
            }

            if (!targetExists) {
                unit.task = null;
                unit.taskTarget = null;
                continue;
            }

            const dx = target.x - unit.x;
            const dy = target.y - unit.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const targetSize = isBuilding ? (target.width / 2) : (target.size || 10);
            const attackRange = unit.type === 'archer' ? 100 : unit.range;

            if (distance <= attackRange + targetSize) {
                unit.targetX = unit.x;
                unit.targetY = unit.y;

                if (timestamp - unit.lastAttack > 1000 / unit.attackSpeed) {
                    target.health -= unit.attack;
                    unit.lastAttack = timestamp;

                    if (target.health <= 0) {
                        if (isBuilding) {
                            const index = opponent.buildings.indexOf(target);
                            if (index > -1) {
                                opponent.buildings.splice(index, 1);
                                if (target.type === 'house') opponent.populationLimit -= 5;
                            }
                        } else {
                            const index = opponent.units.indexOf(target);
                            if (index > -1) {
                                opponent.units.splice(index, 1);
                                opponent.population--;
                            }
                        }
                        unit.task = null;
                        unit.taskTarget = null;
                    }
                }
            } else {
                const freePos = game.findFreePositionAroundTarget(target, unit, allUnits);
                unit.targetX = freePos.x;
                unit.targetY = freePos.y;
            }
        } else if (unit.task === 'gather' && unit.taskTarget) {
            const target = unit.taskTarget;
            let resourceExists = game.terrain.trees.includes(target) || game.terrain.goldMines.includes(target);

            if (!resourceExists) {
                unit.task = null;
                unit.taskTarget = null;
                continue;
            }

            const dx = target.x - unit.x;
            const dy = target.y - unit.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= 20) {
                if (timestamp - unit.lastAttack > 1000) {
                    target.resources -= 5;
                    if (units === game.player.units) {
                        if (game.terrain.trees.includes(target)) game.player.wood += 5;
                        else game.player.gold += 5;
                    } else {
                        if (game.terrain.trees.includes(target)) game.enemy.wood += 5;
                        else game.enemy.gold += 5;
                    }
                    unit.lastAttack = timestamp;
                    if (target.resources <= 0) {
                        const array = game.terrain.trees.includes(target) ? game.terrain.trees : game.terrain.goldMines;
                        const index = array.indexOf(target);
                        if (index > -1) array.splice(index, 1);
                        unit.task = null;
                        unit.taskTarget = null;
                    }
                }
            } else {
                unit.targetX = target.x;
                unit.targetY = target.y;
            }
        }
    }
}

export function updateEnemyAI(game, deltaTime) {
    if (game.enemy.buildings.length < 5 && game.enemy.gold >= 200 && game.enemy.wood >= 150) {
        const townHall = game.enemy.buildings.find(b => b.type === 'townHall');
        if (townHall) {
            game.enemy.buildings.push({ type: 'house', x: townHall.x + Math.random() * 200 - 100, y: townHall.y + Math.random() * 200 - 100, width: 40, height: 40, health: 300, maxHealth: 300 });
            game.enemy.gold -= 100;
            game.enemy.wood -= 150;
            game.enemy.populationLimit += 5;
        }
    }

    if (game.enemy.population < game.enemy.populationLimit && game.enemy.gold >= 50) {
        const townHall = game.enemy.buildings.find(b => b.type === 'townHall');
        if (townHall) {
            const types = ['worker', 'warrior', 'archer'];
            const type = Math.random() < 0.7 || game.enemy.units.length < 5 ? 'worker' : types[Math.floor(Math.random() * 2) + 1];
            const costs = { worker: { gold: 50, wood: 0 }, warrior: { gold: 100, wood: 0 }, archer: { gold: 75, wood: 50 } };
            const stats = { worker: { size: 8, speed: 1.5, health: 50, attack: 5, range: 10, attackSpeed: 1 }, warrior: { size: 10, speed: 1.2, health: 100, attack: 15, range: 15, attackSpeed: 1 }, archer: { size: 9, speed: 1.3, health: 70, attack: 10, range: 100, attackSpeed: 0.8 } };
            if (game.enemy.gold >= costs[type].gold && game.enemy.wood >= costs[type].wood) {
                game.enemy.units.push({ type, x: townHall.x + Math.random() * 60 - 30, y: townHall.y + Math.random() * 60 - 30, targetX: null, targetY: null, size: stats[type].size, speed: stats[type].speed, health: stats[type].health, maxHealth: stats[type].health, attack: stats[type].attack, range: stats[type].range, attackSpeed: stats[type].attackSpeed, lastAttack: 0, task: null, taskTarget: null });
                game.enemy.gold -= costs[type].gold;
                game.enemy.wood -= costs[type].wood;
                game.enemy.population++;
            }
        }
    }

    for (let unit of game.enemy.units) {
        if (!unit.task) {
            if (unit.type === 'worker') {
                const target = Math.random() < 0.5 && game.terrain.trees.length > 0 ? game.terrain.trees : game.terrain.goldMines;
                if (target.length > 0) {
                    const nearest = target.reduce((min, curr) => {
                        const dist = Math.sqrt((curr.x - unit.x) ** 2 + (curr.y - unit.y) ** 2);
                        return dist < Math.sqrt((min.x - unit.x) ** 2 + (min.y - unit.y) ** 2) ? curr : min;
                    }, target[0]);
                    unit.task = 'gather';
                    unit.taskTarget = nearest;
                    unit.targetX = nearest.x;
                    unit.targetY = nearest.y;
                }
            } else {
                const targetArray = Math.random() < 0.8 && game.player.units.length > 0 ? game.player.units : game.player.buildings;
                if (targetArray.length > 0) {
                    const target = targetArray[Math.floor(Math.random() * targetArray.length)];
                    unit.task = 'attack';
                    unit.taskTarget = target;
                    const freePos = game.findFreePositionAroundTarget(target, unit, [...game.player.units, ...game.enemy.units]);
                    unit.targetX = freePos.x;
                    unit.targetY = freePos.y;
                }
            }
        }
    }
}