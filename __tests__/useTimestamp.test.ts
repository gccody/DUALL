import { subscribeToSeconds } from "@/hooks/useTimestamp";

// A controllable AppState: `setAppState` changes the state and notifies listeners like the native module.
let mockAppState = "active";
const mockListeners = new Set<(state: string) => void>();
jest.mock("react-native", () => ({
  AppState: {
    get currentState() {
      return mockAppState;
    },
    addEventListener: (_type: string, listener: (state: string) => void) => {
      mockListeners.add(listener);
      return { remove: () => mockListeners.delete(listener) };
    },
  },
}));

function setAppState(state: string) {
  mockAppState = state;
  mockListeners.forEach((listener) => listener(state));
}

const START = 1_700_000_000_250;

beforeEach(() => {
  jest.useFakeTimers({ now: START });
  mockAppState = "active";
  mockListeners.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("subscribeToSeconds", () => {
  test("ticks on whole-second boundaries", () => {
    const onTick = jest.fn();
    subscribeToSeconds(onTick);

    jest.advanceTimersByTime(749);
    expect(onTick).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(onTick).toHaveBeenLastCalledWith(1_700_000_001_000);

    jest.advanceTimersByTime(3000);
    expect(onTick.mock.calls).toEqual([[1_700_000_001_000], [1_700_000_002_000], [1_700_000_003_000], [1_700_000_004_000]]);
  });

  test("re-aligns to the next boundary after a late tick", () => {
    const onTick = jest.fn();
    subscribeToSeconds(onTick);
    jest.advanceTimersByTime(750);

    // The JS thread was busy: the clock moved on 300ms before the next timeout ran.
    jest.setSystemTime(1_700_000_001_300);
    jest.advanceTimersByTime(1000);
    expect(onTick).toHaveBeenLastCalledWith(1_700_000_002_300);

    jest.advanceTimersByTime(700);
    expect(onTick).toHaveBeenLastCalledWith(1_700_000_003_000);
    expect(onTick).toHaveBeenCalledTimes(3);
  });

  test("pauses while the app is in the background or inactive", () => {
    const onTick = jest.fn();
    subscribeToSeconds(onTick);

    for (const state of ["background", "inactive"]) {
      onTick.mockClear();
      setAppState(state);
      jest.advanceTimersByTime(10_000);
      expect(onTick).not.toHaveBeenCalled();
      setAppState("active");
    }
  });

  test("ticks immediately when the app becomes active again, then on boundaries", () => {
    const onTick = jest.fn();
    subscribeToSeconds(onTick);
    setAppState("background");
    jest.advanceTimersByTime(5_500);

    setAppState("active");
    expect(onTick.mock.calls).toEqual([[1_700_000_005_750]]);

    jest.advanceTimersByTime(250);
    expect(onTick).toHaveBeenLastCalledWith(1_700_000_006_000);
    expect(onTick).toHaveBeenCalledTimes(2);
  });

  test("waits for the app to become active when subscribed in the background", () => {
    setAppState("background");
    const onTick = jest.fn();
    subscribeToSeconds(onTick);

    jest.advanceTimersByTime(5_000);
    expect(onTick).not.toHaveBeenCalled();

    setAppState("active");
    expect(onTick).toHaveBeenCalledWith(1_700_000_005_250);
  });

  test("does not double the clock when 'active' is reported twice", () => {
    const onTick = jest.fn();
    subscribeToSeconds(onTick);
    setAppState("active");
    setAppState("active");
    onTick.mockClear();

    jest.advanceTimersByTime(3_000);
    expect(onTick).toHaveBeenCalledTimes(3);
  });

  test("stops ticking and listening once unsubscribed", () => {
    const onTick = jest.fn();
    const unsubscribe = subscribeToSeconds(onTick);
    jest.advanceTimersByTime(750);
    unsubscribe();

    jest.advanceTimersByTime(5_000);
    setAppState("background");
    setAppState("active");
    expect(onTick).toHaveBeenCalledTimes(1);
    expect(mockListeners.size).toBe(0);
  });
});
