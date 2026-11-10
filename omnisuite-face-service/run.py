import sys
import os

# Add directory to sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import uvicorn

if __name__ == "__main__":
    print(f"[STARTUP] Launching OmniSuite Face Microservice on 127.0.0.1:5050 from {BASE_DIR}...")
    uvicorn.run("main:app", host="127.0.0.1", port=5050, reload=False, log_level="info")
