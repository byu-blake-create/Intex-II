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
public class IncidentReportsController : ControllerBase
{
    private readonly AppDbContext _db;

    public IncidentReportsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<PaginatedList<IncidentReport>>> GetList(
        [FromQuery] int pageNum = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? safehouseId = null,
        [FromQuery] int? residentId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _db.IncidentReports.AsNoTracking().AsQueryable();
        if (safehouseId.HasValue)
            query = query.Where(i => i.SafehouseId == safehouseId.Value);
        if (residentId.HasValue)
            query = query.Where(i => i.ResidentId == residentId.Value);
        query = query.OrderByDescending(i => i.IncidentDate).ThenByDescending(i => i.IncidentId);
        var (items, total) = await query.ToPageAsync(pageNum, pageSize, cancellationToken);
        return Ok(new PaginatedList<IncidentReport>(items, total));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<IncidentReport>> Create([FromBody] IncidentReport report, CancellationToken cancellationToken)
    {
        _db.IncidentReports.Add(report);
        await _db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetList), new { residentId = report.ResidentId }, report);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] IncidentReport input, CancellationToken cancellationToken)
    {
        if (id != input.IncidentId) return BadRequest();
        var existing = await _db.IncidentReports.FindAsync([id], cancellationToken);
        if (existing == null) return NotFound();
        _db.Entry(existing).CurrentValues.SetValues(input);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
