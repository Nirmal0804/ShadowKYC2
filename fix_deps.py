import subprocess
import sys

def install_deps():
    print("Force-installing critical dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "uvicorn[standard]", "websockets", "wsproto"])
        print("✅ Dependencies installed.")
    except Exception as e:
        print(f"❌ Failed to install: {e}")

if __name__ == "__main__":
    install_deps()
