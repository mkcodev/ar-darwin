import en from "./en.json";
import es from "./es.json";

export type Messages = typeof es;
export type Locale = "es" | "en";

export const messages: Record<Locale, Messages> = { es, en };
