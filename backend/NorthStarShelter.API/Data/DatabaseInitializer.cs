using System.Data;
using Microsoft.EntityFrameworkCore;

namespace NorthStarShelter.API.Data;

public static class DatabaseInitializer
{
    public static async Task InitializeAsync(
        IServiceProvider services,
        IConfiguration configuration,
        CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var tableCount = await CountTablesAsync(db, cancellationToken);
        if (tableCount == 0)
        {
            await db.Database.EnsureCreatedAsync(cancellationToken);
        }
        else
        {
            await EnsureIdentityTablesAsync(db, cancellationToken);
            await EnsureAdminDashboardSchemaAsync(db, cancellationToken);
        }

        await SeedData.InitializeAsync(scope.ServiceProvider, configuration);
    }

    private static async Task<int> CountTablesAsync(AppDbContext db, CancellationToken cancellationToken)
    {
        const string sql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'";
        return await ExecuteScalarAsync(db, sql, cancellationToken);
    }

    private static async Task EnsureIdentityTablesAsync(AppDbContext db, CancellationToken cancellationToken)
    {
        const string sql = """
            IF OBJECT_ID(N'[dbo].[AspNetRoles]', N'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[AspNetRoles](
                    [Id] [nvarchar](450) NOT NULL,
                    [Name] [nvarchar](256) NULL,
                    [NormalizedName] [nvarchar](256) NULL,
                    [ConcurrencyStamp] [nvarchar](max) NULL,
                    CONSTRAINT [PK_AspNetRoles] PRIMARY KEY ([Id])
                );
            END;

            IF OBJECT_ID(N'[dbo].[AspNetUsers]', N'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[AspNetUsers](
                    [Id] [nvarchar](450) NOT NULL,
                    [UserName] [nvarchar](256) NULL,
                    [NormalizedUserName] [nvarchar](256) NULL,
                    [Email] [nvarchar](256) NULL,
                    [NormalizedEmail] [nvarchar](256) NULL,
                    [EmailConfirmed] [bit] NOT NULL,
                    [PasswordHash] [nvarchar](max) NULL,
                    [SecurityStamp] [nvarchar](max) NULL,
                    [ConcurrencyStamp] [nvarchar](max) NULL,
                    [PhoneNumber] [nvarchar](max) NULL,
                    [PhoneNumberConfirmed] [bit] NOT NULL,
                    [TwoFactorEnabled] [bit] NOT NULL,
                    [LockoutEnd] [datetimeoffset](7) NULL,
                    [LockoutEnabled] [bit] NOT NULL,
                    [AccessFailedCount] [int] NOT NULL,
                    [SupporterId] [int] NULL,
                    [DisplayName] [nvarchar](256) NULL,
                    [FirstName] [nvarchar](128) NULL,
                    [LastName] [nvarchar](128) NULL,
                    CONSTRAINT [PK_AspNetUsers] PRIMARY KEY ([Id])
                );
            END;

            IF COL_LENGTH(N'[dbo].[AspNetUsers]', N'SupporterId') IS NULL
                EXEC(N'ALTER TABLE [dbo].[AspNetUsers] ADD [SupporterId] [int] NULL;');

            IF COL_LENGTH(N'[dbo].[AspNetUsers]', N'DisplayName') IS NULL
                EXEC(N'ALTER TABLE [dbo].[AspNetUsers] ADD [DisplayName] [nvarchar](256) NULL;');

            IF COL_LENGTH(N'[dbo].[AspNetUsers]', N'FirstName') IS NULL
                EXEC(N'ALTER TABLE [dbo].[AspNetUsers] ADD [FirstName] [nvarchar](128) NULL;');

            IF COL_LENGTH(N'[dbo].[AspNetUsers]', N'LastName') IS NULL
                EXEC(N'ALTER TABLE [dbo].[AspNetUsers] ADD [LastName] [nvarchar](128) NULL;');

            IF OBJECT_ID(N'[dbo].[AspNetRoleClaims]', N'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[AspNetRoleClaims](
                    [Id] [int] IDENTITY(1,1) NOT NULL,
                    [RoleId] [nvarchar](450) NOT NULL,
                    [ClaimType] [nvarchar](max) NULL,
                    [ClaimValue] [nvarchar](max) NULL,
                    CONSTRAINT [PK_AspNetRoleClaims] PRIMARY KEY ([Id]),
                    CONSTRAINT [FK_AspNetRoleClaims_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [dbo].[AspNetRoles]([Id]) ON DELETE CASCADE
                );
            END;

            IF OBJECT_ID(N'[dbo].[AspNetUserClaims]', N'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[AspNetUserClaims](
                    [Id] [int] IDENTITY(1,1) NOT NULL,
                    [UserId] [nvarchar](450) NOT NULL,
                    [ClaimType] [nvarchar](max) NULL,
                    [ClaimValue] [nvarchar](max) NULL,
                    CONSTRAINT [PK_AspNetUserClaims] PRIMARY KEY ([Id]),
                    CONSTRAINT [FK_AspNetUserClaims_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[AspNetUsers]([Id]) ON DELETE CASCADE
                );
            END;

            IF OBJECT_ID(N'[dbo].[AspNetUserLogins]', N'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[AspNetUserLogins](
                    [LoginProvider] [nvarchar](128) NOT NULL,
                    [ProviderKey] [nvarchar](128) NOT NULL,
                    [ProviderDisplayName] [nvarchar](max) NULL,
                    [UserId] [nvarchar](450) NOT NULL,
                    CONSTRAINT [PK_AspNetUserLogins] PRIMARY KEY ([LoginProvider], [ProviderKey]),
                    CONSTRAINT [FK_AspNetUserLogins_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[AspNetUsers]([Id]) ON DELETE CASCADE
                );
            END;

            IF OBJECT_ID(N'[dbo].[AspNetUserRoles]', N'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[AspNetUserRoles](
                    [UserId] [nvarchar](450) NOT NULL,
                    [RoleId] [nvarchar](450) NOT NULL,
                    CONSTRAINT [PK_AspNetUserRoles] PRIMARY KEY ([UserId], [RoleId]),
                    CONSTRAINT [FK_AspNetUserRoles_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [dbo].[AspNetRoles]([Id]) ON DELETE CASCADE,
                    CONSTRAINT [FK_AspNetUserRoles_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[AspNetUsers]([Id]) ON DELETE CASCADE
                );
            END;

            IF OBJECT_ID(N'[dbo].[AspNetUserTokens]', N'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[AspNetUserTokens](
                    [UserId] [nvarchar](450) NOT NULL,
                    [LoginProvider] [nvarchar](128) NOT NULL,
                    [Name] [nvarchar](128) NOT NULL,
                    [Value] [nvarchar](max) NULL,
                    CONSTRAINT [PK_AspNetUserTokens] PRIMARY KEY ([UserId], [LoginProvider], [Name]),
                    CONSTRAINT [FK_AspNetUserTokens_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[AspNetUsers]([Id]) ON DELETE CASCADE
                );
            END;

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'RoleNameIndex' AND [object_id] = OBJECT_ID(N'[dbo].[AspNetRoles]'))
                CREATE UNIQUE INDEX [RoleNameIndex] ON [dbo].[AspNetRoles] ([NormalizedName]) WHERE [NormalizedName] IS NOT NULL;

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_AspNetRoleClaims_RoleId' AND [object_id] = OBJECT_ID(N'[dbo].[AspNetRoleClaims]'))
                CREATE INDEX [IX_AspNetRoleClaims_RoleId] ON [dbo].[AspNetRoleClaims] ([RoleId]);

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'EmailIndex' AND [object_id] = OBJECT_ID(N'[dbo].[AspNetUsers]'))
                CREATE INDEX [EmailIndex] ON [dbo].[AspNetUsers] ([NormalizedEmail]);

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'UserNameIndex' AND [object_id] = OBJECT_ID(N'[dbo].[AspNetUsers]'))
                CREATE UNIQUE INDEX [UserNameIndex] ON [dbo].[AspNetUsers] ([NormalizedUserName]) WHERE [NormalizedUserName] IS NOT NULL;

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_AspNetUsers_SupporterId' AND [object_id] = OBJECT_ID(N'[dbo].[AspNetUsers]'))
                EXEC(N'CREATE UNIQUE INDEX [IX_AspNetUsers_SupporterId] ON [dbo].[AspNetUsers] ([SupporterId]) WHERE [SupporterId] IS NOT NULL;');

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_AspNetUserClaims_UserId' AND [object_id] = OBJECT_ID(N'[dbo].[AspNetUserClaims]'))
                CREATE INDEX [IX_AspNetUserClaims_UserId] ON [dbo].[AspNetUserClaims] ([UserId]);

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_AspNetUserLogins_UserId' AND [object_id] = OBJECT_ID(N'[dbo].[AspNetUserLogins]'))
                CREATE INDEX [IX_AspNetUserLogins_UserId] ON [dbo].[AspNetUserLogins] ([UserId]);

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_AspNetUserRoles_RoleId' AND [object_id] = OBJECT_ID(N'[dbo].[AspNetUserRoles]'))
                CREATE INDEX [IX_AspNetUserRoles_RoleId] ON [dbo].[AspNetUserRoles] ([RoleId]);

            IF OBJECT_ID(N'[dbo].[Supporters]', N'U') IS NOT NULL
                AND NOT EXISTS (
                    SELECT 1
                    FROM sys.foreign_keys
                    WHERE [name] = N'FK_AspNetUsers_Supporters_SupporterId'
                )
            BEGIN
                EXEC(N'
                    ALTER TABLE [dbo].[AspNetUsers]
                    ADD CONSTRAINT [FK_AspNetUsers_Supporters_SupporterId]
                        FOREIGN KEY ([SupporterId]) REFERENCES [dbo].[Supporters]([SupporterId]) ON DELETE SET NULL;
                ');
            END;
            """;

        await ExecuteNonQueryAsync(db, sql, cancellationToken);
    }

