from validation import FinanceValidationError, require_positive, require_rate_greater_than_growth


def npv(initial_investment, cash_flows, discount_rate):
    return -initial_investment + sum(cash_flow / (1 + discount_rate) ** period for period, cash_flow in enumerate(cash_flows, start=1))


def npv_with_terminal_value(initial_investment, fcfs, discount_rate, terminal_value):
    return npv(initial_investment, fcfs, discount_rate) + terminal_value / (1 + discount_rate) ** len(fcfs)


def irr(cash_flows, tolerance=1e-7, max_iterations=200):
    def value(rate):
        return sum(cash_flow / (1 + rate) ** period for period, cash_flow in enumerate(cash_flows))

    low = -0.999999
    high = 1.0
    low_value = value(low)
    high_value = value(high)
    while low_value * high_value > 0 and high < 1000:
        high *= 2
        high_value = value(high)
    if low_value * high_value > 0:
        raise FinanceValidationError("IRR could not be bracketed; cash flows may have no real IRR or multiple IRRs.")
    for _ in range(max_iterations):
        mid = (low + high) / 2
        mid_value = value(mid)
        if abs(mid_value) <= tolerance:
            return mid
        if low_value * mid_value < 0:
            high = mid
            high_value = mid_value
        else:
            low = mid
            low_value = mid_value
    return (low + high) / 2


def payback_period(cash_flows):
    cumulative = 0
    for period, cash_flow in enumerate(cash_flows):
        cumulative += cash_flow
        if cumulative >= 0:
            return period
    return None


def discounted_payback_period(cash_flows, discount_rate):
    discounted = [cash_flow / (1 + discount_rate) ** period for period, cash_flow in enumerate(cash_flows)]
    return payback_period(discounted)


def free_cash_flow(ebit, tax_rate, depreciation, capex, delta_nwc):
    return ebit * (1 - tax_rate) + depreciation - capex - delta_nwc


def terminal_value_gordon(fcf_next, discount_rate, growth_rate):
    require_rate_greater_than_growth(discount_rate, growth_rate, "discount_rate")
    return fcf_next / (discount_rate - growth_rate)


def roic(nopat, invested_capital):
    require_positive("invested_capital", invested_capital)
    return nopat / invested_capital


def reinvestment_rate(capex, depreciation, delta_nwc, nopat):
    require_positive("nopat", nopat)
    return (capex - depreciation + delta_nwc) / nopat


def sustainable_growth(roic_value, reinvestment_rate_value):
    return roic_value * reinvestment_rate_value
