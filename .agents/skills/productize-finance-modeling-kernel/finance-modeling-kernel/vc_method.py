from validation import require_positive


def burn_rate(monthly_expenses, monthly_cash_receipts=0):
    return monthly_expenses - monthly_cash_receipts


def runway(cash_balance, monthly_net_burn):
    require_positive("monthly_net_burn", monthly_net_burn)
    return cash_balance / monthly_net_burn


def vc_target_multiple(required_return, holding_period, probability_success):
    require_positive("probability_success", probability_success)
    return (1 + required_return) ** holding_period / probability_success


def vc_present_value(successful_exit_value, probability_success, required_return, holding_period):
    return successful_exit_value * probability_success / (1 + required_return) ** holding_period


def vc_total_valuation(successful_exit_value, retention, target_multiple):
    require_positive("target_multiple", target_multiple)
    return successful_exit_value * retention / target_multiple


def vc_partial_valuation(proposed_ownership, total_valuation):
    return proposed_ownership * total_valuation


def vc_required_ownership(required_investment, total_valuation):
    require_positive("total_valuation", total_valuation)
    return required_investment / total_valuation


def post_money(investment, ownership):
    require_positive("ownership", ownership)
    return investment / ownership


def pre_money(post_money_value, investment):
    return post_money_value - investment


def price_per_share(pre_money_value, fully_diluted_pre_money_shares):
    require_positive("fully_diluted_pre_money_shares", fully_diluted_pre_money_shares)
    return pre_money_value / fully_diluted_pre_money_shares


def new_shares(investment, price_per_share_value):
    require_positive("price_per_share", price_per_share_value)
    return investment / price_per_share_value


def ownership(shares, total_shares):
    require_positive("total_shares", total_shares)
    return shares / total_shares
