package com.peddex.demo.websocket.model;

public class ShootMessage {
    public String type;
    public String username;
    public int x;
    public int y;
    public double angle;

    public ShootMessage() {}

    public ShootMessage(String type, String username, int x, int y, double angle) {
        this.type = type;
        this.username = username;
        this.x = x;
        this.y = y;
        this.angle = angle;
    }
}
