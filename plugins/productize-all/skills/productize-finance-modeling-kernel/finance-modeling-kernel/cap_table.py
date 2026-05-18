from validation import require_positive


def fully_diluted_shares(common=0, preferred_as_converted=0, options_issued=0, option_pool_unissued=0, warrants=0, convertibles=0):
    return common + preferred_as_converted + options_issued + option_pool_unissued + warrants + convertibles


def ownership(shares, total_shares):
    require_positive("total_shares", total_shares)
    return shares / total_shares


def dilution(old_ownership_percentage, new_ownership_percentage):
    require_positive("old_ownership_percentage", old_ownership_percentage)
    return 1 - new_ownership_percentage / old_ownership_percentage


def cap_table_sums_to_100(ownership_percentages, tolerance=1e-6):
    return abs(sum(ownership_percentages) - 1) <= tolerance
