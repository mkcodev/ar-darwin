import { useState } from "react";
import { Logo } from "../../components/Logo";
import { t } from "../../i18n";
import { ReplayButton } from "../ReplayButton";

/** The tree draws itself: the «1», a fast sketch, then the final line over it. */
export function LogoDemo() {
  const [play, setPlay] = useState(1);
  return (
    <div className="sig-card">
      <div className="sig-stage">
        <div className="logo-lockup">
          <Logo size={120} label={t("logo.label")} playKey={play} />
          <span className="logo-word">{t("logo.word")}</span>
        </div>
      </div>
      <h3 className="token-title">{t("signature.logo.title")}</h3>
      <p className="pg-note">{t("signature.logo.body")}</p>
      <p className="pg-note reduced-note">{t("signature.logo.reduced")}</p>
      <ReplayButton onClick={() => setPlay((p) => p + 1)} />
    </div>
  );
}
