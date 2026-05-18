# Domain Reference File Template

Use this template when creating reference files for specific data domains such as revenue, users, marketing, product usage, sales, or support.

````markdown
# [DOMAIN_NAME] Tables

This document contains [domain]-related tables, metrics, and query patterns.

## Quick Reference

### Business Context

[2-3 sentences explaining what this domain covers and key concepts]

### Entity Clarification

**"[AMBIGUOUS_TERM]" can mean:**
- **[MEANING_1]**: [DEFINITION] (`[TABLE]`: `[ID_FIELD]`)
- **[MEANING_2]**: [DEFINITION] (`[TABLE]`: `[ID_FIELD]`)

Always clarify which one before querying.

### Standard Filters

For [domain] queries, always:

```sql
WHERE [STANDARD_FILTER_1]
  AND [STANDARD_FILTER_2]
```

## Key Tables

### [TABLE_1_NAME]

**Location**: `[project.dataset.table]` or `[schema.table]`  
**Description**: [What this table contains, when to use it]  
**Primary Key**: [COLUMN(S)]  
**Update Frequency**: [Daily/Hourly/Real-time] ([LAG] lag)  
**Partitioned By**: [PARTITION_COLUMN] (if applicable)

| Column | Type | Description | Notes |
|---|---|---|---|
| `[column_1]` | [TYPE] | [DESCRIPTION] | [GOTCHA_OR_CONTEXT] |
| `[column_2]` | [TYPE] | [DESCRIPTION] | |
| `[column_3]` | [TYPE] | [DESCRIPTION] | Nullable |

**Relationships**:
- Joins to `[OTHER_TABLE]` on `[JOIN_KEY]`
- Parent of `[CHILD_TABLE]` via `[FOREIGN_KEY]`

**Nested/Struct Fields** (if applicable):
- `[struct_name].[field_1]`: [DESCRIPTION]
- `[struct_name].[field_2]`: [DESCRIPTION]

### [TABLE_2_NAME]

[Repeat the table format above.]

## Key Metrics

| Metric | Definition | Table | Formula | Notes |
|---|---|---|---|---|
| [METRIC_1] | [DEFINITION] | [TABLE] | `[FORMULA]` | [CAVEATS] |
| [METRIC_2] | [DEFINITION] | [TABLE] | `[FORMULA]` | |

## Sample Queries

### [QUERY_PURPOSE_1]

```sql
-- [Brief description of what this query does]
SELECT
  [columns]
FROM [table]
WHERE [standard_filters]
GROUP BY [grouping]
ORDER BY [ordering];
```

### [QUERY_PURPOSE_2]

```sql
[ANOTHER_COMMON_QUERY]
```

### [QUERY_PURPOSE_3]: [More Complex Pattern]

```sql
WITH [cte_name] AS (
  [CTE_LOGIC]
)
SELECT
  [final_columns]
FROM [cte_name]
[joins_and_filters];
```

## Common Gotchas

1. **[GOTCHA_1]**: [EXPLANATION]
   - Wrong: `[INCORRECT_APPROACH]`
   - Right: `[CORRECT_APPROACH]`

2. **[GOTCHA_2]**: [EXPLANATION]

## Related Dashboards

| Dashboard | Link | Use For |
|---|---|---|
| [DASHBOARD_1] | [URL] | [DESCRIPTION] |
| [DASHBOARD_2] | [URL] | [DESCRIPTION] |
````

## Tips for Creating Domain Files

1. Start with the most-queried tables. Do not document everything.
2. Include column-level detail only for important columns. Skip obvious columns unless there is a gotcha.
3. Prefer real query examples over abstract descriptions.
4. Document gotchas prominently.
5. Keep sample queries runnable with real table and column names.
6. Note nested, struct, JSON, and array fields explicitly.
7. Remove unused sections, such as related dashboards, if there is no useful content.

## Suggested Domain Files

Common domains to document:

- `revenue.md`: billing, subscriptions, ARR, transactions.
- `users.md`: accounts, authentication, user attributes.
- `product.md`: feature usage, events, sessions.
- `growth.md`: DAU/WAU/MAU, retention, activation.
- `sales.md`: CRM, pipeline, opportunities.
- `marketing.md`: campaigns, attribution, leads.
- `support.md`: tickets, CSAT, response times.
