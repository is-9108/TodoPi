using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TodoApi.Data;
using Xunit;

namespace TodoApi.Tests.Infrastructure;

public class ExceptionHandlingTests
{
    [Fact]
    public async Task UnhandledDatabaseException_Returns500ProblemDetails()
    {
        using var factory = new ThrowingDbFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/tasks", new { title = "boom" });

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal(
            "application/problem+json",
            response.Content.Headers.ContentType?.MediaType);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(500, doc.RootElement.GetProperty("status").GetInt32());
        Assert.Equal(
            "An unexpected error occurred.",
            doc.RootElement.GetProperty("title").GetString());
    }

    /// <summary>保存時に必ず例外を投げる DbContext。</summary>
    private sealed class ThrowingTodoDbContext : TodoDbContext
    {
        public ThrowingTodoDbContext(DbContextOptions<TodoDbContext> options)
            : base(options)
        {
        }

        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
            => throw new InvalidOperationException("database failure");
    }

    /// <summary>ThrowingTodoDbContext を注入するテスト用 Factory。</summary>
    private sealed class ThrowingDbFactory : WebApplicationFactory<global::Program>
    {
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
                    options.UseSqlite("Data Source=:memory:"));

                // 最後の登録が優先されるため、通常のコンテキストを投げる実装に差し替える。
                services.AddScoped<TodoDbContext>(sp =>
                    new ThrowingTodoDbContext(
                        sp.GetRequiredService<DbContextOptions<TodoDbContext>>()));
            });
        }
    }
}