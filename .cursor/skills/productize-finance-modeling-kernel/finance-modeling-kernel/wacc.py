from validation import require_positive


def wacc(equity_value, debt_value, cost_of_equity, cost_of_debt, tax_rate):
    total_value = equity_value + debt_value
    require_positive("debt plus equity", total_value)
    equity_weight = equity_value / total_value
    debt_weight = debt_value / total_value
    return equity_weight * cost_of_equity + debt_weight * (1 - tax_rate) * cost_of_debt
