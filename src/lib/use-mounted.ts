"use client";

import { useEffect, useState } from "react";

/** True after the component has mounted in the browser (never true during SSR). */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
