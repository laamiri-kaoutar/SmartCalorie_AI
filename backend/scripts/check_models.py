from __future__ import annotations

import google.generativeai as genai

from core.config import settings


def main() -> None:
    """List available Gemini models with their supported generation methods."""
    if not settings.GOOGLE_API_KEY:
        print("ERROR: GOOGLE_API_KEY is not set in environment / settings.")
        return

    genai.configure(api_key=settings.GOOGLE_API_KEY)

    print("Listing available Gemini models:")
    print("--------------------------------")
    for model in genai.list_models():
        name = getattr(model, "name", "<unknown>")
        methods = getattr(model, "supported_generation_methods", [])
        print(f"Model: {name}")
        print(f"  supported_generation_methods: {list(methods)}")
        print()


if __name__ == "__main__":
    main()

