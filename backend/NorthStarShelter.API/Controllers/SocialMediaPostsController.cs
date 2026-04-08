using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NorthStarShelter.API.Data;
using NorthStarShelter.API.Helpers;
using NorthStarShelter.API.Models;

namespace NorthStarShelter.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SocialMediaPostsController : ControllerBase
{
    private static readonly string[] PriorityOrder = ["critical", "high", "medium"];
    private readonly AppDbContext _db;

    public SocialMediaPostsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<PaginatedList<SocialMediaPost>>> GetList(
        [FromQuery] int pageNum = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? platform = null,
        [FromQuery] string? campaign = null,
        CancellationToken cancellationToken = default)
    {
        var query = _db.SocialMediaPosts.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(platform))
            query = query.Where(p => p.Platform == platform);
        if (!string.IsNullOrWhiteSpace(campaign))
            query = query.Where(p => p.CampaignName != null && p.CampaignName.Contains(campaign));
        query = query.OrderByDescending(p => p.CreatedAt).ThenByDescending(p => p.PostId);
        var (items, total) = await query.ToPageAsync(pageNum, pageSize, cancellationToken);
        return Ok(new PaginatedList<SocialMediaPost>(items, total));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<SocialMediaPost>> GetById(int id, CancellationToken cancellationToken)
    {
        var p = await _db.SocialMediaPosts.AsNoTracking().FirstOrDefaultAsync(x => x.PostId == id, cancellationToken);
        return p == null ? NotFound() : Ok(p);
    }

