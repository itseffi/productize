import math
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.dont_write_bytecode = True
sys.path.insert(0, str(ROOT))

from capm import capm_cost_of_equity
from convertible_notes import convertible_note_conversion_amount, convertible_note_discount_price, convertible_note_shares
from dcf import npv, terminal_value_gordon
from option_pools import investor_friendly_option_pool
from preferred_stock import liquidation_preference, nonparticipating_preferred_payoff
from vc_method import post_money, pre_money, vc_target_multiple
from wacc import wacc


def approx(actual, expected, tolerance=0.01):
    assert math.isclose(actual, expected, abs_tol=tolerance), f"{actual} != {expected}"


def test_dcf_npv():
    approx(npv(1000, [500, 500, 500], 0.10), 243.43)


def test_growing_perpetuity():
    approx(terminal_value_gordon(100, 0.10, 0.03), 1428.57)


def test_capm():
    approx(capm_cost_of_equity(0.02, 1.5, 0.06), 0.11, 0.0001)


def test_wacc():
    approx(wacc(300, 300, 0.10, 0.06, 0.40), 0.068, 0.0001)


def test_vc_target_multiple():
    approx(vc_target_multiple(0.30, 5, 0.25), 14.8517, 0.0001)


def test_post_money():
    post = post_money(10, 0.20)
    approx(post, 50, 0.0001)
    approx(pre_money(post, 10), 40, 0.0001)


def test_convertible_note_discount():
    conversion_amount = convertible_note_conversion_amount(1_000_000, 0.05, 1, "simple")
    discount_price = convertible_note_discount_price(3.825, 0.20)
    approx(conversion_amount, 1_050_000, 0.0001)
    approx(discount_price, 3.06, 0.0001)
    approx(convertible_note_shares(conversion_amount, discount_price), 343_137.25, 0.01)


def test_investor_friendly_option_pool():
    result = investor_friendly_option_pool(900_000, 0.10, 0.10)
    approx(result["total_post_money_shares"], 1_125_000, 0.0001)
    approx(result["investor_shares"], 112_500, 0.0001)
    approx(result["option_pool_shares"], 112_500, 0.0001)
    approx(result["existing_holder_ownership"], 0.80, 0.0001)


def test_preferred_stock_payoff():
    preference = liquidation_preference(10, 1)
    approx(nonparticipating_preferred_payoff(30, preference, 0.25), 10, 0.0001)
    approx(nonparticipating_preferred_payoff(100, preference, 0.25), 25, 0.0001)


if __name__ == "__main__":
    for name, fn in sorted(globals().items()):
        if name.startswith("test_"):
            fn()
    print("Finance kernel acceptance tests passed.")
