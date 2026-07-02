import { create } from 'zustand';
import { GlobalState, Batch, Message, Relationship, DimensionCard, Scenario, ModelType } from '../types';

const INITIAL_PROVENANCE_CONVERSATIONS: Record<string, Message[]> = {
  'revenue': [
    {
      role: 'ai',
      content: "Welcome to the **Revenue Provenance Inspector**. This represents your enterprise's projected gross bookings for Q4 2025 under optimization. Ask me about the math formulation or the underlying records.",
      chips: ["What sheet did this come from?", "How is Q4 uplift estimated?", "Show the elasticity parameter"]
    }
  ],
  'revenue outcome': [
    {
      role: 'ai',
      content: "Welcome to the **Revenue Provenance Inspector**. This represents your enterprise's projected gross bookings for Q4 2025 under optimization. Ask me about the math formulation or the underlying records.",
      chips: ["What sheet did this come from?", "How is Q4 uplift estimated?", "Show the elasticity parameter"]
    }
  ],
  'cost centre': [
    {
      role: 'ai',
      content: "Welcome to the **Cost Centre Provenance Inspector**. This represents the total operating overhead budgeted for Q4 2025. Ask me about cost allocations or how the target was reached.",
      chips: ["What is the cost reduction target?", "Which departments are squeezed?", "Show source fields"]
    }
  ],
  'cost allocation': [
    {
      role: 'ai',
      content: "Welcome to the **Cost Centre Provenance Inspector**. This represents the total operating overhead budgeted for Q4 2025. Ask me about cost allocations or how the target was reached.",
      chips: ["What is the cost reduction target?", "Which departments are squeezed?", "Show source fields"]
    }
  ],
  'gross margin': [
    {
      role: 'ai',
      content: "Welcome to the **Gross Margin Provenance Inspector**. This efficiency ratio is calculated as `(Revenue - Cost) / Revenue`. Ask me about margin drivers.",
      chips: ["Show margin equation", "Why does margin compress slightly?", "Verify historical margin"]
    }
  ],
  'churn rate': [
    {
      role: 'ai',
      content: "Welcome to the **Churn Rate Provenance Inspector**. This risk metric estimates the rate of customer attrition following the enterprise price change.",
      chips: ["How is churn bounded?", "Show renewal cohort profiles", "What is the sensitivity threshold?"]
    }
  ],
  'egr achieved': [
    {
      role: 'ai',
      content: "Welcome to the **EGR Achieved Provenance Inspector**. EGR (Enterprise Growth Representation) measures your strategic success rating under the model.",
      chips: ["Why is Scenario B the winner?", "Compare against Scenario A", "What model was used to solve this?"]
    }
  ],
  'egr performance': [
    {
      role: 'ai',
      content: "Welcome to the **EGR Performance Provenance Inspector**. EGR (Enterprise Growth Representation) measures your strategic success rating under the model.",
      chips: ["Why is Scenario B the winner?", "Compare against Scenario A", "What model was used to solve this?"]
    }
  ],
  'forecasted egr': [
    {
      role: 'ai',
      content: "Welcome to the **Forecasted EGR Provenance Inspector**. This displays the comparative trajectory between baseline growth and optimized scenarios.",
      chips: ["Show trajectory math", "Compare Scenario A vs B", "What equations are solved?"]
    }
  ],
  'egr gap vs target': [
    {
      role: 'ai',
      content: "Welcome to the **EGR Gap vs Target Provenance Inspector**. This highlights the performance difference between baseline projections and the 12% target.",
      chips: ["Why is Scenario B the winner?", "Compare Scenario A vs B", "What model was used to solve this?"]
    }
  ]
};

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

