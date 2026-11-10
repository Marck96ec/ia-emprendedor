import "./support/dom";

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, test } from "node:test";

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

import Home from "../src/app/page";
import { LandingMobileCta } from "../src/components/landing-mobile-cta";
import { LandingShareButton } from "../src/components/landing-share-button";
import {
  OG_IMAGE_ALT,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_TITLE,
  SITE_URL,
} from "../src/lib/seo";
import * as ogImage from "../src/app/opengraph-image";
import * as twitterImage from "../src/app/twitter-image";

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

afterEach(() => cleanup());

/*
 * Identidad y metadatos públicos
 */

test("la identidad del sitio usa la marca TUCEO IA y el dominio canónico HTTPS", () => {
  assert.equal(SITE_NAME, "TUCEO IA");
  assert.equal(SITE_URL, "https://tuceoia.com");
  assert.ok(SITE_URL.startsWith("https://"));
  assert.equal(
    SITE_TAGLINE,
    "Decide con claridad. Ejecuta con enfoque. Mejora con evidencia.",
  );
  assert.ok(SITE_TITLE.includes(SITE_NAME));
  assert.ok(SITE_DESCRIPTION.length > 80);
  assert.ok(!SITE_DESCRIPTION.includes("IA Emprendedor"));
  assert.ok(!/pequeñ(os|as) (negocios|empresas)/i.test(SITE_DESCRIPTION));
});

test("el layout define metadataBase, canonical, Open Graph, Twitter y robots", () => {
  const layout = source("src/app/layout.tsx");

  assert.ok(layout.includes("metadataBase: new URL(SITE_URL)"));
  assert.ok(layout.includes('canonical: "/"'));
  assert.ok(layout.includes("openGraph: {"));
  assert.ok(layout.includes('card: "summary_large_image"'));
  assert.ok(layout.includes("robots: {"));
  assert.ok(!layout.includes("IA Emprendedor"));
  assert.ok(!/pequeñ(os|as) (negocios|empresas)/i.test(layout));
});

test("la imagen Open Graph generada es 1200x630 PNG con texto alternativo de marca", () => {
  assert.deepEqual(ogImage.size, { width: 1200, height: 630 });
  assert.equal(ogImage.contentType, "image/png");
  assert.ok(ogImage.alt.includes("TUCEO IA"));
  assert.equal(ogImage.alt, OG_IMAGE_ALT);
  assert.equal(typeof ogImage.default, "function");

  assert.deepEqual(twitterImage.size, ogImage.size);
  assert.equal(twitterImage.contentType, ogImage.contentType);
  assert.equal(twitterImage.alt, ogImage.alt);
});

/*
 * Estructura y recorrido de la landing
 */

test("el hero comunica qué es, a quién ayuda y ofrece CTA de registro", () => {
  render(<Home />);

  const heading = screen.getByRole("heading", { level: 1 });
  assert.ok(heading.textContent?.includes(SITE_TAGLINE));

  const signupLinks = screen
    .getAllByRole("link", { name: /Descubrir mi próxima prioridad/i })
    .map((link) => link.getAttribute("href"));
  assert.ok(signupLinks.length >= 2);
  assert.ok(signupLinks.every((href) => href === "/signup"));

  assert.ok(
    screen.getAllByRole("link", { name: /Crear cuenta/i }).length >= 2,
  );
});

test("la landing contiene las diez secciones comerciales con encabezados accesibles", () => {
  const { container } = render(<Home />);

  const sectionIds = [
    "problemas",
    "ciclo",
    "producto",
    "diferencia",
    "etapas",
    "beneficios",
    "faq",
    "cta-final",
  ];
  for (const id of sectionIds) {
    const section = container.querySelector(`#${id}`);
    assert.ok(section, `falta la sección #${id}`);
    assert.equal(section?.getAttribute("aria-labelledby"), `${id}-title`);
    assert.ok(section?.querySelector("h2"), `falta el encabezado de #${id}`);
  }

  assert.ok(container.querySelector("header"));
  assert.ok(container.querySelector("footer"));
  assert.ok(
    screen.getByRole("link", { name: "Saltar al contenido principal" }),
  );
});

test("todos los enlaces internos apuntan a rutas o anclas existentes", () => {
  const { container } = render(<Home />);

  const validRoutes = new Set(["/", "/login", "/signup"]);
  const anchorIds = new Set(
    Array.from(container.querySelectorAll("[id]")).map((el) => el.id),
  );

  const links = Array.from(container.querySelectorAll("a[href]"));
  assert.ok(links.length > 10);

  for (const link of links) {
    const href = link.getAttribute("href") ?? "";
    if (href.startsWith("#")) {
      assert.ok(
        anchorIds.has(href.slice(1)),
        `ancla sin destino: ${href}`,
      );
    } else {
      assert.ok(validRoutes.has(href), `ruta interna inesperada: ${href}`);
    }
  }
});

test("la demostración muestra las cinco capacidades con datos de ejemplo identificados", () => {
  render(<Home />);

  for (const capability of [
    /Diagnóstico/,
    /Decisión estratégica/,
    /Acciones prioritarias/,
    /Registro de resultados/,
    /Aprendizaje entre semanas/,
  ]) {
    assert.ok(screen.getByRole("heading", { name: capability }));
  }

  const demos = screen.getAllByRole("img");
  assert.equal(demos.length, 5);
  for (const demo of demos) {
    assert.ok(demo.textContent?.includes("Datos de ejemplo"));
  }
});

