def tax_shield(interest, tax_rate):
    return tax_rate * interest


def pv_tax_shield_perpetual(debt, tax_rate):
    return tax_rate * debt


def apv(base_case_npv, pv_tax_shields, pv_distress_costs=0, issuance_costs=0):
    return base_case_npv + pv_tax_shields - pv_distress_costs - issuance_costs
