import uuid
from pathlib import Path

PROFILES_DIR = Path(__file__).parent / "profiles"


def load_profile(resume_id: str) -> str:
    """Returns the candidate's own HR answers. They live in profiles/<resume_id>.md, so they only ever apply to that resume."""
    try:
        # resume_id comes from the client, so make sure it can't point outside the folder
        name = str(uuid.UUID(resume_id))
    except ValueError:
        return ""
    path = PROFILES_DIR / f"{name}.md"
    return path.read_text(encoding="utf-8") if path.is_file() else ""
