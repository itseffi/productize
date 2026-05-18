from math import sqrt
from validation import require_positive, require_same_length


def portfolio_variance(weights, covariance_matrix):
    rows = len(covariance_matrix)
    require_same_length("weights", weights, "covariance_matrix rows", covariance_matrix)
    for row in covariance_matrix:
        require_same_length("weights", weights, "covariance_matrix row", row)
    return sum(weights[i] * weights[j] * covariance_matrix[i][j] for i in range(rows) for j in range(rows))


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


def beta(asset_returns, market_returns):
    market_variance = covariance(market_returns, market_returns)
    require_positive("market variance", market_variance)
    return covariance(asset_returns, market_returns) / market_variance


def estimate_beta_regression(asset_returns, market_returns, risk_free_rates):
    require_same_length("asset_returns", asset_returns, "market_returns", market_returns)
    require_same_length("asset_returns", asset_returns, "risk_free_rates", risk_free_rates)
    excess_asset = [asset - risk_free for asset, risk_free in zip(asset_returns, risk_free_rates)]
    excess_market = [market - risk_free for market, risk_free in zip(market_returns, risk_free_rates)]
    return beta(excess_asset, excess_market)
