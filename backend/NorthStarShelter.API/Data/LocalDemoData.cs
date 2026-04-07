using Microsoft.EntityFrameworkCore;
using NorthStarShelter.API.Models;

namespace NorthStarShelter.API.Data;

public static class LocalDemoData
{
    public static async Task EnsureSeededAsync(AppDbContext db, CancellationToken cancellationToken = default)
    {
        if (!db.Database.IsInMemory())
            return;

        if (await db.PublicImpactSnapshots.AnyAsync(cancellationToken))
            return;

        var snapshots = new[]
        {
            CreateSnapshot(
                1,
                new DateOnly(2025, 9, 1),
                "North Star Shelter Impact Update - September 2025",
                "Anonymized aggregate report: 60 residents active, average health score 3.36, average education progress 79.41%.",
                "{'month': '2025-09', 'avg_health_score': 3.36, 'avg_education_progress': 79.41, 'total_residents': 60, 'donations_total_for_month': 3871.71}",
                new DateTime(2025, 9, 1, 0, 0, 0, DateTimeKind.Utc)),
            CreateSnapshot(
                2,
                new DateOnly(2025, 10, 1),
                "North Star Shelter Impact Update - October 2025",
                "Anonymized aggregate report: 60 residents active, average health score 3.31, average education progress 85.45%.",
                "{'month': '2025-10', 'avg_health_score': 3.31, 'avg_education_progress': 85.45, 'total_residents': 60, 'donations_total_for_month': 7802.06}",
                new DateTime(2025, 10, 1, 0, 0, 0, DateTimeKind.Utc)),
            CreateSnapshot(
                3,
                new DateOnly(2025, 11, 1),
                "North Star Shelter Impact Update - November 2025",
                "Anonymized aggregate report: 60 residents active, average health score 3.34, average education progress 82.01%.",
                "{'month': '2025-11', 'avg_health_score': 3.34, 'avg_education_progress': 82.01, 'total_residents': 60, 'donations_total_for_month': 12202.61}",
                new DateTime(2025, 11, 1, 0, 0, 0, DateTimeKind.Utc)),
            CreateSnapshot(
                4,
                new DateOnly(2025, 12, 1),
                "North Star Shelter Impact Update - December 2025",
                "Anonymized aggregate report: 60 residents active, average health score 3.38, average education progress 79.53%.",
                "{'month': '2025-12', 'avg_health_score': 3.38, 'avg_education_progress': 79.53, 'total_residents': 60, 'donations_total_for_month': 9862.44}",
                new DateTime(2025, 12, 1, 0, 0, 0, DateTimeKind.Utc)),
            CreateSnapshot(
                5,
                new DateOnly(2026, 1, 1),
                "North Star Shelter Impact Update - January 2026",
                "Anonymized aggregate report: 60 residents active, average health score 3.87, average education progress 100.0%.",
                "{'month': '2026-01', 'avg_health_score': 3.87, 'avg_education_progress': 100.0, 'total_residents': 60, 'donations_total_for_month': 2527.99}",
                new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)),
            CreateSnapshot(
                6,
                new DateOnly(2026, 2, 1),
                "North Star Shelter Impact Update - February 2026",
                "Anonymized aggregate report: 60 residents active, average health score 3.94, average education progress 100.0%.",
                "{'month': '2026-02', 'avg_health_score': 3.94, 'avg_education_progress': 100.0, 'total_residents': 60, 'donations_total_for_month': 3382.25}",
                new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc)),
        };

        await db.PublicImpactSnapshots.AddRangeAsync(snapshots, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
    }

    private static PublicImpactSnapshot CreateSnapshot(
        int id,
        DateOnly snapshotDate,
        string headline,
        string summaryText,
        string metricPayloadJson,
        DateTime publishedAt)
    {
        return new PublicImpactSnapshot
        {
            SnapshotId = id,
            SnapshotDate = snapshotDate,
            Headline = headline,
            SummaryText = summaryText,
            MetricPayloadJson = metricPayloadJson,
            IsPublished = true,
            PublishedAt = publishedAt,
        };
    }
}
