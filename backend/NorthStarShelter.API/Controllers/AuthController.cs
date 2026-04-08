using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text;
using System.Text.Encodings.Web;
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
        string[] Roles,
        bool TwoFactorEnabled);

    public record TwoFactorLoginRequest(string? AuthenticatorCode, string? RecoveryCode);

    public record MfaSetupResponse(string SharedKey, string AuthenticatorUri);

    public record MfaConfirmRequest(string Code);

    public record MfaConfirmResponse(IReadOnlyList<string> RecoveryCodes, AuthUserResponse User);

    public record MfaDisableRequest(string? Password);

    [HttpGet("google/login")]
    public IActionResult GoogleLogin([FromQuery] string? returnUrl = "/")
    {
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

        if (result.RequiresTwoFactor)
        {
            return Ok(new { requiresTwoFactor = true });
        }

        if (!result.Succeeded)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        user = await EnsureSupporterLinkAsync(user);
        return Ok(await BuildAuthResponseAsync(user));
    }

    /// <summary>Completes password sign-in when TOTP MFA is enabled (uses the temporary 2FA cookie from <see cref="Login"/>).</summary>
    [HttpPost("login/2fa")]
    [AllowAnonymous]
    public async Task<IActionResult> LoginTwoFactor([FromBody] TwoFactorLoginRequest req)
    {
        var hasAuthenticator = !string.IsNullOrWhiteSpace(req.AuthenticatorCode);
        var hasRecovery = !string.IsNullOrWhiteSpace(req.RecoveryCode);
        if (hasAuthenticator == hasRecovery)
        {
            return BadRequest(new { message = "Send either authenticatorCode or recoveryCode (not both)." });
        }

        var pendingUser = await _signInManager.GetTwoFactorAuthenticationUserAsync();
        if (pendingUser is null)
        {
            return Unauthorized(new { message = "Your sign-in session expired. Please sign in again with your password." });
        }

        Microsoft.AspNetCore.Identity.SignInResult signInResult;
        if (hasRecovery)
        {
            signInResult = await _signInManager.TwoFactorRecoveryCodeSignInAsync(req.RecoveryCode!.Trim().Replace(" ", string.Empty, StringComparison.Ordinal));
        }
        else
        {
            var code = req.AuthenticatorCode!.Replace(" ", string.Empty, StringComparison.Ordinal).Trim();
            signInResult = await _signInManager.TwoFactorAuthenticatorSignInAsync(code, isPersistent: true, rememberClient: false);
        }

        if (!signInResult.Succeeded)
        {
            return Unauthorized(new { message = "Invalid verification or recovery code." });
        }

        var user = await _userManager.FindByIdAsync(pendingUser.Id);
        if (user is null)
        {
            return Unauthorized(new { message = "Account could not be loaded." });
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

    /// <summary>Begins authenticator enrollment. Keep at least one admin and one non-admin account without MFA for grading.</summary>
    [HttpPost("mfa/setup")]
    [Authorize]
    public async Task<IActionResult> BeginMfaSetup()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized();
        }

        if (await _userManager.GetTwoFactorEnabledAsync(user))
        {
            return BadRequest(new { message = "Two-factor sign-in is already on. Turn it off before running setup again." });
        }

        await _userManager.ResetAuthenticatorKeyAsync(user);
        var unformattedKey = await _userManager.GetAuthenticatorKeyAsync(user);
        if (string.IsNullOrWhiteSpace(unformattedKey))
        {
            return Problem(detail: "Could not create an authenticator key.");
        }

        var email = await _userManager.GetEmailAsync(user) ?? user.UserName ?? string.Empty;
        var uri = BuildAuthenticatorUri(email, unformattedKey);
        return Ok(new MfaSetupResponse(FormatAuthenticatorKey(unformattedKey), uri));
    }

    [HttpPost("mfa/confirm")]
    [Authorize]
    public async Task<IActionResult> ConfirmMfaSetup([FromBody] MfaConfirmRequest? req)
    {
        var code = (req?.Code ?? string.Empty).Replace(" ", string.Empty, StringComparison.Ordinal).Trim();
        if (string.IsNullOrWhiteSpace(code))
        {
            return BadRequest(new { message = "Enter the 6-digit code from your authenticator app." });
        }

        var user = await _userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized();
        }

        if (await _userManager.GetTwoFactorEnabledAsync(user))
        {
            return BadRequest(new { message = "Two-factor sign-in is already enabled." });
        }

        var tokenProvider = _userManager.Options.Tokens.AuthenticatorTokenProvider;
        if (string.IsNullOrWhiteSpace(tokenProvider))
        {
            tokenProvider = TokenOptions.DefaultAuthenticatorProvider;
        }

        var valid = await _userManager.VerifyTwoFactorTokenAsync(user, tokenProvider, code);
        if (!valid)
        {
            return BadRequest(new { message = "That code did not match. Check the time on your phone and try a new code." });
        }

        await _userManager.SetTwoFactorEnabledAsync(user, true);
        var recovery = await _userManager.GenerateNewTwoFactorRecoveryCodesAsync(user, 10);
        var codes = recovery is null ? Array.Empty<string>() : recovery.ToArray();
        return Ok(new MfaConfirmResponse(codes, await BuildAuthResponseAsync(user)));
    }

    [HttpPost("mfa/disable")]
    [Authorize]
    public async Task<IActionResult> DisableMfa([FromBody] MfaDisableRequest? req)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized();
        }

        if (!await _userManager.GetTwoFactorEnabledAsync(user))
        {
            return BadRequest(new { message = "Two-factor sign-in is not enabled." });
        }

        if (await _userManager.HasPasswordAsync(user))
        {
            if (string.IsNullOrWhiteSpace(req?.Password)
                || !await _userManager.CheckPasswordAsync(user, req.Password))
            {
                return Unauthorized(new { message = "Current password is required to turn off authenticator sign-in." });
            }
        }

        await _userManager.SetTwoFactorEnabledAsync(user, false);
        await _userManager.ResetAuthenticatorKeyAsync(user);
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
        var twoFa = await _userManager.GetTwoFactorEnabledAsync(user);
        return new AuthUserResponse(
            user.Email ?? string.Empty,
            user.DisplayName ?? $"{user.FirstName} {user.LastName}".Trim() ?? user.Email ?? string.Empty,
            user.FirstName ?? string.Empty,
            user.LastName ?? string.Empty,
            user.SupporterId,
            roles,
            twoFa);
    }

    private static string FormatAuthenticatorKey(string unformattedKey)
    {
        var sb = new StringBuilder();
        for (var i = 0; i < unformattedKey.Length; i++)
        {
            if (i > 0 && i % 4 == 0)
            {
                sb.Append(' ');
            }

            sb.Append(unformattedKey[i]);
        }

        return sb.ToString().ToLowerInvariant();
    }

    private static string BuildAuthenticatorUri(string email, string unformattedKey)
    {
        var issuer = UrlEncoder.Default.Encode("North Star Shelter");
        var account = UrlEncoder.Default.Encode(email);
        return $"otpauth://totp/{issuer}:{account}?secret={unformattedKey}&issuer={issuer}&digits=6";
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
