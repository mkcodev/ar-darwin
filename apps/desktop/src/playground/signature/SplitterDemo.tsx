import { computeTiles, maxOverlapPx, type Rect } from "@ar-darwin/core";
import { duration, splitter, spring, stagger } from "@ar-darwin/ui";
import { motion } from "motion/react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { Button } from "../../components/Button";
import { SegmentedControl } from "../../components/SegmentedControl";
import { Slider } from "../../components/Slider";
import { Stepper } from "../../components/Stepper";
import { t } from "../../i18n";
import { useReduceMotion } from "../../theme/ReduceMotion";
import { springPlan } from "../../theme/transitions";
import { ARTWORK_ON_PAPER_URL, ARTWORK_SIZE } from "../camera/demoArtwork";

type Edges = "flush" | "extended";

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

/** Parts of `rect` outside `core`: the extended zones that get the guide tint. */
function extendedZones(rect: Rect, core: Rect): Rect[] {
  const zones: Rect[] = [];
  const left = core.x - rect.x;
  const right = rect.x + rect.width - (core.x + core.width);
  const top = core.y - rect.y;
  const bottom = rect.y + rect.height - (core.y + core.height);
  if (left > 0) zones.push({ x: 0, y: 0, width: left, height: rect.height });
  if (right > 0) zones.push({ x: rect.width - right, y: 0, width: right, height: rect.height });
  if (top > 0) zones.push({ x: 0, y: 0, width: rect.width, height: top });
  if (bottom > 0) zones.push({ x: 0, y: rect.height - bottom, width: rect.width, height: bottom });
  return zones;
}

/**
 * Splitter with core's computeTiles: dashed cut lines, tinted extended edges. «Separar» pulls
 * the tiles apart one after another (`stagger` ms, `gentle` spring) and the tint arrives once
 * they settle. Reduced motion: the layout swaps with a short fade.
 */
export function SplitterDemo() {
  const { reduce } = useReduceMotion();
  const plan = springPlan(spring.gentle, reduce);
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);
  const [edges, setEdges] = useState<Edges>("extended");
  const [overlap, setOverlap] = useState(60);
  const [apart, setApart] = useState(true);
  const frame = useRef<HTMLDivElement>(null);
  const [framePx, setFramePx] = useState(300);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => e && setFramePx(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const max = maxOverlapPx(ARTWORK_SIZE, rows, cols);
  const overlapPx = edges === "extended" ? Math.min(overlap, max) : 0;
  const tiles = computeTiles(ARTWORK_SIZE, { rows, cols, overlapPx, showOverlapTint: true });
  const toScreen = framePx / ARTWORK_SIZE.width;
  // Far enough apart that each tinted strip reads as its own band, not as overlap.
  const gap = splitter.tileGap + overlapPx * toScreen * 2;
  const settleMs = tiles.length * stagger + duration.long.ms;

  return (
    <div className="sig-card sig-card-wide">
      <div className="splitter-layout">
        <div className="split-frame" ref={frame}>
          <motion.div
            key={plan.mode === "full" ? "split" : `split-${apart}-${rows}-${cols}-${overlapPx}`}
            className="split-image"
            initial={plan.mode === "fade" ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={plan.transition}
          >
            {tiles.map((tile, i) => {
              const { rect, coreRect: core } = tile;
              const ox = (tile.col - (cols - 1) / 2) * gap;
              const oy = (tile.row - (rows - 1) / 2) * gap;
              const cut: CSSProperties = {
                left: pct(core.x - rect.x, rect.width),
                top: pct(core.y - rect.y, rect.height),
                width: pct(core.width, rect.width),
                height: pct(core.height, rect.height),
                borderTopWidth: core.y > rect.y ? 1.5 : 0,
                borderBottomWidth: rect.y + rect.height > core.y + core.height ? 1.5 : 0,
                borderLeftWidth: core.x > rect.x ? 1.5 : 0,
                borderRightWidth: rect.x + rect.width > core.x + core.width ? 1.5 : 0,
              };
              return (
                <motion.div
                  key={tile.id}
                  className="tile"
                  style={{
                    left: pct(rect.x, ARTWORK_SIZE.width),
                    top: pct(rect.y, ARTWORK_SIZE.height),
                    width: pct(rect.width, ARTWORK_SIZE.width),
                    height: pct(rect.height, ARTWORK_SIZE.height),
                    zIndex: i,
                  }}
                  initial={false}
                  animate={{ x: apart ? ox : 0, y: apart ? oy : 0 }}
                  transition={
                    plan.mode === "full"
                      ? { ...plan.transition, delay: (i * stagger) / 1000 }
                      : { duration: 0 }
                  }
                >
                  <img
                    className="tile-img"
                    src={ARTWORK_ON_PAPER_URL}
                    alt=""
                    style={{
                      left: pct(-rect.x, rect.width),
                      top: pct(-rect.y, rect.height),
                      width: pct(ARTWORK_SIZE.width, rect.width),
                      height: pct(ARTWORK_SIZE.height, rect.height),
                    }}
                  />
                  {extendedZones(rect, core).map((z) => (
                    <motion.span
                      key={`${z.x}-${z.y}-${z.width}`}
                      className="tile-ext"
                      style={{
                        left: pct(z.x, rect.width),
                        top: pct(z.y, rect.height),
                        width: pct(z.width, rect.width),
                        height: pct(z.height, rect.height),
                      }}
                      initial={false}
                      animate={{ opacity: apart ? 1 : 0 }}
                      transition={{
                        duration: duration.short.ms / 1000,
                        delay: apart && plan.mode === "full" ? settleMs / 1000 : 0,
                      }}
                    />
                  ))}
                  <span className="tile-cut" style={cut} />
                  <span className="tile-tag value-text">{tile.id}</span>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
        <div className="splitter-controls">
          <Stepper
            label={t("splitter.rows")}
            value={rows}
            min={1}
            max={4}
            onChange={setRows}
            decreaseLabel={t("splitter.fewerRows")}
            increaseLabel={t("splitter.moreRows")}
          />
          <Stepper
            label={t("splitter.cols")}
            value={cols}
            min={1}
            max={4}
            onChange={setCols}
            decreaseLabel={t("splitter.fewerCols")}
            increaseLabel={t("splitter.moreCols")}
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
          {edges === "extended" && (
            <Slider
              label={t("splitter.overlap")}
              value={Math.min(overlap, max)}
              min={0}
              max={Math.max(1, max)}
              onChange={setOverlap}
              format={(v) => t("common.px", { value: v })}
            />
          )}
          <Button variant="primary" onClick={() => setApart((a) => !a)}>
            {t(apart ? "splitter.join" : "splitter.separate")}
          </Button>
        </div>
      </div>
      <h3 className="token-title">{t("signature.splitter.title")}</h3>
      <p className="pg-note">{t("signature.splitter.body")}</p>
      <p className="pg-note reduced-note">{t("signature.splitter.reduced")}</p>
    </div>
  );
}
