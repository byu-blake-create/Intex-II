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
public class EducationRecordsController : ControllerBase
{
    private readonly AppDbContext _db;

    public EducationRecordsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<PaginatedList<EducationRecord>>> GetByResident(
        [FromQuery] int residentId,
        [FromQuery] int pageNum = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var query = _db.EducationRecords.AsNoTracking()
            .Where(e => e.ResidentId == residentId)
            .OrderBy(e => e.RecordDate).ThenBy(e => e.EducationRecordId);
        var (items, total) = await query.ToPageAsync(pageNum, pageSize, cancellationToken);
        return Ok(new PaginatedList<EducationRecord>(items, total));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<EducationRecord>> Create([FromBody] EducationRecord record, CancellationToken cancellationToken)
    {
        _db.EducationRecords.Add(record);
        await _db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetByResident), new { residentId = record.ResidentId }, record);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] EducationRecord input, CancellationToken cancellationToken)
    {
        if (id != input.EducationRecordId) return BadRequest();
        var existing = await _db.EducationRecords.FindAsync([id], cancellationToken);
        if (existing == null) return NotFound();
        _db.Entry(existing).CurrentValues.SetValues(input);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
