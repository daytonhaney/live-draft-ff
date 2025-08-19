from flask import Flask, render_template
import json

app = Flask(__name__)

@app.route('/')
def index():
    with open('players.json', 'r') as file:
        players = json.load(file)
    return render_template('index.html', players=players)

if __name__ == '__main__':
    app.run(debug=True)
