import { elements } from './ui.js';
import { sendMove, sendShoot, sendDestroyAsteroid, sendKill, sendHit } from './network.js';
import { playHitSound } from './audio.js';

export const canvas = document.getElementById('gameCanvas');
export const ctx = canvas.getContext('2d');

export let myUsername = "Anonymous";
export function setUsername(name) { myUsername = name; }

export let myPlayer = {
    x: Math.floor(Math.random() * (1280 - 60)) + 30,
    y: Math.floor(Math.random() * (800 - 60)) + 30,
    color: '#3b82f6',
    radius: 35,
    angle: 0,
    vx: 0,
    vy: 0,
    shipType: 'blue',
    thrusting: false,
    health: 3
};

export const otherPlayers = {};
export const missiles = [];
export const asteroids = [];
export const scores = {};

const stars = [];
for (let i = 0; i < 200; i++) {
    stars.push({ x: Math.random() * 1280, y: Math.random() * 800, z: Math.random() * 3 + 1 });
}

export function spawnMissile(username, x, y, angle) {
    missiles.push({ username, x, y, angle, speed: 7.0, active: true });
}

const keys = {};
window.addEventListener('keydown', (e) => {
    if (document.activeElement !== elements.messageInput && document.activeElement !== elements.usernameInput) {
        keys[e.key] = true;
        if (e.code) keys[e.code] = true;
    }
});
window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
    if (e.code) keys[e.code] = false;
});

let lastShootTime = 0;
window.addEventListener('keydown', (e) => {
    if (document.activeElement !== elements.messageInput && document.activeElement !== elements.usernameInput) {
        if (e.key === ' ' || e.key === 'Spacebar') {
            const now = Date.now();
            if (now - lastShootTime > 2000) {
                lastShootTime = now;
                spawnMissile(myUsername, myPlayer.x, myPlayer.y, myPlayer.angle);
                sendShoot(myPlayer.x, myPlayer.y, myPlayer.angle);
            }
        }
    }
});

canvas.addEventListener('mousedown', (e) => {
    if (elements.lobbyOverlay.style.display !== 'none') return;
    const now = Date.now();
    if (now - lastShootTime >= 2000) {
        lastShootTime = now;
        spawnMissile(myUsername, myPlayer.x, myPlayer.y, myPlayer.angle);
        sendShoot(myPlayer.x, myPlayer.y, myPlayer.angle);
    }
});

const blueShipImg = new Image(); blueShipImg.src = 'blue_ship.png';
const redShipImg = new Image(); redShipImg.src = 'red_ship.png';
let blueShipCanvas = null;
let redShipCanvas = null;

const torpedoImg = new Image(); torpedoImg.src = 'torpedo.png';
let torpedoCanvas = null;
torpedoImg.onload = () => { torpedoCanvas = processShipImage(torpedoImg); };

const asteroidImg = new Image(); asteroidImg.src = 'asteroid.png';
let asteroidCanvas = null;
function processAsteroidImage(img) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(img, 0, 0);
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;
    
    const w = tempCanvas.width;
    const h = tempCanvas.height;
    const stack = [[0, 0], [w-1, 0], [0, h-1], [w-1, h-1]]; // Start from all 4 corners
    const visited = new Uint8Array(w * h);
    
    const threshold = 30; // Anything darker than this is considered background
    
    while (stack.length > 0) {
        const [x, y] = stack.pop();
        if (x < 0 || x >= w || y < 0 || y >= h) continue;
        const idx = y * w + x;
        if (visited[idx]) continue;
        visited[idx] = 1;
        
        const px = idx * 4;
        if (data[px] < threshold && data[px+1] < threshold && data[px+2] < threshold) {
            data[px+3] = 0; // Make transparent
            stack.push([x + 1, y]);
            stack.push([x - 1, y]);
            stack.push([x, y + 1]);
            stack.push([x, y - 1]);
        }
    }
    
    tempCtx.putImageData(imageData, 0, 0);
    return tempCanvas;
}

asteroidImg.onload = () => { asteroidCanvas = processAsteroidImage(asteroidImg); };

blueShipImg.onload = () => { blueShipCanvas = processShipImage(blueShipImg); };
redShipImg.onload = () => { redShipCanvas = processShipImage(redShipImg); };

function processShipImage(img) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(img, 0, 0);
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        if (data[i] < 20 && data[i+1] < 20 && data[i+2] < 20) data[i+3] = 0;
    }
    tempCtx.putImageData(imageData, 0, 0);
    return tempCanvas;
}

