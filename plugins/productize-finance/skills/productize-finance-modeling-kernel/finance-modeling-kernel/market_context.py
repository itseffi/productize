from validation import require_positive


def market_cap(price, shares_outstanding):
    return price * shares_outstanding


def market_weight(company_market_cap, total_market_cap):
    require_positive("total_market_cap", total_market_cap)
    return company_market_cap / total_market_cap


def index_weight(company_market_cap, index_total_market_cap):
    require_positive("index_total_market_cap", index_total_market_cap)
    return company_market_cap / index_total_market_cap


def global_lookthrough_weight(index_weight_value, index_share_of_country_market, country_share_of_world_market):
    return index_weight_value * index_share_of_country_market * country_share_of_world_market


def change_in_listings(start_listings, end_listings):
    return end_listings - start_listings


def percentage_change(start_value, end_value):
    require_positive("start_value", start_value)
    return end_value / start_value - 1


def cagr(beginning_value, ending_value, years):
    require_positive("beginning_value", beginning_value)
    require_positive("years", years)
    return (ending_value / beginning_value) ** (1 / years) - 1
