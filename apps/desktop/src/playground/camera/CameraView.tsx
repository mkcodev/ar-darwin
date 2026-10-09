import { computeTiles, type NudgeStep, type Size, type SnapGuide } from "@ar-darwin/core";
import {
  type CameraBackdropName,
  controlsSide,
  duration,
  type Handedness,
  type IconName,
  opacity as opacityTokens,
  signature,
} from "@ar-darwin/ui";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/Button";
import { FloatingPill } from "../../components/FloatingPill";
import { Icon } from "../../components/Icon";
import { IconButton } from "../../components/IconButton";
import { Slider } from "../../components/Slider";
import { StatusLabel } from "../../components/StatusLabel";
import { t } from "../../i18n";
import { playHaptic } from "../../theme/haptics";
import { useReduceMotion } from "../../theme/ReduceMotion";
import { BACKDROP_URLS } from "./backdropSvg";
import { ARTWORK_SIZE, ARTWORK_URL } from "./demoArtwork";
import { MagnetGuide } from "./MagnetGuide";
import { NudgePad } from "./NudgePad";
import { useIdle } from "./useIdle";
import { type GuideState, type Point, useOverlayGestures } from "./useOverlayGestures";

type CameraViewProps = {
  backdrop: CameraBackdropName;
  hand: Handedness;
  onOpenLibrary: () => void;
};

type Label = { id: number; icon: IconName; text: string };

const TILE_IDS = computeTiles(ARTWORK_SIZE, {
  rows: 2,
  cols: 2,
  overlapPx: 0,
  showOverlapTint: false,
}).map((tile) => tile.id);

const VERTICAL: readonly SnapGuide[] = ["left", "centerX", "right"];

function guidePosition(guide: SnapGuide, size: Size): number {
  if (guide === "left" || guide === "top") return 0;
  if (guide === "right") return size.width;
  if (guide === "bottom") return size.height;
  return guide === "centerX" ? size.width / 2 : size.height / 2;
}

/**
 * The simulated camera: a photographed sheet, the reference image on top and the floating
 * menu. Drag, pinch or scroll the image; the magnet (core's snapTransform) draws its guides.
 * The menu retreats after `signature.menuIdleMs` and sits under the free hand.
 */
