# compliance-shield-mcp

EU AI Act compliance audit trails and evidence generation for AI agent systems.

**EU AI Act enforcement begins August 2, 2026. Fines up to 35M EUR or 7% of global annual turnover.**

## What it does

Runtime compliance layer that plugs into any MCP-compatible AI system to provide:

- **Risk Classification** — Classify AI systems as Unacceptable, High, Limited, or Minimal risk per the EU AI Act framework
- **Audit Trails** — Create and maintain decision logs with full traceability (input, output, reasoning, human oversight, model, confidence)
- **Gap Analysis** — Identify missing compliance requirements with specific article references and actionable recommendations
- **Evidence Packages** — Generate auditor-ready documentation suitable for regulatory submission
- **Enforcement Timeline** — Track upcoming deadlines with days remaining and penalty structure

## Install

```bash
npx compliance-shield-mcp
```

### Claude Desktop

```json
{
  "mcpServers": {
    "compliance-shield": {
      "command": "npx",
      "args": ["compliance-shield-mcp"]
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `assess_risk_level` | Classify an AI system under EU AI Act risk framework |
| `create_audit_trail` | Start a compliance audit trail for an AI system |
| `log_decision` | Log an AI decision with full traceability metadata |
| `check_compliance_gaps` | Identify missing compliance requirements |
| `generate_evidence_package` | Generate auditor-ready evidence documentation |
| `get_enforcement_timeline` | Show upcoming enforcement deadlines and penalties |

## Resources

| URI | Description |
|-----|-------------|
| `compliance://timeline` | EU AI Act enforcement timeline |
| `compliance://trails` | List all active audit trails |

## Quick Start

```
1. assess_risk_level → Know your risk classification
2. create_audit_trail → Start logging
3. log_decision (repeatedly) → Record every AI decision
4. check_compliance_gaps → Find what's missing
5. generate_evidence_package → Hand to your auditor
```

## EU AI Act Key Dates

| Date | Milestone |
|------|-----------|
| Feb 2, 2025 | Prohibited AI practices banned |
| Aug 2, 2025 | Governance bodies operational |
| **Aug 2, 2026** | **High-risk AI obligations enforced** |
| Aug 2, 2027 | Full enforcement for all AI systems |

## Architecture

- Pure Node.js, ES modules
- `@modelcontextprotocol/sdk` + `zod` only
- In-memory Maps (no external dependencies)
- stdio transport

## License

MIT
