using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TodoApi.Data;
using TodoApi.Models;
using Xunit;

namespace TodoApi.Tests.Persistence;

public class PersistenceTests
{
    [Fact]
    public async Task SavedTask_SurvivesNewDbContext()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        var createResponse = await client.PostAsJsonAsync("/api/tasks", new
        {
            title = "Persisted task",
            priority = "High"
        });
        createResponse.EnsureSuccessStatusCode();

        using var createDoc = JsonDocument.Parse(await createResponse.Content.ReadAsStringAsync());
        var id = createDoc.RootElement.GetProperty("id").GetInt32();

        // 別の DbContext インスタンスで同じ DB ファイルから取得できること
        var options = new DbContextOptionsBuilder<TodoDbContext>()
            .UseSqlite(factory.ConnectionString)
            .Options;

        using (var db = new TodoDbContext(options))
        {
            var task = await db.Tasks.SingleOrDefaultAsync(t => t.Id == id);

            Assert.NotNull(task);
            Assert.Equal("Persisted task", task!.Title);
            Assert.Equal(Priority.High, task.Priority);
        }
    }

    [Fact]
    public async Task CreatedTimestamps_Persisted()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        var createResponse = await client.PostAsJsonAsync("/api/tasks", new { title = "Timestamp persistence" });
        createResponse.EnsureSuccessStatusCode();

        using var createDoc = JsonDocument.Parse(await createResponse.Content.ReadAsStringAsync());
        var id = createDoc.RootElement.GetProperty("id").GetInt32();

        var options = new DbContextOptionsBuilder<TodoDbContext>()
            .UseSqlite(factory.ConnectionString)
            .Options;

        using var db = new TodoDbContext(options);
        var task = await db.Tasks.SingleAsync(t => t.Id == id);

        Assert.NotEqual(default, task.CreatedAt);
        Assert.NotEqual(default, task.UpdatedAt);
        Assert.True(task.CreatedAt <= task.UpdatedAt);
    }
}
