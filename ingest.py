"""
RaceOS — Ingest a Formula 1 session into the database.

Usage:
    python ingest.py <year> <round_number>

Examples:
    python ingest.py 2024 1      # 2024 Bahrain GP
    python ingest.py 2023 5      # 2023 Miami GP
"""
import sys


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        print("Error: Please provide year and round_number as arguments.")
        sys.exit(1)

    try:
        year = int(sys.argv[1])
        round_number = int(sys.argv[2])
    except ValueError:
        print("Error: year and round_number must be integers.")
        sys.exit(1)

    print(f"\n{'='*50}")
    print(f"  RaceOS Ingestion")
    print(f"  Year: {year}  |  Round: {round_number}")
    print(f"{'='*50}")

    from app.ingestion.fastf1_loader import load_session

    try:
        load_session(year=year, round_number=round_number, session_type="R")
        print(f"\n✓ Ingestion complete for {year} Round {round_number}.")
    except Exception as e:
        print(f"\n✕ Ingestion failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
