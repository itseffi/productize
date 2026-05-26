from math import sqrt
from validation import require_positive, require_same_length


def realized_return(price_start, price_end, dividend=0):
    require_positive("price_start", price_start)
    return (price_end - price_start + dividend) / price_start


def expected_return(returns, probabilities):
    require_same_length("returns", returns, "probabilities", probabilities)
    return sum(probability * return_value for return_value, probability in zip(returns, probabilities))


def variance(returns, probabilities):
    mean = expected_return(returns, probabilities)
    return sum(probability * (return_value - mean) ** 2 for return_value, probability in zip(returns, probabilities))


def standard_deviation(returns, probabilities):
    return sqrt(variance(returns, probabilities))


def historical_average_return(returns):
    require_positive("number of returns", len(returns))
    return sum(returns) / len(returns)


def portfolio_expected_return(weights, expected_returns):
    require_same_length("weights", weights, "expected_returns", expected_returns)
    return sum(weight * expected_return_value for weight, expected_return_value in zip(weights, expected_returns))


def covariance(series_a, series_b):
    require_same_length("series_a", series_a, "series_b", series_b)
    require_positive("number of observations", len(series_a))
    mean_a = sum(series_a) / len(series_a)
    mean_b = sum(series_b) / len(series_b)
    return sum((a - mean_a) * (b - mean_b) for a, b in zip(series_a, series_b)) / len(series_a)


def correlation(series_a, series_b):
    cov = covariance(series_a, series_b)
    var_a = covariance(series_a, series_a)
    var_b = covariance(series_b, series_b)
    require_positive("variance of series_a", var_a)
    require_positive("variance of series_b", var_b)
    return cov / sqrt(var_a * var_b)
