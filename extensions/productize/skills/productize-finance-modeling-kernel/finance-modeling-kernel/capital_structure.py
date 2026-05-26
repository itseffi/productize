from validation import require_positive


def enterprise_value(equity_value, debt=0, cash=0, preferred_stock=0, minority_interest=0, nonoperating_assets=0):
    return equity_value + debt + preferred_stock + minority_interest - cash - nonoperating_assets


def equity_value_from_ev(enterprise_value_value, debt=0, cash=0, preferred_stock=0, minority_interest=0, nonoperating_assets=0):
    return enterprise_value_value - debt - preferred_stock - minority_interest + cash + nonoperating_assets


def debt_to_equity(debt, equity):
    require_positive("equity", equity)
    return debt / equity


def debt_to_value(debt, equity):
    require_positive("debt plus equity", debt + equity)
    return debt / (debt + equity)


def degree_of_financial_leverage(ebit, interest):
    require_positive("ebit minus interest", ebit - interest)
    return ebit / (ebit - interest)


def wacc(equity, debt, cost_of_equity, cost_of_debt, tax_rate):
    total = equity + debt
    require_positive("debt plus equity", total)
    return equity / total * cost_of_equity + debt / total * (1 - tax_rate) * cost_of_debt


def mm_value_no_taxes(unlevered_value):
    return unlevered_value


def mm_cost_of_equity_no_taxes(unlevered_cost_of_capital, cost_of_debt, debt, equity):
    require_positive("equity", equity)
    return unlevered_cost_of_capital + debt / equity * (unlevered_cost_of_capital - cost_of_debt)


def tax_shield(interest, tax_rate):
    return tax_rate * interest


def pv_tax_shield_perpetual(debt, tax_rate):
    return tax_rate * debt


def apv(base_case_npv, pv_tax_shields, pv_distress_costs=0, issuance_costs=0):
    return base_case_npv + pv_tax_shields - pv_distress_costs - issuance_costs
