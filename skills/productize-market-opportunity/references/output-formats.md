# Output Formats

Use the same canonical four-artifact structure in every format. Use neutral artifact
names in titles and headings.

## Markdown Blank Canvas Set

Use when the user wants editable text tables.

Required sections:

```markdown
# Market Opportunity

## 1. Opportunity Overview Canvas
[overview tables]

## 2. Opportunity Set Builder
[blank abilities and opportunity generation tables]

## 3. Attractiveness Evaluator
[one blank evaluator per opportunity, or reusable blank evaluator]

## 4. Focus Portfolio Planner
[blank primary, relatedness, backup/growth, and action decision tables]
```

## Markdown Filled Canvas Set

Use when the user provides a venture, technology, product, or opportunity set.

Required sections:

```markdown
# Market Opportunity: [Venture/Product]

## 1. Opportunity Overview Canvas
- Market opportunity cards.
- Attractiveness placements.
- Focus portfolio decisions.

## 2. Opportunity Set Builder
- Core abilities.
- Applications.
- Customer segments.
- Generated market opportunities.

## 3. Attractiveness Evaluator
- One evaluation table per selected market opportunity.
- Overall potential, overall challenge, and map zone.

## 4. Focus Portfolio Planner
- Primary market opportunity.
- Option comparison by product and market relatedness.
- Backup/growth classification.
- Pursue now / keep open / place in storage decisions.

## Strategy Implications
- Product/technology modularity.
- IP and defensibility.
- Hiring/capability needs.
- Stakeholder and investor alignment.
- Brand and communication implications.
- Experiments and next evidence to collect.
```

## Visual or Printable Canvas

Use when the user asks for printable templates, visual canvases, an HTML file, a PDF,
or a slide-ready output.

Requirements:

- Produce four separate pages or sections.
- Preserve the same layout logic:
  - Overview: three panels side by side.
  - Opportunity Set Builder: abilities at top; applications and customers below.
  - Attractiveness Evaluator: potential on left, challenge on right, overall ratings at
    the bottom.
  - Focus Portfolio Planner: primary opportunity at top, option columns below, relatedness
    rows, backup/growth rows, action rows at bottom.
- Use neutral artifact titles.
- Include `Name` and `Date` fields when producing a printable artifact.
- Include editable blank spaces or filled content depending on the requested mode.

Recommended visual names:

| Original Function | Use This Title |
|---|---|
| Full opportunity overview | Market Opportunity Overview |
| Generate opportunity set | Opportunity Set Builder |
| Evaluate attractiveness | Market Opportunity Attractiveness |
| Design focus strategy | Focus Strategy Planner |

## Compact Decision Memo

Use when the user wants a concise strategic answer rather than the full canvas set.

Required sections:

```markdown
## Recommendation
[Primary market opportunity and why]

## Opportunity Portfolio
| Category | Opportunity | Decision | Why |

## Key Ratings
| Opportunity | Potential | Challenge | Zone |

## Risks and Open Assumptions
[Most important evidence gaps]

## Next Tests
[Lean experiments or research needed]
```

## Spreadsheet-Friendly Format

Use when the user wants to paste into Sheets/Excel.

Create four CSV-style tables:

1. `opportunity_set`
2. `attractiveness_ratings`
3. `map_placements`
4. `focus_portfolio`

Minimum columns:

```text
opportunity_set:
opportunity_id,ability_ids,application,customer_segment,finer_segment,market_opportunity

attractiveness_ratings:
opportunity_id,potential_compelling_reason,potential_market_volume,potential_economic_viability,overall_potential,challenge_implementation,challenge_time_to_revenue,challenge_external_risks,overall_challenge,evidence_notes

map_placements:
opportunity_id,overall_potential,overall_challenge,map_zone

focus_portfolio:
opportunity_id,role,product_relatedness,market_relatedness,risk_overlap,backup_option,growth_option,action,rationale
```
