import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { t } from "../../i18n";
import { ARTWORK_ON_PAPER_URL } from "./demoArtwork";

type LibraryScreenProps = {
  onOpenCamera: () => void;
};

/** A minimal library inside the simulated phone. It follows the theme; the camera does not. */
export function LibraryScreen({ onOpenCamera }: LibraryScreenProps) {
  return (
    <div className="library">
      <h3 className="library-title">{t("library.title")}</h3>
      <article className="project-card">
        <img className="project-thumb" src={ARTWORK_ON_PAPER_URL} alt="" />
        <div className="project-meta">
          <span className="project-name">{t("library.projectName")}</span>
          <span className="value-text project-detail">{t("library.projectDetail")}</span>
        </div>
      </article>
      <Button variant="primary" icon={<Icon name="camera" />} onClick={onOpenCamera}>
        {t("library.openCamera")}
      </Button>
      <p className="library-hint">{t("library.hint")}</p>
    </div>
  );
}
