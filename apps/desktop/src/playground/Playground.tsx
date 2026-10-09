import { type CameraBackdropName, DEFAULT_HANDEDNESS, type Handedness } from "@ar-darwin/ui";
import { useEffect, useState } from "react";
import { Logo } from "../components/Logo";
import { SegmentedControl } from "../components/SegmentedControl";
import { locale, t } from "../i18n";
import { loadFonts } from "../theme/loadFonts";
import { useThemePreference } from "../theme/useThemePreference";
import { CameraDemo } from "./camera/CameraDemo";
import { ComponentsGallery } from "./gallery/ComponentsGallery";
import { IconGallery } from "./gallery/IconGallery";
import "./playground.css";
import { Section } from "./Section";
import { LogoDemo } from "./signature/LogoDemo";
import { SplitterDemo } from "./signature/SplitterDemo";
import { StatusLabelDemo } from "./signature/StatusLabelDemo";
import { StreakDemo } from "./signature/StreakDemo";
import { Toolbar } from "./Toolbar";
import { ColorSwatches } from "./tokens/ColorSwatches";
import { MotionTokens } from "./tokens/MotionTokens";
import { SpaceAndRadii } from "./tokens/SpaceAndRadii";
import { TypeScale } from "./tokens/TypeScale";

loadFonts();

const cameraMoments = ["magnet", "labels", "menu", "entry", "ink", "icons"] as const;

/** /playground: the design system with its real logic, for checking on desktop and phone. */
export function Playground() {
  const { preference, setPreference, theme } = useThemePreference();
  const [hand, setHand] = useState<Handedness>(DEFAULT_HANDEDNESS);
  const [backdrop, setBackdrop] = useState<CameraBackdropName>("lampAtNight");

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t("playground.documentTitle");
  }, []);

  return (
    <div className="pg">
      <header className="pg-header">
        <Logo size={56} label={t("logo.label")} playKey={1} />
        <div>
          <h1 className="pg-title">{t("playground.title")}</h1>
          <p className="pg-lead">{t("playground.lead")}</p>
        </div>
      </header>
      <Toolbar preference={preference} onPreference={setPreference} hand={hand} onHand={setHand} />

      <main className="pg-main">
        <Section
          id="camera"
          title={t("playground.sections.camera")}
          lead={t("playground.sections.cameraLead")}
        >
          <div className="camera-layout">
            <div className="camera-column">
              <CameraDemo backdrop={backdrop} hand={hand} />
              <SegmentedControl
                label={t("playground.backdrop.label")}
                options={[
                  { value: "lampAtNight", label: t("playground.backdrop.lampAtNight") },
                  { value: "daylight", label: t("playground.backdrop.daylight") },
                  { value: "lowLight", label: t("playground.backdrop.lowLight") },
                ]}
                value={backdrop}
                onChange={setBackdrop}
              />
            </div>
            <ol className="moment-list">
              {cameraMoments.map((m) => (
                <li key={m} className="moment">
                  <h3 className="token-title">{t(`playground.moments.${m}.title`)}</h3>
                  <p className="pg-note">{t(`playground.moments.${m}.how`)}</p>
                  <p className="pg-note reduced-note">{t(`playground.moments.${m}.reduced`)}</p>
                </li>
              ))}
            </ol>
          </div>
        </Section>

        <Section
          id="signature"
          title={t("playground.sections.signature")}
          lead={t("playground.sections.signatureLead")}
        >
          <div className="sig-grid">
            <LogoDemo />
            <StatusLabelDemo />
            <StreakDemo />
            <SplitterDemo />
          </div>
        </Section>

        <Section
          id="components"
          title={t("playground.sections.components")}
          lead={t("playground.sections.componentsLead")}
        >
          <ComponentsGallery />
          <h3 className="token-title">{t("playground.sections.icons")}</h3>
          <IconGallery />
        </Section>

        <Section
          id="tokens"
          title={t("playground.sections.tokens")}
          lead={t("playground.sections.tokensLead", { theme: t(`playground.theme.${theme.name}`) })}
        >
          <ColorSwatches theme={theme} />
          <TypeScale />
          <SpaceAndRadii />
          <MotionTokens />
        </Section>
      </main>
    </div>
  );
}
