# Rating and Decision Rules

Use these rules to keep opportunity ratings consistent.

## Rating Scale

Use only these four levels:

```text
Low / Mid / High / Super High
```

For challenge dimensions, higher means more difficult, slower, riskier, or more
resource-intensive. Low challenge is good.

## Potential Ratings

### Compelling Reason to Buy

Rate based on:

- Strength of unmet need.
- Whether the solution effectively addresses the need.
- Whether it is better than current alternatives.

Guidance:

| Rating | Meaning |
|---|---|
| Low | Weak pain, unclear need, or little advantage over alternatives |
| Mid | Recognizable need but limited urgency or differentiation |
| High | Clear need, strong solution fit, meaningful advantage |
| Super High | Urgent need, strong willingness to switch or buy, clear superiority |

### Market Volume

Rate based on:

- Current market size.
- Expected growth.

Guidance:

| Rating | Meaning |
|---|---|
| Low | Small or shrinking reachable market |
| Mid | Meaningful niche or uncertain growth |
| High | Large reachable market or strong growth |
| Super High | Very large market with strong growth and credible reach |

### Economic Viability

Rate based on:

- Margins: value created versus cost to deliver.
- Customers' ability to pay.
- Customer stickiness.

Guidance:

| Rating | Meaning |
|---|---|
| Low | Weak margins, low willingness or ability to pay, low retention potential |
| Mid | Economics may work but are not yet proven |
| High | Attractive value/cost relationship and credible willingness to pay |
| Super High | Strong margins, high willingness to pay, strong retention or lock-in |

## Challenge Ratings

### Implementation Obstacles

Rate based on:

- Product development difficulties.
- Sales and distribution difficulties.
- Funding challenges.

Guidance:

| Rating | Meaning |
|---|---|
| Low | Straightforward product, go-to-market, and funding path |
| Mid | Some execution difficulty, but manageable |
| High | Significant product, distribution, or funding obstacles |
| Super High | Very difficult execution path or major resource gap |

### Time to Revenue

Rate based on:

- Development time.
- Gap between product readiness and market readiness.
- Length of sales cycle.

Guidance:

| Rating | Meaning |
|---|---|
| Low | Revenue can plausibly arrive quickly |
| Mid | Moderate path to revenue |
| High | Long development, readiness, or sales cycle |
| Super High | Very long or uncertain time to revenue |

### External Risks

Rate based on:

- Competitive threat.
- Third-party dependencies.
- Barriers to adoption.

Guidance:

| Rating | Meaning |
|---|---|
| Low | Limited external risk or manageable dependencies |
| Mid | Some competitive, dependency, or adoption risk |
| High | Serious external risks that could block progress |
| Super High | External risks may dominate the opportunity |

## Overall Potential and Challenge

Do not compute mechanically unless the user asks for numeric scoring. Use evidence and
judgment.

Default aggregation:

- Overall Potential should reflect the weakest critical potential dimension. A huge
  market is not enough if there is no compelling reason to buy.
- Overall Challenge should reflect the hardest blocking challenge. A simple build is
  not enough if revenue requires a multi-year sales cycle.

If using numeric support:

```text
Low = 1
Mid = 2
High = 3
Super High = 4
```

Use the rounded average as a starting point, then adjust for blockers and explain the
adjustment.

## Attractiveness Map Zone Rules

| Overall Potential | Overall Challenge | Zone |
|---|---|---|
| High or Super High | Low or Mid | Gold Mine |
| Low or Mid | Low or Mid | Quick Win |
| High or Super High | High or Super High | Moon Shot |
| Low or Mid | High or Super High | Questionable |

Interpretation:

- **Gold Mine**: strongest candidate for primary focus.
- **Quick Win**: potentially useful for learning, early traction, or stepping stones.
- **Moon Shot**: valuable but difficult; may require capital, patience, or unique assets.
- **Questionable**: weak candidate unless strategic reasons or new evidence change the view.

## Primary Market Opportunity Rules

Select the primary opportunity by weighing:

- Attractiveness map zone.
- Strength of evidence.
- Founder/team fit.
- Ability to test assumptions.
- Strategic control and defensibility.
- Fit with resource constraints.

Default preference:

1. Gold Mine with strong evidence.
2. Gold Mine with evidence gaps but testable assumptions.
3. Quick Win if it creates learning, revenue, or capability for a larger path.
4. Moon Shot only if the upside is large enough and the team has unusual advantages.
5. Questionable only if the user explicitly has strategic reasons.

## Backup Option Rules

A backup option should be attractive and should not share major risks with the primary
opportunity.

Good backup options often differ on:

- Customer segment.
- Sales channel.
- Adoption barrier.
- Regulatory pathway.
- Revenue model.
- Critical dependency.

Do not label an option as backup merely because it is related. If it fails for the same
reason the primary fails, it is not a useful backup.

## Growth Option Rules

A growth option should be attractive and should let the venture create additional value
after or alongside the primary opportunity.

Good growth options often share:

- Technology.
- Capabilities.
- Customer relationships.
- Distribution.
- Brand credibility.
- Data or network effects.

High relatedness makes a growth option more plausible. Very low relatedness usually
means the opportunity is diversification, not a near-term growth option.

## Action Decision Rules

### Pursue Now

Use when:

- The option is primary, or
- The option is highly attractive, resources permit parallel pursuit, and pursuing it
  does not dilute the primary focus.

### Keep Open

Use when:

- The option has strategic value as backup or growth.
- The cost of preserving it is modest.
- It requires monitoring, lightweight experiments, modular design choices, IP claims,
  partner conversations, or relationship maintenance.

### Place in Storage

Use when:

- The option is not attractive enough now.
- The opportunity is too unrelated or costly to preserve.
- Evidence is too weak.
- It is worth remembering but not worth spending active effort on.

## Evidence Discipline

For each rating, distinguish:

- Evidence: facts, interviews, data, observed behavior, signed interest, market numbers.
- Assumptions: plausible but unvalidated beliefs.
- Unknowns: missing information that could change the rating.

When evidence is weak, phrase the output as a hypothesis and propose the next test.
