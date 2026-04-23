// ═══════════════════════════════════════════
// In-memory storage for compliance audit trails
// ═══════════════════════════════════════════

/** @type {Map<string, object>} trail_id -> trail data */
const trails = new Map();

let trailCounter = 0;

// ═══════════════════════════════════════════
// EU AI ACT RISK CLASSIFICATION ENGINE
// ═══════════════════════════════════════════

const RISK_RULES = [
  {
    level: 'unacceptable',
    test: (p) =>
      /social\s*scoring/i.test(p.system_description) ||
      /manipulat(e|ion|ive).*vulnerab/i.test(p.system_description) ||
      /real[\s-]*time.*biometric.*public/i.test(p.system_description) ||
      /subliminal/i.test(p.system_description),
    reason: 'System matches prohibited AI practices under Article 5',
    obligations: [
      'System MUST NOT be deployed — falls under prohibited practices',
      'Immediate cessation of development and deployment required',
      'Notify national supervisory authority',
    ],
    articles: ['Article 5 — Prohibited AI Practices'],
  },
  {
    level: 'high',
    test: (p) =>
      p.uses_biometrics ||
      p.uses_critical_infrastructure ||
      p.uses_law_enforcement,
    reason: 'System operates in high-risk domain per Annex III',
    obligations: [
      'Establish risk management system (Article 9)',
      'Ensure data governance and quality (Article 10)',
      'Maintain technical documentation (Article 11)',
      'Implement automatic logging/record-keeping (Article 12)',
      'Ensure transparency and provision of information to deployers (Article 13)',
      'Enable human oversight measures (Article 14)',
      'Ensure accuracy, robustness, and cybersecurity (Article 15)',
      'Register in EU database before placing on market (Article 49)',
      'Conduct conformity assessment (Article 43)',
      'Appoint EU authorized representative if outside EU (Article 22)',
    ],
    articles: [
      'Article 6 — Classification Rules for High-Risk AI',
      'Article 9 — Risk Management System',
      'Article 10 — Data and Data Governance',
      'Article 11 — Technical Documentation',
      'Article 12 — Record-Keeping',
      'Article 13 — Transparency',
      'Article 14 — Human Oversight',
      'Article 15 — Accuracy, Robustness, Cybersecurity',
      'Annex III — High-Risk AI Systems',
    ],
  },
  {
    level: 'limited',
    test: (p) => p.interacts_with_public,
    reason:
      'System interacts with natural persons — transparency obligations apply',
    obligations: [
      'Inform users they are interacting with an AI system (Article 50)',
      'Label AI-generated content where applicable (Article 50)',
      'Ensure emotion recognition/biometric categorization disclosure if used (Article 50)',
      'Mark deepfake content as artificially generated (Article 50)',
    ],
    articles: [
      'Article 50 — Transparency Obligations for Certain AI Systems',
    ],
  },
];

/**
 * Classify an AI system under the EU AI Act risk framework.
 */
export function assessRiskLevel(params) {
  for (const rule of RISK_RULES) {
    if (rule.test(params)) {
      return {
        risk_level: rule.level,
        classification_reason: rule.reason,
        required_obligations: rule.obligations,
        article_references: rule.articles,
      };
    }
  }

  return {
    risk_level: 'minimal',
    classification_reason:
      'System does not fall into prohibited, high-risk, or limited-risk categories',
    required_obligations: [
      'Voluntary codes of conduct encouraged (Article 95)',
      'General-purpose AI transparency obligations may apply if using GPAI models (Article 53)',
    ],
    article_references: [
      'Article 95 — Codes of Conduct for Voluntary Application',
      'Article 53 — Obligations for Providers of GPAI Models',
    ],
  };
}

// ═══════════════════════════════════════════
// AUDIT TRAIL MANAGEMENT
// ═══════════════════════════════════════════

/**
 * Create a new audit trail for an AI system.
 */
export function createAuditTrail({ system_id, system_name, risk_classification, responsible_person }) {
  trailCounter++;
  const trail_id = `trail-${Date.now()}-${trailCounter}`;

  const trail = {
    trail_id,
    system_id,
    system_name,
    risk_classification,
    responsible_person,
    created_at: new Date().toISOString(),
    decisions: [],
    decision_count: 0,
  };

  trails.set(trail_id, trail);
  return { trail_id, created_at: trail.created_at };
}

