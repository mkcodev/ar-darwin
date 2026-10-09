/** Nested messages: every leaf is a string, which may contain {param} placeholders. */
export type Dictionary = { readonly [key: string]: string | Dictionary };

/** Same keys as T, with every message widened to string. Other locales must match it. */
export type Shape<T> = {
  readonly [K in keyof T]: T[K] extends string ? string : Shape<T[K]>;
};

/** Dotted path to every message in T, e.g. "camera.tile". */
export type KeyOf<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${KeyOf<T[K]>}`;
}[keyof T & string];

/** Message found at a dotted path of T. */
export type MessageAt<T, P extends string> = P extends `${infer Head}.${infer Rest}`
  ? Head extends keyof T
    ? MessageAt<T[Head], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

/** Names of the {param} placeholders in a message literal: "{done} of {total}" → "done" | "total". */
export type Params<S> = S extends `${string}{${infer Name}}${infer Rest}`
  ? Name | Params<Rest>
  : never;

/** Params of every key in T. Used to check that all locales take the same params. */
export type ParamsOf<T> = { [K in KeyOf<T>]: Params<MessageAt<T, K>> };

/** Extra arguments of t: none if the message has no params, otherwise all of them. */
export type TranslateArgs<S> = [Params<S>] extends [never]
  ? []
  : [params: Record<Params<S>, string | number>];

export type Translator<Source> = <K extends KeyOf<Source>>(
  key: K,
  ...args: TranslateArgs<MessageAt<Source, K>>
) => string;
