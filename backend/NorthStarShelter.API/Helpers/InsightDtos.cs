namespace NorthStarShelter.API.Helpers;

public sealed record InsightModelInfo(
    string Name,
    string Version,
    string TrainedAt,
    string MetricLabel,
    string MetricValue,
    string? TopFactor = null);

public sealed record CommandCenterCard(
    string Id,
    string Tone,
    string Title,
    string Value,
    string PlainLanguage,
    string Detail,
    string Route,
    string RouteLabel,
    InsightModelInfo Model);

public sealed record CommandCenterPriority(
    string Title,
    string Detail,
    string Route,
    string RouteLabel);

public sealed record CommandCenterLane(
    string Title,
    string Description,
    string Route);

public sealed record CommandCenterDto(
    string SnapshotLabel,
    string Summary,
    string Disclaimer,
    IReadOnlyList<string> HeroChips,
    IReadOnlyList<CommandCenterCard> Cards,
    IReadOnlyList<CommandCenterPriority> Priorities,
    IReadOnlyList<CommandCenterLane> Lanes);

public sealed record SocialPlatformInsightDto(
    string Platform,
    decimal AvgEngagement,
    string BestHours,
    string TopContentType,
    string TopTone,
    int PostCount,
    string KeyInsight);

public sealed record SocialContentGapDto(
    string Platform,
    string Topic,
    decimal AvgEngagement,
    string PostFrequency,
    string Opportunity,
    string Priority);

public sealed record SocialTopPostDto(
    int PostId,
    string Platform,
    string Caption,
    decimal EngagementRate,
    string PostType,
    string Tone,
    string MediaType);

public sealed record SocialSuiteAnalyticsDto(
    IReadOnlyList<SocialPlatformInsightDto> PlatformInsights,
    IReadOnlyList<SocialContentGapDto> ContentGaps,
    IReadOnlyList<string> StaticInsights,
    IReadOnlyList<SocialTopPostDto> TopPosts);
