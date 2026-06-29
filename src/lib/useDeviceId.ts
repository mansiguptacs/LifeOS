"use client";

import { useEffect, useState } from "react";

const KEY = "accessmap-device-id";

export function useDeviceId(): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    let existing = localStorage.getItem(KEY);
    if (!existing) {
      existing =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(KEY, existing);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setId(existing);
  }, []);
  return id;
}
