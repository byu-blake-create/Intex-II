namespace NorthStarShelter.API;

public sealed class DemoAuthOptions
{
    public const string SectionName = "DemoAuth";

    public List<DemoAuthUser> Users { get; init; } = [];
}

public sealed class DemoAuthUser
{
    public string Email { get; init; } = string.Empty;

    public string Password { get; init; } = string.Empty;

    public List<string> Roles { get; init; } = [];
}