/**
 * Log an AI decision with traceability metadata.
 */
export function logDecision(trail_id, decision) {
  const trail = trails.get(trail_id);
  if (!trail) {
    return { error: `Audit trail '${trail_id}' not found` };
  }

  trail.decision_count++;

  const entry = {
    decision_number: trail.decision_count,
    timestamp: new Date().toISOString(),
    input_summary: decision.input_summary,
    output_summary: decision.output_summary,
    reasoning: decision.reasoning,
    human_oversight: decision.human_oversight,
    model_used: decision.model_used,
    confidence: decision.confidence,
  };

  trail.decisions.push(entry);

  return {
    logged: true,
    trail_id,
    decision_number: entry.decision_number,
    timestamp: entry.timestamp,
    total_decisions: trail.decision_count,
  };
}

// ═══════════════════════════════════════════
// COMPLIANCE GAP ANALYSIS
// ═══════════════════════════════════════════

/**
 * Check compliance gaps for a given audit trail.
 */
export function checkComplianceGaps(trail_id) {
  const trail = trails.get(trail_id);
  if (!trail) {
    return { error: `Audit trail '${trail_id}' not found` };
  }

  const gaps = [];
  const decisions = trail.decisions;
  const riskLevel = trail.risk_classification.toLowerCase();

  // Check: Are decisions being logged?
  const hasDecisions = decisions.length > 0;
  gaps.push({
    requirement: 'Decision logging and record-keeping',
    article: 'Article 12 — Record-Keeping',
    status: hasDecisions ? 'met' : 'not_met',
    recommendation: hasDecisions
      ? `${decisions.length} decision(s) logged`
      : 'No decisions have been logged yet — start recording AI decisions immediately',
  });

  // Check: Is reasoning documented?
  const decisionsWithReasoning = decisions.filter((d) => d.reasoning && d.reasoning.trim().length > 0);
  const reasoningRatio = decisions.length > 0 ? decisionsWithReasoning.length / decisions.length : 0;
  gaps.push({
    requirement: 'Reasoning documentation for explainability',
    article: 'Article 13 — Transparency',
    status: reasoningRatio >= 0.9 ? 'met' : reasoningRatio > 0 ? 'partial' : 'not_met',
    recommendation:
      reasoningRatio >= 0.9
        ? `${Math.round(reasoningRatio * 100)}% of decisions include reasoning`
        : `Only ${Math.round(reasoningRatio * 100)}% of decisions include reasoning — target 90%+`,
  });

  // Check: Has human oversight been exercised?
  const decisionsWithOversight = decisions.filter((d) => d.human_oversight === true);
  const oversightRatio = decisions.length > 0 ? decisionsWithOversight.length / decisions.length : 0;
  const oversightRequired = riskLevel === 'high' || riskLevel === 'unacceptable';
  gaps.push({
    requirement: 'Human oversight measures',
    article: 'Article 14 — Human Oversight',
    status: oversightRequired
      ? oversightRatio >= 0.8 ? 'met' : oversightRatio > 0 ? 'partial' : 'not_met'
      : oversightRatio > 0 ? 'met' : 'advisory',
    recommendation: oversightRequired
      ? oversightRatio >= 0.8
        ? `${Math.round(oversightRatio * 100)}% human oversight rate — meets high-risk requirements`
        : `Human oversight at ${Math.round(oversightRatio * 100)}% — high-risk systems require 80%+`
      : oversightRatio > 0
        ? `${Math.round(oversightRatio * 100)}% human oversight rate recorded`
        : 'Consider adding human oversight checkpoints even for lower-risk systems',
  });

  // Check: Are models identified?
  const decisionsWithModel = decisions.filter((d) => d.model_used && d.model_used.trim().length > 0);
  const modelRatio = decisions.length > 0 ? decisionsWithModel.length / decisions.length : 0;
  gaps.push({
    requirement: 'Model identification and versioning',
    article: 'Article 11 — Technical Documentation',
    status: modelRatio >= 0.9 ? 'met' : modelRatio > 0 ? 'partial' : 'not_met',
    recommendation:
      modelRatio >= 0.9
        ? `${Math.round(modelRatio * 100)}% of decisions identify the model used`
        : `Only ${Math.round(modelRatio * 100)}% of decisions identify the model — target 90%+`,
  });

  // Check: Is confidence tracked?
  const decisionsWithConfidence = decisions.filter((d) => typeof d.confidence === 'number');
  const confidenceRatio = decisions.length > 0 ? decisionsWithConfidence.length / decisions.length : 0;
  gaps.push({
    requirement: 'Confidence scoring for accuracy assessment',
    article: 'Article 15 — Accuracy, Robustness, Cybersecurity',
    status: confidenceRatio >= 0.8 ? 'met' : confidenceRatio > 0 ? 'partial' : 'not_met',
    recommendation:
      confidenceRatio >= 0.8
        ? `${Math.round(confidenceRatio * 100)}% of decisions include confidence scores`
        : `Only ${Math.round(confidenceRatio * 100)}% of decisions include confidence — target 80%+`,
  });

  // Check: Responsible person assigned?
  gaps.push({
    requirement: 'Designated responsible person',
    article: 'Article 26 — Obligations of Deployers',
    status: trail.responsible_person ? 'met' : 'not_met',
    recommendation: trail.responsible_person
      ? `Responsible person: ${trail.responsible_person}`
      : 'No responsible person assigned — required for deployer obligations',
  });

  const metCount = gaps.filter((g) => g.status === 'met').length;
  const totalChecks = gaps.length;
  const complianceScore = Math.round((metCount / totalChecks) * 100);

  return {
    trail_id,
    system_name: trail.system_name,
    risk_classification: trail.risk_classification,
    compliant: metCount === totalChecks,
    compliance_score: complianceScore,
    checks_passed: metCount,
    checks_total: totalChecks,
    gaps,
  };
}

