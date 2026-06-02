import { create } from 'zustand';
import { GlobalState, Batch, Message, Relationship, DimensionCard, Scenario } from '../types';

const INITIAL_CONVERSATION: Message[] = [
  {
    role: 'ai',
    content: "Hi Robert. I'm here to help you frame a decision. We can talk it through first — once I understand the shape of the problem, I'll know what data to ask you for.\n\nA few common starting points, or just describe it in your own words:",
    chips: [
      'I want to raise prices',
      'Hit a growth target next year',
      'Reduce operating costs',
      'Reallocate marketing spend'
    ]
  }
];

const INITIAL_BATCHES: Batch[] = [
  { id: 'q2-rev', name: 'Q2 Revenue Model', status: 'active' },
  { id: 'opex-2025', name: 'OpEx Reduction 2025', status: 'idle' },
  { id: 'pricing-apac', name: 'Pricing Experiment — APAC', status: 'idle' },
  { id: 'headcount-fc', name: 'Headcount Forecast', status: 'idle' },
  { id: 'fy24-close', name: 'FY24 Year-End Close', status: 'archived', meta: 'archived' }
];

const INITIAL_RELATIONSHIPS: Relationship[] = [
  { a: 'Quarter', op: '→', b: 'Revenue', note: 'time-series driver', confirmed: true },
  { a: 'Region', op: '↔', b: 'Revenue', note: 'segment correlation', confirmed: true },
  { a: 'Product Line', op: '→', b: 'Cost Centre', note: 'allocation rule', confirmed: true },
  { a: 'Cost Centre', op: '↔', b: 'Gross Margin', note: 'derived ratio', confirmed: false }
];

const INITIAL_GROWTH_RATES = [
  { segment: 'EMEA · Enterprise', q1: '$640K', q2: '$712K', q3: '$801K', q4Proj: '$884K', yoy: '+11.3%' },
  { segment: 'APAC · SMB', q1: '$210K', q2: '$248K', q3: '$291K', q4Proj: '$342K', yoy: '+17.4%' },
  { segment: 'NA-East · Enterprise', q1: '$890K', q2: '$915K', q3: '$932K', q4Proj: '$948K', yoy: '+1.7%' },
  { segment: 'NA-East · Self-serve', q1: '$118K', q2: '$102K', q3: '$94K', q4Proj: '$88K', yoy: '−6.4%' },
  { segment: 'EMEA · SMB', q1: '$320K', q2: '$355K', q3: '$388K', q4Proj: '$424K', yoy: '+9.3%' }
];

const INITIAL_DIMENSIONS = (screen: number): DimensionCard[] => {
  if (screen === 4) {
    return [
      { id: 'rev', name: 'Revenue', type: 'numeric', samples: ['$1.24M', '$980K', '$2.10M'], status: 'ok', x: 60, y: 80, selected: true },
      { id: 'reg', name: 'Region', type: 'categorical', samples: ['EMEA', 'APAC', 'NA-East'], status: 'ok', x: 320, y: 200 },
      { id: 'qtr', name: 'Quarter', type: 'date', samples: ['Q1 2025', 'Q2 2025', 'Q3 2025'], status: 'ok', x: 60, y: 360 },
      { id: 'cost', name: 'Cost Centre', type: 'numeric', samples: ['$420K', '$311K', '$508K'], status: 'ok', x: 320, y: 460 },
      { id: 'prod', name: 'Product Line', type: 'categorical', samples: ['Enterprise', 'SMB', 'Self-serve'], status: 'busy', x: 80, y: 600 }
    ];
  }

  // Screen 5, 6, 7 layout with 7 cards
  const isDimmed = screen >= 6;
  return [
    { id: 'qtr', name: 'Quarter', type: 'date', samples: ['Q1 2025', 'Q2 2025', 'Q3 2025'], status: 'ok', x: 100, y: 130, dim: isDimmed },
    { id: 'rev', name: 'Revenue', type: 'numeric', samples: ['$1.24M', '$980K', '$2.10M'], status: 'ok', x: 380, y: 130, selected: screen === 5, dim: isDimmed },
    { id: 'reg', name: 'Region', type: 'categorical', samples: ['EMEA', 'APAC', 'NA-East'], status: 'pinned', x: 660, y: 110, pinned: true, dim: isDimmed },
    { id: 'prod', name: 'Product Line', type: 'categorical', samples: ['Enterprise', 'SMB', 'Self-serve'], status: 'ok', x: 100, y: 350, dim: isDimmed },
    { id: 'cost', name: 'Cost Centre', type: 'numeric', samples: ['$420K', '$311K', '$508K'], status: 'ok', x: 380, y: 350, dim: isDimmed },
    { id: 'margin', name: 'Gross Margin', type: 'numeric', samples: ['72%', '68%', '75%'], status: 'pinned', x: 660, y: 350, pinned: true, dim: isDimmed },
    { id: 'egr', name: 'EGR Estimate', type: 'numeric', samples: ['target: 12%', 'baseline: 8.4%'], status: 'ok', x: 380, y: 560, dim: isDimmed }
  ];
};

