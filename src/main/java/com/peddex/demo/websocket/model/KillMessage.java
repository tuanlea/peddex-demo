package com.peddex.demo.websocket.model;

public class KillMessage {
    public String type;
    public String shooter;
    public String victim;

    public KillMessage() {}

    public KillMessage(String type, String shooter, String victim) {
        this.type = type;
        this.shooter = shooter;
        this.victim = victim;
    }
}
