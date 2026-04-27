import os
import random
import string
from flask import Flask, render_template, request, jsonify, session, redirect
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("ELECTION_SECRET_KEY", "default-secret-key-change-me")

# Supabase setup
url: str = os.environ.get("ELECTION_SUPABASE_URL")
key: str = os.environ.get("ELECTION_SUPABASE_KEY")
supabase: Client = create_client(url, key)

def generate_tracking_id(prefix="FI"):
    chars = string.ascii_uppercase + string.digits
    return prefix + "-" + ''.join(random.choice(chars) for _ in range(5))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/feedback', methods=['POST'])
def submit_feedback():
    data = request.json
    message = data.get('message', '')
    category_input = data.get('category', 'suggestion')
    urgency_input = data.get('urgency', 'Low')
    grade = data.get('grade', '')

    if not message:
        return jsonify({"error": "Message is required"}), 400

    # Client-side filter guarantees it passed if we reached here
    category = category_input
    urgency = urgency_input

    # Merge AI suggestions if needed, or use user input
    category = category_input
    urgency = urgency_input

    case_id = generate_tracking_id("FI")

    # Insert into Supabase
    try:
        supabase.table("feedback").insert({
            "case_id": case_id,
            "category": category,
            "message": message,
            "urgency": urgency,
            "grade": grade,
            "status": "Received",
            "is_spam": False
        }).execute()
        return jsonify({"case_id": case_id}), 200
    except Exception as e:
        print("Supabase Insert Error:", e)
        return jsonify({"error": "Failed to submit feedback"}), 500

@app.route('/api/tracking/<track_id>', methods=['GET'])
def track_case(track_id):
    try:
        prefix = track_id.split('-')[0]
        if prefix == 'FI':
            table, id_col, type_label = "feedback", "case_id", "Feedback"
        elif prefix == 'ID':
            table, id_col, type_label = "ideas", "idea_id", "Idea Box"
        elif prefix == 'LF':
            table, id_col, type_label = "lost_found", "tracking_id", "Lost & Found"
        elif prefix == 'SG':
            table, id_col, type_label = "study_groups", "tracking_id", "Study Group"
        else:
            return jsonify({"error": "Invalid ID format"}), 400

        res = supabase.table(table).select("*").eq(id_col, track_id).execute()
        if len(res.data) > 0:
            item = res.data[0]
            item['type_label'] = type_label
            return jsonify(item), 200
        else:
            return jsonify({"error": "Submission not found"}), 404
    except Exception as e:
        print("Tracking Error:", e)
        return jsonify({"error": "Failed to track submission"}), 500

