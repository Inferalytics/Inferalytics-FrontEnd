import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getVisibleColumns,
  isSeparatorRow,
  isWebBenchmarkRow,
  isFileDataRow,
  isScenarioMetaRow,
  categorizeColumn,
  cleanSeparatorLabel,
  formatTableCellValue,
  exportWorkspaceTableToCsv,
  updateWorkspaceTableWithScenario,
} from '../src/lib/workspaceTableUtils.ts';
import type { WorkspaceTable } from '../src/types/api.ts';

// Full Example Payload from frontend_combined_spreadsheet.md specification
const SPEC_PAYLOAD: WorkspaceTable = {
  columns: [
    { id: "item",        name: "Item",                       type: "text"  },
    { id: "web_value",   name: "Web Value (e-commerce)",     type: "mixed" },
    { id: "web_unit",    name: "Unit",                       type: "mixed" },
    { id: "web_source",  name: "Source",                     type: "mixed" },
    { id: "file_Q1_2024",name: "Q1_2024",                    type: "mixed" },
    { id: "file_Q2_2024",name: "Q2_2024",                    type: "mixed" },
    { id: "file_Q3_2024",name: "Q3_2024",                    type: "mixed" },
    { id: "file_Q4_2024",name: "Q4_2024",                    type: "mixed" },
    { id: "scenario_1",  name: "Scenario 1 — Balanced 15% Growth", type: "mixed" },
    { id: "unused_col",  name: "Unused Col",                 type: "mixed" }
  ],
  rows: [
    { id: "_sep_web_e-commerce", item: "── Web Research: e-commerce ──", _type: "separator" },
    { id: "web_e-commerce_average_order_value", item: "Average Order Value", web_value: "85", web_unit: "USD", web_source: "Shopify" },
    { id: "web_e-commerce_conversion_rate", item: "Conversion Rate", web_value: "2.5", web_unit: "%", web_source: "Statista" },
    { id: "web_e-commerce_cart_abandonment_rate", item: "Cart Abandonment Rate", web_value: "70", web_unit: "%", web_source: "Baymard" },

    { id: "_sep_file_ecommerce_sample.csv", item: "── Uploaded File: ecommerce_sample.csv ──", _type: "separator" },
    { id: "file_ecommerce_sample.csv_electronics_1", item: "Electronics", file_Q1_2024: 1200.0, file_Q2_2024: 1350.0, file_Q3_2024: 1100.0, file_Q4_2024: 1900.0 },
    { id: "file_ecommerce_sample.csv_electronics_2", item: "Electronics", file_Q1_2024: 2800.0, file_Q2_2024: 2600.0, file_Q3_2024: 2400.0, file_Q4_2024: 3200.0 },
    { id: "file_ecommerce_sample.csv_clothing_1",    item: "Clothing",    file_Q1_2024:  680.0, file_Q2_2024:  720.0, file_Q3_2024:  650.0, file_Q4_2024:  950.0 },
    { id: "file_ecommerce_sample.csv_food_1",        item: "Food",        file_Q1_2024:  180.0, file_Q2_2024:  195.0, file_Q3_2024:  210.0, file_Q4_2024:  240.0 },
    { id: "file_ecommerce_sample.csv_home_1",        item: "Home",        file_Q1_2024: 1100.0, file_Q2_2024:  980.0, file_Q3_2024: 1050.0, file_Q4_2024: 1400.0 },

    { id: "target_egr",     item: "Target EGR",    scenario_1: 1.15  },
    { id: "final_egr",      item: "Final EGR",     scenario_1: 1.149 },
    { id: "growth_pct",     item: "Growth (%)",    scenario_1: 14.9  },
    { id: "converged",      item: "Converged",     scenario_1: true  },
    { id: "original_total", item: "Original Total",scenario_1: 8045.0},
    { id: "final_total",    item: "Final Total",   scenario_1: 9251.75}
  ],
  version: 1,
  updated_at: "2026-09-29T22:00:00Z"
};

test('Column visibility filters out unused columns but keeps columns with non-separator row values', () => {
  const visible = getVisibleColumns(SPEC_PAYLOAD.columns, SPEC_PAYLOAD.rows);
  const visibleIds = visible.map(c => c.id);

  assert.ok(visibleIds.includes('item'), 'Item column is always visible');
  assert.ok(visibleIds.includes('web_value'), 'Web value column is visible');
  assert.ok(visibleIds.includes('web_unit'), 'Web unit column is visible');
  assert.ok(visibleIds.includes('web_source'), 'Web source column is visible');
  assert.ok(visibleIds.includes('file_Q1_2024'), 'file_Q1_2024 is visible');
  assert.ok(visibleIds.includes('file_Q4_2024'), 'file_Q4_2024 is visible');
  assert.ok(visibleIds.includes('scenario_1'), 'scenario_1 is visible');
  assert.ok(!visibleIds.includes('unused_col'), 'unused_col without data is hidden');
});

