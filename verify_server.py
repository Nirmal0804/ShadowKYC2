import requests
import time

url = "http://localhost:8000/docs"
print(f"Checking {url}...")

for i in range(10):
    try:
        response = requests.get(url, timeout=2)
        if response.status_code == 200:
            print("Server is UP and running!")
            exit(0)
    except Exception as e:
        print(f"Attempt {i+1}: Server not ready yet... ({e})")
        time.sleep(2)

print("Server failed to respond.")
exit(1)
