// Basic integration tests for compliance-shield-mcp SQLite storage layer
// Run with: node --test src/storage.test.js

import { strict as assert } from 'assert';
import { test } from 'node:test';

import {
  assessRiskLevel,
  createAuditTrail,
  logDecision,
  checkComplianceGaps,
  generateEvidencePackage,
  listTrails,
} from './storage.js';

// ── Test 1: createAuditTrail + listTrails ────────────────────────────────────

test('createAuditTrail returns a trail_id and persists to SQLite', () => {
  const result = createAuditTrail({
    system_id: 'test-sys-1',
    system_name: 'Test System Alpha',
    risk_classification: 'minimal',
    responsible_person: 'Jane Doe, CTO',
  });

  assert.ok(result.trail_id, 'trail_id must be defined');
  assert.ok(result.created_at, 'created_at must be defined');
  assert.match(result.trail_id, /^trail-\d+-\d+$/, 'trail_id must match expected format');

  // Verify it shows up in listTrails
  const trails = listTrails();
  const found = trails.find((t) => t.trail_id === result.trail_id);
  assert.ok(found, 'trail must appear in listTrails()');
  assert.equal(found.system_name, 'Test System Alpha');
  assert.equal(found.risk_classification, 'minimal');
  assert.equal(found.responsible_person, 'Jane Doe, CTO');
  assert.equal(found.decision_count, 0);
});

// ── Test 2: logDecision increments count and checkComplianceGaps reads it ───

test('logDecision stores decisions and checkComplianceGaps reflects them', () => {
  const { trail_id } = createAuditTrail({
    system_id: 'test-sys-2',
    system_name: 'Test System Beta',
    risk_classification: 'limited',
    responsible_person: 'John Smith, DPO',
  });

  // Log 3 decisions — all with full metadata so compliance score is high
  for (let i = 1; i <= 3; i++) {
    const res = logDecision(trail_id, {
      input_summary: `Input ${i}`,
      output_summary: `Output ${i}`,
      reasoning: `Because reason ${i}`,
      human_oversight: true,
      model_used: 'claude-sonnet-4',
      confidence: 0.9,
    });

    assert.equal(res.logged, true, `decision ${i} must log successfully`);
    assert.equal(res.trail_id, trail_id);
    assert.equal(res.decision_number, i);
    assert.equal(res.total_decisions, i);
  }

  // Compliance check should see 3 decisions
  const gaps = checkComplianceGaps(trail_id);
  assert.equal(gaps.trail_id, trail_id);
  assert.equal(gaps.checks_total, 6, 'must have 6 compliance checks');

  const decisionGap = gaps.gaps.find((g) => g.article === 'Article 12 — Record-Keeping');
  assert.equal(decisionGap.status, 'met', 'decision logging check must be met');

  const reasoningGap = gaps.gaps.find((g) => g.article === 'Article 13 — Transparency');
  assert.equal(reasoningGap.status, 'met', 'reasoning check must be met (100% have reasoning)');

  const modelGap = gaps.gaps.find((g) => g.article === 'Article 11 — Technical Documentation');
  assert.equal(modelGap.status, 'met', 'model identification check must be met');
});

// ── Test 3: generateEvidencePackage + assessRiskLevel ───────────────────────

test('generateEvidencePackage returns valid structure and assessRiskLevel classifies correctly', () => {
  // assessRiskLevel — minimal case
  const minimal = assessRiskLevel({
    system_description: 'A simple recommendation engine for book suggestions',
    uses_biometrics: false,
    uses_critical_infrastructure: false,
    uses_law_enforcement: false,
    interacts_with_public: false,
  });
  assert.equal(minimal.risk_level, 'minimal');

  // assessRiskLevel — high risk via biometrics
  const high = assessRiskLevel({
    system_description: 'Facial recognition for employee access control',
    uses_biometrics: true,
    uses_critical_infrastructure: false,
    uses_law_enforcement: false,
    interacts_with_public: false,
  });
  assert.equal(high.risk_level, 'high');

  // assessRiskLevel — unacceptable via social scoring keyword
  const unacceptable = assessRiskLevel({
    system_description: 'Citizens social scoring platform for urban governance',
    uses_biometrics: false,
    uses_critical_infrastructure: false,
    uses_law_enforcement: false,
    interacts_with_public: false,
  });
  assert.equal(unacceptable.risk_level, 'unacceptable');

  // generateEvidencePackage
  const { trail_id } = createAuditTrail({
    system_id: 'test-sys-3',
    system_name: 'Test System Gamma',
    risk_classification: 'high',
    responsible_person: 'Alice Brown, CISO',
  });

  logDecision(trail_id, {
    input_summary: 'Biometric scan result',
    output_summary: 'Access granted',
    reasoning: 'Score above threshold',
    human_oversight: true,
    model_used: 'custom-biometric-v2',
    confidence: 0.95,
  });

  const pkg = generateEvidencePackage(trail_id, 30);
  assert.ok(pkg.evidence_package, 'must return evidence_package key');
  assert.equal(pkg.evidence_package.system_info.system_name, 'Test System Gamma');
  assert.equal(pkg.evidence_package.decision_log_summary.total_decisions_in_range, 1);
  assert.equal(pkg.evidence_package.human_oversight.oversight_percentage, 100);
  assert.ok(Array.isArray(pkg.evidence_package.auditor_notes));
  assert.equal(pkg.evidence_package.auditor_notes.length, 5);
});
