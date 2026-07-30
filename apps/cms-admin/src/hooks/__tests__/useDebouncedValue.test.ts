import { useDebouncedValue } from "../useDebouncedValue";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useDebouncedValue", () => {
  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebouncedValue("initial", 400));
    expect(result.current).toBe("initial");
  });

  it("does not update the returned value before the delay elapses", async () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 400), {
      initialProps: { value: "first" },
    });

    act(() => {
      rerender({ value: "second" });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(399);
    });
    expect(result.current).toBe("first");
  });

  it("updates the returned value once the delay elapses", async () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 400), {
      initialProps: { value: "first" },
    });

    act(() => {
      rerender({ value: "second" });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(result.current).toBe("second");
  });

  it("resets the timer on rapid successive changes — only the final value survives", async () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 400), {
      initialProps: { value: "a" },
    });

    act(() => {
      rerender({ value: "ab" });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    act(() => {
      rerender({ value: "abc" });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(result.current).toBe("a");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(result.current).toBe("abc");
  });
});
