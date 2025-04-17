import { useEffect, useState } from "react";

export function useTimestamp() {
  const [timestamp, setTimestamp] = useState(Date.now());

  // Update timestamp on each animation frame
  useEffect(() => {
    let frame: number;
    const update = () => {
      setTimestamp(Date.now());
      frame = requestAnimationFrame(update);
    };

    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, []);

  return timestamp;
}