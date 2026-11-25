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
    business: { name: "Mantenimiento Hogar · INT QA", revenue_model: "Pintura, electricidad y reparaciones en hogares, cobro por trabajo.", description: "Equipo de tres personas, reparación urgente y mantenimiento programado." },
    diagnostic: { owner_hours_per_week: 25, team_size: 3, monthly_revenue: 400,
      main_challenge: "Dar a conocer la empresa y conseguir primeros contactos de hogares.",
      primary_goal: "Construir gradualmente una cartera de 36 clientes fijos.",
      customers_description: "Propietarios de vivienda que necesitan resolver reparaciones urgentes.",
      sales_process: "Publicidad en internet. No tengo redes sociales y todavía no confirmo otro canal digital.",
      owner_responsibilities: "El propietario cotiza, atiende consultas y coordina a dos especialistas." },
    resources: { social_media: "unavailable" },
    sample: "QA sintético: revisamos dos solicitudes de reparación. Una persona preguntó por disponibilidad y tarifa de diagnóstico. Aún falta confirmar que acepte una cotización.",
  },
  {
    key: "limpieza",
    business: { name: "Limpieza Muebles · INT QA", revenue_model: "Limpieza de sofás y colchones a domicilio con precio por pieza y costo de traslado.", description: "Equipo de dos que concentra visitas en dos barrios contiguos." },
    diagnostic: { owner_hours_per_week: 4, team_size: 2, monthly_revenue: 400,
      main_challenge: "Conseguir clientes en dos barrios concretos sin dispersar el tiempo de traslado.",
      primary_goal: "Generar oportunidades locales compatibles con la agenda disponible.",
      customers_description: "Hogares de dos barrios cercanos con sofás o colchones que requieren limpieza.",
      sales_process: "Recomendaciones locales de contactos existentes y atención por WhatsApp. No tengo redes sociales.",
      owner_responsibilities: "El propietario atiende consultas y coordina el equipo de limpieza." },
    resources: { social_media: "unavailable", whatsapp: "available", existing_contacts: "available" },
    sample: "QA sintético: dos contactos consultaron por limpieza de sofá. Uno pidió un horario para el sábado en la zona elegida. Todavía no hubo reserva pagada.",
  },
];
const evidence = { application: app, startedAt: new Date().toISOString(), scenarios: {} };
const evidenceFile = path.join(root, process.env.QA_BROWSER_FINAL ? "browser-observations-final.json" : "browser-observations.json");
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
  const dir = path.join(root, "screenshots", process.env.QA_BROWSER_FINAL ? "final" : "", key);
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
      .select("id,week_number,status,weekly_plan,strategic_diagnosis,prompt_version,strategic_continuity")
      .eq("business_id", q.business).eq("week_number", week).maybeSingle());
    if (plan?.status === "failed") throw new Error("El plan de semana " + week + " quedó en estado failed.");
    return plan?.status === "ready" && plan;
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
      await group.getByRole("button", { name: /^Agregar/ }).click();
      await answerFields(group.locator("ol > li > fieldset").first(), field.fields, scenario);
    } else if (field.type === "multi_select") {
      const group = form.locator("fieldset" + id);
      const minimum = field.min_items ?? 1;
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
  const capture = page.locator("dialog").filter({ hasText: "Resultado de la acción" });
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
    [/Cuéntame qué ocurrió/, absence ? "No se obtuvieron resultados empresariales." : scenario.sample],
    [absence ? 'input[name="hypothesis_status"][value="validated"]' : 'input[name="hypothesis_status"][value="inconclusive"]', null],
    [/Describe hechos observables/, absence ? "No disponemos de evidencia de mercado." : scenario.sample],
    [/Escribe el aprendizaje/, scenario.key === "mantenimiento" ? "QA: aclarar el problema urgente y el canal autorizado antes de ampliar el alcance." : "QA: separar por barrio y tamaño del mueble para conservar tiempos de traslado."],
    [/Opcional. Puedes dejarlo vacío/, "QA: conservar los recursos confirmados y acotar la prueba a una señal observable."],
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
  }
  const memorized = await poll(() => data(user.client.from("business_memory").select("id,origin,source_id")
    .eq("source_id", result.id).maybeSingle()), 10000);
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
  const user = await testHelpers.createTestUser(admin, config, "int-v2-" + scenario.key);
  let context;
  try {
    const business = await data(user.client.from("businesses").insert({ owner_id: user.id, ...scenario.business }).select("id").single());
    await data(user.client.from("business_diagnostics").insert({
      business_id: business.id, business_stage: "starting", currency_code: "USD", ...scenario.diagnostic,
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
    const q = { page, scenario, user, business: business.id };
    result.stage = "week-1";
    await login(page, user);
    let plan = await planFor(q, 1);
    await openReady(page, 1);
    assert.equal(plan.prompt_version, "v6-strategic-intelligence");
    await responsive(page, scenario, result);
    await page.locator('summary[aria-label="Mi cuenta"]').click();
    await page.getByRole("link", { name: "Canales y recursos" }).click();
    await page.waitForURL("**/business-context");
    const select = page.getByLabel("Redes sociales", { exact: true });
    assert.equal(await select.inputValue(), "unavailable");
    await select.locator("xpath=ancestor::form").getByRole("button", { name: "Guardar disponibilidad" }).click();
    await wait(page.getByRole("status").getByText("Disponibilidad guardada."));
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
        assert.equal(requiredResources(item).includes("social_media"), false);
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
    await testHelpers.deleteTestUser(admin, user);
  }
}

const browser = await chromium.launch();
try {
  await Promise.all(cases.map((scenario) => scenarioRun(browser, scenario)));
} finally {
  evidence.finishedAt = new Date().toISOString();
  save();
  await browser.close();
}

