"use client";

import { useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import { useInView, useMotionValue, useSpring } from "motion/react";
import { cn } from "@/lib/utils";

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: number;
  startValue?: number;
  direction?: "up" | "down";
  delay?: number;
  decimalPlaces?: number;
  suffix?: string;
  prefix?: string;
  variant?: "default" | "emerald" | "amber" | "blue" | "purple" | "rose" | "gradient";
  glow?: boolean;
}

const variantStyles = {
  default: "text-foreground font-extrabold",
  emerald: "text-emerald-600 dark:text-emerald-400 font-extrabold",
  amber: "text-amber-600 dark:text-amber-400 font-extrabold",
  blue: "text-blue-600 dark:text-blue-400 font-extrabold",
  purple: "text-indigo-600 dark:text-indigo-400 font-extrabold",
  rose: "text-rose-600 dark:text-rose-400 font-extrabold",
  gradient: "bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 bg-clip-text text-transparent font-extrabold dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-400",
};

const glowStyles = {
  default: "",
  emerald: "drop-shadow-[0_2px_8px_rgba(16,185,129,0.35)]",
  amber: "drop-shadow-[0_2px_8px_rgba(245,158,11,0.35)]",
  blue: "drop-shadow-[0_2px_8px_rgba(59,130,246,0.35)]",
  purple: "drop-shadow-[0_2px_8px_rgba(99,102,241,0.35)]",
  rose: "drop-shadow-[0_2px_8px_rgba(244,63,94,0.35)]",
  gradient: "drop-shadow-[0_2px_10px_rgba(20,184,166,0.4)]",
};

export function NumberTicker({
  value,
  startValue = 0,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
  suffix,
  prefix,
  variant = "default",
  glow = true,
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(direction === "down" ? value : startValue);
  const springValue = useSpring(motionValue, {
    damping: 45,
    stiffness: 120,
  });
  const isInView = useInView(ref, { once: true, margin: "0px" });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (isInView) {
      timer = setTimeout(() => {
        motionValue.set(direction === "down" ? startValue : value);
      }, delay * 1000);
    }

    return () => {
      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [motionValue, isInView, delay, value, direction, startValue]);

  useEffect(
    () =>
      springValue.on("change", (latest) => {
        if (ref.current) {
          const formatted = Intl.NumberFormat("en-US", {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces,
          }).format(Number(latest.toFixed(decimalPlaces)));
          
          ref.current.textContent = `${prefix ? prefix + " " : ""}${formatted}${suffix ? " " + suffix : ""}`;
        }
      }),
    [springValue, decimalPlaces, prefix, suffix],
  );

  const formattedInitial = `${prefix ? prefix + " " : ""}${Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(startValue)}${suffix ? " " + suffix : ""}`;

  return (
    <span
      ref={ref}
      className={cn(
        "inline-block tracking-tight tabular-nums transition-all duration-300",
        variantStyles[variant],
        glow && glowStyles[variant],
        className,
      )}
      {...props}
    >
      {formattedInitial}
    </span>
  );
}

