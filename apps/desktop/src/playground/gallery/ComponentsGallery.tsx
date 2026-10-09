import { useState } from "react";
import { BottomSheet } from "../../components/BottomSheet";
import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { IconButton } from "../../components/IconButton";
import { SegmentedControl } from "../../components/SegmentedControl";
import { Slider } from "../../components/Slider";
import { Stepper } from "../../components/Stepper";
import { Toggle } from "../../components/Toggle";
import { t } from "../../i18n";

type Edges = "flush" | "extended";

/** Base components in every state: rest, hover, focus-visible, pressed and disabled. */
export function ComponentsGallery() {
  const [magnet, setMagnet] = useState(true);
  const [lock, setLock] = useState(false);
  const [grid, setGrid] = useState(true);
  const [opacity, setOpacity] = useState(62);
  const [edges, setEdges] = useState<Edges>("extended");
  const [rows, setRows] = useState(2);
  const [sheet, setSheet] = useState(false);

  return (
    <div className="gallery">
      <div className="gallery-card">
        <h3 className="token-title">{t("gallery.buttons")}</h3>
        <div className="row-wrap">
          <Button variant="primary" icon={<Icon name="nextTile" />}>
            {t("camera.nextTile")}
          </Button>
          <Button variant="secondary">{t("gallery.secondary")}</Button>
          <Button variant="ghost">{t("gallery.ghost")}</Button>
          <Button variant="primary" disabled>
            {t("gallery.disabled")}
          </Button>
        </div>
        <p className="pg-note">{t("gallery.inkNote")}</p>
      </div>

      <div className="gallery-card">
        <h3 className="token-title">{t("gallery.iconButtons")}</h3>
        <div className="row-wrap">
          <IconButton
            icon="magnet"
            label={t("camera.magnet")}
            pressed={magnet}
            onClick={() => setMagnet((v) => !v)}
          />
          <IconButton
            icon="lock"
            label={t("camera.lock")}
            pressed={lock}
            onClick={() => setLock((v) => !v)}
          />
          <IconButton icon="settings" label={t("icons.settings")} />
          <IconButton icon="split" label={t("icons.split")} disabled />
        </div>
        <p className="pg-note">{t("gallery.iconButtonNote")}</p>
      </div>

      <div className="gallery-card">
        <h3 className="token-title">{t("gallery.controls")}</h3>
        <Toggle label={t("gallery.toggle")} checked={grid} onChange={setGrid} />
        <Slider
          label={t("camera.opacity")}
          value={opacity}
          min={0}
          max={100}
          onChange={setOpacity}
          format={(v) => t("common.percent", { value: v })}
        />
        <SegmentedControl
          label={t("gallery.edges")}
          options={[
            { value: "flush", label: t("splitter.flush") },
            { value: "extended", label: t("splitter.extended") },
          ]}
          value={edges}
          onChange={setEdges}
        />
        <Stepper
          label={t("splitter.rows")}
          value={rows}
          min={1}
          max={10}
          onChange={setRows}
          decreaseLabel={t("splitter.fewerRows")}
          increaseLabel={t("splitter.moreRows")}
        />
      </div>

      <div className="gallery-card">
        <h3 className="token-title">{t("gallery.sheet")}</h3>
        <p className="pg-note">{t("gallery.sheetNote")}</p>
        <Button variant="secondary" icon={<Icon name="settings" />} onClick={() => setSheet(true)}>
          {t("gallery.openSheet")}
        </Button>
      </div>

      <BottomSheet
        open={sheet}
        onClose={() => setSheet(false)}
        title={t("gallery.sheetTitle")}
        handleLabel={t("gallery.sheetHandle")}
      >
        <div className="sheet-body">
          <Slider
            label={t("camera.opacity")}
            value={opacity}
            min={0}
            max={100}
            onChange={setOpacity}
            format={(v) => t("common.percent", { value: v })}
          />
          <Toggle label={t("gallery.toggle")} checked={grid} onChange={setGrid} />
          <Button variant="primary" onClick={() => setSheet(false)}>
            {t("common.done")}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
