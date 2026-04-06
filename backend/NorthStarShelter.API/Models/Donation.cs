namespace NorthStarShelter.API.Models;

public class Donation
{
    public int DonationId { get; set; }
    public int SupporterId { get; set; }
    public string DonationType { get; set; } = string.Empty;
    public DateOnly? DonationDate { get; set; }
    public bool IsRecurring { get; set; }
    public string? CampaignName { get; set; }
    public string? ChannelSource { get; set; }
    public string? CurrencyCode { get; set; }
    public decimal? Amount { get; set; }
    public decimal? EstimatedValue { get; set; }
    public string? ImpactUnit { get; set; }
    public string? Notes { get; set; }
    public int? ReferralPostId { get; set; }

    public Supporter Supporter { get; set; } = null!;
    public SocialMediaPost? ReferralPost { get; set; }
    public ICollection<DonationAllocation> Allocations { get; set; } = new List<DonationAllocation>();
    public ICollection<InKindDonationItem> InKindItems { get; set; } = new List<InKindDonationItem>();
}
