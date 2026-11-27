import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";

const load = createRequire(import.meta.url);
const { chromium } = load(process.env.QA_PLAYWRIGHT_PATH);
const testHelpers = load(path.join(process.cwd(), ".test-dist/tests/support/supabase-local.js"));
const { getActionCaptureSchema } = load(path.join(process.cwd(), ".test-dist/src/lib/action-capture.js"));
const { requiredResources } = load(path.join(process.cwd(), ".test-dist/src/lib/strategic-action.js"));
const config = testHelpers.loadLocalSupabaseConfig();
testHelpers.assertLocalSupabaseUrl(config.url);
assert.ok(config.anonKey && config.serviceRoleKey);
assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname, "127.0.0.1");

const root = path.dirname(fileURLToPath(import.meta.url));
const app = process.env.QA_APP ?? "http://localhost:3000";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(app).hostname));
const admin = createClient(config.url, config.serviceRoleKey);
const cases = [
  {
    key: "mantenimiento",
    business: { name: "Mantenimiento Hogar · REL QA", revenue_model: "Pintura, electricidad y reparaciones en hogares, cobro por trabajo.", description: "Equipo de tres personas, reparación urgente y mantenimiento programado." },
    diagnostic: { owner_hours_per_week: 25, team_size: 3, monthly_revenue: 400,
      main_challenge: "Dar a conocer la empresa y conseguir primeros contactos de hogares.",
      primary_goal: "Construir gradualmente una cartera de 36 clientes fijos.",
      customers_description: "Propietarios de vivienda que necesitan resolver reparaciones urgentes.",
      sales_process: "Publicidad en internet. Todavía no confirmo qué canal produjo una consulta.",
      owner_responsibilities: "El propietario cotiza, atiende consultas y coordina a dos especialistas." },
    resources: {},
    sample: "QA sintético: revisamos dos solicitudes de reparación. Una persona preguntó por disponibilidad y tarifa de diagnóstico. Aún falta confirmar que acepte una cotización.",
  },
  {
    key: "limpieza",
    business: { name: "Limpieza Muebles · REL QA", revenue_model: "Limpieza de sofás y colchones a domicilio con precio por pieza y costo de traslado.", description: "Equipo de dos que concentra visitas en dos barrios contiguos." },
    diagnostic: { owner_hours_per_week: 4, team_size: 2, monthly_revenue: 400,
      main_challenge: "Conseguir clientes en dos barrios concretos sin dispersar el tiempo de traslado.",
      primary_goal: "Generar oportunidades locales compatibles con la agenda disponible.",
      customers_description: "Hogares de dos barrios cercanos con sofás o colchones que requieren limpieza.",
      sales_process: "Recomendaciones locales de contactos existentes y atención por WhatsApp. No tengo redes sociales.",
      owner_responsibilities: "El propietario atiende consultas y coordina el equipo de limpieza." },
    resources: { social_media: "unavailable", whatsapp: "available", existing_contacts: "available" },
    sample: "QA sintético: dos contactos consultaron por limpieza de sofá. Uno pidió un horario para el sábado en la zona elegida. Todavía no hubo reserva pagada.",
  },
  ...[
  {
    "key": "cafe-horizonte",
    "business": {
      "name": "Café Horizonte · REL QA",
      "description": "Cafetería con panadería de barrio que opera desde hace tres años. Atiende a comercios cercanos y clientes recurrentes.",
      "revenue_model": "Venta directa de café, desayunos y panadería en el local, además de pedidos por WhatsApp."
    },
    "stage": "stalled",
    "diagnostic": {
      "owner_hours_per_week": 12,
      "team_size": 4,
      "monthly_revenue": 8500,
      "main_challenge": "Facturamos USD 8.500 al mes y tenemos costos y gastos de USD 7.800. Quedan USD 600 en caja y vencen USD 2.500 próximamente. Vendemos con regularidad, pero nos cuesta cumplir los compromisos.",
      "primary_goal": "Recuperar el control del efectivo y atender pagos próximos antes de expandir la cafetería.",
      "customers_description": "Trabajadores de comercios cercanos, residentes y clientes recurrentes de desayunos.",
      "sales_process": "Venta en el local y pedidos por WhatsApp. Hay pagos inmediatos y algunos pedidos de empresas con pago posterior.",
      "owner_responsibilities": "El propietario decide compras, precios y pagos y supervisa los turnos junto con un equipo de cuatro personas."
    },
    "resources": {
      "whatsapp": "available"
    },
    "sample": "QA sintético: conciliamos 12 movimientos, separamos el cobro de ventas del costo de reposición y ubicamos USD 2.500 de obligaciones próximas. La caja disponible sigue en USD 600.",
    "learning": "QA sintético: ventas y margen aproximado no resuelven por sí solos el desfase de caja. Los pedidos empresariales demoran el cobro, aunque haya actividad regular.",
    "evidence": "QA sintético: 12 movimientos conciliados y calendario de USD 2.500 de pagos identificados. No se atribuye al plan una subida de ventas ni un cambio de efectivo.",
    "focus": "QA sintético: contrastar cobros efectivamente recibidos con vencimientos y acordar fechas de pago antes de aumentar compras."
  },
  {
    "key": "nova-studio",
    "business": {
      "name": "Nova Studio · REL QA",
      "description": "Estudio de diseño digital y servicios profesionales con un año de operación. Trabaja con el propietario y dos colaboradores.",
      "revenue_model": "Proyectos de diseño y diseño web cotizados por alcance. Las oportunidades llegan principalmente por recomendaciones."
    },
    "stage": "operating",
    "diagnostic": {
      "owner_hours_per_week": 8,
      "team_size": 3,
      "monthly_revenue": 4500,
      "main_challenge": "Tenemos capacidad para atender proyectos, pero llegan pocas oportunidades. La propuesta de valor es poco diferenciada y cambiamos los mensajes comerciales con frecuencia.",
      "primary_goal": "Definir una propuesta de valor clara y generar oportunidades comerciales cualificadas.",
      "customers_description": "Pequeñas empresas de servicios que necesitan comunicar su oferta y mejorar su presencia digital.",
      "sales_process": "Recibimos recomendaciones, hacemos una llamada de diagnóstico y enviamos una cotización. El seguimiento y los mensajes varían.",
      "owner_responsibilities": "El propietario lidera ventas y define la propuesta. Dos colaboradores ejecutan diseño y desarrollo."
    },
    "resources": {
      "existing_contacts": "available"
    },
    "sample": "QA sintético: probamos una propuesta centrada en resultados con tres empresas de servicios. Dos respondieron y una pidió una llamada; todavía no hubo cierre.",
    "learning": "QA sintético: describir el resultado esperado generó mejores respuestas que enumerar herramientas. Conviene validar la señal con prospectos fuera de las recomendaciones.",
    "evidence": "QA sintético: tres contactos, dos respuestas y una llamada solicitada. La muestra es insuficiente para inferir conversión estable.",
    "focus": "QA sintético: contrastar la propuesta con cinco perfiles comparables y registrar respuestas y llamadas por origen."
  },
  {
    "key": "taller-andino",
    "business": {
      "name": "Taller Andino · REL QA",
      "description": "Taller de fabricación de muebles a medida con seis años de operación y un equipo de ocho personas.",
      "revenue_model": "Fabricación de muebles por encargo, cotizados según materiales, acabado y tiempo de fabricación."
    },
    "stage": "operating",
    "diagnostic": {
      "owner_hours_per_week": 10,
      "team_size": 8,
      "monthly_revenue": 18000,
      "main_challenge": "Existe demanda regular, pero compras, cotizaciones, coordinación y decisiones operativas pasan por el propietario. Los pedidos se retrasan cuando no está.",
      "primary_goal": "Reducir la dependencia del propietario y mejorar la capacidad operativa antes de aceptar más pedidos.",
      "customers_description": "Hogares y comercios que encargan muebles a medida y esperan fechas confiables de entrega.",
      "sales_process": "Recibimos solicitudes y cotizamos según medidas. El propietario aprueba materiales y coordina la programación de cada pedido.",
      "owner_responsibilities": "El propietario concentra compras, cotización, planificación y excepciones. El equipo fabrica e instala los muebles."
    },
    "resources": {
      "delegate": "available"
    },
    "sample": "QA sintético: se midieron cinco pedidos. Tres se detuvieron esperando aprobación de materiales. El equipo liberó una compra estándar con un límite aprobado.",
    "learning": "QA sintético: las excepciones requieren decisión del dueño, pero materiales estándar pueden delegarse con un catálogo y un límite.",
    "evidence": "QA sintético: cinco pedidos observados, tres esperas de aprobación y una compra estándar resuelta fuera del propietario. Todavía falta medir tiempo de entrega.",
    "focus": "QA sintético: realizar una prueba controlada de compras estándar delegadas y medir tiempo de espera por pedido."
  }
],
];
const evidence = { application: app, startedAt: new Date().toISOString(), scenarios: {} };
const evidenceFile = path.join(root, process.env.QA_BROWSER_REPORT ?? "browser-observations.json");
function save() {
  fs.writeFileSync(evidenceFile, JSON.stringify(evidence, null, 2) + "\n");
}
function safeError(error) {
  return String(error?.message ?? error).split("\n")[0]
    .replace(/https?:\/\/[^\s"')]+/g, "[ruta omitida]").slice(0, 260);
}
async function data(query) {
  const result = await query;
  if (result.error) throw new Error(result.error.code + " " + result.error.message);
  return result.data;
}
async function poll(fn, timeout = 150000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const value = await fn();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 850));
  }
  throw new Error("Se agotó la espera de la comprobación.");
}
async function snap(page, key, name) {
  const dir = path.join(root, "screenshots", key);
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, name + ".png"), animations: "disabled" });
}
const work = (page) => page.getByRole("dialog", { name: "Plan actual", exact: true });
const primary = (page) => page.locator("#execution-overview").getByRole("button", { name: /Comenzar acción|Empezar con IA|Revisar entregable/ });
const wait = (locator, timeout = 20000) => locator.waitFor({ state: "visible", timeout });

