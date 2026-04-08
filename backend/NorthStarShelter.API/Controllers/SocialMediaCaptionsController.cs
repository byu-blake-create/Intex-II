using System.Net.Http.Headers;
using System.Text.RegularExpressions;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NorthStarShelter.API.Data;
using NorthStarShelter.API.Helpers;

namespace NorthStarShelter.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SocialMediaCaptionsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;

    public SocialMediaCaptionsController(
        AppDbContext db,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
    }

    [HttpPost("generate")]
    public async Task<ActionResult<CaptionGenerateResponse>> Generate(
        [FromBody] CaptionGenerateRequest request,
        CancellationToken cancellationToken)
    {
        var apiKey = _configuration["Gemini:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
            return StatusCode(502, "Caption generation unavailable");

        // Top 3 posts matching platform ordered by engagement rate desc
        var examplePosts = await _db.SocialMediaPosts.AsNoTracking()
            .Where(p => p.Platform == request.Platform && p.EngagementRate != null && p.Caption != null)
            .OrderByDescending(p => p.EngagementRate)
            .Take(3)
            .Select(p => p.Caption!)
            .ToListAsync(cancellationToken);

        // Platform avg engagement and total post count
        var platformStats = await _db.SocialMediaPosts.AsNoTracking()
            .Where(p => p.Platform == request.Platform && p.EngagementRate != null)
            .GroupBy(p => p.Platform)
            .Select(g => new { AvgEngagement = g.Average(x => x.EngagementRate!.Value), PostCount = g.Count() })
            .FirstOrDefaultAsync(cancellationToken);

        var avgEngagement = platformStats?.AvgEngagement ?? 0m;
        var postCount = platformStats?.PostCount ?? 0;

        var examplesText = examplePosts.Count > 0
            ? string.Join("\n\n", examplePosts.Select((c, i) => $"Example {i + 1}: {c}"))
            : "No examples available yet.";

        var platformLengthHint = request.Platform switch
        {
            "Instagram" => "150-200 chars with hashtags",
            "Facebook" => "100-150 chars",
            "LinkedIn" => "200-300 chars professional tone",
            "TikTok" => "short punchy 50-100 chars",
            "YouTube" => "descriptive 150-250 chars",
            _ => "100-200 chars"
        };

        var prompt = $"""
            You are a social media copywriter for NorthStar Shelter, a domestic violence shelter in the Philippines.
            Write in a warm, hopeful, community-focused voice. Never use survivor names or identifying details.

            Platform: {request.Platform}
            Topic: {request.Topic}
            Tone: {request.Tone}
            Campaign: {request.Campaign ?? "General awareness"}
            Call to action: {request.CtaPhrase ?? "Learn more"}
            Include resident story angle: {request.IncludeResidentStory}
            Additional context: {request.AdditionalContext ?? "none"}

            Top performing examples on {request.Platform} (for voice reference):
            {examplesText}

            Organization context:
            - Average engagement on {request.Platform}: {avgEngagement:P1}
            - Total posts analyzed: {postCount}

            Write exactly 3 caption variants. Separate each with ---VARIANT--- on its own line.
            Each caption should be platform-appropriate length ({platformLengthHint}).
            Start each variant directly with the caption text — no labels or numbering.
            """;

        string rawText;
        try
        {
            var client = _httpClientFactory.CreateClient();
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key={apiKey}";
            var requestBody = JsonSerializer.Serialize(new
            {
                contents = new[]
                {
                    new { parts = new[] { new { text = prompt } } }
                }
            });

            var httpRequest = new HttpRequestMessage(HttpMethod.Post, url);
            httpRequest.Content = new StringContent(requestBody, Encoding.UTF8, "application/json");
            httpRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            var response = await client.SendAsync(httpRequest, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var errBody = await response.Content.ReadAsStringAsync(cancellationToken);
                return StatusCode(502, $"Gemini {(int)response.StatusCode}: {errBody[..Math.Min(300, errBody.Length)]}");
            }

            var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);
            using var doc = JsonDocument.Parse(responseJson);
            rawText = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString() ?? string.Empty;
        }
        catch (Exception ex)
        {
            return StatusCode(502, $"Caption error: {ex.GetType().Name}: {ex.Message}");
        }

        var variants = rawText
            .Split("---VARIANT---", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(NormalizeVariant)
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .ToList();

        var factsUsed = new List<string>
        {
            $"Top 3 {request.Platform} posts analyzed for voice reference",
            $"Platform avg engagement: {avgEngagement:P1}",
            $"Tone: {request.Tone}, Topic: {request.Topic}",
        };
        if (!string.IsNullOrWhiteSpace(request.CtaPhrase))
            factsUsed.Add($"CTA: {request.CtaPhrase}");

        return Ok(new CaptionGenerateResponse(
            variants,
            factsUsed,
            $"Written in a {request.Tone.ToLower()} voice for {request.Platform}, community-focused and shelter-appropriate.",
            "gemini-2.5-flash-lite"));
    }

    private static string NormalizeVariant(string variant)
    {
        var cleaned = variant.Trim();
        cleaned = Regex.Replace(
            cleaned,
            @"^\s*Here are\s+\d+\s+caption variants\s+for\s+.*?:\s*",
            string.Empty,
            RegexOptions.IgnoreCase | RegexOptions.Singleline);

        return cleaned.Trim();
    }
}
