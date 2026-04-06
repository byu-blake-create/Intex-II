using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NorthStarShelter.API.Data;
using NorthStarShelter.API.Helpers;
using NorthStarShelter.API.Models;

namespace NorthStarShelter.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PublicImpactSnapshotsController : ControllerBase
{
    private readonly AppDbContext _db;

    public PublicImpactSnapshotsController(AppDbContext db) => _db = db;

    [HttpGet("published")]
    [AllowAnonymous]
    public async Task<ActionResult<PaginatedList<PublicImpactSnapshot>>> GetPublished(
        [FromQuery] int pageNum = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var query = _db.PublicImpactSnapshots.AsNoTracking()
            .Where(s => s.IsPublished)
            .OrderByDescending(s => s.PublishedAt).ThenByDescending(s => s.SnapshotId);
        var (items, total) = await query.ToPageAsync(pageNum, pageSize, cancellationToken);
        return Ok(new PaginatedList<PublicImpactSnapshot>(items, total));
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<PaginatedList<PublicImpactSnapshot>>> GetAll(
        [FromQuery] int pageNum = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var query = _db.PublicImpactSnapshots.AsNoTracking().OrderByDescending(s => s.SnapshotDate).ThenByDescending(s => s.SnapshotId);
        var (items, total) = await query.ToPageAsync(pageNum, pageSize, cancellationToken);
        return Ok(new PaginatedList<PublicImpactSnapshot>(items, total));
    }
}
