import urllib.request
import json
import os

url = "https://raw.githubusercontent.com/first20hours/google-10000-english/master/20k.txt"
try:
    req = urllib.request.urlopen(url)
    words = req.read().decode('utf-8').splitlines()
except:
    # fallback if offline or failed
    words = ["hello", "world", "the", "and", "school", "student", "teacher", "class"]

# Add some common school-related words and proper nouns just in case
extra_words = ["bullying", "academics", "facilities", "canteen", "homework", "exam", "exams", "math", "science", "english", "history", "geography", "pe", "recess", "lunch", "locker", "library", "principal", "counselor"]
words.extend(extra_words)

# Ensure uniqueness
words_set = list(set([w.lower() for w in words if w.strip()]))

# Curated hate speech/blocklist
blocklist = [
    "bc", "mc", "lodu", "bakwas", "chutiya", "madarchod", "bhenchod", 
    "randi", "bhosadike", "gandu", "kamina", "kutiya", "haramkhor",
    "fag", "faggot", "nigger", "nigga", "retard", "tranny",
    "chamar", "bhangi", "mullah", "katwa", "bhakt", "ricebag",
    "slut", "whore", "bitch", "cunt", "twat", "fatso", "ugly"
]

js_content = f"""
// Auto-generated wordlist and blocklist
const ENGLISH_WORDS = new Set({json.dumps(words_set)});
const BLOCKLIST = new Set({json.dumps(blocklist)});

// Common Indian/Hinglish slang that should definitely be flagged if they happen to overlap with valid words somehow
const HINGLISH_STOPWORDS = new Set([
    "bohot", "tum", "yaar", "nahi", "kya", "kal", "acha", "theek", "bas", "abhi", "bilkul", "matlab", "hai", "ka", "ki", "se", "aur", "ek", "mein"
]);
"""

os.makedirs('static', exist_ok=True)
with open('static/wordlist.js', 'w') as f:
    f.write(js_content)

print("Generated static/wordlist.js")
