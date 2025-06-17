from flask import Flask, request, make_response
import subprocess
import os
import threading

app = Flask(__name__)

SRC_DIR = './src'
os.makedirs(SRC_DIR, exist_ok=True)

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS'
    return response

@app.route('/start_server', methods=['GET'])
def check_server():
    return 'Server is running', 200


@app.route('/compile_run', methods=['POST', 'OPTIONS'])
def compile_and_run():
    if request.method == 'OPTIONS':
        return '', 204

    data = request.get_json()
    code = data.get('code', '')
    compile_flags = data.get('flags', '')  # ← добавлено

    source_file = os.path.join(SRC_DIR, "main.c")
    binary_file = os.path.join(SRC_DIR, "main")

    # Записываем исходник
    with open(source_file, "w") as f:
        f.write(code)

    try:
        # Компиляция
        compile_cmd = ["gcc", source_file, "-o", binary_file]
        if compile_flags.strip():  # Если переданы флаги
            compile_cmd.extend(compile_flags.strip().split())

        compile_result = subprocess.run(
            compile_cmd,
            capture_output=True,
            text=True,
            timeout=5
        )
        if compile_result.returncode != 0:
            return make_response("Ошибка компиляции:\n" + compile_result.stderr, 200)

        # Запуск
        run_result = subprocess.run(
            [binary_file],
            capture_output=True,
            text=True,
            timeout=5
        )
        output = run_result.stdout + run_result.stderr
        return make_response(output, 200)

    except subprocess.TimeoutExpired:
        return make_response("Ошибка: превышено время выполнения", 200)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8765)