async function login(page, user) {
  await page.goto(app + "/login");
  await page.locator('input[type="email"]').fill(user.email);
  await page.getByRole("button", { name: /Continuar/ }).click();
  await page.locator('input[type="password"]').fill(user.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL(/\/dashboard/);
}
async function planFor(q, week) {
  return poll(async () => {
    const plan = await data(q.user.client.from("ceo_plans")
      .select("id,week_number,status,weekly_plan,strategic_diagnosis,prompt_version,strategic_continuity,updated_at")
      .eq("business_id", q.business).eq("week_number", week).maybeSingle());
    if (plan?.status === "failed") {
      if (q.result.retry) { await waitForRecovery(q); throw new Error("El plan de semana " + week + " quedó en estado failed."); }
      await waitForRecovery(q);
      q.result.retry = { week, planId: plan.id, status: "requested" };
      save();
      await snap(q.page, q.scenario.key, "semana-" + week + "-reintento");
      await q.page.getByRole("button", { name: "Reintentar preparación" }).click();
      await poll(async () => {
        const current = await data(q.user.client.from("ceo_plans").select("status,updated_at").eq("id", plan.id).single());
        return current.updated_at !== plan.updated_at;
      }, 45000);
      return null;
    }
    if (plan?.status === "ready" && q.result.retry?.week === week) {
      assert.equal(plan.id, q.result.retry.planId);
      q.result.retry.status = "recovered";
    }
    return plan?.status === "ready" && plan;
  });
}
async function waitForRecovery(q) {
  await wait(q.page.getByRole("button", { name: "Reintentar preparación" }), 25000).catch(async () => {
    await q.page.goto(app + "/dashboard");
  });
}

async function openReady(page, week) {
  const header = page.locator("main > header");
  await wait(page.locator("#decision-hero-title"), 28000).catch(() => page.goto(app + "/dashboard"));
  await wait(page.locator("#decision-hero-title"));
  if (!(await header.innerText()).includes("Semana " + week)) await page.goto(app + "/dashboard");
  await wait(page.locator("#decision-hero-title"));
  await page.evaluate(() => document.fonts.ready);
}
function fieldText(field, scenario) {
  const name = [field.id, field.label, field.placeholder ?? ""].join(" ").toLowerCase();
  if (/date|fecha|yyyy-mm-dd/.test(name)) return "2026-11-27";
  if (/mensaje|message/.test(name)) return "QA sintético: Hola. ¿Te interesa confirmar el servicio en tu zona y conversar sobre horarios?";
  if (/contact|cliente|customer|segment/.test(name) && field.type === "text") return "QA · Contacto de la zona habitual";
  if (/canal|channel/.test(name)) return scenario.key === "limpieza" ? "WhatsApp declarado" : "Conversación directa con hogares del barrio";
  if (/oferta|offer|promesa|promise/.test(name)) return scenario.key === "limpieza"
    ? "QA: Limpieza de sofá por pieza con cita local y traslado incluido."
    : "QA: Visita de diagnóstico para una reparación urgente en el hogar.";
  return scenario.sample;
}
async function answerFields(form, fields, scenario) {
  for (const field of fields) {
    const id = '[id$="-' + field.id + '"]';
    if (field.type === "repeatable_group") {
      const group = form.locator("fieldset" + id);
      for (let i = 0; i < (field.min_items ?? 1); i++) await group.getByRole("button", { name: /^Agregar/ }).click();
      for (const row of await group.locator("ol > li > fieldset").all()) await answerFields(row, field.fields, scenario);
    } else if (field.type === "multi_select") {
      const group = form.locator("fieldset" + id);
      const minimum = field.min_items ?? Math.min(1, field.max_items ?? 1);
      for (let i = 0; i < minimum; i++) await group.getByRole("checkbox").nth(i).check();
    } else if (field.type === "single_select") {
      const option = field.options.find((o) => /parcial|partial|intent|interes|pending/.test(o.value)) ?? field.options[0];
      await form.locator("select" + id).selectOption(option.value);
    } else {
      const control = form.locator("input" + id + ", textarea" + id);
      const value = field.type === "number"
        ? String(Math.min(field.max ?? Infinity, Math.max(field.min ?? 0, /planned|planificad/.test(field.id) ? 2 : 1)))
        : fieldText(field, scenario).slice(0, field.max_length ?? 500);
      await control.fill(value);
    }
  }
}
async function execute(q, action, week, log) {
  const { page, scenario, user } = q;
  await primary(page).click();
  const panel = work(page);
  await wait(panel);
  assert.equal((await page.locator("#action-detail-title").innerText()).trim(), action.action.trim());
  if (action.execution_mode === "ai_assisted") {
    const section = panel.locator("#ai-action-workspace");
    await section.getByRole("button", { name: "Crear con ayuda de IA", exact: true }).click();
    await wait(section.getByText(/Borrador · Revisión/), 120000);
    await section.getByRole("button", { name: "Aprobar resultado", exact: true }).click();
    await wait(section.getByText("Entregable aprobado", { exact: true }), 30000);
    await panel.getByRole("button", { name: "Registrar evidencia y completar", exact: true }).click();
  } else {
    await panel.getByRole("button", { name: "Registrar resultado", exact: true }).click();
  }
  const capture = page.locator('dialog:has(> div > p:text-is("Resultado de la acción"))');
  const schema = getActionCaptureSchema(action.capture_schema);
  await answerFields(capture, schema.fields, scenario);
  if (action.sequence === 1 && week === 1) await snap(page, scenario.key, "week-1-action-capture");
  await capture.getByRole("button", { name: "Guardar resultado y completar acción", exact: true }).click();
  const row = await poll(async () => {
    const saved = await data(user.client.from("weekly_actions").select("status,completion_data").eq("id", action.id).single());
    return saved.status === "completed" && saved;
  }, 35000);
  await capture.waitFor({ state: "hidden", timeout: 15000 });
  if (await panel.isVisible()) await page.keyboard.press("Escape");
  await page.reload();
  await wait(page.locator("#execution-overview-title"));
  log.executions.push({ sequence: action.sequence, mode: action.execution_mode, completionData: row.completion_data });
  save();
}

async function review(q, plan, week, log) {
  const { page, scenario, user } = q;
  await page.getByRole("link", { name: "Revisar mi semana", exact: true }).click();
  await page.waitForURL("**/weekly-review");
  const absence = week === 1 && scenario.key === "mantenimiento";
  const answers = [
    [absence ? 'input[name="outcome_status"][value="no_change"]' : 'input[name="outcome_status"][value="mixed"]', null],
    [/Cuéntame qué ocurrió/, absence ? "No se obtuvieron resultados empresariales. No tengo redes sociales." : scenario.sample],
    [absence ? 'input[name="hypothesis_status"][value="validated"]' : 'input[name="hypothesis_status"][value="inconclusive"]', null],
    [/Describe hechos observables/, absence ? "No disponemos de evidencia de mercado." : scenario.evidence ?? scenario.sample],
    [/Escribe el aprendizaje/, scenario.learning ?? (scenario.key === "mantenimiento" ? "QA: aclarar el problema urgente y el canal autorizado antes de ampliar el alcance." : "QA: separar por barrio y tamaño del mueble para conservar tiempos de traslado.")],
    [/Opcional. Puedes dejarlo vacío/, scenario.focus ?? "QA: conservar los recursos confirmados y acotar la prueba a una señal observable."],
  ];
  for (const [locator, value] of answers) {
    if (value === null) await page.locator(locator).check();
    else await page.getByPlaceholder(locator).fill(value);
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
  }
  const submit = page.getByRole("button", { name: "Confirmar y preparar mi siguiente semana" });
  if (absence) {
    await wait(page.getByText(/El siguiente plan tratará la hipótesis como inconclusa/));
    await submit.scrollIntoViewIfNeeded();
    await snap(page, scenario.key, "semana-1-percepcion-y-evidencia");
  }
  await submit.click();
  const result = await poll(() => data(user.client.from("weekly_reviews")
    .select("id,outcome_status,decision_learning,completed_actions,total_actions").eq("ceo_plan_id", plan.id).maybeSingle()), 35000);
  assert.equal(result.completed_actions, result.total_actions);
  if (absence) {
    assert.equal(result.decision_learning.hypothesis_status, "inconclusive");
    assert.equal(result.decision_learning.reported_hypothesis_status, "validated");
    const row = await poll(() => data(user.client.from("business_memory").select("content")
      .eq("memory_key", "feedback.social_media").maybeSingle()), 10000);
    assert.equal(row.content.availability, "unavailable");
    assert.equal(row.content.feedback.sourceId, result.id);
    log.resourceFeedbackPersisted = true;
  }
  const memorized = await poll(() => data(user.client.from("business_memory").select("id,origin,source_id")
    .eq("source_id", result.id).eq("category", "learning").maybeSingle()), 10000);
  assert.equal(memorized.origin, "weekly_review");
  log.review = result;
  log.learningMemory = true;
  save();
}

async function responsive(page, scenario, log) {
  log.viewports = [];
  for (const [width, height] of [[1280,720],[1366,768],[1440,900],[1920,1080],[390,844]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => {
      scrollTo(0, 0);
      return new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
    });
    const result = await page.evaluate(() => {
      const bar = document.querySelector(".command-navigation");
      const usable = getComputedStyle(bar).position === "fixed" ? bar.getBoundingClientRect().top : innerHeight;
      const blocks = {};
      for (const [name, sel] of Object.entries({
        decision: '[aria-labelledby="decision-hero-title"]', execution: "#execution-overview",
        evolution: '[aria-labelledby="business-evolution-title"]', dna: '[aria-labelledby="business-dna-title"]',
        cta: '#execution-overview button[aria-haspopup="dialog"]',
      })) {
        const element = document.querySelector(sel);
        if (!element) continue;
        const rect = element.getBoundingClientRect();
        blocks[name] = { top: Math.round(rect.top), bottom: Math.round(rect.bottom), fullyVisible: rect.top >= 0 && rect.bottom <= usable + 1 };
      }
      return { width: innerWidth, height: innerHeight, usable, blocks,
        scrollHeight: document.documentElement.scrollHeight, scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth };
    });
    log.viewports.push(result);
    await snap(page, scenario.key, "semana-1-" + width + "x" + height);
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  save();
}

async function scenarioRun(browser, scenario) {
  const result = { status: "RUNNING", cycles: [], stage: "setup" };
  evidence.scenarios[scenario.key] = result;
  const user = await testHelpers.createTestUser(admin, config, "reliability-" + scenario.key);
  let context;
  try {
    const business = await data(user.client.from("businesses").insert({ owner_id: user.id, ...scenario.business }).select("id").single());
    await data(user.client.from("business_diagnostics").insert({
      business_id: business.id, business_stage: scenario.stage ?? "starting", currency_code: "USD", ...scenario.diagnostic,
    }));
    for (const [key, availability] of Object.entries(scenario.resources)) {
      await data(user.client.rpc("record_business_memory", {
        p_business_id: business.id, p_memory_key: key,
        p_category: availability === "unavailable" ? "constraint" : "asset",
        p_content: { label: key, availability },
      }));
    }
    context = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    const q = { page, scenario, user, business: business.id, result };
    result.stage = "week-1";
    await login(page, user);
    let plan = await planFor(q, 1);
    await openReady(page, 1);
    assert.equal(plan.prompt_version, "v7-strategic-reliability");
    await responsive(page, scenario, result);
    await page.locator('summary[aria-label="Mi cuenta"]').click();
    await page.getByRole("link", { name: "Canales y recursos" }).click();
    await page.waitForURL("**/business-context");
    const select = page.getByLabel("Redes sociales", { exact: true });
    assert.equal(await select.inputValue(), scenario.resources.social_media ?? "unknown");

    await snap(page, scenario.key, "canales-y-recursos");
    await page.getByRole("link", { name: "Volver al centro de dirección" }).click();
    for (let week = 1; week <= 4; week++) {
      result.stage = "week-" + week;
      const log = { week, plan: plan.weekly_plan, decision: plan.strategic_diagnosis.critical_decision,
        continuity: plan.strategic_continuity, executions: [] };
      result.cycles.push(log);
      await openReady(page, week);
      if (week > 1) await snap(page, scenario.key, "semana-" + week + "-plan");
      const actions = await data(user.client.from("weekly_actions")
        .select("id,sequence,action,execution_mode,role_recommendation,capture_schema").eq("ceo_plan_id", plan.id).order("sequence"));
      assert.ok(actions.length && plan.weekly_plan.every((item) => item.strategy));
      for (const action of actions) {
        const item = plan.weekly_plan.find((entry) => entry.sequence === action.sequence);
        if (scenario.key === "limpieza" || (scenario.key === "mantenimiento" && week > 1)) {
          assert.equal(requiredResources(item).includes("social_media"), false);
        }
        result.stage = "week-" + week + "-action-" + action.sequence;
        await execute(q, action, week, log);
      }
      result.stage = "week-" + week + "-review";
      await review(q, plan, week, log);
      result.stage = "week-" + (week + 1) + "-generation";
      plan = await planFor(q, week + 1);
      log.nextPlanReady = true;
      save();
    }
    await openReady(page, 5);
    await snap(page, scenario.key, "semana-5-plan");
    result.status = "PASS";
    result.stage = "complete";
    console.log(scenario.key, "4 ciclos completos");
  } catch (error) {
    result.status = "FAIL";
    result.error = safeError(error);
    if (context?.pages()[0]) await snap(context.pages()[0], scenario.key, "fallo-observado").catch(() => {});
    console.log(scenario.key, result.stage, result.error);
  } finally {
    save();
    if (context) await context.close();
    if (process.env.QA_PRESERVE_CHECKPOINT) {
      console.log(scenario.key, "QA_PRESERVE_CHECKPOINT: datos del usuario conservados para diagnóstico. Ejecutar limpieza manual con QA_CLEANUP_USER=" + user.id + " cuando ya no sea necesario.");
    } else {
      await testHelpers.deleteTestUser(admin, user);
    }
  }
}

const browser = await chromium.launch();
try {
  const selection = process.env.QA_SCENARIOS?.split(",") ?? cases.map((item) => item.key);
  const selected = cases.filter((item) => selection.includes(item.key));
  assert.equal(selected.length, selection.length);
  await Promise.all(selected.map((scenario) => scenarioRun(browser, scenario)));
} finally {
  evidence.finishedAt = new Date().toISOString();
  save();
  await browser.close();
}

