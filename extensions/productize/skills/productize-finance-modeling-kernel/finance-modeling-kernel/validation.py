class FinanceValidationError(ValueError):
    """Raised when a finance formula cannot be applied safely."""


def require_positive(name, value):
    if value <= 0:
        raise FinanceValidationError(f"{name} must be positive.")
    return value


def require_nonnegative(name, value):
    if value < 0:
        raise FinanceValidationError(f"{name} must be nonnegative.")
    return value


def require_rate_greater_than_growth(rate, growth_rate, rate_name="rate"):
    if rate <= growth_rate:
        raise FinanceValidationError(f"{rate_name} must be greater than growth rate.")


def require_same_length(name_a, values_a, name_b, values_b):
    if len(values_a) != len(values_b):
        raise FinanceValidationError(f"{name_a} and {name_b} must have the same length.")


def warn_if(condition, message, warnings=None):
    if not condition:
        return warnings if warnings is not None else []
    if warnings is None:
        warnings = []
    warnings.append(message)
    return warnings
