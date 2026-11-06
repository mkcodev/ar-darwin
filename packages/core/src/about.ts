/** What «Acerca de» and «Enviar comentarios» in Settings point to. */

/** The app's public repository. */
export const REPO_URL = "https://github.com/mkcodev/ar-darwin";

/** Who makes the app, as shown in «Acerca de». A name, not a translatable text. */
export const APP_AUTHOR = "mkcodev";

/**
 * The address of a new GitHub issue with `title` and `body` filled in. Both arrive already
 * translated from the app; they are only encoded here (`encodeURIComponent`, not URLSearchParams,
 * which React Native does not fully implement).
 */
export function feedbackIssueUrl({ title, body }: { title: string; body: string }): string {
  return `${REPO_URL}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

/**
 * The body of a feedback issue: the person's space to write first, then the facts that help
 * reproduce a problem, one «label: value» per line in a quiet block below a rule.
 */
export function feedbackBody(intro: string, facts: readonly (readonly [string, string])[]): string {
  const lines = facts.map(([label, value]) => `- ${label}: ${value}`);
  return [intro, "", "", "---", ...lines].join("\n");
}
