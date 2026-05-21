-- ─────────────────────────────────────────────
-- VIEW 1: Best lap per driver per session
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW v_best_laps AS
SELECT
    l.session_id,
    l.driver_id,
    d.full_name,
    d.team,
    MIN(l.lap_time)                          AS best_lap_time,
    MIN(l.sector1_time)                      AS best_s1,
    MIN(l.sector2_time)                      AS best_s2,
    MIN(l.sector3_time)                      AS best_s3,
    MIN(l.sector1_time) +
        MIN(l.sector2_time) +
        MIN(l.sector3_time)                  AS theoretical_best
FROM laps l
JOIN drivers d ON l.driver_id = d.driver_id
WHERE l.is_valid = TRUE
GROUP BY l.session_id, l.driver_id, d.full_name, d.team;

-- ─────────────────────────────────────────────
-- VIEW 2: Lap-by-lap race pace per driver
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW v_race_pace AS
SELECT
    l.session_id,
    l.driver_id,
    d.full_name,
    d.team,
    l.lap_number,
    l.lap_time,
    l.compound,
    l.tyre_age,
    l.stint_number,
    AVG(l.lap_time) OVER (
        PARTITION BY l.session_id, l.driver_id
        ORDER BY l.lap_number
        ROWS BETWEEN 2 PRECEDING AND 2 FOLLOWING
    )                                        AS rolling_avg_5,
    l.lap_time - MIN(l.lap_time) OVER (
        PARTITION BY l.session_id
    )                                        AS delta_to_fastest
FROM laps l
JOIN drivers d ON l.driver_id = d.driver_id
WHERE l.is_valid = TRUE;

-- ─────────────────────────────────────────────
-- VIEW 3: Tyre degradation (pace loss per lap on compound)
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW v_tyre_degradation AS
SELECT
    l.session_id,
    l.driver_id,
    l.compound,
    l.stint_number,
    l.tyre_age,
    l.lap_time,
    l.lap_time - FIRST_VALUE(l.lap_time) OVER (
        PARTITION BY l.session_id, l.driver_id, l.stint_number
        ORDER BY l.tyre_age
    )                                        AS deg_from_new,
    REGR_SLOPE(l.lap_time, l.tyre_age) OVER (
        PARTITION BY l.session_id, l.driver_id, l.stint_number
    )                                        AS deg_rate_per_lap
FROM laps l
WHERE l.is_valid = TRUE AND l.tyre_age > 0;

-- ─────────────────────────────────────────────
-- VIEW 4: Sector comparison across drivers
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW v_sector_comparison AS
SELECT
    l.session_id,
    l.driver_id,
    d.full_name,
    d.team,
    l.lap_number,
    l.sector1_time                           AS s1,
    l.sector2_time                           AS s2,
    l.sector3_time                           AS s3,
    l.sector1_time - MIN(l.sector1_time) OVER (PARTITION BY l.session_id) AS s1_delta,
    l.sector2_time - MIN(l.sector2_time) OVER (PARTITION BY l.session_id) AS s2_delta,
    l.sector3_time - MIN(l.sector3_time) OVER (PARTITION BY l.session_id) AS s3_delta
FROM laps l
JOIN drivers d ON l.driver_id = d.driver_id
WHERE l.sector1_time IS NOT NULL
  AND l.sector2_time IS NOT NULL
  AND l.sector3_time IS NOT NULL;

-- ─────────────────────────────────────────────
-- VIEW 5: Pit stop analysis
-- ─────────────────────────────────────────────
-- pit_in_time is on lap N, pit_out_time on lap N+1.
-- (The S/F line is before pit exit, so the lap counter increments
--  while the car is still in the pit lane.)
--
-- DISTINCT ON (session_id, driver_id, lap_number) collapses any
-- duplicate laps rows that result from repeated ingestion runs,
-- always keeping the first matching out-lap row.
CREATE OR REPLACE VIEW v_pit_stops AS
SELECT DISTINCT ON (l_in.session_id, l_in.driver_id, l_in.lap_number)
    l_in.session_id,
    l_in.driver_id,
    d.full_name,
    l_in.lap_number                                              AS pit_lap,
    CASE
        WHEN l_out.pit_out_time IS NOT NULL
         AND l_out.pit_out_time > l_in.pit_in_time
        THEN ROUND((l_out.pit_out_time - l_in.pit_in_time)::numeric, 2)
    END                                                          AS pit_duration,
    l_out.compound                                               AS compound_after,
    l_out.stint_number
FROM laps l_in
JOIN laps l_out
  ON  l_out.session_id = l_in.session_id
  AND l_out.driver_id  = l_in.driver_id
  AND l_out.lap_number = l_in.lap_number + 1
  AND l_out.pit_out_time IS NOT NULL
JOIN drivers d ON d.driver_id = l_in.driver_id
WHERE l_in.pit_in_time IS NOT NULL
ORDER BY l_in.session_id, l_in.driver_id, l_in.lap_number;