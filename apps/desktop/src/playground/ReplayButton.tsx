import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { t } from "../i18n";

/** The one way every demo offers to run its motion again. */
export function ReplayButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="secondary" icon={<Icon name="reset" />} onClick={onClick}>
      {t("common.replay")}
    </Button>
  );
}
