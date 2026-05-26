def investor_friendly_option_pool(existing_shares, investor_target_ownership, target_option_pool):
    total_post_money_shares = existing_shares / (1 - investor_target_ownership - target_option_pool)
    investor_shares = investor_target_ownership * total_post_money_shares
    option_pool_shares = target_option_pool * total_post_money_shares
    existing_holder_ownership = existing_shares / total_post_money_shares
    return {
        "total_post_money_shares": total_post_money_shares,
        "investor_shares": investor_shares,
        "option_pool_shares": option_pool_shares,
        "existing_holder_ownership": existing_holder_ownership,
    }


def founder_friendly_option_pool(existing_shares, investor_shares, target_option_pool):
    total_post_pool_shares = (existing_shares + investor_shares) / (1 - target_option_pool)
    option_pool_shares = target_option_pool * total_post_pool_shares
    investor_ownership_final = investor_shares / total_post_pool_shares
    return {
        "total_post_pool_shares": total_post_pool_shares,
        "option_pool_shares": option_pool_shares,
        "investor_ownership_final": investor_ownership_final,
    }
