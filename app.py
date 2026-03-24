from flask import Flask, render_template, jsonify
import pandas as pd
import os
import numpy as np

app = Flask(__name__)

# File Path Logic (Taaki file kahi bhi ho mil jaye)
possible_paths = [
    'web_app/data/final_decision_support_upgraded.csv',
    'final_decision_support_upgraded.csv',
    'data/final_decision_support_upgraded.csv'
]

DATA_FILE = None
for path in possible_paths:
    if os.path.exists(path):
        DATA_FILE = path
        break

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/data')
def get_data():
    try:
        if not DATA_FILE:
            return jsonify({"error": "CSV File nahi mili! Kripya check karein."})

        # 1. Load Data
        df = pd.read_csv(DATA_FILE)
        df = df.fillna(0) # Safety: Missing values ko 0 karo
        
        # 2. LEVEL 1 CALCULATION: State-wise Totals
        # Har state ka total load nikal rahe hain for the Big Chart
        state_summary = df.groupby('state')['total_bio'].sum().reset_index()
        state_summary = state_summary.sort_values(by='total_bio', ascending=False) # Top states pehle
        
        state_stats = {
            "names": state_summary['state'].tolist(),
            "loads": state_summary['total_bio'].tolist()
        }

        # 3. Overall Metrics
        metrics = {
            "total_load": int(df['total_bio'].sum()),
            "high_risk": int(len(df[df['alert_status'] == 'High Risk'])),
            "state_count": int(len(df['state'].unique()))
        }
        
        # 4. Send Everything to Frontend
        return jsonify({
            "map_data": df.to_dict(orient='records'), # Detailed Data
            "state_stats": state_stats,               # For India View Chart
            "metrics": metrics
        })
        
    except Exception as e:
        print(f"Server Error: {e}")
        return jsonify({"error": str(e)})

if __name__ == '__main__':
    app.run(debug=True, port=5000)