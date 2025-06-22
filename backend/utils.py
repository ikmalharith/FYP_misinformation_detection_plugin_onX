import requests
import re
import time
from transformers import pipeline
from config import X_BEARER_TOKEN

# Initialize Hugging Face zero-shot classification model (once)
classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
CANDIDATE_LABELS = ["factual", "opinion", "misinformation"]

def run_zero_shot(content):
    try:
        result = classifier(content, CANDIDATE_LABELS, hypothesis_template="This text is {}.")
        return {
            "labels": result["labels"],
            "scores": result["scores"],
            "sequence": result["sequence"]
        }
    except Exception as e:
        return {"error": f"Zero-shot classification failed: {str(e)}"}

def query_google_fact_check(content, api_key):
    url = f"https://factchecktools.googleapis.com/v1alpha1/claims:search?key={api_key}"
    params = {"query": content}
    try:
        response = requests.get(url, params=params)
        if response.status_code != 200:
            return {
                "error": "Google Fact Check API failed",
                "status_code": response.status_code,
                "details": response.text
            }
        return response.json()
    except Exception as e:
        return {"error": f"Exception: {str(e)}"}

def query_claimbuster(content, api_key):
    url = "https://idir.uta.edu/claimbuster/api/v2/score/text/"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {"input_text": content}
    try:
        response = requests.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            return {
                "error": "ClaimBuster API failed",
                "status_code": response.status_code,
                "details": response.text
            }
        return response.json()
    except Exception as e:
        return {"error": f"Exception: {str(e)}"}

def extract_x_post_id(url):
    match = re.search(r'/status/(\d+)', url)
    return match.group(1) if match else None

def fetch_x_post_content(post_id, bearer_token=None):
    if bearer_token is None:
        bearer_token = X_BEARER_TOKEN

    url = f"https://api.twitter.com/2/tweets/{post_id}"
    headers = {
        "Authorization": f"Bearer {bearer_token}"
    }

    for _ in range(3):  # Retry 3x
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                return response.json().get("data", {}).get("text")
            time.sleep(1)
        except Exception as e:
            print(f"Error fetching tweet: {e}")
            time.sleep(1)

    return None
