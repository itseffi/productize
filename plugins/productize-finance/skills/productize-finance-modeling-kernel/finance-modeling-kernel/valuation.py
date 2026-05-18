from validation import require_positive, require_rate_greater_than_growth


def value_project_dcf(cash_flows, discount_rate, initial_investment):
    return -initial_investment + sum(cash_flow / (1 + discount_rate) ** period for period, cash_flow in enumerate(cash_flows, start=1))


def value_company_dcf(free_cash_flows, wacc, terminal_value):
    return sum(fcf / (1 + wacc) ** period for period, fcf in enumerate(free_cash_flows, start=1)) + terminal_value / (1 + wacc) ** len(free_cash_flows)


def calculate_terminal_value_gordon(fcf_next, wacc, growth_rate):
    require_rate_greater_than_growth(wacc, growth_rate, "wacc")
    return fcf_next / (wacc - growth_rate)


def calculate_terminal_value_exit_multiple(metric, multiple):
    return metric * multiple


def bridge_enterprise_to_equity_value(enterprise_value, debt=0, cash=0, preferred_stock=0, minority_interest=0, nonoperating_assets=0):
    return enterprise_value - debt - preferred_stock - minority_interest + cash + nonoperating_assets


def calculate_price_per_share(equity_value, diluted_shares):
    require_positive("diluted_shares", diluted_shares)
    return equity_value / diluted_shares


def run_comparable_company_valuation(company_metric, comparable_multiples):
    return [calculate_implied_value(company_metric, multiple) for multiple in comparable_multiples]


def run_precedent_transaction_valuation(company_metric, transaction_multiples):
    return [calculate_implied_value(company_metric, multiple) for multiple in transaction_multiples]


def calculate_implied_multiple(value, metric):
    require_positive("metric", metric)
    return value / metric


def calculate_implied_value(metric, multiple):
    return metric * multiple


def run_sensitivity_table(inputs, output_metric):
    rows = []
    for case_name, case_inputs in inputs.items():
        rows.append({"case": case_name, "value": output_metric(**case_inputs)})
    return rows


def run_scenario_analysis(base_case, upside_case, downside_case):
    return {"base": base_case, "upside": upside_case, "downside": downside_case}
