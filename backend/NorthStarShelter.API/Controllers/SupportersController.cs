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
public class SupportersController : ControllerBase
{
    private readonly AppDbContext _db;

    public SupportersController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<PaginatedList<Supporter>>> GetList(
        [FromQuery] int pageNum = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? supporterType = null,
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        CancellationToken cancellationToken = default)
    {
        var query = _db.Supporters.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(supporterType))
            query = query.Where(s => s.SupporterType == supporterType);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(s =>
                s.DisplayName.Contains(term) ||
                (s.OrganizationName != null && s.OrganizationName.Contains(term)) ||
                (s.Email != null && s.Email.Contains(term)));
        }
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(s => s.Status == status);
        query = query.OrderBy(s => s.SupporterId);
        var (items, total) = await query.ToPageAsync(pageNum, pageSize, cancellationToken);
        return Ok(new PaginatedList<Supporter>(items, total));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Supporter>> GetById(int id, CancellationToken cancellationToken)
    {
        var s = await _db.Supporters.AsNoTracking().FirstOrDefaultAsync(x => x.SupporterId == id, cancellationToken);
        return s == null ? NotFound() : Ok(s);
    }

    [HttpGet("{id:int}/contacts")]
    public async Task<ActionResult<IEnumerable<SupporterContact>>> GetContacts(
        int id, CancellationToken cancellationToken)
    {
        var exists = await _db.Supporters.AsNoTracking()
            .AnyAsync(s => s.SupporterId == id, cancellationToken);
        if (!exists) return NotFound();

        var contacts = await _db.SupporterContacts.AsNoTracking()
            .Where(c => c.SupporterId == id)
            .OrderByDescending(c => c.ContactDate)
            .ToListAsync(cancellationToken);
        return Ok(contacts);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<Supporter>> Create([FromBody] Supporter supporter, CancellationToken cancellationToken)
    {
        _db.Supporters.Add(supporter);
        await _db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = supporter.SupporterId }, supporter);
    }

    [HttpPost("{id:int}/contacts")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<SupporterContact>> CreateContact(
        int id,
        [FromBody] CreateSupporterContactRequest request,
        CancellationToken cancellationToken)
    {
        var supporterExists = await _db.Supporters.AsNoTracking()
            .AnyAsync(s => s.SupporterId == id, cancellationToken);
        if (!supporterExists) return NotFound();

        if (string.IsNullOrWhiteSpace(request.ContactType))
            return BadRequest(new { error = "ContactType is required." });

        var contact = new SupporterContact
        {
            SupporterId = id,
            ContactDate = request.ContactDate,
            ContactType = request.ContactType.Trim(),
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            CreatedAt = DateTime.UtcNow,
        };

        _db.SupporterContacts.Add(contact);
        await _db.SaveChangesAsync(cancellationToken);
        return Created($"/api/supporters/{id}/contacts/{contact.SupporterContactId}", contact);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> Update(int id, [FromBody] Supporter input, CancellationToken cancellationToken)
    {
        if (id != input.SupporterId) return BadRequest();
        var existing = await _db.Supporters.FindAsync([id], cancellationToken);
        if (existing == null) return NotFound();
        _db.Entry(existing).CurrentValues.SetValues(input);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id, [FromQuery] bool confirm = false, CancellationToken cancellationToken = default)
    {
        if (!confirm) return BadRequest(new { error = "Set confirm=true to delete." });
        var s = await _db.Supporters.FindAsync([id], cancellationToken);
        if (s == null) return NotFound();
        _db.Supporters.Remove(s);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    public sealed record CreateSupporterContactRequest(
        DateOnly ContactDate,
        string ContactType,
        string? Notes);
}
