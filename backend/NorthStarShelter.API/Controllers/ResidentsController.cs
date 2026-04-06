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
public class ResidentsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ResidentsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<PaginatedList<Resident>>> GetList(
        [FromQuery] int pageNum = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? safehouseId = null,
        [FromQuery] string? caseStatus = null,
        [FromQuery] string? caseCategory = null,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        var query = _db.Residents.AsNoTracking().AsQueryable();
        if (safehouseId.HasValue)
            query = query.Where(r => r.SafehouseId == safehouseId.Value);
        if (!string.IsNullOrWhiteSpace(caseStatus))
            query = query.Where(r => r.CaseStatus == caseStatus);
        if (!string.IsNullOrWhiteSpace(caseCategory))
            query = query.Where(r => r.CaseCategory == caseCategory);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(r =>
                (r.CaseControlNo != null && r.CaseControlNo.Contains(s)) ||
                (r.InternalCode != null && r.InternalCode.Contains(s)) ||
                (r.AssignedSocialWorker != null && r.AssignedSocialWorker.Contains(s)));
        }

        query = query.OrderBy(r => r.ResidentId);
        var (items, total) = await query.ToPageAsync(pageNum, pageSize, cancellationToken);
        foreach (var r in items)
            SensitiveData.ApplyResidentNotesPolicy(r, User);
        return Ok(new PaginatedList<Resident>(items, total));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Resident>> GetById(int id, CancellationToken cancellationToken)
    {
        var r = await _db.Residents.AsNoTracking().FirstOrDefaultAsync(x => x.ResidentId == id, cancellationToken);
        if (r == null) return NotFound();
        SensitiveData.ApplyResidentNotesPolicy(r, User);
        return Ok(r);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<Resident>> Create([FromBody] Resident resident, CancellationToken cancellationToken)
    {
        _db.Residents.Add(resident);
        await _db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = resident.ResidentId }, resident);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> Update(int id, [FromBody] Resident input, CancellationToken cancellationToken)
    {
        if (id != input.ResidentId) return BadRequest();
        var existing = await _db.Residents.FindAsync([id], cancellationToken);
        if (existing == null) return NotFound();
        _db.Entry(existing).CurrentValues.SetValues(input);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> Delete(int id, [FromQuery] bool confirm = false, CancellationToken cancellationToken = default)
    {
        if (!confirm) return BadRequest(new { error = "Set confirm=true to delete." });
        var r = await _db.Residents.FindAsync([id], cancellationToken);
        if (r == null) return NotFound();
        _db.Residents.Remove(r);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
