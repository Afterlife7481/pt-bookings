import { useLayoutEffect, useState, type RefObject } from "react";

const DEFAULT_RESERVED_BOTTOM = 120;
const DEFAULT_MIN_HEIGHT = 240;

export function useScheduleViewportHeight(
  gridRef: RefObject<HTMLElement | null>,
  options: {
    enabled?: boolean;
    legendRef?: RefObject<HTMLElement | null>;
    reservedBottom?: number;
    minHeight?: number;
    remeasureKey?: string | number;
  } = {},
) {
  const {
    enabled = true,
    legendRef,
    reservedBottom = DEFAULT_RESERVED_BOTTOM,
    minHeight = DEFAULT_MIN_HEIGHT,
    remeasureKey = 0,
  } = options;
  const [height, setHeight] = useState<number | undefined>();

  useLayoutEffect(() => {
    if (!enabled) {
      setHeight(undefined);
      return;
    }

    function measure() {
      const el = gridRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const reserved =
        legendRef?.current?.offsetHeight ?? reservedBottom;
      setHeight(
        Math.max(minHeight, Math.floor(window.innerHeight - top - reserved - 16)),
      );
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [enabled, gridRef, legendRef, reservedBottom, minHeight, remeasureKey]);

  return height;
}
