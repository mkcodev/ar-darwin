import { useState } from "react";
import { t } from "../../i18n";
import { BACKDROP_URLS } from "../camera/backdropSvg";
import { ReplayButton } from "../ReplayButton";
import { LabelSequence } from "./LabelSequence";

/** Status labels landing tilted and straightening, one after the other. */
export function StatusLabelDemo() {
  const [round, setRound] = useState(0);
  return (
    <div className="sig-card">
      <div className="sig-stage sig-stage-camera">
        {/* Labels are seen over the photographed sheet, as in the camera. */}
        <img className="sig-backdrop" src={BACKDROP_URLS.lampAtNight} alt="" />
        <LabelSequence key={round} />
      </div>
      <h3 className="token-title">{t("signature.labels.title")}</h3>
      <p className="pg-note">{t("signature.labels.body")}</p>
      <p className="pg-note reduced-note">{t("signature.labels.reduced")}</p>
      <ReplayButton onClick={() => setRound((r) => r + 1)} />
    </div>
  );
}
