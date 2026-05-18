# Canvas Templates

Use these exact operational field labels when producing blank or filled business model
artifacts. For visual or printable output, copy the matching file from `assets/` and
replace the `{{PLACEHOLDER}}` values.

## Standard Business Model Canvas

Use for a single-sided or conventional product/service business model.

### Header Fields

| Field |
|---|
| Designed for |
| Designed by |
| Date |
| Version |

### Canvas Fields

| Field | What To Fill |
|---|---|
| Key Partners | Partner network, suppliers, outsourced activities, external dependencies, and reasons for partnering. |
| Key Activities | The most important things the organization must do to make the model work. |
| Key Resources | Physical, intellectual, human, financial, data, brand, or network resources required by the model. |
| Value Propositions | The bundle of products, services, gains, or pain relief offered to each customer segment. |
| Customer Relationships | Relationship type expected by each segment: acquisition, retention, support, self-service, community, co-creation, or dedicated help. |
| Channels | How the organization reaches, sells to, delivers to, and supports each segment. |
| Customer Segments | Specific groups served; separate users, customers, buyers, and payers when they differ. |
| Cost Structure | Main fixed and variable costs created by resources, activities, partners, and channels. |
| Revenue Streams | Cash generated from each segment: what they pay for, how they pay, pricing mechanism, recurrence, and timing. |

### Layout Rule

Use this layout when preserving the canvas structure:

```text
┌──────────────┬──────────────┬────────────────┬──────────────┬──────────────┐
│ Key Partners │ Key          │ Value          │ Customer     │ Customer     │
│              │ Activities   │ Propositions   │ Relationships│ Segments     │
│              ├──────────────┤                ├──────────────┤              │
│              │ Key          │                │ Channels     │              │
│              │ Resources    │                │              │              │
├──────────────┴──────────────┴────────────────┴──────────────┴──────────────┤
│ Cost Structure                              │ Revenue Streams                │
└─────────────────────────────────────────────┴───────────────────────────────┘
```

### Editable Markdown Template

| Key Partners | Key Activities | Value Propositions | Customer Relationships | Customer Segments |
|---|---|---|---|---|
| {{KEY_PARTNERS}} | {{KEY_ACTIVITIES}} | {{VALUE_PROPOSITIONS}} | {{CUSTOMER_RELATIONSHIPS}} | {{CUSTOMER_SEGMENTS}} |
|  | **Key Resources**<br>{{KEY_RESOURCES}} |  | **Channels**<br>{{CHANNELS}} |  |
| **Cost Structure**<br>{{COST_STRUCTURE}} |  |  | **Revenue Streams**<br>{{REVENUE_STREAMS}} |  |

## Lean Business Model Canvas

Use for early-stage ventures, corporate startups, and uncertain business concepts.

### Header / Meta Fields

| Field |
|---|
| Business / concept name |
| Date |
| Version |

### Canvas Fields

| Field | What To Fill |
|---|---|
| Problem | Top 1-3 customer problems or jobs. |
| Existing Alternatives | How these problems are solved today, including substitutes, workarounds, or non-consumption. |
| Solution | Possible solution for each problem. |
| Key Metrics | Numbers that show whether the business is working or learning. |
| Unique Value Proposition | Single, clear reason the target customer should care and pay attention. |
| High-Level Concept | Simple X-for-Y analogy or category shorthand. |
| Unfair Advantage | Something that cannot easily be bought or copied. |
| Channels | Inbound or outbound paths to customers. |
| Customer Segments | Target customers and users. |
| Early Adopters | Characteristics of the first ideal customers. |
| Cost Structure | Fixed and variable costs. |
| Revenue Streams | Sources of revenue. |

### Fill Order

Use this order when facilitating a blank canvas:

1. Problem.
2. Customer Segments.
3. Unique Value Proposition.
4. Solution.
5. Channels.
6. Revenue Streams.
7. Cost Structure.
8. Key Metrics.
9. Unfair Advantage.

`Existing Alternatives`, `High-Level Concept`, and `Early Adopters` are supporting
subfields attached to Problem, Unique Value Proposition, and Customer Segments. In
visual layouts they sit at the bottom of those tall columns without an internal
divider line.

### Risk Lenses

Use these risk lenses when turning the canvas into tests:

| Risk Lens | Fields To Stress-Test |
|---|---|
| Product risk | Problem, Solution, Unique Value Proposition, Key Metrics. |
| Customer risk | Customer Segments, Early Adopters, Channels. |
| Market risk | Revenue Streams, Cost Structure, Existing Alternatives, Unfair Advantage. |

### Layout Rule

```text
┌──────────────┬──────────────┬──────────────────────┬──────────────┬──────────────┐
│ Problem      │ Solution     │ Unique Value         │ Unfair       │ Customer     │
│              │              │ Proposition          │ Advantage    │ Segments     │
│ Existing     ├──────────────┤ High-Level Concept   ├──────────────┤ Early        │
│ Alternatives │ Key Metrics  │                      │ Channels     │ Adopters     │
├──────────────┴──────────────┴──────────────────────┴──────────────┴──────────────┤
│ Cost Structure                         │ Revenue Streams                         │
└─────────────────────────────────────────────┴───────────────────────────────────┘
```

### Editable Markdown Template

| Problem | Solution | Unique Value Proposition | Unfair Advantage | Customer Segments |
|---|---|---|---|---|
| {{PROBLEM}}<br><br>**Existing Alternatives**<br>{{EXISTING_ALTERNATIVES}} | {{SOLUTION}}<br><br>**Key Metrics**<br>{{KEY_METRICS}} | {{UNIQUE_VALUE_PROPOSITION}}<br><br>**High-Level Concept**<br>{{HIGH_LEVEL_CONCEPT}} | {{UNFAIR_ADVANTAGE}}<br><br>**Channels**<br>{{CHANNELS}} | {{CUSTOMER_SEGMENTS}}<br><br>**Early Adopters**<br>{{EARLY_ADOPTERS}} |
| **Cost Structure**<br>{{COST_STRUCTURE}} |  |  | **Revenue Streams**<br>{{REVENUE_STREAMS}} |  |

## Platform Business Model Canvas

Use for platforms, marketplaces, ecosystems, and multi-sided business models. Preserve
the four stakeholder quadrants and central platform core.

### Meta Fields

| Field |
|---|
| Created by |
| Version / Date |
| Operation / Business Model |

### Stakeholder Quadrants

| Quadrant | What To Fill |
|---|---|
| Producers | Stakeholders who create, supply, list, publish, sell, or contribute value through the platform. |
| Owner | Actor or organization that governs, operates, monetizes, and evolves the platform. |
| Consumers | Stakeholders who consume, buy, use, discover, or benefit from producer-side value. |
| Partners | Complementors, infrastructure providers, distributors, regulators, or ecosystem allies. |

### Platform Core Fields

| Field | What To Fill |
|---|---|
| Key Platform Components | The enabling components that make exchange possible: matching, identity, trust, reputation, payment, rules, APIs, data, discovery, logistics, moderation, analytics, or other core modules. |
| Value Transactions | Exchanges between stakeholder groups: money, data, goods, services, attention, trust, reputation, access, knowledge, or risk transfer. |
| Value Propositions | Specific reasons each stakeholder group participates. |

### Layout Rule

```text
┌──────────────────────────────┬──────────────────────────────┐
│ Producers                    │ Owner                        │
│                              │                              │
│        ┌────────────────────────────────────────────┐        │
│        │ Key Platform Components                   │        │
│        │ Value Transactions                        │        │
│        │ Value Propositions                        │        │
│        └────────────────────────────────────────────┘        │
│                              │                              │
│ Consumers                    │ Partners                     │
└──────────────────────────────┴──────────────────────────────┘

Side panel: Created by, Version / Date, Operation / Business Model, and canvas title.
```

### Editable Markdown Template

| Platform Stakeholders | Filled Content |
|---|---|
| Producers | {{PRODUCERS}} |
| Owner | {{OWNER}} |
| Consumers | {{CONSUMERS}} |
| Partners | {{PARTNERS}} |

| Platform Core | Filled Content |
|---|---|
| Key Platform Components | {{KEY_PLATFORM_COMPONENTS}} |
| Value Transactions | {{VALUE_TRANSACTIONS}} |
| Value Propositions | {{VALUE_PROPOSITIONS}} |

| Meta | Filled Content |
|---|---|
| Created by | {{CREATED_BY}} |
| Version / Date | {{VERSION_DATE}} |
| Operation / Business Model | {{OPERATION_DESCRIPTION}} |