// ═══════════════════════════════════════════
// EVIDENCE PACKAGE GENERATION
// ═══════════════════════════════════════════

/**
 * Generate auditor-ready evidence documentation.
 */
export function generateEvidencePackage(trail_id, time_range_days = 30) {
  const trail = trails.get(trail_id);
  if (!trail) {
    return { error: `Audit trail '${trail_id}' not found` };
  }

  const cutoff = new Date(Date.now() - time_range_days * 24 * 60 * 60 * 1000).toISOString();
  const filteredDecisions = trail.decisions.filter((d) => d.timestamp >= cutoff);

  // Model usage breakdown
  const modelUsage = {};
  for (const d of filteredDecisions) {
    const model = d.model_used || 'unspecified';
    modelUsage[model] = (modelUsage[model] || 0) + 1;
  }

  // Human oversight percentage
  const oversightCount = filteredDecisions.filter((d) => d.human_oversight).length;
  const oversightPct = filteredDecisions.length > 0
    ? Math.round((oversightCount / filteredDecisions.length) * 100)
    : 0;

  // Average confidence
  const confidenceValues = filteredDecisions
    .filter((d) => typeof d.confidence === 'number')
    .map((d) => d.confidence);
  const avgConfidence = confidenceValues.length > 0
    ? Math.round((confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length) * 100) / 100
    : null;

  // Compliance status
  const complianceCheck = checkComplianceGaps(trail_id);

  return {
    evidence_package: {
      generated_at: new Date().toISOString(),
      time_range_days,
      regulation: 'EU AI Act (Regulation (EU) 2024/1689)',

      system_info: {
        system_id: trail.system_id,
        system_name: trail.system_name,
        risk_classification: trail.risk_classification,
        responsible_person: trail.responsible_person,
        trail_created: trail.created_at,
      },

      decision_log_summary: {
        total_decisions_in_range: filteredDecisions.length,
        total_decisions_all_time: trail.decision_count,
        period_start: cutoff,
        period_end: new Date().toISOString(),
        first_decision: filteredDecisions.length > 0 ? filteredDecisions[0].timestamp : null,
        last_decision: filteredDecisions.length > 0 ? filteredDecisions[filteredDecisions.length - 1].timestamp : null,
      },

      human_oversight: {
        decisions_with_oversight: oversightCount,
        oversight_percentage: oversightPct,
        assessment: oversightPct >= 80
          ? 'Adequate — meets Article 14 requirements for high-risk systems'
          : oversightPct >= 50
            ? 'Partial — may not meet high-risk system requirements'
            : 'Insufficient — human oversight measures need immediate attention',
      },

      model_usage_breakdown: modelUsage,

      accuracy_metrics: {
        average_confidence: avgConfidence,
        decisions_with_confidence_score: confidenceValues.length,
      },

      compliance_status: {
        compliant: complianceCheck.compliant,
        compliance_score: complianceCheck.compliance_score,
        gaps_found: complianceCheck.gaps.filter((g) => g.status !== 'met').length,
        gaps_detail: complianceCheck.gaps,
      },

      auditor_notes: [
        'This evidence package was generated automatically by Compliance Shield MCP',
        `Report covers ${time_range_days}-day window ending ${new Date().toISOString()}`,
        'Decision logs include input/output summaries, reasoning chains, model identifiers, and confidence scores',
        'Human oversight flags indicate whether a human reviewed or approved each decision',
        'For full decision-level detail, request individual decision records via the audit trail',
      ],
    },
  };
}

