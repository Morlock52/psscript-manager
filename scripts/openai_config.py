#!/usr/bin/env python3
"""Utility to update OpenAI API settings in the .env file."""
import os
import sys
from pathlib import Path

try:
    import openai
except ImportError:  # pragma: no cover - optional dependency
    openai = None

ENV_FILE = Path('.env')


def update_env(key: str, value: str) -> None:
    lines = []
    if ENV_FILE.exists():
        lines = ENV_FILE.read_text().splitlines()
    mapping = {line.split('=', 1)[0]: i for i, line in enumerate(lines) if '=' in line}
    new_line = f"{key}={value}"
    if key in mapping:
        lines[mapping[key]] = new_line
    else:
        lines.append(new_line)
    ENV_FILE.write_text("\n".join(lines) + "\n")


def list_models(api_key: str):
    if openai is None:
        print("openai package is not installed", file=sys.stderr)
        return []
    openai.api_key = api_key
    try:
        resp = openai.Model.list()
        return [m['id'] for m in resp.get('data', [])]
    except Exception as exc:  # pragma: no cover - runtime dependency
        print(f"Error fetching models: {exc}", file=sys.stderr)
        return []


def main() -> None:
    api_key = input("Enter OpenAI API key: ").strip()
    if not api_key:
        print("API key is required")
        return
    update_env('OPENAI_API_KEY', api_key)
    models = list_models(api_key)
    if not models:
        print("No models retrieved.")
        return
    print("Available models:")
    for i, m in enumerate(models, 1):
        print(f"{i}. {m}")
    choice = input("Select model number: ").strip()
    try:
        idx = int(choice) - 1
        model = models[idx]
    except Exception:
        print("Invalid selection")
        return
    update_env('OPENAI_MODEL', model)
    print(f"Saved OPENAI_MODEL={model} in {ENV_FILE}")


if __name__ == '__main__':
    main()
