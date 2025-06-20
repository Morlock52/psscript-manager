import os
import logging
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS

try:
    import openai
except ImportError:  # pragma: no cover - graceful handling if package is missing
    openai = None


log_level = os.getenv("LOG_LEVEL", "INFO").upper()
log_file = os.getenv("LOG_FILE")

logging.basicConfig(
    level=getattr(logging, log_level, logging.INFO),
    filename=log_file,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)

    model = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if openai is not None:
        openai.api_key = openai_api_key
    if not openai_api_key:
        logger.warning("OPENAI_API_KEY environment variable is not set")

    @app.route("/health", methods=["GET"])
    def health() -> jsonify:
        logger.debug("/health check")
        return jsonify(status="ok")

    @app.route("/analyze", methods=["POST"])
    def analyze():
        logger.info("/analyze request received")
        if openai is None:
            logger.error("OpenAI package is not installed")
            return jsonify(error="OpenAI package not installed"), 500

        if not openai.api_key:
            logger.error("OPENAI_API_KEY is not configured")
            return jsonify(error="OPENAI_API_KEY not set"), 500

        data = request.get_json() or {}
        script = data.get("script")
        if not script:
            logger.warning("Missing 'script' in request body")
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
            logger.info("Analysis completed successfully")
            return jsonify(analysis=analysis)
        except Exception as exc:
            logger.exception("Error during analysis")
            return jsonify(error=str(exc)), 500

    static_dir = Path(__file__).parent / "static"

    @app.route("/dashboard", methods=["GET"])
    def dashboard():
        html_path = static_dir / "dashboard.html"
        if html_path.exists():
            return html_path.read_text(), 200, {"Content-Type": "text/html"}
        return "<p>Dashboard not found</p>", 404, {"Content-Type": "text/html"}

    logger.info("Flask application created")
    return app


if __name__ == "__main__":
    app = create_app()
    logger.info("Starting Flask server")
    app.run(host="0.0.0.0", port=5000)
