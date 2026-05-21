import { elements } from './ui.js?v=2';
import { startGameLoop, setUsername } from './game.js?v=2';
import { connectToServer, sendChat } from './network.js?v=2';
import { startMusic } from './audio.js?v=2';

// --- INITIALIZE GAME ---
startGameLoop();

// --- LOBBY LOGIC ---
elements.joinGameBtn.addEventListener('click', () => {
    const enteredName = elements.usernameInput.value.trim();
    if (enteredName) {
        setUsername(enteredName);
        elements.lobbyOverlay.style.display = 'none';
        startMusic();
        connectToServer();
    }
});

elements.usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') elements.joinGameBtn.click();
});

// --- CHAT LOGIC ---
function handleSendMessage() {
    const message = elements.messageInput.value.trim();
    if (message) {
        sendChat(message);
        elements.messageInput.value = '';
    }
}

elements.sendButton.addEventListener('click', handleSendMessage);
elements.messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSendMessage();
});
