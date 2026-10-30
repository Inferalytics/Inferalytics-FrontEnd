import test from 'node:test';
import assert from 'node:assert/strict';
import {
  countByStatus,
  designToCsv,
  formatDesignValue,
  formulaLabel,
  groupDimensions,
  parseCellInput,
} from '../src/lib/datasetDesign.ts';
import { toolProgressLabel } from '../src/lib/agentStream.ts';
import type { DatasetDesign, DesignDimension } from '../src/types/api.ts';

const dim = (id: string, name: string, group: string, extra: Partial<DesignDimension> = {}): DesignDimension => ({
  id, name, group, unit: '', kind: 'input', formula: null, optimise: true, ...extra,
});

const design: DatasetDesign = {
  version: 4,
  status: 'draft',
  granularity: 'yearly',
  periods: [
    { key: 'FY2024', label: '2024', projected: false },
    { key: 'FY2025', label: '2025', projected: true },
  ],
  dimensions: [
    dim('dim_stores', 'Store count', 'Drivers'),
    dim('dim_revenue', 'Revenue', 'Outputs', {
      kind: 'derived', optimise: false, formula: { op: 'product', of: ['dim_stores', 'dim_sales'], scale: 0.001 },
    }),
    dim('dim_sales', 'Sales, per store', 'Drivers'),
    dim('dim_growth', 'Y/Y growth', 'Outputs', {
      kind: 'derived', optimise: false, formula: { op: 'yoy', of: ['dim_revenue'], scale: 1 },
    }),
  ],
  cells: {
    dim_stores: { FY2024: { value: 42, status: 'user' }, FY2025: { value: 45, status: 'estimated' } },
    dim_sales: { FY2024: { value: 610, status: 'estimated' }, FY2025: { value: 640, status: 'interpolated' } },
    dim_revenue: { FY2024: { value: 25.62, status: 'derived' }, FY2025: { value: 28.8, status: 'derived' } },
    dim_growth: { FY2025: { value: 12.4122, status: 'derived' } },
  },
  last_changed: ['dim_sales'],
  updated_at: null,
};

test('groups rows by group in order of first appearance', () => {
  const groups = groupDimensions(design);
  assert.deepEqual(groups.map(g => [g.group, g.dimensions.map(d => d.id)]), [
    ['Drivers', ['dim_stores', 'dim_sales']],
    ['Outputs', ['dim_revenue', 'dim_growth']],
  ]);
});

test('counts cells by where their value came from', () => {
  assert.deepEqual(countByStatus(design), {
    estimated: 2, interpolated: 1, user: 1, web: 0, file: 0, derived: 3,
  });
});

test('describes calculated rows by name', () => {
  assert.equal(formulaLabel(design, design.dimensions[1]), 'Store count × Sales, per store');
  assert.equal(formulaLabel(design, design.dimensions[3]), 'Y/Y of Revenue');
  assert.equal(formulaLabel(design, design.dimensions[0]), null);
});

test('formats values: two decimals below 1,000, whole numbers above', () => {
  assert.equal(formatDesignValue(12.4122), '12.41');
  assert.equal(formatDesignValue(1234567.8), '1,234,568');
  assert.equal(formatDesignValue(-0.5), '-0.5');
});

test('parses typed cell values', () => {
  assert.equal(parseCellInput('1,234.5'), 1234.5);
  assert.equal(parseCellInput(' $42 '), 42);
  assert.equal(parseCellInput('36%'), 36);
  assert.equal(parseCellInput('-3.2'), -3.2);
  assert.equal(parseCellInput('1e3'), 1000);
  assert.equal(parseCellInput(''), null);
  assert.equal(parseCellInput('   '), null);
  assert.equal(parseCellInput('abc'), undefined);
  assert.equal(parseCellInput('12abc'), undefined);
  assert.equal(parseCellInput('1.2.3'), undefined);
});

test('exports the design as CSV with quoted fields where needed', () => {
  assert.equal(
    designToCsv(design),
    [
      'Dimension,Unit,Group,2024,2025',
      'Store count,,Drivers,42,45',
      'Revenue,,Outputs,25.62,28.8',
      '"Sales, per store",,Drivers,610,640',
      'Y/Y growth,,Outputs,,12.4122',
    ].join('\n'),
  );
});

test('the design tool has a user-facing progress label', () => {
  assert.equal(toolProgressLabel('edit_dataset_design'), 'Updating the table…');
});
