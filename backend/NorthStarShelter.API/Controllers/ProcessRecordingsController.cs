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
public class ProcessRecordingsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ProcessRecordingsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<PaginatedList<ProcessRecording>>> GetByResident(
        [FromQuery] int residentId,
        [FromQuery] int pageNum = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var query = _db.ProcessRecordings.AsNoTracking()
            .Where(p => p.ResidentId == residentId)
            .OrderBy(p => p.SessionDate).ThenBy(p => p.RecordingId);
        var (items, total) = await query.ToPageAsync(pageNum, pageSize, cancellationToken);
        foreach (var r in items)
            SensitiveData.ApplyProcessRecordingNotesPolicy(r, User);
        return Ok(new PaginatedList<ProcessRecording>(items, total));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<ProcessRecording>> Create([FromBody] ProcessRecording recording, CancellationToken cancellationToken)
    {
        _db.ProcessRecordings.Add(recording);
        await _db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetByResident), new { residentId = recording.ResidentId }, recording);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> Update(int id, [FromBody] ProcessRecording input, CancellationToken cancellationToken)
    {
        if (id != input.RecordingId) return BadRequest();
        var existing = await _db.ProcessRecordings.FindAsync([id], cancellationToken);
        if (existing == null) return NotFound();
        _db.Entry(existing).CurrentValues.SetValues(input);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
