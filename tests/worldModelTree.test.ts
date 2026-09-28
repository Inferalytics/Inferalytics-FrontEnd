import test from 'node:test';
import assert from 'node:assert/strict';
import type { WorldModelTreeType } from '../src/types/api.ts';

test('WorldModelTree with web research data validates complete hierarchy', () => {
  const tree: WorldModelTreeType = {
    type: 'egr_root',
    label: 'EGR Root (+15.00%)',
    target_egr: 1.15,
    final_egr: 1.1499,
    target_egr_pct: '+15.00%',
    final_egr_pct: '+14.99%',
    converged: true,
    original_total: 1000,
    final_total: 1149.9,
    total_delta: 149.9,
    total_change_pct: '+14.99%',
    hierarchy_schema: {
      is_semantic: true,
      levels: [
        { level: 'total', label: 'EGR Root', description: 'Total portfolio growth' },
        { level: 'macro_category', label: 'source_type', description: 'Data origin source' },
        { level: 'category', label: 'Metric', description: 'Domain benchmark metric' },
        { level: 'data_point', label: 'Data Point', description: 'Observed and optimized value' },
      ],
      macro_field: 'source_type',
      category_field: 'Metric',
    },
    relationships: {
      achieves_target_via: 'Newton-Raphson Optimization',
      influenced_by: ['web', 'not_found'],
      top_growth_drivers: [
        {
          label: 'Cart Abandonment Rate',
          column: 'Value',
          delta: 10.523,
          change_pct: '+14.99%',
          egr_contribution_pct: '+3.6747%',
        },
      ],
      top_laggards: [],
      macro_growth_ranking: [
        {
          label: 'web',
          delta: 149.9,
          egr_contribution_pct: '+14.99%',
          role: 'driver',
          change_pct: '+14.99%',
          original_value: 1000,
          final_value: 1149.9,
        },
      ],
      fixed_points_count: 0,
      fixed_points_held_constant: [],
    },
    macro_categories: [
      {
        type: 'macro_category',
        label: 'web',
        original_value: 1000,
        final_value: 1149.9,
        delta: 149.9,
        change_pct: '+14.99%',
        egr_contribution_pct: '+14.99%',
        categories_count: 1,
        categories: [
          {
            type: 'category',
            label: 'Cart Abandonment Rate',
            original_value: 70.2,
            final_value: 80.723,
            delta: 10.523,
            change_pct: '+14.99%',
            egr_contribution_pct: '+3.6747%',
            data_points_count: 1,
            data_points: [
              {
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
                  collected_at: '2026-09-28T13:27:15.633440+00:00',
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
                  confidence: 0.7,
                },
              },
            ],
          },
        ],
      },
    ],
  };

  assert.equal(tree.converged, true);
  assert.equal(tree.macro_categories.length, 1);
  assert.equal(tree.macro_categories[0].label, 'web');
  assert.equal(tree.macro_categories[0].categories[0].data_points[0].provenance?.source_type, 'web');
  assert.equal(tree.macro_categories[0].categories[0].data_points[0].provenance?.confidence, 0.7);
  assert.equal(tree.macro_categories[0].categories[0].data_points[0].provenance?.source_url, 'https://grokipedia.com/page/abandonment_rate');
});