@app.route('/api/support', methods=['POST'])
def pledge_support():
    try:
        supabase.table("supporters").insert({}).execute()
        count_response = supabase.table("supporters").select("id", count="exact").execute()
        return jsonify({"count": count_response.count}), 200
    except Exception as e:
        print("Supabase Support Error:", e)
        return jsonify({"error": "Failed to register support"}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    try:
        count_response = supabase.table("supporters").select("id", count="exact").execute()
        return jsonify({"count": count_response.count}), 200
    except Exception as e:
        return jsonify({"count": 0}), 200

@app.route('/api/announcements', methods=['GET'])
def get_announcements():
    try:
        response = supabase.table("announcements").select("*").order("date", desc=True).execute()
        return jsonify(response.data), 200
    except Exception as e:
        return jsonify([]), 200

@app.route('/api/action_board', methods=['GET'])
def action_board():
    try:
        # only return specific columns to stay anonymous
        response = supabase.table("feedback").select("category, status").neq("status", "Received").execute()
        return jsonify(response.data), 200
    except Exception as e:
        return jsonify([]), 200



@app.route('/admin')
def admin_page():
    return render_template('admin.html')

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.json
    password = data.get('password')
    admin_pass = os.environ.get("ELECTION_ADMIN_PASSWORD")
    if password and password == admin_pass:
        session['is_admin'] = True
        return jsonify({"success": True}), 200
    return jsonify({"error": "Invalid password"}), 401

@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    session.pop('is_admin', None)
    return jsonify({"success": True}), 200

def is_admin():
    return session.get('is_admin', False)

@app.route('/api/admin/feedback', methods=['GET'])
def admin_get_feedback():
    if not is_admin():
        return jsonify({"error": "Unauthorized"}), 401
    try:
        response = supabase.table("feedback").select("*").order("created_at", desc=True).execute()
        return jsonify(response.data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/feedback/<id>', methods=['PUT'])
def admin_update_feedback(id):
    if not is_admin():
        return jsonify({"error": "Unauthorized"}), 401
    data = request.json
    status = data.get('status')
    if not status:
        return jsonify({"error": "Status is required"}), 400
    try:
        supabase.table("feedback").update({"status": status}).eq("id", id).execute()
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/announcements', methods=['GET', 'POST'])
def admin_announcements():
    if not is_admin():
        return jsonify({"error": "Unauthorized"}), 401
    if request.method == 'GET':
        try:
            response = supabase.table("announcements").select("*").order("date", desc=True).execute()
            return jsonify(response.data), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    data = request.json
    title = data.get('title')
    description = data.get('description')
    if not title or not description:
        return jsonify({"error": "Title and description required"}), 400
    try:
        supabase.table("announcements").insert({"title": title, "description": description}).execute()
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/announcements/<ann_id>', methods=['PUT', 'DELETE'])
def admin_edit_delete_announcement(ann_id):
    if not is_admin(): return jsonify({"error": "Unauthorized"}), 401
    if request.method == 'DELETE':
        try:
            supabase.table("announcements").delete().eq("id", ann_id).execute()
            return jsonify({"success": True}), 200
        except Exception as e: return jsonify({"error": str(e)}), 500
    # PUT
    data = request.json
    title = data.get('title')
    description = data.get('description')
    if not title or not description:
        return jsonify({"error": "Title and description required"}), 400
    try:
        supabase.table("announcements").update({"title": title, "description": description}).eq("id", ann_id).execute()
        return jsonify({"success": True}), 200
    except Exception as e: return jsonify({"error": str(e)}), 500

# ----- NEW FEATURES -----

@app.route('/api/pulse', methods=['GET'])
def get_pulse():
    try:
        response = supabase.table("pulse").select("*").order("votes", desc=True).execute()
        return jsonify(response.data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/pulse/vote/<issue_id>', methods=['POST'])
def vote_pulse(issue_id):
    try:
        # Increment vote (simulate via select then update)
        res = supabase.table("pulse").select("votes").eq("id", issue_id).execute()
        if not res.data:
            return jsonify({"error": "Issue not found"}), 404
        new_votes = res.data[0]['votes'] + 1
        supabase.table("pulse").update({"votes": new_votes}).eq("id", issue_id).execute()
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/pulse', methods=['POST'])
def admin_create_pulse():
    if not is_admin(): return jsonify({"error": "Unauthorized"}), 401
    data = request.json
    issue_name = data.get('issue_name')
    if not issue_name: return jsonify({"error": "Issue name required"}), 400
    try:
        supabase.table("pulse").insert({"issue_name": issue_name, "votes": 0}).execute()
        return jsonify({"success": True}), 200
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/admin/pulse/<pulse_id>', methods=['DELETE'])
def admin_delete_pulse(pulse_id):
    if not is_admin(): return jsonify({"error": "Unauthorized"}), 401
    try:
        supabase.table("pulse").delete().eq("id", pulse_id).execute()
        return jsonify({"success": True}), 200
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/ideas', methods=['POST'])
def submit_idea():
    data = request.json
    title = data.get('title')
    desc = data.get('description')
    category = data.get('category')
    impact = data.get('impact')
    grade = data.get('grade', '')

    idea_id = generate_tracking_id("ID")
    try:
        supabase.table("ideas").insert({
            "idea_id": idea_id,
            "title": title[:60],
            "description": desc[:300],
            "category": category,
            "impact": impact,
            "grade": grade,
            "status": "Received",
            "is_spam": False
        }).execute()
        return jsonify({"idea_id": idea_id}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/ideas/featured', methods=['GET'])
def get_featured_ideas():
    try:
        response = supabase.table("ideas").select("*").neq("status", "Under Review").order("created_at", desc=True).limit(5).execute()
        return jsonify(response.data), 200
    except Exception as e:
        return jsonify([]), 200

@app.route('/api/lost_found', methods=['GET', 'POST'])
def handle_lost_found():
    if request.method == 'GET':
        try:
            response = supabase.table("lost_found").select("*").order("date_posted", desc=True).execute()
            return jsonify(response.data), 200
        except Exception:
            return jsonify([]), 200
    elif request.method == 'POST':
        data = request.json
        track_id = generate_tracking_id("LF")
        try:
            supabase.table("lost_found").insert({
                "tracking_id": track_id,
                "type": data.get('type'),
                "item_name": data.get('item_name'),
                "description": data.get('description')[:100],
                "location": data.get('location'),
                "contact": data.get('contact', '')
            }).execute()
            return jsonify({"success": True, "tracking_id": track_id}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/api/study_groups', methods=['GET', 'POST'])
def handle_study_groups():
    if request.method == 'GET':
        try:
            response = supabase.table("study_groups").select("*").order("date_posted", desc=True).execute()
            return jsonify(response.data), 200
        except Exception:
            return jsonify([]), 200
    elif request.method == 'POST':
        data = request.json
        track_id = generate_tracking_id("SG")
        try:
            supabase.table("study_groups").insert({
                "tracking_id": track_id,
                "subject": data.get('subject'),
                "topic": data.get('topic'),
                "looking_for": data.get('looking_for'),
                "grade": data.get('grade'),
                "preferred_time": data.get('preferred_time')
            }).execute()
            return jsonify({"success": True, "tracking_id": track_id}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/api/admin/ideas', methods=['GET'])
def admin_get_ideas():
    if not is_admin(): return jsonify({"error": "Unauthorized"}), 401
    try:
        res = supabase.table("ideas").select("*").order("created_at", desc=True).execute()
        return jsonify(res.data), 200
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/admin/ideas/<id>', methods=['PUT'])
def admin_update_idea(id):
    if not is_admin(): return jsonify({"error": "Unauthorized"}), 401
    status = request.json.get('status')
    try:
        supabase.table("ideas").update({"status": status}).eq("id", id).execute()
        return jsonify({"success": True}), 200
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/admin/lost_found/<id>', methods=['DELETE'])
def admin_delete_lf(id):
    if not is_admin(): return jsonify({"error": "Unauthorized"}), 401
    try:
        supabase.table("lost_found").delete().eq("id", id).execute()
        return jsonify({"success": True}), 200
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/admin/submissions/<table_name>/<id>', methods=['PUT'])
def admin_update_submission(table_name, id):
    if not is_admin(): return jsonify({"error": "Unauthorized"}), 401
    valid_tables = ["feedback", "ideas", "lost_found", "study_groups"]
    if table_name not in valid_tables: return jsonify({"error": "Invalid table"}), 400
    
    data = request.json
    update_data = {}
    
    # Mapping of tables to their verified columns based on current database state
    table_columns = {
        "feedback": ["status", "admin_response"],
        "ideas": ["status", "admin_response"],
        "lost_found": [],
        "study_groups": []
    }
    
    allowed_cols = table_columns.get(table_name, [])
    
    if 'status' in data and 'status' in allowed_cols: 
        update_data['status'] = data['status']
        
    if 'admin_response' in data and 'admin_response' in allowed_cols: 
        update_data['admin_response'] = data['admin_response']
        update_data['response_timestamp'] = datetime.utcnow().isoformat()
        
    if 'priority' in data and 'priority' in allowed_cols: 
        update_data['priority'] = data['priority']
    
    try:
        if update_data:
            supabase.table(table_name).update(update_data).eq("id", id).execute()
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/submissions/<table_name>/<id>', methods=['DELETE'])
def admin_delete_submission(table_name, id):
    if not is_admin(): return jsonify({"error": "Unauthorized"}), 401
    valid_tables = ["feedback", "ideas", "lost_found", "study_groups"]
    if table_name not in valid_tables: return jsonify({"error": "Invalid table"}), 400
    
    try:
        supabase.table(table_name).delete().eq("id", id).execute()
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/polls', methods=['GET', 'POST'])
def manage_polls():
    if request.method == 'GET':
        try:
            polls_res = supabase.table("polls").select("*").order("created_at", desc=True).execute()
            polls = polls_res.data
            options_res = supabase.table("poll_options").select("*").execute()
            options_by_poll = {}
            for opt in options_res.data:
                options_by_poll.setdefault(opt['poll_id'], []).append(opt)
            for p in polls:
                p['options'] = options_by_poll.get(p['id'], [])
            return jsonify(polls), 200
        except Exception as e: return jsonify({"error": str(e)}), 500
    elif request.method == 'POST':
        if not is_admin(): return jsonify({"error": "Unauthorized"}), 401
        data = request.json
        try:
            poll_res = supabase.table("polls").insert({
                "question": data.get("question"),
                "type": data.get("type"),
                "status": data.get("status", "Draft"),
                "start_date": data.get("start_date") or datetime.utcnow().isoformat(),
                "end_date": data.get("end_date")
            }).execute()
            poll_id = poll_res.data[0]['id']
            if 'options' in data and data['options']:
                opts = [{"poll_id": poll_id, "option_text": opt} for opt in data['options']]
                supabase.table("poll_options").insert(opts).execute()
            return jsonify({"success": True}), 200
        except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/admin/polls/<poll_id>', methods=['DELETE'])
def admin_delete_poll(poll_id):
    if not is_admin(): return jsonify({"error": "Unauthorized"}), 401
    try:
        supabase.table("poll_options").delete().eq("poll_id", poll_id).execute()
        supabase.table("polls").delete().eq("id", poll_id).execute()
        return jsonify({"success": True}), 200
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/polls/vote', methods=['POST'])
def vote_poll():
    data = request.json
    poll_type = data.get('poll_type')
    option_id = data.get('option_id')
    ranked_options = data.get('ranked_options')
    
    try:
        if poll_type in ['Yes-No', 'Opinion'] and option_id:
            res = supabase.table("poll_options").select("votes").eq("id", option_id).execute()
            if res.data:
                new_votes = res.data[0]['votes'] + 1
                supabase.table("poll_options").update({"votes": new_votes}).eq("id", option_id).execute()
        elif poll_type == 'Priority' and ranked_options:
            for rank_data in ranked_options:
                oid = rank_data['id']
                rank = rank_data['rank']
                res = supabase.table("poll_options").select("average_rank, votes").eq("id", oid).execute()
                if res.data:
                    current_avg = res.data[0]['average_rank']
                    votes = res.data[0]['votes']
                    new_avg = ((current_avg * votes) + rank) / (votes + 1)
                    supabase.table("poll_options").update({
                        "average_rank": new_avg,
                        "votes": votes + 1
                    }).eq("id", oid).execute()
        return jsonify({"success": True}), 200
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/tasks', methods=['GET', 'POST', 'PUT'])
def manage_tasks():
    if request.method == 'GET':
        try:
            tasks_res = supabase.table("tasks").select("*").order("created_at", desc=True).execute()
            tasks = tasks_res.data
            subtasks_res = supabase.table("subtasks").select("*").order("created_at", desc=False).execute()
            subtasks_by_task = {}
            for st in subtasks_res.data:
                subtasks_by_task.setdefault(st['task_id'], []).append(st)
            for t in tasks:
                t['subtasks'] = subtasks_by_task.get(t['id'], [])
            return jsonify(tasks), 200
        except Exception as e: return jsonify({"error": str(e)}), 500
    
    if not is_admin(): return jsonify({"error": "Unauthorized"}), 401
    
    if request.method == 'POST':
        data = request.json
        try:
            task_res = supabase.table("tasks").insert({
                "title": data.get("title"),
                "focus_area": data.get("focus_area"),
                "description": data.get("description"),
                "status": data.get("status", "Planned"),
                "priority": data.get("priority", "Medium"),
                "assignee": data.get("assignee"),
                "impact_statement": data.get("impact_statement")
            }).execute()
            task_id = task_res.data[0]['id']
            if 'subtasks' in data and data['subtasks']:
                sts = [{"task_id": task_id, "title": st} for st in data['subtasks']]
                supabase.table("subtasks").insert(sts).execute()
            return jsonify({"success": True}), 200
        except Exception as e: return jsonify({"error": str(e)}), 500
        
    elif request.method == 'PUT':
        data = request.json
        task_id = data.get('id')
        update_data = {k: v for k, v in data.items() if k in ['status', 'priority', 'assignee', 'impact_statement']}
        if update_data.get('status') == 'Completed':
            update_data['completed_at'] = datetime.utcnow().isoformat()
        try:
            if update_data:
                supabase.table("tasks").update(update_data).eq("id", task_id).execute()
            
            if 'subtasks' in data:
                for st in data['subtasks']:
                    if 'id' in st:
                        supabase.table("subtasks").update({"is_completed": st.get("is_completed", False)}).eq("id", st['id']).execute()
            return jsonify({"success": True}), 200
        except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/admin/tasks/<task_id>', methods=['DELETE'])
def admin_delete_task(task_id):
    if not is_admin(): return jsonify({"error": "Unauthorized"}), 401
    try:
        supabase.table("subtasks").delete().eq("task_id", task_id).execute()
        supabase.table("tasks").delete().eq("id", task_id).execute()
        return jsonify({"success": True}), 200
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/admin/tasks/<task_id>/subtasks', methods=['POST'])
def admin_add_subtask(task_id):
    if not is_admin(): return jsonify({"error": "Unauthorized"}), 401
    title = request.json.get('title')
    if not title: return jsonify({"error": "Title required"}), 400
    try:
        res = supabase.table("subtasks").insert({"task_id": task_id, "title": title, "is_completed": False}).execute()
        return jsonify(res.data[0]), 200
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/admin/tasks/<task_id>/details', methods=['PUT'])
def admin_update_task_details(task_id):
    if not is_admin(): return jsonify({"error": "Unauthorized"}), 401
    data = request.json
    update = {k: v for k, v in data.items() if k in ['title', 'focus_area', 'assignee', 'status']}
    try:
        supabase.table("tasks").update(update).eq("id", task_id).execute()
        return jsonify({"success": True}), 200
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/whitelist', methods=['GET'])
def get_whitelist():
    try:
        res = supabase.table("whitelist").select("token").execute()
        return jsonify([item['token'] for item in res.data]), 200
    except Exception:
        return jsonify([]), 200

@app.route('/api/filter_logs', methods=['POST'])
def post_filter_log():
    data = request.json
    try:
        supabase.table("filter_logs").insert(data).execute()
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/filter_logs', methods=['GET'])
def admin_get_filter_logs():
    if not is_admin(): return jsonify({"error": "Unauthorized"}), 401
    try:
        res = supabase.table("filter_logs").select("*").order("created_at", desc=True).execute()
        return jsonify(res.data), 200
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/admin/whitelist', methods=['POST'])
def admin_add_whitelist():
    if not is_admin(): return jsonify({"error": "Unauthorized"}), 401
    token = request.json.get('token')
    if not token: return jsonify({"error": "Token required"}), 400
    try:
        supabase.table("whitelist").insert({"token": token.lower()}).execute()
        return jsonify({"success": True}), 200
    except Exception as e: return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)

