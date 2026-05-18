from validation import require_positive


def capm_cost_of_equity(risk_free_rate, beta, market_risk_premium):
    return risk_free_rate + beta * market_risk_premium


def unlever_beta(beta_l, debt, equity, tax_rate):
    require_positive("equity", equity)
    return beta_l / (1 + (1 - tax_rate) * debt / equity)


def relever_beta(beta_u, debt, equity, tax_rate):
    require_positive("equity", equity)
    return beta_u * (1 + (1 - tax_rate) * debt / equity)


def asset_beta_with_debt_beta(beta_equity, beta_debt, debt, equity, tax_rate=0):
    require_positive("total capital", debt + equity)
    tax_adjusted_debt = debt * (1 - tax_rate)
    return (beta_equity * equity + beta_debt * tax_adjusted_debt) / (equity + tax_adjusted_debt)
