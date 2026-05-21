"""
RaceOS — Ingest an entire Formula 1 season into the database.

Usage:
    python ingest_season.py <year>

Examples:
    python ingest_season.py 2024
    python ingest_season.py 2023
"""
import sys

import fastf1


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        print("Error: Please provide a year as an argument.")
        sys.exit(1)

    try:
        year = int(sys.argv[1])
    except ValueError:
        print("Error: year must be an integer.")
        sys.exit(1)

    # ── Fetch event schedule ──────────────────────────────────
    print(f"\n{'='*60}")
    print(f"  RaceOS Season Ingestion — {year}")
    print(f"{'='*60}")

    schedule = fastf1.get_event_schedule(year, include_testing=False)
    rounds = schedule[schedule["RoundNumber"] > 0].sort_values("RoundNumber")
    total = len(rounds)

    print(f"  Found {total} race rounds\n")

    # ── Iterate over every round ──────────────────────────────
    from app.ingestion.fastf1_loader import load_session

    succeeded = 0
    failed = 0

    for _, event in rounds.iterrows():
        round_number = int(event["RoundNumber"])
        event_name = event["EventName"]

        print(f"\n{'─'*60}")
        print(f"  [{round_number}/{total}]  {event_name}")
        print(f"{'─'*60}")

        try:
            load_session(year=year, round_number=round_number, session_type="R")
            print(f"  ✅ {event_name} — ingested successfully")
            succeeded += 1
        except Exception as e:
            print(f"  ❌ {event_name} — failed: {e}")
            failed += 1

    # ── Final summary ─────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"  Season {year} Ingestion Complete")
    print(f"  Total: {total}  |  ✅ Succeeded: {succeeded}  |  ❌ Failed: {failed}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
