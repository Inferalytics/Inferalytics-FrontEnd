import type { ForecastScenario } from '../types/api';

// Normalise "Q1 2025" → "Q1_2025" so stored values are consistent
function normPeriod(s: string): string {
  return s.replace(/^(Q\d)\s(\d{4})$/i, '$1_$2');
}

/**
 * Parses forecast scenarios from the AI agent's reply text.
 *
 * Handles all table formats the backend has been observed to return:
 *   | Scenario N | Q1_2025 | status | $VALUE |        (Scenario-first)
 *   | Q1_2025 | Scenario N | status | $VALUE |        (Period-first, 3 cols)
 *   | Q1_2025 | status | $VALUE |                     (Period-first, 2 cols)
 *   | Q1_2025 | $VALUE |                              (Period-first, 1 col)
 *   "Q1 2025" space-separated format (AI prose / no-underscore tables)
 *   Single-scenario fallback from prose text
 */
export function parseForecastScenariosFromReply(reply: string): ForecastScenario[] {
  if (!reply) return [];
  if (!reply.toLowerCase().includes('forecast')) return [];

  // ── Shared context (applies to all scenarios) ────────────────────────────
  // Period pattern: Q1_2025, Q12025, or "Q1 2025" (space-separated)
  const dataRangeMatch = reply.match(/(Q\d[_ ]?\d{4})\s*[→\->]+\s*(Q\d[_ ]?\d{4})/i);
  const dataRange = dataRangeMatch
    ? { start_time: normPeriod(dataRangeMatch[1]), end_time: normPeriod(dataRangeMatch[2]) }
    : undefined;

  const alphaMatch = reply.match(/alpha[=:\s]+([\d.]+)/i);
  const betaMatch  = reply.match(/beta[=:\s]+([\d.]+)/i);
  const gammaMatch = reply.match(/gamma[=:\s]+([\d.]+)/i);
  const hwParams = (alphaMatch || betaMatch || gammaMatch) ? {
    alpha: alphaMatch ? parseFloat(alphaMatch[1]) : 0,
    beta:  betaMatch  ? parseFloat(betaMatch[1])  : 0,
    gamma: gammaMatch ? parseFloat(gammaMatch[1]) : 0,
  } : undefined;

  const lastKnownMatch = reply.match(/(?:Actual|Last Known)[^\|]*\|\s*\$?([\d,]+(?:\.\d+)?)/i);
  const lastKnownValue = lastKnownMatch ? parseFloat(lastKnownMatch[1].replace(/,/g, '')) : undefined;

  const growthMatch = reply.match(/(?:Implied Growth|Growth Rate)[^\|]*\|\s*([+\-]?\d+\.?\d*%)/i)
    || reply.match(/([+\-]?\d+\.?\d*%)\s*year.over.year/i);
  const growthPct = growthMatch ? growthMatch[1] : '';

  const warningMatch = reply.match(/(?:base.effect warning|warning)[^\n]*\n([^\n]+)/i)
    || reply.match(/⚠[^\n]*([^\n]+)/);
  const warning = warningMatch ? warningMatch[1].trim() : undefined;

  const scenarios: ForecastScenario[] = [];
  const seenPeriods = new Set<string>();
  let autoSeq = 1;

  function push(num: number, period: string, value: number) {
    period = normPeriod(period);
    if (seenPeriods.has(period)) return;
    seenPeriods.add(period);
    scenarios.push({
      scenario_number: num,
      target_time: period,
      forecasted_value: value,
      last_known_value: lastKnownValue,
      predicted_growth_rate_percentage: growthPct || '',
      data_range: dataRange,
      holt_winters_parameters: hwParams,
      base_effect_warning: warning,
    });
  }

  // ── Strategy A: "| Scenario N | QX_YYYY | ... | $VALUE |" ────────────────
  // Scenario number comes BEFORE the period
  {
    const pat = /\|\s*Scenario\s*(\d+)\s*\|\s*(Q\d[_ ]?\d{4})\s*\|(?:[^|]*\|){0,3}\s*\$?([\d,]+(?:\.\d+)?)\s*\|/gi;
    let m: RegExpExecArray | null;
    while ((m = pat.exec(reply)) !== null) {
      const value = parseFloat(m[3].replace(/,/g, ''));
      if (!isNaN(value) && value > 0) push(parseInt(m[1]), m[2], value);
    }
  }

  // ── Strategy B: "| QX_YYYY | ... 0–3 middle cols ... | $VALUE |" ─────────
  // Period comes FIRST; scenario number may appear somewhere in the middle cols
  // Uses {0,3} repetition so the regex backtracks to find a numeric dollar value.
  {
    const pat = /\|\s*(Q\d[_ ]?\d{4})\s*\|(?:[^|]*\|){0,3}\s*\$?([\d,]+(?:\.\d+)?)\s*\|/gi;
    let m: RegExpExecArray | null;
    while ((m = pat.exec(reply)) !== null) {
      const value = parseFloat(m[2].replace(/,/g, ''));
      if (!isNaN(value) && value > 0 && !seenPeriods.has(m[1])) {
        // Try to pick up a scenario number from anywhere in this row
        const rowSnMatch = m[0].match(/Scenario\s*(\d+)/i);
        const num = rowSnMatch ? parseInt(rowSnMatch[1]) : autoSeq;
        push(num, m[1], value);
        autoSeq++;
      }
    }
  }

  if (scenarios.length > 0) {
    return scenarios.sort((a, b) => a.scenario_number - b.scenario_number);
  }

  // ── Strategy C: line-by-line direct extraction ───────────────────────────
  // Split the reply by newlines, then split each line by "|" to get cells.
  // This is the most robust approach — no backtracking, no regex complexity.
  {
    const lines = reply.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine.startsWith('|')) continue;
      // Split cell contents
      const cells = trimmedLine.split('|').map(c => c.trim()).filter(c => c.length > 0);
      if (cells.length < 2) continue;
      const periodCell = cells[0];
      const valueCell  = cells[1];
      // Period must match Q digit underscore? 4 digits (also allow space: "Q1 2025")
      if (!/^Q\d[_ ]?\d{4}$/i.test(periodCell)) continue;
      const normalisedPeriod = normPeriod(periodCell);
      if (seenPeriods.has(normalisedPeriod)) continue;
      // Value must be numeric (may have $, commas, decimal) OR a blocked indicator
      const value = parseFloat(valueCell.replace(/[$,]/g, ''));
      const isBlocked = isNaN(value) || value <= 0;
      const blockedKeywords = /blocked|failed|error|loop|limit|—|–|-{2,}/i;
      const isBlockedRow = isBlocked && (blockedKeywords.test(valueCell) || valueCell === '—' || valueCell === '–');

      if (isBlocked && !isBlockedRow) continue; // skip non-numeric, non-blocked rows (like header)

      // Try to extract scenario number from any cell in this row
      const rowSnMatch = trimmedLine.match(/Scenario\s*(\d+)/i);
      const num = rowSnMatch ? parseInt(rowSnMatch[1]) : autoSeq;
      // Try to extract comparison period/value and growth rate from later cells
      let compPeriod: string | undefined;
      let compValue: number | undefined;
      let rowGrowth = isBlockedRow ? '' : growthPct;
      let blockedReason: string | undefined;
      for (let ci = 2; ci < cells.length; ci++) {
        const compMatch = cells[ci].match(/^(Q\d[_ ]?\d{4})[:\s]+([\d,]+(?:\.\d+)?)/i);
        if (compMatch) {
          compPeriod = normPeriod(compMatch[1]);
          compValue  = parseFloat(compMatch[2].replace(/,/g, ''));
        }
        if (!isBlockedRow) {
          const growthMatch = cells[ci].match(/^([+\-]?\d+\.?\d*%)/);
          if (growthMatch) rowGrowth = growthMatch[1];
        }
        if (isBlockedRow && /loop|limit|error|failed/i.test(cells[ci])) {
          blockedReason = cells[ci];
        }
      }
      scenarios.push({
        scenario_number: num,
        target_time: normalisedPeriod,
        forecasted_value: isBlockedRow ? 0 : value,
        last_known_value: compValue ?? lastKnownValue,
        predicted_growth_rate_percentage: rowGrowth || '',
        data_range: dataRange,
        holt_winters_parameters: hwParams,
        base_effect_warning: warning,
        comparison_period: compPeriod,
        comparison_value: compValue,
        blocked: isBlockedRow || undefined,
        blocked_reason: blockedReason,
      });
      seenPeriods.add(normalisedPeriod);
      autoSeq++;
    }
  }

  if (scenarios.length > 0) {
    return scenarios.sort((a, b) => a.scenario_number - b.scenario_number);
  }

  // ── Strategy D: Forecast Complete prose formats ───────────────────────────
  // Handles both:
  //   "✅ FORECAST COMPLETE: Q1_2025\nPredicted Value: 22,010.68"
  //   "Q1_2025 Forecast Complete ✓\nForecasted Value: 22,010.68"
  {
    const completePat = /FORECAST COMPLETE[:\s]+(Q\d[_ ]?\d{4})|(Q\d[_ ]?\d{4})\s+Forecast Complete/gi;
    let cm: RegExpExecArray | null;
    while ((cm = completePat.exec(reply)) !== null) {
      const period = normPeriod(cm[1] || cm[2]);
      if (seenPeriods.has(period)) continue;
      // Look for value on the next few lines after the match
      const after = reply.slice(cm.index);
      const valMatch = after.match(/(?:Predicted|Forecasted) Value[:\s]+([\d,]+(?:\.\d+)?)/i)
        || after.match(/value[:\s]+([\d,]+(?:\.\d+)?)/i);
      if (!valMatch) continue;
      const value = parseFloat(valMatch[1].replace(/,/g, ''));
      if (isNaN(value) || value <= 0) continue;
      // Extract comparison/last-known from "Comparison baseline (QX_YYYY): N"
      const compMatch = after.match(/Comparison baseline[^:]*:\s*([\d,]+(?:\.\d+)?)/i);
      const compVal = compMatch ? parseFloat(compMatch[1].replace(/,/g, '')) : lastKnownValue;
      const snMatch = after.match(/Scenario\s*(\d+)/i);
      const num = snMatch ? parseInt(snMatch[1]) : autoSeq++;
      scenarios.push({
        scenario_number: num,
        target_time: period,
        forecasted_value: value,
        last_known_value: compVal,
        predicted_growth_rate_percentage: growthPct || '',
        data_range: dataRange,
        holt_winters_parameters: hwParams,
        base_effect_warning: warning,
      });
      seenPeriods.add(period);
    }
  }

  if (scenarios.length > 0) {
    return scenarios.sort((a, b) => a.scenario_number - b.scenario_number);
  }

  // ── Strategy E: generic prose fallback ───────────────────────────────────
  const periodMatch = reply.match(/Forecasted\s+(Q\d[_ ]?\d{4})\s+Total/i)
    || reply.match(/Target Period[^\|]*\|\s*(Q\d[_ ]?\d{4})/i)
    || reply.match(/predict(?:ing|ed|ion for)?\s+(Q\d[_ ]?\d{4})/i)
    || reply.match(/Q\d[_ ]?\d{4}/i);

  const fvMatch = reply.match(/(?:Predicted|Forecasted) Value[:\s]+([\d,]+(?:\.\d+)?)/i)
    || reply.match(/Forecasted[^\|$\n]*\|\s*\$?([\d,]+(?:\.\d+)?)/i)
    || reply.match(/\$\s*([\d,]+(?:\.\d+)?)/);

  const scenarioNumMatch = reply.match(/Scenario\s*(\d+)\s*(?:has been )?saved/i)
    || reply.match(/Forecast Scenario\s*(\d+)/i);

  if (periodMatch && fvMatch) {
    const value = parseFloat(fvMatch[1].replace(/,/g, ''));
    if (!isNaN(value) && value > 0) {
      const compMatch = reply.match(/Comparison baseline[^:]*:\s*([\d,]+(?:\.\d+)?)/i);
      scenarios.push({
        scenario_number: scenarioNumMatch ? parseInt(scenarioNumMatch[1]) : 1,
        target_time: normPeriod(periodMatch[1]),
        forecasted_value: value,
        last_known_value: compMatch ? parseFloat(compMatch[1].replace(/,/g, '')) : lastKnownValue,
        predicted_growth_rate_percentage: growthPct || '',
        data_range: dataRange,
        holt_winters_parameters: hwParams,
        base_effect_warning: warning,
      });
    }
  }

  return scenarios;
}
