import { sendResponse } from "../../src/shared/sendResponse";

describe("sendResponse", () => {
  it("returns standardized payload format", () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const res = { status, json } as any;

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "ok",
      data: { value: 1 },
    });

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      success: true,
      message: "ok",
      data: { value: 1 },
    });
  });
});
