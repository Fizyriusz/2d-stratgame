export function isVisibleOnScreen(game, x, y, size) {
    const screenX = (x - game.camera.x) * game.camera.scale + game.canvas.width / 2;
    const screenY = (y - game.camera.y) * game.camera.scale + game.canvas.height / 2;
    const scaledSize = size * game.camera.scale;
    return screenX + scaledSize >= 0 && screenX - scaledSize <= game.canvas.width && screenY + scaledSize >= 0 && screenY - scaledSize <= game.canvas.height;
}

export function getEntityAtPosition(game, x, y, faction) {
    for (let building of faction.buildings) {
        const halfWidth = building.width / 2;
        const halfHeight = building.height / 2;
        if (x >= building.x - halfWidth && x <= building.x + halfWidth && y >= building.y - halfHeight && y <= building.y + halfHeight) {
            return building;
        }
    }
    for (let unit of faction.units) {
        const dx = x - unit.x;
        const dy = y - unit.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= unit.size + 5) return unit;
    }
    return null;
}

export function getResourceAtPosition(game, x, y) {
    for (let tree of game.terrain.trees) {
        const dx = x - tree.x;
        const dy = y - tree.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= tree.size) return tree;
    }
    for (let mine of game.terrain.goldMines) {
        const dx = x - mine.x;
        const dy = y - mine.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= mine.size) return mine;
    }
    return null;
}