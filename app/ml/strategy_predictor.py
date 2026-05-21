# app/ml/strategy_predictor.py
import numpy as np

COMPOUND_ORDER   = ["SOFT", "MEDIUM", "HARD"]
COMPOUND_LIFE    = {"SOFT": 25, "MEDIUM": 35, "HARD": 45}
COMPOUND_DELTA   = {"SOFT": -1.2, "MEDIUM": 0.0, "HARD": +0.8}
TYPICAL_PIT_LOSS = 22.0


def _fit_degradation(laps_data: list[dict], compound: str) -> tuple[float, float]:
    pts = [
        (r["tyre_age"], r["lap_time"])
        for r in laps_data
        if str(r.get("compound", "")).upper() == compound
        and r.get("lap_time") and r.get("tyre_age") is not None
        and r.get("is_valid")
    ]
    if len(pts) < 5:
        return (90.0 + COMPOUND_DELTA.get(compound, 0), 0.08)
    ages  = np.array([p[0] for p in pts])
    times = np.array([p[1] for p in pts])
    deg, base = np.polyfit(ages, times, 1)
    return (float(base), float(max(deg, 0.0)))


def predict_strategy(
    current_lap:      int,
    total_laps:       int,
    current_compound: str,
    tyre_age:         int,
    laps_data:        list[dict],
) -> dict:
    current_compound = current_compound.upper()
    deg_curves = {c: _fit_degradation(laps_data, c) for c in COMPOUND_ORDER}

    strategies = []
    for new_compound in COMPOUND_ORDER:
        for pit_lap in range(current_lap + 3, total_laps - 5):
            base_c, deg_c = deg_curves.get(current_compound, (90.0, 0.08))
            cost_before = sum(
                base_c + deg_c * (tyre_age + i)
                for i in range(pit_lap - current_lap)
            )
            base_n, deg_n = deg_curves.get(new_compound, (90.0, 0.08))
            laps_after = total_laps - pit_lap
            cost_after = sum(base_n + deg_n * i for i in range(laps_after))

            total_cost = cost_before + cost_after + TYPICAL_PIT_LOSS
            strategies.append({
                "pit_lap":     pit_lap,
                "compound":    new_compound,
                "total_cost":  total_cost,
                "laps_on_new": laps_after,
            })

    if not strategies:
        return {"error": "Insufficient data to compute strategy"}

    best = min(strategies, key=lambda x: x["total_cost"])
    window_open  = max(current_lap + 1, best["pit_lap"] - 3)
    window_close = min(total_laps - 3,  best["pit_lap"] + 3)
    cliff_lap    = current_lap + max(
        1, int((COMPOUND_LIFE.get(current_compound, 35) - tyre_age) * 0.85)
    )

    return {
        "recommended_pit_lap":    best["pit_lap"],
        "pit_window_open":        window_open,
        "pit_window_close":       window_close,
        "recommended_compound":   best["compound"],
        "estimated_cost_seconds": round(best["total_cost"], 1),
        "tyre_cliff_lap":         cliff_lap,
        "degradation_curves": {
            c: {"base_time": round(b, 3), "deg_per_lap": round(d, 4)}
            for c, (b, d) in deg_curves.items()
        },
    }