using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NorthStarShelter.API.Data;
using NorthStarShelter.API.Helpers;

namespace NorthStarShelter.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SafehousesController : ControllerBase
{
    private readonly AppDbContext _db;

    public SafehousesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<PaginatedList<Models.Safehouse>>> GetList(
        [FromQuery] int pageNum = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var query = _db.Safehouses.AsNoTracking().OrderBy(s => s.SafehouseId);
        var (items, total) = await query.ToPageAsync(pageNum, pageSize, cancellationToken);
        return Ok(new PaginatedList<Models.Safehouse>(items, total));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Models.Safehouse>> GetById(int id, CancellationToken cancellationToken)
    {
        var s = await _db.Safehouses.AsNoTracking().FirstOrDefaultAsync(x => x.SafehouseId == id, cancellationToken);
        return s == null ? NotFound() : Ok(s);
    }
}
