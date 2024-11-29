from flask import Flask, jsonify
from flask_cors import CORS

# Initialize Flask app
app = Flask(__name__)

# Enable CORS for all routes
CORS(app)

# Sample hello world route
@app.route('/', methods=['GET'])
def hello_world():
    return jsonify({
        "message": "Hello from Flask Backend!",
        "status": "success"
    })

# Run the application
if __name__ == '__main__':
    app.run(host='localhost', port=5000, debug=True)