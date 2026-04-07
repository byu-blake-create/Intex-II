using System.Globalization;
using System.Linq.Expressions;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using NorthStarShelter.API.Data;
using NorthStarShelter.API.Models;

namespace NorthStarShelter.API.Helpers;

public sealed record AdminDatabaseFieldDto(
    string Name,
    string Label,
    string InputType,
    bool IsPrimaryKey,
    bool IsRequired,
    bool IsNullable,
    bool IsReadOnly,
    bool IsForeignKey,
    string? LookupRoute);

public sealed record AdminDatabaseTableDto(
    string Key,
    string Label,
    string PrimaryKey,
    string DefaultSort,
    IReadOnlyList<string> SearchFields,
    IReadOnlyList<string> ListColumns,
    IReadOnlyList<AdminDatabaseFieldDto> Fields);

public sealed record AdminDatabasePageDto(
    IReadOnlyList<Dictionary<string, object?>> Items,
    int TotalCount);

public sealed record AdminDatabaseLookupOptionDto(
    string Value,
    string Label);

public interface IAdminDatabaseTable
{
    string Key { get; }
    string Label { get; }
    string PrimaryKey { get; }
    Type EntityClrType { get; }

    AdminDatabaseTableDto BuildMetadata(AppDbContext db);
    Task<AdminDatabasePageDto> GetPageAsync(AppDbContext db, int pageNum, int pageSize, string? search, CancellationToken cancellationToken);
    Task<Dictionary<string, object?>?> GetByIdAsync(AppDbContext db, string id, CancellationToken cancellationToken);
    Task<Dictionary<string, object?>> CreateAsync(AppDbContext db, JsonElement payload, CancellationToken cancellationToken);
    Task<bool> UpdateAsync(AppDbContext db, string id, JsonElement payload, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(AppDbContext db, string id, CancellationToken cancellationToken);
    Task<IReadOnlyList<AdminDatabaseLookupOptionDto>> GetLookupAsync(AppDbContext db, string field, CancellationToken cancellationToken);
    Task<IReadOnlyList<AdminDatabaseLookupOptionDto>> GetLookupOptionsAsync(AppDbContext db, CancellationToken cancellationToken);
}

public static class AdminDatabaseRegistry
{
    private static readonly IAdminDatabaseTable[] OrderedTables =
    [
        new AdminDatabaseTable<Safehouse>(
            key: "safehouses",
            label: "Safehouses",
            primaryKey: nameof(Safehouse.SafehouseId),
            defaultSort: "-SafehouseId",
            listColumns: [nameof(Safehouse.SafehouseId), nameof(Safehouse.Name), nameof(Safehouse.SafehouseCode), nameof(Safehouse.City), nameof(Safehouse.Status)],
            searchFields: [nameof(Safehouse.Name), nameof(Safehouse.SafehouseCode), nameof(Safehouse.City), nameof(Safehouse.Region), nameof(Safehouse.Status)],
            optionLabelFields: [nameof(Safehouse.Name), nameof(Safehouse.SafehouseCode)]),
        new AdminDatabaseTable<Partner>(
            key: "partners",
            label: "Partners",
            primaryKey: nameof(Partner.PartnerId),
            defaultSort: "-PartnerId",
            listColumns: [nameof(Partner.PartnerId), nameof(Partner.PartnerName), nameof(Partner.PartnerType), nameof(Partner.ContactName), nameof(Partner.Status)],
            searchFields: [nameof(Partner.PartnerName), nameof(Partner.PartnerType), nameof(Partner.RoleType), nameof(Partner.ContactName), nameof(Partner.Email), nameof(Partner.Region), nameof(Partner.Status)],
            optionLabelFields: [nameof(Partner.PartnerName), nameof(Partner.ContactName)]),
        new AdminDatabaseTable<PartnerAssignment>(
            key: "partnerAssignments",
            label: "Partner Assignments",
            primaryKey: nameof(PartnerAssignment.AssignmentId),
            defaultSort: "-AssignmentId",
            listColumns: [nameof(PartnerAssignment.AssignmentId), nameof(PartnerAssignment.PartnerId), nameof(PartnerAssignment.SafehouseId), nameof(PartnerAssignment.ProgramArea), nameof(PartnerAssignment.Status)],
            searchFields: [nameof(PartnerAssignment.ProgramArea), nameof(PartnerAssignment.ResponsibilityNotes), nameof(PartnerAssignment.Status)],
            optionLabelFields: [nameof(PartnerAssignment.ProgramArea)]),
        new AdminDatabaseTable<Supporter>(
            key: "supporters",
            label: "Supporters",
            primaryKey: nameof(Supporter.SupporterId),
            defaultSort: "-SupporterId",
            listColumns: [nameof(Supporter.SupporterId), nameof(Supporter.DisplayName), nameof(Supporter.SupporterType), nameof(Supporter.Email), nameof(Supporter.Status)],
            searchFields: [nameof(Supporter.DisplayName), nameof(Supporter.OrganizationName), nameof(Supporter.FirstName), nameof(Supporter.LastName), nameof(Supporter.Email), nameof(Supporter.Phone), nameof(Supporter.Region), nameof(Supporter.Status)],
            optionLabelFields: [nameof(Supporter.DisplayName), nameof(Supporter.Email)]),
        new AdminDatabaseTable<Donation>(
            key: "donations",
            label: "Donations",
            primaryKey: nameof(Donation.DonationId),
            defaultSort: "-DonationId",
            listColumns: [nameof(Donation.DonationId), nameof(Donation.SupporterId), nameof(Donation.DonationType), nameof(Donation.Amount), nameof(Donation.DonationDate)],
            searchFields: [nameof(Donation.DonationType), nameof(Donation.CampaignName), nameof(Donation.ChannelSource), nameof(Donation.CurrencyCode), nameof(Donation.ImpactUnit), nameof(Donation.Notes)],
            optionLabelFields: [nameof(Donation.DonationType), nameof(Donation.CampaignName), nameof(Donation.DonationDate)]),
        new AdminDatabaseTable<DonationAllocation>(
            key: "donationAllocations",
            label: "Donation Allocations",
            primaryKey: nameof(DonationAllocation.AllocationId),
            defaultSort: "-AllocationId",
            listColumns: [nameof(DonationAllocation.AllocationId), nameof(DonationAllocation.DonationId), nameof(DonationAllocation.SafehouseId), nameof(DonationAllocation.ProgramArea), nameof(DonationAllocation.AmountAllocated)],
            searchFields: [nameof(DonationAllocation.ProgramArea), nameof(DonationAllocation.AllocationNotes)],
            optionLabelFields: [nameof(DonationAllocation.ProgramArea), nameof(DonationAllocation.AllocationDate)]),
        new AdminDatabaseTable<InKindDonationItem>(
            key: "inKindDonationItems",
            label: "In-Kind Donation Items",
            primaryKey: nameof(InKindDonationItem.ItemId),
            defaultSort: "-ItemId",
            listColumns: [nameof(InKindDonationItem.ItemId), nameof(InKindDonationItem.DonationId), nameof(InKindDonationItem.ItemName), nameof(InKindDonationItem.ItemCategory), nameof(InKindDonationItem.Quantity)],
            searchFields: [nameof(InKindDonationItem.ItemName), nameof(InKindDonationItem.ItemCategory), nameof(InKindDonationItem.UnitOfMeasure), nameof(InKindDonationItem.IntendedUse), nameof(InKindDonationItem.ReceivedCondition)],
            optionLabelFields: [nameof(InKindDonationItem.ItemName), nameof(InKindDonationItem.ItemCategory)]),
        new AdminDatabaseTable<Resident>(
            key: "residents",
            label: "Residents",
            primaryKey: nameof(Resident.ResidentId),
            defaultSort: "-ResidentId",
            listColumns: [nameof(Resident.ResidentId), nameof(Resident.CaseControlNo), nameof(Resident.SafehouseId), nameof(Resident.CaseStatus), nameof(Resident.AssignedSocialWorker)],
            searchFields: [nameof(Resident.CaseControlNo), nameof(Resident.InternalCode), nameof(Resident.CaseCategory), nameof(Resident.AssignedSocialWorker), nameof(Resident.ReintegrationStatus), nameof(Resident.CurrentRiskLevel)],
            optionLabelFields: [nameof(Resident.CaseControlNo), nameof(Resident.AssignedSocialWorker)]),
        new AppUsersAdminDatabaseTable(),
        new AdminDatabaseTable<IdentityRole>(
            key: "roles",
            label: "Roles",
            primaryKey: nameof(IdentityRole.Id),
            defaultSort: "Name",
            listColumns: [nameof(IdentityRole.Id), nameof(IdentityRole.Name), nameof(IdentityRole.NormalizedName)],
            searchFields: [nameof(IdentityRole.Name), nameof(IdentityRole.NormalizedName)],
            optionLabelFields: [nameof(IdentityRole.Name)]),
        new AdminDatabaseTable<ProcessRecording>(
            key: "processRecordings",
            label: "Process Recordings",
            primaryKey: nameof(ProcessRecording.RecordingId),
            defaultSort: "-RecordingId",
            listColumns: [nameof(ProcessRecording.RecordingId), nameof(ProcessRecording.ResidentId), nameof(ProcessRecording.SessionDate), nameof(ProcessRecording.SessionType), nameof(ProcessRecording.SocialWorker)],
            searchFields: [nameof(ProcessRecording.SocialWorker), nameof(ProcessRecording.SessionType), nameof(ProcessRecording.SessionNarrative), nameof(ProcessRecording.InterventionsApplied), nameof(ProcessRecording.FollowUpActions), nameof(ProcessRecording.ProgressNoted), nameof(ProcessRecording.ConcernsFlagged), nameof(ProcessRecording.ReferralMade)],
            optionLabelFields: [nameof(ProcessRecording.SessionType), nameof(ProcessRecording.SessionDate)]),
        new AdminDatabaseTable<HomeVisitation>(
            key: "homeVisitations",
            label: "Home Visitations",
            primaryKey: nameof(HomeVisitation.VisitationId),
            defaultSort: "-VisitationId",
            listColumns: [nameof(HomeVisitation.VisitationId), nameof(HomeVisitation.ResidentId), nameof(HomeVisitation.VisitDate), nameof(HomeVisitation.VisitType), nameof(HomeVisitation.VisitOutcome)],
            searchFields: [nameof(HomeVisitation.SocialWorker), nameof(HomeVisitation.VisitType), nameof(HomeVisitation.LocationVisited), nameof(HomeVisitation.Purpose), nameof(HomeVisitation.Observations), nameof(HomeVisitation.FamilyCooperationLevel), nameof(HomeVisitation.SafetyConcernsNoted), nameof(HomeVisitation.VisitOutcome)],
            optionLabelFields: [nameof(HomeVisitation.VisitType), nameof(HomeVisitation.VisitDate)]),
        new AdminDatabaseTable<InterventionPlan>(
            key: "interventionPlans",
            label: "Intervention Plans",
            primaryKey: nameof(InterventionPlan.PlanId),
            defaultSort: "-PlanId",
            listColumns: [nameof(InterventionPlan.PlanId), nameof(InterventionPlan.ResidentId), nameof(InterventionPlan.PlanCategory), nameof(InterventionPlan.Status), nameof(InterventionPlan.TargetDate)],
            searchFields: [nameof(InterventionPlan.PlanCategory), nameof(InterventionPlan.PlanDescription), nameof(InterventionPlan.ServicesProvided), nameof(InterventionPlan.TargetValue), nameof(InterventionPlan.Status)],
            optionLabelFields: [nameof(InterventionPlan.PlanCategory), nameof(InterventionPlan.TargetDate)]),
        new AdminDatabaseTable<IncidentReport>(
            key: "incidentReports",
            label: "Incident Reports",
            primaryKey: nameof(IncidentReport.IncidentId),
            defaultSort: "-IncidentId",
            listColumns: [nameof(IncidentReport.IncidentId), nameof(IncidentReport.ResidentId), nameof(IncidentReport.SafehouseId), nameof(IncidentReport.IncidentDate), nameof(IncidentReport.Severity)],
            searchFields: [nameof(IncidentReport.IncidentType), nameof(IncidentReport.Severity), nameof(IncidentReport.Description), nameof(IncidentReport.ResponseTaken), nameof(IncidentReport.ReportedBy)],
            optionLabelFields: [nameof(IncidentReport.IncidentType), nameof(IncidentReport.IncidentDate)]),
        new AdminDatabaseTable<EducationRecord>(
            key: "educationRecords",
            label: "Education Records",
            primaryKey: nameof(EducationRecord.EducationRecordId),
            defaultSort: "-EducationRecordId",
            listColumns: [nameof(EducationRecord.EducationRecordId), nameof(EducationRecord.ResidentId), nameof(EducationRecord.RecordDate), nameof(EducationRecord.SchoolName), nameof(EducationRecord.EnrollmentStatus)],
            searchFields: [nameof(EducationRecord.EducationLevel), nameof(EducationRecord.SchoolName), nameof(EducationRecord.EnrollmentStatus), nameof(EducationRecord.CompletionStatus), nameof(EducationRecord.Notes)],
            optionLabelFields: [nameof(EducationRecord.SchoolName), nameof(EducationRecord.RecordDate)]),
        new AdminDatabaseTable<HealthWellbeingRecord>(
            key: "healthWellbeingRecords",
            label: "Health & Wellbeing Records",
            primaryKey: nameof(HealthWellbeingRecord.HealthRecordId),
            defaultSort: "-HealthRecordId",
            listColumns: [nameof(HealthWellbeingRecord.HealthRecordId), nameof(HealthWellbeingRecord.ResidentId), nameof(HealthWellbeingRecord.RecordDate), nameof(HealthWellbeingRecord.GeneralHealthScore), nameof(HealthWellbeingRecord.Bmi)],
            searchFields: [nameof(HealthWellbeingRecord.Notes)],
            optionLabelFields: [nameof(HealthWellbeingRecord.RecordDate)]),
        new AdminDatabaseTable<SafehouseMonthlyMetric>(
            key: "safehouseMonthlyMetrics",
            label: "Safehouse Monthly Metrics",
            primaryKey: nameof(SafehouseMonthlyMetric.MetricId),
            defaultSort: "-MetricId",
            listColumns: [nameof(SafehouseMonthlyMetric.MetricId), nameof(SafehouseMonthlyMetric.SafehouseId), nameof(SafehouseMonthlyMetric.MonthStart), nameof(SafehouseMonthlyMetric.ActiveResidents), nameof(SafehouseMonthlyMetric.IncidentCount)],
            searchFields: [nameof(SafehouseMonthlyMetric.Notes)],
            optionLabelFields: [nameof(SafehouseMonthlyMetric.MonthStart)]),
        new AdminDatabaseTable<SocialMediaPost>(
            key: "socialMediaPosts",
            label: "Social Media Posts",
            primaryKey: nameof(SocialMediaPost.PostId),
            defaultSort: "-PostId",
            listColumns: [nameof(SocialMediaPost.PostId), nameof(SocialMediaPost.Platform), nameof(SocialMediaPost.CampaignName), nameof(SocialMediaPost.CreatedAt), nameof(SocialMediaPost.EngagementRate)],
            searchFields: [nameof(SocialMediaPost.Platform), nameof(SocialMediaPost.PlatformPostId), nameof(SocialMediaPost.PostUrl), nameof(SocialMediaPost.PostType), nameof(SocialMediaPost.MediaType), nameof(SocialMediaPost.Caption), nameof(SocialMediaPost.Hashtags), nameof(SocialMediaPost.CallToActionType), nameof(SocialMediaPost.ContentTopic), nameof(SocialMediaPost.SentimentTone), nameof(SocialMediaPost.CampaignName)],
            optionLabelFields: [nameof(SocialMediaPost.Platform), nameof(SocialMediaPost.CampaignName), nameof(SocialMediaPost.CreatedAt)]),
        new AdminDatabaseTable<PublicImpactSnapshot>(
            key: "publicImpactSnapshots",
            label: "Public Impact Snapshots",
            primaryKey: nameof(PublicImpactSnapshot.SnapshotId),
            defaultSort: "-SnapshotId",
            listColumns: [nameof(PublicImpactSnapshot.SnapshotId), nameof(PublicImpactSnapshot.SnapshotDate), nameof(PublicImpactSnapshot.Headline), nameof(PublicImpactSnapshot.IsPublished), nameof(PublicImpactSnapshot.PublishedAt)],
            searchFields: [nameof(PublicImpactSnapshot.Headline), nameof(PublicImpactSnapshot.SummaryText), nameof(PublicImpactSnapshot.MetricPayloadJson)],
            optionLabelFields: [nameof(PublicImpactSnapshot.Headline), nameof(PublicImpactSnapshot.SnapshotDate)])
    ];

