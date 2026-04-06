using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NorthStarShelter.API.Data;
using NorthStarShelter.API.Helpers;
using NorthStarShelter.API.Models;

namespace NorthStarShelter.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SafehouseMonthlyMetricsController : ControllerBase
{
    private readonly AppDbContext _db;

    public SafehouseMonthlyMetricsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<PaginatedList<SafehouseMonthlyMetric>>> GetBySafehouse(
        [FromQuery] int safehouseId,
        [FromQuery] DateOnly? from = null,
        [FromQuery] DateOnly? to = null,
        [FromQuery] int pageNum = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var query = _db.SafehouseMonthlyMetrics.AsNoTracking().Where(m => m.SafehouseId == safehouseId);
        if (from.HasValue)
            query = query.Where(m => m.MonthStart >= from.Value);
        if (to.HasValue)
            query = query.Where(m => m.MonthEnd <= to.Value);
        query = query.OrderBy(m => m.MonthStart).ThenBy(m => m.MetricId);
        var (items, total) = await query.ToPageAsync(pageNum, pageSize, cancellationToken);
        return Ok(new PaginatedList<SafehouseMonthlyMetric>(items, total));
    }
}
