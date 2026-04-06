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
public class SocialMediaPostsController : ControllerBase
{
    private readonly AppDbContext _db;

    public SocialMediaPostsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<PaginatedList<SocialMediaPost>>> GetList(
        [FromQuery] int pageNum = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? platform = null,
        [FromQuery] string? campaign = null,
        CancellationToken cancellationToken = default)
    {
        var query = _db.SocialMediaPosts.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(platform))
            query = query.Where(p => p.Platform == platform);
        if (!string.IsNullOrWhiteSpace(campaign))
            query = query.Where(p => p.CampaignName != null && p.CampaignName.Contains(campaign));
        query = query.OrderByDescending(p => p.CreatedAt).ThenByDescending(p => p.PostId);
        var (items, total) = await query.ToPageAsync(pageNum, pageSize, cancellationToken);
        return Ok(new PaginatedList<SocialMediaPost>(items, total));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<SocialMediaPost>> GetById(int id, CancellationToken cancellationToken)
    {
        var p = await _db.SocialMediaPosts.AsNoTracking().FirstOrDefaultAsync(x => x.PostId == id, cancellationToken);
        return p == null ? NotFound() : Ok(p);
    }
}