function drawFlame(ctx, radius) {
    const flameLength = radius * (1.5 + Math.random() * 1.5);
    const flameWidth = radius * 0.8;
    const attachY = radius * 1.2;
    
    ctx.beginPath();
    ctx.moveTo(0, attachY + flameLength);
    ctx.lineTo(-flameWidth / 2, attachY);
    ctx.lineTo(flameWidth / 2, attachY);
    ctx.closePath();
    
    const gradient = ctx.createLinearGradient(0, attachY, 0, attachY + flameLength);
    gradient.addColorStop(0, "rgba(255, 150, 0, 0.9)");
    gradient.addColorStop(1, "rgba(255, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(0, attachY + flameLength * 0.5);
    ctx.lineTo(-flameWidth / 4, attachY);
    ctx.lineTo(flameWidth / 4, attachY);
    ctx.closePath();
    ctx.fillStyle = "rgba(255, 255, 200, 0.9)";
    ctx.fill();
}

let lastSentX = 0;
let lastSentY = 0;
let lastSentAngle = 0;
let lastSentThrusting = false;
let lastSentHealth = 3;
let lastSendTime = 0;

function updatePlayerPhysics() {
    const accel = 0.1;
    const friction = 0.98;

    let inputX = 0;
    let inputY = 0;

    if (keys['ArrowUp'] || keys['w'] || keys['W'] || keys['KeyW']) inputY -= 1;
    if (keys['ArrowDown'] || keys['s'] || keys['S'] || keys['KeyS']) inputY += 1;
    if (keys['ArrowLeft'] || keys['a'] || keys['A'] || keys['KeyA']) inputX -= 1;
    if (keys['ArrowRight'] || keys['d'] || keys['D'] || keys['KeyD']) inputX += 1;

    if (inputX !== 0 || inputY !== 0) {
        const length = Math.sqrt(inputX * inputX + inputY * inputY);
        inputX /= length;
        inputY /= length;
    }

    myPlayer.thrusting = (inputX !== 0 || inputY !== 0);
    myPlayer.vx += inputX * accel;
    myPlayer.vy += inputY * accel;
    myPlayer.vx *= friction;
    myPlayer.vy *= friction;
    myPlayer.x += myPlayer.vx;
    myPlayer.y += myPlayer.vy;

    const speedSq = myPlayer.vx * myPlayer.vx + myPlayer.vy * myPlayer.vy;
    if (speedSq > 0.01) {
        const targetAngle = Math.atan2(myPlayer.vy, myPlayer.vx);
        let diff = targetAngle - myPlayer.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        myPlayer.angle += diff * 0.1;
    }

    const visualRadius = myPlayer.radius * 2.5;
    myPlayer.x = Math.max(visualRadius, Math.min(canvas.width - visualRadius, myPlayer.x));
    myPlayer.y = Math.max(visualRadius, Math.min(canvas.height - visualRadius, myPlayer.y));

    const now = Date.now();
    if (now - lastSendTime > 50) {
        if (myPlayer.thrusting !== lastSentThrusting || Math.abs(myPlayer.x - lastSentX) > 0.5 || Math.abs(myPlayer.y - lastSentY) > 0.5 || Math.abs(myPlayer.angle - lastSentAngle) > 0.1 || myPlayer.health !== lastSentHealth) {
            sendMove(myPlayer.x, myPlayer.y, myPlayer.angle, myPlayer.thrusting, myPlayer.health, myPlayer.vx, myPlayer.vy);
            lastSentX = myPlayer.x;
            lastSentY = myPlayer.y;
            lastSentAngle = myPlayer.angle;
            lastSentThrusting = myPlayer.thrusting;
            lastSentHealth = myPlayer.health;
            lastSendTime = now;
        }
    }
}

function drawParallaxBackground() {
    ctx.fillStyle = '#fff';
    stars.forEach(s => {
        // Static starfield
        if (s.x < 0) s.x += 1280;
        if (s.x > 1280) s.x -= 1280;
        if (s.y < 0) s.y += 800;
        if (s.y > 800) s.y -= 800;
        const size = 4 / s.z;
        ctx.fillRect(s.x, s.y, size, size);
    });
}

function drawOtherPlayers() {
    for (const username in otherPlayers) {
        const p = otherPlayers[username];
        const shipCanvas = p.shipType === 'red' ? redShipCanvas : blueShipCanvas;
        
        if (shipCanvas) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.angle !== undefined ? p.angle : -Math.PI / 2) + Math.PI / 2);
            if (p.thrusting) drawFlame(ctx, myPlayer.radius * 0.5);
            ctx.drawImage(shipCanvas, -myPlayer.radius, -myPlayer.radius, myPlayer.radius * 2, myPlayer.radius * 2);
            ctx.restore();
        } else {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 35, 0, Math.PI * 2);
            ctx.fillStyle = p.shipType === 'red' ? '#ef4444' : '#3b82f6';
            ctx.fill();
            ctx.closePath();
        }

        const hp = p.health !== undefined ? p.health : 3;
        for (let i = 0; i < hp; i++) {
            ctx.fillStyle = '#22c55e';
            ctx.beginPath();
            ctx.arc(p.x - 10 + i * 10, p.y - 45, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = '#f8fafc';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(username, p.x, p.y - 55);
    }
}

