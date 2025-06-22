import requests

# URL of the Flask backend
url = "http://127.0.0.1:5000/analyze"

# JSON data to send to the /analyze endpoint
data = {"url": "https://x.com/PopBase/status/1878869332018737253"}  # Replace with a valid X (Twitter) post URL

# HTTP headers
headers = {"Content-Type": "application/json"}

# Send POST request to the /analyze endpoint
try:
    response = requests.post(url, json=data, headers=headers)

    # Check if the response was successful
    if response.status_code == 200:
        print("Response received:")
        print(response.json())
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
except Exception as e:
    print(f"An error occurred: {str(e)}")
