from validation import require_positive, require_rate_greater_than_growth, require_same_length


def future_value(cash_flow, rate, periods):
    return cash_flow * (1 + rate) ** periods


def present_value(cash_flow, rate, periods):
    return cash_flow / (1 + rate) ** periods


def present_value_stream(cash_flows, rate):
    return sum(present_value(cash_flow, rate, period) for period, cash_flow in enumerate(cash_flows, start=1))


def present_value_with_spot_rates(cash_flows, spot_rates):
    require_same_length("cash_flows", cash_flows, "spot_rates", spot_rates)
    return sum(present_value(cash_flow, spot_rate, period) for period, (cash_flow, spot_rate) in enumerate(zip(cash_flows, spot_rates), start=1))


def annuity_pv(payment, rate, periods):
    require_positive("periods", periods)
    if rate == 0:
        return payment * periods
    return payment * (1 - (1 + rate) ** (-periods)) / rate


def annuity_fv(payment, rate, periods):
    require_positive("periods", periods)
    if rate == 0:
        return payment * periods
    return payment * ((1 + rate) ** periods - 1) / rate


def perpetuity_pv(payment, rate):
    require_positive("rate", rate)
    return payment / rate


def growing_perpetuity_pv(next_payment, rate, growth_rate):
    require_rate_greater_than_growth(rate, growth_rate)
    return next_payment / (rate - growth_rate)
