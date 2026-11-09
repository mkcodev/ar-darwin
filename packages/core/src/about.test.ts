import { describe, expect, it } from "vitest";
import { feedbackBody, feedbackIssueUrl, REPO_URL } from "./about";

describe("feedbackIssueUrl", () => {
  it("opens a new issue in the repository", () => {
    const url = new URL(feedbackIssueUrl({ title: "Comentario", body: "Hola" }));
    expect(`${url.origin}${url.pathname}`).toBe(`${REPO_URL}/issues/new`);
    expect(url.searchParams.get("title")).toBe("Comentario");
    expect(url.searchParams.get("body")).toBe("Hola");
  });

  it("encodes accents, line breaks and reserved characters", () => {
    const body = "¿Qué tal?\n- Versión: 1.0.0 & más #1";
    const url = feedbackIssueUrl({ title: "Sí / no", body });
    expect(url).not.toMatch(/[\n ¿#]/u);
    expect(new URL(url).searchParams.get("body")).toBe(body);
    expect(new URL(url).searchParams.get("title")).toBe("Sí / no");
  });
});

describe("feedbackBody", () => {
  it("leaves room to write, then lists the facts below a rule", () => {
    expect(
      feedbackBody("Cuéntanos qué pasó.", [
        ["Versión", "1.0.0"],
        ["Sistema", "android 16"],
      ]),
    ).toBe("Cuéntanos qué pasó.\n\n\n---\n- Versión: 1.0.0\n- Sistema: android 16");
  });

  it("has only the intro and the rule without facts", () => {
    expect(feedbackBody("Hola", [])).toBe("Hola\n\n\n---");
  });
});
