import { duration, easing, signature } from "@ar-darwin/ui";
import { animate } from "motion/react";
import { type ButtonHTMLAttributes, type PointerEvent, type ReactNode, useRef } from "react";
import { useReduceMotion } from "../theme/ReduceMotion";
import { toMotionEase } from "../theme/transitions";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** `danger`: destructive actions (delete), in the theme's danger colour. */
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: ReactNode;
};

/**
 * Press signature «tinta que empapa»: the ink spreads from the finger like ink soaking paper,
 * within `signature.inkMaxMs`, and dries off on release. Reduced motion: a flat fade.
 */
export function Button({
  variant = "secondary",
  icon,
  children,
  className,
  onPointerDown,
  type = "button",
  ...rest
}: ButtonProps) {
  const inkLayer = useRef<HTMLSpanElement>(null);
  const { reduce } = useReduceMotion();

  const soak = (e: PointerEvent<HTMLButtonElement>) => {
    onPointerDown?.(e);
    const layer = inkLayer.current;
    if (!layer || rest.disabled) return;
    const box = e.currentTarget.getBoundingClientRect();
    const size = Math.hypot(box.width, box.height) * 2;
    const ink = document.createElement("span");
    ink.className = "ink";
    Object.assign(ink.style, {
      left: `${e.clientX - box.left - size / 2}px`,
      top: `${e.clientY - box.top - size / 2}px`,
      width: `${size}px`,
      height: `${size}px`,
    });
    layer.appendChild(ink);
    const fadeSeconds =
      duration.micro.reduced.kind === "fade" ? duration.micro.reduced.duration / 1000 : 0;
    const grow = reduce
      ? animate(ink, { opacity: [0, 1] }, { duration: fadeSeconds })
      : animate(
          ink,
          { scale: [0, 1] },
          { duration: signature.inkMaxMs / 1000, ease: toMotionEase(easing.draw) },
        );
    const dry = () => {
      window.removeEventListener("pointerup", dry);
      window.removeEventListener("pointercancel", dry);
      grow.then(() =>
        animate(ink, { opacity: 0 }, { duration: duration.micro.ms / 1000 }).then(() =>
          ink.remove(),
        ),
      );
    };
    window.addEventListener("pointerup", dry);
    window.addEventListener("pointercancel", dry);
  };

  return (
    <button
      type={type}
      className={`btn btn-${variant}${className ? ` ${className}` : ""}`}
      onPointerDown={soak}
      {...rest}
    >
      <span className="ink-layer" ref={inkLayer} aria-hidden="true" />
      {icon}
      {children !== undefined && <span className="btn-label">{children}</span>}
    </button>
  );
}
