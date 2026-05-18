from validation import FinanceValidationError, require_positive


def bond_price(coupon, face_value, yield_to_maturity, periods):
    if yield_to_maturity == 0:
        return coupon * periods + face_value
    return coupon * (1 - (1 + yield_to_maturity) ** (-periods)) / yield_to_maturity + face_value / (1 + yield_to_maturity) ** periods


def yield_to_maturity(price, coupon, face_value, periods, tolerance=1e-7, max_iterations=200):
    require_positive("price", price)
    low = -0.999999
    high = 1.0
    while bond_price(coupon, face_value, high, periods) > price and high < 1000:
        high *= 2
    if high >= 1000:
        raise FinanceValidationError("Yield to maturity could not be bracketed.")
    for _ in range(max_iterations):
        mid = (low + high) / 2
        mid_price = bond_price(coupon, face_value, mid, periods)
        if abs(mid_price - price) <= tolerance:
            return mid
        if mid_price > price:
            low = mid
        else:
            high = mid
    return (low + high) / 2


def current_yield(annual_coupon, bond_price_value):
    require_positive("bond_price", bond_price_value)
    return annual_coupon / bond_price_value


def credit_spread(risky_yield, risk_free_yield):
    return risky_yield - risk_free_yield
