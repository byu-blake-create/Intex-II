namespace NorthStarShelter.API.Models;

public class HealthWellbeingRecord
{
    public int HealthRecordId { get; set; }
    public int ResidentId { get; set; }
    public DateOnly? RecordDate { get; set; }
    public int? GeneralHealthScore { get; set; }
    public int? NutritionScore { get; set; }
    public int? SleepQualityScore { get; set; }
    public int? EnergyLevelScore { get; set; }
    public decimal? HeightCm { get; set; }
    public decimal? WeightKg { get; set; }
    public decimal? Bmi { get; set; }
    public bool? MedicalCheckupDone { get; set; }
    public bool? DentalCheckupDone { get; set; }
    public bool? PsychologicalCheckupDone { get; set; }
    public string? Notes { get; set; }

    public Resident Resident { get; set; } = null!;
}
