# Generated Skill Template

Use this template when generating a new company-specific data analysis skill. Replace every placeholder before packaging or handing the skill to the user.

````markdown
---
name: [company]-data-analyst
description: >-
  [COMPANY] data analysis skill. Provides context for querying [WAREHOUSE_TYPE],
  including entity definitions, metric calculations, and common query patterns.
  Use when analyzing [COMPANY] data for [PRIMARY_USE_CASE_1], [PRIMARY_USE_CASE_2],
  [PRIMARY_USE_CASE_3], or any data question requiring [COMPANY]-specific context.
---

# [COMPANY] Data Analysis

## SQL Dialect: [WAREHOUSE_TYPE]

[INSERT THE MATCHING DIALECT SECTION FROM references/sql-dialects.md]

## Entity Disambiguation

When users mention these terms, clarify which entity they mean:

**"User" can mean:**
- **Account**: An individual login/profile (`[PRIMARY_TABLE]`: `[ID_FIELD]`)
- **Organization**: A billing entity that can have multiple accounts (`[ORG_TABLE]`: `[ORG_ID]`)
- **[OTHER_TYPE]**: [DEFINITION] (`[TABLE]`: `[ID]`)

**Relationships:**
- [ENTITY_1] -> [ENTITY_2]: [RELATIONSHIP_TYPE] (join on `[JOIN_KEY]`)

## Business Terminology

| Term | Definition | Notes |
|---|---|---|
| [TERM_1] | [DEFINITION] | [CONTEXT/GOTCHA] |
| [TERM_2] | [DEFINITION] | [CONTEXT/GOTCHA] |
| [ACRONYM] | [FULL_NAME] - [EXPLANATION] | |

## Standard Filters

Always apply these filters unless explicitly told otherwise:

```sql
-- Exclude test/internal data
WHERE [TEST_FLAG_COLUMN] = FALSE
  AND [INTERNAL_FLAG_COLUMN] = FALSE

-- Exclude invalid/fraud
  AND [STATUS_COLUMN] != '[EXCLUDED_STATUS]'

-- [OTHER STANDARD EXCLUSIONS]
```

**When to override:**
- [SCENARIO_1]: Include [NORMALLY_EXCLUDED] when [CONDITION]

## Key Metrics

### [METRIC_1_NAME]

- **Definition**: [PLAIN_ENGLISH_EXPLANATION]
- **Formula**: `[EXACT_CALCULATION]`
- **Source**: `[TABLE_NAME].[COLUMN_NAME]`
- **Time grain**: [DAILY/WEEKLY/MONTHLY]
- **Caveats**: [EDGE_CASES_OR_GOTCHAS]

### [METRIC_2_NAME]

- **Definition**: [PLAIN_ENGLISH_EXPLANATION]
- **Formula**: `[EXACT_CALCULATION]`
- **Source**: `[TABLE_NAME].[COLUMN_NAME]`
- **Time grain**: [DAILY/WEEKLY/MONTHLY]
- **Caveats**: [EDGE_CASES_OR_GOTCHAS]

## Data Freshness

| Table | Update Frequency | Typical Lag |
|---|---|---|
| [TABLE_1] | [FREQUENCY] | [LAG] |
| [TABLE_2] | [FREQUENCY] | [LAG] |

To check data freshness:

```sql
SELECT MAX([DATE_COLUMN]) AS latest_data
FROM [TABLE];
```

## Knowledge Base Navigation

Use these reference files for detailed table documentation:

| Domain | Reference File | Use For |
|---|---|---|
| [DOMAIN_1] | `references/tables/[domain1].md` | [BRIEF_DESCRIPTION] |
| [DOMAIN_2] | `references/tables/[domain2].md` | [BRIEF_DESCRIPTION] |
| Entities | `references/entities.md` | Entity definitions and relationships |
| Metrics | `references/metrics.md` | KPI calculations and formulas |

## Common Query Patterns

### [PATTERN_1_NAME]

```sql
[SAMPLE_QUERY]
```

### [PATTERN_2_NAME]

```sql
[SAMPLE_QUERY]
```

## Troubleshooting

### Common Mistakes

- **[MISTAKE_1]**: [EXPLANATION] -> [CORRECT_APPROACH]
- **[MISTAKE_2]**: [EXPLANATION] -> [CORRECT_APPROACH]

### Access Issues

- If you encounter permission errors on `[TABLE]`: [WORKAROUND]
- For PII-restricted columns: [ALTERNATIVE_APPROACH]

### Performance Tips

- Filter by `[PARTITION_COLUMN]` first to reduce data scanned.
- For large tables, use `LIMIT` during exploration.
- Prefer `[AGGREGATED_TABLE]` over `[RAW_TABLE]` when possible.
````

## Customization Notes

When generating a skill:

1. Fill all placeholders. Do not leave `[PLACEHOLDER]`, `[COMPANY]`, or other bracketed template text in the final skill.
2. Remove unused sections.
3. Replace generic advice with specific table names, column names, values, and warehouse behavior.
4. Include real sample queries using actual table and column names.
5. Keep the result scannable with tables, bullets, and code blocks.
6. Confirm `SKILL.md` has only valid skill frontmatter plus the Markdown body.
