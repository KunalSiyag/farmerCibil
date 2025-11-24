from flask import Flask, jsonify, request
import random
import sqlite3
import time

app = Flask(__name__)

# Database Setup
DB_FILE = "sensor_data.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS sensor_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            soil_moisture REAL,
            temperature REAL,
            humidity REAL,
            light_intensity INTEGER,
            timestamp INTEGER
        )
    """)
    conn.commit()
    conn.close()

init_db()

# Function to generate random sensor data
def generate_sensor_data():
    return {
        "soil_moisture": round(random.uniform(20, 80), 2),
        "temperature": round(random.uniform(20, 35), 1),
        "humidity": random.randint(30, 80),
        "light_intensity": random.choice([0, 200, 1000, 12000]),
        "timestamp": int(time.time())
    }

# Store data in SQLite
def store_sensor_data(data):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("""
        INSERT INTO sensor_data (soil_moisture, temperature, humidity, light_intensity, timestamp)
        VALUES (?, ?, ?, ?, ?)
    """, (data["soil_moisture"], data["temperature"], data["humidity"], data["light_intensity"], data["timestamp"]))
    conn.commit()
    conn.close()

# Endpoint: Get real-time sensor data
@app.route('/realtime', methods=['GET'])
def get_realtime_data():
    data = generate_sensor_data()
    store_sensor_data(data)
    return jsonify(data)

# Endpoint: Get trend analysis (last N entries)
@app.route('/trend', methods=['GET'])
def get_trend_data():
    limit = int(request.args.get('limit', 50))  # Default: last 50 entries
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT soil_moisture, temperature, humidity, light_intensity, timestamp FROM sensor_data ORDER BY timestamp DESC LIMIT ?", (limit,))
    rows = c.fetchall()
    conn.close()
    
    trend_data = [{"soil_moisture": r[0], "temperature": r[1], "humidity": r[2], "light_intensity": r[3], "timestamp": r[4]} for r in rows]
    
    return jsonify(trend_data)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
