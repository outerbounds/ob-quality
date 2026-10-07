/** The catalog's Model Chart tab heading. */
export const modelChartData = {
  heading: 'Model Performance',

  // Select non-default metrics first so returning to the default also verifies an update.
  xAxisOptions: [
    { metric: 'Max RAM', title: 'Max RAM (GB)' },
    { metric: 'File size', title: 'File size (GB)' },
  ],

  yAxisOptions: [
    { metric: 'TruthfulQA', title: 'TruthfulQA Score (%)' },
    { metric: 'WinoGrande', title: 'WinoGrande Score (%)' },
    { metric: 'MMLU-Pro', title: 'MMLU-Pro Score (%)' },
  ],
} as const;
