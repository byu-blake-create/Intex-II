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

    public sealed class ProcessRecordingUpsertRequest
    {
        public int ResidentId { get; set; }
        public DateOnly? SessionDate { get; set; }
        public string? SocialWorker { get; set; }
        public string? SessionType { get; set; }
        public int? SessionDurationMinutes { get; set; }
        public string? EmotionalStateObserved { get; set; }
        public string? EmotionalStateEnd { get; set; }
        public string? SessionNarrative { get; set; }
        public string? InterventionsApplied { get; set; }
        public string? FollowUpActions { get; set; }
        public string? ProgressNoted { get; set; }
        public string? ConcernsFlagged { get; set; }
        public string? ReferralMade { get; set; }
        public string? NotesRestricted { get; set; }
    }

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
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ProcessRecording>> Create([FromBody] ProcessRecordingUpsertRequest input, CancellationToken cancellationToken)
    {
        var validationResult = await ValidateUpsertAsync(input, cancellationToken);
        if (validationResult != null) return validationResult;

        var recording = new ProcessRecording();
        ApplyUpsert(recording, input);
        _db.ProcessRecordings.Add(recording);
        await _db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetByResident), new { residentId = recording.ResidentId }, recording);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] ProcessRecordingUpsertRequest input, CancellationToken cancellationToken)
    {
        var validationResult = await ValidateUpsertAsync(input, cancellationToken);
        if (validationResult != null) return validationResult;

        var existing = await _db.ProcessRecordings.FindAsync([id], cancellationToken);
        if (existing == null) return NotFound();
        ApplyUpsert(existing, input);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private async Task<ActionResult?> ValidateUpsertAsync(ProcessRecordingUpsertRequest input, CancellationToken cancellationToken)
    {
        if (input.ResidentId <= 0)
            ModelState.AddModelError(nameof(input.ResidentId), "Resident is required.");
        else if (!await _db.Residents.AsNoTracking().AnyAsync(r => r.ResidentId == input.ResidentId, cancellationToken))
            ModelState.AddModelError(nameof(input.ResidentId), "Resident was not found.");

        return ModelState.IsValid ? null : ValidationProblem(ModelState);
    }

    private static void ApplyUpsert(ProcessRecording recording, ProcessRecordingUpsertRequest input)
    {
        recording.ResidentId = input.ResidentId;
        recording.SessionDate = input.SessionDate;
        recording.SocialWorker = NormalizeNullableString(input.SocialWorker);
        recording.SessionType = NormalizeNullableString(input.SessionType);
        recording.SessionDurationMinutes = input.SessionDurationMinutes;
        recording.EmotionalStateObserved = NormalizeNullableString(input.EmotionalStateObserved);
        recording.EmotionalStateEnd = NormalizeNullableString(input.EmotionalStateEnd);
        recording.SessionNarrative = NormalizeNullableString(input.SessionNarrative);
        recording.InterventionsApplied = NormalizeNullableString(input.InterventionsApplied);
        recording.FollowUpActions = NormalizeNullableString(input.FollowUpActions);
        recording.ProgressNoted = NormalizeNullableString(input.ProgressNoted);
        recording.ConcernsFlagged = NormalizeNullableString(input.ConcernsFlagged);
        recording.ReferralMade = NormalizeNullableString(input.ReferralMade);
        recording.NotesRestricted = NormalizeNullableString(input.NotesRestricted);
    }

    private static string? NormalizeNullableString(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return value.Trim();
    }
}
