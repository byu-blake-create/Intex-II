using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NorthStarShelter.API.Data;
using NorthStarShelter.API.Services;

namespace NorthStarShelter.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly MlArtifactsService _mlArtifacts;

    public ReportsController(AppDbContext db, MlArtifactsService mlArtifacts)
    {
        _db = db;
        _mlArtifacts = mlArtifacts;
    }

    public record SummaryDto(
        int ActiveResidents,
        int TotalDonationsLast30Days,
        decimal DonationAmountLast30Days,
        int UpcomingCaseConferences);

    public record CommandCenterModelDto(
        string Name,
        string Version,
        string TrainedAt,
        string MetricLabel,
        string MetricValue,
        string? TopFactor = null);

    public record CommandCenterCardDto(
        string Id,
        string Tone,
        string Title,
        string Value,
        string PlainLanguage,
        string Detail,
        string Route,
        string RouteLabel,
        CommandCenterModelDto Model);

    public record CommandCenterPriorityDto(
        string Title,
        string Detail,
        string Route,
        string RouteLabel);

    public record CommandCenterLaneDto(
        string Title,
        string Description,
        string Route);

    public record CommandCenterDto(
        string SnapshotLabel,
        string Summary,
        string Disclaimer,
        IReadOnlyList<string> HeroChips,
        IReadOnlyList<CommandCenterCardDto> Cards,
        IReadOnlyList<CommandCenterPriorityDto> Priorities,
        IReadOnlyList<CommandCenterLaneDto> Lanes);

    // Returns the first day of the month after the latest recorded data date.
    // This lets the dashboard behave as if "today" is just after the data ends,
    // preventing all time-windowed queries from returning zero because real UTC now
    // is far ahead of the data set.
    private async Task<DateOnly> GetReferenceDateAsync(CancellationToken ct)
    {
        // Anchor to donations — they drive the 30/90-day donor windows and tend to
        // lag behind visit/session data. Using a newer table's max date would push
        // the window forward and make donation queries return zero.
        var actualToday = DateOnly.FromDateTime(DateTime.UtcNow);

        var latestDonation = await _db.Donations.AsNoTracking()
            .Where(d => d.DonationDate != null && d.DonationDate <= actualToday)
            .MaxAsync(d => (DateOnly?)d.DonationDate, ct);

        if (!latestDonation.HasValue)
            return actualToday;

        // Step to the first of the month after the latest donation month
        return new DateOnly(latestDonation.Value.Year, latestDonation.Value.Month, 1).AddMonths(1);
    }

    [HttpGet("summary")]
    [AllowAnonymous]
    [ResponseCache(Duration = 60)]
    public async Task<ActionResult<SummaryDto>> Summary(CancellationToken cancellationToken)
    {
        var referenceDate = await GetReferenceDateAsync(cancellationToken);
        var since = referenceDate.AddDays(-30);
        var from = referenceDate;
        var to = referenceDate.AddDays(60);

        var row = await _db.Database
            .SqlQueryRaw<SummaryRow>(
                """
                SELECT
                    (SELECT CAST(count(*) AS int) FROM Residents WHERE CaseStatus = 'Active') AS ActiveResidents,
                    (SELECT CAST(count(*) AS int) FROM Donations WHERE DonationDate >= {0}) AS DonationCount,
                    (SELECT ISNULL(SUM(Amount), 0) FROM Donations WHERE DonationDate >= {0}) AS DonationSum,
                    (SELECT CAST(count(*) AS int) FROM InterventionPlans WHERE CaseConferenceDate >= {1} AND CaseConferenceDate <= {2}) AS Conferences
                """, since, from, to)
            .FirstOrDefaultAsync(cancellationToken);

        return Ok(new SummaryDto(
            row?.ActiveResidents ?? 0,
            row?.DonationCount ?? 0,
            row?.DonationSum ?? 0,
            row?.Conferences ?? 0));
    }

    [HttpGet("command-center")]
    [Authorize(Roles = "Admin,Staff")]
    [ResponseCache(Duration = 60)]
    public async Task<ActionResult<CommandCenterDto>> CommandCenter(CancellationToken cancellationToken)
    {
        var today = await GetReferenceDateAsync(cancellationToken);
        var recentDonationsSince = today.AddDays(-30);
        var outreachSince = today.AddDays(-90);
        var recentVisitSince = today.AddDays(-90);
        var snapshotLabel = $"Data through {today.AddDays(-1):MMM yyyy}";

        var donorRetentionPredictionsTask = _mlArtifacts.GetDonorRetentionPredictionsAsync(cancellationToken);
        var donationValuePredictionsTask = _mlArtifacts.GetDonationValuePredictionsAsync(cancellationToken);
        var residentRiskPredictionsTask = _mlArtifacts.GetResidentRiskPredictionsAsync(cancellationToken);
        var reintegrationPredictionsTask = _mlArtifacts.GetReintegrationPredictionsAsync(cancellationToken);
        var safehouseForecastPredictionsTask = _mlArtifacts.GetSafehouseForecastPredictionsAsync(cancellationToken);
        var donorRetentionMetadataTask = _mlArtifacts.GetDonorRetentionMetadataAsync(cancellationToken);
        var donationValueMetadataTask = _mlArtifacts.GetDonationValueMetadataAsync(cancellationToken);
        var residentRiskMetadataTask = _mlArtifacts.GetResidentRiskMetadataAsync(cancellationToken);
        var reintegrationMetadataTask = _mlArtifacts.GetReintegrationMetadataAsync(cancellationToken);
        var safehouseForecastMetadataTask = _mlArtifacts.GetSafehouseForecastMetadataAsync(cancellationToken);
        var socialMetadataTask = _mlArtifacts.GetSocialPostPerformanceMetadataAsync(cancellationToken);

        var activeResidents = await _db.Residents.AsNoTracking()
            .CountAsync(r => r.CaseStatus == "Active", cancellationToken);

        var recentDonorActivity = await _db.Donations.AsNoTracking()
            .Where(d => d.DonationDate >= recentDonationsSince)
            .Select(d => d.SupporterId)
            .Distinct()
            .CountAsync(cancellationToken);

        var outreachQueue = await _db.Supporters.AsNoTracking()
            .Where(s => s.Status == null || s.Status == "Active")
            .CountAsync(s => !_db.Donations.Any(
                d => d.SupporterId == s.SupporterId && d.DonationDate >= outreachSince), cancellationToken);

        var topRecentDonor = await _db.Supporters.AsNoTracking()
            .Select(s => new
            {
                s.DisplayName,
                Total = _db.Donations
                    .Where(d => d.SupporterId == s.SupporterId && d.DonationDate >= recentDonationsSince)
                    .Sum(d => d.Amount) ?? 0m
            })
            .Where(x => x.Total > 0)
            .OrderByDescending(x => x.Total)
            .FirstOrDefaultAsync(cancellationToken);

        var unresolvedIncidentCount = await _db.IncidentReports.AsNoTracking()
            .CountAsync(i => i.Resolved != true || i.FollowUpRequired == true, cancellationToken);

        var latestIncident = await _db.IncidentReports.AsNoTracking()
            .Where(i => i.Resolved != true || i.FollowUpRequired == true)
            .OrderByDescending(i => i.IncidentDate)
            .ThenByDescending(i => i.IncidentId)
            .Select(i => new { i.ResidentId, i.Severity, i.IncidentDate })
            .FirstOrDefaultAsync(cancellationToken);

        var positiveVisitCount = await _db.HomeVisitations.AsNoTracking()
            .CountAsync(v => v.VisitOutcome == "Positive" && v.VisitDate >= recentVisitSince, cancellationToken);

        var topResidentVisitCount = await _db.HomeVisitations.AsNoTracking()
            .Where(v => v.VisitOutcome == "Positive" && v.VisitDate >= recentVisitSince)
            .GroupBy(v => v.ResidentId)
            .Select(g => new { ResidentId = g.Key, Count = g.Count() })
            .OrderByDescending(g => g.Count)
            .FirstOrDefaultAsync(cancellationToken);

        var safehouseLoad = await _db.Safehouses.AsNoTracking()
            .Select(s => new
            {
                s.Name,
                ActiveResidents = _db.Residents.Count(r => r.SafehouseId == s.SafehouseId && r.CaseStatus == "Active")
            })
            .OrderByDescending(s => s.ActiveResidents)
            .ThenBy(s => s.Name)
            .FirstOrDefaultAsync(cancellationToken);

        var topPlatform = await _db.SocialMediaPosts.AsNoTracking()
            .Where(p => p.Platform != null && p.ClickThroughs != null && p.Reach != null && p.Reach > 0)
            .GroupBy(p => p.Platform!)
            .Select(g => new
            {
                Platform = g.Key,
                AverageRate = g.Average(p => (double)p.ClickThroughs!.Value / p.Reach!.Value),
                PostCount = g.Count()
            })
            .OrderByDescending(g => g.AverageRate)
            .FirstOrDefaultAsync(cancellationToken);

        await Task.WhenAll(
            donorRetentionPredictionsTask,
            donationValuePredictionsTask,
            residentRiskPredictionsTask,
            reintegrationPredictionsTask,
            safehouseForecastPredictionsTask,
            donorRetentionMetadataTask,
            donationValueMetadataTask,
            residentRiskMetadataTask,
            reintegrationMetadataTask,
            safehouseForecastMetadataTask,
            socialMetadataTask);

        var donorRetentionPredictions = donorRetentionPredictionsTask.Result;
        var donationValuePredictions = donationValuePredictionsTask.Result;
        var residentRiskPredictions = residentRiskPredictionsTask.Result;
        var reintegrationPredictions = reintegrationPredictionsTask.Result;
        var safehouseForecastPredictions = safehouseForecastPredictionsTask.Result;
        var donorRetentionMetadata = donorRetentionMetadataTask.Result;
        var donationValueMetadata = donationValueMetadataTask.Result;
        var residentRiskMetadata = residentRiskMetadataTask.Result;
        var reintegrationMetadata = reintegrationMetadataTask.Result;
        var safehouseForecastMetadata = safehouseForecastMetadataTask.Result;
        var socialMetadata = socialMetadataTask.Result;

        var donorLookupIds = donorRetentionPredictions
            .OrderByDescending(p => p.ChurnProbability)
            .Take(12)
            .Select(p => p.SupporterId)
            .Concat(donationValuePredictions
                .OrderByDescending(p => p.HighValueProbability)
                .Take(12)
                .Select(p => p.SupporterId))
            .Distinct()
            .ToArray();

        var donorLookup = donorLookupIds.Length == 0
            ? new Dictionary<int, (string DisplayName, string? Email)>()
            : (await _db.Supporters.AsNoTracking()
                .Where(s => donorLookupIds.Contains(s.SupporterId))
                .Select(s => new
                {
                    s.SupporterId,
                    s.DisplayName,
                    s.Email
                })
                .ToDictionaryAsync(
                    s => s.SupporterId,
                    s => (s.DisplayName, s.Email),
                    cancellationToken));

        var residentLookupIds = residentRiskPredictions
            .OrderByDescending(p => p.ConcernProbability)
            .Take(12)
            .Select(p => p.ResidentId)
            .Concat(reintegrationPredictions
                .OrderByDescending(p => p.FavorableProbability)
                .Take(12)
                .Select(p => p.ResidentId))
            .Distinct()
            .ToArray();

        var residentLookup = residentLookupIds.Length == 0
            ? new Dictionary<int, (string CaseControlNo, int SafehouseId)>()
            : (await _db.Residents.AsNoTracking()
                .Where(r => residentLookupIds.Contains(r.ResidentId))
                .Select(r => new
                {
                    r.ResidentId,
                    r.CaseControlNo,
                    r.SafehouseId
                })
                .ToDictionaryAsync(
                    r => r.ResidentId,
                    r => (r.CaseControlNo, r.SafehouseId),
                    cancellationToken));

        var nextForecastMonth = safehouseForecastPredictions
            .Select(p => p.Month)
            .Where(m => !string.IsNullOrWhiteSpace(m))
            .OrderBy(m => m)
            .FirstOrDefault();

        var nextSafehouseForecasts = safehouseForecastPredictions
            .Where(p => string.Equals(p.Month, nextForecastMonth, StringComparison.Ordinal))
            .ToArray();

        var safehouseLookupIds = residentLookup.Values.Select(v => v.SafehouseId)
            .Concat(nextSafehouseForecasts.Select(p => p.SafehouseId))
            .Distinct()
            .ToArray();

        var safehouseLookup = safehouseLookupIds.Length == 0
            ? new Dictionary<int, (string Name, int? CapacityGirls)>()
            : (await _db.Safehouses.AsNoTracking()
                .Where(s => safehouseLookupIds.Contains(s.SafehouseId))
                .Select(s => new
                {
                    s.SafehouseId,
                    s.Name,
                    s.CapacityGirls
                })
                .ToDictionaryAsync(
                    s => s.SafehouseId,
                    s => (s.Name, s.CapacityGirls),
                    cancellationToken));

        var donorWatchlistCount = donorRetentionPredictions.Count(p => p.ChurnProbability >= 0.75);
        var topDonorPrediction = donorRetentionPredictions
            .OrderByDescending(p => p.ChurnProbability)
            .FirstOrDefault();

        var topOpportunityPrediction = donationValuePredictions
            .OrderByDescending(p => p.HighValueProbability)
            .FirstOrDefault();
        var topOpportunityCount = donationValuePredictions.Count(p =>
            string.Equals(p.PredictedTier, "High Opportunity", StringComparison.OrdinalIgnoreCase) ||
            p.HighValueProbability >= 0.6);

        var highRiskResidentCount = residentRiskPredictions.Count(p =>
            string.Equals(p.RiskLevel, "High", StringComparison.OrdinalIgnoreCase) ||
            p.ConcernProbability >= 0.25);
        var topResidentPrediction = residentRiskPredictions
            .OrderByDescending(p => p.ConcernProbability)
            .FirstOrDefault();

        var reintegrationReadyCount = reintegrationPredictions.Count(p =>
            string.Equals(p.RiskLevel, "High", StringComparison.OrdinalIgnoreCase) ||
            p.FavorableProbability >= 0.6);
        var topReintegrationPrediction = reintegrationPredictions
            .OrderByDescending(p => p.FavorableProbability)
            .FirstOrDefault();

        var topSafehouseForecast = nextSafehouseForecasts
            .Select(p =>
            {
                safehouseLookup.TryGetValue(p.SafehouseId, out var safehouse);
                var utilization = safehouse.CapacityGirls is > 0
                    ? p.PredictedActiveResidents / safehouse.CapacityGirls.Value
                    : 0;
                return new
                {
                    Forecast = p,
                    SafehouseName = safehouse.Name ?? $"Safehouse {p.SafehouseId}",
                    safehouse.CapacityGirls,
                    Utilization = utilization
                };
            })
            .OrderByDescending(x => x.Utilization)
            .ThenByDescending(x => x.Forecast.PredictedActiveResidents)
            .FirstOrDefault();

        var safehouseAttentionCount = nextSafehouseForecasts.Count(p =>
        {
            safehouseLookup.TryGetValue(p.SafehouseId, out var safehouse);
            return safehouse.CapacityGirls is > 0 &&
                   p.PredictedActiveResidents / safehouse.CapacityGirls.Value >= 0.85;
        });

        var cards = new List<CommandCenterCardDto>
        {
            new(
                "donor-watchlist",
                "alert",
                "Supporters flagged for churn review",
                donorRetentionPredictions.Count > 0 ? donorWatchlistCount.ToString() : outreachQueue.ToString(),
                donorRetentionPredictions.Count > 0
                    ? "The donor retention pipeline predicts these supporters are most likely to lapse in the next 90 days."
                    : "Active supporters have not recorded a donation in the last 90 days.",
                donorRetentionPredictions.Count > 0 && topDonorPrediction is not null
                    ? $"{donorLookup.GetValueOrDefault(topDonorPrediction.SupporterId).DisplayName ?? $"Supporter {topDonorPrediction.SupporterId}"} is the highest-risk donor at {topDonorPrediction.ChurnProbability:P0}; top driver: {HumanizeFeature(topDonorPrediction.TopFeature)}."
                    : topRecentDonor is null
                        ? "No recent donation activity has been recorded yet."
                        : $"{topRecentDonor.DisplayName} currently leads recent giving with ${topRecentDonor.Total:N0} in the last 30 days.",
                "/admin/donors",
                "Open donor workbench",
                BuildModelInfo(
                    donorRetentionMetadata,
                    "Donor retention model",
                    donorRetentionPredictions.Count > 0 ? "artifact-backed" : "db-live",
                    snapshotLabel,
                    "Window",
                    "90 days",
                    topDonorPrediction is not null ? $"Top factor: {HumanizeFeature(topDonorPrediction.TopFeature)}" : "Based on the last recorded donation date per supporter.")),
            new(
                "top-opportunities",
                "opportunity",
                "High-value donor opportunities",
                donationValuePredictions.Count > 0 ? topOpportunityCount.ToString() : recentDonorActivity.ToString(),
                donationValuePredictions.Count > 0
                    ? "The donation value pipeline highlights donors most likely to give at or above the modeled 90-day threshold."
                    : "Unique supporters gave in the last 30 days.",
                donationValuePredictions.Count > 0 && topOpportunityPrediction is not null
                    ? $"{donorLookup.GetValueOrDefault(topOpportunityPrediction.SupporterId).DisplayName ?? $"Supporter {topOpportunityPrediction.SupporterId}"} leads the opportunity list at {topOpportunityPrediction.HighValueProbability:P0} for a high-value gift."
                    : topRecentDonor is null
                        ? "Recent donor activity will appear here once new donations are recorded."
                        : $"{topRecentDonor.DisplayName} is the top donor in the current 30-day window.",
                "/admin/donors",
                "Review recent donors",
                BuildModelInfo(
                    donationValueMetadata,
                    "Donation value model",
                    donationValuePredictions.Count > 0 ? "artifact-backed" : "db-live",
                    snapshotLabel,
                    "Window",
                    "30 days",
                    topOpportunityPrediction is not null ? $"Opportunity tier: {topOpportunityPrediction.PredictedTier ?? "Standard"}" : "Counts supporters with at least one recent donation.")),
            new(
                "resident-triage",
                "care",
                "Residents flagged for extra support",
                residentRiskPredictions.Count > 0 ? highRiskResidentCount.ToString() : unresolvedIncidentCount.ToString(),
                residentRiskPredictions.Count > 0
                    ? "The resident risk pipeline flags residents whose recent patterns align with higher support need."
                    : "Incident reports still need review or an explicit resolution.",
                residentRiskPredictions.Count > 0 && topResidentPrediction is not null
                    ? $"{residentLookup.GetValueOrDefault(topResidentPrediction.ResidentId).CaseControlNo ?? $"Resident {topResidentPrediction.ResidentId}"} is the highest-risk case at {topResidentPrediction.ConcernProbability:P0}; top driver: {HumanizeFeature(topResidentPrediction.TopFactor)}."
                    : latestIncident is null
                        ? "No unresolved incident reports are currently open."
                        : $"Resident {latestIncident.ResidentId} is the latest open case ({latestIncident.Severity ?? "severity unspecified"}) from {latestIncident.IncidentDate:yyyy-MM-dd}.",
                "/admin/caseload",
                "Open caseload",
                BuildModelInfo(
                    residentRiskMetadata,
                    "Resident risk model",
                    residentRiskPredictions.Count > 0 ? "artifact-backed" : "db-live",
                    snapshotLabel,
                    "Status",
                    "Unresolved",
                    topResidentPrediction is not null ? $"Top factor: {HumanizeFeature(topResidentPrediction.TopFactor)}" : "Derived from incident records flagged unresolved or follow-up required.")),
            new(
                "reintegration-ready",
                "progress",
                "Residents ready for reintegration review",
                reintegrationPredictions.Count > 0 ? reintegrationReadyCount.ToString() : positiveVisitCount.ToString(),
                reintegrationPredictions.Count > 0
                    ? "The reintegration readiness pipeline highlights residents most likely to sustain a favorable visitation outcome."
                    : "Positive home visitation outcomes were recorded in the last 90 days.",
                reintegrationPredictions.Count > 0 && topReintegrationPrediction is not null
                    ? $"{residentLookup.GetValueOrDefault(topReintegrationPrediction.ResidentId).CaseControlNo ?? $"Resident {topReintegrationPrediction.ResidentId}"} leads the readiness list at {topReintegrationPrediction.FavorableProbability:P0}; top driver: {HumanizeFeature(topReintegrationPrediction.TopFactor)}."
                    : topResidentVisitCount is null
                        ? "No positive visit outcomes are available in the current lookback window."
                        : $"Resident {topResidentVisitCount.ResidentId} has the highest count of recent positive visit outcomes ({topResidentVisitCount.Count}).",
                "/admin/visitations",
                "Open visitation planning",
                BuildModelInfo(
                    reintegrationMetadata,
                    "Reintegration readiness model",
                    reintegrationPredictions.Count > 0 ? "artifact-backed" : "db-live",
                    snapshotLabel,
                    "Window",
                    "90 days",
                    topReintegrationPrediction is not null ? $"Top factor: {HumanizeFeature(topReintegrationPrediction.TopFactor)}" : "Counts positive home visitation outcomes.")),
            new(
                "safehouse-forecast",
                "forecast",
                "Safehouses nearing capacity",
                nextSafehouseForecasts.Length > 0 ? safehouseAttentionCount.ToString() : (safehouseLoad?.ActiveResidents ?? 0).ToString(),
                nextSafehouseForecasts.Length > 0
                    ? $"The safehouse forecast projects capacity pressure for {nextForecastMonth ?? "the next cycle"}."
                    : $"{safehouseLoad?.Name ?? "No safehouse data"} currently has the highest active resident count.",
                nextSafehouseForecasts.Length > 0 && topSafehouseForecast is not null
                    ? $"{topSafehouseForecast.SafehouseName} leads the forecast at {topSafehouseForecast.Forecast.PredictedActiveResidents:N1} residents ({topSafehouseForecast.Utilization:P0} of capacity)."
                    : safehouseLoad is null
                        ? "No safehouse occupancy data is available."
                        : "Active resident counts are derived directly from the current resident roster.",
                "/admin/reports",
                "Open operational reports",
                BuildModelInfo(
                    safehouseForecastMetadata,
                    "Safehouse forecast model",
                    nextSafehouseForecasts.Length > 0 ? "artifact-backed" : "db-live",
                    snapshotLabel,
                    "Scope",
                    "Active residents",
                    topSafehouseForecast is not null ? $"Forecast month: {nextForecastMonth}" : "Calculated from the live Residents table.")),
            new(
                "outreach-highlight",
                "outreach",
                "Top click-through platform",
                topPlatform is null ? "0.0%" : $"{topPlatform.AverageRate:P1}",
                topPlatform is null
                    ? "No social click-through data is available yet."
                    : $"{topPlatform.Platform} currently leads average click-through rate across recorded posts.",
                topPlatform is null
                    ? "Launch the Social Suite to score a draft post with the live prediction service."
                    : $"{topPlatform.PostCount} posts contributed to the current average click-through rate.",
                "/admin/social",
                "Open social workspace",
                BuildModelInfo(
                    socialMetadata,
                    "Social suite models",
                    "artifact-backed",
                    snapshotLabel,
                    "Posts sampled",
                    topPlatform?.PostCount.ToString() ?? "0",
                    topPlatform is null ? "Draft post scoring is ready for live use." : $"Observed CTR leader: {topPlatform.Platform}")),
        };

        var priorities = new List<CommandCenterPriorityDto>
        {
            new(
                "Work the outreach queue",
                donorRetentionPredictions.Count > 0
                    ? "Start with the churn watchlist, then pair those donors with the top-opportunity list for higher-value asks."
                    : "Start with supporters who have gone 90 days without a recorded gift, then review the recent-donor list while activity is fresh.",
                "/admin/donors",
                "Open donor workbench"),
            new(
                "Clear open incident follow-up",
                residentRiskPredictions.Count > 0
                    ? (highRiskResidentCount == 0
                        ? "No residents are currently flagged high-risk by the latest model run."
                        : "Review residents at the top of the risk watchlist before opening lower-priority case work.")
                    : (unresolvedIncidentCount == 0
                        ? "There are no unresolved incident reports right now."
                        : "Review unresolved incident reports before opening new resident work."),
                "/admin/caseload",
                "Open caseload"),
            new(
                "Use recent visit outcomes for reintegration review",
                reintegrationPredictions.Count > 0
                    ? "Use the reintegration readiness list to focus visitation prep on residents with the strongest modeled outlook."
                    : "Positive visit history is the clearest live signal available for reintegration conversations today.",
                "/admin/visitations",
                "Open visitations"),
        };

        var lanes = new List<CommandCenterLaneDto>
        {
            new("Donors", "Live supporter and donation records from the production database.", "/admin/donors"),
            new("Residents", "Resident records, incidents, and protected case details from the production database.", "/admin/caseload"),
            new("Safehouses", "Safehouse assignments, capacity, and resident placement from the production database.", "/admin/safehouses"),
        };

        var heroChips = new List<string>
        {
            donorRetentionPredictions.Count > 0
                ? $"{donorWatchlistCount} donors flagged for churn review"
                : $"{outreachQueue} supporters need outreach review",
            residentRiskPredictions.Count > 0
                ? $"{highRiskResidentCount} residents flagged high-risk"
                : $"{unresolvedIncidentCount} incident follow-ups are open",
            reintegrationPredictions.Count > 0
                ? $"{reintegrationReadyCount} residents ready for reintegration review"
                : $"{positiveVisitCount} positive visits logged in 90 days",
            nextSafehouseForecasts.Length > 0
                ? $"{safehouseAttentionCount} safehouses forecast near capacity"
                : $"{activeResidents} active residents currently recorded",
        };

        var summary = string.Join(" ",
            donorRetentionPredictions.Count > 0
                ? $"{donorWatchlistCount} supporters are currently on the churn watchlist."
                : $"{outreachQueue} supporters are currently outside the 90-day donation window.",
            residentRiskPredictions.Count > 0
                ? $"{highRiskResidentCount} residents are flagged for extra support."
                : $"{unresolvedIncidentCount} incident follow-ups remain open.",
            reintegrationPredictions.Count > 0
                ? $"{reintegrationReadyCount} residents are strong reintegration-review candidates."
                : $"{positiveVisitCount} positive visit outcomes were recorded in the last 90 days.");

        var dto = new CommandCenterDto(
            snapshotLabel,
            summary,
            "These signals combine deployed IS455 model artifacts with live SQL records and should still be reviewed alongside the full resident and donor record before action is taken.",
            heroChips,
            cards,
            priorities,
            lanes);

        return Ok(dto);
    }

    [HttpGet("donations-by-month")]
    [AllowAnonymous]
    [ResponseCache(Duration = 60)]
    public async Task<ActionResult<IReadOnlyList<object>>> DonationsByMonth(
        [FromQuery] int months = 12,
        CancellationToken cancellationToken = default)
    {
        months = Math.Clamp(months, 1, 36);
        var referenceDate = await GetReferenceDateAsync(cancellationToken);
        var start = referenceDate.AddMonths(-months);
        var endExclusive = referenceDate;

        var grouped = await _db.Donations.AsNoTracking()
            .Where(d => d.DonationDate >= start && d.DonationDate < endExclusive && d.Amount != null)
            .GroupBy(d => new { d.DonationDate!.Value.Year, d.DonationDate!.Value.Month })
            .Select(g => new
            {
                year = g.Key.Year,
                mo = g.Key.Month,
                total = g.Sum(x => x.Amount ?? 0)
            })
            .OrderBy(g => g.year).ThenBy(g => g.mo)
            .ToListAsync(cancellationToken);

        var result = grouped.Select(g => new
        {
            month = $"{g.year}-{g.mo:D2}",
            g.total
        });
        return Ok(result);
    }

    [HttpGet("residents-by-category")]
    [Authorize]
    [ResponseCache(Duration = 60)]
    public async Task<ActionResult<Dictionary<string, int>>> ResidentsByCategory(CancellationToken cancellationToken)
    {
        var data = await _db.Residents.AsNoTracking()
            .Where(r => r.CaseCategory != null)
            .GroupBy(r => r.CaseCategory!)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);
        return Ok(data.ToDictionary(x => x.Key, x => x.Count));
    }

    private static CommandCenterModelDto BuildModelInfo(
        ModelMetadata? metadata,
        string fallbackName,
        string fallbackVersion,
        string fallbackTrainedAt,
        string fallbackMetricLabel,
        string fallbackMetricValue,
        string? topFactor)
    {
        if (metadata is null)
        {
            return new CommandCenterModelDto(
                fallbackName,
                fallbackVersion,
                fallbackTrainedAt,
                fallbackMetricLabel,
                fallbackMetricValue,
                topFactor);
        }

        var (metricLabel, metricValue) = PickPrimaryMetric(metadata);
        return new CommandCenterModelDto(
            HumanizeFeature(metadata.Name) ?? fallbackName,
            metadata.ModelType ?? fallbackVersion,
            FormatTimestamp(metadata.TrainedAt) ?? fallbackTrainedAt,
            metricLabel,
            metricValue,
            topFactor);
    }

    private static (string Label, string Value) PickPrimaryMetric(ModelMetadata metadata)
    {
        if (metadata.Metrics is null || metadata.Metrics.Count == 0)
        {
            return ("Metric", "n/a");
        }

        var preferredOrder = new[] { "f1", "roc_auc", "rmse", "mae", "r2", "accuracy", "precision", "recall" };
        foreach (var key in preferredOrder)
        {
            if (metadata.Metrics.TryGetValue(key, out var metric))
            {
                return (FormatMetricLabel(key), metric.ToString("0.###"));
            }
        }

        var first = metadata.Metrics.First();
        return (FormatMetricLabel(first.Key), first.Value.ToString("0.###"));
    }

    private static string FormatMetricLabel(string key) =>
        key.ToUpperInvariant().Replace("_", "-");

    private static string? HumanizeFeature(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        return string.Join(' ',
            raw.Replace("_", " ", StringComparison.Ordinal)
               .Split(' ', StringSplitOptions.RemoveEmptyEntries)
               .Select(part => char.ToUpperInvariant(part[0]) + part[1..]));
    }

    private static string? FormatTimestamp(string? timestamp)
    {
        if (string.IsNullOrWhiteSpace(timestamp))
        {
            return null;
        }

        if (DateTimeOffset.TryParse(timestamp, out var parsed))
        {
            return parsed.ToString("yyyy-MM-dd");
        }

        return timestamp;
    }

    private sealed class SummaryRow
    {
        public int ActiveResidents { get; set; }
        public int DonationCount { get; set; }
        public decimal DonationSum { get; set; }
        public int Conferences { get; set; }
    }
}
