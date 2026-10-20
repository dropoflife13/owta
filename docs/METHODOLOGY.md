# OWTA: Water Delivery Index Methodology
## Mathematical Specification & Computational Framework

**Document Code:** OWTA-METH-V1  
**Methodology Version:** 1.0 (Standard Weekly Epoch)  
**Status:** Approved for Implementation  
**Oversight:** Independent Auditor & Public Governance

---

## 1. Overview and Core Purpose

The **Iloilo Water Delivery Index ($I$)** provides a standardized, objective, and mathematically reproducible metric evaluating the reliability of municipal piped water distribution across Iloilo City. It quantifies the proportion of promised rotational water supply hours during which water was actually delivered to consumers at or above standard tap-level distribution pressure.

By measuring performance against published commitments, the index removes subjective disputes, establishes empirical benchmarks for utility accountability, and guides municipal water security planning.

---

## 2. 10-Step Mathematical Specification

The calculation of the weekly Delivery Index executes deterministically across ten sequential steps.

```
+-----------------------------------------------------------------------------------+
| Step 1: Define Weekly Evaluation Window (W: 168 hours, Monday 00:00 - Sunday 23:59)|
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| Step 2: Establish Spatial Boundaries (District Metered Area / Barangay Mapping)  |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| Step 3: Compute Total Promised Supply Hours (H_promised) from Published Schedules |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| Step 4: Ingest and Filter Pressure Readings (Exclude is_simulated, Bound 0-25 PSI)|
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| Step 5: Discretize Time into Uniform 15-Minute Epochs (delta_t = 0.25 hrs, N=672) |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| Step 6: Evaluate Pressure Threshold (P_k >= 7.0 PSI = "Held Pressure")            |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| Step 7: Calculate Verified Delivered Supply Hours (H_delivered)                    |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| Step 8: Compute Data Coverage Ratio (C = N_observed / N_expected)                 |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| Step 9: Enforce Coverage Floor (If C < 0.70 => Status: "DATA_DEFICIENT", No Score)|
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼ (If C >= 0.70)
+-----------------------------------------------------------------------------------+
| Step 10: Compute Delivery Index Score (I = min(1.0, H_delivered / H_promised))    |
+-----------------------------------------------------------------------------------+
```

---

### Step 1: Evaluation Window Definition ($W$)
The standard evaluation window $W$ spans exactly one standard calendar week, beginning Monday at 00:00:00 Philippine Standard Time (PHT, UTC+8) and concluding Sunday at 23:59:59 PHT.
$$\text{Total Window Duration } T = 7 \text{ days} \times 24 \text{ hours} = 168.0 \text{ hours}$$

### Step 2: Spatial Unit of Analysis ($S$)
The index is calculated independently for each **District Metered Area (DMA)** $d \in D$. Barangay-level indices $b \in B$ are derived as area-weighted aggregations of the overlapping DMAs:
$$I_b = \sum_{d \in D} \left( I_d \times \omega_{b,d} \right)$$
where $\omega_{b,d}$ is the geographic overlap proportion of barangay $b$ serviced by DMA $d$, such that $\sum_{d} \omega_{b,d} = 1.0$.

### Step 3: Promised Supply Hours ($H_{\text{promised}}$)
Let $\mathcal{S}_d$ represent the set of active, non-superseded schedule intervals published for DMA $d$ during window $W$. For any published schedule interval $[t_{\text{start}}, t_{\text{end}}]$:
$$H_{\text{promised}}(d) = \sum_{s \in \mathcal{S}_d} \frac{\min(t_{\text{end}}, W_{\text{end}}) - \max(t_{\text{start}}, W_{\text{start}})}{3600 \text{ seconds}}$$
*Note:* If a schedule was superseded per Rule `WR02`, only the effective replacement schedule active at that timestamp contributes to $H_{\text{promised}}$.

### Step 4: Pressure Reading Normalization & Strict Filtering
Raw telemetry readings $r = (t, P, \text{source}, \text{is\_simulated})$ are ingested and passed through strict integrity filters:
1. **Simulation Exclusion (`WR12`):** Any reading where $\text{is\_simulated} = \text{TRUE}$ is dropped:
   $$\mathcal{R}_{\text{valid}} = \{ r \in \mathcal{R} \mid r.\text{is\_simulated} = \text{FALSE} \}$$
2. **Hydraulic Range Check (`WR03`):** Readings must be bounded by physical limits:
   $$0.0 \text{ PSI} \le r.P \le 25.0 \text{ PSI}$$
   Readings outside this boundary are logged as sensor anomalies and excluded.

### Step 5: Temporal Discretization into Epochs
The evaluation window $W$ is discretized into uniform 15-minute time slices ($\Delta t = 0.25 \text{ hours}$):
$$\text{Total Expected Epochs } N_{\text{expected}} = \frac{168 \text{ hours}}{0.25 \text{ hours/epoch}} = 672 \text{ epochs}$$
For each epoch $k \in \{1, 2, \dots, 672\}$, the representative pressure $P_k$ is the median of all valid readings recorded within $[t_k, t_k + \Delta t)$. If no readings exist in epoch $k$, $P_k = \text{NULL}$.

