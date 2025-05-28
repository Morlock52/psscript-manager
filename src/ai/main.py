import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import openai


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)

    openai.api_key = os.getenv("OPENAI_API_KEY")
    model = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")

    @app.route("/health", methods=["GET"])
    def health() -> jsonify:
        return jsonify(status="ok")

    @app.route("/analyze", methods=["POST"])
    def analyze():
        data = request.get_json() or {}
        script = data.get("script")
        if not script:
            return jsonify(error="Missing 'script' in request"), 400

        prompt = (
            "Analyze the following PowerShell script and summarize its purpose. "
            "Also identify any potential issues:\n\n" + script
        )
        try:
            response = openai.ChatCompletion.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert PowerShell assistant.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
            )
            analysis = response.choices[0].message["content"].strip()
            return jsonify(analysis=analysis)
        except Exception as exc:
            return jsonify(error=str(exc)), 500

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000)
