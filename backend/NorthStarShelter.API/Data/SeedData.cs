using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
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
        var userManager = services.GetRequiredService<UserManager<AppUser>>();
        foreach (var role in new[] { "Admin", "Donor" })
        {
            await EnsureRoleExistsAsync(roleManager, role);
        }

        await MigrateLegacyStaffRoleAsync(roleManager, userManager);

        var adminEmail = configuration["Seed:AdminEmail"] ?? "admin@northstarshelter.org";
        var admin = await userManager.FindByEmailAsync(adminEmail);
        if (admin != null)
        {
            await EnsureRoleAsync(userManager, admin, "Admin");
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

    private static async Task EnsureRoleExistsAsync(RoleManager<IdentityRole> roleManager, string role)
    {
        if (await roleManager.RoleExistsAsync(role))
            return;

        var createRole = await roleManager.CreateAsync(new IdentityRole(role));
        if (!createRole.Succeeded)
        {
            throw new InvalidOperationException(
                $"Failed to create role '{role}': {string.Join("; ", createRole.Errors.Select(e => e.Description))}");
        }
    }

    private static async Task MigrateLegacyStaffRoleAsync(RoleManager<IdentityRole> roleManager, UserManager<AppUser> userManager)
    {
        var legacyStaffRole = await roleManager.FindByNameAsync("Staff");
        if (legacyStaffRole is null)
            return;

        var staffUsers = await userManager.GetUsersInRoleAsync("Staff");
        foreach (var user in staffUsers)
        {
            await EnsureRoleAsync(userManager, user, "Admin");

            var removeRole = await userManager.RemoveFromRoleAsync(user, "Staff");
            if (!removeRole.Succeeded)
            {
                throw new InvalidOperationException(
                    $"Failed to remove Staff role: {string.Join("; ", removeRole.Errors.Select(e => e.Description))}");
            }
        }

        var deleteRole = await roleManager.DeleteAsync(legacyStaffRole);
        if (!deleteRole.Succeeded)
        {
            throw new InvalidOperationException(
                $"Failed to delete legacy Staff role: {string.Join("; ", deleteRole.Errors.Select(e => e.Description))}");
        }
    }
}
