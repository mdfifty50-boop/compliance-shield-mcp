#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  assessRiskLevel,
  createAuditTrail,
  logDecision,
  checkComplianceGaps,
  generateEvidencePackage,
  getEnforcementTimeline,
  listTrails,
} from './storage.js';

const server = new McpServer({
  name: 'compliance-shield-mcp',
  version: '0.1.0',
  description:
    'EU AI Act compliance audit trails and evidence generation — risk classification, decision logging, gap analysis, and auditor-ready evidence packages',
});

// ═══════════════════════════════════════════
// TOOL 1: RISK CLASSIFICATION
// ═══════════════════════════════════════════

server.tool(
  'assess_risk_level',
  'Classify an AI system under the EU AI Act risk framework (Unacceptable, High, Limited, Minimal). Returns required obligations and article references.',
  {
    system_description: z
      .string()
      .describe('Description of the AI system and its intended purpose'),
    uses_biometrics: z
      .boolean()
      .describe('Does the system use biometric identification or categorization?'),
    uses_critical_infrastructure: z
      .boolean()
      .describe(
        'Does the system manage or operate critical infrastructure (energy, transport, water, etc.)?'
      ),
    uses_law_enforcement: z
      .boolean()
      .describe(
        'Is the system used in law enforcement, border control, justice, or democratic processes?'
      ),
    interacts_with_public: z
      .boolean()
      .describe(
        'Does the system interact directly with natural persons (chatbots, content generation, etc.)?'
      ),
  },
  async (params) => {
    const result = assessRiskLevel(params);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// ═══════════════════════════════════════════
// TOOL 2: CREATE AUDIT TRAIL
// ═══════════════════════════════════════════

server.tool(
  'create_audit_trail',
  'Start a new compliance audit trail for an AI system. Returns a trail_id used for all subsequent logging and compliance checks.',
  {
    system_id: z.string().describe('Unique identifier for the AI system'),
    system_name: z.string().describe('Human-readable name of the AI system'),
    risk_classification: z
      .enum(['unacceptable', 'high', 'limited', 'minimal'])
      .describe('EU AI Act risk classification for this system'),
    responsible_person: z
      .string()
      .describe(
        'Name and role of the person responsible for this AI system (Article 26 deployer obligation)'
      ),
  },
  async (params) => {
    const result = createAuditTrail(params);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// ═══════════════════════════════════════════
// TOOL 3: LOG DECISION
// ═══════════════════════════════════════════

server.tool(
  'log_decision',
  'Log an AI decision with full traceability — input, output, reasoning, human oversight status, model used, and confidence. Each entry is timestamped and auto-numbered.',
  {
    trail_id: z.string().describe('Audit trail identifier from create_audit_trail'),
    input_summary: z
      .string()
      .describe('Summary of the input that triggered this AI decision'),
    output_summary: z
      .string()
      .describe('Summary of the output or action taken by the AI system'),
    reasoning: z
      .string()
      .describe(
        'Explanation of why this decision was made — critical for Article 13 transparency'
      ),
    human_oversight: z
      .boolean()
      .describe(
        'Was this decision reviewed or approved by a human? (Article 14 requirement for high-risk systems)'
      ),
    model_used: z
      .string()
      .describe(
        'Identifier of the AI model used (e.g., "gpt-4o", "claude-sonnet-4-20250514") — required for Article 11 technical documentation'
      ),
    confidence: z
      .number()
      .min(0)
      .max(1)
      .describe(
        'Confidence score from 0.0 to 1.0 — used for Article 15 accuracy assessment'
      ),
  },
  async (params) => {
    const { trail_id, ...decision } = params;
    const result = logDecision(trail_id, decision);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// ═══════════════════════════════════════════
// TOOL 4: CHECK COMPLIANCE GAPS
// ═══════════════════════════════════════════

server.tool(
  'check_compliance_gaps',
  'Identify missing EU AI Act compliance requirements for an audit trail. Checks human oversight, decision logging, reasoning documentation, model identification, and responsible person assignment.',
  {
    trail_id: z.string().describe('Audit trail identifier to check'),
  },
  async ({ trail_id }) => {
    const result = checkComplianceGaps(trail_id);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// ═══════════════════════════════════════════
// TOOL 5: GENERATE EVIDENCE PACKAGE
// ═══════════════════════════════════════════

server.tool(
  'generate_evidence_package',
  'Generate an auditor-ready evidence package with system info, decision log summary, human oversight statistics, model usage breakdown, and compliance status. Suitable for regulatory submission.',
  {
    trail_id: z.string().describe('Audit trail identifier'),
    time_range_days: z
      .number()
      .int()
      .min(1)
      .default(30)
      .describe(
        'Number of days to include in the evidence package (default 30)'
      ),
  },
  async ({ trail_id, time_range_days }) => {
    const result = generateEvidencePackage(trail_id, time_range_days);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// ═══════════════════════════════════════════
// TOOL 6: ENFORCEMENT TIMELINE
// ═══════════════════════════════════════════

server.tool(
  'get_enforcement_timeline',
  'Show upcoming EU AI Act enforcement deadlines with days remaining. Includes penalty structure for violations (up to 35M EUR / 7% global turnover).',
  {},
  async () => {
    const result = getEnforcementTimeline();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// ═══════════════════════════════════════════
// RESOURCES
// ═══════════════════════════════════════════

server.resource(
  'timeline',
  'compliance://timeline',
  async () => {
    const timeline = getEnforcementTimeline();

    return {
      contents: [
        {
          uri: 'compliance://timeline',
          mimeType: 'application/json',
          text: JSON.stringify(timeline, null, 2),
        },
      ],
    };
  }
);

server.resource(
  'trails',
  'compliance://trails',
  async () => {
    const allTrails = listTrails();

    return {
      contents: [
        {
          uri: 'compliance://trails',
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              active_trails: allTrails,
              total: allTrails.length,
              generated_at: new Date().toISOString(),
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// ═══════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Compliance Shield MCP Server running on stdio');
}

main().catch(console.error);
