/**
 * The HR-spend figures behind the analytics showcase on the home page, held in the app rather than fetched.
 *
 * These are the exact per-category, per-month rows the API previously served, captured from it and
 * reconciled against its own totals (621,000 budget, 475,650 spent), so the
 * page renders precisely what it did before — it simply no longer needs a backend to do it.
 *
 * The chart stays fully interactive: every filter is derived from these rows in the browser.
 */
export interface DemoSpendRow {
  month: number;
  category: string;
  budget: number;
  spent: number;
}

export const DEMO_YEAR = 2026;
export const DEMO_MIN_MONTH = 1;
export const DEMO_MAX_MONTH = 8;

export const DEMO_SPEND_ROWS: readonly DemoSpendRow[] = [
  { month: 1, category: 'base_salary', budget: 44875, spent: 33016 },
  { month: 1, category: 'incentives', budget: 9375, spent: 7302 },
  { month: 1, category: 'representation', budget: 6000, spent: 5476 },
  { month: 1, category: 'vacations', budget: 4125, spent: 3052 },
  { month: 1, category: 'overtime', budget: 4125, spent: 2869 },
  { month: 1, category: 'recruitment', budget: 3500, spent: 2471 },
  { month: 1, category: 'training', budget: 3125, spent: 1699 },
  { month: 1, category: 'insurance', budget: 1500, spent: 783 },
  { month: 1, category: 'office_supplies', budget: 625, spent: 465 },
  { month: 1, category: 'transport', budget: 375, spent: 303 },
  { month: 2, category: 'base_salary', budget: 44875, spent: 35982 },
  { month: 2, category: 'incentives', budget: 9375, spent: 7957 },
  { month: 2, category: 'representation', budget: 6000, spent: 5968 },
  { month: 2, category: 'vacations', budget: 4125, spent: 3326 },
  { month: 2, category: 'overtime', budget: 4125, spent: 3127 },
  { month: 2, category: 'recruitment', budget: 3500, spent: 2693 },
  { month: 2, category: 'training', budget: 3125, spent: 1851 },
  { month: 2, category: 'insurance', budget: 1500, spent: 853 },
  { month: 2, category: 'office_supplies', budget: 625, spent: 507 },
  { month: 2, category: 'transport', budget: 375, spent: 330 },
  { month: 3, category: 'base_salary', budget: 44875, spent: 33184 },
  { month: 3, category: 'incentives', budget: 9375, spent: 7339 },
  { month: 3, category: 'representation', budget: 6000, spent: 5504 },
  { month: 3, category: 'vacations', budget: 4125, spent: 3068 },
  { month: 3, category: 'overtime', budget: 4125, spent: 2884 },
  { month: 3, category: 'recruitment', budget: 3500, spent: 2484 },
  { month: 3, category: 'training', budget: 3125, spent: 1707 },
  { month: 3, category: 'insurance', budget: 1500, spent: 787 },
  { month: 3, category: 'office_supplies', budget: 625, spent: 467 },
  { month: 3, category: 'transport', budget: 375, spent: 305 },
  { month: 4, category: 'base_salary', budget: 44875, spent: 33072 },
  { month: 4, category: 'incentives', budget: 9375, spent: 7314 },
  { month: 4, category: 'representation', budget: 6000, spent: 5485 },
  { month: 4, category: 'vacations', budget: 4125, spent: 3057 },
  { month: 4, category: 'overtime', budget: 4125, spent: 2874 },
  { month: 4, category: 'recruitment', budget: 3500, spent: 2476 },
  { month: 4, category: 'training', budget: 3125, spent: 1702 },
  { month: 4, category: 'insurance', budget: 1500, spent: 784 },
  { month: 4, category: 'office_supplies', budget: 625, spent: 466 },
  { month: 4, category: 'transport', budget: 375, spent: 304 },
  { month: 5, category: 'base_salary', budget: 44875, spent: 33016 },
  { month: 5, category: 'incentives', budget: 9375, spent: 7302 },
  { month: 5, category: 'representation', budget: 6000, spent: 5476 },
  { month: 5, category: 'vacations', budget: 4125, spent: 3052 },
  { month: 5, category: 'overtime', budget: 4125, spent: 2869 },
  { month: 5, category: 'recruitment', budget: 3500, spent: 2471 },
  { month: 5, category: 'training', budget: 3125, spent: 1699 },
  { month: 5, category: 'insurance', budget: 1500, spent: 783 },
  { month: 5, category: 'office_supplies', budget: 625, spent: 465 },
  { month: 5, category: 'transport', budget: 375, spent: 303 },
  { month: 6, category: 'base_salary', budget: 44875, spent: 32792 },
  { month: 6, category: 'incentives', budget: 9375, spent: 7252 },
  { month: 6, category: 'representation', budget: 6000, spent: 5439 },
  { month: 6, category: 'vacations', budget: 4125, spent: 3031 },
  { month: 6, category: 'overtime', budget: 4125, spent: 2850 },
  { month: 6, category: 'recruitment', budget: 3500, spent: 2455 },
  { month: 6, category: 'training', budget: 3125, spent: 1687 },
  { month: 6, category: 'insurance', budget: 1500, spent: 778 },
  { month: 6, category: 'office_supplies', budget: 625, spent: 462 },
  { month: 6, category: 'transport', budget: 375, spent: 301 },
  { month: 7, category: 'base_salary', budget: 44875, spent: 33632 },
  { month: 7, category: 'incentives', budget: 9375, spent: 7438 },
  { month: 7, category: 'representation', budget: 6000, spent: 5578 },
  { month: 7, category: 'vacations', budget: 4125, spent: 3109 },
  { month: 7, category: 'overtime', budget: 4125, spent: 2923 },
  { month: 7, category: 'recruitment', budget: 3500, spent: 2518 },
  { month: 7, category: 'training', budget: 3125, spent: 1730 },
  { month: 7, category: 'insurance', budget: 1500, spent: 797 },
  { month: 7, category: 'office_supplies', budget: 625, spent: 474 },
  { month: 7, category: 'transport', budget: 375, spent: 309 },
  { month: 8, category: 'base_salary', budget: 44875, spent: 38725 },
  { month: 8, category: 'incentives', budget: 9375, spent: 8563 },
  { month: 8, category: 'representation', budget: 6000, spent: 6421 },
  { month: 8, category: 'vacations', budget: 4125, spent: 3580 },
  { month: 8, category: 'overtime', budget: 4125, spent: 3367 },
  { month: 8, category: 'recruitment', budget: 3500, spent: 2899 },
  { month: 8, category: 'training', budget: 3125, spent: 1992 },
  { month: 8, category: 'insurance', budget: 1500, spent: 918 },
  { month: 8, category: 'office_supplies', budget: 625, spent: 545 },
  { month: 8, category: 'transport', budget: 375, spent: 356 },
];
