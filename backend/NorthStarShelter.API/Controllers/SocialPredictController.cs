using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;

namespace NorthStarShelter.API.Controllers;

// ── Request / Response records ────────────────────────────────────────────────

public record SocialPredictRequest(
    string Platform,
    int PostHour,
    int NumHashtags,
    int MentionsCount,
    int CaptionLength,
    bool HasCallToAction,
    bool FeaturesResidentStory,
    bool IsBoosted,
    float BoostBudgetPhp,
    int FollowerCountAtPost,
    int MonthNum,
    bool IsWeekend,
    string DayOfWeek,
    string PostType,
    string MediaType,
    string? CallToActionType,
    string ContentTopic,
    string SentimentTone,
    string? CampaignName
);

public record SocialPredictResponse(
    float EngagementPredictedRate,
    string EngagementPredictedPct,
    string EngagementTier,
    string EngagementTierDescription,
    int ClicksPredicted,
    string ClicksPredictedStr,
    string ClicksTier,
    string ClicksTierDescription,
    int ReachPredicted,
    string ReachTier,
    string ReachTierDescription,
    int ImpressionsPredicted,
    string ImpressionsTier,
    string ImpressionsTierDescription,
    string PlatformContext,
    string ModelNote,
    List<string> Tips
);

// ── Controller ────────────────────────────────────────────────────────────────

[ApiController]
[Route("api/socialpredict")]
[Authorize]
public class SocialPredictController : ControllerBase
{
    private readonly string _engagementModelPath;
    private readonly string _clicksModelPath;
    private readonly string _reachModelPath;
    private readonly string _impressionsModelPath;

    public SocialPredictController(IConfiguration config, IWebHostEnvironment env)
    {
        string contentRoot = env.ContentRootPath;
        string engRel = config["MlModels:EngagementModelPath"]
            ?? "../../IS455/models/social_post_performance_gb.onnx";
        string clkRel = config["MlModels:ClicksModelPath"]
            ?? "../../IS455/models/social_click_throughs_gb.onnx";
        string reachRel = config["MlModels:ReachModelPath"]
            ?? "../../IS455/models/social_reach_gb.onnx";
        string imprRel = config["MlModels:ImpressionsModelPath"]
            ?? "../../IS455/models/social_impressions_gb.onnx";

        _engagementModelPath = Path.GetFullPath(Path.Combine(contentRoot, engRel));
        _clicksModelPath = Path.GetFullPath(Path.Combine(contentRoot, clkRel));
        _reachModelPath = Path.GetFullPath(Path.Combine(contentRoot, reachRel));
        _impressionsModelPath = Path.GetFullPath(Path.Combine(contentRoot, imprRel));
    }

