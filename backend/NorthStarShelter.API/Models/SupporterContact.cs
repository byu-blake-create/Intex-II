namespace NorthStarShelter.API.Models;

public class SupporterContact
{
    public int SupporterContactId { get; set; }
    public int SupporterId { get; set; }
    public DateOnly ContactDate { get; set; }
    public string ContactType { get; set; } = string.Empty;
    public string? Outcome { get; set; }
    public string? Notes { get; set; }
    public DateTime? CreatedAt { get; set; }

    public Supporter Supporter { get; set; } = null!;
}
