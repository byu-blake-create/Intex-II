using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;

namespace NorthStarShelter.API.Helpers;

public sealed class LegacyAdminRoleClaimsTransformation : IClaimsTransformation
{
    public Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        if (principal.Identity is not ClaimsIdentity identity || !identity.IsAuthenticated)
        {
            return Task.FromResult(principal);
        }

        if (principal.IsInRole("Staff") && !principal.IsInRole("Admin"))
        {
            identity.AddClaim(new Claim(identity.RoleClaimType, "Admin"));
        }

        return Task.FromResult(principal);
    }
}
