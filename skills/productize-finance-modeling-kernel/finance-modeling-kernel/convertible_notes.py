from validation import require_positive


def convertible_note_conversion_amount(principal, interest_rate, time, compounding_method="simple"):
    if compounding_method == "simple":
        return principal * (1 + interest_rate * time)
    if compounding_method == "compound":
        return principal * (1 + interest_rate) ** time
    raise ValueError("compounding_method must be simple or compound.")


def convertible_note_discount_price(series_a_price, discount_rate):
    return (1 - discount_rate) * series_a_price


def convertible_note_cap_price(valuation_cap, cap_share_count):
    require_positive("cap_share_count", cap_share_count)
    return valuation_cap / cap_share_count


def convertible_note_conversion_price(discount_price, cap_price):
    return min(discount_price, cap_price)


def convertible_note_shares(conversion_amount, conversion_price):
    require_positive("conversion_price", conversion_price)
    return conversion_amount / conversion_price
