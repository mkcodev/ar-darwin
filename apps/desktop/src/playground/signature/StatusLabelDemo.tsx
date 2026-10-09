import { useState } from "react";
import { Button } from "../../components/Button";
import { t } from "../../i18n";
import { LabelSequence } from "./LabelSequence";

/** Status labels landing tilted and straightening, one after the other. */
export function StatusLabelDemo() {
  const [round, setRound] = useState(0);
  return (
    <div className="sig-card">
      <div className="sig-stage sig-stage-camera">
        <LabelSequence key={round} />
      </div>
      <h3 className="token-title">{t("signature.labels.title")}</h3>
      <p className="pg-note">{t("signature.labels.body")}</p>
      <p className="pg-note reduced-note">{t("signature.labels.reduced")}</p>
      <Button variant="ghost" onClick={() => setRound((r) => r + 1)}>
        {t("common.replay")}
      </Button>
    </div>
  );
}