    private static readonly IReadOnlyDictionary<string, IAdminDatabaseTable> TablesByKey =
        OrderedTables.ToDictionary(table => table.Key, StringComparer.OrdinalIgnoreCase);

    private static readonly IReadOnlyDictionary<Type, IAdminDatabaseTable> TablesByType =
        OrderedTables.ToDictionary(table => table.EntityClrType);

    public static IReadOnlyList<IAdminDatabaseTable> All => OrderedTables;

    public static bool TryGet(string key, out IAdminDatabaseTable table) => TablesByKey.TryGetValue(key, out table!);

    public static bool TryGet(Type entityClrType, out IAdminDatabaseTable table) => TablesByType.TryGetValue(entityClrType, out table!);
}

internal sealed class AdminDatabaseTable<TEntity> : IAdminDatabaseTable
    where TEntity : class, new()
{
    private static readonly string[] LongTextHints =
    [
        "Notes", "Description", "Narrative", "Observations", "Summary", "Caption", "Json", "Text", "Actions", "Services"
    ];

    private readonly string _defaultSort;
    private readonly string[] _listColumns;
    private readonly string[] _optionLabelFields;
    private readonly HashSet<string> _searchFields;

    public AdminDatabaseTable(
        string key,
        string label,
        string primaryKey,
        string defaultSort,
        IReadOnlyList<string> listColumns,
        IReadOnlyList<string> searchFields,
        IReadOnlyList<string> optionLabelFields)
    {
        Key = key;
        Label = label;
        PrimaryKey = primaryKey;
        _defaultSort = defaultSort;
        _listColumns = listColumns.Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
        _searchFields = searchFields.ToHashSet(StringComparer.OrdinalIgnoreCase);
        _optionLabelFields = optionLabelFields.Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
    }

    public string Key { get; }
    public string Label { get; }
    public string PrimaryKey { get; }
    public Type EntityClrType => typeof(TEntity);

    public AdminDatabaseTableDto BuildMetadata(AppDbContext db)
    {
        var entityType = GetEntityType(db);
        var fields = entityType.GetProperties()
            .Where(property => !property.IsShadowProperty())
            .Select(property => BuildFieldDto(entityType, property))
            .OrderBy(field => field.IsPrimaryKey ? 0 : 1)
            .ThenBy(field => GetFieldOrder(field.Name))
            .ToArray();

        return new AdminDatabaseTableDto(
            Key,
            Label,
            PrimaryKey,
            _defaultSort,
            _searchFields.OrderBy(value => value).ToArray(),
            _listColumns,
            fields);
    }

    public async Task<AdminDatabasePageDto> GetPageAsync(
        AppDbContext db,
        int pageNum,
        int pageSize,
        string? search,
        CancellationToken cancellationToken)
    {
        var query = ApplyDefaultSort(ApplySearch(db.Set<TEntity>().AsNoTracking(), search));
        var (items, total) = await query.ToPageAsync(pageNum, pageSize, cancellationToken);
        return new AdminDatabasePageDto(items.Select(item => SerializeEntity(item, _listColumns)).ToArray(), total);
    }

    public async Task<Dictionary<string, object?>?> GetByIdAsync(AppDbContext db, string id, CancellationToken cancellationToken)
    {
        var entity = await db.Set<TEntity>()
            .AsNoTracking()
            .FirstOrDefaultAsync(BuildKeyPredicate(id), cancellationToken);

        return entity is null ? null : SerializeEntity(entity, GetAllScalarFieldNames(db));
    }

    public async Task<Dictionary<string, object?>> CreateAsync(AppDbContext db, JsonElement payload, CancellationToken cancellationToken)
    {
        var entity = new TEntity();
        ApplyPayload(db, entity, payload);
        db.Set<TEntity>().Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        return SerializeEntity(entity, GetAllScalarFieldNames(db));
    }

    public async Task<bool> UpdateAsync(AppDbContext db, string id, JsonElement payload, CancellationToken cancellationToken)
    {
        var entity = await db.Set<TEntity>().FindAsync([ConvertKeyValue(id)], cancellationToken);
        if (entity is null)
        {
            return false;
        }

        ApplyPayload(db, entity, payload);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeleteAsync(AppDbContext db, string id, CancellationToken cancellationToken)
    {
        var entity = await db.Set<TEntity>().FindAsync([ConvertKeyValue(id)], cancellationToken);
        if (entity is null)
        {
            return false;
        }

        db.Set<TEntity>().Remove(entity);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<AdminDatabaseLookupOptionDto>> GetLookupAsync(AppDbContext db, string field, CancellationToken cancellationToken)
    {
        var entityType = GetEntityType(db);
        var foreignKey = entityType.GetForeignKeys()
            .FirstOrDefault(candidate =>
                candidate.Properties.Count == 1
                && candidate.Properties[0].Name.Equals(field, StringComparison.OrdinalIgnoreCase));

        if (foreignKey is null)
        {
            throw new KeyNotFoundException($"Field '{field}' is not a supported lookup on '{Key}'.");
        }

        if (!AdminDatabaseRegistry.TryGet(foreignKey.PrincipalEntityType.ClrType, out var principalTable))
        {
            throw new KeyNotFoundException($"No lookup source is registered for '{field}'.");
        }

        return await principalTable.GetLookupOptionsAsync(db, cancellationToken);
    }

    public async Task<IReadOnlyList<AdminDatabaseLookupOptionDto>> GetLookupOptionsAsync(AppDbContext db, CancellationToken cancellationToken)
    {
        var items = await db.Set<TEntity>().AsNoTracking().ToListAsync(cancellationToken);
        return items
            .Select(entity =>
            {
                var keyValue = GetPrimaryKeyValue(entity);
                return new AdminDatabaseLookupOptionDto(
                    keyValue,
                    BuildLookupLabel(entity, keyValue));
            })
            .OrderBy(option => option.Label, StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    private AdminDatabaseFieldDto BuildFieldDto(IEntityType entityType, IProperty property)
    {
        var foreignKey = entityType.GetForeignKeys()
            .FirstOrDefault(candidate => candidate.Properties.Count == 1 && candidate.Properties[0].Name == property.Name);

        return new AdminDatabaseFieldDto(
            property.Name,
            HumanizeIdentifier(property.Name),
            GetInputType(property, foreignKey is not null),
            property.Name == PrimaryKey,
            !property.IsNullable && property.Name != PrimaryKey,
            property.IsNullable,
            property.Name == PrimaryKey,
            foreignKey is not null,
            foreignKey is null ? null : $"/api/admin/database/{Key}/lookup/{property.Name}");
    }

    private IQueryable<TEntity> ApplySearch(IQueryable<TEntity> query, string? search)
    {
        if (string.IsNullOrWhiteSpace(search))
        {
            return query;
        }

        var term = search.Trim();
        var parameter = Expression.Parameter(typeof(TEntity), "entity");
        Expression? predicate = null;

        foreach (var fieldName in _searchFields)
        {
            var property = typeof(TEntity).GetProperty(fieldName);
            if (property is null || property.PropertyType != typeof(string))
            {
                continue;
            }

            var member = Expression.Property(parameter, property);
            var notNull = Expression.NotEqual(member, Expression.Constant(null, typeof(string)));
            var contains = Expression.Call(member, nameof(string.Contains), Type.EmptyTypes, Expression.Constant(term));
            var clause = Expression.AndAlso(notNull, contains);
            predicate = predicate is null ? clause : Expression.OrElse(predicate, clause);
        }

        if (int.TryParse(term, out var id))
        {
            var keyProperty = typeof(TEntity).GetProperty(PrimaryKey);
            if (keyProperty is not null && IsNumericType(keyProperty.PropertyType))
            {
                var member = Expression.Property(parameter, keyProperty);
                var clause = Expression.Equal(member, Expression.Constant(id, keyProperty.PropertyType));
                predicate = predicate is null ? clause : Expression.OrElse(predicate, clause);
            }
        }
        else
        {
            var keyProperty = typeof(TEntity).GetProperty(PrimaryKey);
            if (keyProperty is not null && (Nullable.GetUnderlyingType(keyProperty.PropertyType) ?? keyProperty.PropertyType) == typeof(string))
            {
                var member = Expression.Property(parameter, keyProperty);
                var clause = Expression.Equal(member, Expression.Constant(term, keyProperty.PropertyType));
                predicate = predicate is null ? clause : Expression.OrElse(predicate, clause);
            }
        }

        if (predicate is null)
        {
            return query;
        }

        var lambda = Expression.Lambda<Func<TEntity, bool>>(predicate, parameter);
        return query.Where(lambda);
    }

    private IQueryable<TEntity> ApplyDefaultSort(IQueryable<TEntity> query)
    {
        var descending = _defaultSort.StartsWith("-", StringComparison.Ordinal);
        var sortField = descending ? _defaultSort[1..] : _defaultSort;
        var property = typeof(TEntity).GetProperty(sortField)
            ?? throw new InvalidOperationException($"Sort field '{sortField}' is not valid for '{typeof(TEntity).Name}'.");

        var parameter = Expression.Parameter(typeof(TEntity), "entity");
        var propertyAccess = Expression.Property(parameter, property);
        var lambda = Expression.Lambda(propertyAccess, parameter);
        var method = descending ? nameof(Queryable.OrderByDescending) : nameof(Queryable.OrderBy);

        var ordered = typeof(Queryable)
            .GetMethods()
            .Single(candidate =>
                candidate.Name == method
                && candidate.GetParameters().Length == 2)
            .MakeGenericMethod(typeof(TEntity), property.PropertyType)
            .Invoke(null, [query, lambda]);

        return (IQueryable<TEntity>)ordered!;
    }

    private Expression<Func<TEntity, bool>> BuildKeyPredicate(string id)
    {
        var parameter = Expression.Parameter(typeof(TEntity), "entity");
        var keyProperty = typeof(TEntity).GetProperty(PrimaryKey)
            ?? throw new InvalidOperationException($"Primary key '{PrimaryKey}' is not valid for '{typeof(TEntity).Name}'.");

        var keyAccess = Expression.Property(parameter, keyProperty);
        var comparison = Expression.Equal(keyAccess, Expression.Constant(ConvertKeyValue(id), keyProperty.PropertyType));
        return Expression.Lambda<Func<TEntity, bool>>(comparison, parameter);
    }

    private void ApplyPayload(AppDbContext db, TEntity entity, JsonElement payload)
    {
        if (payload.ValueKind != JsonValueKind.Object)
        {
            throw new InvalidOperationException("The request body must be a JSON object.");
        }

        foreach (var property in GetEntityType(db).GetProperties().Where(candidate => !candidate.IsShadowProperty()))
        {
            if (property.Name == PrimaryKey)
            {
                continue;
            }

            if (!TryGetProperty(payload, property.Name, out var rawValue))
            {
                continue;
            }

            var propertyInfo = typeof(TEntity).GetProperty(property.Name);
            if (propertyInfo is null || !propertyInfo.CanWrite)
            {
                continue;
            }

            var value = ConvertJsonValue(rawValue, propertyInfo.PropertyType);
            propertyInfo.SetValue(entity, value);
        }
    }

    private Dictionary<string, object?> SerializeEntity(TEntity entity, IEnumerable<string> columns)
    {
        var values = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase)
        {
            ["__rowId"] = GetPrimaryKeyValue(entity),
        };
        foreach (var column in columns.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            var property = typeof(TEntity).GetProperty(column);
            if (property is null || property.GetMethod is null)
            {
                continue;
            }

            values[column] = property.GetValue(entity);
        }

        return values;
    }

    private IReadOnlyList<string> GetAllScalarFieldNames(AppDbContext db) =>
        GetEntityType(db)
            .GetProperties()
            .Where(property => !property.IsShadowProperty())
            .Select(property => property.Name)
            .ToArray();

    private IEntityType GetEntityType(AppDbContext db) =>
        db.Model.FindEntityType(typeof(TEntity))
        ?? throw new InvalidOperationException($"Entity metadata for '{typeof(TEntity).Name}' could not be found.");

    private int GetFieldOrder(string name)
    {
        var index = Array.FindIndex(_listColumns, candidate => candidate.Equals(name, StringComparison.OrdinalIgnoreCase));
        return index >= 0 ? index : int.MaxValue;
    }

    private string GetPrimaryKeyValue(TEntity entity)
    {
        var property = typeof(TEntity).GetProperty(PrimaryKey)
            ?? throw new InvalidOperationException($"Primary key '{PrimaryKey}' is not valid for '{typeof(TEntity).Name}'.");

        var value = property.GetValue(entity)
            ?? throw new InvalidOperationException($"Primary key '{PrimaryKey}' cannot be null for '{typeof(TEntity).Name}'.");

        return Convert.ToString(value, CultureInfo.InvariantCulture)
            ?? throw new InvalidOperationException($"Primary key '{PrimaryKey}' could not be converted for '{typeof(TEntity).Name}'.");
    }

    private string BuildLookupLabel(TEntity entity, string keyValue)
    {
        var segments = _optionLabelFields
            .Select(fieldName => typeof(TEntity).GetProperty(fieldName))
            .Where(property => property is not null)
            .Select(property => property!.GetValue(entity))
            .Select(FormatLookupSegment)
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (segments.Length == 0)
        {
            return keyValue;
        }

        var joined = string.Join(" - ", segments);
        return $"{joined} ({keyValue})";
    }

    private static string FormatLookupSegment(object? value) =>
        value switch
        {
            null => string.Empty,
            DateOnly dateOnly => dateOnly.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            DateTime dateTime => dateTime.ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture),
            bool boolean => boolean ? "Yes" : "No",
            _ => Convert.ToString(value, CultureInfo.InvariantCulture) ?? string.Empty,
        };

    private static bool TryGetProperty(JsonElement payload, string propertyName, out JsonElement value)
    {
        foreach (var property in payload.EnumerateObject())
        {
            if (property.NameEquals(propertyName) || property.Name.Equals(propertyName, StringComparison.OrdinalIgnoreCase))
            {
                value = property.Value;
                return true;
            }
        }

        value = default;
        return false;
    }

    private object ConvertKeyValue(string value)
    {
        var property = typeof(TEntity).GetProperty(PrimaryKey)
            ?? throw new InvalidOperationException($"Primary key '{PrimaryKey}' is not valid for '{typeof(TEntity).Name}'.");

        var targetType = Nullable.GetUnderlyingType(property.PropertyType) ?? property.PropertyType;
        if (targetType == typeof(string))
        {
            return value;
        }

        if (targetType == typeof(int))
        {
            return int.Parse(value, CultureInfo.InvariantCulture);
        }

        if (targetType == typeof(long))
        {
            return long.Parse(value, CultureInfo.InvariantCulture);
        }

        throw new InvalidOperationException($"The primary key type '{targetType.Name}' is not supported for '{typeof(TEntity).Name}'.");
    }

    private static bool IsNumericType(Type propertyType)
    {
        var targetType = Nullable.GetUnderlyingType(propertyType) ?? propertyType;
        return targetType == typeof(int) || targetType == typeof(long);
    }

    private static object? ConvertJsonValue(JsonElement value, Type targetType)
    {
        if (value.ValueKind == JsonValueKind.Null || value.ValueKind == JsonValueKind.Undefined)
        {
            if (Nullable.GetUnderlyingType(targetType) is not null || !targetType.IsValueType)
            {
                return null;
            }

            throw new InvalidOperationException($"Field '{targetType.Name}' cannot be null.");
        }

        var underlyingType = Nullable.GetUnderlyingType(targetType) ?? targetType;

        if (underlyingType == typeof(string))
        {
            return value.ValueKind == JsonValueKind.String ? value.GetString() : value.GetRawText();
        }

        if (underlyingType == typeof(bool))
        {
            return value.ValueKind switch
            {
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                JsonValueKind.String when bool.TryParse(value.GetString(), out var parsedBoolean) => parsedBoolean,
                _ => throw new InvalidOperationException("Boolean values must be true, false, or null.")
            };
        }

        if (underlyingType == typeof(int))
        {
            return value.ValueKind switch
            {
                JsonValueKind.Number => value.GetInt32(),
                JsonValueKind.String when int.TryParse(value.GetString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsedInt) => parsedInt,
                _ => throw new InvalidOperationException("Integer values must be numeric.")
            };
        }

        if (underlyingType == typeof(decimal))
        {
            return value.ValueKind switch
            {
                JsonValueKind.Number => value.GetDecimal(),
                JsonValueKind.String when decimal.TryParse(value.GetString(), NumberStyles.Number, CultureInfo.InvariantCulture, out var parsedDecimal) => parsedDecimal,
                _ => throw new InvalidOperationException("Decimal values must be numeric.")
            };
        }

        if (underlyingType == typeof(double))
        {
            return value.ValueKind switch
            {
                JsonValueKind.Number => value.GetDouble(),
                JsonValueKind.String when double.TryParse(value.GetString(), NumberStyles.Float | NumberStyles.AllowThousands, CultureInfo.InvariantCulture, out var parsedDouble) => parsedDouble,
                _ => throw new InvalidOperationException("Number values must be numeric.")
            };
        }

        if (underlyingType == typeof(float))
        {
            return value.ValueKind switch
            {
                JsonValueKind.Number => value.GetSingle(),
                JsonValueKind.String when float.TryParse(value.GetString(), NumberStyles.Float | NumberStyles.AllowThousands, CultureInfo.InvariantCulture, out var parsedFloat) => parsedFloat,
                _ => throw new InvalidOperationException("Number values must be numeric.")
            };
        }

        if (underlyingType == typeof(long))
        {
            return value.ValueKind switch
            {
                JsonValueKind.Number => value.GetInt64(),
                JsonValueKind.String when long.TryParse(value.GetString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsedLong) => parsedLong,
                _ => throw new InvalidOperationException("Integer values must be numeric.")
            };
        }

        if (underlyingType == typeof(DateOnly))
        {
            if (value.ValueKind != JsonValueKind.String)
            {
                throw new InvalidOperationException("Date values must be strings in yyyy-MM-dd format.");
            }

            var raw = value.GetString();
            if (string.IsNullOrWhiteSpace(raw))
            {
                return null;
            }

            if (DateOnly.TryParse(raw, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dateOnly))
            {
                return dateOnly;
            }

            throw new InvalidOperationException($"'{raw}' is not a valid date.");
        }

        if (underlyingType == typeof(DateTime))
        {
            if (value.ValueKind != JsonValueKind.String)
            {
                throw new InvalidOperationException("Date/time values must be strings.");
            }

            var raw = value.GetString();
            if (string.IsNullOrWhiteSpace(raw))
            {
                return null;
            }

            if (DateTime.TryParse(raw, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var dateTime)
                || DateTime.TryParse(raw, CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal, out dateTime))
            {
                return dateTime;
            }

            throw new InvalidOperationException($"'{raw}' is not a valid date/time.");
        }

        throw new InvalidOperationException($"The field type '{underlyingType.Name}' is not supported by the admin database editor.");
    }

    private static string GetInputType(IProperty property, bool isForeignKey)
    {
        if (isForeignKey)
        {
            return "lookup";
        }

        var type = Nullable.GetUnderlyingType(property.ClrType) ?? property.ClrType;
        if (type == typeof(bool))
        {
            return "boolean";
        }

        if (type == typeof(DateOnly))
        {
            return "date";
        }

        if (type == typeof(DateTime))
        {
            return "datetime-local";
        }

        if (type == typeof(int)
            || type == typeof(long)
            || type == typeof(decimal)
            || type == typeof(double)
            || type == typeof(float))
        {
            return "number";
        }

        if (property.Name.EndsWith("Url", StringComparison.OrdinalIgnoreCase))
        {
            return "url";
        }

        if (LongTextHints.Any(hint => property.Name.Contains(hint, StringComparison.OrdinalIgnoreCase)))
        {
            return "textarea";
        }

        return "text";
    }

    private static string HumanizeIdentifier(string identifier)
    {
        if (string.IsNullOrWhiteSpace(identifier))
        {
            return identifier;
        }

        var builder = new StringBuilder(identifier.Length + 8);
        builder.Append(identifier[0]);

        for (var i = 1; i < identifier.Length; i++)
        {
            var previous = identifier[i - 1];
            var current = identifier[i];

            if ((char.IsLower(previous) && char.IsUpper(current))
                || (char.IsLetter(previous) && char.IsDigit(current))
                || (char.IsDigit(previous) && char.IsLetter(current)))
            {
                builder.Append(' ');
            }

            builder.Append(current);
        }

        return builder
            .ToString()
            .Replace(" Id", " ID", StringComparison.Ordinal)
            .Replace(" Php", " PHP", StringComparison.Ordinal);
    }
}

internal sealed class AppUsersAdminDatabaseTable : IAdminDatabaseTable
{
    private static readonly AdminDatabaseFieldDto[] Fields =
    [
        new(nameof(AppUser.Id), "ID", "text", true, false, false, true, false, null),
        new(nameof(AppUser.Email), "Email", "text", false, true, true, false, false, null),
        new(nameof(AppUser.UserName), "Username", "text", false, true, true, false, false, null),
        new(nameof(AppUser.DisplayName), "Display Name", "text", false, false, true, false, false, null),
        new(nameof(AppUser.FirstName), "First Name", "text", false, false, true, false, false, null),
        new(nameof(AppUser.LastName), "Last Name", "text", false, false, true, false, false, null),
        new(nameof(AppUser.SupporterId), "Supporter ID", "lookup", false, false, true, false, true, "/api/admin/database/appUsers/lookup/SupporterId"),
        new("RoleId", "Role", "lookup", false, false, true, false, true, "/api/admin/database/appUsers/lookup/RoleId"),
        new("RoleName", "Role Name", "text", false, false, true, true, false, null),
        new(nameof(AppUser.PhoneNumber), "Phone Number", "text", false, false, true, false, false, null),
        new(nameof(AppUser.EmailConfirmed), "Email Confirmed", "boolean", false, true, false, false, false, null),
        new(nameof(AppUser.PhoneNumberConfirmed), "Phone Confirmed", "boolean", false, true, false, false, false, null),
        new(nameof(AppUser.TwoFactorEnabled), "Two-Factor Enabled", "boolean", false, true, false, false, false, null),
        new(nameof(AppUser.LockoutEnabled), "Lockout Enabled", "boolean", false, true, false, false, false, null),
        new(nameof(AppUser.LockoutEnd), "Lockout End", "datetime-local", false, false, true, false, false, null),
        new(nameof(AppUser.AccessFailedCount), "Access Failed Count", "number", false, true, false, false, false, null),
    ];

    public string Key => "appUsers";
    public string Label => "Users";
    public string PrimaryKey => nameof(AppUser.Id);
    public Type EntityClrType => typeof(AppUser);

    public AdminDatabaseTableDto BuildMetadata(AppDbContext db) =>
        new(
            Key,
            Label,
            PrimaryKey,
            "-Id",
            [nameof(AppUser.Email), nameof(AppUser.UserName), nameof(AppUser.DisplayName), nameof(AppUser.FirstName), nameof(AppUser.LastName), "RoleName"],
            [nameof(AppUser.Id), nameof(AppUser.Email), nameof(AppUser.DisplayName), "RoleName", nameof(AppUser.LockoutEnabled)],
            Fields);

    public async Task<AdminDatabasePageDto> GetPageAsync(AppDbContext db, int pageNum, int pageSize, string? search, CancellationToken cancellationToken)
    {
        var query = db.Users.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(user =>
                user.Id == term
                || (user.Email != null && user.Email.Contains(term))
                || (user.UserName != null && user.UserName.Contains(term))
                || (user.DisplayName != null && user.DisplayName.Contains(term))
                || (user.FirstName != null && user.FirstName.Contains(term))
                || (user.LastName != null && user.LastName.Contains(term))
                || db.UserRoles.Any(userRole =>
                    userRole.UserId == user.Id
                    && db.Roles.Any(role => role.Id == userRole.RoleId && role.Name != null && role.Name.Contains(term))));
        }

        var (users, total) = await query.OrderByDescending(user => user.Id).ToPageAsync(pageNum, pageSize, cancellationToken);
        var rows = await HydrateUserRowsAsync(db, users, cancellationToken);
        return new AdminDatabasePageDto(rows.Select(SerializeUser).ToArray(), total);
    }

    public async Task<Dictionary<string, object?>?> GetByIdAsync(AppDbContext db, string id, CancellationToken cancellationToken)
    {
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (user is null)
        {
            return null;
        }

        var row = (await HydrateUserRowsAsync(db, [user], cancellationToken)).First();
        return SerializeUser(row);
    }

    public async Task<Dictionary<string, object?>> CreateAsync(AppDbContext db, JsonElement payload, CancellationToken cancellationToken)
    {
        var user = new AppUser
        {
            Id = Guid.NewGuid().ToString("N", CultureInfo.InvariantCulture),
            SecurityStamp = Guid.NewGuid().ToString("N", CultureInfo.InvariantCulture),
            ConcurrencyStamp = Guid.NewGuid().ToString("N", CultureInfo.InvariantCulture),
        };

        ApplyUserPayload(user, payload);
        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);
        await SyncUserRoleAsync(db, user.Id, AdminDatabaseJson.GetNullableString(payload, "RoleId"), cancellationToken);
        return (await GetByIdAsync(db, user.Id, cancellationToken))!;
    }

    public async Task<bool> UpdateAsync(AppDbContext db, string id, JsonElement payload, CancellationToken cancellationToken)
    {
        var user = await db.Users.FindAsync([id], cancellationToken);
        if (user is null)
        {
            return false;
        }

        ApplyUserPayload(user, payload);
        user.ConcurrencyStamp ??= Guid.NewGuid().ToString("N", CultureInfo.InvariantCulture);
        await db.SaveChangesAsync(cancellationToken);
        await SyncUserRoleAsync(db, user.Id, AdminDatabaseJson.GetNullableString(payload, "RoleId"), cancellationToken);
        return true;
    }

    public async Task<bool> DeleteAsync(AppDbContext db, string id, CancellationToken cancellationToken)
    {
        var user = await db.Users.FindAsync([id], cancellationToken);
        if (user is null)
        {
            return false;
        }

        db.Users.Remove(user);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<AdminDatabaseLookupOptionDto>> GetLookupAsync(AppDbContext db, string field, CancellationToken cancellationToken)
    {
        if (field.Equals("RoleId", StringComparison.OrdinalIgnoreCase))
        {
            var roles = await db.Roles.AsNoTracking().OrderBy(role => role.Name).ToListAsync(cancellationToken);
            return roles.Select(role => new AdminDatabaseLookupOptionDto(role.Id, role.Name ?? role.Id)).ToArray();
        }

        if (!field.Equals(nameof(AppUser.SupporterId), StringComparison.OrdinalIgnoreCase))
        {
            throw new KeyNotFoundException($"Field '{field}' is not a supported lookup on '{Key}'.");
        }

        if (!AdminDatabaseRegistry.TryGet(typeof(Supporter), out var supportersTable))
        {
            throw new KeyNotFoundException("Supporter lookup is not available.");
        }

        return await supportersTable.GetLookupOptionsAsync(db, cancellationToken);
    }

    public async Task<IReadOnlyList<AdminDatabaseLookupOptionDto>> GetLookupOptionsAsync(AppDbContext db, CancellationToken cancellationToken)
    {
        var users = await db.Users.AsNoTracking()
            .OrderBy(user => user.Email)
            .ToListAsync(cancellationToken);

        return users
            .Select(user => new AdminDatabaseLookupOptionDto(user.Id, BuildUserLabel(user)))
            .ToArray();
    }

    private static Dictionary<string, object?> SerializeUser(AppUserRow row) => new(StringComparer.OrdinalIgnoreCase)
    {
        ["__rowId"] = row.User.Id,
        [nameof(AppUser.Id)] = row.User.Id,
        [nameof(AppUser.Email)] = row.User.Email,
        [nameof(AppUser.UserName)] = row.User.UserName,
        [nameof(AppUser.DisplayName)] = row.User.DisplayName,
        [nameof(AppUser.FirstName)] = row.User.FirstName,
        [nameof(AppUser.LastName)] = row.User.LastName,
        [nameof(AppUser.SupporterId)] = row.User.SupporterId,
        ["RoleId"] = row.RoleId,
        ["RoleName"] = row.RoleName,
        [nameof(AppUser.PhoneNumber)] = row.User.PhoneNumber,
        [nameof(AppUser.EmailConfirmed)] = row.User.EmailConfirmed,
        [nameof(AppUser.PhoneNumberConfirmed)] = row.User.PhoneNumberConfirmed,
        [nameof(AppUser.TwoFactorEnabled)] = row.User.TwoFactorEnabled,
        [nameof(AppUser.LockoutEnabled)] = row.User.LockoutEnabled,
        [nameof(AppUser.LockoutEnd)] = row.User.LockoutEnd?.UtcDateTime,
        [nameof(AppUser.AccessFailedCount)] = row.User.AccessFailedCount,
    };

    private static string BuildUserLabel(AppUser user)
    {
        var pieces = new[]
        {
            user.DisplayName,
            user.Email,
            user.UserName,
        }.Where(value => !string.IsNullOrWhiteSpace(value)).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();

        return pieces.Length == 0 ? user.Id : $"{string.Join(" - ", pieces)} ({user.Id})";
    }

    private static void ApplyUserPayload(AppUser user, JsonElement payload)
    {
        user.Email = AdminDatabaseJson.GetString(payload, nameof(AppUser.Email), required: true);
        user.UserName = AdminDatabaseJson.GetString(payload, nameof(AppUser.UserName), required: true);
        user.DisplayName = AdminDatabaseJson.GetNullableString(payload, nameof(AppUser.DisplayName));
        user.FirstName = AdminDatabaseJson.GetNullableString(payload, nameof(AppUser.FirstName));
        user.LastName = AdminDatabaseJson.GetNullableString(payload, nameof(AppUser.LastName));
        user.SupporterId = AdminDatabaseJson.GetNullableInt(payload, nameof(AppUser.SupporterId));
        user.PhoneNumber = AdminDatabaseJson.GetNullableString(payload, nameof(AppUser.PhoneNumber));
        user.EmailConfirmed = AdminDatabaseJson.GetBoolean(payload, nameof(AppUser.EmailConfirmed));
        user.PhoneNumberConfirmed = AdminDatabaseJson.GetBoolean(payload, nameof(AppUser.PhoneNumberConfirmed));
        user.TwoFactorEnabled = AdminDatabaseJson.GetBoolean(payload, nameof(AppUser.TwoFactorEnabled));
        user.LockoutEnabled = AdminDatabaseJson.GetBoolean(payload, nameof(AppUser.LockoutEnabled));
        user.LockoutEnd = AdminDatabaseJson.GetNullableDateTimeOffset(payload, nameof(AppUser.LockoutEnd));
        user.AccessFailedCount = AdminDatabaseJson.GetInt(payload, nameof(AppUser.AccessFailedCount), defaultValue: 0);
        user.NormalizedEmail = user.Email?.ToUpperInvariant();
        user.NormalizedUserName = user.UserName?.ToUpperInvariant();
    }

    private static async Task SyncUserRoleAsync(AppDbContext db, string userId, string? roleId, CancellationToken cancellationToken)
    {
        var existingRoles = await db.UserRoles.Where(entry => entry.UserId == userId).ToListAsync(cancellationToken);
        if (existingRoles.Count > 0)
        {
            db.UserRoles.RemoveRange(existingRoles);
        }

        if (!string.IsNullOrWhiteSpace(roleId))
        {
            db.UserRoles.Add(new IdentityUserRole<string> { UserId = userId, RoleId = roleId });
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<AppUserRow>> HydrateUserRowsAsync(AppDbContext db, IReadOnlyList<AppUser> users, CancellationToken cancellationToken)
    {
        if (users.Count == 0)
        {
            return [];
        }

        var userIds = users.Select(user => user.Id).ToArray();
        var roleAssignments = await (
            from userRole in db.UserRoles.AsNoTracking()
            join role in db.Roles.AsNoTracking() on userRole.RoleId equals role.Id into roleGroup
            from role in roleGroup.DefaultIfEmpty()
            where userIds.Contains(userRole.UserId)
            select new { userRole.UserId, userRole.RoleId, RoleName = role != null ? role.Name : null }
        ).ToListAsync(cancellationToken);

        var roleMap = roleAssignments
            .GroupBy(entry => entry.UserId)
            .ToDictionary(group => group.Key, group => group.First());

        return users
            .Select(user =>
            {
                roleMap.TryGetValue(user.Id, out var role);
                return new AppUserRow(user, role?.RoleId, role?.RoleName);
            })
            .ToArray();
    }

    private sealed record AppUserRow(AppUser User, string? RoleId, string? RoleName);
}

internal static class AdminDatabaseJson
{
    public static string GetString(JsonElement payload, string propertyName, bool required)
    {
        if (!TryGetJsonProperty(payload, propertyName, out var value) || value.ValueKind == JsonValueKind.Null)
        {
            if (required)
            {
                throw new InvalidOperationException($"{propertyName} is required.");
            }

            return string.Empty;
        }

        var text = value.GetString()?.Trim() ?? string.Empty;
        if (required && string.IsNullOrWhiteSpace(text))
        {
            throw new InvalidOperationException($"{propertyName} is required.");
        }

        return text;
    }

    public static string? GetNullableString(JsonElement payload, string propertyName)
    {
        if (!TryGetJsonProperty(payload, propertyName, out var value) || value.ValueKind == JsonValueKind.Null)
        {
            return null;
        }

        var text = value.GetString()?.Trim();
        return string.IsNullOrWhiteSpace(text) ? null : text;
    }

    public static int? GetNullableInt(JsonElement payload, string propertyName)
    {
        if (!TryGetJsonProperty(payload, propertyName, out var value) || value.ValueKind == JsonValueKind.Null)
        {
            return null;
        }

        if (value.ValueKind == JsonValueKind.Number)
        {
            return value.GetInt32();
        }

        if (value.ValueKind == JsonValueKind.String && int.TryParse(value.GetString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed))
        {
            return parsed;
        }

        throw new InvalidOperationException($"{propertyName} must be an integer.");
    }

    public static int GetInt(JsonElement payload, string propertyName, int defaultValue)
    {
        if (!TryGetJsonProperty(payload, propertyName, out var value) || value.ValueKind == JsonValueKind.Null)
        {
            return defaultValue;
        }

        if (value.ValueKind == JsonValueKind.Number)
        {
            return value.GetInt32();
        }

        if (value.ValueKind == JsonValueKind.String && int.TryParse(value.GetString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed))
        {
            return parsed;
        }

        throw new InvalidOperationException($"{propertyName} must be an integer.");
    }

    public static bool GetBoolean(JsonElement payload, string propertyName)
    {
        if (!TryGetJsonProperty(payload, propertyName, out var value) || value.ValueKind == JsonValueKind.Null)
        {
            return false;
        }

        return value.ValueKind switch
        {
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.String when bool.TryParse(value.GetString(), out var parsed) => parsed,
            _ => throw new InvalidOperationException($"{propertyName} must be true or false."),
        };
    }

    public static DateTimeOffset? GetNullableDateTimeOffset(JsonElement payload, string propertyName)
    {
        if (!TryGetJsonProperty(payload, propertyName, out var value) || value.ValueKind == JsonValueKind.Null)
        {
            return null;
        }

        var raw = value.GetString();
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        if (DateTimeOffset.TryParse(raw, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsed))
        {
            return parsed;
        }

        if (DateTime.TryParse(raw, CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal, out var parsedDateTime))
        {
            return new DateTimeOffset(parsedDateTime);
        }

        throw new InvalidOperationException($"{propertyName} must be a valid date/time.");
    }

    public static bool TryGetJsonProperty(JsonElement payload, string propertyName, out JsonElement value)
    {
        foreach (var property in payload.EnumerateObject())
        {
            if (property.NameEquals(propertyName) || property.Name.Equals(propertyName, StringComparison.OrdinalIgnoreCase))
            {
                value = property.Value;
                return true;
            }
        }

        value = default;
        return false;
    }
}
