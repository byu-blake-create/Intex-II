export interface AdminDashboardModelInfo {
  name: string
  version: string
  trainedAt: string
  metricLabel: string
  metricValue: string
  topFactor?: string
}

export interface AdminDashboardCard {
  id: string
  tone: 'alert' | 'opportunity' | 'care' | 'progress' | 'forecast' | 'outreach'
  title: string
  value: string
  plainLanguage: string
  detail: string
  route: string
  routeLabel: string
  model: AdminDashboardModelInfo
}

export interface AdminDashboardPriority {
  title: string
  detail: string
  route: string
  routeLabel: string
}

export interface AdminDashboardLane {
  title: string
  description: string
  route: string
}

export interface AdminDashboardData {
  snapshotLabel: string
  summary: string
  disclaimer: string
  heroChips: string[]
  cards: AdminDashboardCard[]
  priorities: AdminDashboardPriority[]
  lanes: AdminDashboardLane[]
}

// Phase 1 uses a local command-center snapshot distilled from the checked-in IS455 model
// artifacts. Swap this module to the /api/ml/* endpoints once the ML controller exists.
const dashboardData: AdminDashboardData = {
  snapshotLabel: 'Updated Apr 6, 2026',
  summary:
    'Retention outreach carries the biggest queue today, reintegration planning has real momentum, and the highest-risk resident signal is narrow enough to review immediately.',
  disclaimer:
    'These model scores are assistive. Staff should review history, context, and current notes before acting on any recommendation.',
  heroChips: [
    '20 donors need retention follow-up',
    '1 resident needs immediate review',
    '30 residents look reintegration-ready',
    'Forecast and outreach models refreshed today',
  ],
  cards: [
    {
      id: 'donor-watchlist',
      tone: 'alert',
      title: 'Donor retention watchlist',
      value: '20',
      plainLanguage: 'High-priority donors need retention outreach this week.',
      detail: 'The current watchlist averages a 92.2% churn probability, led by supporter 25.',
      route: '/staff/donors',
      routeLabel: 'View all donors',
      model: {
        name: 'Donor retention',
        version: 'donor_retention_rf_v2',
        trainedAt: 'Apr 6, 2026',
        metricLabel: 'ROC AUC',
        metricValue: '0.74',
        topFactor: 'Recency gap is the dominant driver.',
      },
    },
    {
      id: 'top-opportunities',
      tone: 'opportunity',
      title: 'Top donor opportunities',
      value: '6',
      plainLanguage: 'A small ask-ready group is showing strong upgrade potential.',
      detail: 'The leading opportunity set averages an 81.6% high-value probability, topped by supporter 9.',
      route: '/staff/donors',
      routeLabel: 'View opportunity queue',
      model: {
        name: 'Donation value',
        version: 'donation_value_rf_v2',
        trainedAt: 'Apr 6, 2026',
        metricLabel: 'Accuracy',
        metricValue: '78.3%',
        topFactor: 'Giving history and recency are carrying most of the signal.',
      },
    },
    {
      id: 'resident-triage',
      tone: 'care',
      title: 'Resident triage',
      value: '1',
      plainLanguage: 'One resident currently crosses the review threshold.',
      detail: 'Resident 27 is the clearest flag at a 63.7% concern probability for the next 90 days.',
      route: '/staff/caseload',
      routeLabel: 'View caseload',
      model: {
        name: 'Resident risk triage',
        version: 'resident_risk_gb_v2',
        trainedAt: 'Apr 6, 2026',
        metricLabel: 'ROC AUC',
        metricValue: '0.98',
        topFactor: 'Recent concern rate is the strongest driver.',
      },
    },
    {
      id: 'reintegration-ready',
      tone: 'progress',
      title: 'Reintegration-ready residents',
      value: '30',
      plainLanguage: 'Several residents look ready for planning conversations and scenario review.',
      detail: 'The ready cohort averages a 74.7% favorable probability, with resident 50 currently leading.',
      route: '/staff/visitations',
      routeLabel: 'View visitation planning',
      model: {
        name: 'Reintegration readiness',
        version: 'reintegration_readiness_gb_v1',
        trainedAt: 'Apr 6, 2026',
        metricLabel: 'ROC AUC',
        metricValue: '0.86',
        topFactor: 'Follow-up completion is the clearest positive lever.',
      },
    },
    {
      id: 'safehouse-forecast',
      tone: 'forecast',
      title: 'Safehouse forecast highlight',
      value: '10',
      plainLanguage: 'Safehouse 1 is carrying the heaviest projected April load.',
      detail: 'The April 2026 forecast centers on 10 active residents, with an 8.5 to 11.5 planning range.',
      route: '/staff/reports',
      routeLabel: 'View forecast reports',
      model: {
        name: 'Safehouse forecasting',
        version: 'safehouse_forecast_gb_v1',
        trainedAt: 'Apr 6, 2026',
        metricLabel: 'R²',
        metricValue: '1.00',
        topFactor: 'Recent occupancy trends and lagged demand shape the forecast.',
      },
    },
    {
      id: 'outreach-highlight',
      tone: 'outreach',
      title: 'Outreach planner highlight',
      value: '15.2%',
      plainLanguage: 'LinkedIn is currently projecting the strongest recent engagement.',
      detail: 'Across the latest 50 scored posts, LinkedIn averages a 15.2% predicted engagement rate over five comparable posts.',
      route: '/staff/reports',
      routeLabel: 'View outreach analytics',
      model: {
        name: 'Social post performance',
        version: 'social_post_performance_gb_v1',
        trainedAt: 'Apr 6, 2026',
        metricLabel: 'R²',
        metricValue: '0.75',
        topFactor: 'Informative tone is the most consistent top factor in recent scores.',
      },
    },
  ],
  priorities: [
    {
      title: 'Start in donors',
      detail: 'Work the retention watchlist first, then pivot into the six high-value opportunities while outreach context is fresh.',
      route: '/staff/donors',
      routeLabel: 'Open donor workbench',
    },
    {
      title: 'Escalate resident 27',
      detail: 'The current triage model only surfaces one urgent resident, which makes the review queue small but time-sensitive.',
      route: '/staff/caseload',
      routeLabel: 'Open caseload',
    },
    {
      title: 'Use visitations for scenario planning',
      detail: 'The reintegration-ready cohort is large enough that the visitation page should become the next decision-support surface.',
      route: '/staff/visitations',
      routeLabel: 'Open visitations',
    },
  ],
  lanes: [
    {
      title: 'Donors',
      description: 'Retention risk and upgrade opportunity queue for outreach actions.',
      route: '/staff/donors',
    },
    {
      title: 'Caseload',
      description: 'Resident triage and supervisor review lane for the highest-risk cases.',
      route: '/staff/caseload',
    },
    {
      title: 'Visitations',
      description: 'Reintegration planning and future what-if analysis surface.',
      route: '/staff/visitations',
    },
    {
      title: 'Reports',
      description: 'Forecasting, outreach analytics, and model credibility monitoring.',
      route: '/staff/reports',
    },
  ],
}

export async function fetchAdminDashboard(): Promise<AdminDashboardData> {
  return Promise.resolve(dashboardData)
}
