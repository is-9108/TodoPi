using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using TodoApi.Models;

namespace TodoApi.Data;

public class TodoDbContext : DbContext
{
    public TodoDbContext(DbContextOptions<TodoDbContext> options)
        : base(options)
    {
    }

    public DbSet<TodoTask> Tasks { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // DateTime をティック値（long）として保存し、読み出し時に UTC として復元する。
        // これにより CreatedAt / UpdatedAt の Kind が失われず、JSON シリアライズ結果も一貫する。
        var utcDateTimeConverter = new ValueConverter<DateTime, long>(
            v => v.Ticks,
            v => new DateTime(v, DateTimeKind.Utc));

        modelBuilder.Entity<TodoTask>(entity =>
        {
            entity.Property(e => e.Title)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(e => e.Priority)
                .HasConversion<int>();

            entity.Property(e => e.Status)
                .HasConversion<int>();

            entity.Property(e => e.CreatedAt)
                .HasConversion(utcDateTimeConverter);

            entity.Property(e => e.UpdatedAt)
                .HasConversion(utcDateTimeConverter);
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;

        foreach (var entry in ChangeTracker.Entries<TodoTask>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = now;
                entry.Entity.UpdatedAt = now;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = now;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
