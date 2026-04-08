using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
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
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;

    public AuthController(
        AppDbContext db,
        SignInManager<AppUser> signInManager,
        UserManager<AppUser> userManager,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        _db = db;
        _signInManager = signInManager;
        _userManager = userManager;
        _configuration = configuration;
        _environment = environment;
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

    [HttpGet("google/login")]
    public IActionResult GoogleLogin([FromQuery] string? returnUrl = "/")
    {
        // Google is only registered in Program.cs when ClientId + ClientSecret exist (see Azure / user-secrets / .env).
        if (!IsGoogleAuthConfigured())
        {
            return BadRequest(new
            {
                message =
                    "Google sign-in is not configured on this environment. Add Authentication:Google:ClientId and Authentication:Google:ClientSecret (user secrets, .env, or appsettings).",
            });
        }

        var callbackUrl = Url.Action(
            nameof(GoogleCallback),
            values: new { returnUrl = NormalizeReturnUrl(returnUrl) });

        if (string.IsNullOrWhiteSpace(callbackUrl))
        {
            return BadRequest(new { message = "Could not start Google login flow." });
        }

        var properties = _signInManager.ConfigureExternalAuthenticationProperties(
            GoogleDefaults.AuthenticationScheme,
            callbackUrl);

        return Challenge(properties, GoogleDefaults.AuthenticationScheme);
    }

    [HttpGet("google/callback")]
    public async Task<IActionResult> GoogleCallback([FromQuery] string? returnUrl = "/", [FromQuery] string? remoteError = null)
    {
        if (!string.IsNullOrWhiteSpace(remoteError))
        {
            return Redirect(BuildFrontendRedirectUri(returnUrl, $"Google authentication failed: {remoteError}"));
        }

        var info = await _signInManager.GetExternalLoginInfoAsync();
        if (info is null)
        {
            return Redirect(BuildFrontendRedirectUri(returnUrl, "Google authentication failed. Please try again."));
        }

        var externalSignIn = await _signInManager.ExternalLoginSignInAsync(
            info.LoginProvider,
            info.ProviderKey,
            isPersistent: true,
            bypassTwoFactor: true);

        AppUser? user;
        if (externalSignIn.Succeeded)
        {
            user = await _userManager.FindByLoginAsync(info.LoginProvider, info.ProviderKey);
        }
        else
        {
            var email = info.Principal.FindFirstValue(ClaimTypes.Email);
            if (string.IsNullOrWhiteSpace(email))
            {
                return Redirect(BuildFrontendRedirectUri(returnUrl, "Google account email was not provided."));
            }

            user = await _userManager.FindByEmailAsync(email);
            if (user is null)
            {
                var firstName = info.Principal.FindFirstValue(ClaimTypes.GivenName) ?? string.Empty;
                var lastName = info.Principal.FindFirstValue(ClaimTypes.Surname) ?? string.Empty;
                var displayName = info.Principal.FindFirstValue(ClaimTypes.Name) ?? $"{firstName} {lastName}".Trim();

                user = new AppUser
                {
                    UserName = email,
                    Email = email,
                    EmailConfirmed = true,
                    FirstName = firstName,
                    LastName = lastName,
                    DisplayName = string.IsNullOrWhiteSpace(displayName) ? email : displayName,
                };

                var create = await _userManager.CreateAsync(user);
                if (!create.Succeeded)
                {
                    var message = string.Join(" ", create.Errors.Select(error => error.Description));
                    return Redirect(BuildFrontendRedirectUri(returnUrl, message));
                }

                await _userManager.AddToRoleAsync(user, "Donor");
            }

            var addLogin = await _userManager.AddLoginAsync(user, info);
            if (!addLogin.Succeeded)
            {
                var message = string.Join(" ", addLogin.Errors.Select(error => error.Description));
                return Redirect(BuildFrontendRedirectUri(returnUrl, message));
            }

            await _signInManager.SignInAsync(user, isPersistent: true);
        }

        if (user is null)
        {
            return Redirect(BuildFrontendRedirectUri(returnUrl, "Google authentication failed. Please try again."));
        }

        await EnsureSupporterLinkAsync(user);
        return Redirect(BuildFrontendRedirectUri(returnUrl, null));
    }

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
        var roles = (await _userManager.GetRolesAsync(user))
            .Select(role => string.Equals(role, "Staff", StringComparison.OrdinalIgnoreCase) ? "Admin" : role)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(role => role, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        return new AuthUserResponse(
            user.Email ?? string.Empty,
            user.DisplayName ?? $"{user.FirstName} {user.LastName}".Trim() ?? user.Email ?? string.Empty,
            user.FirstName ?? string.Empty,
            user.LastName ?? string.Empty,
            user.SupporterId,
            roles);
    }

    private bool IsGoogleAuthConfigured()
    {
        var id = _configuration["Authentication:Google:ClientId"];
        var secret = _configuration["Authentication:Google:ClientSecret"];
        return !string.IsNullOrWhiteSpace(id) && !string.IsNullOrWhiteSpace(secret);
    }

    private static string NormalizeReturnUrl(string? returnUrl)
    {
        if (string.IsNullOrWhiteSpace(returnUrl)) return "/";
        if (!returnUrl.StartsWith('/')) return "/";
        if (returnUrl.StartsWith("//")) return "/";
        return returnUrl;
    }

    private string BuildFrontendRedirectUri(string? returnUrl, string? error)
    {
        var normalizedReturnUrl = NormalizeReturnUrl(returnUrl);
        var frontendBase = GetFrontendBaseUrl();

        if (string.IsNullOrWhiteSpace(frontendBase))
        {
            return string.IsNullOrWhiteSpace(error)
                ? normalizedReturnUrl
                : $"{normalizedReturnUrl}?error={Uri.EscapeDataString(error)}";
        }

        var destination = new Uri(new Uri(frontendBase.TrimEnd('/')), normalizedReturnUrl);
        var builder = new UriBuilder(destination);
        if (!string.IsNullOrWhiteSpace(error))
        {
            var query = $"error={Uri.EscapeDataString(error)}";
            builder.Query = string.IsNullOrWhiteSpace(builder.Query)
                ? query
                : $"{builder.Query.TrimStart('?')}&{query}";
        }

        return builder.Uri.ToString();
    }

    private string? GetFrontendBaseUrl()
    {
        var configured = _configuration["FrontendUrls"] ?? _configuration["FrontendUrl"];
        var origins = (configured ?? string.Empty)
            .Split([';', ',', ' '], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(origin => !string.IsNullOrWhiteSpace(origin))
            .Select(origin => origin.Trim().TrimEnd('/'))
            .ToArray();

        // In development we want Google callback redirects to land back on local frontend,
        // not a deployed site that may also be listed in FrontendUrls.
        if (_environment.IsDevelopment())
        {
            return origins.FirstOrDefault(origin =>
                       origin.StartsWith("http://localhost", StringComparison.OrdinalIgnoreCase)
                       || origin.StartsWith("https://localhost", StringComparison.OrdinalIgnoreCase))
                   ?? origins.FirstOrDefault();
        }

        return origins.FirstOrDefault(origin => origin.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
               ?? origins.FirstOrDefault();
    }
}
