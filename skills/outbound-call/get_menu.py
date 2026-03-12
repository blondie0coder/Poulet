#!/usr/bin/env python3
"""
Usage:
  get_menu.py <phone>   — call the restaurant and ask for the menu
"""
import sys, os, json, re, urllib.request, urllib.error

API_KEY         = os.environ.get("ELEVENLABS_API_KEY", "")
AGENT_ID        = os.environ.get("ELEVENLABS_AGENT_ID", "")
PHONE_NUMBER_ID = os.environ.get("ELEVENLABS_PHONE_NUMBER_ID", "")

def api(method, url, body=None):
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method,
          headers={"xi-api-key": API_KEY, "Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def place_call(to):
    if not API_KEY:
        return {"error": "ELEVENLABS_API_KEY not set — run: set -a && source .env && set +a"}
    if not AGENT_ID:
        return {"error": "ELEVENLABS_AGENT_ID not set — check .env"}
    if not PHONE_NUMBER_ID:
        return {"error": "ELEVENLABS_PHONE_NUMBER_ID not set — check .env"}
    if not re.match(r'^\+\d{7,15}$', to):
        return {"error": f"Invalid number: {to}"}
    result = api("POST", "https://api.elevenlabs.io/v1/convai/twilio/outbound-call", {
        "agent_id": AGENT_ID,
        "agent_phone_number_id": PHONE_NUMBER_ID,
        "to_number": to,
    })
    conv_id = result.get("conversation_id")
    if not conv_id:
        return {"error": result.get("error", "Call failed")}
    return {"success": True, "conversation_id": conv_id, "status": "calling"}

if __name__ == "__main__":
    if len(sys.argv) == 2:
        print(json.dumps(place_call(sys.argv[1])))
    else:
        print(json.dumps({"error": "Usage: get_menu.py <phone>"}))
        sys.exit(1)
