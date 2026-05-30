# Canonical Market Opportunity Canvases

Use these four canvases as the canonical output surfaces. Use neutral artifact names in
user-facing output.

## 1. Opportunity Overview Canvas

Purpose: show the entire flow from opportunity generation to attractiveness placement
to focus portfolio decision.

Required fields:

- Name.
- Date.
- Title: `Market Opportunity Overview`.
- Market opportunity definition: `application + customer`.
- Left panel: **Market Opportunity Set**.
- Middle panel: **Attractiveness Map**.
- Right panel: **Focus Portfolio Map**.

### Market Opportunity Set Panel

Contains market opportunity cards generated from:

```text
application + customer = market opportunity
```

Each card should have:

| Field | Description |
|---|---|
| ID | Short stable label such as MO-1, MO-2, MO-3 |
| Application | What the core ability enables |
| Customer segment | Who needs that application |
| Market opportunity | Combined application + customer |

### Attractiveness Map Panel

Axes:

| Axis | Direction | Rating Levels |
|---|---|---|
| Potential | vertical | Low, Mid, High, Super High |
| Challenge | horizontal | Low, Mid, High, Super High |

Zones:

| Zone | Meaning |
|---|---|
| Gold Mine | High potential with relatively low challenge |
| Quick Win | Lower potential with relatively low challenge |
| Moon Shot | High potential with high challenge |
| Questionable | Lower potential with high challenge |

### Focus Portfolio Map Panel

Nested decision areas:

| Area | Meaning |
|---|---|
| Pursue now | Active focus or active parallel pursuit |
| Keep open | Preserve option value without fully committing |
| Place in storage | Document but do not actively preserve now |

Cards placed here must identify whether they are primary, backup, growth, or storage
options.

## 2. Opportunity Set Builder

Purpose: generate market opportunities by combining core abilities, applications, and
customer segments.

Required fields:

- Name.
- Date.
- Title: `Generate Your Market Opportunity Set`.
- Core abilities or technological elements.
- Applications.
- Customers.
- Market opportunities.

### Core Abilities Table

List the venture's core abilities or technological elements. Characterize each by
function and properties, independent from the envisioned product.

| Ability ID | Core Ability or Technological Element | Function | Key Properties | Evidence / Notes |
|---|---|---|---|---|
| A1 |  |  |  |  |
| A2 |  |  |  |  |
| A3 |  |  |  |  |
| A4 |  |  |  |  |

### Market Opportunity Generation Table

Use each row to combine an application with a customer segment.

| Opportunity ID | Ability ID(s) | Application | Customer Segment | Finer Customer Segmentation | Market Opportunity |
|---|---|---|---|---|---|
| MO-1 |  |  |  |  |  |
| MO-2 |  |  |  |  |  |
| MO-3 |  |  |  |  |  |

Generation prompts:

- Which applications can the core abilities offer?
- Which customers may need each application?
- Can the customer group be segmented more precisely?
- Which combinations should be evaluated next?

## 3. Attractiveness Evaluator

Purpose: evaluate each market opportunity by potential and challenge, then place it
on the attractiveness map.

Required fields:

- Name.
- Date.
- Title: `Evaluate Market Opportunity Attractiveness`.
- Market Opportunity.
- Potential.
- Challenge.
- Overall Potential.
- Overall Challenge.
- Attractiveness Map zone.

Use this canvas once for every market opportunity being evaluated.

### Potential Ratings

| Potential Dimension | Subcriteria | Rating | Evidence / Assumptions |
|---|---|---|---|
| Compelling Reason to Buy | Unmet need; effective solution; better than current solutions | Low / Mid / High / Super High |  |
| Market Volume | Current market size; expected growth | Low / Mid / High / Super High |  |
| Economic Viability | Margins (value vs. cost); customers' ability to pay; customer stickiness | Low / Mid / High / Super High |  |

### Challenge Ratings

| Challenge Dimension | Subcriteria | Rating | Evidence / Assumptions |
|---|---|---|---|
| Implementation Obstacles | Product development difficulties; sales and distribution difficulties; funding challenges | Low / Mid / High / Super High |  |
| Time to Revenue | Development time; time between product and market readiness; length of sales cycle | Low / Mid / High / Super High |  |
| External Risks | Competitive threat; third-party dependencies; barriers to adoption | Low / Mid / High / Super High |  |

### Overall Placement

| Market Opportunity | Overall Potential | Overall Challenge | Map Zone | Rationale |
|---|---|---|---|---|
|  | Low / Mid / High / Super High | Low / Mid / High / Super High | Gold Mine / Quick Win / Moon Shot / Questionable |  |

## 4. Focus Portfolio Planner

Purpose: design the focus strategy around one primary market opportunity while
preserving backup and growth options.

Required fields:

- Name.
- Date.
- Title: `Design Your Focus Strategy`.
- Primary Market Opportunity.
- Other attractive market opportunities.
- Product relatedness.
- Market relatedness.
- Suitable as backup option.
- Suitable as growth option.
- Action decision: pursue now, keep open, or place in storage.

### Step I: Choose Primary Market Opportunity

Choose the primary market opportunity based on the attractiveness map.

| Primary Market Opportunity | Attractiveness Map Position | Why This Is Primary | Main Evidence | Main Risks |
|---|---|---|---|---|
|  |  |  |  |  |

### Step II: Examine Other Attractive Opportunities

For each other attractive market opportunity, compare it with the primary opportunity.

| Option ID | Market Opportunity | Product Relatedness | Product Relatedness Rationale | Market Relatedness | Market Relatedness Rationale | Risk Overlap With Primary |
|---|---|---|---|---|---|---|
| MO-2 |  | Low / Mid / High |  | Low / Mid / High |  | Low / Mid / High |
| MO-3 |  | Low / Mid / High |  | Low / Mid / High |  | Low / Mid / High |
| MO-4 |  | Low / Mid / High |  | Low / Mid / High |  | Low / Mid / High |

Product relatedness asks how much the products share:

- Technological competences.
- Required resources.
- Necessary networks.

Market relatedness asks how much the customers share:

- Values and benefits.
- Sales channels.
- Word-of-mouth paths.

### Step III: Classify and Decide

Use this table to mark whether each option is suitable as backup, growth, both, or
neither, then decide what to do with it.

| Option ID | Market Opportunity | Backup Option? | Growth Option? | Action | Rationale |
|---|---|---|---|---|---|
| MO-2 |  | Yes / No | Yes / No | Pursue now / Keep open / Place in storage |  |
| MO-3 |  | Yes / No | Yes / No | Pursue now / Keep open / Place in storage |  |
| MO-4 |  | Yes / No | Yes / No | Pursue now / Keep open / Place in storage |  |

Definitions:

- **Backup Option**: an attractive market opportunity that does not share major risks
  with the primary market opportunity and can support a change in direction.
- **Growth Option**: an attractive market opportunity that can create additional value
  if the primary opportunity succeeds.

Strategy rule:

- Keep at least one Backup Option open.
- Keep at least one Growth Option open.
- Decide whether any option is worth pursuing now.
- Place the rest in storage.

### Final Focus Strategy Summary

| Category | Market Opportunity | Decision | Why |
|---|---|---|---|
| Primary |  | Pursue now |  |
| Backup |  | Keep open / Pursue now |  |
| Growth |  | Keep open / Pursue now |  |
| Storage |  | Place in storage |  |
