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
public class HomeVisitationsController : ControllerBase
{
    private readonly AppDbContext _db;

    public HomeVisitationsController(AppDbContext db) => _db = db;

    public sealed class HomeVisitationUpsertRequest
    {
        public int ResidentId { get; set; }
        public DateOnly? VisitDate { get; set; }
        public string? SocialWorker { get; set; }
        public string? VisitType { get; set; }
        public string? LocationVisited { get; set; }
        public string? FamilyMembersPresent { get; set; }
        public string? Purpose { get; set; }
        public string? Observations { get; set; }
        public string? FamilyCooperationLevel { get; set; }
        public string? SafetyConcernsNoted { get; set; }
        public bool? FollowUpNeeded { get; set; }
        public string? FollowUpNotes { get; set; }
        public string? VisitOutcome { get; set; }
    }

    [HttpGet]
    public async Task<ActionResult<PaginatedList<HomeVisitation>>> GetByResident(
        [FromQuery] int residentId,
        [FromQuery] int pageNum = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var query = _db.HomeVisitations.AsNoTracking()
            .Where(v => v.ResidentId == residentId)
            .OrderBy(v => v.VisitDate).ThenBy(v => v.VisitationId);
        var (items, total) = await query.ToPageAsync(pageNum, pageSize, cancellationToken);
        return Ok(new PaginatedList<HomeVisitation>(items, total));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<HomeVisitation>> Create([FromBody] HomeVisitationUpsertRequest input, CancellationToken cancellationToken)
    {
        var validationResult = await ValidateUpsertAsync(input, cancellationToken);
        if (validationResult != null) return validationResult;

        var visitation = new HomeVisitation();
        ApplyUpsert(visitation, input);
        _db.HomeVisitations.Add(visitation);
        await _db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetByResident), new { residentId = visitation.ResidentId }, visitation);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] HomeVisitationUpsertRequest input, CancellationToken cancellationToken)
    {
        var validationResult = await ValidateUpsertAsync(input, cancellationToken);
        if (validationResult != null) return validationResult;

        var existing = await _db.HomeVisitations.FindAsync([id], cancellationToken);
        if (existing == null) return NotFound();
        ApplyUpsert(existing, input);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private async Task<ActionResult?> ValidateUpsertAsync(HomeVisitationUpsertRequest input, CancellationToken cancellationToken)
    {
        if (input.ResidentId <= 0)
            ModelState.AddModelError(nameof(input.ResidentId), "Resident is required.");
        else if (!await _db.Residents.AsNoTracking().AnyAsync(r => r.ResidentId == input.ResidentId, cancellationToken))
            ModelState.AddModelError(nameof(input.ResidentId), "Resident was not found.");

        return ModelState.IsValid ? null : ValidationProblem(ModelState);
    }

    private static void ApplyUpsert(HomeVisitation visitation, HomeVisitationUpsertRequest input)
    {
        visitation.ResidentId = input.ResidentId;
        visitation.VisitDate = input.VisitDate;
        visitation.SocialWorker = NormalizeNullableString(input.SocialWorker);
        visitation.VisitType = NormalizeNullableString(input.VisitType);
        visitation.LocationVisited = NormalizeNullableString(input.LocationVisited);
        visitation.FamilyMembersPresent = NormalizeNullableString(input.FamilyMembersPresent);
        visitation.Purpose = NormalizeNullableString(input.Purpose);
        visitation.Observations = NormalizeNullableString(input.Observations);
        visitation.FamilyCooperationLevel = NormalizeNullableString(input.FamilyCooperationLevel);
        visitation.SafetyConcernsNoted = NormalizeNullableString(input.SafetyConcernsNoted);
        visitation.FollowUpNeeded = input.FollowUpNeeded;
        visitation.FollowUpNotes = NormalizeNullableString(input.FollowUpNotes);
        visitation.VisitOutcome = NormalizeNullableString(input.VisitOutcome);
    }

    private static string? NormalizeNullableString(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return value.Trim();
    }
}
