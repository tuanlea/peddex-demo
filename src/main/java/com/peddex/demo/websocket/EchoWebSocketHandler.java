package com.peddex.demo.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArraySet;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.UUID;
import java.util.Random;

import com.peddex.demo.websocket.model.ChatMessage;
import com.peddex.demo.websocket.model.MoveMessage;
import com.peddex.demo.websocket.model.ShootMessage;
import com.peddex.demo.websocket.model.AsteroidMessage;
import com.peddex.demo.websocket.model.DestroyAsteroidMessage;
import com.peddex.demo.websocket.model.KillMessage;

public class EchoWebSocketHandler extends TextWebSocketHandler {

    private static final Set<WebSocketSession> sessions = new CopyOnWriteArraySet<>();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
    private final Random random = new Random();

    public EchoWebSocketHandler() {
        scheduler.scheduleAtFixedRate(this::spawnAsteroid, 5000, 1500, TimeUnit.MILLISECONDS);
    }

    private void spawnAsteroid() {
        if (sessions.isEmpty()) return;
        
        try {
            String id = UUID.randomUUID().toString();
            double x = 0, y = 0, vx = 0, vy = 0;
            // Spawn from random edge (1280x800 area, offscreen)
            int edge = random.nextInt(4);
            if (edge == 0) { x = random.nextInt(1280); y = -150; vx = (random.nextDouble() - 0.5) * 3; vy = random.nextDouble() * 1.5 + 0.5; }
            else if (edge == 1) { x = random.nextInt(1280); y = 950; vx = (random.nextDouble() - 0.5) * 3; vy = -(random.nextDouble() * 1.5 + 0.5); }
            else if (edge == 2) { x = -150; y = random.nextInt(800); vx = random.nextDouble() * 1.5 + 0.5; vy = (random.nextDouble() - 0.5) * 3; }
            else { x = 1430; y = random.nextInt(800); vx = -(random.nextDouble() * 1.5 + 0.5); vy = (random.nextDouble() - 0.5) * 3; }
            
            double speed = Math.sqrt(vx * vx + vy * vy);
            if (speed > 2.25) {
                vx = (vx / speed) * 2.25;
                vy = (vy / speed) * 2.25;
            }
            
            String msg = objectMapper.writeValueAsString(new AsteroidMessage("asteroid", id, x, y, vx, vy));
            broadcast(msg);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        sessions.add(session);
        String shipType = (sessions.size() % 2 == 0) ? "red" : "blue";
        session.getAttributes().put("shipType", shipType);
        System.out.println("Client connected: " + session.getId() + " assigned " + shipType);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        try {
            JsonNode jsonNode = objectMapper.readTree(message.getPayload());
            String type = jsonNode.has("type") ? jsonNode.get("type").asText() : "";

            switch (type) {
                case "join":
                    handleJoinMessage(session, jsonNode);
                    break;
                case "chat":
                    handleChatMessage(session, jsonNode);
                    break;
                case "move":
                    handleMoveMessage(session, jsonNode);
                    break;
                case "shoot":
                    handleShootMessage(session, jsonNode);
                    break;
                case "destroy_asteroid":
                    handleDestroyAsteroidMessage(jsonNode);
                    break;
                case "hit":
                    handleHitMessage(jsonNode);
                    break;
                case "kill":
                    handleKillMessage(jsonNode);
                    break;
            }
        } catch (Exception e) {
            System.err.println("Error processing message: " + e.getMessage());
        }
    }

    private void handleJoinMessage(WebSocketSession session, JsonNode jsonNode) throws Exception {
        String username = jsonNode.has("username") ? jsonNode.get("username").asText() : "Anonymous";
        session.getAttributes().put("username", username);
        
        String joinMessage = objectMapper.writeValueAsString(new ChatMessage("system", username + " has joined the chat."));
        broadcast(joinMessage);
        
        String shipType = (String) session.getAttributes().get("shipType");
        session.getAttributes().put("health", 3);
        String initMessage = objectMapper.writeValueAsString(new MoveMessage("init", username, 0, 0, 0, shipType, false, 3));
        session.sendMessage(new TextMessage(initMessage));
        
        for (WebSocketSession s : sessions) {
            if (s != session && s.isOpen()) {
                String existingUser = (String) s.getAttributes().get("username");
                Integer exX = (Integer) s.getAttributes().get("x");
                Integer exY = (Integer) s.getAttributes().get("y");
                Double exAngle = (Double) s.getAttributes().get("angle");
                String exShipType = (String) s.getAttributes().get("shipType");
                Boolean exThrusting = (Boolean) s.getAttributes().get("thrusting");
                Integer exHealth = (Integer) s.getAttributes().get("health");
                
                if (existingUser != null && exX != null && exY != null && exAngle != null && exShipType != null) {
                    String stateMessage = objectMapper.writeValueAsString(
                            new MoveMessage("move", existingUser, exX, exY, exAngle, exShipType, exThrusting != null ? exThrusting : false, exHealth != null ? exHealth : 3)
                    );
                    session.sendMessage(new TextMessage(stateMessage));
                }
            }
        }
    }

    private void handleChatMessage(WebSocketSession session, JsonNode jsonNode) throws Exception {
        String username = (String) session.getAttributes().getOrDefault("username", "Anonymous");
        String content = jsonNode.has("content") ? jsonNode.get("content").asText() : "";
        String chatMessage = objectMapper.writeValueAsString(new ChatMessage("chat", content, username));
        broadcast(chatMessage);
    }

    private void handleMoveMessage(WebSocketSession session, JsonNode jsonNode) throws Exception {
        String username = (String) session.getAttributes().getOrDefault("username", "Anonymous");
        String shipType = (String) session.getAttributes().getOrDefault("shipType", "blue");
        int x = jsonNode.has("x") ? jsonNode.get("x").asInt() : 0;
        int y = jsonNode.has("y") ? jsonNode.get("y").asInt() : 0;
        double angle = jsonNode.has("angle") ? jsonNode.get("angle").asDouble() : -Math.PI / 2;
        boolean thrusting = jsonNode.has("thrusting") && jsonNode.get("thrusting").asBoolean();
        int health = jsonNode.has("health") ? jsonNode.get("health").asInt() : 3;
        
        session.getAttributes().put("x", x);
        session.getAttributes().put("y", y);
        session.getAttributes().put("angle", angle);
        session.getAttributes().put("thrusting", thrusting);
        session.getAttributes().put("health", health);
        
        String moveMessage = objectMapper.writeValueAsString(new MoveMessage("move", username, x, y, angle, shipType, thrusting, health));
        broadcast(moveMessage);
    }

    private void handleShootMessage(WebSocketSession session, JsonNode jsonNode) throws Exception {
        String username = (String) session.getAttributes().getOrDefault("username", "Anonymous");
        int x = jsonNode.has("x") ? jsonNode.get("x").asInt() : 0;
        int y = jsonNode.has("y") ? jsonNode.get("y").asInt() : 0;
        double angle = jsonNode.has("angle") ? jsonNode.get("angle").asDouble() : -Math.PI / 2;
        
        String shootMessage = objectMapper.writeValueAsString(new ShootMessage("shoot", username, x, y, angle));
        broadcast(shootMessage);
    }

    private void handleDestroyAsteroidMessage(JsonNode jsonNode) throws Exception {
        String id = jsonNode.has("id") ? jsonNode.get("id").asText() : "";
        String destroyMsg = objectMapper.writeValueAsString(new DestroyAsteroidMessage("destroy_asteroid", id));
        broadcast(destroyMsg);
    }

    private void handleHitMessage(JsonNode jsonNode) throws Exception {
        String victim = jsonNode.has("victim") ? jsonNode.get("victim").asText() : "";
        String shooter = jsonNode.has("shooter") ? jsonNode.get("shooter").asText() : "";
        String hitMsg = "{\"type\":\"hit\",\"victim\":\"" + victim + "\",\"shooter\":\"" + shooter + "\"}";
        broadcast(hitMsg);
    }

    private void handleKillMessage(JsonNode jsonNode) throws Exception {
        String shooter = jsonNode.has("shooter") ? jsonNode.get("shooter").asText() : "";
        String victim = jsonNode.has("victim") ? jsonNode.get("victim").asText() : "";
        String killMsg = objectMapper.writeValueAsString(new KillMessage("kill", shooter, victim));
        broadcast(killMsg);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        sessions.remove(session);
        String username = (String) session.getAttributes().get("username");
        if (username != null) {
            String leaveMessage = objectMapper.writeValueAsString(new ChatMessage("system", username + " has left the chat.", username));
            broadcast(leaveMessage);
        }
        System.out.println("Client disconnected: " + session.getId());
    }

    private void broadcast(String messagePayload) {
        TextMessage textMessage = new TextMessage(messagePayload);
        for (WebSocketSession session : sessions) {
            try {
                if (session.isOpen()) {
                    synchronized (session) {
                        session.sendMessage(textMessage);
                    }
                }
            } catch (IOException e) {
                System.err.println("Error broadcasting to session: " + e.getMessage());
            }
        }
    }
}
