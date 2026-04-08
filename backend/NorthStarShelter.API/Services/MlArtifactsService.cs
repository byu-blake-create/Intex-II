using System.Text.Json;
using System.Text.Json.Serialization;

namespace NorthStarShelter.API.Services;

public sealed class MlArtifactsService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly IWebHostEnvironment _env;
    private readonly ILogger<MlArtifactsService> _logger;

    public MlArtifactsService(IWebHostEnvironment env, ILogger<MlArtifactsService> logger)
    {
        _env = env;
        _logger = logger;
    }

    public Task<ModelMetadata?> GetDonorRetentionMetadataAsync(CancellationToken cancellationToken) =>
        ReadJsonAsync<ModelMetadata>("donor_retention_rf_metadata.json", cancellationToken);

    public Task<ModelMetadata?> GetDonationValueMetadataAsync(CancellationToken cancellationToken) =>
        ReadJsonAsync<ModelMetadata>("donation_value_rf_metadata.json", cancellationToken);

    public Task<ModelMetadata?> GetResidentRiskMetadataAsync(CancellationToken cancellationToken) =>
        ReadJsonAsync<ModelMetadata>("resident_risk_gb_metadata.json", cancellationToken);

    public Task<ModelMetadata?> GetReintegrationMetadataAsync(CancellationToken cancellationToken) =>
        ReadJsonAsync<ModelMetadata>("reintegration_readiness_gb_metadata.json", cancellationToken);

    public Task<ModelMetadata?> GetSafehouseForecastMetadataAsync(CancellationToken cancellationToken) =>
        ReadJsonAsync<ModelMetadata>("safehouse_forecast_gb_metadata.json", cancellationToken);

    public Task<ModelMetadata?> GetSocialPostPerformanceMetadataAsync(CancellationToken cancellationToken) =>
        ReadJsonAsync<ModelMetadata>("social_post_performance_gb_metadata.json", cancellationToken);

    public async Task<IReadOnlyList<DonorRetentionPrediction>> GetDonorRetentionPredictionsAsync(CancellationToken cancellationToken)
    {
        var payload = await ReadJsonAsync<PredictionEnvelope<DonorRetentionPrediction>>("donor_retention_predictions.json", cancellationToken);
        return payload?.Predictions ?? [];
    }

    public async Task<IReadOnlyList<DonationValuePrediction>> GetDonationValuePredictionsAsync(CancellationToken cancellationToken)
    {
        var payload = await ReadJsonAsync<PredictionEnvelope<DonationValuePrediction>>("donation_value_predictions.json", cancellationToken);
        return payload?.Predictions ?? [];
    }

    public async Task<IReadOnlyList<ResidentRiskPrediction>> GetResidentRiskPredictionsAsync(CancellationToken cancellationToken)
    {
        var payload = await ReadJsonAsync<PredictionEnvelope<ResidentRiskPrediction>>("resident_risk_predictions.json", cancellationToken);
        return payload?.Predictions ?? [];
    }

    public async Task<IReadOnlyList<ReintegrationPrediction>> GetReintegrationPredictionsAsync(CancellationToken cancellationToken)
    {
        var payload = await ReadJsonAsync<PredictionEnvelope<ReintegrationPrediction>>("reintegration_readiness_predictions.json", cancellationToken);
        return payload?.Predictions ?? [];
    }

    public async Task<IReadOnlyList<SafehouseForecastPrediction>> GetSafehouseForecastPredictionsAsync(CancellationToken cancellationToken)
    {
        var payload = await ReadJsonAsync<PredictionEnvelope<SafehouseForecastPrediction>>("safehouse_forecast_predictions.json", cancellationToken);
        return payload?.Predictions ?? [];
    }

    private async Task<T?> ReadJsonAsync<T>(string filename, CancellationToken cancellationToken)
    {
        var path = ResolvePath(filename);
        if (path is null)
        {
            _logger.LogWarning("ML artifact {Filename} was not found in known model directories.", filename);
            return default;
        }

        await using var stream = File.OpenRead(path);
        return await JsonSerializer.DeserializeAsync<T>(stream, JsonOptions, cancellationToken);
    }

    private string? ResolvePath(string filename)
    {
        var candidates = new[]
        {
            Path.Combine(_env.ContentRootPath, "models", filename),
            Path.GetFullPath(Path.Combine(_env.ContentRootPath, "..", "..", "IS455", "models", filename))
        };

        return candidates.FirstOrDefault(File.Exists);
    }
}

public sealed record PredictionEnvelope<T>(
    [property: JsonPropertyName("generated_at")] string? GeneratedAt,
    [property: JsonPropertyName("model_version")] string? ModelVersion,
    [property: JsonPropertyName("predictions")] IReadOnlyList<T>? Predictions);

public sealed record ModelMetadata(
    [property: JsonPropertyName("name")] string? Name,
    [property: JsonPropertyName("trained_at")] string? TrainedAt,
    [property: JsonPropertyName("label_definition")] string? LabelDefinition,
    [property: JsonPropertyName("feature_names")] IReadOnlyList<string>? FeatureNames,
    [property: JsonPropertyName("metrics")] Dictionary<string, double>? Metrics,
    [property: JsonPropertyName("model_type")] string? ModelType,
    [property: JsonPropertyName("test_start")] string? TestStart,
    [property: JsonPropertyName("split_date")] string? SplitDate,
    [property: JsonPropertyName("split_cutoff")] string? SplitCutoff,
    [property: JsonPropertyName("threshold_php")] double? ThresholdPhp,
    [property: JsonPropertyName("decision_threshold")] double? DecisionThreshold);

public sealed record DonorRetentionPrediction(
    [property: JsonPropertyName("supporter_id")] int SupporterId,
    [property: JsonPropertyName("churn_probability")] double ChurnProbability,
    [property: JsonPropertyName("top_feature")] string? TopFeature,
    [property: JsonPropertyName("prediction_date")] string? PredictionDate);

public sealed record DonationValuePrediction(
    [property: JsonPropertyName("supporter_id")] int SupporterId,
    [property: JsonPropertyName("high_value_probability")] double HighValueProbability,
    [property: JsonPropertyName("threshold_php")] double ThresholdPhp,
    [property: JsonPropertyName("predicted_tier")] string? PredictedTier,
    [property: JsonPropertyName("prediction_date")] string? PredictionDate);

public sealed record ResidentRiskPrediction(
    [property: JsonPropertyName("resident_id")] int ResidentId,
    [property: JsonPropertyName("concern_probability")] double ConcernProbability,
    [property: JsonPropertyName("risk_level")] string? RiskLevel,
    [property: JsonPropertyName("top_factor")] string? TopFactor,
    [property: JsonPropertyName("prediction_date")] string? PredictionDate);

public sealed record ReintegrationPrediction(
    [property: JsonPropertyName("resident_id")] int ResidentId,
    [property: JsonPropertyName("favorable_probability")] double FavorableProbability,
    [property: JsonPropertyName("risk_level")] string? RiskLevel,
    [property: JsonPropertyName("top_factor")] string? TopFactor);

public sealed record SafehouseForecastPrediction(
    [property: JsonPropertyName("safehouse_id")] int SafehouseId,
    [property: JsonPropertyName("month")] string? Month,
    [property: JsonPropertyName("predicted_active_residents")] double PredictedActiveResidents,
    [property: JsonPropertyName("lower_bound")] double LowerBound,
    [property: JsonPropertyName("upper_bound")] double UpperBound);
