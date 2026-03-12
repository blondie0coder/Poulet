#!/usr/bin/env python3
"""
Usage:
  place_order.py <phone> <items>          — place call, return conversation_id immediately
  place_order.py --transcript <id>        — fetch transcript
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

def place_call(to, items):
    if not re.match(r'^\+\d{7,15}$', to):
        return {"error": f"Invalid number: {to}"}
    result = api("POST", "https://api.elevenlabs.io/v1/convai/twilio/outbound-call", {
        "agent_id": AGENT_ID,
        "agent_phone_number_id": PHONE_NUMBER_ID,
        "to_number": to,
        "conversation_initiation_client_data": {
            "conversation_config_override": {
                "agent": {
                    "first_message": "Hello, I'd like to place an order please.",
                    "prompt": {"prompt": f"Order: {items}. Name: Chris. Mention we will pay by Twint. Once the order is confirmed, say thank you and use end_call."}
                }
            }
        }
    })
    conv_id = result.get("conversation_id")
    if not conv_id:
        return {"error": result.get("error", "Call failed")}
    return {"success": True, "conversation_id": conv_id, "status": "calling"}

def get_transcript(conv_id):
    data = api("GET", f"https://api.elevenlabs.io/v1/convai/conversations/{conv_id}")
    status = data.get("status", "unknown")
    if status in ("done", "failed"):
        lines = [
            f"{'Agent' if t['role'] == 'agent' else 'Restaurant'}: {t['message']}"
            for t in data.get("transcript", [])
            if t.get("message") and t["message"] != "None"
        ]
        return {"success": True, "status": status, "transcript": "\n".join(lines)}
    return {"success": False, "status": status, "message": "Call still in progress, try again in 10 seconds"}

if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "--transcript":
        print(json.dumps(get_transcript(sys.argv[2])))
    elif len(sys.argv) == 3:
        print(json.dumps(place_call(sys.argv[1], sys.argv[2])))
    else:
        print(json.dumps({"error": "Usage: place_order.py <phone> <items>  OR  place_order.py --transcript <conv_id>"}))
        sys.exit(1)
