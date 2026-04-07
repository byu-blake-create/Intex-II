using Microsoft.AspNetCore.Identity;

namespace NorthStarShelter.API.Models;

public class AppUser : IdentityUser
{
    public int? SupporterId { get; set; }
    public string? DisplayName { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }

    public Supporter? Supporter { get; set; }
}
