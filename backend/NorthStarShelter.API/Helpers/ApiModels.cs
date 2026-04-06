namespace NorthStarShelter.API.Helpers;

public record PaginatedList<T>(IReadOnlyList<T> Items, int TotalCount);