export function CameraView({ backdrop, hand, onOpenLibrary }: CameraViewProps) {
  const { reduce } = useReduceMotion();
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const contactRing = useRef<HTMLDivElement>(null);

  const [size, setSize] = useState<Size | null>(null);
  const [magnet, setMagnet] = useState(true);
  const [locked, setLocked] = useState(false);
  const [flash, setFlash] = useState(false);
  const [mirror, setMirror] = useState({ flipX: false, flipY: false });
  const [imageOpacity, setImageOpacity] = useState(Math.round(opacityTokens.overlayImage * 100));
  const [step, setStep] = useState<NudgeStep>("fine");
  const [tile, setTile] = useState(0);
  const [touching, setTouching] = useState(false);
  const [guides, setGuides] = useState<GuideState>({ guides: [], contact: { x: 0, y: 0 } });
  const [pulse, setPulse] = useState<(Point & { id: number }) | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const { idle, wake } = useIdle(signature.menuIdleMs, touching);
  const guideCount = useRef(0);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const gestures = useOverlayGestures({
    stage,
    overlay,
    contactRing,
    size,
    magnet,
    locked,
    reduce,
    onTouchingChange: setTouching,
    onGuides: (next) => {
      // Snap = the guide list goes from empty to not empty: one haptic and one pulse.
      if (guideCount.current === 0 && next.guides.length > 0) {
        playHaptic("guideSnap");
        setPulse({ ...next.contact, id: Date.now() });
      }
      guideCount.current = next.guides.length;
      setGuides(next);
    },
  });

  const say = (icon: IconName, text: string) => {
    const id = Date.now() + Math.random();
    setLabels((prev) => [...prev.slice(-1), { id, icon, text }]);
    window.setTimeout(
      () => setLabels((prev) => prev.filter((l) => l.id !== id)),
      signature.labelHoldMs,
    );
  };

  const toggleMagnet = () => {
    const on = !magnet;
    setMagnet(on);
    say("magnet", t(on ? "camera.status.magnetOn" : "camera.status.magnetOff"));
  };
  const toggleLock = () => {
    const on = !locked;
    setLocked(on);
    playHaptic("lockToggle");
    say("lock", t(on ? "camera.status.locked" : "camera.status.unlocked"));
  };
  const toggleMirror = (axis: "flipX" | "flipY") => {
    const value = !mirror[axis];
    setMirror((m) => ({ ...m, [axis]: value }));
    gestures.setFlip(axis, value);
  };
  const nextTile = () => {
    setTile((i) => (i + 1) % TILE_IDS.length);
    playHaptic("tileChange");
  };

  const side = controlsSide(hand);
  const retreatSide = side === "left" ? "left" : "right";
  const tileId = TILE_IDS[tile] ?? "";

  return (
    <div
      ref={root}
      className="camera"
      data-controls={side}
      data-flash={flash}
      onPointerDownCapture={wake}
      onFocusCapture={wake}
      onKeyDownCapture={wake}
    >
      <img className="camera-backdrop" src={BACKDROP_URLS[backdrop]} alt="" draggable={false} />
      <div className="camera-overlay" ref={overlay} style={{ opacity: imageOpacity / 100 }}>
        <img
          src={ARTWORK_URL}
          alt=""
          width={ARTWORK_SIZE.width}
          height={ARTWORK_SIZE.height}
          draggable={false}
        />
      </div>
      <div
        ref={stage}
        className="camera-surface"
        data-locked={locked}
        role="img"
        aria-label={t("camera.surface")}
        {...gestures.handlers}
      />

      <AnimatePresence>
        {size &&
          guides.guides.map((g) => {
            const vertical = VERTICAL.includes(g);
            return (
              <MagnetGuide
                key={g}
                orientation={vertical ? "vertical" : "horizontal"}
                at={guidePosition(g, size)}
                length={vertical ? size.height : size.width}
                across={vertical ? size.width : size.height}
                contact={vertical ? guides.contact.y : guides.contact.x}
              />
            );
          })}
      </AnimatePresence>
      <div className="contact-ring" ref={contactRing} aria-hidden="true" />
      <AnimatePresence>
        {pulse && !reduce && (
          <motion.div
            key={pulse.id}
            className="snap-pulse"
            aria-hidden="true"
            style={{ left: pulse.x, top: pulse.y }}
            initial={{ opacity: 0.8, scale: 0.6 }}
            animate={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: duration.short.ms / 1000, ease: "easeOut" }}
            onAnimationComplete={() => setPulse(null)}
          />
        )}
      </AnimatePresence>

      <div className="camera-statusbar value-text" aria-hidden="true">
        <span>{t("camera.statusBar.time")}</span>
        <span>{t("camera.statusBar.battery")}</span>
      </div>

      <FloatingPill retreated={idle} towards="up" className="pill-top" label={t("camera.menu.top")}>
        <IconButton
          tone="camera"
          icon="library"
          label={t("camera.library")}
          onClick={onOpenLibrary}
        />
        <span className="pill-opacity">
          <Icon name="opacity" />
          <Slider
            tone="camera"
            compact
            label={t("camera.opacity")}
            value={imageOpacity}
            min={0}
            max={100}
            onChange={setImageOpacity}
            format={(v) => t("common.percent", { value: v })}
          />
        </span>
        <IconButton
          tone="camera"
          icon="flash"
          label={t("camera.flash")}
          pressed={flash}
          onClick={() => setFlash((f) => !f)}
        />
      </FloatingPill>

      <FloatingPill
        retreated={idle}
        towards={retreatSide}
        className="pill-rail"
        label={t("camera.menu.tools")}
      >
        <IconButton
          tone="camera"
          icon="magnet"
          label={t("camera.magnet")}
          pressed={magnet}
          onClick={toggleMagnet}
        />
        <IconButton
          tone="camera"
          icon="lock"
          label={t("camera.lock")}
          pressed={locked}
          onClick={toggleLock}
        />
        <IconButton
          tone="camera"
          icon="mirrorH"
          label={t("camera.mirrorH")}
          pressed={mirror.flipX}
          onClick={() => toggleMirror("flipX")}
        />
        <IconButton
          tone="camera"
          icon="mirrorV"
          label={t("camera.mirrorV")}
          pressed={mirror.flipY}
          onClick={() => toggleMirror("flipY")}
        />
        <IconButton
          tone="camera"
          icon="reset"
          label={t("camera.nudge.reset")}
          disabled={locked}
          onClick={() => gestures.nudgeBy("reset", step)}
        />
      </FloatingPill>

      <FloatingPill
        retreated={idle}
        towards={retreatSide}
        className="pill-nudge"
        label={t("camera.menu.nudge")}
      >
        <NudgePad
          step={step}
          onStepChange={setStep}
          onNudge={(a) => gestures.nudgeBy(a, step)}
          disabled={locked}
        />
      </FloatingPill>

      <FloatingPill
        retreated={idle}
        towards="down"
        className="pill-tiles"
        label={t("camera.menu.tiles")}
      >
        <span className="minimap" aria-hidden="true">
          {TILE_IDS.map((id, i) => (
            <i key={id} data-on={i === tile} />
          ))}
        </span>
        <span
          className="value-text tile-id"
          role="status"
          aria-label={t("camera.tile", { id: tileId })}
        >
          {tileId}
        </span>
        <Button variant="primary" icon={<Icon name="nextTile" drawKey={tile} />} onClick={nextTile}>
          {t("camera.nextTile")}
        </Button>
      </FloatingPill>

      <div className="status-stack">
        <AnimatePresence>
          {labels.map((l, i) => (
            <StatusLabel key={l.id} icon={l.icon} text={l.text} tilt={i % 2 ? -1 : 1} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