const INITIAL_SCENARIOS: Scenario[] = [
  { id: 'A', label: 'Scenario A — Q2 Baseline Forecast', revenue: '$2.00M', yoy: '+8%', egr: '11.8%', sparkColor: 'blue', sparkData: [100, 102, 105, 108, 110, 113, 115, 118], checked: false },
  { id: 'B', label: 'Scenario B — Optimised Projection', revenue: '$2.40M', yoy: '+18%', egr: '13.2%', sparkColor: 'green', sparkData: [100, 104, 109, 114, 120, 125, 129, 132], checked: false }
];

export const useStore = create<GlobalState>((set, get) => ({
  screen: 1,
  batches: INITIAL_BATCHES,
  activeBatchId: 'q2-rev',
  model: 'auto',
  conversation: INITIAL_CONVERSATION,
  setup: {
    focalPoint: 'EGR Growth — Q2 → Q4 2025',
    timeGranularity: 'Quarter',
    timeRange: 'Q1 2025 → Q4 2025',
    segments: ['Region', 'Product Line'],
    parameters: ['Revenue', 'Cost Centre', 'Gross Margin'],
    sources: [
      { name: 'q2_revenue_raw.xlsx', fields: 18, rows: 4210 },
      { name: 'cost_centre_2024.csv', fields: 9, rows: 1802 },
      { name: 'region_mapping.json', fields: 6, rows: 142 }
    ]
  },
  relationships: INITIAL_RELATIONSHIPS,
  growthRates: INITIAL_GROWTH_RATES,
  dimensions: INITIAL_DIMENSIONS(4),
  egrTarget: 12,
  scenarios: INITIAL_SCENARIOS,
  optimisationResult: null,

  setScreen: (screen: number) => {
    set({ 
      screen,
      // Adjust dimensions structure automatically depending on screen
      dimensions: INITIAL_DIMENSIONS(screen)
    });
    
    // Automatically update AI speech according to target screen to simulate agent
    const convo = [...get().conversation];
    
    if (screen === 2 && convo.length < 5) {
      set({
        model: 'auto',
        conversation: [
          ...convo,
          {
            role: 'ai',
            content: "Let's set up the world model. What single outcome are we modelling? Pick a focal point, then we'll define time, segments, and parameters together.",
            chips: ['+ EGR Growth', '+ Revenue Forecast', '+ Cost Reduction']
          }
        ]
      });
    } else if (screen === 3 && convo.length < 7) {
      set({
        model: 'auto',
        conversation: [
          ...convo,
          {
            role: 'user',
            content: 'Focal point: EGR growth. Quarterly, by region and product line. Use the Q2 revenue file as the spine.'
          },
          {
            role: 'ai',
            content: "Good. I've drafted the world model — five dimensions and four relationships. Pre-calculated growth rates are in the data table on the canvas.",
            chips: ['+ Region ↔ Revenue', '+ Product Line → Cost'],
            banner: {
              label: 'Lock relationships and continue?',
              buttonText: 'Build World Model',
              actionType: 'build-world-model'
            }
          }
        ]
      });
    } else if (screen === 4 && convo.length < 9) {
      set({
        model: 'auto',
        conversation: [
          ...convo,
          {
            role: 'user',
            content: 'Confirmed. Build it.'
          },
          {
            role: 'ai',
            content: "Got it — EGR growth as the optimisation objective. I've parsed 18 fields from `q2_revenue_raw.xlsx`. The most relevant dimensions for your goal are on the canvas. I notice Region data is present but not yet linked to Revenue. Want me to connect them?"
          }
        ]
      });
    } else if (screen === 5) {
      set({
        model: 'Newton-Raphson',
        conversation: [
          ...convo,
          {
            role: 'ai',
            content: "World model looks ready. Revenue and Cost Centre are connected. Regions pinned to their Q3 values. I'm ready to run Newton-Raphson against your 12% EGR target — shall I proceed?",
            banner: {
              label: 'Run optimisation now?',
              buttonText: 'Run Optimisation',
              actionType: 'run-optimisation'
            }
          }
        ]
      });
    } else if (screen === 6) {
      set({
        model: 'Newton-Raphson',
        optimisationResult: {
          method: 'Newton-Raphson',
          timestamp: new Date().toLocaleTimeString(),
          durationMs: 1200,
          converged: true,
          rows: [
            { name: 'Revenue', value: '$2.40M', delta: '↑ +18%', deltaDir: 'up' },
            { name: 'Cost Centre', value: '$980K', delta: '↓ −6%', deltaDir: 'down' },
            { name: 'Quarter', value: 'Q4 2025', delta: '— flat', deltaDir: 'flat' }
          ],
          egrAchieved: 13.2,
          target: 12
        },
        conversation: [
          ...convo,
          {
            role: 'ai',
            content: "Optimisation complete. EGR of 13.2% is achievable — exceeds your 12% target. The primary lever was Revenue uplift in Q4. I've saved this as Scenario A on your canvas. Want me to run a second scenario with Cost Centre reduced further to see if you can hit 15%?",
            banner: {
              label: 'Project a tighter cost lever',
              buttonText: 'Run Scenario B',
              actionType: 'run-scenario-b'
            }
          }
        ]
      });
    } else if (screen === 7) {
      set({
        model: 'Newton-Raphson',
        conversation: [
          ...convo,
          {
            role: 'ai',
            content: "Here's the trade-off summary. Scenario B outperforms on every metric. The cost reduction in Cost Centre carries most of the EGR improvement — Revenue uplift contributes about 40% of the gain. If you lock in Scenario B, want me to flag which dimension values need to be communicated to the region leads?"
          }
        ]
      });
    }
  },

  setActiveBatch: (id: string) => {
    set({
      activeBatchId: id,
      batches: get().batches.map((b) => ({
        ...b,
        status: b.id === id ? 'active' : b.status === 'active' ? 'idle' : b.status
      }))
    });
  },

  setModel: (model: ModelType) => {
    set({ model });
  },

  addMessage: (msg: Message) => {
    const thread = [...get().conversation, msg];
    set({ conversation: thread });

    // Simulate AI thinking and replying
    if (msg.role === 'user') {
      const typingMsg: Message = { role: 'ai', content: '', isTyping: true };
      set({ conversation: [...thread, typingMsg] });

      setTimeout(() => {
        const nextScreen = get().screen;
        let reply = "I understand. Let me update the model constraints.";
        let chips: string[] | undefined;
        let banner: any;

        if (msg.content.toLowerCase().includes('raise prices') || msg.content.toLowerCase().includes('price')) {
          reply = "That's a classic elasticity question — good one to model. To frame the decision properly, I'd like to understand a few things:\n\n1. **Time horizon** — are we judging this on the next quarter, full year, or a rolling 12 months post-change?\n2. **Customer segments** — is the price change uniform across all Enterprise customers, or tiered by ARR?\n3. **Constraints** — is there a churn threshold above which the decision is automatically off the table?";
        } else if (msg.content.toLowerCase().includes('full year') || msg.content.toLowerCase().includes('churn')) {
          reply = "Good — that's enough to build a real model. Here's what I'm understanding:\n\n* Decision: Set Enterprise price change\n* Objective: Maximise net revenue subject to churn ≤ 6%\n* Levers: Price uplift % · tier eligibility\n* Dimensions: Customer, ARR band, Region, Quarter\n\nReady to bring in your data? Upload the renewal history, the 2024 price-change cohort, and your current ARR roster — I'll fit the model and we'll iterate from there.";
          banner = {
            label: 'World model framed. 5 dimensions identified.',
            buttonText: 'Upload data →',
            actionType: 'upload-data'
          };
        }

        const cleanThread = get().conversation.filter((m) => !m.isTyping);
        set({
          conversation: [
            ...cleanThread,
            { role: 'ai', content: reply, chips, banner }
          ]
        });
      }, 1000);
    }
  },

  toggleSegment: (segment: string) => {
    const current = get().setup.segments;
    const next = current.includes(segment)
      ? current.filter((s) => s !== segment)
      : [...current, segment];
    set({ setup: { ...get().setup, segments: next } });
  },

  toggleParameter: (param: string) => {
    const current = get().setup.parameters;
    const next = current.includes(param)
      ? current.filter((p) => p !== param)
      : [...current, param];
    set({ setup: { ...get().setup, parameters: next } });
  },

  setFocalPoint: (val: string) => {
    set({ setup: { ...get().setup, focalPoint: val } });
  },

  setTimeGranularity: (val: string) => {
    set({ setup: { ...get().setup, timeGranularity: val } });
  },

  toggleRelationshipConfirmed: (index: number) => {
    const relations = [...get().relationships];
    relations[index].confirmed = !relations[index].confirmed;
    set({ relationships: relations });
  },

  setDimensionSelected: (id: string) => {
    set({
      dimensions: get().dimensions.map((d) => ({
        ...d,
        selected: d.id === id
      }))
    });
  },

  setEgrTarget: (val: number) => {
    set({ egrTarget: val });
  },

  toggleScenarioChecked: (id: string) => {
    const updatedScenarios = get().scenarios.map((s) => 
      s.id === id ? { ...s, checked: !s.checked } : s
    );
    set({ scenarios: updatedScenarios });

    // If both scenarios are checked, trigger automatic transition to Screen 07 (Compare) after 300ms
    const activeChecked = updatedScenarios.filter((s) => s.checked);
    if (activeChecked.length === 2) {
      setTimeout(() => {
        get().setScreen(7);
      }, 300);
    }
  },

  runOptimisation: (callback: () => void) => {
    // Simulate active thinking then transition to screen 06
    const thread = [...get().conversation];
    set({
      conversation: [
        ...thread,
        { role: 'ai', content: '', isTyping: true }
      ]
    });

    setTimeout(() => {
      set({ screen: 6 });
      get().setScreen(6);
      callback();
    }, 1200);
  },

  runScenarioB: (callback: () => void) => {
    const thread = [...get().conversation];
    set({
      conversation: [
        ...thread,
        { role: 'ai', content: '', isTyping: true }
      ]
    });

    setTimeout(() => {
      set({ screen: 7 });
      get().setScreen(7);
      callback();
    }, 1200);
  },

  resetAll: () => {
    set({
      screen: 1,
      conversation: INITIAL_CONVERSATION,
      activeBatchId: 'q2-rev',
      model: 'auto',
      relationships: INITIAL_RELATIONSHIPS,
      dimensions: INITIAL_DIMENSIONS(4),
      scenarios: INITIAL_SCENARIOS,
      optimisationResult: null
    });
  }
}));
