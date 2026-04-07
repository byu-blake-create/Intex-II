using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NorthStarShelter.API.Data;

namespace NorthStarShelter.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ReportsController(AppDbContext db)
    {
        _db = db;
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

    [HttpGet("summary")]
    [AllowAnonymous]
    [ResponseCache(Duration = 60)]
    public async Task<ActionResult<SummaryDto>> Summary(CancellationToken cancellationToken)
    {
        var since = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));
        var from = DateOnly.FromDateTime(DateTime.UtcNow);
        var to = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(60));

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
        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);
        var recentDonationsSince = today.AddDays(-30);
        var outreachSince = today.AddDays(-90);
        var recentVisitSince = today.AddDays(-90);
        var snapshotLabel = $"Updated {now:MMM d, yyyy}";

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
            .Where(p => p.Platform != null && p.EngagementRate != null)
            .GroupBy(p => p.Platform!)
            .Select(g => new
            {
                Platform = g.Key,
                AverageRate = g.Average(p => p.EngagementRate ?? 0),
                PostCount = g.Count()
            })
            .OrderByDescending(g => g.AverageRate)
            .FirstOrDefaultAsync(cancellationToken);

        var cards = new List<CommandCenterCardDto>
        {
            new(
                "donor-watchlist",
                "alert",
                "Supporters due for outreach",
                outreachQueue.ToString(),
                "Active supporters have not recorded a donation in the last 90 days.",
                topRecentDonor is null
                    ? "No recent donation activity has been recorded yet."
                    : $"{topRecentDonor.DisplayName} currently leads recent giving with ${topRecentDonor.Total:N0} in the last 30 days.",
                "/staff/donors",
                "Open donor workbench",
                new CommandCenterModelDto("Live donor activity", "db-live", snapshotLabel, "Window", "90 days", "Based on the last recorded donation date per supporter.")),
            new(
                "top-opportunities",
                "opportunity",
                "Recent donor activity",
                recentDonorActivity.ToString(),
                "Unique supporters gave in the last 30 days.",
                topRecentDonor is null
                    ? "Recent donor activity will appear here once new donations are recorded."
                    : $"{topRecentDonor.DisplayName} is the top donor in the current 30-day window.",
                "/staff/donors",
                "Review recent donors",
                new CommandCenterModelDto("Recent gifts", "db-live", snapshotLabel, "Window", "30 days", "Counts supporters with at least one recent donation.")),
            new(
                "resident-triage",
                "care",
                "Open incident follow-up",
                unresolvedIncidentCount.ToString(),
                "Incident reports still need review or an explicit resolution.",
                latestIncident is null
                    ? "No unresolved incident reports are currently open."
                    : $"Resident {latestIncident.ResidentId} is the latest open case ({latestIncident.Severity ?? "severity unspecified"}) from {latestIncident.IncidentDate:yyyy-MM-dd}.",
                "/staff/caseload",
                "Open caseload",
                new CommandCenterModelDto("Incident backlog", "db-live", snapshotLabel, "Status", "Unresolved", "Derived from incident records flagged unresolved or follow-up required.")),
            new(
                "reintegration-ready",
                "progress",
                "Positive visit outcomes",
                positiveVisitCount.ToString(),
                "Positive home visitation outcomes were recorded in the last 90 days.",
                topResidentVisitCount is null
                    ? "No positive visit outcomes are available in the current lookback window."
                    : $"Resident {topResidentVisitCount.ResidentId} has the highest count of recent positive visit outcomes ({topResidentVisitCount.Count}).",
                "/staff/visitations",
                "Open visitation planning",
                new CommandCenterModelDto("Visit outcomes", "db-live", snapshotLabel, "Window", "90 days", "Counts positive home visitation outcomes.")),
            new(
                "safehouse-forecast",
                "forecast",
                "Highest active caseload",
                (safehouseLoad?.ActiveResidents ?? 0).ToString(),
                $"{safehouseLoad?.Name ?? "No safehouse data"} currently has the highest active resident count.",
                safehouseLoad is null
                    ? "No safehouse occupancy data is available."
                    : "Active resident counts are derived directly from the current resident roster.",
                "/staff/reports",
                "Open operational reports",
                new CommandCenterModelDto("Current occupancy", "db-live", snapshotLabel, "Scope", "Active residents", "Calculated from the live Residents table.")),
            new(
                "outreach-highlight",
                "outreach",
                "Top engagement platform",
                topPlatform is null ? "0.0%" : $"{topPlatform.AverageRate:P1}",
                topPlatform is null
                    ? "No social engagement data is available yet."
                    : $"{topPlatform.Platform} currently leads average engagement across recorded posts.",
                topPlatform is null
                    ? "Populate the SocialMediaPosts table to unlock outreach analytics."
                    : $"{topPlatform.PostCount} posts contributed to the current average engagement rate.",
                "/staff/social",
                "Open social workspace",
                new CommandCenterModelDto("Social engagement", "db-live", snapshotLabel, "Posts sampled", topPlatform?.PostCount.ToString() ?? "0", "Averages the stored engagement rate by platform.")),
        };

        var priorities = new List<CommandCenterPriorityDto>
        {
            new(
                "Work the outreach queue",
                "Start with supporters who have gone 90 days without a recorded gift, then review the recent-donor list while activity is fresh.",
                "/staff/donors",
                "Open donor workbench"),
            new(
                "Clear open incident follow-up",
                unresolvedIncidentCount == 0
                    ? "There are no unresolved incident reports right now."
                    : "Review unresolved incident reports before opening new resident work.",
                "/staff/caseload",
                "Open caseload"),
            new(
                "Use recent visit outcomes for reintegration review",
                "Positive visit history is the clearest live signal available for reintegration conversations today.",
                "/staff/visitations",
                "Open visitations"),
        };

        var lanes = new List<CommandCenterLaneDto>
        {
            new("Donors", "Live supporter and donation records from the production database.", "/staff/donors"),
            new("Caseload", "Resident records, incidents, and protected case details from the production database.", "/staff/caseload"),
            new("Visitations", "Home visitation history and recent outcomes from the production database.", "/staff/visitations"),
            new("Reports", "Operational summaries and donation trends computed from the production database.", "/staff/reports"),
        };

        var heroChips = new List<string>
        {
            $"{outreachQueue} supporters need outreach review",
            $"{unresolvedIncidentCount} incident follow-ups are open",
            $"{positiveVisitCount} positive visits logged in 90 days",
            $"{activeResidents} active residents currently recorded",
        };

        var summary = string.Join(" ",
            $"{outreachQueue} supporters are currently outside the 90-day donation window.",
            $"{unresolvedIncidentCount} incident follow-ups remain open.",
            $"{positiveVisitCount} positive visit outcomes were recorded in the last 90 days.");

        var dto = new CommandCenterDto(
            snapshotLabel,
            summary,
            "These signals come from the live SQL database and should be reviewed alongside the full resident and donor record before action is taken.",
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
        var start = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-months));

        var grouped = await _db.Donations.AsNoTracking()
            .Where(d => d.DonationDate >= start && d.Amount != null)
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

    private sealed class SummaryRow
    {
        public int ActiveResidents { get; set; }
        public int DonationCount { get; set; }
        public decimal DonationSum { get; set; }
        public int Conferences { get; set; }
    }
}
