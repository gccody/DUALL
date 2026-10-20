import * as Clipboard from "expo-clipboard";

import { CLIPBOARD_CLEAR_DELAY_MS, copyCodeToClipboard } from "@/utils/clipboard";

// An in-memory clipboard. Prefixed with `mock` so the hoisted factory may reference it.
let mockClipboard = "";
jest.mock("expo-clipboard", () => ({
  setStringAsync: jest.fn(async (value: string) => {
    mockClipboard = value;
    return true;
  }),
  getStringAsync: jest.fn(async () => mockClipboard),
}));

beforeEach(() => {
  jest.useFakeTimers();
  mockClipboard = "";
  jest.clearAllMocks();
});

afterEach(async () => {
  // Let any pending clear run so it can't leak into the next test.
  await jest.runAllTimersAsync();
  jest.useRealTimers();
});

describe("copyCodeToClipboard", () => {
  test("copies the code", async () => {
    await copyCodeToClipboard("123456");
    expect(mockClipboard).toBe("123456");
  });

  test("keeps the code until the delay elapses", async () => {
    await copyCodeToClipboard("123456");
    await jest.advanceTimersByTimeAsync(CLIPBOARD_CLEAR_DELAY_MS - 1);
    expect(mockClipboard).toBe("123456");
  });

  test("clears the clipboard after the delay", async () => {
    await copyCodeToClipboard("123456");
    await jest.advanceTimersByTimeAsync(CLIPBOARD_CLEAR_DELAY_MS);
    expect(mockClipboard).toBe("");
  });

  test("leaves the clipboard alone if the user copied something else", async () => {
    await copyCodeToClipboard("123456");
    mockClipboard = "something else";
    await jest.advanceTimersByTimeAsync(CLIPBOARD_CLEAR_DELAY_MS);
    expect(mockClipboard).toBe("something else");
    expect(Clipboard.setStringAsync).toHaveBeenCalledTimes(1);
  });

  test("a newer copy restarts the timer", async () => {
    await copyCodeToClipboard("111111");
    await jest.advanceTimersByTimeAsync(CLIPBOARD_CLEAR_DELAY_MS / 2);
    await copyCodeToClipboard("222222");

    // The first copy's timer would have fired here.
    await jest.advanceTimersByTimeAsync(CLIPBOARD_CLEAR_DELAY_MS / 2);
    expect(mockClipboard).toBe("222222");
    expect(Clipboard.getStringAsync).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(CLIPBOARD_CLEAR_DELAY_MS / 2);
    expect(mockClipboard).toBe("");
  });

  test("copying the same code again restarts the timer", async () => {
    await copyCodeToClipboard("123456");
    await jest.advanceTimersByTimeAsync(CLIPBOARD_CLEAR_DELAY_MS - 1_000);
    await copyCodeToClipboard("123456");
    await jest.advanceTimersByTimeAsync(1_000);
    expect(mockClipboard).toBe("123456");
  });

  test("swallows clipboard read failures", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.mocked(Clipboard.getStringAsync).mockRejectedValueOnce(new Error("denied"));

    await copyCodeToClipboard("123456");
    await jest.advanceTimersByTimeAsync(CLIPBOARD_CLEAR_DELAY_MS);

    expect(mockClipboard).toBe("123456");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
