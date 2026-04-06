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
public class DonationAllocationsController : ControllerBase
{
    private readonly AppDbContext _db;

    public DonationAllocationsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<PaginatedList<DonationAllocation>>> GetByDonation(
        [FromQuery] int donationId,
        [FromQuery] int pageNum = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var query = _db.DonationAllocations.AsNoTracking().Where(a => a.DonationId == donationId).OrderBy(a => a.AllocationId);
        var (items, total) = await query.ToPageAsync(pageNum, pageSize, cancellationToken);
        return Ok(new PaginatedList<DonationAllocation>(items, total));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<DonationAllocation>> Create([FromBody] DonationAllocation allocation, CancellationToken cancellationToken)
    {
        _db.DonationAllocations.Add(allocation);
        await _db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetByDonation), new { donationId = allocation.DonationId }, allocation);
    }
}
