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

    public sealed class ResidentUpsertRequest
    {
        public string CaseControlNo { get; set; } = string.Empty;
        public string? InternalCode { get; set; }
        public int SafehouseId { get; set; }
        public string? CaseStatus { get; set; }
        public string? Sex { get; set; }
        public DateOnly? DateOfBirth { get; set; }
        public string? CaseCategory { get; set; }
        public string? AssignedSocialWorker { get; set; }
        public DateOnly? CaseConferenceDate { get; set; }
    }

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
    public async Task<ActionResult<Resident>> Create([FromBody] ResidentUpsertRequest input, CancellationToken cancellationToken)
    {
        var validationResult = ValidateResidentUpsert(input);
        if (validationResult != null) return validationResult;

        var resident = new Resident();
        ApplyResidentUpsert(resident, input);
        resident.CreatedAt ??= DateTime.UtcNow;
        _db.Residents.Add(resident);
        await _db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = resident.ResidentId }, resident);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> Update(int id, [FromBody] ResidentUpsertRequest input, CancellationToken cancellationToken)
    {
        var validationResult = ValidateResidentUpsert(input);
        if (validationResult != null) return validationResult;

        var existing = await _db.Residents.FindAsync([id], cancellationToken);
        if (existing == null) return NotFound();
        ApplyResidentUpsert(existing, input);
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

    private ActionResult? ValidateResidentUpsert(ResidentUpsertRequest input)
    {
        if (string.IsNullOrWhiteSpace(input.CaseControlNo))
            ModelState.AddModelError(nameof(input.CaseControlNo), "Case control number is required.");
        if (input.SafehouseId <= 0)
            ModelState.AddModelError(nameof(input.SafehouseId), "Safehouse is required.");

        return ModelState.IsValid ? null : ValidationProblem(ModelState);
    }

    private static void ApplyResidentUpsert(Resident resident, ResidentUpsertRequest input)
    {
        resident.CaseControlNo = input.CaseControlNo.Trim();
        resident.InternalCode = NormalizeNullableString(input.InternalCode);
        resident.SafehouseId = input.SafehouseId;
        resident.CaseStatus = NormalizeNullableString(input.CaseStatus);
        resident.Sex = NormalizeNullableString(input.Sex);
        resident.DateOfBirth = input.DateOfBirth;
        resident.CaseCategory = NormalizeNullableString(input.CaseCategory);
        resident.AssignedSocialWorker = NormalizeNullableString(input.AssignedSocialWorker);
        resident.CaseConferenceDate = input.CaseConferenceDate;

        if (string.Equals(resident.CaseStatus, "Closed", StringComparison.OrdinalIgnoreCase))
        {
            resident.DateClosed ??= DateOnly.FromDateTime(DateTime.UtcNow);
        }
        else if (string.Equals(resident.CaseStatus, "Active", StringComparison.OrdinalIgnoreCase))
        {
            resident.DateClosed = null;
        }
    }

    private static string? NormalizeNullableString(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return value.Trim();
    }
}
