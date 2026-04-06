using Microsoft.EntityFrameworkCore;

namespace NorthStarShelter.API.Helpers;

public static class Pagination
{
    public static (int PageNum, int PageSize) Normalize(int pageNum, int pageSize)
    {
        var p = pageNum < 1 ? 1 : pageNum;
        var s = pageSize < 1 ? 20 : Math.Min(pageSize, 100);
        return (p, s);
    }

    public static async Task<(List<T> Items, int TotalCount)> ToPageAsync<T>(
        this IQueryable<T> query,
        int pageNum,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var (p, s) = Normalize(pageNum, pageSize);
        var total = await query.CountAsync(cancellationToken);
        var items = await query.Skip((p - 1) * s).Take(s).ToListAsync(cancellationToken);
        return (items, total);
    }
}
