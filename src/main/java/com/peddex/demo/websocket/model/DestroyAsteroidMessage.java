package com.peddex.demo.websocket.model;

public class DestroyAsteroidMessage {
    public String type;
    public String id;

    public DestroyAsteroidMessage() {}

    public DestroyAsteroidMessage(String type, String id) {
        this.type = type;
        this.id = id;
    }
}
