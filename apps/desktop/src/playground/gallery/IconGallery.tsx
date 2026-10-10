import { type IconName, icons } from "@ar-darwin/ui";
import { useState } from "react";
import { Icon } from "../../components/Icon";
import { t } from "../../i18n";

const names = Object.keys(icons) as IconName[];

/** Every icon of the set. Each one is a toggle: turning it on redraws it with the live stroke. */
export function IconGallery() {
  const [on, setOn] = useState<Partial<Record<IconName, number>>>({});
  return (
    <ul className="icon-grid">
      {names.map((name) => {
        const key = on[name] ?? 0;
        const pressed = key > 0;
        return (
          <li key={name} className="icon-cell">
            <button
              type="button"
              className="icon-btn icon-btn-theme"
              aria-pressed={pressed}
              aria-label={t(`icons.${name}`)}
              onClick={() =>
                setOn((prev) => ({ ...prev, [name]: pressed ? 0 : (prev[name] ?? 0) + Date.now() }))
              }
            >
              <Icon name={name} drawKey={key} />
            </button>
            <span className="icon-name">{t(`icons.${name}`)}</span>
          </li>
        );
      })}
    </ul>
  );
}
