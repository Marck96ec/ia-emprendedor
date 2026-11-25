import { normalizeWorkText, type Availability, type Resource } from "./business-memory";

const subjects: Array<{ key: Resource; absent: RegExp; present: RegExp }> = [
  { key: "social_media", absent: /(?:no tengo|no tenemos|no cuento con|no contamos con|no dispongo de) redes sociales\b/, present: /(?:tengo|tenemos|ya abr[ií]|activamos) (?:cuentas? en )?redes sociales\b/ },
  { key: "advertising_budget", absent: /(?:no tengo|no tenemos|no dispongo de|no disponemos de|sin) presupuesto (?:para|de) publicidad\b/, present: /(?:tengo|tenemos|dispongo de) presupuesto (?:para|de) publicidad\b/ },
  { key: "delegate", absent: /(?:actualmente trabajo solo|trabajo sola|trabajo solo|no puedo delegar|no podemos delegar)\b/, present: /(?:ya puedo delegar|ya podemos delegar|tengo a quien delegar)\b/ },
  { key: "website", absent: /(?:no tengo|no tenemos) (?:una )?(?:pagina|sitio) web\b/, present: /(?:tengo|tenemos|ya active|ya publicamos) (?:una )?(?:pagina|sitio) web\b/ },
  { key: "whatsapp", absent: /(?:no tengo|no tenemos|no uso|no usamos) whatsapp\b/, present: /(?:tengo|tenemos|uso|usamos) whatsapp\b/ },
  { key: "value_proposition", absent: /(?:no prepare|no tenemos|no tengo) (?:la |una )?oferta comercial\b/, present: /(?:prepare|preparamos|tengo|tenemos) (?:la |una )?oferta comercial\b/ },
];

type Candidate = {
  key: Resource;
  availability: Availability;
  certainty: "explicit" | "ambiguous";
  quote: string;
  field: string;
};

export function extractFeedback(input: Record<string, unknown>) {
  const matches = new Map<Resource, Candidate>();
  function visit(value: unknown, field: string) {
    if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) visit(child, field ? field + "." + key : key);
      return;
    }
    if (typeof value !== "string") return;
    for (const sentence of value.split(/(?<=[.!?])\s+|\n+/)) {
      const text = normalizeWorkText(sentence);
      for (const subject of subjects) {
        const absent = subject.absent.exec(text);
        const present = subject.present.exec(text);
        if (!absent && !present) continue;
        const negative = Boolean(absent);
        const mixed = absent && present && present.index >= absent.index + absent[0].length;
        const scopedDelegation = subject.key === "delegate" && /\bno (?:puedo|podemos) delegar (?:esta|este|la |el )/.test(text);
        const qualified = Boolean(mixed || scopedDelegation || /\b(?:quizas?|tal vez|creo que|puede que|no se si|me pregunto si|cuando tenga|anteriormente|antes|tenia|seria|podria|cliente dijo)\b/.test(text)
          || sentence.includes("?") || /[“”"«»]/.test(sentence));
        const availability = qualified ? "unknown" : negative ? "unavailable" : "available";
        const prior = matches.get(subject.key);
        const conflicts = prior && prior.availability !== availability;
        matches.set(subject.key, {
          key: subject.key,
          availability: conflicts ? "unknown" : availability,
          certainty: qualified || conflicts ? "ambiguous" : "explicit",
          quote: (conflicts ? prior.quote + " / " + sentence.trim() : sentence.trim()).slice(0, 360),
          field,
        });
      }
    }
  }
  visit(input, "");
  return [...matches.values()];
}