    private static async Task EnsureAdminDashboardSchemaAsync(AppDbContext db, CancellationToken cancellationToken)
    {
        const string sql = """
            IF OBJECT_ID(N'[dbo].[SupporterContacts]', N'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[SupporterContacts](
                    [SupporterContactId] [int] IDENTITY(1,1) NOT NULL,
                    [SupporterId] [int] NOT NULL,
                    [ContactDate] [date] NOT NULL,
                    [ContactType] [nvarchar](256) NOT NULL,
                    [Notes] [nvarchar](max) NULL,
                    [CreatedAt] [datetime2] NULL,
                    CONSTRAINT [PK_SupporterContacts] PRIMARY KEY ([SupporterContactId]),
                    CONSTRAINT [FK_SupporterContacts_Supporters_SupporterId]
                        FOREIGN KEY ([SupporterId]) REFERENCES [dbo].[Supporters]([SupporterId]) ON DELETE CASCADE
                );
            END;

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_SupporterContacts_SupporterId' AND [object_id] = OBJECT_ID(N'[dbo].[SupporterContacts]'))
                CREATE INDEX [IX_SupporterContacts_SupporterId] ON [dbo].[SupporterContacts] ([SupporterId]);

            IF COL_LENGTH(N'[dbo].[Residents]', N'CaseConferenceDate') IS NULL
                EXEC(N'ALTER TABLE [dbo].[Residents] ADD [CaseConferenceDate] [date] NULL;');
            """;

        await ExecuteNonQueryAsync(db, sql, cancellationToken);
    }

    private static async Task<int> ExecuteScalarAsync(AppDbContext db, string sql, CancellationToken cancellationToken)
    {
        var connection = db.Database.GetDbConnection();
        var shouldClose = connection.State != ConnectionState.Open;
        if (shouldClose)
            await connection.OpenAsync(cancellationToken);

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = sql;
            var result = await command.ExecuteScalarAsync(cancellationToken);
            return Convert.ToInt32(result);
        }
        finally
        {
            if (shouldClose)
                await connection.CloseAsync();
        }
    }

    private static async Task ExecuteNonQueryAsync(AppDbContext db, string sql, CancellationToken cancellationToken)
    {
        var connection = db.Database.GetDbConnection();
        var shouldClose = connection.State != ConnectionState.Open;
        if (shouldClose)
            await connection.OpenAsync(cancellationToken);

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = sql;
            await command.ExecuteNonQueryAsync(cancellationToken);
        }
        finally
        {
            if (shouldClose)
                await connection.CloseAsync();
        }
    }
}
