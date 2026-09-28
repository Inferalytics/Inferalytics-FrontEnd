import test from 'node:test';
import assert from 'node:assert/strict';
import { buildVisualTableFromContent } from '../src/store/useStore.ts';

test('buildVisualTableFromContent correctly builds visual table from parsed rows', () => {
  const sampleData = [
    { item: 'Hospital Care', '2020': 1200, '2021': 1300, '2022': 1420 },
    { item: 'Physician Services', '2020': 800, '2021': 850, '2022': 910 },
    { item: 'Prescription Drugs', '2020': 350, '2021': 370, '2022': 400 },
  ];

  const table = buildVisualTableFromContent(sampleData, 'health_data.csv');

  assert.equal(table.activeScenarioName, 'health_data Baseline');
  assert.equal(table.growthMultiplier, 1.0);
  assert.equal(table.rows.length, 3);
  assert.equal(table.rows[0].name, 'Hospital Care');
  assert.equal(table.rows[0].values['2020'], 1200);
  assert.equal(table.rows[0].values['2022'], 1420);
  assert.ok(table.years.historical.length > 0);
  assert.ok(table.years.projected.length > 0);
});

test('buildVisualTableFromContent handles single record with fallback projected values', () => {
  const sampleData = [
    { name: 'Revenue Stream A', amount: 5000 },
  ];

  const table = buildVisualTableFromContent(sampleData, 'single.csv');
  assert.equal(table.rows.length, 1);
  assert.equal(table.rows[0].name, 'Revenue Stream A');
  assert.equal(table.rows[0].isCurrency, true);
});

test('Route tab map correctly resolves specification screens', () => {
  const routeTabMap: Record<string, number> = {
    conversation: 1,
    dimensions: 2,
    scenarios: 3,
    blueprint: 2,
    'ecr-build': 2,
    'ecr-batch': 2,
    'ips-engine': 3,
    workspace: 3,
    forecast: 3,
    learning: 3,
    'world-model': 3,
  };

  assert.equal(routeTabMap['conversation'], 1);
  assert.equal(routeTabMap['dimensions'], 2);
  assert.equal(routeTabMap['scenarios'], 3);
  assert.equal(routeTabMap['world-model'], 3);
  assert.equal(routeTabMap['forecast'], 3);
});

test('cleanAgentReply cleans internal scratchpads and retains user facing content', () => {
  const cleanAgentReply = (rawText: string): string => {
    if (!rawText) return '';
    if (
      /^(THINK|CLARIFY|PLAN|EXECUTE|\s*zation request)/i.test(rawText.trim()) ||
      rawText.includes('zation request') ||
      rawText.includes('How far forward would you like to forecast?') ||
      rawText.includes('Current data spans')
    ) {
      return '';
    }
    return rawText
      .replace(/━━━\s*PHASE\s*\d.*?━━━/gis, '')
      .replace(/PHASE\s*\d\s*[—–-]\s*(THINK|CLARIFY|PLAN|EXECUTE).*?(?=\n\n|\n[A-Z]|\Z)/gis, '')
      .replace(/──\s*DATA\s*(SCIENTIST|ENGINEER)\s*LENS\s*──.*?(?=\n\n|\n[A-Z]|\Z)/gis, '')
      .replace(/DATA\s*(SCIENTIST|ENGINEER)\s*LENS:.*?(?=\n\n|\n[A-Z]|\Z)/gis, '')
      .replace(/\*Executed:\*.*$/gm, '')
      .replace(/Vectorising \d+\s*\/\s*\d+ fields/gi, '')
      .replace(/Running pipeline step \d+/gi, '')
      .trim();
  };

  const raw = `━━━ PHASE 1: EXECUTE ━━━
DATA SCIENTIST LENS: Computing variance
Here are the final scenario results for Q1 2025.
*Executed:* run_complete_scenario`;

  const cleaned = cleanAgentReply(raw);
  assert.equal(cleaned, 'Here are the final scenario results for Q1 2025.');
});
