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
    private readonly ILogger<ReportsController> _logger;

    public ReportsController(AppDbContext db, ILogger<ReportsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    public record SummaryDto(
        int ActiveResidents,
        int TotalDonationsLast30Days,
        decimal DonationAmountLast30Days,
        int UpcomingCaseConferences);

    [HttpGet("summary")]
    [AllowAnonymous]
    [ResponseCache(Duration = 60)]
    public async Task<ActionResult<SummaryDto>> Summary(CancellationToken cancellationToken)
    {
        var since = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));
        var from = DateOnly.FromDateTime(DateTime.UtcNow);
        var to = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(60));

        // Single round-trip: compute all four aggregates in one SQL statement.
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

    // Matches the column aliases returned by the summary SQL above.
    private sealed class SummaryRow
    {
        public int ActiveResidents { get; set; }
        public int DonationCount { get; set; }
        public decimal DonationSum { get; set; }
        public int Conferences { get; set; }
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

        // Group and sum entirely in SQL Server — never pull individual rows.
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
}
