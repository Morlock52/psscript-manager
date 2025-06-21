import os
import logging
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS

try:
    import openai
except ImportError:  # pragma: no cover - graceful handling if package is missing
    openai = None

ENV_FILE = Path(os.getenv("ENV_FILE", Path(__file__).resolve().parents[2] / ".env"))


log_level = os.getenv("LOG_LEVEL", "INFO").upper()
log_file = os.getenv("LOG_FILE")

logging.basicConfig(
    level=getattr(logging, log_level, logging.INFO),
    filename=log_file,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# Simple in-memory counter for how many analyses have been performed
analysis_count = 0


def _update_env_file(updates: dict) -> None:
    """Update key-value pairs in the ENV_FILE if it exists."""
    try:
        if not ENV_FILE.exists():
            ENV_FILE.write_text("")
        lines = ENV_FILE.read_text().splitlines()
        mapping = {line.split('=', 1)[0]: i for i, line in enumerate(lines) if '=' in line}
        for key, value in updates.items():
            new_line = f"{key}={value}"
            if key in mapping:
                lines[mapping[key]] = new_line
            else:
                lines.append(new_line)
        ENV_FILE.write_text("\n".join(lines) + "\n")
    except Exception:
        logger.warning("Failed to update %s", ENV_FILE)


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
            "Analyze the following PowerShell script. Summarize its purpose, "
            "list the key cmdlets with a short definition and example usage, "
            "and include the Microsoft Learn URL for each when possible. "
            "Identify any potential issues:\n\n" + script
        )
        global analysis_count
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
            analysis_count += 1
            logger.info("Analysis completed successfully")
            return jsonify(analysis=analysis)
        except Exception as exc:
            logger.exception("Error during analysis")
            return jsonify(error=str(exc)), 500

    @app.route("/models", methods=["GET"])
    def list_models():
        """Return available OpenAI model IDs."""
        if openai is None:
            logger.error("OpenAI package is not installed")
            return jsonify(error="OpenAI package not installed"), 500
        if not openai.api_key:
            logger.error("OPENAI_API_KEY is not configured")
            return jsonify(error="OPENAI_API_KEY not set"), 500
        try:
            resp = openai.Model.list()
            models = [m["id"] for m in resp.get("data", [])]
            return jsonify(models=models), 200
        except Exception as exc:
            logger.exception("Error fetching models")
            return jsonify(error=str(exc)), 500

    @app.route("/config", methods=["POST"])
    def update_config():
        """Update API key and model configuration."""
        nonlocal model
        data = request.get_json() or {}
        key = data.get("api_key")
        new_model = data.get("model")
        updates = {}
        if key:
            if openai is not None:
                openai.api_key = key
            os.environ["OPENAI_API_KEY"] = key
            updates["OPENAI_API_KEY"] = key
        if new_model:
            model = new_model
            os.environ["OPENAI_MODEL"] = new_model
            updates["OPENAI_MODEL"] = new_model
        if updates:
            _update_env_file(updates)
        return jsonify(status="ok", model=model), 200

    static_dir = Path(__file__).parent / "static"

    @app.route("/stats", methods=["GET"])
    def stats() -> jsonify:
        """Return simple usage statistics."""
        return jsonify(analysis_count=analysis_count)

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