const INITIAL_WORKSPACE_METRICS = [
  { name: 'Revenue',       value: '$2.40M', delta: '↑ +18%',  dir: 'up' as const },
  { name: 'Cost Centre',   value: '$980K',  delta: '↓ −6%',   dir: 'down' as const },
  { name: 'Gross Margin',  value: '63.2%',  delta: '— stable', dir: 'flat' as const },
  { name: 'Churn Rate',    value: '4.2%',   delta: '✓ ≤ 6%',  dir: 'up' as const },
  { name: 'EGR Achieved',  value: '13.2%',  delta: '↑ +1.2pp', dir: 'up' as const },
];

export const useStore = create<GlobalState>((set, get) => ({
  screen: 1,
  batches: INITIAL_BATCHES,
  activeBatchId: 'q2-rev',
  model: 'auto',
  conversation: INITIAL_CONVERSATION,
  leftSidebarOpen: true,
  rightSidebarOpen: false,
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
  selectedProvenanceMetric: null,
  provenanceConversations: INITIAL_PROVENANCE_CONVERSATIONS,
  workspaceMetrics: INITIAL_WORKSPACE_METRICS,

  setScreen: (screen: number) => {
    set({ 
      screen,
      // Adjust dimensions structure automatically depending on screen
      dimensions: INITIAL_DIMENSIONS(screen)
    });
    
    // Automatically update AI speech according to target screen to simulate agent
    const convo = get().conversation.filter(m => !m.isTyping);
    
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
      const alreadyHasMsg = convo.some(m => m.content.includes("World model looks ready"));
      if (!alreadyHasMsg) {
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
      }
    } else if (screen === 6) {
      const alreadyHasMsg = convo.some(m => m.content.includes("Optimisation complete"));
      if (!alreadyHasMsg) {
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
      }
    } else if (screen === 7) {
      const alreadyHasMsg = convo.some(m => m.content.includes("Here's the trade-off summary"));
      if (!alreadyHasMsg) {
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
    }
  },

  setActiveBatch: (id: string) => {
    let newSetup = { ...get().setup };
    if (id === 'q2-rev') {
      newSetup = {
        focalPoint: 'EGR Growth — Q2 → Q4 2025',
        timeGranularity: 'Quarter',
        timeRange: 'Q1 2025 → Q4 2025',
        segments: ['Region', 'Product Line'],
        parameters: ['Revenue', 'Cost Centre', 'Gross Margin'],
        sources: [
          { name: 'q2_revenue_raw.xlsx', fields: 5, rows: 4210 },
          { name: 'cost_centre_2024.csv', fields: 4, rows: 1802 },
          { name: 'region_mapping.json', fields: 4, rows: 142 }
        ]
      };
    } else if (id === 'opex-2025') {
      newSetup = {
        focalPoint: 'OpEx reduction target — Full Year 2025',
        timeGranularity: 'Month',
        timeRange: 'Jan 2025 → Dec 2025',
        segments: ['Product Line', 'Sales Channel'],
        parameters: ['Cost Centre', 'Revenue'],
        sources: [
          { name: 'cost_centre_2024.csv', fields: 4, rows: 1802 },
          { name: 'region_mapping.json', fields: 4, rows: 142 }
        ]
      };
    } else if (id === 'pricing-apac') {
      newSetup = {
        focalPoint: 'APAC Strategic Margin Optimization',
        timeGranularity: 'Quarter',
        timeRange: 'Q2 2025 → Q1 2026',
        segments: ['Region', 'Customer Tier'],
        parameters: ['Revenue', 'Gross Margin'],
        sources: [
          { name: 'q2_revenue_raw.xlsx', fields: 5, rows: 4210 },
          { name: 'region_mapping.json', fields: 4, rows: 142 }
        ]
      };
    } else if (id === 'headcount-fc') {
      newSetup = {
        focalPoint: 'FTE Productivity Modeling',
        timeGranularity: 'Year',
        timeRange: '2025 → 2027',
        segments: ['Product Line'],
        parameters: ['Cost Centre'],
        sources: [
          { name: 'cost_centre_2024.csv', fields: 4, rows: 1802 }
        ]
      };
    } else if (id === 'fy24-close') {
      newSetup = {
        focalPoint: 'FY24 Close Audits',
        timeGranularity: 'Quarter',
        timeRange: 'Q1 2024 → Q4 2024',
        segments: ['Region'],
        parameters: ['Revenue', 'Cost Centre'],
        sources: [
          { name: 'q2_revenue_raw.xlsx', fields: 5, rows: 4210 }
        ]
      };
    }

    set({
      activeBatchId: id,
      setup: newSetup,
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
        let reply = "I understand. Let me update the model constraints.";
        let chips: string[] | undefined;
        let banner: any;
        let updatedSetup = { ...get().setup };

        const contentLower = msg.content.toLowerCase();

        if (contentLower.includes('raise prices') || contentLower.includes('price')) {
          reply = "That's an elasticity analysis — this is a key scenario to model. To frame the decision framework properly, I'd like to align on a few strategic options:\n\n1. **Time Horizon** — are we evaluating performance over the next quarter, full fiscal year, or a rolling 12-month period?\n2. **Target Segments** — is this adjustment uniform across all Enterprise customers, or tiered by contract value (ARR)?\n3. **Operational Guardrails** — is there a maximum customer churn rate ceiling above which this adjustment is not viable?";
          updatedSetup = {
            ...updatedSetup,
            focalPoint: 'Revenue uplift via pricing adjustments',
            segments: ['Customer Tier', 'Region'],
            parameters: ['Revenue', 'Gross Margin']
          };
        } else if (contentLower.includes('full year') || contentLower.includes('churn')) {
          reply = "Excellent. We have mapped out a robust framework for simulating this business scenario. Here is the structure of the simulation model we'll configure:\n\n* **Strategic Decision**: Evaluate Enterprise tier price change for next FY\n* **Business Goal**: Maximize net revenue with churn risk ceiling under 6%\n* **Growth Levers**: Enterprise pricing adjustments and tier eligibility options\n* **Market Segments**: Customer size, contract values (ARR), geography, and timing\n\nReady to start configuring? Import your historical renewal data, previous pricing cohort results, and current customer roster so we can start generating scenario forecasts.";
          banner = {
            label: 'Simulation framework ready. Core drivers are mapped.',
            buttonText: 'Start Simulation Setup →',
            actionType: 'upload-data'
          };
          updatedSetup = {
            ...updatedSetup,
            focalPoint: 'Enterprise price change optimization with churn ceiling',
            segments: ['Region', 'Customer Tier', 'Product Line'],
            parameters: ['Revenue', 'Cost Centre', 'Gross Margin'],
            timeGranularity: 'Quarter'
          };
        } else if (contentLower.includes('growth') || contentLower.includes('growth target')) {
          reply = "Modeling growth targets next year requires aligning target variables with segment capacities. Let's configure the simulation for growth ROI projections.";
          updatedSetup = {
            ...updatedSetup,
            focalPoint: 'Growth optimization for FY2026',
            segments: ['Product Line', 'Region'],
            parameters: ['Revenue', 'Units Sold'],
            timeGranularity: 'Year'
          };
        } else if (contentLower.includes('costs') || contentLower.includes('operating costs')) {
          reply = "Structuring an OpEx reduction scenario. We will track Overhead and Headcount ratios against departments.";
          updatedSetup = {
            ...updatedSetup,
            focalPoint: 'OpEx rationalization & cost reduction',
            segments: ['Department', 'Sales Channel'],
            parameters: ['Cost Centre', 'Revenue'],
            timeGranularity: 'Month'
          };
        } else if (contentLower.includes('marketing') || contentLower.includes('spend')) {
          reply = "Configuring marketing spend optimization. We will simulate channel attribution and CAC levels across target markets.";
          updatedSetup = {
            ...updatedSetup,
            focalPoint: 'Marketing ROI optimization',
            segments: ['Sales Channel', 'Region'],
            parameters: ['CAC', 'Revenue'],
            timeGranularity: 'Quarter'
          };
        }

        const cleanThread = get().conversation.filter((m) => !m.isTyping);
        set({
          setup: updatedSetup,
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
      optimisationResult: null,
      leftSidebarOpen: true,
      rightSidebarOpen: false
    });
  },

  setLeftSidebarOpen: (open: boolean) => set({ leftSidebarOpen: open }),
  setRightSidebarOpen: (open: boolean) => set({ rightSidebarOpen: open }),

  updateWorkspaceMetric: (name: string, value: string) => {
    const currentMetrics = [...get().workspaceMetrics];
    const updated = currentMetrics.map(m => {
      if (m.name.toLowerCase() === name.toLowerCase()) {
        return { ...m, value };
      }
      return m;
    });

    const getVal = (metricName: string, defaultVal: string) => {
      return updated.find(m => m.name.toLowerCase() === metricName.toLowerCase())?.value || defaultVal;
    };

    const revStr = getVal('Revenue', '$2.40M');
    const costStr = getVal('Cost Centre', '$980K');
    const churnStr = getVal('Churn Rate', '4.2%');

    const parseValue = (n: string, v: string): number => {
      const clean = v.replace(/[^0-9.]/g, '');
      let num = parseFloat(clean) || 0;
      if (v.toLowerCase().includes('m')) return num * 1000000;
      if (v.toLowerCase().includes('k')) return num * 1000;
      if (n.toLowerCase() === 'revenue') {
        if (num < 100) return num * 1000000;
      }
      if (n.toLowerCase() === 'cost centre') {
        if (num < 10000) return num * 1000;
      }
      return num;
    };

    const formatCurrency = (n: number): string => {
      if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
      if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
      return `$${n.toFixed(0)}`;
    };

    const revNum = parseValue('Revenue', revStr);
    const costNum = parseValue('Cost Centre', costStr);
    const churnNum = parseValue('Churn Rate', churnStr);

    const marginVal = revNum > 0 ? ((revNum - costNum) / revNum) * 100 : 0;
    const egrVal = 8.4 + (revNum / 2000000 - 1) * 24 - (costNum / 1000000 - 1) * 12 - (churnNum - 4) * 0.5;

    const revFormatted = formatCurrency(revNum);
    const costFormatted = formatCurrency(costNum);
    const marginFormatted = `${marginVal.toFixed(1)}%`;
    const churnFormatted = `${churnNum.toFixed(1)}%`;
    const egrFormatted = `${egrVal.toFixed(1)}%`;

    const finalMetrics = updated.map(m => {
      if (m.name === 'Revenue') {
        const deltaPct = ((revNum / 2000000 - 1) * 100).toFixed(0);
        return { ...m, value: revFormatted, delta: `↑ +${deltaPct}%`, dir: 'up' as const };
      }
      if (m.name === 'Cost Centre') {
        const deltaPct = ((1 - costNum / 1040000) * 100).toFixed(0);
        return { ...m, value: costFormatted, delta: `↓ −${deltaPct}%`, dir: 'down' as const };
      }
      if (m.name === 'Gross Margin') {
        return { ...m, value: marginFormatted, delta: marginVal >= 63.2 ? '— stable' : '↓ compress', dir: marginVal >= 63.2 ? ('flat' as const) : ('down' as const) };
      }
      if (m.name === 'Churn Rate') {
        return { ...m, value: churnFormatted, delta: churnNum <= 6.0 ? '✓ ≤ 6%' : '⚠ > 6%', dir: churnNum <= 6.0 ? ('flat' as const) : ('up' as const) };
      }
      if (m.name === 'EGR Achieved') {
        const diffEgr = (egrVal - 12.0).toFixed(1);
        const prefix = parseFloat(diffEgr) >= 0 ? '+' : '';
        return { ...m, value: egrFormatted, delta: `↑ ${prefix}${diffEgr}pp`, dir: 'up' as const };
      }
      return m;
    });

    const optResult = get().optimisationResult;
    const updatedOptResult = optResult ? {
      ...optResult,
      egrAchieved: parseFloat(egrVal.toFixed(1)),
      rows: optResult.rows.map(r => {
        if (r.name === 'Revenue') return { ...r, value: revFormatted };
        if (r.name === 'Cost Centre') return { ...r, value: costFormatted };
        return r;
      })
    } : null;

    const updatedScenarios = get().scenarios.map(s => {
      if (s.id === 'B') {
        return { ...s, revenue: revFormatted, egr: egrFormatted };
      }
      return s;
    });

    set({
      workspaceMetrics: finalMetrics,
      optimisationResult: updatedOptResult,
      scenarios: updatedScenarios
    });

    // Send AI reply inside the provenance chat
    const key = name.toLowerCase();
    const currentConv = get().provenanceConversations[key] || [];
    const typingMsg = { role: 'ai' as const, content: '', isTyping: true };
    set({
      provenanceConversations: {
        ...get().provenanceConversations,
        [key]: [...currentConv, typingMsg]
      }
    });

    setTimeout(() => {
      const activeConv = (get().provenanceConversations[key] || []).filter(m => !m.isTyping);
      const aiReply = `I've updated the ECR world model calculations. Based on the new input of **${value}** for **${name}**, the dependent variables have shifted:\n\n* **Gross Margin**: ${marginFormatted}\n* **EGR Achieved**: ${egrFormatted}\n\nThe gradient convergence holds, and all constraints are satisfied.`;
      set({
        provenanceConversations: {
          ...get().provenanceConversations,
          [key]: [...activeConv, { role: 'ai', content: aiReply }]
        }
      });
    }, 800);
  },

  setSelectedProvenanceMetric: (metric: string | null) => {
    set({ selectedProvenanceMetric: metric });
  },

  addProvenanceMessage: (metric: string, message: Message) => {
    const key = metric.toLowerCase();
    const currentConv = get().provenanceConversations[key] || [
      {
        role: 'ai',
        content: `Welcome to the **${metric} Provenance Inspector**. Ask me how this metric was derived inside the ECR.`,
        chips: ["What sheet did this come from?", "How was this computed?"]
      }
    ];
    const updatedConv = [...currentConv, message];
    
    set({
      provenanceConversations: {
        ...get().provenanceConversations,
        [key]: updatedConv
      }
    });

    if (message.role === 'user') {
      const typingMsg: Message = { role: 'ai', content: '', isTyping: true };
      set({
        provenanceConversations: {
          ...get().provenanceConversations,
          [key]: [...updatedConv, typingMsg]
        }
      });

      setTimeout(() => {
        let reply = `Here is the computational explanation for **${metric}**. This value is actively modeled inside the ECR.`;
        const contentLower = message.content.toLowerCase();

        if (key.includes('revenue')) {
          if (contentLower.includes('sheet') || contentLower.includes('file') || contentLower.includes('source')) {
            reply = "This Revenue projection originates from the `q2_revenue_raw.xlsx` spreadsheet file. The model reads the `revenue_arr` field for initial conditions, filtering for Enterprise-tier accounts, mapping across Region codes, and applying our custom price changes.";
          } else if (contentLower.includes('uplift') || contentLower.includes('q4') || contentLower.includes('estimate') || contentLower.includes('how')) {
            reply = "The Q4 18% uplift is estimated by modeling price elasticities. By shifting the pricing multiplier to +10%, base bookings expand from a projected $2.00M (Scenario A) to $2.40M (Scenario B), yielding a +$400K direct improvement.";
          } else if (contentLower.includes('elasticity') || contentLower.includes('parameter') || contentLower.includes('factor')) {
            reply = "The current ECR utilizes a calculated price elasticity coefficient of **-1.45** for Enterprise clients. This coefficient was learned from the historical price cohort reaction data (18 months ago, 5% increase).";
          }
        } else if (key.includes('cost')) {
          if (contentLower.includes('target') || contentLower.includes('reduction') || contentLower.includes('how')) {
            reply = "The 6% cost reduction target ($980K vs $1.00M baseline) was solved by Newton-Raphson to satisfy the 12% EGR constraint. The optimizer determined that compression here preserves the highest EBITDA margin.";
          } else if (contentLower.includes('squeezed') || contentLower.includes('department')) {
            reply = "The primary reductions are targeted at the **Sales** and **Marketing** divisions, which exhibited high budget variances in `cost_centre_2024.csv` ($329K spent vs $311K budgeted). Engineering and R&D categories remain protected.";
          } else if (contentLower.includes('source') || contentLower.includes('fields')) {
            reply = "The cost centre values are mapped to the `budget_allocation`, `headcount`, and `overhead_cost` columns within the `cost_centre_2024.csv` table dataset.";
          }
        } else if (key.includes('margin')) {
          if (contentLower.includes('equation') || contentLower.includes('formula') || contentLower.includes('how')) {
            reply = "The Gross Margin formula in our ECR logic is: `Gross Margin = (Revenue - Cost Centre - Overhead) / Revenue`. For Scenario B, this resolves to `($2.40M - $980K) / $2.40M = 63.2%`.";
          } else if (contentLower.includes('compress') || contentLower.includes('slightly')) {
            reply = "Margin compresses from 65.1% to 63.2% due to a shift in cost center overhead mixtures and scaling costs. However, the higher gross bookings override this compression, yielding a superior net EGR.";
          } else if (contentLower.includes('verify') || contentLower.includes('historical')) {
            reply = "Historically, gross margin fluctuated between 63% and 66% as parsed from `region_mapping.json` (averaging 64.2% across active customer clusters).";
          }
        } else if (key.includes('churn')) {
          if (contentLower.includes('bounded') || contentLower.includes('constraint') || contentLower.includes('how')) {
            reply = "The churn ceiling was set by the user to **6.0%**. The Newton-Raphson solver optimizes the price adjustment so that predicted churn converges within this limit. The achieved churn is **4.2%**.";
          } else if (contentLower.includes('cohort') || contentLower.includes('renewal')) {
            reply = "Renewal profiles are extracted from the `q2_revenue_raw.xlsx` cohort. 72% of Enterprise accounts hold multi-year terms, which significantly dampens immediate churn sensitivity.";
          } else if (contentLower.includes('sensitivity') || contentLower.includes('threshold')) {
            reply = "Our sensitivity curve indicates that churn remains stable below a 10% price uplift. Beyond 10%, the curve rises exponentially, hitting the 6% churn ceiling at an 11.2% price increase.";
          }
        } else if (key.includes('egr')) {
          if (contentLower.includes('winner') || contentLower.includes('better')) {
            reply = "Scenario B is the recommended winner because it converges at **13.2% EGR**, surpassing the 12% target. Scenario A fails to meet the target, flatlining at 11.8% EGR due to static pricing.";
          } else if (contentLower.includes('math') || contentLower.includes('trajectory') || contentLower.includes('how')) {
            reply = "The EGR trajectory is computed as a quarterly compound growth projection. Scenario B's path is steeper because it loads the Q4 pricing lift ($2.40M vs $2.00M) while holding expenses at $980K.";
          } else if (contentLower.includes('model') || contentLower.includes('solver') || contentLower.includes('equations')) {
            reply = "The solver used is the **Newton-Raphson Gradient Descent** engine. It optimizes the price lever over the elasticity functions until it finds a converged state that maximizes EGR while satisfying the churn rate constraints.";
          }
        }

        const cleanConv = (get().provenanceConversations[key] || []).filter(m => !m.isTyping);
        set({
          provenanceConversations: {
            ...get().provenanceConversations,
            [key]: [...cleanConv, { role: 'ai', content: reply }]
          }
        });
      }, 1000);
    }
  }
}));
