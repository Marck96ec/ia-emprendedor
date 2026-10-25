import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  EXTERNAL_EVIDENCE_URL_PROVENANCE,
  generateExternalEvidence,
  type GenerateExternalEvidenceInput,
} from "../src/lib/ai/generate-external-evidence";
import {
  ExternalEvidenceModelSchema,
  ExternalEvidenceSchema,
} from "../src/lib/ai/external-evidence";

const validItem = {
  title: "Retention report",
  source_name: "Recognized research body",
  source_url: "https://example.com/report",
  published_at: null,
  evidence_type: "report" as const,
  claim: "The source reports a retention improvement after the intervention.",
  relevance: "This is relevant because the decision prioritizes retention.",
  support_level: "supports" as const,
  limitations: "The businesses operate at a different scale.",
};

const validEvidence = {
  research_question: "What evidence compares retention and acquisition strategies?",
  status: "found" as const,
  items: [validItem],
  synthesis: "The evidence supports testing retention, with important context limits.",
  confidence: "medium" as const,
};

test("accepts all external evidence support levels", () => {
  for (const support_level of ["supports", "mixed", "challenges"] as const) {
    assert.equal(
      ExternalEvidenceSchema.safeParse({
        ...validEvidence,
        items: [{ ...validItem, support_level }],
      }).success,
      true,
    );
  }
});

test("rejects invalid URLs, empty claims, limitations, and more than three items", () => {
  assert.equal(
    ExternalEvidenceSchema.safeParse({
      ...validEvidence,
      items: [{ ...validItem, source_url: "not-a-url" }],
    }).success,
    false,
  );
  assert.equal(
    ExternalEvidenceSchema.safeParse({
      ...validEvidence,
      items: [{ ...validItem, claim: "" }],
    }).success,
    false,
  );
  assert.equal(
    ExternalEvidenceSchema.safeParse({
      ...validEvidence,
      items: [{ ...validItem, relevance: "" }],
    }).success,
    false,
  );
  assert.equal(
    ExternalEvidenceSchema.safeParse({
      ...validEvidence,
      items: [{ ...validItem, limitations: "" }],
    }).success,
    false,
  );
  assert.equal(
    ExternalEvidenceSchema.safeParse({
      ...validEvidence,
      items: Array.from({ length: 4 }, () => validItem),
    }).success,
    false,
  );
});

test("keeps model output schema compatible with OpenAI while validating URLs before persistence", () => {
  const modelOutput = {
    ...validEvidence,
    items: [{ ...validItem, source_url: "not-a-url" }],
  };

  assert.equal(ExternalEvidenceModelSchema.safeParse(modelOutput).success, true);
  assert.equal(ExternalEvidenceSchema.safeParse(modelOutput).success, false);
});

test("allows insufficient evidence without inventing a source", () => {
  assert.equal(
    ExternalEvidenceSchema.safeParse({
      research_question: "A research question",
      status: "insufficient",
      items: [],
      synthesis: "No comparable evidence was found.",
      confidence: "low",
    }).success,
    true,
  );
});

test("requires a demonstrated Web Search call and sends only decision context", async () => {
  const input: GenerateExternalEvidenceInput = {
    business: {
      name: "Taller Norte",
      revenueModel: "Repair services for local businesses",
      description: "Local repair service",
    },
    strategicDiagnosis: {
      business_understanding: {
        business_model: "Repair services",
        revenue_engine: "Service fees",
        primary_customer: "Local businesses",
        current_goal: "Increase qualified conversations",
        owner_involvement: "Sales and coordination",
        current_context: "Small team",
      },
      diagnosis: {
        summary: "Demand is constrained",
        affected_area: "demand",
        why_it_matters: "Too few opportunities",
      },
      bottleneck: {
        area: "Demand",
        description: "Too few qualified conversations",
        affected_metric: "qualified conversations",
      },
      evidence: [],
      confidence: "medium",
      unknowns: ["Best segment"],
      alternative_hypothesis: null,
      critical_decision: {
        question: "Should we focus on retention before acquisition?",
        recommended_direction: "Test retention first",
        rationale: "Existing customers may be recoverable",
        expected_outcome: "More reactivations",
        target_metric: "reactivations",
      },
    },
    decisionHypothesis: {
      statement: "Inactive customers will respond to a specific offer.",
      validation_signal: "Reactivations increase.",
    },
  };

  let prompt = "";
  const result = await generateExternalEvidence(input, async (receivedPrompt) => {
    prompt = receivedPrompt;
    return {
      finalOutput: validEvidence,
      newItems: [
        {
          rawItem: {
            type: "hosted_tool_call",
            name: "web_search_call",
          },
        },
      ],
    };
  });

  assert.equal(result.status, "found");
  assert.match(prompt, /retention/);
  assert.doesNotMatch(prompt, /user_id|secret|weekly review|plan_id/i);

  const withoutSearch = await generateExternalEvidence(input, async () => ({
    finalOutput: validEvidence,
    newItems: [],
  }));
  assert.equal(withoutSearch.status, "insufficient");
  assert.deepEqual(withoutSearch.items, []);

  const providerDataOnly = await generateExternalEvidence(input, async () => ({
    finalOutput: validEvidence,
    newItems: [
      {
        rawItem: {
          type: "hosted_tool_call",
          name: "other_hosted_tool",
          providerData: { type: "web_search_call" },
        },
      },
    ],
  }));
  assert.equal(providerDataOnly.status, "insufficient");
  assert.deepEqual(providerDataOnly.items, []);
});

test("documents that URL provenance is not verified by SDK v0.16.1", () => {
  assert.equal(EXTERNAL_EVIDENCE_URL_PROVENANCE, "unverified");
});

test("keeps evidence failure separate from the ready CEO plan", () => {
  const actionSource = readFileSync(
    join(process.cwd(), "src/actions/ceo-plan.ts"),
    "utf8",
  );
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/20261025030000_add_external_evidence.sql",
    ),
    "utf8",
  );
  const evidenceFailureBlock = actionSource.slice(
    actionSource.indexOf('"CEO_EVIDENCE_GENERATION_ERROR"'),
  );

  assert.match(migration, /external_evidence jsonb/);
  assert.match(migration, /evidence_status text/);
  assert.match(migration, /'pending', 'ready', 'insufficient', 'failed'/);
  assert.match(actionSource, /generateExternalEvidence/);
  assert.match(evidenceFailureBlock, /evidence_status: "failed"/);
  assert.match(evidenceFailureBlock, /error_name/);
  assert.match(evidenceFailureBlock, /error_message/);
  assert.match(evidenceFailureBlock, /error_category/);
  assert.match(evidenceFailureBlock, /prompt_version: EVIDENCE_PROMPT_VERSION/);
  assert.match(evidenceFailureBlock, /model: EVIDENCE_MODEL/);
  assert.doesNotMatch(evidenceFailureBlock, /fail_ceo_plan/);
  assert.doesNotMatch(
    readFileSync(join(process.cwd(), "src/app/dashboard/page.tsx"), "utf8"),
    /generateExternalEvidence/,
  );
});

test("dashboard passes persisted time allocation and retains the legacy fallback", () => {
  const dashboardSource = readFileSync(
    join(process.cwd(), "src/app/dashboard/page.tsx"),
    "utf8",
  );

  assert.match(
    dashboardSource,
    /time_allocation:\s*ceoPlan\.time_allocation/,
  );
  assert.match(
    dashboardSource,
    /Asignación histórica calculada a partir de las acciones persistidas\./,
  );
});