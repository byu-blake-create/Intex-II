using Microsoft.AspNetCore.Identity;
using NorthStarShelter.API.Models;

namespace NorthStarShelter.API.Data;

public static class SeedData
{
    /// <summary>Creates default roles and the initial admin account when <c>Seed:AdminPassword</c> is set.</summary>
    public static async Task InitializeAsync(
        IServiceProvider services,
        IConfiguration configuration,
        CancellationToken cancellationToken = default)
    {
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
        foreach (var role in new[] { "Admin", "Staff", "Donor" })
        {
            if (await roleManager.RoleExistsAsync(role))
                continue;

            var createRole = await roleManager.CreateAsync(new IdentityRole(role));
            if (!createRole.Succeeded)
            {
                throw new InvalidOperationException(
                    $"Failed to create role '{role}': {string.Join("; ", createRole.Errors.Select(e => e.Description))}");
            }
        }

        var userManager = services.GetRequiredService<UserManager<AppUser>>();
        var adminEmail = configuration["Seed:AdminEmail"] ?? "admin@northstarshelter.org";
        var admin = await userManager.FindByEmailAsync(adminEmail);
        if (admin != null)
        {
            await EnsureRoleAsync(userManager, admin, "Admin");
            await EnsureRoleAsync(userManager, admin, "Staff");
            return;
        }

        var password = configuration["Seed:AdminPassword"];
        if (string.IsNullOrWhiteSpace(password))
            return;

        admin = new AppUser
        {
            UserName = adminEmail,
            Email = adminEmail,
            EmailConfirmed = true,
            DisplayName = "North Star Admin",
            FirstName = "North Star",
            LastName = "Admin",
        };

        var create = await userManager.CreateAsync(admin, password);
        if (!create.Succeeded)
        {
            throw new InvalidOperationException(
                $"Failed to seed admin user: {string.Join("; ", create.Errors.Select(e => e.Description))}");
        }

        await EnsureRoleAsync(userManager, admin, "Admin");
        await EnsureRoleAsync(userManager, admin, "Staff");
    }

    private static async Task EnsureRoleAsync(UserManager<AppUser> userManager, AppUser user, string role)
    {
        if (await userManager.IsInRoleAsync(user, role))
            return;

        var addRole = await userManager.AddToRoleAsync(user, role);
        if (!addRole.Succeeded)
        {
            throw new InvalidOperationException(
                $"Failed to grant {role} role: {string.Join("; ", addRole.Errors.Select(e => e.Description))}");
        }
    }
}
