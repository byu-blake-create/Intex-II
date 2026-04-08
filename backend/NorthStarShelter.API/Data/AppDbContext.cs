using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using NorthStarShelter.API.Models;

namespace NorthStarShelter.API.Data;

public class AppDbContext : IdentityDbContext<AppUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Safehouse> Safehouses => Set<Safehouse>();
    public DbSet<Partner> Partners => Set<Partner>();
    public DbSet<PartnerAssignment> PartnerAssignments => Set<PartnerAssignment>();
    public DbSet<Supporter> Supporters => Set<Supporter>();
    public DbSet<SupporterContact> SupporterContacts => Set<SupporterContact>();
    public DbSet<Donation> Donations => Set<Donation>();
    public DbSet<DonationAllocation> DonationAllocations => Set<DonationAllocation>();
    public DbSet<InKindDonationItem> InKindDonationItems => Set<InKindDonationItem>();
    public DbSet<Resident> Residents => Set<Resident>();
    public DbSet<ProcessRecording> ProcessRecordings => Set<ProcessRecording>();
    public DbSet<HomeVisitation> HomeVisitations => Set<HomeVisitation>();
    public DbSet<InterventionPlan> InterventionPlans => Set<InterventionPlan>();
    public DbSet<IncidentReport> IncidentReports => Set<IncidentReport>();
    public DbSet<EducationRecord> EducationRecords => Set<EducationRecord>();
    public DbSet<HealthWellbeingRecord> HealthWellbeingRecords => Set<HealthWellbeingRecord>();
    public DbSet<SafehouseMonthlyMetric> SafehouseMonthlyMetrics => Set<SafehouseMonthlyMetric>();
    public DbSet<SocialMediaPost> SocialMediaPosts => Set<SocialMediaPost>();
    public DbSet<PublicImpactSnapshot> PublicImpactSnapshots => Set<PublicImpactSnapshot>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Several imported Lighthouse-style entities use primary key names that
        // do not match EF Core's default `<TypeName>Id` convention, so define
        // them explicitly to keep model validation stable in production.
        builder.Entity<DonationAllocation>().HasKey(a => a.AllocationId);
        builder.Entity<HealthWellbeingRecord>().HasKey(h => h.HealthRecordId);
        builder.Entity<HomeVisitation>().HasKey(v => v.VisitationId);
        builder.Entity<InKindDonationItem>().HasKey(i => i.ItemId);
        builder.Entity<IncidentReport>().HasKey(i => i.IncidentId);
        builder.Entity<InterventionPlan>().HasKey(p => p.PlanId);
        builder.Entity<PartnerAssignment>().HasKey(a => a.AssignmentId);
        builder.Entity<ProcessRecording>().HasKey(p => p.RecordingId);
        builder.Entity<PublicImpactSnapshot>().HasKey(p => p.SnapshotId);
        builder.Entity<SafehouseMonthlyMetric>().HasKey(m => m.MetricId);
        builder.Entity<SocialMediaPost>().HasKey(p => p.PostId);

        builder.Entity<Resident>()
            .HasOne(r => r.Safehouse)
            .WithMany(s => s.Residents)
            .HasForeignKey(r => r.SafehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Donation>()
            .HasOne(d => d.Supporter)
            .WithMany(s => s.Donations)
            .HasForeignKey(d => d.SupporterId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<SupporterContact>()
            .HasOne(c => c.Supporter)
            .WithMany(s => s.Contacts)
            .HasForeignKey(c => c.SupporterId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<AppUser>()
            .HasOne(u => u.Supporter)
            .WithOne(s => s.User)
            .HasForeignKey<AppUser>(u => u.SupporterId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.Entity<Donation>()
            .HasOne(d => d.ReferralPost)
            .WithMany(p => p.ReferredDonations)
            .HasForeignKey(d => d.ReferralPostId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.Entity<DonationAllocation>()
            .HasOne(a => a.Donation)
            .WithMany(d => d.Allocations)
            .HasForeignKey(a => a.DonationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<DonationAllocation>()
            .HasOne(a => a.Safehouse)
            .WithMany(s => s.DonationAllocations)
            .HasForeignKey(a => a.SafehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<InKindDonationItem>()
            .HasOne(i => i.Donation)
            .WithMany(d => d.InKindItems)
            .HasForeignKey(i => i.DonationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<PartnerAssignment>()
            .HasOne(a => a.Partner)
            .WithMany(p => p.Assignments)
            .HasForeignKey(a => a.PartnerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<PartnerAssignment>()
            .HasOne(a => a.Safehouse)
            .WithMany(s => s.PartnerAssignments)
            .HasForeignKey(a => a.SafehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<ProcessRecording>()
            .HasOne(p => p.Resident)
            .WithMany(r => r.ProcessRecordings)
            .HasForeignKey(p => p.ResidentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<HomeVisitation>()
            .HasOne(v => v.Resident)
            .WithMany(r => r.HomeVisitations)
            .HasForeignKey(v => v.ResidentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<InterventionPlan>()
            .HasOne(p => p.Resident)
            .WithMany(r => r.InterventionPlans)
            .HasForeignKey(p => p.ResidentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<IncidentReport>()
            .HasOne(i => i.Resident)
            .WithMany(r => r.IncidentReports)
            .HasForeignKey(i => i.ResidentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<IncidentReport>()
            .HasOne(i => i.Safehouse)
            .WithMany(s => s.IncidentReports)
            .HasForeignKey(i => i.SafehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<EducationRecord>()
            .HasOne(e => e.Resident)
            .WithMany(r => r.EducationRecords)
            .HasForeignKey(e => e.ResidentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<HealthWellbeingRecord>()
            .HasOne(h => h.Resident)
            .WithMany(r => r.HealthWellbeingRecords)
            .HasForeignKey(h => h.ResidentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<SafehouseMonthlyMetric>()
            .HasOne(m => m.Safehouse)
            .WithMany(s => s.MonthlyMetrics)
            .HasForeignKey(m => m.SafehouseId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
