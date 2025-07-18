"""Simple configuration management utility."""
import json
import argparse
from pathlib import Path

CONFIG_DIR = Path(__file__).resolve().parent / "environments"
ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


def apply_environment(env_name: str) -> None:
    """Write the selected environment configuration to the project .env."""
    env_path = CONFIG_DIR / f"{env_name}.json"
    if not env_path.exists():
        raise SystemExit(f"Unknown environment: {env_name}")
    data = json.loads(env_path.read_text())
    lines = [f"{k}={v}" for k, v in data.items()]
    ENV_FILE.write_text("\n".join(lines) + "\n")
    print(f"Applied configuration: {env_name}")


def show_environments() -> None:
    envs = [p.stem for p in CONFIG_DIR.glob("*.json")]
    print("Available environments:", ", ".join(sorted(envs)))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Manage project configuration")
    sub = parser.add_subparsers(dest="command")

    apply_p = sub.add_parser("apply", help="Apply an environment configuration")
    apply_p.add_argument("env")

    sub.add_parser("list", help="List available environments")

    args = parser.parse_args()

    if args.command == "apply":
        apply_environment(args.env)
    else:
        show_environments()
