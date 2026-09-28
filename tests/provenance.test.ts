import test from 'node:test';
import assert from 'node:assert/strict';
import type { DataPoint } from '../src/types/api.ts';

// Reusable pure helper functions extracted for unit testing
function getHostname(urlStr?: string): string {
  if (!urlStr) return '';
  try {
    const url = new URL(urlStr);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return urlStr;
  }
}

function formatMacroLabel(label: string): string {
  if (label === 'web') return 'Web Benchmarks';
  if (label === 'not_found') return 'Not Found (Web)';
  return label;
}

function filterRowLabels(
  rowLabels: Record<string, string>,
  hasProvenance: boolean
): [string, string][] {
  const technicalKeys = new Set(['source_type', 'source_url', 'source_name', 'collected_at']);
  return Object.entries(rowLabels || {}).filter(([k]) => !hasProvenance || !technicalKeys.has(k));
}

test('getHostname extracts clean domain hostnames', () => {
  assert.equal(getHostname('https://grokipedia.com/page/abandonment_rate'), 'grokipedia.com');
  assert.equal(getHostname('https://www.statista.com/forecast/ecommerce'), 'statista.com');
  assert.equal(getHostname('https://sub.domain.co.uk/test?q=1'), 'sub.domain.co.uk');
  assert.equal(getHostname(''), '');
  assert.equal(getHostname(undefined), '');
  assert.equal(getHostname('invalid-url'), 'invalid-url');
});

test('formatMacroLabel translates technical source labels into human readable names', () => {
  assert.equal(formatMacroLabel('web'), 'Web Benchmarks');
  assert.equal(formatMacroLabel('not_found'), 'Not Found (Web)');
  assert.equal(formatMacroLabel('Electronics'), 'Electronics');
  assert.equal(formatMacroLabel('Clothing'), 'Clothing');
});

test('filterRowLabels excludes internal provenance technical keys when provenance is present', () => {
  const webRowLabels = {
    Metric: 'Cart Abandonment Rate',
    Unit: '%',
    Domain: 'e-commerce',
    source_type: 'web',
    source_url: 'https://grokipedia.com/page/abandonment_rate',
    source_name: 'Abandonment rate',
    collected_at: '2026-09-28T13:27:15.633440+00:00'
  };

  const filtered = filterRowLabels(webRowLabels, true);
  assert.deepEqual(filtered, [
    ['Metric', 'Cart Abandonment Rate'],
    ['Unit', '%'],
    ['Domain', 'e-commerce'],
  ]);

  // For file uploaded data without provenance, all row_labels are preserved
  const fileRowLabels = {
    Category: 'Electronics',
    Subcategory: 'Phones'
  };
  const fileFiltered = filterRowLabels(fileRowLabels, false);
  assert.deepEqual(fileFiltered, [
    ['Category', 'Electronics'],
    ['Subcategory', 'Phones']
  ]);
});

test('DataPoint with web provenance conforms to API contract', () => {
  const webDataPoint: DataPoint = {
    type: 'data_point',
    vector_index: 4,
    label: 'Cart Abandonment Rate | % | e-commerce | web | ... (Value)',
    column: 'Value',
    row_labels: {
      Metric: 'Cart Abandonment Rate',
      Unit: '%',
      Domain: 'e-commerce',
      source_type: 'web',
      source_url: 'https://grokipedia.com/page/abandonment_rate',
      source_name: 'Abandonment rate',
      collected_at: '2026-09-28T13:27:15.633440+00:00'
    },
    original_value: 70.2,
    final_value: 80.723,
    delta: 10.523,
    change_pct: '+14.99%',
    egr_contribution_pct: '+3.6747%',
    status: 'increased',
    provenance: {
      source_type: 'web',
      source_url: 'https://grokipedia.com/page/abandonment_rate',
      source_name: 'Abandonment rate',
      collected_at: '2026-09-28T13:27:15.633440+00:00',
      confidence: 0.7
    }
  };

  assert.equal(webDataPoint.provenance?.source_type, 'web');
  assert.equal(webDataPoint.provenance?.confidence, 0.7);
  assert.equal(getHostname(webDataPoint.provenance?.source_url), 'grokipedia.com');
});

test('DataPoint with not_found provenance conforms to API contract', () => {
  const notFoundDataPoint: DataPoint = {
    type: 'data_point',
    vector_index: 20,
    label: 'Fulfillment Cost Pct | ... (confidence)',
    column: 'confidence',
    row_labels: {
      Metric: 'Fulfillment Cost Pct',
      source_type: 'not_found'
    },
    original_value: 0.0,
    final_value: 0.0,
    delta: 0.0,
    change_pct: '0.0%',
    egr_contribution_pct: '0.0%',
    status: 'unchanged',
    provenance: {
      source_type: 'not_found',
      collected_at: '2026-09-28T13:27:15.633440+00:00'
    }
  };

  assert.equal(notFoundDataPoint.provenance?.source_type, 'not_found');
  assert.equal(notFoundDataPoint.delta, 0.0);
});

test('DataPoint with user_edit provenance conforms to API contract', () => {
  const userEditDataPoint: DataPoint = {
    type: 'data_point',
    vector_index: 3,
    label: 'Conversion Rate | % (Value)',
    column: 'Value',
    row_labels: {
      Metric: 'Conversion Rate',
      Unit: '%',
    },
    original_value: 2.5,
    final_value: 5.0,
    delta: 2.5,
    change_pct: '+100.0%',
    egr_contribution_pct: '+1.5%',
    status: 'increased',
    provenance: {
      source_type: 'user_edit',
      edited_by: 'user_clerk_123',
      previous_value: 2.5,
      collected_at: '2026-09-28T14:00:00.000Z'
    }
  };

  assert.equal(userEditDataPoint.provenance?.source_type, 'user_edit');
  assert.equal(userEditDataPoint.provenance?.previous_value, 2.5);
  assert.equal(userEditDataPoint.provenance?.edited_by, 'user_clerk_123');
});

test('DataPoint from file upload has no provenance', () => {
  const fileDataPoint: DataPoint = {
    type: 'data_point',
    vector_index: 7,
    label: 'Electronics | Phones (Q4_2023)',
    column: 'Q4_2023',
    row_labels: {
      Category: 'Electronics',
      Subcategory: 'Phones'
    },
    original_value: 1900.0,
    final_value: 2110.2472,
    delta: 210.2472,
    change_pct: '+11.07%',
    egr_contribution_pct: '+0.5098%',
    status: 'increased'
  };

  assert.equal(fileDataPoint.provenance, undefined);
  assert.equal(fileDataPoint.row_labels.Category, 'Electronics');
});
