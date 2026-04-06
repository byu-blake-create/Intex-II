using System.Security.Claims;

namespace NorthStarShelter.API.Helpers;

public static class PiiAccess
{
    public static bool CanViewRestrictedNotes(ClaimsPrincipal user) =>
        user.IsInRole("Admin") || user.IsInRole("Staff");
}
