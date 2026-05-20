package com.peddex.demo.websocket.model;

public class AsteroidMessage {
    public String type;
    public String id;
    public double x;
    public double y;
    public double vx;
    public double vy;

    public AsteroidMessage() {}

    public AsteroidMessage(String type, String id, double x, double y, double vx, double vy) {
        this.type = type;
        this.id = id;
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
    }
}
