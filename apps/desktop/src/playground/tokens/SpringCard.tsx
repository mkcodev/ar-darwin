import { dampingRatio, type SpringToken, sampleSpring, springSettleMs } from "@ar-darwin/ui";
import { useAnimate } from "motion/react";
import { formatNumber } from "../../format";
import { t } from "../../i18n";
import { useReduceMotion } from "../../theme/ReduceMotion";
import { springPlan } from "../../theme/transitions";
import { ReplayButton } from "../ReplayButton";
import { runDot } from "./runDot";

type SpringCardProps = { name: string; token: SpringToken };

const PLOT_MS = 900;
const W = 240;
const H = 96;
const TOP = 24;
const BOTTOM = 84;

/** A spring drawn as its 0→1 response, plus a dot that runs the real Motion spring. */
export function SpringCard({ name, token }: SpringCardProps) {
  const { reduce } = useReduceMotion();
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const samples = sampleSpring(token, PLOT_MS);
  const points = samples
    .map(
      (v, i) =>
        `${((i / (samples.length - 1)) * W).toFixed(1)},${(BOTTOM - v * (BOTTOM - TOP)).toFixed(1)}`,
    )
    .join(" ");

  const replay = () => runDot(scope, animate, springPlan(token, reduce));

  return (
    <div className="curve-card" ref={scope}>
      <div className="curve-head">
        <code translate="no">{name}</code>
        <span className="value-text">
          {t("tokens.motion.springMeta", {
            k: token.stiffness,
            c: token.damping,
            zeta: formatNumber(dampingRatio(token), 2),
            ms: springSettleMs(token),
          })}
        </span>
      </div>
      <svg
        className="curve-plot"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={t("tokens.motion.plotLabel", { name })}
      >
        <line className="curve-target" x1={0} x2={W} y1={TOP} y2={TOP} />
        <polyline className="curve-line" points={points} />
      </svg>
      <div className="curve-track">
        <span className="curve-dot" />
      </div>
      <div className="curve-foot">
        <span className="pg-note">{t(`tokens.motion.reduced.${token.reduced.kind}`)}</span>
        <ReplayButton onClick={replay} />
      </div>
    </div>
  );
}
