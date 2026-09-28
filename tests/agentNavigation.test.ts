import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectFlow,
  getRouteForTools,
  shouldRefreshForecast,
  isFullScenarioRequest,
  hasExplicitPipelineParams,
  nextStrategy,
  buildFullScenarioPrompt,
} from '../src/lib/agentNavigation.ts';

test('detectFlow classifies flows correctly', () => {
  assert.equal(detectFlow(['run_complete_scenario']), 'C');
  assert.equal(detectFlow(['run_forecast']), 'A');
  assert.equal(detectFlow(['compare_forecast_scenarios']), 'A');
  assert.equal(detectFlow(['run_optimization']), 'B');
  assert.equal(detectFlow(['collect_web_data']), 'B');
  assert.equal(detectFlow(['update_world_model_entry']), 'B');
  assert.equal(detectFlow(['collect_web_data', 'run_scenario']), 'B');
  assert.equal(detectFlow(['unknown_tool']), 'none');
  assert.equal(detectFlow([]), 'none');
});

test('getRouteForTools routes new web tools to world model', () => {
  assert.equal(getRouteForTools(['collect_web_data']), '/dashboard/world-model');
  assert.equal(getRouteForTools(['update_world_model_entry']), '/dashboard/world-model');
  assert.equal(getRouteForTools(['collect_web_data', 'run_optimization']), '/dashboard/world-model');
});

test('getRouteForTools routes standard tools correctly', () => {
  assert.equal(getRouteForTools(['run_complete_scenario']), '/dashboard/world-model');
  assert.equal(getRouteForTools(['run_scenario']), '/dashboard/world-model');
  assert.equal(getRouteForTools(['compare_forecast_scenarios']), '/dashboard/forecast?view=compare');
  assert.equal(getRouteForTools(['run_forecast']), '/dashboard/forecast');
  assert.equal(getRouteForTools(['compare_scenarios']), '/dashboard/learning');
  assert.equal(getRouteForTools(['set_egr']), '/dashboard/ips-engine');
  assert.equal(getRouteForTools(['vectorise_data']), '/dashboard/ecr-build');
  assert.equal(getRouteForTools(['upload_data']), '/dashboard/ecr-batch');
  assert.equal(getRouteForTools(null), null);
  assert.equal(getRouteForTools([]), null);
});

test('shouldRefreshForecast returns true for Flow A and Flow C when not skipped', () => {
  assert.equal(shouldRefreshForecast(['run_forecast'], false), true);
  assert.equal(shouldRefreshForecast(['run_complete_scenario'], false), true);
  assert.equal(shouldRefreshForecast(['run_complete_scenario'], true), false);
  assert.equal(shouldRefreshForecast(['collect_web_data'], false), false);
});

test('isFullScenarioRequest detects scenario and typo triggers', () => {
  assert.equal(isFullScenarioRequest('run full scenario'), true);
  assert.equal(isFullScenarioRequest('run complete scenario'), true);
  assert.equal(isFullScenarioRequest('run senario'), true);
  assert.equal(isFullScenarioRequest('run pipline'), true);
  assert.equal(isFullScenarioRequest('run forecast for 15% growth'), true);
  assert.equal(isFullScenarioRequest('hello how are you'), false);
});

test('hasExplicitPipelineParams detects period and growth params', () => {
  assert.equal(hasExplicitPipelineParams('Forecast Q1_2025'), true);
  assert.equal(hasExplicitPipelineParams('Optimize for 15% growth'), true);
  assert.equal(hasExplicitPipelineParams('egr 20'), true);
  assert.equal(hasExplicitPipelineParams('Just run the pipeline'), false);
});

test('nextStrategy rotates through strategies', () => {
  assert.equal(nextStrategy(undefined), 'balanced');
  assert.equal(nextStrategy('balanced'), 'front_loaded');
  assert.equal(nextStrategy('front_loaded'), 'back_loaded');
  assert.equal(nextStrategy('back_loaded'), 'leader_led');
  assert.equal(nextStrategy('leader_led'), 'catch_up');
  assert.equal(nextStrategy('catch_up'), 'balanced');
});

test('buildFullScenarioPrompt generates correct prompt', () => {
  const prompt1 = buildFullScenarioPrompt({
    hasForecast: true,
    forecastValue: 1250000,
    forecastPeriod: 'Q1_2025',
    lastStrategy: 'balanced',
    egrTarget: 15,
  });
  assert.match(prompt1, /front loaded/);
  assert.match(prompt1, /Q1_2025/);
  assert.match(prompt1, /1,250,000/);

  const prompt2 = buildFullScenarioPrompt({
    hasForecast: false,
    egrTarget: 12,
  });
  assert.match(prompt2, /Holt-Winters/);
  assert.match(prompt2, /12% EGR/);
});
