import { stagger } from "@ar-darwin/ui";
import { AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import { StatusLabel } from "../../components/StatusLabel";
import { t } from "../../i18n";

/** Shows «Imán activado» and then «Posición bloqueada», one after the other, once per mount. */
export function LabelSequence() {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const timers = [1, 2].map((n) => window.setTimeout(() => setShown(n), n * stagger * 3));
    return () => timers.forEach(window.clearTimeout);
  }, []);
  return (
    <div className="status-demo">
      <AnimatePresence>
        {shown >= 1 && (
          <StatusLabel key="magnet" icon="magnet" text={t("camera.status.magnetOn")} />
        )}
        {shown >= 2 && (
          <StatusLabel key="lock" icon="lock" text={t("camera.status.locked")} tilt={-1} />
        )}
      </AnimatePresence>
    </div>
  );
}
