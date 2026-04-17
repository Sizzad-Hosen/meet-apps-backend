process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "1234567890123456";
process.env.REFRESH_TOKEN_SECRET = "12345678901234567";
process.env.RESET_PASS_URL = "http://localhost:3000/reset-password";

import request from "supertest";
import app from "../../src/app";

describe("API integration", () => {
  it("returns health check", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("ok");
  });

  it("rejects invalid auth login payload", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "bad-email", password: "123" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("rejects unauthenticated meeting creation", async () => {
    const response = await request(app)
      .post("/api/v1/meetings/create")
      .send({ title: "Daily", type: "instant" });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
