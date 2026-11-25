import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { runCycle, isolation, runSupplement, runManualControl } from "./journey-cycle.mjs";

const loadInstalledPackage = createRequire(import.meta.url);
const { chromium } = loadInstalledPackage(process.env.QA_PLAYWRIGHT_PATH);
const root = path.dirname(fileURLToPath(import.meta.url));
const app = "http://localhost:3000";
const mail = "http://127.0.0.1:54324";
const resumeLog = process.env.QA_RESUME
  ? JSON.parse(fs.readFileSync(path.join(root, "reports", "observations.json"), "utf8"))
  : null;
const stamp = resumeLog?.run ?? Date.now().toString(36);
const fileEnv = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((line) => line.match(/^([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/))
    .filter(Boolean)
    .map(([, key, value]) => [key, value.replace(/^['"]|['"]$/g, "")])
);
const dbUrl = fileEnv.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(new URL(dbUrl).origin, "http://127.0.0.1:54321");
assert.equal(new URL(fileEnv.NEXT_PUBLIC_SITE_URL).origin, app);
const scenarios = [
  {
    key: "cafe-horizonte", name: "Café Horizonte · QA",
    description: "Cafetería con panadería de barrio que opera desde hace tres años. Atiende a comercios cercanos y clientes recurrentes.",
    revenue_model: "Venta directa de café, desayunos y panadería en el local, además de pedidos por WhatsApp.",
    business_stage: "stalled", team_size: "4", owner_hours_per_week: "12",
    main_challenge: "Facturamos USD 8.500 al mes y tenemos costos y gastos de USD 7.800. Quedan USD 600 en caja y vencen USD 2.500 próximamente. Vendemos con regularidad, pero nos cuesta cumplir los compromisos.",
    primary_goal: "Recuperar el control del efectivo y atender pagos próximos antes de expandir la cafetería.",
    customers_description: "Trabajadores de comercios cercanos, residentes y clientes recurrentes de desayunos.",
    sales_process: "Venta en el local y pedidos por WhatsApp. Hay pagos inmediatos y algunos pedidos de empresas con pago posterior.",
    owner_responsibilities: "El propietario decide compras, precios y pagos y supervisa los turnos junto con un equipo de cuatro personas.",
    monthly_revenue: "8500",
    result: "QA sintético: conciliamos 12 movimientos, separamos el cobro de ventas del costo de reposición y ubicamos USD 2.500 de obligaciones próximas. La caja disponible sigue en USD 600.",
    evidence: "QA sintético: 12 movimientos conciliados y calendario de USD 2.500 de pagos identificados. No se atribuye al plan una subida de ventas ni un cambio de efectivo.",
    learning: "QA sintético: ventas y margen aproximado no resuelven por sí solos el desfase de caja. Los pedidos empresariales demoran el cobro, aunque haya actividad regular.",
    focus: "QA sintético: contrastar cobros efectivamente recibidos con vencimientos y acordar fechas de pago antes de aumentar compras.",
  },
  {
    key: "nova-studio", name: "Nova Studio · QA",
    description: "Estudio de diseño digital y servicios profesionales con un año de operación. Trabaja con el propietario y dos colaboradores.",
    revenue_model: "Proyectos de diseño y diseño web cotizados por alcance. Las oportunidades llegan principalmente por recomendaciones.",
    business_stage: "operating", team_size: "3", owner_hours_per_week: "8",
    main_challenge: "Tenemos capacidad para atender proyectos, pero llegan pocas oportunidades. La propuesta de valor es poco diferenciada y cambiamos los mensajes comerciales con frecuencia.",
    primary_goal: "Definir una propuesta de valor clara y generar oportunidades comerciales cualificadas.",
    customers_description: "Pequeñas empresas de servicios que necesitan comunicar su oferta y mejorar su presencia digital.",
    sales_process: "Recibimos recomendaciones, hacemos una llamada de diagnóstico y enviamos una cotización. El seguimiento y los mensajes varían.",
    owner_responsibilities: "El propietario lidera ventas y define la propuesta. Dos colaboradores ejecutan diseño y desarrollo.",
    monthly_revenue: process.env.QA_NOVA_REVENUE ?? "",
    result: "QA sintético: probamos una propuesta centrada en resultados con tres empresas de servicios. Dos respondieron y una pidió una llamada; todavía no hubo cierre.",
    evidence: "QA sintético: tres contactos, dos respuestas y una llamada solicitada. La muestra es insuficiente para inferir conversión estable.",
    learning: "QA sintético: describir el resultado esperado generó mejores respuestas que enumerar herramientas. Conviene validar la señal con prospectos fuera de las recomendaciones.",
    focus: "QA sintético: contrastar la propuesta con cinco perfiles comparables y registrar respuestas y llamadas por origen.",
  },
  {
    key: "taller-andino", name: "Taller Andino · QA",
    description: "Taller de fabricación de muebles a medida con seis años de operación y un equipo de ocho personas.",
    revenue_model: "Fabricación de muebles por encargo, cotizados según materiales, acabado y tiempo de fabricación.",
    business_stage: "operating", team_size: "8", owner_hours_per_week: "10",
    main_challenge: "Existe demanda regular, pero compras, cotizaciones, coordinación y decisiones operativas pasan por el propietario. Los pedidos se retrasan cuando no está.",
    primary_goal: "Reducir la dependencia del propietario y mejorar la capacidad operativa antes de aceptar más pedidos.",
    customers_description: "Hogares y comercios que encargan muebles a medida y esperan fechas confiables de entrega.",
    sales_process: "Recibimos solicitudes y cotizamos según medidas. El propietario aprueba materiales y coordina la programación de cada pedido.",
    owner_responsibilities: "El propietario concentra compras, cotización, planificación y excepciones. El equipo fabrica e instala los muebles.",
    monthly_revenue: process.env.QA_TALLER_REVENUE ?? "",
    result: "QA sintético: se midieron cinco pedidos. Tres se detuvieron esperando aprobación de materiales. El equipo liberó una compra estándar con un límite aprobado.",
    evidence: "QA sintético: cinco pedidos observados, tres esperas de aprobación y una compra estándar resuelta fuera del propietario. Todavía falta medir tiempo de entrega.",
    learning: "QA sintético: las excepciones requieren decisión del dueño, pero materiales estándar pueden delegarse con un catálogo y un límite.",
    focus: "QA sintético: realizar una prueba controlada de compras estándar delegadas y medir tiempo de espera por pedido.",
  },
];

const outcome = resumeLog ?? {
  run: stamp, startedAt: new Date().toISOString(), scenarios: {}, security: [], environment: { application: app, supabase: dbUrl, mailpit: mail, providerConfigured: Boolean(fileEnv.OPENAI_API_KEY) },
};
for (const scenario of scenarios) {
  outcome.scenarios[scenario.key] ??= { name: scenario.name, stages: {}, observations: [], checkpoints: {} };
  fs.mkdirSync(path.join(root, scenario.key), { recursive: true });
}
fs.mkdirSync(path.join(root, "responsive"), { recursive: true });
fs.mkdirSync(path.join(root, "reports"), { recursive: true });
function save() {
  const temp = path.join(root, "reports", "observations.tmp.json");
  fs.writeFileSync(temp, JSON.stringify(outcome, null, 2) + "\n");
  for (let attempt = 0; ; attempt++) {
    try {
      fs.renameSync(temp, path.join(root, "reports", "observations.json"));
      break;
    } catch (error) {
      if (attempt === 7 || !["EPERM", "EACCES"].includes(error.code)) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
}
function step(s, label, details = {}) {
  outcome.scenarios[s.key].stages[label] = { status: "PASS", ...details };
  save();
  console.log(s.key, label, "PASS");
}
function errorSummary(error) {
  return String(error.message ?? error).split("\n")[0]
    .replace(/https?:\/\/[^\s"')]+/g, (url) => {
      try { const p = new URL(url); return p.origin + p.pathname; } catch { return "[url]"; }
    }).slice(0, 260);
}
const see = (locator, timeout = 20000) => locator.waitFor({ state: "visible", timeout });
const absent = (locator, timeout = 20000) => locator.waitFor({ state: "hidden", timeout });
const snap = (page, s, name, options = {}) =>
  page.screenshot({ path: path.join(root, s.key, name + ".png"), animations: "disabled", ...options });
const heading = (page, id) => page.locator("#" + id);
const workspace = (page) => page.getByRole("dialog", { name: "Plan actual", exact: true });
function client() {
  return createClient(dbUrl, fileEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
async function login(page, email, secret) {
  await page.goto(app + "/login");
  await page.locator('input[type="email"]').fill(email);
  await page.getByRole("button", { name: /Continuar/ }).click();
  await page.locator('input[type="password"]').fill(secret);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL(/\/(dashboard|onboarding\/)/);
}
async function read(query) {
  const { data, error } = await query;
  if (error) throw new Error("Supabase: " + error.code + " " + error.message);
  return data;
}
async function poll(task, timeout = 120000, interval = 900) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const result = await task();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error("La condición no se cumplió en " + timeout + " ms");
}
async function confirmEmail(page, s, email) {
  const message = await poll(async () => {
    const result = await page.request.get(mail + "/api/v1/search", { params: { query: "to:" + email } });
    if (!result.ok()) throw new Error("Mailpit search HTTP " + result.status());
    const { messages } = await result.json();
    return messages?.find((item) => item.To?.some(({ Address }) => Address === email));
  }, 30000);
  const msg = await page.request.get(mail + "/api/v1/message/" + encodeURIComponent(message.ID));
  assert.ok(msg.ok());
  const detail = await msg.json();
  assert.ok(detail.To?.some(({ Address }) => Address === email));
  assert.match(detail.Subject, /confirm/i);
  await page.goto(mail + "/view/" + encodeURIComponent(message.ID));
  let confirm;
  await poll(async () => {
    for (const frame of page.frames()) {
      const link = frame.getByRole("link", { name: /confirmar correo|confirm your mail/i }).first();
      if (await link.isVisible()) { confirm = { frame, link }; return true; }
    }
  }, 18000);
  const confirmUrl = new URL(await confirm.link.getAttribute("href"), app);
  assert.equal(confirmUrl.origin, app);
  assert.equal(confirmUrl.pathname, "/auth/confirm");
  assert.ok(confirmUrl.searchParams.has("token_hash") || confirmUrl.searchParams.has("code"));
  const text = await confirm.frame.locator("body").innerText();
  assert.match(text, /confirma tu (correo|cuenta)/i);
  assert.ok(!/(token_hash|access_token)=/.test(text));
  await confirm.frame.locator("body").screenshot({ path: path.join(root, s.key, "03-email-confirmation.png"), animations: "disabled" });
  const opened = await Promise.all([
    page.context().waitForEvent("page", { timeout: 8500 }).catch(() => null),
    confirm.link.click(),
  ]);
  const appPage = opened[0] ?? page;
  await appPage.waitForURL(/localhost:3000\/(login|onboarding|dashboard)/, { timeout: 30000 });
  step(s, "email-confirmation", { destination: new URL(appPage.url()).pathname, subject: detail.Subject, exactRecipient: true, language: "es", identity: /IA Emprendedor/.test(text) ? "IA Emprendedor" : "TuCEO IA" });
  return appPage;
}
async function enterQuestions(page, s, names) {
  for (const name of names) {
    const input = page.locator('input:not([type=hidden])[name="' + name + '"], textarea[name="' + name + '"]').first();
    await see(input);
    if (await input.getAttribute("type") === "radio") {
      await page.locator('input[type=radio][name="' + name + '"][value="' + s[name] + '"]').check();
    } else {
      await input.fill(s[name]);
    }
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
  }
}
const diagnosticFields = [
  "business_stage", "team_size", "owner_hours_per_week", "main_challenge", "primary_goal",
  "customers_description", "sales_process", "owner_responsibilities", "monthly_revenue", "currency_code",
];
async function finishDiagnostic(page, s, db, business) {
  const rec = outcome.scenarios[s.key];
  const started = Date.now();
  const query = () => db.from("business_diagnostics").select("created_at,business_stage,team_size,owner_hours_per_week,main_challenge,primary_goal,monthly_revenue,currency_code").eq("business_id", business.id).maybeSingle();
  const existing = await read(query());
  if (!existing) {
    await page.goto(app + "/onboarding/diagnostic");
    if (!s.monthly_revenue) {
      await enterQuestions(page, s, diagnosticFields.slice(0, 8));
      const revenue = page.locator('input[name="monthly_revenue"]');
      await see(revenue);
      await page.getByRole("button", { name: "Continuar", exact: true }).click();
      await see(page.locator('input[name="monthly_revenue"][aria-invalid="true"]'));
      const missing = await page.locator("#monthly_revenue-error").innerText();
      await snap(page, s, "04-onboarding");
      rec.stages["onboarding-diagnostic"] = {
        status: "BLOCKED", completedQuestions: 8, questions: 10, cause: "Facturación obligatoria sin valor informado",
        validation: missing, ui: await revenue.getAttribute("placeholder"),
      };
      save();
      console.log(s.key, "onboarding-diagnostic", "BLOCKED", "Facturación obligatoria");
      return false;
    }
    await enterQuestions(page, { ...s, currency_code: "USD" }, diagnosticFields);
    await see(page.getByRole("button", { name: "Preparar mi diagnóstico" }));
    await page.getByRole("button", { name: "Preparar mi diagnóstico" }).scrollIntoViewIfNeeded();
    await snap(page, s, "04-onboarding", { fullPage: true });
    await page.getByRole("button", { name: "Preparar mi diagnóstico" }).click();
    await page.waitForURL(/\/dashboard/);
  }
  const diagnostic = existing ?? await read(query());
  assert.ok(diagnostic);
  rec.inputs = { business: { name: business.name, description: business.description, revenue_model: business.revenue_model }, diagnostic };
  if (rec.stages["onboarding-diagnostic"]?.status !== "PASS") {
    step(s, "onboarding-diagnostic", { questions: 10, seconds: existing ? null : Math.round((Date.now() - started) / 1000), persisted: true });
  }
  return true;
}
async function recoverScenario(browser, s) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  const rec = outcome.scenarios[s.key];
  const email = "journey-" + s.key + "-" + stamp + "@example.com";
  const secret = "Qa7!" + randomBytes(18).toString("hex");
  rec.activeStage = "qa-recovery";
  await page.goto(app + "/forgot-password");
  await page.locator('input[name="email"]').fill(email);
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await page.waitForURL((url) => url.searchParams.has("message"));
  const message = await poll(async () => {
    const response = await page.request.get(mail + "/api/v1/search", { params: { query: "to:" + email } });
    assert.ok(response.ok());
    const { messages } = await response.json();
    return messages?.find((item) => item.To?.some(({ Address }) => Address === email)
      && /reset|recuper|restablec/i.test(item.Subject));
  }, 25000);
  await page.goto(mail + "/view/" + encodeURIComponent(message.ID));
  let link;
  await poll(async () => {
    for (const frame of page.frames()) {
      if (!frame.parentFrame()) continue;
      const item = frame.getByRole("link", { name: /reset|recuper|restablec|cambiar/i }).first();
      if (await item.isVisible()) { link = item; return true; }
    }
  }, 25000);
  const destination = new URL(await link.getAttribute("href"), app);
  assert.ok([app, new URL(dbUrl).origin, "http://localhost:54321"].includes(destination.origin));
  if (destination.searchParams.has("redirect_to")) {
    assert.equal(new URL(destination.searchParams.get("redirect_to")).origin, app);
  }
  const [opened] = await Promise.all([context.waitForEvent("page", { timeout: 5000 }).catch(() => null), link.click()]);
  const authorizedPage = opened ?? page;
  await authorizedPage.waitForURL("**/reset-password", { timeout: 28000 });
  await authorizedPage.locator('input[name="password"]').fill(secret);
  await authorizedPage.locator('input[name="confirmation"]').fill(secret);
  await authorizedPage.getByRole("button", { name: "Guardar contraseña" }).click();
  await authorizedPage.waitForURL("**/login*");
  await login(authorizedPage, email, secret);
  const db = client();
  await read(db.auth.signInWithPassword({ email, password: secret }));
  const business = await read(db.from("businesses").select("id,name,description,revenue_model").eq("name", s.name).single());
  step(s, "qa-recovery", { reason: "Reanudar la sesión del mismo registro QA tras detener el primer arnés", viaUi: true });
  rec.activeStage = "onboarding-diagnostic";
  const ready = await finishDiagnostic(authorizedPage, s, db, business);
  return { s, rec, browser, context, page: authorizedPage, db, business, email, secret, ready };
}
async function authenticateScenario(browser, s) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: "reduce" });
  let page = await context.newPage();
  const email = "journey-" + s.key + "-" + stamp + "@example.com";
  const secret = "Qa7!" + randomBytes(18).toString("hex");
  const rec = outcome.scenarios[s.key];
  rec.browser = { errorConsole: [], httpErrors: [], failedRequests: [] };
  function watch(p) {
    p.on("pageerror", (error) => rec.browser.errorConsole.push({ type: "pageerror", code: error.name }));
    p.on("console", (msg) => {
      if (msg.type() === "error") {
        const known = msg.text().match(/^[A-Z][A-Z_]{7,}/)?.[0];
        rec.browser.errorConsole.push({ type: "error", code: known ?? "browser-console" });
      }
    });
    p.on("response", (response) => {
      if (response.status() >= 400) {
        const u = new URL(response.url());
        rec.browser.httpErrors.push({ path: u.pathname, status: response.status() });
      }
    });
    p.on("requestfailed", (req) => {
      rec.browser.failedRequests.push({ path: new URL(req.url()).pathname, error: req.failure()?.errorText });
    });
  }
  watch(page);
  rec.activeStage = "landing";
  await page.goto(app + "/", { waitUntil: "domcontentloaded" });
  await see(page.locator('main h1').first());
  const hero = await page.locator("main h1").first().innerText();
  const signupLink = page.locator('main a[href="/signup"]:visible').first();
  await see(signupLink);
  const cta = await signupLink.innerText();
  await snap(page, s, "01-landing");
  await signupLink.click();
  await page.waitForURL("**/signup");
  step(s, "landing", { hero, cta });

  rec.activeStage = "signup";
  await page.locator('input[name="email"]').fill(email);
  await snap(page, s, "02-signup");
  await page.locator('input[name="password"]').fill(secret);
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  await page.waitForURL((url) => url.searchParams.get("status") === "account_created");
  const confirmation = await page.locator("main").innerText();
  assert.match(confirmation, /correo/i);
  step(s, "signup", { statusShown: "account_created" });

  rec.activeStage = "email-confirmation";
  const result = await confirmEmail(page, s, email);
  if (result !== page) watch(result);
  page = result;
  if (new URL(page.url()).pathname === "/login") await login(page, email, secret);
  await page.waitForURL("**/onboarding/business");

  rec.activeStage = "onboarding-business";
  const started = Date.now();
  await see(page.locator('input[name="name"]'));
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  rec.emptyOnboarding = await page.locator('input[name="name"][aria-invalid="true"]').isVisible();
  await enterQuestions(page, s, ["name", "description", "revenue_model"]);
  await page.getByRole("button", { name: "Continuar con mi diagnóstico" }).click();
  await page.waitForURL("**/onboarding/diagnostic");
  step(s, "onboarding-business", { questions: 3, emptyRejected: rec.emptyOnboarding, seconds: Math.round((Date.now() - started) / 1000) });

  rec.activeStage = "onboarding-diagnostic";
  const db = client();
  await read(db.auth.signInWithPassword({ email, password: secret }));
  const business = await read(db.from("businesses").select("id,name,description,revenue_model").eq("name", s.name).single());
  const ready = await finishDiagnostic(page, s, db, business);
  return { s, rec, browser, context, page, db, business, email, secret, ready };
}
async function main() {
  const browser = await chromium.launch();
  const sessions = [];
  try {
    outcome.environment.chromium = browser.version();
    if (resumeLog) {
      for (const rec of Object.values(outcome.scenarios)) {
        const toolFailures = rec.executions?.filter((item) => item.status === "FAIL" && item.cause?.includes("strict mode violation")) ?? [];
        if (toolFailures.length) {
          rec.toolingRecoveries ??= [];
          rec.toolingRecoveries.push(...toolFailures.map(({ sequence, cause }) => ({
            sequence, cause, disposition: "Arnés ajustado a identificadores de campo",
          })));
          rec.executions = rec.executions.filter((item) => !toolFailures.includes(item));
        }
      }
    }
    save();
    for (const s of scenarios) {
      if (process.env.QA_CAFE_MANUAL_CONTROL && s.key !== "cafe-horizonte") continue;
      try {
        const session = resumeLog ? await recoverScenario(browser, s) : await authenticateScenario(browser, s);
        sessions.push(session);
        if (session.ready && session.rec.stages.T2?.status !== "PASS") await runCycle(session, helper);
        if (session.s.key === "cafe-horizonte" && session.rec.stages.T2?.status === "PASS" && !session.rec.supplemental?.length) {
          await runSupplement(session, helper);
        }
        if (process.env.QA_CAFE_MANUAL_CONTROL && session.rec.stages.T2?.status === "PASS") await runManualControl(session, helper);
      } catch (error) {
        const rec = outcome.scenarios[s.key];
        const stage = rec.activeStage;
        rec.stages[stage] = { status: "FAIL", cause: errorSummary(error) };
        console.log(s.key, stage, "FAIL", errorSummary(error));
        save();
      }
    }
    if (sessions.length > 1) {
      outcome.security = [];
      await isolation(sessions, helper);
    }
  } finally {
    outcome.finishedAt = new Date().toISOString();
    save();
    await browser.close();
  }
}
const helper = { app, root, see, absent, snap, heading, workspace, login, read, poll, outcome, step, save, errorSummary, chromium };
save();
main().catch((error) => { console.error(errorSummary(error)); process.exitCode = 1; });

