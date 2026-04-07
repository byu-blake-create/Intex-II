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
    public async Task<ActionResult<SummaryDto>> Summary(CancellationToken cancellationToken)
    {
        var active = await _db.Residents.AsNoTracking().CountAsync(r => r.CaseStatus == "Active", cancellationToken);
        var since = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));
        var donationCount = 0;
        var donationSum = 0m;

        try
        {
            // Keep the heavy lifting in Postgres so the dashboard summary does not
            // time out pulling donation rows over the network.
            donationCount = await _db.Donations.AsNoTracking()
                .CountAsync(d => d.DonationDate >= since, cancellationToken);
            donationSum = await _db.Donations.AsNoTracking()
                .Where(d => d.DonationDate >= since)
                .SumAsync(d => d.Amount ?? 0, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Dashboard donation aggregates timed out. Returning fallback values.");
        }

        var from = DateOnly.FromDateTime(DateTime.UtcNow);
        var to = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(60));
        var conferences = await _db.InterventionPlans.AsNoTracking()
            .CountAsync(p => p.CaseConferenceDate >= from && p.CaseConferenceDate <= to, cancellationToken);
        return Ok(new SummaryDto(active, donationCount, donationSum, conferences));
    }

    [HttpGet("donations-by-month")]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<object>>> DonationsByMonth(
        [FromQuery] int months = 12,
        CancellationToken cancellationToken = default)
    {
        months = Math.Clamp(months, 1, 36);
        var start = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-months));
        var rows = await _db.Donations.AsNoTracking()
            .Where(d => d.DonationDate >= start && d.Amount != null)
            .ToListAsync(cancellationToken);
        var grouped = rows
            .GroupBy(d => d.DonationDate!.Value.ToString("yyyy-MM"))
            .Select(g => new { month = g.Key, total = g.Sum(x => x.Amount ?? 0) })
            .OrderBy(x => x.month)
            .ToList();
        return Ok(grouped);
    }

    [HttpGet("residents-by-category")]
    [Authorize]
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
