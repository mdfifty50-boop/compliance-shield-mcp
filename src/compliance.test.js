/**
 * Tests for compliance-shield-mcp.
 * Uses node:test + node:assert/strict.
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import {
  assessRiskLevel,
  createAuditTrail,
  logDecision,
  checkComplianceGaps,
  generateEvidencePackage,
  getEnforcementTimeline,
  listTrails,
} from './storage.js';

describe('assessRiskLevel', () => {
  test('classifies biometric system as high risk', () => {
    const r = assessRiskLevel({
      system_description: 'Facial recognition for employee access',
      uses_biometrics: true,
      uses_critical_infrastructure: false,
      uses_law_enforcement: false,
      interacts_with_public: false,
    });
    assert.equal(r.risk_level, 'high');
    assert.ok(r.required_obligations.length > 0);
    assert.ok(Array.isArray(r.article_references));
  });

  test('classifies chatbot as limited risk', () => {
    const r = assessRiskLevel({
      system_description: 'Customer support chatbot',
      uses_biometrics: false,
      uses_critical_infrastructure: false,
      uses_law_enforcement: false,
      interacts_with_public: true,
    });
    assert.ok(['limited', 'minimal'].includes(r.risk_level));
  });

  test('classifies internal analytics as minimal risk', () => {
    const r = assessRiskLevel({
      system_description: 'Internal sales analytics dashboard',
      uses_biometrics: false,
      uses_critical_infrastructure: false,
      uses_law_enforcement: false,
      interacts_with_public: false,
    });
    assert.equal(r.risk_level, 'minimal');
  });
});

describe('createAuditTrail', () => {
  test('creates trail and returns trail_id', () => {
    const r = createAuditTrail({
      system_id: 'sys-test-1',
      system_name: 'Test AI System',
      risk_classification: 'high',
      responsible_person: 'Jane Doe',
    });
    assert.ok(r.trail_id);
    assert.ok(typeof r.trail_id === 'string' && r.trail_id.length > 0);
    assert.ok(r.created_at);
  });

  test('listTrails includes created trail', () => {
    const r = createAuditTrail({
      system_id: 'sys-list-test',
      system_name: 'List Test System',
      risk_classification: 'minimal',
      responsible_person: 'Test User',
    });
    const trails = listTrails();
    assert.ok(Array.isArray(trails));
    assert.ok(trails.some(t => t.trail_id === r.trail_id));
  });
});

describe('logDecision', () => {
  test('logs decision to existing trail', () => {
    const trail = createAuditTrail({
      system_id: 'sys-decision-test',
      system_name: 'Decision Test System',
      risk_classification: 'high',
      responsible_person: 'Auditor',
    });
    const r = logDecision(trail.trail_id, {
      input_summary: 'Applicant profile',
      output_summary: 'Classified as high-risk',
      reasoning: 'Score exceeded threshold of 0.8',
      human_oversight: true,
      model_used: 'gpt-4',
      confidence: 0.92,
    });
    assert.equal(r.logged, true);
    assert.equal(r.trail_id, trail.trail_id);
    assert.ok(r.decision_number >= 1);
  });

  test('returns error for unknown trail_id', () => {
    const r = logDecision('trail-nonexistent-999', {});
    assert.ok(r.error);
  });
});

describe('checkComplianceGaps', () => {
  test('returns gaps for a trail', () => {
    const trail = createAuditTrail({
      system_id: 'sys-gaps-test',
      system_name: 'Gaps Test System',
      risk_classification: 'high',
      responsible_person: 'Auditor',
    });
    const r = checkComplianceGaps(trail.trail_id);
    assert.ok(r.gaps !== undefined || r.compliance_score !== undefined || Array.isArray(r));
  });

  test('returns error for unknown trail_id', () => {
    const r = checkComplianceGaps('trail-nonexistent-000');
    assert.ok(r.error);
  });
});

describe('getEnforcementTimeline', () => {
  test('returns timeline object', () => {
    const r = getEnforcementTimeline();
    assert.ok(r);
    assert.ok(typeof r === 'object');
  });
});
