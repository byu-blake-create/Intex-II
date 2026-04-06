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
public class InterventionPlansController : ControllerBase
{
    private readonly AppDbContext _db;

    public InterventionPlansController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<PaginatedList<InterventionPlan>>> GetByResident(
        [FromQuery] int residentId,
        [FromQuery] int pageNum = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var query = _db.InterventionPlans.AsNoTracking()
            .Where(p => p.ResidentId == residentId)
            .OrderBy(p => p.TargetDate).ThenBy(p => p.PlanId);
        var (items, total) = await query.ToPageAsync(pageNum, pageSize, cancellationToken);
        return Ok(new PaginatedList<InterventionPlan>(items, total));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<InterventionPlan>> Create([FromBody] InterventionPlan plan, CancellationToken cancellationToken)
    {
        _db.InterventionPlans.Add(plan);
        await _db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetByResident), new { residentId = plan.ResidentId }, plan);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> Update(int id, [FromBody] InterventionPlan input, CancellationToken cancellationToken)
    {
        if (id != input.PlanId) return BadRequest();
        var existing = await _db.InterventionPlans.FindAsync([id], cancellationToken);
        if (existing == null) return NotFound();
        _db.Entry(existing).CurrentValues.SetValues(input);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
