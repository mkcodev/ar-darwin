import { spring } from "@ar-darwin/ui";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Button } from "../../components/Button";
import { t } from "../../i18n";
import { useReduceMotion } from "../../theme/ReduceMotion";
import { springPlan } from "../../theme/transitions";

/** Challenge streak (phase 5 demo): each digit that changes rolls in with `playful`. */
export function StreakDemo() {
  const { reduce } = useReduceMotion();
  const plan = springPlan(spring.playful, reduce);
  const [days, setDays] = useState(128);
  // Keyed by place value (units, tens…) so only the digits that change roll.
  const slots = String(days)
    .split("")
    .reverse()
    .map((digit, place) => ({ digit, place }))
    .reverse();
  const full = plan.mode === "full";

  return (
    <div className="sig-card">
      <div className="sig-stage">
        <div className="streak" role="status" aria-label={t("signature.streak.value", { days })}>
          <span className="streak-digits" aria-hidden="true">
            {slots.map(({ digit: d, place }) => (
              <span key={place} className="streak-slot">
                <AnimatePresence initial={false}>
                  <motion.span
                    key={d}
                    className="streak-digit"
                    initial={full ? { y: "100%", opacity: 0 } : false}
                    animate={{ y: "0%", opacity: 1 }}
                    exit={
                      full
                        ? { y: "-100%", opacity: 0 }
                        : { opacity: 0, transition: { duration: 0 } }
                    }
                    transition={plan.transition}
                  >
                    {d}
                  </motion.span>
                </AnimatePresence>
              </span>
            ))}
          </span>
          <span className="streak-unit">{t("signature.streak.unit")}</span>
        </div>
      </div>
      <h3 className="token-title">{t("signature.streak.title")}</h3>
      <p className="pg-note">{t("signature.streak.body")}</p>
      <p className="pg-note reduced-note">{t("signature.streak.reduced")}</p>
      <div className="row-wrap">
        <Button variant="primary" onClick={() => setDays((n) => n + 1)}>
          {t("signature.streak.add")}
        </Button>
        <Button variant="secondary" onClick={() => setDays((n) => n + 72)}>
          {t("signature.streak.jump")}
        </Button>
      </div>
    </div>
  );
}