### Step 6: Held Pressure Criteria ($P_{\text{threshold}}$)
To qualify as delivering usable water to household ground-floor taps, gauge pressure must meet or exceed the minimum distribution threshold:
$$P_{\text{threshold}} = 7.0 \text{ PSI} \quad (\approx 0.48 \text{ bar} \approx 4.9 \text{ m head})$$
An epoch $k$ is designated as having **Held Pressure** ($H_k = 1$) if:
$$H_k = \begin{cases} 1 & \text{if } P_k \ge P_{\text{threshold}} \\ 0 & \text{if } P_k < P_{\text{threshold}} \text{ or } P_k \text{ is NULL} \end{cases}$$

### Step 7: Verified Delivered Supply Hours ($H_{\text{delivered}}$)
Delivered moments only credit the utility when they occur **during a published promised supply window**:
$$H_{\text{delivered}}(d) = \sum_{k=1}^{672} \left( H_k \times \mathbb{I}(k \in \mathcal{S}_d) \times \Delta t \right)$$
where $\mathbb{I}(k \in \mathcal{S}_d)$ is an indicator function returning $1$ if epoch $k$ falls within a published schedule window for DMA $d$, and $0$ otherwise.
*Off-Schedule Supply:* If water pressure is held outside scheduled hours, it is recorded in operational metrics as "Unscheduled Supply" but does not inflate the core Delivery Index.

### Step 8: Data Coverage Ratio ($C$)
To ensure the integrity of the score and protect against statistical manipulation from sparse data, the Data Coverage Ratio $C$ is computed:
$$C(d) = \frac{N_{\text{observed}}(d)}{N_{\text{promised\_epochs}}(d)}$$
where:
* $N_{\text{promised\_epochs}}(d) = \frac{H_{\text{promised}}(d)}{\Delta t}$ is the number of epochs expected to have supply.
* $N_{\text{observed}}(d)$ is the number of promised epochs containing at least one valid, verified pressure reading.

### Step 9: Minimum Data Coverage Floor ($C_{\text{min}} = 70\%$)
The platform enforces a strict data sufficiency floor:
$$C_{\text{min}} = 0.70 \quad (70\% \text{ coverage})$$
* **Rule:** If $C(d) < C_{\text{min}}$, the Delivery Index score $I(d)$ is marked as `DATA_DEFICIENT` ($I(d) = \text{NULL}$).
* **Integrity Guarantee:** A DMA cannot receive an official rating unless at least 70% of its promised hours have verified empirical measurements. This prevents utilities from claiming 100% compliance based on a single 15-minute test.

### Step 10: Final Delivery Index Score ($I$) & Tier Classification
When $C(d) \ge 0.70$, the final index score is calculated:
$$I(d) = \min\left(1.0, \frac{H_{\text{delivered}}(d)}{H_{\text{promised}}(d)}\right) \times 100\%$$

#### Qualitative Performance Tiers

| Index Range | Status Tier | Description & Operational Implication |
| :--- | :--- | :--- |
| **$90.0\% - 100.0\%$** | `Tier 1: Exemplary` | High-fidelity supply. Rotational promises honored with reliable pressure. |
| **$75.0\% - 89.9\%$** | `Tier 2: Satisfactory` | Acceptable service. Minor delays or intermittent pressure drops at window edges. |
| **$50.0\% - 74.9\%$** | `Tier 3: Degraded` | Significant shortfall. Consumers experience dry taps during $>25\%$ of scheduled time. |
| **Below $50.0\%$** | `Tier 4: Critical Deficit` | Severe service failure. Immediate LGU relief mobilization and regulatory review triggered. |
| **$C < 70\%$** | `Data Deficient` | Insufficient telemetry. Score withheld pending audit. |

---

## 3. Concrete Calculation Walkthrough

### Scenario: DMA 04 (Jaro West)
* **Evaluation Period:** Oct 13, 2026 00:00 to Oct 19, 2026 23:59 (168 hours).
* **Published Schedule:** 6 hours per day $\times$ 7 days = $42.0 \text{ promised hours}$ ($N_{\text{promised\_epochs}} = 168 \text{ epochs}$).
* **Recorded Telemetry:**
  * 140 of the 168 promised epochs have verified pressure readings.
  * $N_{\text{observed}} = 140$.
  * Coverage Ratio $C = \frac{140}{168} = 0.8333$ ($83.33\%$).
  * Since $83.33\% \ge 70.0\%$, the data floor is satisfied.
* **Pressure Performance:**
  * Of the 140 observed epochs, 112 epochs logged median pressure $P_k \ge 7.0 \text{ PSI}$.
  * 28 epochs logged pressure $P_k < 7.0 \text{ PSI}$ (e.g., trickle flow at $3.2 \text{ PSI}$ or dry tap at $0.0 \text{ PSI}$).
  * Verified Delivered Hours $H_{\text{delivered}} = 112 \times 0.25 \text{ hrs} = 28.0 \text{ hours}$.
