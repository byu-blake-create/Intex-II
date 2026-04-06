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
public class DonationsController : ControllerBase
{
    private readonly AppDbContext _db;

    public DonationsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<PaginatedList<Donation>>> GetList(
        [FromQuery] int pageNum = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? supporterId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _db.Donations.AsNoTracking().OrderByDescending(d => d.DonationId).AsQueryable();
        if (supporterId.HasValue)
            query = query.Where(d => d.SupporterId == supporterId.Value);
        var (items, total) = await query.ToPageAsync(pageNum, pageSize, cancellationToken);
        return Ok(new PaginatedList<Donation>(items, total));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Donation>> GetById(int id, CancellationToken cancellationToken)
    {
        var d = await _db.Donations.AsNoTracking().FirstOrDefaultAsync(x => x.DonationId == id, cancellationToken);
        return d == null ? NotFound() : Ok(d);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<Donation>> Create([FromBody] Donation donation, CancellationToken cancellationToken)
    {
        _db.Donations.Add(donation);
        await _db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = donation.DonationId }, donation);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> Update(int id, [FromBody] Donation input, CancellationToken cancellationToken)
    {
        if (id != input.DonationId) return BadRequest();
        var existing = await _db.Donations.FindAsync([id], cancellationToken);
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
        var d = await _db.Donations.FindAsync([id], cancellationToken);
        if (d == null) return NotFound();
        _db.Donations.Remove(d);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
