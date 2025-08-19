from flask import Flask, render_template, jsonify
import json

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/players')
def get_players():
    with open('players.json', 'r') as file:
        players = json.load(file)
    return jsonify(players)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)