* **Index Computation:**
  $$I = \frac{28.0 \text{ delivered hours}}{42.0 \text{ promised hours}} \times 100\% = 66.67\%$$
* **Result:** **$66.7\%$ — Tier 3: Degraded Supply**.

---

## 4. SQL Implementation Logic

The following PostgreSQL function structure illustrates the exact computational logic executed weekly by the database worker:

```sql
CREATE OR REPLACE FUNCTION compute_weekly_delivery_index(
    p_dma_id UUID,
    p_window_start TIMESTAMPTZ,
    p_window_end TIMESTAMPTZ
)
RETURNS TABLE (
    promised_hours NUMERIC,
    delivered_hours NUMERIC,
    coverage_ratio NUMERIC,
    index_score NUMERIC,
    tier_classification TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_promised_hours NUMERIC := 0;
    v_delivered_hours NUMERIC := 0;
    v_total_promised_epochs INT := 0;
    v_observed_epochs INT := 0;
    v_coverage NUMERIC := 0;
    v_score NUMERIC;
    v_tier TEXT;
    v_min_coverage CONSTANT NUMERIC := 0.70;
    v_pressure_floor CONSTANT NUMERIC := 7.0;
BEGIN
    -- 1. Calculate Promised Hours from active, non-superseded schedules
    SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (LEAST(window_end, p_window_end) - GREATEST(window_start, p_window_start))) / 3600), 0)
    INTO v_promised_hours
    FROM water_schedules
    WHERE dma_id = p_dma_id
      AND superseded_at IS NULL
      AND window_start < p_window_end
      AND window_end > p_window_start;

    IF v_promised_hours = 0 THEN
        RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC, 1.0::NUMERIC, NULL::NUMERIC, 'NO_SCHEDULED_HOURS'::TEXT;
        RETURN;
    END IF;

    v_total_promised_epochs := FLOOR(v_promised_hours / 0.25);

    -- 2. Aggregate valid, non-simulated readings in 15-minute epochs during promised windows
    WITH epoch_data AS (
        SELECT
            date_bin('15 minutes', r.recorded_at, p_window_start) AS epoch_time,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY r.pressure_psi) AS median_pressure
        FROM pressure_readings r
        JOIN water_schedules s ON s.dma_id = r.dma_id
          AND s.superseded_at IS NULL
          AND r.recorded_at >= s.window_start
          AND r.recorded_at < s.window_end
        WHERE r.dma_id = p_dma_id
          AND r.is_simulated IS FALSE -- Rule WR12
          AND r.pressure_psi BETWEEN 0.0 AND 25.0 -- Rule WR03
          AND r.recorded_at >= p_window_start
          AND r.recorded_at < p_window_end
        GROUP BY 1
    )
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE median_pressure >= v_pressure_floor)
    INTO v_observed_epochs, v_delivered_hours
    FROM epoch_data;

    v_delivered_hours := v_delivered_hours * 0.25;
    v_coverage := ROUND((v_observed_epochs::NUMERIC / NULLIF(v_total_promised_epochs, 0)), 4);

    -- 3. Check Minimum Coverage Floor
    IF v_coverage < v_min_coverage THEN
        RETURN QUERY SELECT v_promised_hours, v_delivered_hours, v_coverage, NULL::NUMERIC, 'DATA_DEFICIENT'::TEXT;
        RETURN;
    END IF;

    -- 4. Calculate Final Score
    v_score := ROUND(LEAST(1.0, (v_delivered_hours / v_promised_hours)) * 100, 2);

    -- 5. Determine Tier
    IF v_score >= 90.0 THEN v_tier := 'EXEMPLARY';
    ELSIF v_score >= 75.0 THEN v_tier := 'SATISFACTORY';
    ELSIF v_score >= 50.0 THEN v_tier := 'DEGRADED';
    ELSE v_tier := 'CRITICAL_DEFICIT';
    END IF;

    RETURN QUERY SELECT v_promised_hours, v_delivered_hours, v_coverage, v_score, v_tier;
END;
$$;
```

---

## 5. Edge Cases & Boundary Handling

1. **Zero Scheduled Hours ($H_{\text{promised}} = 0$):**
   * If a DMA is designated as a 24/7 continuous supply zone or conversely undergoing emergency complete system shutdown with 0 promised hours, $I$ cannot be computed by division. The system flags the DMA as `CONTINUOUS_ZONE` or `COMPLETE_SHUTDOWN` without producing a false divide-by-zero exception.
2. **Unscheduled Emergency Restorations:**
   * Water supplied outside scheduled windows is displayed on telemetry graphs in neutral blue/gray but gives zero additive bonus to $H_{\text{delivered}}$. This prevents a utility from compensating for daytime outages by pumping water at 03:00 AM unannounced.
3. **Sensor Drift and Outliers:**
   * Median aggregation (`PERCENTILE_CONT(0.5)`) per 15-minute epoch eliminates transient pressure spikes (water hammer) and momentary zero-drops from faucet valve cycling.

