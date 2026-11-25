import assert from "node:assert/strict";
const generic = [
  { id: "result", label: "¿Qué ocurrió al realizar esta acción?", type: "textarea", required: true },
  { id: "learning", label: "¿Qué aprendiste?", type: "textarea", required: true }
];
function resultText(s, action, field) {
  const label = field.label.toLowerCase();
  if (field.id === "message_text") return "QA sintético, no enviado. Hola, escribo por el saldo pendiente de la cafetería. ¿Podrían confirmar si pueden transferirlo el jueves o proponer una fecha concreta para el pago?";
  if (field.id === "expected_response") return "QA sintético: confirmación de fecha y monto de pago. El mensaje no se envió y todavía no hay respuesta observada.";
  if (/aprend|siguiente|reflex|cambio|conclus|lecci/.test(label)) return s.learning;
  if (/evidenc|observaci|detalle|nota/.test(label)) return s.evidence;
  if (/nombre|cliente|producto|canal|tarea|responsable/.test(label) && field.type === "text") {
    if (s.key === "cafe-horizonte") return "QA · pedidos por WhatsApp";
    if (s.key === "nova-studio") return "QA · comercio de servicios";
    return "QA · compra de materiales estándar";
  }
  return s.result;
}
function numberValue(s, field) {
  const label = field.label.toLowerCase();
  let value;
  if (s.key === "cafe-horizonte") {
    value = /obliga|venc|pago|pasivo/.test(label) ? 2500
      : /saldo|efectivo|caja/.test(label) ? 600
      : /costo|gasto/.test(label) ? 7800 : /venta|ingreso|factur/.test(label) ? 8500 : 12;
  } else if (s.key === "nova-studio") {
    value = /cierre|convert|venta/.test(label) ? 0 : /llamada|cita/.test(label) ? 1 : /respuesta/.test(label) ? 2 : 3;
  } else {
    value = /liber|deleg|resuel/.test(label) ? 1 : /retras|esper/.test(label) ? 3 : 5;
  }
  return Math.min(field.max ?? Infinity, Math.max(field.min ?? 0, value));
}
async function fillFields(form, fields, q, action) {
  for (const field of fields) {
    if (field.type === "repeatable_group") {
      const group = form.getByRole("group", { name: field.label, exact: true });
      const label = /^(products?|productos?|channels?|canales?|mix_ventas|mezcla_ventas)(_|$)/.test(field.id)
        ? "Agregar producto o canal" : /^(contacts?|contactos?)(_|$)/.test(field.id)
          ? "Agregar contacto" : "Agregar a «" + field.label + "»";
      await group.getByRole("button", { name: label, exact: true }).click();
      await fillFields(group.getByRole("group", { name: field.label + " 1", exact: true }), field.fields, q, action);
    } else if (field.type === "multi_select") {
      const group = form.locator('fieldset[id$="-' + field.id + '"]');
      for (let index = 0; index < Math.max(field.min_items ?? 0, 1); index++) await group.getByRole("checkbox").nth(index).check();
    } else if (field.type === "single_select") {
      const select = form.locator('select[id$="-' + field.id + '"]');
      const option = field.options.find((item) => item.value === q.captureValues?.[field.id])
        ?? field.options.find((item) => /parcial|interest|neutral|otro|inconclu/i.test(item.value)) ?? field.options[0];
      await select.selectOption(option.value);
    } else {
      const input = form.locator('input[id$="-' + field.id + '"], textarea[id$="-' + field.id + '"]');
      const controlValue = q.captureValues?.[field.id];
      const content = controlValue ?? (field.type === "number" ? String(numberValue(q.s, field)) : resultText(q.s, action, field).slice(0, field.max_length ?? 500));
      await input.fill(content);
    }
  }
}
async function draftResult(q, action, h) {
  return h.read(q.db.from("action_results").select("id,status,revision,draft_content,approved_content").eq("weekly_action_id", action.id).maybeSingle());
}
async function runAI(q, action, execution, h) {
  const { page, s } = q;
  const plan = h.workspace(page);
  const ai = plan.locator("#ai-action-workspace");
  const existing = await draftResult(q, action, h);
  if (!existing) {
    await ai.getByRole("button", { name: "Crear con ayuda de IA", exact: true }).click();
    await h.snap(page, s, "09-ai-assisted-action");
  }
  const waitDraft = (rev) => h.poll(async () => {
    const result = await draftResult(q, action, h);
    const error = await plan.getByRole("alert").first().innerText({ timeout: 450 }).catch(() => "");
    if (error) throw new Error(error);
    return result?.revision >= rev && result;
  }, 135000);
  const draft1 = await waitDraft(1);
  if (draft1.status === "approved") { execution.approval = { status: "approved", recovered: true }; return; }
  const badge = ai.getByText(/Borrador · Revisión/);
  await h.see(badge, 25000);
  await badge.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await h.snap(page, s, "10-ai-deliverable");
  execution.draft = { revision: draft1.revision, deliverable: draft1.draft_content };
  h.save();
  const feedback = "Incluye el texto «prueba piloto QA» en una instrucción para el dueño. Conserva el cliente objetivo y añade una forma concreta de observar el resultado sin prometer cifras.";
  await ai.getByLabel(/Qué te gustaría ajustar/).fill(feedback);
  await ai.getByRole("button", { name: "Mejorar entregable", exact: true }).click();
  const draft2 = await waitDraft(draft1.revision + 1);
  await h.see(ai.getByText("Borrador · Revisión " + draft2.revision, { exact: true }));
  await badge.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await h.snap(page, s, "10b-ai-revision");
  execution.revision = { revision: draft2.revision, deliverable: draft2.draft_content, feedback, incorporatedLiteral: /prueba piloto QA/i.test(JSON.stringify(draft2.draft_content)) };
  await ai.getByRole("button", { name: "Aprobar resultado", exact: true }).click();
  await h.see(ai.getByText("Entregable aprobado", { exact: true }), 40000);
  assert.equal((await draftResult(q, action, h)).status, "approved");
  const pending = await h.read(q.db.from("weekly_actions").select("status").eq("id", action.id).single());
  assert.equal(pending.status, "pending");
  execution.approval = { status: "approved", actionStillPending: true };
  h.save();
}
export async function execute(q, action, index, h, { pendingCTA, dismiss, viaPlan = false, forceCapture = false }) {
  const { page, s, rec } = q;
  const work = h.workspace(page);
  await dismiss(page, work, h);
  if (viaPlan) {
    await page.getByRole("link", { name: "Plan actual" }).click();
    await h.see(work);
    await work.getByRole("button").filter({ hasText: action.action }).first().click();
  } else {
    await pendingCTA(page).click();
    await h.see(work);
  }
  assert.equal((await h.heading(page, "action-detail-title").innerText()).replace(/\s+/g, " ").trim(), action.action.replace(/\s+/g, " ").trim());
  const execution = { sequence: action.sequence, mode: action.execution_mode, action: action.action, status: "STARTED" };
  if (viaPlan) rec.supplemental.push(execution);
  else {
    rec.executions ??= [];
    rec.executions.push(execution);
  }
  h.save();
  if (action.execution_mode === "ai_assisted") await runAI(q, action, execution, h);
  else if (forceCapture || !rec.manualCaptured) {
    await h.snap(page, s, "08-manual-action");
    rec.manualCaptured = true;
  }
  const trigger = action.execution_mode === "ai_assisted" ? "Registrar evidencia y completar" : "Registrar resultado";
  await work.getByRole("button", { name: trigger, exact: true }).click();
  const form = page.locator("dialog[open]").last();
  const button = form.getByRole("button", { name: "Guardar resultado y completar acción" });
  await h.see(button);
  const fields = action.capture_schema?.fields ?? generic;
  if (fields.some((field) => field.type !== "repeatable_group" && field.required)) {
    await button.click();
    await h.see(form.getByRole("alert"));
    execution.emptyRejected = true;
  }
  await fillFields(form, fields, q, action);
  if (forceCapture || !rec.resultCaptured || action.execution_mode === "ai_assisted") {
    await h.snap(page, s, "11-action-result");
    rec.resultCaptured = true;
  }
  await button.click();
  const result = await h.poll(async () => {
    const saved = await h.read(q.db.from("weekly_actions").select("status,completion_data").eq("id", action.id).single());
    if (saved.status === "completed") return saved;
    const current = await form.getByRole("alert").first().innerText({ timeout: 400 }).catch(() => "");
    if (current && !/Revisa los campos/.test(current)) throw new Error(current);
  }, 35000);
  await h.absent(button);
  await dismiss(page, work, h);
  await page.reload();
  await h.see(h.heading(page, "execution-overview-title"));
  const currentProgress = await page.getByRole("progressbar").getAttribute("aria-valuenow");
  assert.equal(Number(currentProgress), index + 1);
  execution.status = "PASS";
  execution.completionData = result.completion_data;
  execution.persistedAfterReload = true;
  h.save();
  console.log(s.key, "ACTION", action.sequence, action.execution_mode, "PASS");
}
export async function review(q, plan, h, cycle) {
  const { page, s, rec } = q;
  await page.getByRole("link", { name: "Revisar mi semana", exact: true }).click();
  await page.waitForURL("**/weekly-review");
  await h.see(page.locator('input[name="outcome_status"][value="mixed"]'));
  await h.snap(page, s, "13-weekly-review");
  const answers = [
    ["outcome_status", "mixed"], [/Cuéntame qué ocurrió/, s.result],
    ["hypothesis_status", "inconclusive"], [/Describe hechos observables/, s.evidence],
    [/Escribe el aprendizaje/, s.learning], [/Opcional. Puedes dejarlo vacío/, s.focus],
  ];
  for (const [field, value] of answers) {
    if (typeof field === "string") {
      await page.locator('input[type=radio][name="' + field + '"][value="' + value + '"]').check();
    } else {
      await page.getByPlaceholder(field).fill(value);
    }
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
  }
  const submit = page.getByRole("button", { name: "Confirmar y preparar mi siguiente semana" });
  await h.see(submit);
  await submit.scrollIntoViewIfNeeded();
  await h.snap(page, s, "13b-review-summary");
  const started = Date.now();
  await submit.click();
  const readReview = () => h.read(q.db.from("weekly_reviews").select("id,outcome_status,outcome_summary,next_week_focus,decision_learning,completed_actions,total_actions").eq("ceo_plan_id", plan.id).maybeSingle());
  const saved = await h.poll(readReview, 35000);
  assert.equal(saved.outcome_status, "mixed");
  assert.equal(saved.decision_learning.hypothesis_status, "inconclusive");
  assert.equal(saved.completed_actions, saved.total_actions);
  rec.review = saved;
  await h.snap(page, s, "14-review-confirmed");
  h.step(s, "weekly-review-save", { saved: true, outcome: saved.outcome_status, completed: saved.completed_actions });
  rec.activeStage = "second-plan";
  const next = await cycle.waitPlan(q, 2, h).catch((error) => {
    rec.stages["second-plan"] = { status: "FAIL", cause: h.errorSummary(error) };
    return null;
  });
  if (next) {
    await cycle.reveal(q, next, h);
    const nextActions = await cycle.getActions(q, next, h);
    assert.equal(next.previous_plan_id, plan.id);
    rec.secondPlan = { ...next, actions: nextActions, generationSeconds: Math.round((Date.now() - started) / 1000) };
    await h.snap(page, s, "15-second-plan");
    h.step(s, "second-plan", { count: nextActions.length, continuity: next.strategic_continuity?.mode, seconds: rec.secondPlan.generationSeconds });
  }
  rec.activeStage = "review-persistence";
  await page.goto(h.app + "/history");
  await h.see(page.getByText("Tus semanas", { exact: true }));
  await page.reload();
  assert.equal((await readReview()).id, saved.id);
  await page.goto(h.app + "/dashboard");
  await page.locator('summary[aria-label="Mi cuenta"]').click();
  await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await page.waitForURL("**/login*");
  for (const route of ["/dashboard", "/history", "/weekly-review"]) {
    await page.goto(h.app + route);
    await page.waitForURL("**/login*");
  }
  await h.login(page, q.email, q.secret);
  await page.goto(h.app + "/history");
  await h.see(page.getByText("Tus semanas", { exact: true }));
  await page.getByRole("button", { name: /semana 1/i }).first().click();
  await h.see(page.getByText("Aprendizajes de la semana", { exact: true }));
  await h.see(page.getByText(s.learning, { exact: false }).first());
  await h.snap(page, s, "14b-review-persisted-history");
  assert.deepEqual(await readReview(), saved);
  h.step(s, "review-persistence", { reload: true, logout: true, login: true, history: true, protectedRoutes: 3 });
  if (next) {
    rec.activeStage = "T2";
    await page.goto(h.app + "/dashboard");
    await cycle.reveal(q, next, h);
    await cycle.checkpoint(q, "T2", next, h);
    await h.snap(page, s, "16-final-dashboard");
  }
}

