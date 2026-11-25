import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execute, review } from "./journey-execution.mjs";

const planColumns = "id,week_number,status,created_at,generated_at,executive_summary,strategic_diagnosis,priorities,decision_hypothesis,strategic_continuity,time_allocation,evidence_status,external_evidence,previous_plan_id";
const actionColumns = "id,sequence,action,objective,reason,success_metric,expected_result,role_recommendation,estimated_hours,status,capture_schema,completion_data,execution_mode,action_type";
const dims = ["Mercado", "Finanzas", "Liquidez", "Operaciones", "Autonomía", "Crecimiento"];
const pendingCTA = (p) => p.locator("#execution-overview").getByRole("button", { name: /Comenzar acción|Empezar con IA|Revisar entregable/ });
async function getPlan(q, week, h) {
  return h.read(q.db.from("ceo_plans").select(planColumns).eq("business_id", q.business.id).eq("week_number", week).maybeSingle());
}
async function getActions(q, p, h) {
  return h.read(q.db.from("weekly_actions").select(actionColumns).eq("ceo_plan_id", p.id).order("sequence"));
}
async function waitPlan(q, week, h) {
  return h.poll(async () => {
    const plan = await getPlan(q, week, h);
    if (plan?.status === "failed") {
      const alert = await q.page.getByRole("alert").first().innerText({ timeout: 3000 }).catch(() => "");
      throw new Error("El plan " + week + " quedó en failed. " + alert);
    }
    return plan?.status === "ready" && plan;
  }, 155000, 1000);
}
async function reveal(q, plan, h) {
  await h.see(h.heading(q.page, "decision-hero-title"), 21000).catch(async () => {
    await q.page.goto(h.app + "/dashboard");
    await h.see(h.heading(q.page, "decision-hero-title"));
  });
  if (!(await q.page.locator("main > header").innerText()).includes("Semana " + plan.week_number)) await q.page.goto(h.app + "/dashboard");
  await h.see(h.heading(q.page, "decision-hero-title"));
  await q.page.evaluate(() => document.fonts.ready);
}
async function dismiss(page, dialog, h) {
  if (await dialog.isVisible()) {
    await page.keyboard.press("Escape");
    await h.absent(dialog);
  }
}
async function checkpoint(q, label, plan, h) {
  const { page, rec, db, business } = q;
  const evolution = page.locator('[aria-labelledby="business-evolution-title"]');
  const evolutionText = await evolution.innerText();
  const stage = await evolution.getByRole("img").getAttribute("aria-label");
  const ringSegments = await evolution.locator("svg circle").count();
  const dimensions = {};
  const explanations = {};
  for (const dim of dims) {
    const button = page.getByRole("button", { name: new RegExp("Ver detalle de " + dim + ":") });
    dimensions[dim] = (await button.getAttribute("aria-label")).split(": ").at(-1);
    if (label === "T0") {
      await button.click();
      const panel = page.getByRole("dialog", { name: dim, exact: true });
      await h.see(panel);
      explanations[dim] = await panel.innerText();
      await dismiss(page, panel, h);
    }
  }
  await page.getByRole("button", { name: "Ver evaluación" }).click();
  const dialog = page.getByRole("dialog", { name: "Evaluación empresarial" });
  await h.see(dialog);
  const explanation = await dialog.innerText();
  await dismiss(page, dialog, h);
  const resultsCard = page.locator('[aria-labelledby="business-results-title"]');
  const evidence = await h.read(db.from("business_evidence").select("id,evidence_type,certainty,source_weekly_action_id").eq("business_id", business.id));
  const actions = await getActions(q, plan, h);
  rec.checkpoints[label] = {
    week: plan.week_number, evolutionText, stage, ringSegments, dimensions, explanations, explanation,
    sourceCounts: explanation.match(/(\d+) declaradas · (\d+) documentadas · (\d+) verificadas/)?.slice(1).map(Number) ?? null,
    results: await resultsCard.count() ? await resultsCard.innerText() : null,
    actionProgress: page.getByRole("progressbar").count() ? await page.getByRole("progressbar").getAttribute("aria-label") : null,
    evidence: evidence.map((item) => ({ type: item.evidence_type, certainty: item.certainty })),
    decision: plan.strategic_diagnosis.critical_decision,
    completed: actions.filter((a) => a.status === "completed").length, total: actions.length,
  };
  if (label === "T0") {
    assert.equal(ringSegments, 5);
    assert.equal(evidence.length, 0);
    assert.equal(stage, "Sin etapa establecida");
    assert.equal(rec.checkpoints[label].results, null);
  }
  h.step(q.s, label, { stage, ringSegments, sources: rec.checkpoints[label].sourceCounts });
}
async function measure(page) {
  return page.evaluate(() => {
    const nav = document.querySelector(".command-navigation");
    const usable = getComputedStyle(nav).position === "fixed" ? nav.getBoundingClientRect().top : innerHeight;
    const selectors = {
      header: ".command-shell main > header", decision: '[aria-labelledby="decision-hero-title"]',
      execution: "#execution-overview", evolution: '[aria-labelledby="business-evolution-title"]',
      dna: '[aria-labelledby="business-dna-title"]', results: '[aria-labelledby="business-results-title"]',
      cta: '#execution-overview button[aria-haspopup=dialog]',
    };
    const blocks = Object.fromEntries(Object.entries(selectors).map(([key, selector]) => {
      const el = document.querySelector(selector);
      if (!el) return [key, null];
      const r = el.getBoundingClientRect();
      const visible = Math.max(0, Math.min(r.bottom, usable) - Math.max(r.top, 0))
        * Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
      const clipping = [];
      for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
        const style = getComputedStyle(node);
        const p = node.getBoundingClientRect();
        if ((/hidden|clip/.test(style.overflowY) && (r.bottom > p.bottom + 1 || r.top < p.top - 1))
          || (/hidden|clip/.test(style.overflowX) && (r.right > p.right + 1 || r.left < p.left - 1))) clipping.push(node.tagName);
      }
      return [key, { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height),
        percent: Math.round(100 * visible / (r.height * r.width)), clipping }];
    }));
    return { innerWidth, innerHeight, usable, scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth,
      blocks, boardOpen: Boolean(document.querySelector("#tablero-semanal[open]")) };
  });
}
async function responsive(q, h) {
  const { page, rec, s } = q;
  rec.responsive = [];
  for (const [width, height] of [[1280, 720], [1366, 768], [1440, 900], [1920, 1080], [390, 844]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => {
      scrollTo(0, 0);
      return new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
    });
    const data = await measure(page);
    const keys = width === 390 ? ["header", "decision", "execution", "cta"] : ["header", "decision", "execution", "evolution", "dna", "cta"];
    const pass = keys.every((key) => data.blocks[key]?.percent === 100 && !data.blocks[key].clipping.length)
      && data.scrollWidth === data.clientWidth && !data.boardOpen;
    const filename = s.key + "-" + width + "x" + height + ".png";
    await page.screenshot({ path: path.join(h.root, "responsive", filename), animations: "disabled" });
    rec.responsive.push({ ...data, status: pass ? "PASS" : "FAIL", filename });
  }
  const trigger = page.getByRole("button", { name: "¿Por qué esta decisión?" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.locator("dialog[open]");
  await h.see(dialog);
  await page.keyboard.press("Tab");
  const focusTrapped = await page.evaluate(() => Boolean(document.activeElement.closest("dialog[open]")));
  await dismiss(page, dialog, h);
  const focusRestored = await trigger.evaluate((el) => el === document.activeElement);
  const sectionOrder = await page.evaluate(() =>
    ["decision-hero-title", "execution-overview-title", "business-evolution-title", "business-dna-title"]
      .map((id) => document.getElementById(id).getBoundingClientRect().top));
  rec.accessibility = { focusTrapped, focusRestored, mobileOrder: sectionOrder.every((y, index) => !index || y > sectionOrder[index - 1]) };
  if (s.key === "cafe-horizonte") {
    const ext = process.env.QA_ZOOM_EXTENSION_PATH;
    if (ext && fs.existsSync(ext)) {
      const zoom = await h.chromium.launchPersistentContext("", {
        channel: "chromium", headless: true, viewport: { width: 1366, height: 768 }, reducedMotion: "reduce",
        args: ["--disable-extensions-except=" + ext, "--load-extension=" + ext],
      });
      try {
        await zoom.addCookies(await q.context.cookies());
        const p = zoom.pages()[0];
        await p.goto(h.app + "/dashboard");
        await h.see(h.heading(p, "decision-hero-title"));
        const worker = zoom.serviceWorkers()[0] ?? await zoom.waitForEvent("serviceworker", { timeout: 12000 });
        const factor = await worker.evaluate(async (url) => {
          const [tab] = await chrome.tabs.query({ url });
          await chrome.tabs.setZoom(tab.id, 2);
          return chrome.tabs.getZoom(tab.id);
        }, h.app + "/*");
        await p.waitForFunction(() => innerWidth < 700 && devicePixelRatio === 2);
        const data = await measure(p);
        await pendingCTA(p).evaluate((el) => el.scrollIntoView({ block: "center" }));
        await p.screenshot({ path: path.join(h.root, "responsive", s.key + "-zoom-200.png"), animations: "disabled" });
        await pendingCTA(p).focus();
        await p.keyboard.press("Enter");
        await h.see(h.workspace(p));
        await dismiss(p, h.workspace(p), h);
        rec.accessibility.zoom = { factor, scrollWidth: data.scrollWidth, clientWidth: data.clientWidth, openedByKeyboard: true };
      } catch (error) {
        rec.accessibility.zoom = { status: "BLOCKED", cause: h.errorSummary(error) };
      } finally {
        await zoom.close();
      }
    }
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.evaluate(() => scrollTo(0, 0));
  rec.stages.responsive = {
    status: rec.responsive.every((x) => x.status === "PASS") && focusTrapped && focusRestored && rec.accessibility.mobileOrder ? "PASS" : "FAIL",
    resolutions: rec.responsive.length,
  };
  h.save();
}
export async function runCycle(q, h) {
  const { page, s, rec } = q;
  rec.activeStage = "first-plan";
  const first = await waitPlan(q, 1, h);
  await reveal(q, first, h);
  const actions = await getActions(q, first, h);
  assert.ok(actions.length > 0);
  rec.firstPlan = { ...first, actions, generationSeconds: first.generated_at ? Math.round((Date.parse(first.generated_at) - Date.parse(first.created_at)) / 1000) : null };
  await h.snap(page, s, "06-first-plan");
  h.step(s, "first-plan", { count: actions.length, assisted: actions.filter((a) => a.execution_mode === "ai_assisted").length, generationSeconds: rec.firstPlan.generationSeconds });
  rec.activeStage = "T0";
  await checkpoint(q, "T0", first, h);
  await h.snap(page, s, "05-initial-assessment");
  rec.activeStage = "dashboard";
  const trigger = page.getByRole("button", { name: "¿Por qué esta decisión?" });
  await trigger.click();
  const decision = page.locator("dialog[open]");
  await h.see(decision);
  assert.ok((await decision.innerText()).includes(first.strategic_diagnosis.critical_decision.recommended_direction));
  await h.snap(page, s, "07b-decision-drawer");
  const tabLabels = [];
  for (const label of ["Foco", "Prioridades", "Evidencia"]) {
    await decision.getByRole("tab", { name: label, exact: true }).click();
    tabLabels.push(label);
  }
  await dismiss(page, decision, h);
  await page.getByRole("link", { name: "Plan actual" }).click();
  await h.see(h.workspace(page));
  await dismiss(page, h.workspace(page), h);
  await h.snap(page, s, "07-dashboard");
  h.step(s, "dashboard", { tabs: tabLabels, workspace: true });
  rec.activeStage = "responsive";
  await responsive(q, h);

  let trueCount = 0;
  for (const action of actions) {
    rec.activeStage = "action-" + action.sequence;
    try {
      await execute(q, action, trueCount, h, { pendingCTA, dismiss });
      trueCount++;
      h.step(s, rec.activeStage, { mode: action.execution_mode });
    } catch (error) {
      const result = rec.executions?.find((it) => it.sequence === action.sequence);
      if (result) { result.status = "FAIL"; result.cause = h.errorSummary(error); }
      rec.stages[rec.activeStage] = { status: "FAIL", cause: h.errorSummary(error) };
      await h.snap(page, s, "failure-action-" + action.sequence).catch(() => {});
      console.log(s.key, rec.activeStage, "FAIL", h.errorSummary(error));
      h.save();
      await page.goto(h.app + "/dashboard");
      break;
    }
  }
  rec.activeStage = "T1";
  await checkpoint(q, "T1", first, h);
  if (trueCount !== actions.length) {
    rec.stages.T1 = { status: "BLOCKED", cause: "Ciclo incompleto", partialCheckpoint: true };
    rec.stages["weekly-review-save"] = { status: "BLOCKED", cause: "Faltan acciones del recorrido completo" };
    rec.stages["second-plan"] = { status: "BLOCKED", cause: "Falta cerrar el ciclo completo" };
    rec.stages.T2 = { status: "BLOCKED", cause: "Falta plan 2" };
    h.save();
    return;
  }
  rec.activeStage = "weekly-review-save";
  await h.snap(page, s, "12-week-completed");
  await review(q, first, h, { waitPlan, reveal, getActions, checkpoint });
}
export async function runSupplement(q, h) {
  const plan = await getPlan(q, 2, h);
  const actions = await getActions(q, plan, h);
  const assisted = actions.find((action) => action.execution_mode === "ai_assisted");
  if (!assisted || assisted.status !== "pending") return;
  await q.page.goto(h.app + "/dashboard");
  await reveal(q, plan, h);
  q.rec.activeStage = "week2-ai-supplement";
  q.rec.supplemental = [];
  await execute(q, assisted, actions.filter((action) => action.status === "completed").length, {
    ...h, snap: (page, scenario, name, options) => h.snap(page, scenario, "week2-" + name, options),
  }, { pendingCTA, dismiss, viaPlan: true });
  h.step(q.s, "week2-ai-supplement", { sequence: assisted.sequence, week: 2, afterT2: true });
}
export async function runManualControl(q, h) {
  const plan = await getPlan(q, 2, h);
  const actions = await getActions(q, plan, h);
  const control = actions.find((item) => item.capture_schema?.capture_type === "collections_verification" && item.status === "pending");
  assert.ok(control, "El plan real no tiene una acción pendiente de verificación de cobros.");
  await q.page.goto(h.app + "/dashboard");
  await reveal(q, plan, h);
  q.rec.activeStage = "week2-manual-control";
  const captureValues = {
    planned_collection_count: "3", observed_collection_count: "1",
    customer_type: "empresa", promised_amount: "1200", promised_date: "2026-11-27",
    payment_status: "confirmed", estimated_cash_in: "1200",
  };
  await execute({ ...q, captureValues }, control, actions.filter((action) => action.status === "completed").length, {
    ...h, snap: (page, scenario, name, options) => h.snap(page, scenario, "week2-control-" + name, options),
  }, { pendingCTA, dismiss, viaPlan: true, forceCapture: true });
  const result = q.rec.supplemental.at(-1).completionData;
  assert.equal(result.collections[0].promised_date, captureValues.promised_date);
  assert.equal(result.collections[0].promised_amount, Number(captureValues.promised_amount));
  h.step(q.s, "week2-manual-control", { sequence: control.sequence, week: 2, afterT2: true, case: "Un cobro de USD 1.200 confirmado de tres revisados. Fecha ISO. Confirmación de promesa, no de recepción." });
}
export async function isolation(sessions, h) {
  for (const owner of sessions) {
    const records = [["businesses", owner.business.id]];
    const plans = await h.read(owner.db.from("ceo_plans").select("id").eq("business_id", owner.business.id));
    for (const { id } of plans) {
      records.push(["ceo_plans", id]);
      const actions = await h.read(owner.db.from("weekly_actions").select("id").eq("ceo_plan_id", id));
      for (const action of actions) {
        records.push(["weekly_actions", action.id]);
        const results = await h.read(owner.db.from("action_results").select("id").eq("weekly_action_id", action.id));
        records.push(...results.map((row) => ["action_results", row.id]));
      }
      const reviews = await h.read(owner.db.from("weekly_reviews").select("id").eq("ceo_plan_id", id));
      records.push(...reviews.map((row) => ["weekly_reviews", row.id]));
    }
    const evidence = await h.read(owner.db.from("business_evidence").select("id").eq("business_id", owner.business.id));
    records.push(...evidence.map((row) => ["business_evidence", row.id]));
    for (const visitor of sessions.filter((test) => test !== owner)) {
      const check = { owner: owner.s.key, visitor: visitor.s.key, tables: {}, status: "PASS" };
      for (const table of new Set(records.map(([table]) => table))) {
        const ids = records.filter(([kind]) => kind === table).map(([, id]) => id);
        const response = await visitor.db.from(table).select("id").in("id", ids);
        check.tables[table] = { qaRecords: ids.length, returned: response.data?.length ?? null, errorCode: response.error?.code ?? null };
        if (response.error || response.data.length !== 0) check.status = "FAIL";
      }
      if (owner.rec.firstPlan?.actions[0]) {
        const p = await visitor.context.newPage();
        await p.goto(h.app + "/actions/" + owner.rec.firstPlan.actions[0].id);
        const exposed = (await p.locator("body").innerText()).includes(owner.rec.firstPlan.actions[0].action);
        check.route = { finalPath: new URL(p.url()).pathname.replace(/\/actions\/[^/]+/, "/actions/:id"), exposed };
        if (exposed) check.status = "FAIL";
        await p.close();
      }
      h.outcome.security.push(check);
      h.save();
      console.log("RLS", owner.s.key, visitor.s.key, check.status);
    }
  }
}

