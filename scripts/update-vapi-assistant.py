#!/usr/bin/env python3
"""Push scripts/vapi-elidine-prompt.txt to the Eldine Vapi assistant."""

import json
import os
import urllib.request
from pathlib import Path

ASSISTANT_ID = "6e3b77b0-9bca-4acd-997b-b0d1d8ea9620"
TOOL_IDS = [
    "1f9e0c72-ed66-4764-899c-d36d8c3f9713",
    "0f54e4b0-7dec-457f-9395-f76251da7515",
]

ROOT = Path(__file__).resolve().parent.parent
PROMPT_FILE = ROOT / "scripts" / "vapi-elidine-prompt.txt"


def main():
    token = os.environ.get("VAPI_TOKEN") or os.environ.get("VAPI_PRIVATE_KEY")
    if not token:
        raise SystemExit("Set VAPI_TOKEN or VAPI_PRIVATE_KEY")

    site_url = os.environ.get("SITE_URL", "https://elidine.com").rstrip("/")
    webhook_secret = os.environ.get("VAPI_WEBHOOK_SECRET", "")

    prompt = PROMPT_FILE.read_text()
    payload = {
        "firstMessage": "Thank you for calling Elidine. How may I help you today?",
        "endCallMessage": "Thank you for calling Elidine. We look forward to seeing you. Goodbye!",
        "voicemailMessage": "You've reached Elidine in Garland. Please leave your name, phone number, and preferred service, and we'll return your call shortly.",
        "transcriber": {"provider": "deepgram", "model": "nova-2", "language": "en"},
        "silenceTimeoutSeconds": 30,
        "maxDurationSeconds": 900,
        "backchannelingEnabled": True,
        "backgroundDenoisingEnabled": True,
        "endCallPhrases": [
            "goodbye",
            "bye",
            "bye bye",
            "thank you goodbye",
            "have a good day",
        ],
        "monitorPlan": {
            "listenEnabled": True,
            "controlEnabled": True,
        },
        "artifactPlan": {
            "recordingEnabled": True,
            "recordingFormat": "wav;l16",
            "loggingEnabled": True,
            "transcriptPlan": {
                "enabled": True,
                "assistantName": "Elidine",
                "userName": "Caller",
            },
        },
        "serverUrl": f"{site_url}/api/vapi-webhook",
        "model": {
            "provider": "openai",
            "model": "gpt-4o",
            "temperature": 0.7,
            "toolIds": TOOL_IDS,
            "messages": [{"role": "system", "content": prompt}],
        },
    }

    if webhook_secret:
        payload["serverUrlSecret"] = webhook_secret

    payload["serverMessages"] = [
        "end-of-call-report",
        "status-update",
        "transcript",
    ]

    req = urllib.request.Request(
        f"https://api.vapi.ai/assistant/{ASSISTANT_ID}",
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="PATCH",
    )
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read())
        print(f"Updated assistant: {result['name']} ({result['id']})")
        print(f"Tools: {result['model'].get('toolIds')}")
        print(f"Server URL: {result.get('serverUrl')}")
        print(f"Monitor: {result.get('monitorPlan')}")
        print(f"Artifacts: recording={result.get('artifactPlan', {}).get('recordingEnabled')}")


if __name__ == "__main__":
    main()