test('Row types are accurately categorized according to specification', () => {
  const rows = SPEC_PAYLOAD.rows;

  // Separator rows
  assert.equal(isSeparatorRow(rows[0]), true);
  assert.equal(isSeparatorRow(rows[4]), true);
  assert.equal(isSeparatorRow(rows[1]), false);

  // Web benchmark rows
  assert.equal(isWebBenchmarkRow(rows[1]), true);
  assert.equal(isWebBenchmarkRow(rows[2]), true);
  assert.equal(isWebBenchmarkRow(rows[3]), true);
  assert.equal(isWebBenchmarkRow(rows[0]), false); // separator is not web row
  assert.equal(isWebBenchmarkRow(rows[5]), false); // file row is not web row

  // File data rows
  assert.equal(isFileDataRow(rows[5]), true);
  assert.equal(isFileDataRow(rows[6]), true);
  assert.equal(isFileDataRow(rows[7]), true);
  assert.equal(isFileDataRow(rows[4]), false); // separator is not file data row

  // Scenario meta rows
  assert.equal(isScenarioMetaRow(rows[10]), true); // target_egr
  assert.equal(isScenarioMetaRow(rows[11]), true); // final_egr
  assert.equal(isScenarioMetaRow(rows[12]), true); // growth_pct
  assert.equal(isScenarioMetaRow(rows[13]), true); // converged
  assert.equal(isScenarioMetaRow(rows[1]), false);  // web row is not meta row
  assert.equal(isScenarioMetaRow(rows[5]), false);  // file row is not meta row
});

test('Column categories and labels are clean', () => {
  assert.equal(categorizeColumn('item'), 'item');
  assert.equal(categorizeColumn('web_value'), 'web');
  assert.equal(categorizeColumn('web_source'), 'web');
  assert.equal(categorizeColumn('file_Q1_2024'), 'file');
  assert.equal(categorizeColumn('scenario_1'), 'scenario');
  assert.equal(categorizeColumn('target_12_pct'), 'scenario');
  assert.equal(categorizeColumn('forecast_1_0'), 'forecast');
  assert.equal(categorizeColumn('data_source'), 'meta');

  assert.equal(cleanSeparatorLabel('── Web Research: e-commerce ──'), 'Web Research: e-commerce');
  assert.equal(cleanSeparatorLabel('── Uploaded File: ecommerce_sample.csv ──'), 'Uploaded File: ecommerce_sample.csv');
});

test('Cell formatting handles null, booleans, percentages, numbers, and strings', () => {
  // Empty / null
  assert.deepEqual(formatTableCellValue(null), { display: '—', raw: null, isMuted: true });
  assert.deepEqual(formatTableCellValue(undefined), { display: '—', raw: undefined, isMuted: true });
  assert.deepEqual(formatTableCellValue(''), { display: '—', raw: '', isMuted: true });

  // Boolean
  const boolTrue = formatTableCellValue(true);
  assert.equal(boolTrue.display, 'Converged');
  assert.equal(boolTrue.boolVal, true);
  assert.equal(boolTrue.isBoolean, true);

  // Growth percentage
  const pctCell = formatTableCellValue(14.9, 'growth_pct');
  assert.equal(pctCell.display, '+14.9%');
  assert.equal(pctCell.isNumber, true);

  // Numbers
  const intCell = formatTableCellValue(1200);
  assert.equal(intCell.display, '1,200');

  const floatCell = formatTableCellValue(1.149);
  assert.equal(floatCell.display, '1.149');

  // String
  const strCell = formatTableCellValue('Shopify', 'web_source');
  assert.equal(strCell.display, 'Shopify');
  assert.equal(strCell.isMuted, false);
});

test('CSV export generates compliant format spanning sections', () => {
  const csv = exportWorkspaceTableToCsv(SPEC_PAYLOAD);
  const lines = csv.split('\n');

  // Header line
  assert.ok(lines[0].includes('"Item"'));
  assert.ok(lines[0].includes('"Web Value (e-commerce)"'));
  assert.ok(lines[0].includes('"Q1_2024"'));
  assert.ok(lines[0].includes('"Scenario 1 — Balanced 15% Growth"'));
  assert.ok(!lines[0].includes('"Unused Col"')); // Filtered out

  // Separator rows in CSV
  assert.ok(lines[1].startsWith('"Web Research: e-commerce"'));
  assert.ok(lines[5].startsWith('"Uploaded File: ecommerce_sample.csv"'));

  // Web benchmark row
  assert.ok(lines[2].includes('"Average Order Value"'));
  assert.ok(lines[2].includes('"85"'));
  assert.ok(lines[2].includes('"Shopify"'));

  // File row
  assert.ok(lines[6].includes('"Electronics"'));
  assert.ok(lines[6].includes('"1200"'));
});

test('Scenario What-If updates apply multiplier cleanly to file & meta rows while preserving web rows', () => {
  const updated = updateWorkspaceTableWithScenario(SPEC_PAYLOAD, 'What if we model a +10% expansion?');
  assert.ok(updated, 'Updated table is generated');

  const scenarioCol = updated.columns.find(c => c.id === 'scenario_plus_10');
  assert.ok(scenarioCol, 'scenario_plus_10 column added');
  assert.equal(scenarioCol.name, 'Scenario 3 — +10% Growth');

  // Web rows should remain untouched
  const webRow = updated.rows.find(r => r.id === 'web_e-commerce_average_order_value');
  assert.equal(webRow?.scenario_plus_10, undefined, 'Web row does not receive period-scaled scenario value');

  // File row should receive +10% based on last period (Q4_2024 = 1900 -> 2090)
  const fileRow = updated.rows.find(r => r.id === 'file_ecommerce_sample.csv_electronics_1');
  assert.equal(fileRow?.scenario_plus_10, 2090.0);

  // Meta row checks
  const growthRow = updated.rows.find(r => r.id === 'growth_pct');
  assert.equal(growthRow?.scenario_plus_10, 10.0);

  const convergedRow = updated.rows.find(r => r.id === 'converged');
  assert.equal(convergedRow?.scenario_plus_10, true);

  // Reset scenario removes scenario columns
  const resetTable = updateWorkspaceTableWithScenario(updated, 'Reset to baseline model');
  assert.ok(resetTable, 'Reset table generated');
  assert.ok(!resetTable.columns.some(c => c.id === 'scenario_plus_10'));
});
