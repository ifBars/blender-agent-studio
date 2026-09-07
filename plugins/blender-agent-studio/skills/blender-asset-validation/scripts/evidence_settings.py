"""Scale-independent settings for the standardized evidence studio.

Area-light energy is total power: scaling its size and distance by s requires
power to scale by s squared to preserve illumination on similar geometry.
"""
import math

EVIDENCE_SETTINGS_VERSION = 2


def resolve_presentation(requested: str, subject_luminance: float | None = None) -> str:
    if requested not in ("auto", "neutral", "dark", "light"):
        raise ValueError(f"Unknown presentation: {requested}")
    if requested != "auto":
        return requested
    if subject_luminance is not None and math.isfinite(subject_luminance):
        if subject_luminance > 0.55:
            return "dark"
        if subject_luminance < 0.045:
            return "light"
    return "neutral"


def studio_settings(extent: float, diagnostic: bool = False, presentation: str = "neutral") -> dict:
    if not math.isfinite(extent) or extent <= 0:
        raise ValueError("Evidence extent must be finite and positive")
    if presentation not in ("neutral", "dark", "light"):
        raise ValueError("Resolve automatic presentation before configuring the studio")
    powers = (140.0, 65.0, 110.0) if diagnostic else (400.0, 160.0, 600.0)
    floor_colors = {
        "neutral": (0.025, 0.032, 0.045, 1.0),
        "dark": (0.009, 0.012, 0.018, 1.0),
        "light": (0.32, 0.34, 0.36, 1.0),
    }
    return {
        "presentation": presentation,
        "floor_color": floor_colors[presentation],
        "light_powers": [power * extent ** 2 for power in powers],
        "camera_distance": extent * 2.3,
        "ortho_scale": extent * 1.45,
        "floor_size": extent * 200.0,
        "floor_offset": extent * 0.006,
        "clip_start": extent * 0.001,
        "clip_end": extent * 1000.0,
    }
