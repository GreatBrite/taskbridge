import os
import tempfile

os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.NamedTemporaryFile(delete=False).name}"
os.environ["DEV_AUTH_ENABLED"] = "true"
