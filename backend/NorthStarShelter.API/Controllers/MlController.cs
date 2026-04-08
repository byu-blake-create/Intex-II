using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NorthStarShelter.API.Data;
using NorthStarShelter.API.Services;

namespace NorthStarShelter.API.Controllers;

[ApiController]
[Route("api/ml")]
[Authorize(Roles = "Admin,Staff")]
public class MlController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly MlArtifactsService _artifacts;

    public MlController(AppDbContext db, MlArtifactsService artifacts)
    {
        _db = db;
        _artifacts = artifacts;
    }

    public record ModelCatalogItemDto(
        string Id,
        string Name,
        string ModelType,
        string TrainedAt,
        string MetricLabel,
        string MetricValue,
        string LabelDefinition);

    public record DonorInsightDto(
        int SupporterId,
        string DisplayName,
        string SupporterType,
        string? Status,
        string? Email,
        double ChurnProbability,
        string? TopFactor,
        double? HighValueProbability,
        string? OpportunityTier,
        string? PredictionDate);

    public record ResidentInsightDto(
        int ResidentId,
        string CaseControlNo,
        string? CaseStatus,
        string? CaseCategory,
        string? AssignedSocialWorker,
        int SafehouseId,
        string SafehouseName,
        double ConcernProbability,
        string? RiskLevel,
        string? TopFactor,
        string? PredictionDate);

    public record ReintegrationInsightDto(
        int ResidentId,
        string CaseControlNo,
        string? CaseStatus,
        string? ReintegrationStatus,
        int SafehouseId,
        string SafehouseName,
        double FavorableProbability,
        string? ReadinessLevel,
        string? TopFactor);

    public record SafehouseForecastDto(
        int SafehouseId,
        string SafehouseName,
        string Month,
        double PredictedActiveResidents,
        double LowerBound,
        double UpperBound,
        int? CapacityGirls,
        double? CapacityUtilization,
        bool NeedsAttention);

    [HttpGet("watchlist/donors")]
    public async Task<ActionResult<IReadOnlyList<DonorInsightDto>>> GetDonorWatchlist(
        [FromQuery] int? supporterId,
        [FromQuery] int limit = 25,
        CancellationToken cancellationToken = default)
    {
        var churnPredictions = await _artifacts.GetDonorRetentionPredictionsAsync(cancellationToken);
        var valuePredictions = await _artifacts.GetDonationValuePredictionsAsync(cancellationToken);

        var supportIds = churnPredictions.Select(p => p.SupporterId)
            .Concat(valuePredictions.Select(p => p.SupporterId))
            .Distinct()
            .ToArray();

        var supporters = await _db.Supporters.AsNoTracking()
            .Where(s => supportIds.Contains(s.SupporterId))
            .Select(s => new
            {
                s.SupporterId,
                s.DisplayName,
                s.SupporterType,
                s.Status,
                s.Email
            })
            .ToDictionaryAsync(s => s.SupporterId, cancellationToken);

        var valueMap = valuePredictions.ToDictionary(p => p.SupporterId);

        var items = churnPredictions
            .Where(p => supporterId is null || p.SupporterId == supporterId.Value)
            .Where(p => supporters.ContainsKey(p.SupporterId))
            .OrderByDescending(p => p.ChurnProbability)
            .Take(Math.Max(limit, 1))
            .Select(p =>
            {
                var supporter = supporters[p.SupporterId];
                valueMap.TryGetValue(p.SupporterId, out var opportunity);
                return new DonorInsightDto(
                    supporter.SupporterId,
                    supporter.DisplayName,
                    supporter.SupporterType,
                    supporter.Status,
                    supporter.Email,
                    p.ChurnProbability,
                    p.TopFeature,
                    opportunity?.HighValueProbability,
                    opportunity?.PredictedTier,
                    p.PredictionDate);
            })
            .ToArray();

        return Ok(items);
    }

    [HttpGet("top-opportunities")]
    public async Task<ActionResult<IReadOnlyList<DonorInsightDto>>> GetTopOpportunities(
        [FromQuery] int? supporterId,
        [FromQuery] int limit = 25,
        CancellationToken cancellationToken = default)
    {
        var valuePredictions = await _artifacts.GetDonationValuePredictionsAsync(cancellationToken);
        var churnMap = (await _artifacts.GetDonorRetentionPredictionsAsync(cancellationToken))
            .ToDictionary(p => p.SupporterId);

        var supporterIds = valuePredictions.Select(p => p.SupporterId).Distinct().ToArray();
        var supporters = await _db.Supporters.AsNoTracking()
            .Where(s => supporterIds.Contains(s.SupporterId))
            .Select(s => new
            {
                s.SupporterId,
                s.DisplayName,
                s.SupporterType,
                s.Status,
                s.Email
            })
            .ToDictionaryAsync(s => s.SupporterId, cancellationToken);

        var items = valuePredictions
            .Where(p => supporterId is null || p.SupporterId == supporterId.Value)
            .Where(p => supporters.ContainsKey(p.SupporterId))
            .OrderByDescending(p => p.HighValueProbability)
            .Take(Math.Max(limit, 1))
            .Select(p =>
            {
                var supporter = supporters[p.SupporterId];
                churnMap.TryGetValue(p.SupporterId, out var churn);
                return new DonorInsightDto(
                    supporter.SupporterId,
                    supporter.DisplayName,
                    supporter.SupporterType,
                    supporter.Status,
                    supporter.Email,
                    churn?.ChurnProbability ?? 0,
                    churn?.TopFeature,
                    p.HighValueProbability,
                    p.PredictedTier,
                    p.PredictionDate);
            })
            .ToArray();

        return Ok(items);
    }

    [HttpGet("watchlist/residents")]
    public async Task<ActionResult<IReadOnlyList<ResidentInsightDto>>> GetResidentWatchlist(
        [FromQuery] int? residentId,
        [FromQuery] int limit = 25,
        CancellationToken cancellationToken = default)
    {
        var predictions = await _artifacts.GetResidentRiskPredictionsAsync(cancellationToken);
        var residentIds = predictions.Select(p => p.ResidentId).Distinct().ToArray();

        var residents = await _db.Residents.AsNoTracking()
            .Where(r => residentIds.Contains(r.ResidentId))
            .Select(r => new
            {
                r.ResidentId,
                r.CaseControlNo,
                r.CaseStatus,
                r.CaseCategory,
                r.AssignedSocialWorker,
                r.SafehouseId
            })
            .ToDictionaryAsync(r => r.ResidentId, cancellationToken);

        var safehouseIds = residents.Values.Select(r => r.SafehouseId).Distinct().ToArray();
        var safehouses = await _db.Safehouses.AsNoTracking()
            .Where(s => safehouseIds.Contains(s.SafehouseId))
            .ToDictionaryAsync(s => s.SafehouseId, s => s.Name, cancellationToken);

        var items = predictions
            .Where(p => residentId is null || p.ResidentId == residentId.Value)
            .Where(p => residents.ContainsKey(p.ResidentId))
            .OrderByDescending(p => p.ConcernProbability)
            .Take(Math.Max(limit, 1))
            .Select(p =>
            {
                var resident = residents[p.ResidentId];
                return new ResidentInsightDto(
                    resident.ResidentId,
                    resident.CaseControlNo,
                    resident.CaseStatus,
                    resident.CaseCategory,
                    resident.AssignedSocialWorker,
                    resident.SafehouseId,
                    safehouses.GetValueOrDefault(resident.SafehouseId, $"Safehouse {resident.SafehouseId}"),
                    p.ConcernProbability,
                    p.RiskLevel,
                    p.TopFactor,
                    p.PredictionDate);
            })
            .ToArray();

        return Ok(items);
    }

    [HttpGet("reintegration")]
    public async Task<ActionResult<IReadOnlyList<ReintegrationInsightDto>>> GetReintegrationPredictions(
        [FromQuery] int? residentId,
        [FromQuery] int limit = 25,
        CancellationToken cancellationToken = default)
    {
        var items = await BuildReintegrationInsightsAsync(residentId, limit, cancellationToken);
        return Ok(items);
    }

    [HttpGet("reintegration/{residentId:int}")]
    public async Task<ActionResult<ReintegrationInsightDto>> GetReintegrationPrediction(
        int residentId,
        CancellationToken cancellationToken)
    {
        var items = await BuildReintegrationInsightsAsync(residentId, 1, cancellationToken);
        var item = items.FirstOrDefault();
        return item is null ? NotFound() : Ok(item);
    }

    [HttpGet("safehouse-forecast")]
    public async Task<ActionResult<IReadOnlyList<SafehouseForecastDto>>> GetSafehouseForecast(
        [FromQuery] string? month,
        CancellationToken cancellationToken)
    {
        var predictions = await _artifacts.GetSafehouseForecastPredictionsAsync(cancellationToken);
        if (predictions.Count == 0)
        {
            return Ok(Array.Empty<SafehouseForecastDto>());
        }

        var selectedMonth = !string.IsNullOrWhiteSpace(month)
            ? month
            : predictions
                .Select(p => p.Month)
                .Where(m => !string.IsNullOrWhiteSpace(m))
                .OrderBy(m => m)
                .FirstOrDefault();

        var filtered = predictions
            .Where(p => string.Equals(p.Month, selectedMonth, StringComparison.Ordinal))
            .ToArray();

        var safehouseIds = filtered.Select(p => p.SafehouseId).Distinct().ToArray();
        var safehouses = await _db.Safehouses.AsNoTracking()
            .Where(s => safehouseIds.Contains(s.SafehouseId))
            .ToDictionaryAsync(
                s => s.SafehouseId,
                s => new { s.Name, s.CapacityGirls },
                cancellationToken);

        var items = filtered
            .Select(p =>
            {
                safehouses.TryGetValue(p.SafehouseId, out var safehouse);
                var capacity = safehouse?.CapacityGirls;
                double? utilization = capacity is > 0
                    ? (double?)(p.PredictedActiveResidents / capacity.Value)
                    : null;

                return new SafehouseForecastDto(
                    p.SafehouseId,
                    safehouse?.Name ?? $"Safehouse {p.SafehouseId}",
                    p.Month ?? "Unknown",
                    p.PredictedActiveResidents,
                    p.LowerBound,
                    p.UpperBound,
                    capacity,
                    utilization,
                    utilization is >= 0.85);
            })
            .OrderByDescending(p => p.CapacityUtilization ?? 0)
            .ThenBy(p => p.SafehouseName)
            .ToArray();

        return Ok(items);
    }

    [HttpGet("models")]
    public async Task<ActionResult<IReadOnlyList<ModelCatalogItemDto>>> GetModelCatalog(CancellationToken cancellationToken)
    {
        var models = new (string Id, Func<CancellationToken, Task<ModelMetadata?>> Load)[]
        {
            ("donor-retention", _artifacts.GetDonorRetentionMetadataAsync),
            ("donation-value", _artifacts.GetDonationValueMetadataAsync),
            ("resident-risk", _artifacts.GetResidentRiskMetadataAsync),
            ("reintegration-readiness", _artifacts.GetReintegrationMetadataAsync),
            ("safehouse-forecast", _artifacts.GetSafehouseForecastMetadataAsync),
            ("social-post-performance", _artifacts.GetSocialPostPerformanceMetadataAsync)
        };

        var items = new List<ModelCatalogItemDto>();
        foreach (var model in models)
        {
            var metadata = await model.Load(cancellationToken);
            if (metadata is null || string.IsNullOrWhiteSpace(metadata.Name))
            {
                continue;
            }

            var (metricLabel, metricValue) = PickPrimaryMetric(metadata);
            items.Add(new ModelCatalogItemDto(
                model.Id,
                metadata.Name,
                metadata.ModelType ?? "Unknown",
                metadata.TrainedAt ?? "Unknown",
                metricLabel,
                metricValue,
                metadata.LabelDefinition ?? string.Empty));
        }

        return Ok(items);
    }

    private async Task<IReadOnlyList<ReintegrationInsightDto>> BuildReintegrationInsightsAsync(
        int? residentId,
        int limit,
        CancellationToken cancellationToken)
    {
        var predictions = await _artifacts.GetReintegrationPredictionsAsync(cancellationToken);
        var residentIds = predictions.Select(p => p.ResidentId).Distinct().ToArray();

        var residents = await _db.Residents.AsNoTracking()
            .Where(r => residentIds.Contains(r.ResidentId))
            .Select(r => new
            {
                r.ResidentId,
                r.CaseControlNo,
                r.CaseStatus,
                r.ReintegrationStatus,
                r.SafehouseId
            })
            .ToDictionaryAsync(r => r.ResidentId, cancellationToken);

        var safehouseIds = residents.Values.Select(r => r.SafehouseId).Distinct().ToArray();
        var safehouses = await _db.Safehouses.AsNoTracking()
            .Where(s => safehouseIds.Contains(s.SafehouseId))
            .ToDictionaryAsync(s => s.SafehouseId, s => s.Name, cancellationToken);

        return predictions
            .Where(p => residentId is null || p.ResidentId == residentId.Value)
            .Where(p => residents.ContainsKey(p.ResidentId))
            .OrderByDescending(p => p.FavorableProbability)
            .Take(Math.Max(limit, 1))
            .Select(p =>
            {
                var resident = residents[p.ResidentId];
                return new ReintegrationInsightDto(
                    resident.ResidentId,
                    resident.CaseControlNo,
                    resident.CaseStatus,
                    resident.ReintegrationStatus,
                    resident.SafehouseId,
                    safehouses.GetValueOrDefault(resident.SafehouseId, $"Safehouse {resident.SafehouseId}"),
                    p.FavorableProbability,
                    p.RiskLevel,
                    p.TopFactor);
            })
            .ToArray();
    }

    private static (string Label, string Value) PickPrimaryMetric(ModelMetadata metadata)
    {
        if (metadata.Metrics is null || metadata.Metrics.Count == 0)
        {
            return ("Metric", "n/a");
        }

        var preferredOrder = new[] { "f1", "roc_auc", "rmse", "mae", "r2", "accuracy", "precision", "recall" };
        foreach (var key in preferredOrder)
        {
            if (metadata.Metrics.TryGetValue(key, out var metric))
            {
                return (FormatMetricLabel(key), FormatMetricValue(key, metric));
            }
        }

        var first = metadata.Metrics.First();
        return (FormatMetricLabel(first.Key), FormatMetricValue(first.Key, first.Value));
    }

    private static string FormatMetricLabel(string key) => key.ToUpperInvariant().Replace("_", "-");

    private static string FormatMetricValue(string key, double value) =>
        key.Equals("rmse", StringComparison.OrdinalIgnoreCase) || key.Equals("mae", StringComparison.OrdinalIgnoreCase)
            ? value.ToString("0.###")
            : value.ToString("0.###");
}
