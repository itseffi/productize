def liquidation_preference(investment, liquidation_multiple=1, accrued_dividends=0):
    return investment * liquidation_multiple + accrued_dividends


def nonparticipating_preferred_payoff(exit_value, liquidation_preference_value, as_converted_ownership):
    return max(liquidation_preference_value, as_converted_ownership * exit_value)


def participating_preferred_payoff(exit_value, liquidation_preference_value, as_converted_ownership, total_preferences):
    if exit_value <= total_preferences:
        return min(exit_value, liquidation_preference_value)
    return liquidation_preference_value + as_converted_ownership * (exit_value - total_preferences)


def capped_participating_preferred_payoff(exit_value, liquidation_preference_value, as_converted_ownership, total_preferences, cap_multiple, investment):
    uncapped = participating_preferred_payoff(exit_value, liquidation_preference_value, as_converted_ownership, total_preferences)
    capped = min(uncapped, cap_multiple * investment)
    converted = as_converted_ownership * exit_value
    return max(capped, converted)
