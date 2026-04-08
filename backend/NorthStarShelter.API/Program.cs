using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.EntityFrameworkCore;
using NorthStarShelter.API.Data;
using NorthStarShelter.API.Helpers;
using NorthStarShelter.API.Models;
using NorthStarShelter.API.Services;

DotEnvLoader.LoadIfPresent(
    Path.Combine(Directory.GetCurrentDirectory(), ".env"),
    Path.Combine(Directory.GetCurrentDirectory(), "backend", "NorthStarShelter.API", ".env"),
    Path.Combine(AppContext.BaseDirectory, ".env"));

var builder = WebApplication.CreateBuilder(args);

const string FrontendCorsPolicy = "FrontendClient";
var configuredFrontendOrigins = builder.Configuration["FrontendUrls"] ?? builder.Configuration["FrontendUrl"];
var allowedFrontendOrigins = ParseAllowedOrigins(
    configuredFrontendOrigins,
    "http://localhost:3000",
    "https://intex-ii-iota.vercel.app");
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient();
builder.Services.AddScoped<MlArtifactsService>();

// Local/dev fallback keeps public endpoints and auth-backed pages bootable even when
// a SQL connection string has not been configured yet.
builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (!string.IsNullOrWhiteSpace(connectionString))
    {
        options.UseSqlServer(connectionString, sqlOptions => sqlOptions.EnableRetryOnFailure());
        return;
    }

    options.UseInMemoryDatabase("NorthStarShelterDev");
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services.AddIdentity<AppUser, IdentityRole>(options =>
    {
        options.User.RequireUniqueEmail = true;
        options.Password.RequireDigit = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireNonAlphanumeric = false;
        options.Password.RequiredLength = 10;
    })
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

builder.Services
    .AddAuthentication()
    .AddGoogle(options =>
    {
        options.ClientId = builder.Configuration["Authentication:Google:ClientId"] ?? string.Empty;
        options.ClientSecret = builder.Configuration["Authentication:Google:ClientSecret"] ?? string.Empty;
        options.SignInScheme = IdentityConstants.ExternalScheme;
    });

builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.Name = "northstar.auth";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = builder.Environment.IsDevelopment()
        ? SameSiteMode.Lax
        : SameSiteMode.None;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.SameAsRequest
        : CookieSecurePolicy.Always;
    options.SlidingExpiration = true;
    options.ExpireTimeSpan = TimeSpan.FromHours(12);
    options.Events.OnRedirectToLogin = ctx =>
    {
        ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    };
    options.Events.OnRedirectToAccessDenied = ctx =>
    {
        ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    };
});

builder.Services.AddAuthorization();

builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
});

builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
    {
        policy.WithOrigins(allowedFrontendOrigins)
              .AllowCredentials()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

if (!string.IsNullOrWhiteSpace(connectionString))
{
    await DatabaseInitializer.InitializeAsync(app.Services, app.Configuration);
}
else
{
    await using var scope = app.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.EnsureCreatedAsync();
    await LocalDemoData.EnsureSeededAsync(db);
    await SeedData.InitializeAsync(scope.ServiceProvider, app.Configuration);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseForwardedHeaders();
app.UseResponseCompression();
app.UseCors(FrontendCorsPolicy);

app.Use(async (ctx, next) =>
{
    var cspHeader = BuildCspHeader(allowedFrontendOrigins);
    ctx.Response.Headers["Content-Security-Policy"] = cspHeader;
    ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
    ctx.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    ctx.Response.Headers["X-Frame-Options"] = "DENY";
    await next();
});

app.UseHttpsRedirection();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

static string[] ParseAllowedOrigins(string? configuredOrigins, params string[] defaults)
{
    var origins = (configuredOrigins ?? string.Empty)
        .Split([';', ',', ' '], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .Concat(defaults)
        .Where(origin => !string.IsNullOrWhiteSpace(origin))
        .Select(origin => origin.Trim().TrimEnd('/'))
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray();

    return origins.Length > 0 ? origins : defaults;
}

static string BuildCspHeader(IEnumerable<string> allowedFrontendOrigins)
{
    var connectSources = string.Join(' ', allowedFrontendOrigins
        .Where(origin => !string.IsNullOrWhiteSpace(origin))
        .Select(origin => origin.Trim().TrimEnd('/')));

    return "default-src 'self'; " +
           "script-src 'self'; " +
           "style-src 'self' 'unsafe-inline'; " +
           "img-src 'self' data: https:; " +
           "font-src 'self'; " +
           $"connect-src 'self' {connectSources}; " +
           "frame-ancestors 'none'; " +
           "base-uri 'self'; " +
           "form-action 'self'; " +
           "object-src 'none'";
}
