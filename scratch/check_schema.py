import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("ELECTION_SUPABASE_URL")
key = os.environ.get("ELECTION_SUPABASE_KEY")
supabase = create_client(url, key)

tables = ["feedback", "ideas", "lost_found", "study_groups"]
for t in tables:
    try:
        res = supabase.table(t).select("*").limit(1).execute()
        if res.data:
            print(f"Columns in {t} table: {res.data[0].keys()}")
        else:
            print(f"{t} table is empty.")
    except Exception as e:
        print(f"Error checking {t}: {e}")
