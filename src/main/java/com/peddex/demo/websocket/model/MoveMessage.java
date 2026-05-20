package com.peddex.demo.websocket.model;

public class MoveMessage {
    public String type;
    public String username;
    public int x;
    public int y;
    public double angle;
    public String shipType;
    public boolean thrusting;
    public int health;

    public MoveMessage() {}

    public MoveMessage(String type, String username, int x, int y, double angle, String shipType, boolean thrusting, int health) {
        this.type = type;
        this.username = username;
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.shipType = shipType;
        this.thrusting = thrusting;
        this.health = health;
    }
}
