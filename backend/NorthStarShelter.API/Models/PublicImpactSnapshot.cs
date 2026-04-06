namespace NorthStarShelter.API.Models;

public class PublicImpactSnapshot
{
    public int SnapshotId { get; set; }
    public DateOnly? SnapshotDate { get; set; }
    public string? Headline { get; set; }
    public string? SummaryText { get; set; }
    public string? MetricPayloadJson { get; set; }
    public bool IsPublished { get; set; }
    public DateTime? PublishedAt { get; set; }
}
