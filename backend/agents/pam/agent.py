from .onboarding import handle_onboarding


def run_flow(flow_name: str, data: dict) -> str:
    """Route flow requests."""
    if flow_name == "onboarding_welcome":
        return handle_onboarding(data)
    return "Unknown flow"
