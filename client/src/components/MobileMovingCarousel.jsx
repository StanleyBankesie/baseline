import React, { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";

/**
 * MobileMovingCarousel
 * 
 * Automatically turns card children into a moving, auto-advancing, swipeable
 * horizontal carousel on small and medium devices (< lg / 1024px).
 * On large screens (lg) and above, transforms seamlessly into standard grid columns.
 */
export default function MobileMovingCarousel({
  children,
  gridColsClass = "lg:grid-cols-2 xl:grid-cols-4",
  gapClass = "gap-3 sm:gap-4 md:gap-6",
  autoInterval = 3500,
  itemWidthClass = "w-[84vw] max-w-[88vw] sm:w-[65vw] md:w-[46vw] lg:w-full min-w-0 lg:max-w-none",
  className = "",
  containerClassName = "",
}) {
  const containerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showCenterControl, setShowCenterControl] = useState(false);
  const userInteractionTimeoutRef = useRef(null);
  const hideCenterControlTimeoutRef = useRef(null);

  const triggerCenterControl = () => {
    setShowCenterControl(true);
    if (hideCenterControlTimeoutRef.current) {
      clearTimeout(hideCenterControlTimeoutRef.current);
    }
    hideCenterControlTimeoutRef.current = setTimeout(() => {
      setShowCenterControl(false);
    }, 3500);
  };

  // Filter valid children
  const validChildren = React.Children.toArray(children).filter(Boolean);
  const count = validChildren.length;

  // Scroll to a specific child card
  const scrollToCard = useCallback((index) => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const cards = container.querySelectorAll("[data-carousel-card]");
    if (cards && cards[index]) {
      const targetCard = cards[index];
      const targetLeft = targetCard.offsetLeft - container.offsetLeft;
      container.scrollTo({
        left: targetLeft,
        behavior: "smooth",
      });
      setActiveIndex(index);
    }
  }, []);

  // Update active index on scroll
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const cards = container.querySelectorAll("[data-carousel-card]");
    if (!cards || cards.length === 0) return;

    const scrollLeft = container.scrollLeft;
    let closestIndex = 0;
    let minDistance = Infinity;

    cards.forEach((card, idx) => {
      const distance = Math.abs(card.offsetLeft - container.offsetLeft - scrollLeft);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = idx;
      }
    });

    setActiveIndex(closestIndex);
  }, []);

  // Handle user interaction pause
  const handleUserTouchOrHover = () => {
    setIsUserInteracting(true);
    triggerCenterControl();
    if (userInteractionTimeoutRef.current) {
      clearTimeout(userInteractionTimeoutRef.current);
    }
    // Resume auto-scroll after 4.5 seconds of inactivity
    userInteractionTimeoutRef.current = setTimeout(() => {
      setIsUserInteracting(false);
    }, 4500);
  };

  // Moving Carousel Auto-Scroll Effect on Small & Medium Devices (< 1024px)
  useEffect(() => {
    if (count <= 1 || isUserInteracting || !isPlaying) return;

    const checkIsSmallOrMedium = () => typeof window !== "undefined" && window.innerWidth < 1024;
    if (!checkIsSmallOrMedium()) return;

    const interval = setInterval(() => {
      if (!checkIsSmallOrMedium()) return;
      setActiveIndex((prev) => {
        const next = (prev + 1) % count;
        scrollToCard(next);
        return next;
      });
    }, autoInterval);

    return () => clearInterval(interval);
  }, [count, isUserInteracting, isPlaying, autoInterval, scrollToCard]);

  // Clean timeouts on unmount
  useEffect(() => {
    return () => {
      if (userInteractionTimeoutRef.current) {
        clearTimeout(userInteractionTimeoutRef.current);
      }
      if (hideCenterControlTimeoutRef.current) {
        clearTimeout(hideCenterControlTimeoutRef.current);
      }
    };
  }, []);

  if (count === 0) return null;

  return (
    <div className={`relative w-full ${containerClassName}`}>
      {/* Center Stop/Play Icon (Hidden by default, only visible when user clicks/taps carousel, opacity=50) */}
      {count > 1 && (
        <div
          className={`absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 z-30 lg:hidden pointer-events-none transition-all duration-300 ${
            showCenterControl ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"
          }`}
        >
          <button
            type="button"
            aria-label={isPlaying ? "Stop carousel" : "Start carousel"}
            onClick={(e) => {
              e.stopPropagation();
              setIsPlaying((prev) => !prev);
              triggerCenterControl();
            }}
            className="pointer-events-auto w-12 h-12 rounded-full bg-slate-900/75 dark:bg-black/85 text-white backdrop-blur-md opacity-50 hover:opacity-100 active:opacity-100 transition-opacity flex items-center justify-center shadow-2xl active:scale-90 border border-white/20"
            title={isPlaying ? "Stop Carousel" : "Start Carousel"}
          >
            {isPlaying ? (
              <Pause size={20} className="fill-current" />
            ) : (
              <Play size={20} className="fill-current ml-0.5" />
            )}
          </button>
        </div>
      )}

      {/* Left and Right Manual Navigation Arrows (small & medium screens, opacity=50) */}
      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous card"
            onClick={(e) => {
              e.stopPropagation();
              handleUserTouchOrHover();
              const prevIndex = (activeIndex - 1 + count) % count;
              scrollToCard(prevIndex);
            }}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-20 lg:hidden w-8 h-8 rounded-full bg-slate-900/60 dark:bg-black/60 text-white backdrop-blur-md opacity-50 hover:opacity-100 active:opacity-100 transition-opacity flex items-center justify-center shadow-md active:scale-90"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>

          <button
            type="button"
            aria-label="Next card"
            onClick={(e) => {
              e.stopPropagation();
              handleUserTouchOrHover();
              const nextIndex = (activeIndex + 1) % count;
              scrollToCard(nextIndex);
            }}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-20 lg:hidden w-8 h-8 rounded-full bg-slate-900/60 dark:bg-black/60 text-white backdrop-blur-md opacity-50 hover:opacity-100 active:opacity-100 transition-opacity flex items-center justify-center shadow-md active:scale-90"
          >
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
        </>
      )}

      {/* Cards Container: flex-nowrap carousel on small & medium devices, grid on large (lg+) */}
      <div
        ref={containerRef}
        data-carousel-container
        onScroll={handleScroll}
        onClick={triggerCenterControl}
        onTouchStart={handleUserTouchOrHover}
        onMouseDown={handleUserTouchOrHover}
        className={`flex flex-nowrap overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-none no-scrollbar lg:grid ${gridColsClass} ${gapClass} px-1 sm:px-2 lg:px-0 transition-all ${className}`}
        style={{
          WebkitOverflowScrolling: "touch",
          flexWrap: "nowrap",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {validChildren.map((child, index) => (
          <div
            key={index}
            data-carousel-card
            className={`snap-center shrink-0 flex-shrink-0 lg:shrink lg:flex-shrink min-w-0 overflow-visible p-1.5 lg:p-1 ${itemWidthClass} [&>*]:w-full [&>*]:max-w-full transition-all`}
          >
            {child}
          </div>
        ))}
      </div>

      {/* Moving Carousel Dot Indicators (small and medium screens) */}
      {count > 1 && (
        <div className="flex lg:hidden items-center justify-center gap-1.5 mt-2">
          {validChildren.map((_, dotIdx) => (
            <button
              key={dotIdx}
              type="button"
              aria-label={`Go to slide ${dotIdx + 1}`}
              onClick={() => {
                handleUserTouchOrHover();
                scrollToCard(dotIdx);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                activeIndex === dotIdx
                  ? "w-6 bg-brand-600 dark:bg-brand-400"
                  : "w-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
