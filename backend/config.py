import os


def require_env(name: str) -> str:
    # A blank "KEY=" line in .env counts as missing, not as an empty credential
    value = os.getenv(name, "").strip()
    if not value:
        raise KeyError(name)
    return value
