"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type SwipeCarouselItem = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
};

export function SwipeCarousel({
  items,
  label,
  className,
}: {
  items: SwipeCarouselItem[];
  label: string;
  className?: string;
}) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const updateActive = () => {
      const children = Array.from(scroller.children) as HTMLElement[];
      if (children.length === 0) return;
      const mid = scroller.scrollLeft + scroller.clientWidth / 2;
      let best = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      children.forEach((child, index) => {
        const center = child.offsetLeft + child.offsetWidth / 2;
        const dist = Math.abs(center - mid);
        if (dist < bestDist) {
          bestDist = dist;
          best = index;
        }
      });
      setActive(best);
    };

    updateActive();
    scroller.addEventListener("scroll", updateActive, { passive: true });
    window.addEventListener("resize", updateActive);
    return () => {
      scroller.removeEventListener("scroll", updateActive);
      window.removeEventListener("resize", updateActive);
    };
  }, [items.length]);

  function goTo(index: number) {
    const scroller = scrollerRef.current;
    const child = scroller?.children[index] as HTMLElement | undefined;
    if (!scroller || !child) return;
    scroller.scrollTo({ left: child.offsetLeft, behavior: "smooth" });
  }

  return (
    <div className={cn("home-carousel", className)}>
      <ul
        ref={scrollerRef}
        className="home-carousel__track"
        aria-label={label}
        aria-roledescription="carousel"
      >
        {items.map((item, index) => (
          <li
            key={item.id}
            className="home-carousel__slide"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${items.length}`}
            aria-current={index === active ? "true" : undefined}
          >
            <article className="home-feature-card">
              <p className="home-feature-card__eyebrow">{item.eyebrow}</p>
              <h3 className="home-feature-card__title">{item.title}</h3>
              <p className="home-feature-card__body">{item.body}</p>
            </article>
          </li>
        ))}
      </ul>

      <div className="home-carousel__dots" role="tablist" aria-label={`${label} slides`}>
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={index === active}
            aria-label={`Show ${item.title}`}
            className={cn(
              "home-carousel__dot",
              index === active && "home-carousel__dot--active",
            )}
            onClick={() => goTo(index)}
          />
        ))}
      </div>

      <p className="home-carousel__hint" aria-hidden="true">
        Swipe to browse
      </p>
    </div>
  );
}