    [HttpGet("insights")]
    public async Task<ActionResult<SocialSuiteAnalyticsDto>> GetInsights(
        [FromQuery] string? platform = null,
        CancellationToken cancellationToken = default)
    {
        var query = _db.SocialMediaPosts.AsNoTracking()
            .Where(p => p.Platform != null);

        if (!string.IsNullOrWhiteSpace(platform))
            query = query.Where(p => p.Platform == platform);

        var posts = await query
            .OrderByDescending(p => p.CreatedAt)
            .Take(500)
            .Select(p => new
            {
                p.PostId,
                Platform = p.Platform!,
                p.CreatedAt,
                p.PostHour,
                p.PostType,
                p.MediaType,
                p.SentimentTone,
                p.ContentTopic,
                p.Caption,
                EngagementRate = p.EngagementRate ?? 0m,
                HasEngagement = p.EngagementRate != null,
                IsBoosted = p.IsBoosted ?? false,
                FeaturesResidentStory = p.FeaturesResidentStory ?? false,
                p.ClickThroughs,
            })
            .ToListAsync(cancellationToken);

        if (posts.Count == 0)
        {
            return Ok(new SocialSuiteAnalyticsDto([], [], [], []));
        }

        var postsWithEngagement = posts.Where(p => p.HasEngagement).ToList();

        var platformInsights = posts
            .GroupBy(p => p.Platform)
            .Select(g =>
            {
                var engagementRows = g.Where(x => x.HasEngagement).ToList();
                var avgEngagement = engagementRows.Count == 0 ? 0m : engagementRows.Average(x => x.EngagementRate);
                var bestHours = engagementRows
                    .Where(x => x.PostHour.HasValue)
                    .GroupBy(x => x.PostHour!.Value)
                    .OrderByDescending(x => x.Average(y => y.EngagementRate))
                    .ThenBy(x => x.Key)
                    .Take(2)
                    .Select(x => FormatHour(x.Key))
                    .ToArray();
                var topContentType = engagementRows
                    .Where(x => !string.IsNullOrWhiteSpace(x.PostType))
                    .GroupBy(x => x.PostType!)
                    .OrderByDescending(x => x.Average(y => y.EngagementRate))
                    .ThenByDescending(x => x.Count())
                    .Select(x => x.Key)
                    .FirstOrDefault() ?? "Unknown";
                var topTone = engagementRows
                    .Where(x => !string.IsNullOrWhiteSpace(x.SentimentTone))
                    .GroupBy(x => x.SentimentTone!)
                    .OrderByDescending(x => x.Average(y => y.EngagementRate))
                    .ThenByDescending(x => x.Count())
                    .Select(x => x.Key)
                    .FirstOrDefault() ?? "Unknown";

                var clickRows = g.Where(x => x.ClickThroughs.HasValue).ToList();
                decimal? avgClicks = clickRows.Count > 0 ? (decimal)clickRows.Average(x => (double)x.ClickThroughs!.Value) : null;

                return new SocialPlatformInsightDto(
                    g.Key,
                    avgEngagement,
                    bestHours.Length == 0 ? "No timing data yet" : string.Join(", ", bestHours),
                    topContentType,
                    topTone,
                    g.Count(),
                    avgClicks.HasValue
                        ? $"{g.Key} is the strongest live channel right now with {avgClicks.Value:F1} avg click-throughs per post across {g.Count()} posts."
                        : $"{g.Key} averages {avgEngagement:P1} engagement across {g.Count()} live posts.",
                    avgClicks);
            })
            .OrderByDescending(x => x.AvgClicks ?? 0)
            .ThenByDescending(x => x.AvgEngagement)
            .ThenByDescending(x => x.PostCount)
            .ToList();

        var contentGaps = postsWithEngagement
            .Where(p => !string.IsNullOrWhiteSpace(p.ContentTopic))
            .GroupBy(p => new { p.Platform, Topic = p.ContentTopic! })
            .Select(g =>
            {
                var count = g.Count();
                var avg = g.Average(x => x.EngagementRate);
                var frequency = count <= 2 ? "low" : count <= 6 ? "medium" : "high";
                var priority = count <= 2 && avg >= 0.10m ? "critical"
                    : count <= 4 && avg >= 0.08m ? "high"
                    : "medium";
                var clicksList = g.Where(x => x.ClickThroughs.HasValue).Select(x => (double)x.ClickThroughs!.Value).ToList();
                decimal? avgClicks = clicksList.Count > 0 ? (decimal)clicksList.Average() : null;

                return new SocialContentGapDto(
                    g.Key.Platform,
                    g.Key.Topic,
                    avg,
                    avgClicks,
                    frequency,
                    $"'{g.Key.Topic}' posts on {g.Key.Platform} average {avg:P1} engagement across {count} live posts. Publishing this theme more consistently is the clearest data-backed opportunity.",
                    priority);
            })
            .OrderBy(g => Array.IndexOf(PriorityOrder, g.Priority))
            .ThenByDescending(g => g.AvgClicks)
            .ThenByDescending(g => g.AvgEngagement)
            .ThenBy(g => g.Platform)
            .Take(8)
            .ToList();

        var topPosts = posts
            .Where(p => p.ClickThroughs.HasValue)
            .OrderByDescending(p => p.ClickThroughs)
            .ThenByDescending(p => p.CreatedAt)
            .Take(5)
            .Select(p => new SocialTopPostDto(
                p.PostId,
                p.Platform,
                p.Caption ?? "No caption recorded.",
                p.EngagementRate,
                p.ClickThroughs,
                p.PostType ?? "Unknown",
                p.SentimentTone ?? "Unknown",
                p.MediaType ?? "Unknown"))
            .ToList();

        var insights = new List<string>();
        var topPlatform = platformInsights.FirstOrDefault();
        if (topPlatform is not null)
        {
            insights.Add(topPlatform.AvgClicks.HasValue
                ? $"{topPlatform.Platform} is the strongest live channel right now with {topPlatform.AvgClicks.Value:F1} avg click-throughs per post."
                : $"{topPlatform.Platform} is the strongest live channel right now at {topPlatform.AvgEngagement:P1} average engagement.");
        }

        var bestHour = postsWithEngagement
            .Where(p => p.PostHour.HasValue)
            .GroupBy(p => p.PostHour!.Value)
            .OrderByDescending(g => g.Average(x => x.EngagementRate))
            .ThenBy(g => g.Key)
            .Select(g => FormatHour(g.Key))
            .FirstOrDefault();
        if (bestHour is not null)
        {
            insights.Add($"{bestHour} is currently the best-performing posting hour across the live social dataset.");
        }

        var topToneGlobal = postsWithEngagement
            .Where(p => !string.IsNullOrWhiteSpace(p.SentimentTone))
            .GroupBy(p => p.SentimentTone!)
            .OrderByDescending(g => g.Average(x => x.EngagementRate))
            .ThenByDescending(g => g.Count())
            .Select(g => g.Key)
            .FirstOrDefault();
        if (topToneGlobal is not null)
        {
            insights.Add($"{topToneGlobal} tone is the most effective tone in the current live post history.");
        }

        var boosted = postsWithEngagement.Where(p => p.IsBoosted).ToList();
        var organic = postsWithEngagement.Where(p => !p.IsBoosted).ToList();
        if (boosted.Count > 0 && organic.Count > 0)
        {
            insights.Add($"Boosted posts average {boosted.Average(p => p.EngagementRate):P1} engagement versus {organic.Average(p => p.EngagementRate):P1} for organic posts.");
        }

        var residentStory = postsWithEngagement.Where(p => p.FeaturesResidentStory).ToList();
        var noResidentStory = postsWithEngagement.Where(p => !p.FeaturesResidentStory).ToList();
        if (residentStory.Count > 0 && noResidentStory.Count > 0)
        {
            insights.Add($"Posts featuring resident stories average {residentStory.Average(p => p.EngagementRate):P1} engagement versus {noResidentStory.Average(p => p.EngagementRate):P1} without them.");
        }

        return Ok(new SocialSuiteAnalyticsDto(platformInsights, contentGaps, insights, topPosts));
    }