    [HttpPost]
    public ActionResult<SocialPredictResponse> Predict([FromBody] SocialPredictRequest req)
    {
        if (!System.IO.File.Exists(_engagementModelPath))
            return StatusCode(503, $"Engagement model not found at: {_engagementModelPath}");
        if (!System.IO.File.Exists(_clicksModelPath))
            return StatusCode(503, $"Clicks model not found at: {_clicksModelPath}");
        if (!System.IO.File.Exists(_reachModelPath))
            return StatusCode(503, $"Reach model not found at: {_reachModelPath}");
        if (!System.IO.File.Exists(_impressionsModelPath))
            return StatusCode(503, $"Impressions model not found at: {_impressionsModelPath}");

        float engRate = RunFloatModel(_engagementModelPath, req);
        engRate = Math.Max(0f, engRate);

        float clicksRaw = RunFloatModel(_clicksModelPath, req);
        int clicks = (int)Math.Max(0f, MathF.Round(clicksRaw));

        float reachRaw = RunFloatModel(_reachModelPath, req);
        int reach = (int)Math.Max(0f, MathF.Round(reachRaw));

        float imprRaw = RunFloatModel(_impressionsModelPath, req);
        int impressions = (int)Math.Max(0f, MathF.Round(imprRaw));

        // ── Tier logic ────────────────────────────────────────────────────────
        string engTier, engDesc;
        if (engRate < 0.07f)        { engTier = "Low";    engDesc = "Below average engagement. Try posting at peak hours or adding a call-to-action."; }
        else if (engRate < 0.15f)   { engTier = "Medium"; engDesc = "Decent engagement. Consider featuring a resident story to boost further."; }
        else                        { engTier = "High";   engDesc = "Excellent engagement! This post is performing well above average."; }

        string clicksTier, clicksDesc;
        if (clicks < 50)            { clicksTier = "Low";    clicksDesc = "Low click-throughs. Boosting or a stronger CTA may help."; }
        else if (clicks < 150)      { clicksTier = "Medium"; clicksDesc = "Moderate click-throughs. Good baseline performance."; }
        else                        { clicksTier = "High";   clicksDesc = "High click-throughs! This post is driving strong traffic."; }

        string reachTier, reachDesc;
        if (reach < 500)            { reachTier = "Low";    reachDesc = "Low reach. Try boosting or posting during peak hours."; }
        else if (reach < 2000)      { reachTier = "Medium"; reachDesc = "Moderate reach. Adding hashtags or a resident story may extend it."; }
        else                        { reachTier = "High";   reachDesc = "Excellent reach! This post is connecting with a wide audience."; }

        string imprTier, imprDesc;
        if (impressions < 1000)     { imprTier = "Low";    imprDesc = "Low impressions. Consider boosting to increase visibility."; }
        else if (impressions < 5000) { imprTier = "Medium"; imprDesc = "Moderate impressions. Good exposure for an organic post."; }
        else                        { imprTier = "High";   imprDesc = "High impressions! This post is getting strong visibility."; }

        // ── Platform context ──────────────────────────────────────────────────
        string platformContext = req.Platform.ToLowerInvariant() switch
        {
            "instagram" => "Instagram posts perform best with visuals and hashtags (9–13).",
            "facebook"  => "Facebook posts benefit from longer captions and calls-to-action.",
            "twitter" or "x" => "Keep captions concise; threads and questions drive replies.",
            "tiktok"    => "Short-form video content with trending sounds drives high engagement.",
            "linkedin"  => "Professional storytelling and employee advocacy perform best.",
            _           => $"{req.Platform} performance varies; use A/B testing to optimise.",
        };

        // ── Tips ──────────────────────────────────────────────────────────────
        var tips = new List<string>();
        if (!req.HasCallToAction)          tips.Add("Add a call-to-action to increase clicks.");
        if (!req.FeaturesResidentStory)    tips.Add("Feature a resident story to humanise your post.");
        if (!req.IsBoosted && clicks < 50) tips.Add("Consider boosting this post to expand reach.");
        if (req.NumHashtags is < 5 or > 15) tips.Add("Aim for 5–15 hashtags for optimal discoverability.");
        if (req.PostHour is < 8 or > 21)   tips.Add("Post between 8 AM–9 PM for peak audience activity.");
        if (tips.Count == 0)               tips.Add("Great post setup! Monitor performance after publishing.");

        var response = new SocialPredictResponse(
            EngagementPredictedRate:    engRate,
            EngagementPredictedPct:     $"{engRate * 100:F1}%",
            EngagementTier:             engTier,
            EngagementTierDescription:  engDesc,
            ClicksPredicted:            clicks,
            ClicksPredictedStr:         clicks.ToString("N0"),
            ClicksTier:                 clicksTier,
            ClicksTierDescription:      clicksDesc,
            ReachPredicted:             reach,
            ReachTier:                  reachTier,
            ReachTierDescription:       reachDesc,
            ImpressionsPredicted:       impressions,
            ImpressionsTier:            imprTier,
            ImpressionsTierDescription: imprDesc,
            PlatformContext:            platformContext,
            ModelNote:                  "Predictions from GradientBoostingRegressor (ONNX). For guidance only.",
            Tips:                       tips
        );

        return Ok(response);
    }

    // ── ONNX inference helper ─────────────────────────────────────────────────

    private static float RunFloatModel(string modelPath, SocialPredictRequest r)
    {
        using var session = new InferenceSession(modelPath);

        var inputs = new List<NamedOnnxValue>
        {
            // Numeric features — float [1,1]
            MakeFloat("post_hour",               r.PostHour),
            MakeFloat("num_hashtags",            r.NumHashtags),
            MakeFloat("mentions_count",          r.MentionsCount),
            MakeFloat("caption_length",          r.CaptionLength),
            MakeFloat("has_call_to_action",      r.HasCallToAction  ? 1f : 0f),
            MakeFloat("features_resident_story", r.FeaturesResidentStory ? 1f : 0f),
            MakeFloat("is_boosted",              r.IsBoosted        ? 1f : 0f),
            MakeFloat("boost_budget_php",        r.BoostBudgetPhp),
            MakeFloat("follower_count_at_post",  r.FollowerCountAtPost),
            MakeFloat("month_num",               r.MonthNum),
            MakeFloat("is_weekend",              r.IsWeekend        ? 1f : 0f),
            // Categorical features — string [1,1]
            MakeString("platform",             r.Platform),
            MakeString("day_of_week",          r.DayOfWeek),
            MakeString("post_type",            r.PostType),
            MakeString("media_type",           r.MediaType),
            MakeString("call_to_action_type",  r.CallToActionType ?? ""),
            MakeString("content_topic",        r.ContentTopic),
            MakeString("sentiment_tone",       r.SentimentTone),
            MakeString("campaign_name",        r.CampaignName ?? ""),
        };

        using var results = session.Run(inputs);
        var output = results.First(r => r.Name == "variable");
        var tensor = output.AsTensor<float>();
        return tensor[0];
    }

    private static NamedOnnxValue MakeFloat(string name, float value)
    {
        var t = new DenseTensor<float>(new[] { value }, new[] { 1, 1 });
        return NamedOnnxValue.CreateFromTensor(name, t);
    }

    private static NamedOnnxValue MakeString(string name, string value)
    {
        var t = new DenseTensor<string>(new[] { value }, new[] { 1, 1 });
        return NamedOnnxValue.CreateFromTensor(name, t);
    }
}
