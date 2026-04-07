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
    public async Task<ActionResult<SocialSuiteAnalyticsDto>> GetInsights(CancellationToken cancellationToken)
    {
        var posts = await _db.SocialMediaPosts.AsNoTracking()
            .Where(p => p.Platform != null)
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

                return new SocialPlatformInsightDto(
                    g.Key,
                    avgEngagement,
                    bestHours.Length == 0 ? "No timing data yet" : string.Join(", ", bestHours),
                    topContentType,
                    topTone,
                    g.Count(),
                    $"{g.Key} averages {avgEngagement:P1} engagement across {g.Count()} live posts. Best observed times are {DescribeHours(bestHours)}.");
            })
            .OrderByDescending(x => x.AvgEngagement)
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

                return new SocialContentGapDto(
                    g.Key.Platform,
                    g.Key.Topic,
                    avg,
                    frequency,
                    $"'{g.Key.Topic}' posts on {g.Key.Platform} average {avg:P1} engagement across {count} live posts. Publishing this theme more consistently is the clearest data-backed opportunity.",
                    priority);
            })
            .OrderBy(g => Array.IndexOf(PriorityOrder, g.Priority))
            .ThenByDescending(g => g.AvgEngagement)
            .ThenBy(g => g.Platform)
            .Take(8)
            .ToList();

        var topPosts = postsWithEngagement
            .OrderByDescending(p => p.EngagementRate)
            .ThenByDescending(p => p.CreatedAt)
            .Take(5)
            .Select(p => new SocialTopPostDto(
                p.PostId,
                p.Platform,
                p.Caption ?? "No caption recorded.",
                p.EngagementRate,
                p.PostType ?? "Unknown",
                p.SentimentTone ?? "Unknown",
                p.MediaType ?? "Unknown"))
            .ToList();

        var insights = new List<string>();
        var topPlatform = platformInsights.FirstOrDefault();
        if (topPlatform is not null)
        {
            insights.Add($"{topPlatform.Platform} is the strongest live channel right now at {topPlatform.AvgEngagement:P1} average engagement.");
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
