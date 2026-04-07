using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
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
    private readonly UserManager<AppUser> _userManager;

    public DonationsController(AppDbContext db, UserManager<AppUser> userManager)
    {
        _db = db;
        _userManager = userManager;
    }

    public record DonorDonationsResponse(
        int? SupporterId,
        string DisplayName,
        string Email,
        int DonationCount,
        decimal TotalAmount,
        PaginatedList<Donation> Donations);

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

    [HttpGet("mine")]
    [Authorize(Roles = "Donor,Admin,Staff")]
    public async Task<ActionResult<DonorDonationsResponse>> GetMine(
        [FromQuery] int pageNum = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized();
        }

        if (!user.SupporterId.HasValue && !string.IsNullOrWhiteSpace(user.Email))
        {
            var supporter = await _db.Supporters
                .OrderBy(s => s.SupporterId)
                .FirstOrDefaultAsync(s => s.Email == user.Email, cancellationToken);

            if (supporter is not null)
            {
                var linkedUserExists = await _db.Users.AnyAsync(
                    existing => existing.Id != user.Id && existing.SupporterId == supporter.SupporterId,
                    cancellationToken);
                if (!linkedUserExists)
                {
                    user.SupporterId = supporter.SupporterId;
                    user.DisplayName ??= supporter.DisplayName;
                    await _userManager.UpdateAsync(user);
                }
            }
        }

        if (!user.SupporterId.HasValue)
        {
            return Ok(new DonorDonationsResponse(
                null,
                user.DisplayName ?? user.Email ?? "Donor",
                user.Email ?? string.Empty,
                0,
                0,
                new PaginatedList<Donation>([], 0)));
        }

        var donationsQuery = _db.Donations.AsNoTracking()
            .Where(d => d.SupporterId == user.SupporterId.Value)
            .OrderByDescending(d => d.DonationDate)
            .ThenByDescending(d => d.DonationId);

        var totalAmount = await donationsQuery.SumAsync(d => d.Amount ?? 0, cancellationToken);
        var (items, total) = await donationsQuery.ToPageAsync(pageNum, pageSize, cancellationToken);

        return Ok(new DonorDonationsResponse(
            user.SupporterId,
            user.DisplayName ?? user.Email ?? "Donor",
            user.Email ?? string.Empty,
            total,
            totalAmount,
            new PaginatedList<Donation>(items, total)));
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
