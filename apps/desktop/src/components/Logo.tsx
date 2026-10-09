import { duration, easing, logoMark, spring, stagger } from "@ar-darwin/ui";
import { motion } from "motion/react";
import { useReduceMotion } from "../theme/ReduceMotion";
import { springPlan, toMotionEase, tweenPlan } from "../theme/transitions";

type LogoProps = {
  size?: number;
  label: string;
  /** Every change replays the signature: the «1», then a sketch, then the final branches. */
  playKey?: number;
};

const sec = (ms: number) => ms / 1000;

/**
 * Darwin's 1837 tree. Signature «trazo vivo»: the accent «1» is written first, the origin dot
 * lands, a faint sketch of the branches races ahead and the final line draws over it.
 */
export function Logo({ size = 48, label, playKey = 0 }: LogoProps) {
  const { reduce } = useReduceMotion();
  const draw = tweenPlan(duration.long, easing.draw, reduce);
  const pop = springPlan(spring.snappy, reduce);
  const full = draw.mode === "full" && playKey > 0;
  const fading = draw.mode === "fade" && playKey > 0;

  const numeralMs = duration.long.ms;
  const sketchStart = numeralMs + stagger * 2;
  const finalStart = sketchStart + duration.short.ms;
  const strokeTransition = (delayMs: number, ms: number) => ({
    duration: sec(ms),
    ease: toMotionEase(easing.draw),
    delay: sec(delayMs),
  });

  return (
    <motion.svg
      key={playKey}
      width={size}
      height={size}
      viewBox={`0 0 ${logoMark.grid} ${logoMark.grid}`}
      fill="none"
      strokeWidth={logoMark.stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={label}
      initial={fading ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={draw.transition}
      className="logo-mark"
    >
      <motion.path
        d={logoMark.numeral}
        stroke="var(--color-accent)"
        initial={full ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={strokeTransition(0, numeralMs)}
      />
      <motion.circle
        cx={logoMark.origin.cx}
        cy={logoMark.origin.cy}
        r={logoMark.origin.r}
        fill="var(--color-accent)"
        stroke="none"
        style={{ originX: "50%", originY: "50%" }}
        initial={full ? { scale: 0 } : false}
        animate={{ scale: 1 }}
        transition={{ ...pop.transition, delay: full ? sec(numeralMs * 0.6) : 0 }}
      />
      {full && (
        <motion.g
          stroke="var(--color-text-muted)"
          transform="translate(1.2 0.8)"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{
            duration: sec(duration.short.ms),
            delay: sec(finalStart + 4 * stagger * 2),
          }}
        >
          {logoMark.branches.map((d, i) => (
            <motion.path
              key={d}
              d={d}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={strokeTransition(sketchStart + i * stagger, duration.medium.ms)}
            />
          ))}
        </motion.g>
      )}
      <g stroke="var(--color-text-primary)">
        {logoMark.branches.map((d, i) => (
          <motion.path
            key={d}
            d={d}
            initial={full ? { pathLength: 0 } : false}
            animate={{ pathLength: 1 }}
            transition={strokeTransition(finalStart + i * stagger * 2, duration.long.ms)}
          />
        ))}
      </g>
    </motion.svg>
  );
}
