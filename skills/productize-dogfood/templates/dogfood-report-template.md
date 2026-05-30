# Dogfood QA Report

**Target:** {target_url}
**Date:** {date}
**Mode:** {mode}
**Scope:** {scope_description}
**Tester:** Productize Dogfood

## Executive Summary

{one_sentence_assessment}

| Severity | Count | Release Impact |
|---|---:|---|
| P0 | {p0_count} | Blocks release |
| P1 | {p1_count} | Blocks or requires accepted risk |
| P2 | {p2_count} | Conditional pass or follow-up |
| P3 | {p3_count} | Polish backlog |
| Total | {total_count} | {overall_decision} |

## Quality Scope

- Target: {target_url}
- Scope: {scope_description}
- Assumptions: {assumptions}
- Exclusions: {excluded_surfaces}
- Blockers: {coverage_blockers}

## Pages Tested

| Page / URL | Purpose | Evidence | Console Status | Result | Notes |
|---|---|---|---|---|---|
| {page_or_url} | {purpose} | {screenshot_or_snapshot} | {console_status} | {result} | {notes} |

## Flows Tested

| Flow | Steps Exercised | Expected | Actual | Evidence | Result |
|---|---|---|---|---|---|
| {flow_name} | {steps} | {expected_behavior} | {actual_behavior} | {evidence_path} | {result} |

## Console Errors

| Page / Flow | Error or Warning | Severity | Evidence | Notes |
|---|---|---|---|---|
| {page_or_flow} | {console_output_or_none_observed} | {severity} | {evidence_path} | {notes} |

## Screenshots / Evidence

- {evidence_label}: {evidence_path}

## Severity Table

| # | Title | Severity | Category | URL / Flow | Release Impact | Owner |
|---|---|---|---|---|---|---|
| {n} | {title} | {severity} | {category} | {url_or_flow} | {release_impact} | {owner} |

## Issues

### Issue #{issue_number}: {issue_title}

| Field | Value |
|---|---|
| Severity | {severity} |
| Category | {category} |
| URL / Flow | {url_or_flow} |
| Owner / Gate | {owner_or_gate} |
| Release Impact | {release_impact} |

**Description:** {description}

**Steps to Reproduce:**

1. {step_1}
2. {step_2}
3. {step_3}

**Expected Behavior:** {expected_behavior}

**Actual Behavior:** {actual_behavior}

**Evidence:** {screenshot_or_trace_path}

**Console Output:**

```text
{console_output}
```

**Retest Step:** {retest_instruction}

## Blockers

- {blocker_or_none}

## Decision

{pass_conditional_pass_retest_block_or_escalate}

## Next Gate

{next_productize_gate_and_reason}
