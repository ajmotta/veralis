const stringArray = { type: "array", items: { type: "string" } } as const;

const claimSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "statement", "type", "evidenceRefs", "confidence"],
  properties: {
    id: { type: "string" },
    statement: { type: "string" },
    type: { enum: ["FACT", "CALCULATION", "INFERENCE", "HYPOTHESIS", "RECOMMENDATION", "UNKNOWN"] },
    evidenceRefs: stringArray,
    confidence: { type: "number" },
  },
} as const;

const calculationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "formulaId", "formulaVersion", "period", "inputRefs", "rawResult", "displayedResult", "unit", "status"],
  properties: {
    id: { type: "string" },
    formulaId: { type: "string" },
    formulaVersion: { const: "1.0.0" },
    period: { type: "string" },
    inputRefs: stringArray,
    rawResult: { type: "number" },
    displayedResult: { type: "string" },
    unit: { enum: ["BRL", "PERCENT", "PERCENTAGE_POINT", "RATIO", "COUNT"] },
    status: { enum: ["PASS", "FAIL", "UNKNOWN"] },
  },
} as const;

const recommendationProperties = {
  action: { type: "string" },
  why: { type: "string" },
  expectedImpact: { type: "string" },
  evidenceRefs: stringArray,
  assumptions: stringArray,
  confidence: { type: "number" },
  reversibility: { enum: ["HIGH", "MEDIUM", "LOW"] },
  risk: { type: "string" },
} as const;

const recommendationSchema = {
  type: "object",
  additionalProperties: false,
  required: Object.keys(recommendationProperties),
  properties: recommendationProperties,
} as const;

// This is data for a future Responses API text.format/json_schema request. It
// intentionally contains no client, SDK import, model name, or credential read.
export const STRUCTURED_RESPONSE_JSON_SCHEMA = {
  name: "veralis_structured_response",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "directAnswer", "diagnosis", "evidence", "calculations", "meceBridge",
      "assumptions", "unknowns", "expertViews", "disagreements", "risks",
      "recommendation", "nextQuestion", "confidence", "humanReviewRequired", "reviewType",
    ],
    properties: {
      directAnswer: { type: "string" },
      diagnosis: {
        type: "object",
        additionalProperties: false,
        required: ["primaryDriver", "secondaryDrivers"],
        properties: { primaryDriver: { type: "string" }, secondaryDrivers: stringArray },
      },
      evidence: {
        type: "object",
        additionalProperties: false,
        required: ["items"],
        properties: { items: { type: "array", items: claimSchema } },
      },
      calculations: {
        type: "object",
        additionalProperties: false,
        required: ["items"],
        properties: { items: { type: "array", items: calculationSchema } },
      },
      meceBridge: {
        type: "object",
        additionalProperties: false,
        required: ["items"],
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["category", "amount"],
              properties: { category: { type: "string" }, amount: { type: "number" } },
            },
          },
        },
      },
      assumptions: { type: "object", additionalProperties: false, required: ["items"], properties: { items: stringArray } },
      unknowns: { type: "object", additionalProperties: false, required: ["items"], properties: { items: stringArray } },
      expertViews: {
        type: "object",
        additionalProperties: false,
        required: ["active", "views"],
        properties: {
          active: { type: "array", items: { enum: ["CFO", "OPERATIONS", "ACADEMIC", "GROWTH"] } },
          views: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["lens", "statement", "evidenceRefs"],
              properties: {
                lens: { enum: ["CFO", "OPERATIONS", "ACADEMIC", "GROWTH"] },
                statement: { type: "string" },
                evidenceRefs: stringArray,
              },
            },
          },
        },
      },
      disagreements: { type: "object", additionalProperties: false, required: ["items"], properties: { items: stringArray } },
      risks: { type: "object", additionalProperties: false, required: ["items"], properties: { items: stringArray } },
      recommendation: {
        type: "object",
        additionalProperties: false,
        required: ["immediate", "next30Days", "doNotDo"],
        properties: {
          immediate: { anyOf: [recommendationSchema, { type: "null" }] },
          next30Days: { type: "array", items: recommendationSchema },
          doNotDo: stringArray,
        },
      },
      nextQuestion: { anyOf: [{ type: "string" }, { type: "null" }] },
      confidence: { type: "number" },
      humanReviewRequired: { type: "boolean" },
      reviewType: {
        anyOf: [
          { type: "string", enum: ["accounting", "legal", "tax", "regulatory"] },
          { type: "null" },
        ],
      },
    },
  },
} as const;