// ═══════════════════════════════════════════
// ENFORCEMENT TIMELINE
// ═══════════════════════════════════════════

const ENFORCEMENT_MILESTONES = [
  {
    date: '2025-02-02',
    title: 'Prohibited AI Practices Ban',
    description: 'AI systems classified as unacceptable risk are banned (Article 5). Includes social scoring, manipulative AI, real-time biometric identification in public spaces (with exceptions).',
    article: 'Article 5',
    impact: 'critical',
  },
  {
    date: '2025-08-02',
    title: 'Governance Bodies Established',
    description: 'National competent authorities and the EU AI Office must be operational. GPAI model provider obligations take effect.',
    article: 'Articles 64-69',
    impact: 'high',
  },
  {
    date: '2026-08-02',
    title: 'High-Risk AI Obligations',
    description: 'Full compliance required for high-risk AI systems in Annex III. Risk management, data governance, technical documentation, record-keeping, transparency, human oversight, accuracy, and cybersecurity.',
    article: 'Articles 6-15, 26, 43, 49',
    impact: 'critical',
  },
  {
    date: '2027-08-02',
    title: 'Full Enforcement for All AI Systems',
    description: 'Complete EU AI Act enforcement including high-risk AI systems in Annex I (harmonised legislation). All penalties fully applicable — up to 35M EUR or 7% global turnover.',
    article: 'Full Regulation',
    impact: 'critical',
  },
];

/**
 * Get enforcement timeline with days remaining for each milestone.
 */
export function getEnforcementTimeline() {
  const now = new Date();
  const milestones = ENFORCEMENT_MILESTONES.map((m) => {
    const target = new Date(m.date);
    const daysRemaining = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    return {
      ...m,
      days_remaining: daysRemaining,
      status: daysRemaining <= 0 ? 'in_effect' : daysRemaining <= 90 ? 'imminent' : 'upcoming',
    };
  });

  const nextDeadline = milestones.find((m) => m.status !== 'in_effect');

  return {
    regulation: 'EU AI Act (Regulation (EU) 2024/1689)',
    current_date: now.toISOString().split('T')[0],
    milestones,
    next_deadline: nextDeadline
      ? { title: nextDeadline.title, date: nextDeadline.date, days_remaining: nextDeadline.days_remaining }
      : { title: 'All milestones in effect', date: null, days_remaining: 0 },
    penalties: {
      prohibited_violations: 'Up to 35M EUR or 7% of global annual turnover',
      high_risk_violations: 'Up to 15M EUR or 3% of global annual turnover',
      misinformation_to_authorities: 'Up to 7.5M EUR or 1% of global annual turnover',
      sme_reduced_caps: 'Lower of the two amounts applies for SMEs and startups',
    },
  };
}

// ═══════════════════════════════════════════
// RESOURCE HELPERS
// ═══════════════════════════════════════════

/**
 * List all active audit trails (for resource endpoint).
 */
export function listTrails() {
  const result = [];
  for (const [id, trail] of trails) {
    result.push({
      trail_id: id,
      system_id: trail.system_id,
      system_name: trail.system_name,
      risk_classification: trail.risk_classification,
      responsible_person: trail.responsible_person,
      decision_count: trail.decision_count,
      created_at: trail.created_at,
    });
  }
  return result;
}
