from validation import require_positive


def safe_conversion_price(discount_price, cap_price):
    return min(discount_price, cap_price)


def safe_shares(investment_amount, conversion_price):
    require_positive("conversion_price", conversion_price)
    return investment_amount / conversion_price


def post_money_safe_ownership(investment_amount, post_money_valuation_cap):
    require_positive("post_money_valuation_cap", post_money_valuation_cap)
    return investment_amount / post_money_valuation_cap
