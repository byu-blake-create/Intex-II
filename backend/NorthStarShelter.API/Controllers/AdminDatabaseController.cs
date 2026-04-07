using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NorthStarShelter.API.Data;
using NorthStarShelter.API.Helpers;

namespace NorthStarShelter.API.Controllers;

[ApiController]
[Route("api/admin/database")]
[Authorize(Roles = "Admin")]
public class AdminDatabaseController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminDatabaseController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("tables")]
    public ActionResult<IReadOnlyList<AdminDatabaseTableDto>> GetTables()
    {
        var tables = AdminDatabaseRegistry.All
            .Select(table => table.BuildMetadata(_db))
            .ToArray();

        return Ok(tables);
    }

    [HttpGet("{table}/lookup/{field}")]
    public async Task<ActionResult<IReadOnlyList<AdminDatabaseLookupOptionDto>>> GetLookup(
        string table,
        string field,
        CancellationToken cancellationToken)
    {
        if (!AdminDatabaseRegistry.TryGet(table, out var tableDefinition))
        {
            return NotFound(new { error = $"Unknown table '{table}'." });
        }

        try
        {
            var options = await tableDefinition.GetLookupAsync(_db, field, cancellationToken);
            return Ok(options);
        }
        catch (KeyNotFoundException exception)
        {
            return NotFound(new { error = exception.Message });
        }
    }

    [HttpGet("{table}")]
    public async Task<ActionResult<AdminDatabasePageDto>> GetRows(
        string table,
        [FromQuery] int pageNum = 1,
        [FromQuery] int pageSize = 11,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        if (!AdminDatabaseRegistry.TryGet(table, out var tableDefinition))
        {
            return NotFound(new { error = $"Unknown table '{table}'." });
        }

        var page = await tableDefinition.GetPageAsync(_db, pageNum, pageSize, search, cancellationToken);
        return Ok(page);
    }

    [HttpGet("{table}/{id}")]
    public async Task<ActionResult<Dictionary<string, object?>>> GetRow(
        string table,
        string id,
        CancellationToken cancellationToken)
    {
        if (!AdminDatabaseRegistry.TryGet(table, out var tableDefinition))
        {
            return NotFound(new { error = $"Unknown table '{table}'." });
        }

        var row = await tableDefinition.GetByIdAsync(_db, id, cancellationToken);
        return row is null ? NotFound() : Ok(row);
    }

    [HttpPost("{table}")]
    public async Task<ActionResult<Dictionary<string, object?>>> CreateRow(
        string table,
        [FromBody] JsonElement payload,
        CancellationToken cancellationToken)
    {
        if (!AdminDatabaseRegistry.TryGet(table, out var tableDefinition))
        {
            return NotFound(new { error = $"Unknown table '{table}'." });
        }

        try
        {
            var row = await tableDefinition.CreateAsync(_db, payload, cancellationToken);
            var id = Convert.ToString(row["__rowId"]) ?? Convert.ToString(row[tableDefinition.PrimaryKey]) ?? string.Empty;
            return CreatedAtAction(nameof(GetRow), new { table, id }, row);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { error = exception.Message });
        }
        catch (DbUpdateException exception)
        {
            return BadRequest(new { error = exception.InnerException?.Message ?? exception.Message });
        }
    }

    [HttpPut("{table}/{id}")]
    public async Task<IActionResult> UpdateRow(
        string table,
        string id,
        [FromBody] JsonElement payload,
        CancellationToken cancellationToken)
    {
        if (!AdminDatabaseRegistry.TryGet(table, out var tableDefinition))
        {
            return NotFound(new { error = $"Unknown table '{table}'." });
        }

        try
        {
            var updated = await tableDefinition.UpdateAsync(_db, id, payload, cancellationToken);
            return updated ? NoContent() : NotFound();
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { error = exception.Message });
        }
        catch (DbUpdateException exception)
        {
            return BadRequest(new { error = exception.InnerException?.Message ?? exception.Message });
        }
    }

    [HttpDelete("{table}/{id}")]
    public async Task<IActionResult> DeleteRow(
        string table,
        string id,
        [FromQuery] bool confirm = false,
        CancellationToken cancellationToken = default)
    {
        if (!AdminDatabaseRegistry.TryGet(table, out var tableDefinition))
        {
            return NotFound(new { error = $"Unknown table '{table}'." });
        }

        if (!confirm)
        {
            return BadRequest(new { error = "Set confirm=true to delete." });
        }

        try
        {
            var deleted = await tableDefinition.DeleteAsync(_db, id, cancellationToken);
            return deleted ? NoContent() : NotFound();
        }
        catch (DbUpdateException exception)
        {
            return BadRequest(new { error = exception.InnerException?.Message ?? exception.Message });
        }
    }
}
