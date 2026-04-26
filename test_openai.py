import os
from dotenv import load_dotenv
from openai import OpenAI
import json

load_dotenv()
openai_client = OpenAI(api_key=os.environ.get("ELECTION_OPENAI_API_KEY"))

message = "This is a stupid test message lalala poop"
try:
    response = openai_client.chat.completions.create(
        model="gpt-3.5-turbo",
        response_format={ "type": "json_object" },
        messages=[
            {"role": "system", "content": "You are a moderation AI for a school election feedback system. Analyze the message. If it is trolling, gibberish, abusive, or explicitly a joke, set 'is_spam' to true. Otherwise false. You must return ONLY a JSON object with keys: 'is_spam' (boolean), 'category' (string: bullying, academics, facilities, suggestion, or other), 'urgency' (string: Low, Medium, High)."},
            {"role": "user", "content": message}
        ]
    )
    content = response.choices[0].message.content.strip()
    print("Content:", content)
    print("Parsed:", json.loads(content))
except Exception as e:
    print("Error:", e)
