import { duration, type Easing } from "@ar-darwin/ui";
import { useAnimate } from "motion/react";
import { Button } from "../../components/Button";
import { t } from "../../i18n";
import { useReduceMotion } from "../../theme/ReduceMotion";
import { tweenPlan } from "../../theme/transitions";
import { runDot } from "./runDot";

type EasingCardProps = { name: string; easing: Easing };

const S = 96;

/** A cubic-bezier drawn in a unit square, plus a dot that runs it over `duration.long`. */
export function EasingCard({ name, easing }: EasingCardProps) {
  const { reduce } = useReduceMotion();
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const [x1, y1, x2, y2] = easing;
  const d = `M0 ${S}C${x1 * S} ${S - y1 * S} ${x2 * S} ${S - y2 * S} ${S} 0`;

  const replay = () => runDot(scope, animate, tweenPlan(duration.long, easing, reduce));

  return (
    <div className="curve-card" ref={scope}>
      <div className="curve-head">
        <code>{name}</code>
        <span className="value-text">{easing.join(", ")}</span>
      </div>
      <svg
        className="curve-plot curve-plot-square"
        viewBox={`-4 -4 ${S + 8} ${S + 8}`}
        role="img"
        aria-label={t("tokens.motion.plotLabel", { name })}
      >
        <path className="curve-target" d={`M0 ${S}L${S} 0`} />
        <path className="curve-line" d={d} />
      </svg>
      <div className="curve-track">
        <span className="curve-dot" />
      </div>
      <div className="curve-foot">
        <span className="pg-note">{t("tokens.motion.reduced.fade")}</span>
        <Button variant="ghost" onClick={replay}>
          {t("common.replay")}
        </Button>
      </div>
    </div>
  );
}