test("el video del hero mantiene proporciones, poster y alternativa de movimiento reducido", () => {
  const { container } = render(<Home />);

  const video = container.querySelector("video");
  assert.ok(video);
  assert.equal(video?.getAttribute("poster"), "/videos/frame-00-at-2.5s.png");
  assert.ok(video?.hasAttribute("playsinline"));
  assert.ok(video?.muted);
  assert.ok(video?.getAttribute("aria-label"));

  assert.ok(existsSync(join(process.cwd(), "public/videos/tuceo-ia-hero_2026-08-29_02-47-04.mp4")));
  assert.ok(existsSync(join(process.cwd(), "public/videos/frame-00-at-2.5s.png")));

  const css = source("src/app/globals.css");
  assert.ok(css.includes("prefers-reduced-motion"));
  assert.ok(css.includes(".hero-video"));
  assert.ok(css.includes(".hero-poster"));
});

test("las preguntas frecuentes usan details/summary nativos y accesibles", () => {
  const { container } = render(<Home />);

  const details = Array.from(container.querySelectorAll("#faq details"));
  assert.ok(details.length >= 6);

  for (const item of details) {
    const summary = item.querySelector("summary");
    assert.ok(summary, "cada pregunta necesita un summary");
    assert.ok(summary?.textContent?.trim().length);
    const body = item.querySelector(".details-body");
    assert.ok(body?.textContent && body.textContent.trim().length > 40);
  }
});

test("la landing no usa la marca antigua ni limita el producto a pequeños negocios", () => {
  const { container } = render(<Home />);
  const text = container.textContent ?? "";

  assert.ok(!text.includes("IA Emprendedor"));
  assert.ok(!/pequeñ(os|as) (negocios|empresas)/i.test(text));
  assert.ok(!/testimonio/i.test(text));
});

test("los objetivos táctiles principales superan 44px de alto", () => {
  const css = source("src/app/globals.css");

  const buttonBlock = css.match(
    /\.primary-button,\s*\.secondary-button,\s*\.ghost-button\s*\{[^}]*\}/,
  );
  assert.ok(buttonBlock, "falta la regla base de botones");
  assert.ok(buttonBlock[0].includes("min-height: 48px"));

  const page = source("src/app/page.tsx");
  assert.ok(page.includes("min-h-11"));
  assert.ok(page.includes("min-h-12"));
});

/*
 * Compartir
 */

test("compartir usa la Web Share API con la URL canónica cuando está disponible", async () => {
  const calls: Array<Record<string, string>> = [];
  Object.defineProperty(window.navigator, "share", {
    configurable: true,
    value: async (data: Record<string, string>) => {
      calls.push(data);
    },
  });

  render(<LandingShareButton />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Compartir TUCEO IA/i }));
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://tuceoia.com");
  assert.ok(!calls[0].url.includes("?"));
  assert.ok(calls[0].text?.includes(SITE_TAGLINE));

  Object.defineProperty(window.navigator, "share", {
    configurable: true,
    value: undefined,
  });
});

test("sin Web Share API copia el enlace canónico y confirma de forma accesible", async () => {
  const copied: string[] = [];
  Object.defineProperty(window.navigator, "share", {
    configurable: true,
    value: undefined,
  });
  Object.defineProperty(window.navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async (text: string) => {
        copied.push(text);
      },
    },
  });

  render(<LandingShareButton />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Compartir TUCEO IA/i }));
  });

  assert.deepEqual(copied, ["https://tuceoia.com"]);
  assert.ok(await screen.findByText("Enlace copiado"));
  assert.ok(screen.getByRole("status"));
});

test("cancelar el diálogo nativo de compartir no muestra error ni copia", async () => {
  let clipboardCalls = 0;
  Object.defineProperty(window.navigator, "share", {
    configurable: true,
    value: async () => {
      throw new DOMException("cancelado", "AbortError");
    },
  });
  Object.defineProperty(window.navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async () => {
        clipboardCalls += 1;
      },
    },
  });

  render(<LandingShareButton />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Compartir TUCEO IA/i }));
  });

  assert.equal(clipboardCalls, 0);
  assert.equal(screen.queryByText("Enlace copiado"), null);
  assert.equal(screen.queryByText(/No se pudo copiar/), null);

  Object.defineProperty(window.navigator, "share", {
    configurable: true,
    value: undefined,
  });
});

/*
 * CTA móvil contextual
 */

test("el CTA móvil apunta al registro y solo aparece después del hero", () => {
  render(<LandingMobileCta />);

  // Oculto: fuera del árbol de accesibilidad y sin foco por teclado.
  assert.equal(
    screen.queryByRole("link", { name: "Descubrir mi próxima prioridad" }),
    null,
  );
  const hiddenLink = screen.getByRole("link", {
    name: "Descubrir mi próxima prioridad",
    hidden: true,
  });
  assert.equal(hiddenLink.getAttribute("href"), "/signup");
  assert.equal(hiddenLink.getAttribute("tabindex"), "-1");

  const bar = hiddenLink.closest("div[class*='fixed']");
  assert.ok(bar);
  assert.ok(bar?.className.includes("translate-y-full"));
  assert.ok(bar?.className.includes("sm:hidden"));

  act(() => {
    Object.defineProperty(window, "scrollY", { configurable: true, value: 600 });
    fireEvent.scroll(window);
  });
  assert.ok(bar?.className.includes("translate-y-0"));
  assert.ok(!bar?.className.includes("translate-y-full"));
  assert.ok(
    screen.getByRole("link", { name: "Descubrir mi próxima prioridad" }),
  );

  act(() => {
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
    fireEvent.scroll(window);
  });
  assert.ok(bar?.className.includes("translate-y-full"));
});
