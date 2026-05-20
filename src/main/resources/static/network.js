import { appendMessage, elements } from './ui.js';
import { myUsername, myPlayer, otherPlayers, spawnMissile, asteroids, scores } from './game.js';

let socket = null;

export function connectToServer() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${protocol}//${window.location.host}/echo`);

    socket.addEventListener('open', function () {
        elements.messagesContainer.innerHTML = '';
        elements.messageInput.disabled = false;
        elements.sendButton.disabled = false;
        elements.messageInput.focus();
        
        socket.send(JSON.stringify({ type: 'join', username: myUsername }));
        socket.send(JSON.stringify({ type: 'move', x: myPlayer.x, y: myPlayer.y, angle: myPlayer.angle, thrusting: myPlayer.thrusting, health: myPlayer.health }));
    });

    socket.addEventListener('message', function (event) {
        const data = JSON.parse(event.data);
        
        if (data.type === 'system') {
            appendMessage(data.content, 'system', null, myUsername);
            if (data.content.includes('has left') && data.username) {
                delete otherPlayers[data.username];
            }
        } 
        else if (data.type === 'chat') {
            appendMessage(data.content, 'chat', data.username, myUsername);
        }
        else if (data.type === 'init') {
            if (data.username === myUsername) {
                myPlayer.shipType = data.shipType;
                myPlayer.color = data.shipType === 'red' ? '#ef4444' : '#3b82f6';
                if (data.health !== undefined) myPlayer.health = data.health;
            }
        }
        else if (data.type === 'move') {
            if (data.username !== myUsername) {
                otherPlayers[data.username] = { x: data.x, y: data.y, angle: data.angle, shipType: data.shipType, thrusting: data.thrusting, health: data.health };
            }
        }
        else if (data.type === 'shoot') {
            spawnMissile(data.username, data.x, data.y, data.angle);
        }
        else if (data.type === 'asteroid') {
            asteroids.push(data);
        }
        else if (data.type === 'destroy_asteroid') {
            const idx = asteroids.findIndex(a => a.id === data.id);
            if (idx !== -1) asteroids.splice(idx, 1);
        }
        else if (data.type === 'kill') {
            scores[data.shooter] = (scores[data.shooter] || 0) + 1;
        }
    });

    socket.addEventListener('close', function () {
        appendMessage('Disconnected from server.', 'system', null, myUsername);
        elements.messageInput.disabled = true;
        elements.sendButton.disabled = true;
    });

    socket.addEventListener('error', function () {
        appendMessage('Error connecting to server.', 'system', null, myUsername);
    });
}

export function sendMove(x, y, angle, thrusting, health) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'move', x: x, y: y, angle: angle, thrusting: thrusting, health: health }));
    }
}

export function sendShoot(x, y, angle) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'shoot', x: x, y: y, angle: angle }));
    }
}

export function sendDestroyAsteroid(id) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'destroy_asteroid', id: id }));
    }
}

export function sendKill(shooter, victim) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'kill', shooter: shooter, victim: victim }));
    }
}

export function sendChat(message) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'chat', content: message }));
    }
}