function drawLocalPlayer() {
    const myShipCanvasToDraw = myPlayer.shipType === 'red' ? redShipCanvas : blueShipCanvas;
    if (myShipCanvasToDraw) {
        ctx.save();
        ctx.translate(myPlayer.x, myPlayer.y);
        ctx.rotate(myPlayer.angle + Math.PI / 2);
        if (myPlayer.thrusting) drawFlame(ctx, myPlayer.radius * 0.5);
        ctx.drawImage(myShipCanvasToDraw, -myPlayer.radius, -myPlayer.radius, myPlayer.radius * 2, myPlayer.radius * 2);
        ctx.restore();
    } else {
        ctx.beginPath();
        ctx.arc(myPlayer.x, myPlayer.y, myPlayer.radius, 0, Math.PI * 2);
        ctx.fillStyle = myPlayer.color;
        ctx.fill();
        ctx.closePath();
    }

    for (let i = 0; i < myPlayer.health; i++) {
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(myPlayer.x - 10 + i * 10, myPlayer.y - 45, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    const now = Date.now();
    const elapsed = now - lastShootTime;
    if (elapsed < 2000) {
        const progress = elapsed / 2000;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(myPlayer.x - 15, myPlayer.y + 40, 30, 4);
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(myPlayer.x - 15, myPlayer.y + 40, 30 * progress, 4);
    }

    ctx.fillStyle = '#f8fafc';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(myUsername, myPlayer.x, myPlayer.y - 55);
}

function updateMissiles() {
    for (let i = missiles.length - 1; i >= 0; i--) {
        const m = missiles[i];
        m.x += Math.cos(m.angle) * m.speed;
        m.y += Math.sin(m.angle) * m.speed;
        
        let hitAsteroid = false;
        for (let j = asteroids.length - 1; j >= 0; j--) {
            const ast = asteroids[j];
            const dx = ast.x - m.x;
            const dy = ast.y - m.y;
            if ((dx * dx + dy * dy) < (20 + 10) * (20 + 10)) {
                hitAsteroid = true;
                asteroids.splice(j, 1);
                sendDestroyAsteroid(ast.id);
                playHitSound();
                break;
            }
        }
        if (hitAsteroid) {
            m.active = false;
            missiles.splice(i, 1);
            continue;
        }

        if (m.username === myUsername && m.active) {
            let hitVictim = null;
            for (const username in otherPlayers) {
                const p = otherPlayers[username];
                const dx = p.x - m.x;
                const dy = p.y - m.y;
                if ((dx * dx + dy * dy) < (35 + 10) * (35 + 10)) {
                    hitVictim = username;
                    break;
                }
            }
            if (hitVictim) {
                m.active = false;
                missiles.splice(i, 1);
                sendHit(hitVictim, m.username);
                playHitSound();
                continue;
            }
        }

        if (m.x < 0 || m.x > canvas.width || m.y < 0 || m.y > canvas.height) {
            missiles.splice(i, 1);
            continue;
        }
    }
}

function drawMissiles() {
    for (const m of missiles) {
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.rotate(m.angle + Math.PI);
        if (torpedoCanvas) {
            ctx.drawImage(torpedoCanvas, -16, -8, 32, 16); 
        } else {
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(-5, -2, 10, 4);
        }
        ctx.restore();
    }
}

function updateAsteroids() {
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const ast = asteroids[i];
        ast.x += ast.vx;
        ast.y += ast.vy;
        
        if (ast.x < -200 || ast.x > canvas.width + 200 || ast.y < -200 || ast.y > canvas.height + 200) {
            asteroids.splice(i, 1);
            continue;
        }
        
        const dx = myPlayer.x - ast.x;
        const dy = myPlayer.y - ast.y;
        if ((dx * dx + dy * dy) < (myPlayer.radius + 20) * (myPlayer.radius + 20)) {
            asteroids.splice(i, 1);
            sendDestroyAsteroid(ast.id);
            playHitSound();
            
            myPlayer.health--;
            if (myPlayer.health <= 0) {
                myPlayer.health = 3;
                myPlayer.x = Math.floor(Math.random() * (1280 - 60)) + 30;
                myPlayer.y = Math.floor(Math.random() * (800 - 60)) + 30;
                myPlayer.vx = 0;
                myPlayer.vy = 0;
            }
            sendMove(myPlayer.x, myPlayer.y, myPlayer.angle, myPlayer.thrusting, myPlayer.health, myPlayer.vx, myPlayer.vy);
            continue;
        }
        
        let hitOther = false;
        for (const username in otherPlayers) {
            const p = otherPlayers[username];
            const pdx = p.x - ast.x;
            const pdy = p.y - ast.y;
            if ((pdx * pdx + pdy * pdy) < (35 + 20) * (35 + 20)) {
                hitOther = true;
                break;
            }
        }
        if (hitOther) {
            asteroids.splice(i, 1);
            continue;
        }
    }
}

function drawAsteroids() {
    for (const ast of asteroids) {
        ctx.save();
        ctx.translate(ast.x, ast.y);
        ctx.rotate(ast.x * 0.02 + ast.y * 0.02);
        if (asteroidCanvas) {
            ctx.drawImage(asteroidCanvas, -25, -25, 50, 50);
        } else {
            ctx.fillStyle = '#888';
            ctx.beginPath();
            ctx.arc(0, 0, 20, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

function drawScoreboard() {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(1060, 20, 200, 150);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('LEADERBOARD', 1075, 45);
    ctx.beginPath();
    ctx.moveTo(1070, 55);
    ctx.lineTo(1250, 55);
    ctx.strokeStyle = '#334155';
    ctx.stroke();
    
    let yPos = 80;
    const allScores = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    if (allScores.length === 0) {
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('No kills yet', 1075, yPos);
    } else {
        for (let i = 0; i < Math.min(allScores.length, 4); i++) {
            ctx.fillStyle = '#f8fafc';
            ctx.fillText(allScores[i][0] + ': ' + allScores[i][1], 1075, yPos);
            yPos += 25;
        }
    }
}

export function startGameLoop() {
    const TICK_RATE = 1000 / 60;
    let lastTime = performance.now();
    let accumulator = 0;

    function drawGame() {
        const now = performance.now();
        let dt = now - lastTime;
        if (dt > 100) dt = 100; // Prevent spiral of death on tab switch
        lastTime = now;
        accumulator += dt;

        while (accumulator >= TICK_RATE) {
            updatePlayerPhysics();
            
            // Predict other players movement locally
            for (const username in otherPlayers) {
                const p = otherPlayers[username];
                
                // Lerp towards target position
                if (p.targetX !== undefined && p.targetY !== undefined) {
                    const distSq = (p.targetX - p.x)**2 + (p.targetY - p.y)**2;
                    if (distSq > 10000) { 
                        p.x = p.targetX;
                        p.y = p.targetY;
                    } else {
                        p.x += (p.targetX - p.x) * 0.2;
                        p.y += (p.targetY - p.y) * 0.2;
                    }
                }

                if (p.thrusting) {
                    const accel = 0.2;
                    p.vx += Math.cos(p.angle) * accel;
                    p.vy += Math.sin(p.angle) * accel;
                }
                p.x += p.vx;
                p.y += p.vy;
                p.vx *= 0.98;
                p.vy *= 0.98;
                const visualRadius = myPlayer.radius * 2.5;
                p.x = Math.max(visualRadius, Math.min(canvas.width - visualRadius, p.x));
                p.y = Math.max(visualRadius, Math.min(canvas.height - visualRadius, p.y));
            }
            
            updateMissiles();
            updateAsteroids();
            
            accumulator -= TICK_RATE;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawParallaxBackground();
        drawMissiles();
        drawAsteroids();
        drawOtherPlayers();
        drawLocalPlayer();
        drawScoreboard();
        
        requestAnimationFrame(drawGame);
    }
    requestAnimationFrame(drawGame);
}