    [HttpGet("recommendations")]
    public async Task<ActionResult<List<SocialRecommendationDto>>> GetRecommendations(CancellationToken cancellationToken)
    {
        var posts = await _db.SocialMediaPosts.AsNoTracking()
            .Where(p => p.Platform != null && p.EngagementRate != null)
            .OrderByDescending(p => p.CreatedAt)
            .Take(500)
            .Select(p => new
            {
                Platform = p.Platform!,
                Topic = p.ContentTopic ?? "General",
                p.PostHour,
                EngagementRate = p.EngagementRate!.Value,
            })
            .ToListAsync(cancellationToken);

        if (posts.Count == 0)
            return Ok(new List<SocialRecommendationDto>());

        // Avg engagement per platform (baseline)
        var platformBaselines = posts
            .GroupBy(p => p.Platform)
            .ToDictionary(g => g.Key, g => g.Average(x => x.EngagementRate));

        // Best posting hour per platform
        var bestHourByPlatform = posts
            .Where(p => p.PostHour.HasValue)
            .GroupBy(p => p.Platform)
            .ToDictionary(
                g => g.Key,
                g => g.GroupBy(x => x.PostHour!.Value)
                      .OrderByDescending(h => h.Average(y => y.EngagementRate))
                      .ThenBy(h => h.Key)
                      .Select(h => h.Key)
                      .FirstOrDefault(-1));

        // High-opportunity combos: <4 posts but avg engagement > 0.08
        var recommendations = posts
            .GroupBy(p => new { p.Platform, p.Topic })
            .Where(g => g.Count() < 4 && g.Average(x => x.EngagementRate) > 0.08m)
            .Select(g =>
            {
                var avg = g.Average(x => x.EngagementRate);
                var baseline = platformBaselines.TryGetValue(g.Key.Platform, out var b) ? b : 0m;
                var bestHour = bestHourByPlatform.TryGetValue(g.Key.Platform, out var h) && h >= 0
                    ? FormatHour(h)
                    : "No timing data";
                var priority = avg >= 0.12m ? "high" : "medium";
                return new SocialRecommendationDto(
                    g.Key.Platform,
                    g.Key.Topic,
                    bestHour,
                    avg,
                    baseline,
                    $"'{g.Key.Topic}' on {g.Key.Platform} has only {g.Count()} post(s) but averages {avg:P1} engagement — {(avg - baseline):P1} above the platform baseline of {baseline:P1}. Posting more of this topic at {bestHour} is a high-leverage opportunity.",
                    priority);
            })
            .OrderByDescending(r => r.ExpectedEngagement)
            .ThenBy(r => r.Platform)
            .Take(5)
            .ToList();

        return Ok(recommendations);
    }

    private static string DescribeHours(IReadOnlyList<string> hours)
    {
        if (hours.Count == 0) return "no reliable timing data yet";
        if (hours.Count == 1) return hours[0];
        return $"{hours[0]} and {hours[1]}";
    }

    private static string FormatHour(int hour)
    {
        var period = hour >= 12 ? "pm" : "am";
        var normalized = hour % 12;
        if (normalized == 0) normalized = 12;
        return $"{normalized}{period}";
    }
}
