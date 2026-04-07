using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NorthStarShelter.API.Data;
using NorthStarShelter.API.Models;

namespace NorthStarShelter.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly SignInManager<AppUser> _signInManager;
    private readonly UserManager<AppUser> _userManager;

    public AuthController(
        AppDbContext db,
        SignInManager<AppUser> signInManager,
        UserManager<AppUser> userManager)
    {
        _db = db;
        _signInManager = signInManager;
        _userManager = userManager;
    }

    public record LoginRequest(string Email, string Password);
    public record RegisterRequest(string Email, string Password, string FirstName, string LastName);
    public record AuthUserResponse(
        string Email,
        string DisplayName,
        string FirstName,
        string LastName,
        int? SupporterId,
        string[] Roles);

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var email = req.Email.Trim();
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(req.Password))
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        var user = await _userManager.FindByEmailAsync(email);
        if (user is null)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        var result = await _signInManager.PasswordSignInAsync(
            user,
            req.Password,
            isPersistent: true,
            lockoutOnFailure: false);

        if (!result.Succeeded)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        user = await EnsureSupporterLinkAsync(user);
        return Ok(await BuildAuthResponseAsync(user));
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req, CancellationToken cancellationToken)
    {
        var email = req.Email.Trim();
        var firstName = req.FirstName.Trim();
        var lastName = req.LastName.Trim();
        var displayName = $"{firstName} {lastName}".Trim();
        if (string.IsNullOrWhiteSpace(email)
            || string.IsNullOrWhiteSpace(req.Password)
            || string.IsNullOrWhiteSpace(firstName)
            || string.IsNullOrWhiteSpace(lastName))
        {
            return BadRequest(new { message = "Email, password, first name, and last name are required." });
        }

        var existingUser = await _userManager.FindByEmailAsync(email);
        if (existingUser is not null)
        {
            return Conflict(new { message = "An account with that email already exists." });
        }

        var supporter = await _db.Supporters
            .OrderBy(s => s.SupporterId)
            .FirstOrDefaultAsync(s => s.Email == email, cancellationToken);

        if (supporter is null)
        {
            supporter = new Supporter
            {
                SupporterType = "Individual",
                DisplayName = displayName,
                FirstName = firstName,
                LastName = lastName,
                Email = email,
                Status = "Active",
                CreatedAt = DateTime.UtcNow,
                AcquisitionChannel = "Portal Registration",
                RelationshipType = "Self-Registered",
            };

            _db.Supporters.Add(supporter);
            await _db.SaveChangesAsync(cancellationToken);
        }
        else
        {
            var linkedUserExists = await _db.Users.AnyAsync(existing => existing.SupporterId == supporter.SupporterId, cancellationToken);
            if (linkedUserExists)
            {
                return Conflict(new { message = "That donor record is already linked to an existing account." });
            }

            supporter.DisplayName = string.IsNullOrWhiteSpace(supporter.DisplayName) ? displayName : supporter.DisplayName;
            supporter.FirstName = string.IsNullOrWhiteSpace(supporter.FirstName) ? firstName : supporter.FirstName;
            supporter.LastName = string.IsNullOrWhiteSpace(supporter.LastName) ? lastName : supporter.LastName;
            supporter.Email = string.IsNullOrWhiteSpace(supporter.Email) ? email : supporter.Email;
            supporter.Status ??= "Active";
            await _db.SaveChangesAsync(cancellationToken);
        }

        var user = new AppUser
        {
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            DisplayName = displayName,
            FirstName = firstName,
            LastName = lastName,
            SupporterId = supporter.SupporterId,
        };

        var create = await _userManager.CreateAsync(user, req.Password);
        if (!create.Succeeded)
        {
            return BadRequest(new { message = string.Join(" ", create.Errors.Select(error => error.Description)) });
        }

        var addRole = await _userManager.AddToRoleAsync(user, "Donor");
        if (!addRole.Succeeded)
        {
            return BadRequest(new { message = string.Join(" ", addRole.Errors.Select(error => error.Description)) });
        }

        await _signInManager.SignInAsync(user, isPersistent: true);
        return Ok(await BuildAuthResponseAsync(user));
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        await _signInManager.SignOutAsync();
        return NoContent();
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized();
        }

        user = await EnsureSupporterLinkAsync(user);
        return Ok(await BuildAuthResponseAsync(user));
    }

    private async Task<AppUser> EnsureSupporterLinkAsync(AppUser user)
    {
        if (user.SupporterId.HasValue || string.IsNullOrWhiteSpace(user.Email))
        {
            return user;
        }

        var supporter = await _db.Supporters
            .OrderBy(s => s.SupporterId)
            .FirstOrDefaultAsync(s => s.Email == user.Email);

        if (supporter is null)
        {
            return user;
        }

        var linkedUserExists = await _db.Users.AnyAsync(existing => existing.Id != user.Id && existing.SupporterId == supporter.SupporterId);
        if (linkedUserExists)
        {
            return user;
        }

        user.SupporterId = supporter.SupporterId;
        user.DisplayName ??= supporter.DisplayName;
        user.FirstName ??= supporter.FirstName;
        user.LastName ??= supporter.LastName;
        await _userManager.UpdateAsync(user);
        return user;
    }

    private async Task<AuthUserResponse> BuildAuthResponseAsync(AppUser user)
    {
        var roles = (await _userManager.GetRolesAsync(user)).ToArray();
        return new AuthUserResponse(
            user.Email ?? string.Empty,
            user.DisplayName ?? $"{user.FirstName} {user.LastName}".Trim() ?? user.Email ?? string.Empty,
            user.FirstName ?? string.Empty,
            user.LastName ?? string.Empty,
            user.SupporterId,
            roles);
    }
}
