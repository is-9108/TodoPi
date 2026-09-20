using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TodoApi.Data;

namespace TodoApi.Tests;

/// <summary>
/// 各テストで独立したテンポラリ SQLite ファイルを使うための WebApplicationFactory。
/// Dispose 時にテンポラリファイルを削除する。
/// </summary>
public class CustomWebApplicationFactory : WebApplicationFactory<global::Program>
{
    private readonly string _dbPath;

    public CustomWebApplicationFactory()
    {
        _dbPath = Path.GetTempFileName();
    }

    public string DbPath => _dbPath;

    public string ConnectionString => $"Data Source={_dbPath}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            var descriptor = services.SingleOrDefault(d =>
                d.ServiceType == typeof(DbContextOptions<TodoDbContext>));

            if (descriptor is not null)
            {
                services.Remove(descriptor);
            }

            services.AddDbContext<TodoDbContext>(options =>
                options.UseSqlite(ConnectionString));
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);

        if (File.Exists(_dbPath))
        {
            File.Delete(_dbPath);
        }
    }
}
