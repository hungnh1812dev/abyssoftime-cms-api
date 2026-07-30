import { describe, expect, it } from "vitest";

import { apiErrorMessage } from "@/lib/errors";

function axiosErrorWith(data: unknown) {
  return { response: { data } };
}

describe("apiErrorMessage", () => {
  it("returns the string message as-is", () => {
    expect(apiErrorMessage(axiosErrorWith({ statusCode: 400, message: "email must be an email", error: "Bad Request" }), "fallback")).toBe(
      "email must be an email",
    );
  });

  it("joins a string-array message (ValidationPipe failures)", () => {
    expect(apiErrorMessage(axiosErrorWith({ statusCode: 400, message: ["email must be an email", "password too short"], error: "Bad Request" }), "fallback")).toBe(
      "email must be an email, password too short",
    );
  });

  it("returns the fallback when there is no response data", () => {
    expect(apiErrorMessage(new Error("network error"), "fallback")).toBe("fallback");
  });

  it("returns the fallback when message is missing from the response data", () => {
    expect(apiErrorMessage(axiosErrorWith({ statusCode: 500 }), "fallback")).toBe("fallback");
  });
});
