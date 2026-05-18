const prompt = process.argv.slice(2).join(" ");

console.log(`
Route: Use the narrow Productize skill for the requested artifact. Prompt received: ${prompt}

Evidence: known facts, assumptions, missing inputs, and risky leaps are separated before the recommendation.

Work product:
- Beachhead and validation plan for founder discovery.
- PRD, requirements, and acceptance criteria for delivery work.
- Board narrative with PMF evidence, roadmap tradeoff, risk, and decision ask.
- Agent handoff with architecture risk, retrieval failure mode, evals, and verification.
- Support themes, ticket volume, severity, and prioritized improvements.
- Decision memo comparing SSO, dashboards, and reliability with owner and DRI.
- Metrics validation plan with source of truth, warehouse reconciliation, lineage, freshness, completeness, and validation check.
- Valuation artifact with DCF, WACC, terminal value, enterprise value, equity value, market values, price per share, and sensitivity.
- VC deal artifact with cap table, dilution, pre-money, post-money, option pool, liquidation preference, convertible note, and SAFE.

Warnings:
- Do not ship vague playbooks or filler.
- Do not confuse signups with sustainable growth, retention, CAC payback, or expansion.

Next action: assign an owner, choose the validation metric, and hand off the artifact to the decision maker.
Recommendation: proceed with the smallest evidence-producing artifact first.
`);
