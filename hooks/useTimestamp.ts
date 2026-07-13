import { useEffect, useState } from "react";

export function useTimestamp() {
  const [timestamp, setTimestamp] = useState(Date.now());

  useEffect(() => {
    // 250ms is enough for a smooth progress bar and a responsive second countdown;
    // rAF (60fps) caused every visible Code item to re-render 60× per second.
    const id = setInterval(() => setTimestamp(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  return timestamp;
}
