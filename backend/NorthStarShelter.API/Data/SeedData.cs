using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace NorthStarShelter.API.Data;

public static class SeedData
{
    /// <summary>Creates default roles and admin user when <c>Seed:AdminPassword</c> is set. Does not run EF migrations — run <c>dotnet ef database update</c> when Identity/schema migrations are added.</summary>
    public static async Task InitializeAsync(IServiceProvider services, IConfiguration configuration)
    {
        await using var scope = services.CreateAsyncScope();

        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        foreach (var role in new[] { "Admin", "Staff", "Donor" })
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }

        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>();
        const string adminEmail = "admin@northstarshelter.org";
        if (await userManager.FindByEmailAsync(adminEmail) != null)
            return;

        var password = configuration["Seed:AdminPassword"];
        if (string.IsNullOrWhiteSpace(password))
            return;

        var admin = new IdentityUser
        {
            UserName = adminEmail,
            Email = adminEmail,
            EmailConfirmed = true,
        };

        var create = await userManager.CreateAsync(admin, password);
        if (create.Succeeded)
            await userManager.AddToRoleAsync(admin, "Admin");
    }
}
