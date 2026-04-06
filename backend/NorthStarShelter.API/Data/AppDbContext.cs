using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace NorthStarShelter.API.Data;

public class AppDbContext : IdentityDbContext<IdentityUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    // Domain DbSets will be added here once the data model is finalized
    // e.g.:
    // public DbSet<Resident> Residents { get; set; }
    // public DbSet<Donor> Donors { get; set; }
}
