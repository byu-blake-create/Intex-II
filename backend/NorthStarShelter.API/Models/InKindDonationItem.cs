namespace NorthStarShelter.API.Models;

public class InKindDonationItem
{
    public int ItemId { get; set; }
    public int DonationId { get; set; }
    public string? ItemName { get; set; }
    public string? ItemCategory { get; set; }
    public decimal? Quantity { get; set; }
    public string? UnitOfMeasure { get; set; }
    public decimal? EstimatedUnitValue { get; set; }
    public string? IntendedUse { get; set; }
    public string? ReceivedCondition { get; set; }

    public Donation Donation { get; set; } = null!;
}
