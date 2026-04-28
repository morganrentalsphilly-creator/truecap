export const portfolioGrowth = [
  { month: "Oct", value: 820, benchmark: 760 },
  { month: "Nov", value: 880, benchmark: 790 },
  { month: "Dec", value: 950, benchmark: 820 },
  { month: "Jan", value: 1020, benchmark: 870 },
  { month: "Feb", value: 1180, benchmark: 920 },
  { month: "Mar", value: 1340, benchmark: 980 },
  { month: "Apr", value: 1520, benchmark: 1040 },
];

export const cashFlowTrend = [
  { month: "Oct", income: 18.4, expense: 11.2 },
  { month: "Nov", income: 19.1, expense: 11.8 },
  { month: "Dec", income: 20.6, expense: 12.1 },
  { month: "Jan", income: 21.3, expense: 12.6 },
  { month: "Feb", income: 22.0, expense: 12.9 },
  { month: "Mar", income: 22.8, expense: 13.1 },
  { month: "Apr", income: 24.2, expense: 13.4 },
];

export const dealDistribution = [
  { name: "Multi-Family", value: 42, color: "oklch(0.55 0.22 265)" },
  { name: "Single Family", value: 28, color: "oklch(0.68 0.17 158)" },
  { name: "Commercial", value: 18, color: "oklch(0.72 0.16 50)" },
  { name: "House Hack", value: 12, color: "oklch(0.62 0.22 320)" },
];

export const riskReturn = [
  { name: "Sunset Apt", risk: 18, return: 12.4, size: 1250 },
  { name: "Oak Lane", risk: 32, return: 8.6, size: 425 },
  { name: "Harbor View", risk: 24, return: 15.2, size: 2100 },
  { name: "Downtown Tower", risk: 28, return: 11.0, size: 3800 },
  { name: "Riverside", risk: 45, return: 6.4, size: 875 },
  { name: "Maple Grove", risk: 22, return: 9.8, size: 680 },
  { name: "Pine Heights", risk: 16, return: 13.6, size: 1450 },
];

export const marketHeatmap = [
  { city: "Austin, TX", capRate: 6.8, growth: 12.4, demand: 92, signal: "Strong Buy" },
  { city: "Phoenix, AZ", capRate: 7.2, growth: 9.6, demand: 84, signal: "Buy" },
  { city: "Tampa, FL", capRate: 6.4, growth: 11.8, demand: 88, signal: "Strong Buy" },
  { city: "Nashville, TN", capRate: 5.9, growth: 8.2, demand: 76, signal: "Buy" },
  { city: "Raleigh, NC", capRate: 6.1, growth: 7.4, demand: 71, signal: "Neutral" },
  { city: "Denver, CO", capRate: 5.2, growth: 4.8, demand: 62, signal: "Hold" },
];

export const topDeals = [
  {
    name: "Sunset Apartments",
    address: "123 Main St, Los Angeles",
    type: "Multi-Family",
    capRate: 6.8,
    coc: 9.2,
    cashFlow: 3255,
    price: 1250000,
    score: 94,
    signal: "Strong Buy",
  },
  {
    name: "Harbor View Warehouse",
    address: "321 Port Rd, Seattle",
    type: "Commercial",
    capRate: 7.5,
    coc: 11.3,
    cashFlow: 4120,
    price: 2100000,
    score: 91,
    signal: "Strong Buy",
  },
  {
    name: "Downtown Office Tower",
    address: "456 Business Ave, NY",
    type: "Commercial",
    capRate: 5.1,
    coc: 7.4,
    cashFlow: 2256,
    price: 3800000,
    score: 78,
    signal: "Buy",
  },
  {
    name: "Maple Grove SFH",
    address: "789 Oak Lane, Austin",
    type: "Single Family",
    capRate: 4.2,
    coc: 5.8,
    cashFlow: 980,
    price: 425000,
    score: 64,
    signal: "Hold",
  },
  {
    name: "Riverside Townhomes",
    address: "654 River Walk, Chicago",
    type: "Multi-Family",
    capRate: 3.9,
    coc: 4.1,
    cashFlow: -495,
    price: 875000,
    score: 38,
    signal: "Avoid",
  },
];

export const aiInsights = [
  {
    title: "Tampa market heating up",
    body: "Cap rates compressing 0.4% MoM. Lock acquisitions before Q3.",
    tone: "opportunity" as const,
  },
  {
    title: "Riverside Townhomes underperforming",
    body: "Negative cash flow and DSCR below 1.0. Consider exit scenario.",
    tone: "risk" as const,
  },
  {
    title: "Tax strategy unlocked",
    body: "Cost segregation could save $42K on Sunset Apartments this year.",
    tone: "tip" as const,
  },
];
