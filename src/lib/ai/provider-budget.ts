import { constants, openSync, closeSync, unlinkSync, readFileSync, writeFileSync } from "node:fs";

function getBudgetFile(): string | null {
  return process.env.PROVIDER_API_BUDGET_FILE ?? process.env.CEO_PLAN_API_BUDGET_FILE ?? null;
}

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function tryAcquireLock(lockPath: string): boolean {
  try {
    const fd = openSync(lockPath, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL);
    closeSync(fd);
    return true;
  } catch {
    return false;
  }
}

function releaseLock(lockPath: string): void {
  try { unlinkSync(lockPath); } catch {}
}

function withBudgetLock(budgetFile: string, fn: () => void): void {
  const lockPath = budgetFile + ".lock";
  let acquired = false;
  for (let i = 0; i < 5; i++) {
    if (tryAcquireLock(lockPath)) {
      acquired = true;
      break;
    }
    sleepSync(20);
  }
  if (!acquired) {
    throw new Error(
      "PROVIDER_API_BUDGET_LOCK_FAILED: No se pudo adquirir el bloqueo del presupuesto tras 5 intentos. Intento concurrente detectado. No se realizará la solicitud.",
    );
  }
  try {
    fn();
  } finally {
    releaseLock(lockPath);
  }
}

export function consumeBudget(caller: string): void {
  const budgetFile = getBudgetFile();

  if (!budgetFile) {
    if (process.env.QA_MODE) {
      throw new Error(
        `PROVIDER_API_BUDGET_MISSING: QA_MODE está activo pero ni PROVIDER_API_BUDGET_FILE ni CEO_PLAN_API_BUDGET_FILE están configurados. No se realizará la solicitud [${caller}].`,
      );
    }
    return;
  }

  withBudgetLock(budgetFile, () => {
    let budget: { limit: number; used: number };
    try {
      const raw = readFileSync(budgetFile, "utf8");
      budget = JSON.parse(raw);
      if (typeof budget.limit !== "number" || typeof budget.used !== "number"
        || !Number.isFinite(budget.limit) || !Number.isFinite(budget.used)
        || budget.limit < 0 || budget.used < 0) {
        budget = { limit: 0, used: 0 };
      }
    } catch {
      budget = { limit: 0, used: 0 };
    }

    if (budget.used >= budget.limit) {
      throw new Error(
        `PROVIDER_API_BUDGET_EXHAUSTED: Presupuesto de ${budget.limit} llamadas agotado (${budget.used} usadas). No se realizará la solicitud [${caller}].`,
      );
    }

    const updated = { limit: budget.limit, used: budget.used + 1 };
    try {
      writeFileSync(budgetFile, JSON.stringify(updated));
    } catch (writeError) {
      throw new Error(
        `PROVIDER_API_BUDGET_WRITE_FAILED: No se pudo persistir el consumo del presupuesto [${caller}]: ${String(writeError)}`,
      );
    }

    console.error("PROVIDER_BUDGET_LOG", JSON.stringify({
      caller,
      limit: updated.limit,
      used_after: updated.used,
      remaining: updated.limit - updated.used,
    }));
  });
}
