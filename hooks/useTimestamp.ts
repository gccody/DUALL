import { useEffect, useState } from "react";
import { AppState } from "react-native";

/** Whether the clock should run in `state`: not while backgrounded or covered (e.g. app switcher). */
function isForeground(state: typeof AppState.currentState) {
  return state !== "background" && state !== "inactive";
}

/**
 * Calls `onTick` with the current time (epoch ms) on every whole second, so
 * countdowns and code rollovers update right on time. Pauses while the app is
 * in the background or inactive, and ticks immediately when it comes back.
 * Returns a function that stops the clock.
 */
export function subscribeToSeconds(onTick: (now: number) => void): () => void {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const stop = () => {
    clearTimeout(timeout);
    timeout = undefined;
  };
  // Timeouts drift, so each one targets the next boundary rather than repeating every 1000ms.
  const scheduleNext = () => {
    timeout = setTimeout(tick, 1000 - (Date.now() % 1000));
  };
  const tick = () => {
    onTick(Date.now());
    scheduleNext();
  };

  const subscription = AppState.addEventListener("change", (state) => {
    stop();
    if (isForeground(state)) tick();
  });
  if (isForeground(AppState.currentState)) scheduleNext();

  return () => {
    subscription.remove();
    stop();
  };
}

/** The current time (epoch ms), updated on every whole second while the app is in the foreground. */
export function useTimestamp() {
  const [timestamp, setTimestamp] = useState(() => Date.now());

  // Every visible card re-renders on each tick, so tick no more often than the
  // countdown changes; the progress bar animates smoothly between ticks.
  useEffect(() => subscribeToSeconds(setTimestamp), []);

  return timestamp;
}
