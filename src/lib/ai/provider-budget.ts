import { constants, openSync, closeSync, unlinkSync, readFileSync, writeFileSync } from "node:fs";

function getBudgetFile(): string | null {
  return process.env.PROVIDER_API_BUDGET_FILE ?? process.env.CEO_PLAN_API_BUDGET_FILE ?? null;
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
  }
  try {
    fn();
  } finally {
    if (acquired) releaseLock(lockPath);
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
      budget = JSON.parse(readFileSync(budgetFile, "utf8"));
    } catch {
      budget = { limit: 0, used: 0 };
    }

    if (budget.used >= budget.limit) {
      throw new Error(
        `PROVIDER_API_BUDGET_EXHAUSTED: Presupuesto de ${budget.limit} llamadas agotado (${budget.used} usadas). No se realizará la solicitud [${caller}].`,
      );
    }

    const updated = { ...budget, used: budget.used + 1 };
    try {
      writeFileSync(budgetFile, JSON.stringify(updated));
    } catch {}

    console.error("PROVIDER_BUDGET_LOG", JSON.stringify({
      caller,
      limit: updated.limit,
      used_after: updated.used,
      remaining: updated.limit - updated.used,
    }));
  });
}
