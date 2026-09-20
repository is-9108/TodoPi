using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace TodoApi.Tests.Endpoints;

public class CreateTaskTests
{
    [Fact]
    public async Task PostTask_WithValidData_Returns201WithTask()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/tasks", new
        {
            title = "Buy groceries",
            priority = "High"
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = doc.RootElement;

        Assert.True(root.GetProperty("id").GetInt32() > 0);
        Assert.Equal("Buy groceries", root.GetProperty("title").GetString());
        Assert.Equal("High", root.GetProperty("priority").GetString());
        Assert.Equal("Incomplete", root.GetProperty("status").GetString());
        Assert.False(string.IsNullOrWhiteSpace(root.GetProperty("createdAt").GetString()));
        Assert.False(string.IsNullOrWhiteSpace(root.GetProperty("updatedAt").GetString()));
    }

    [Fact]
    public async Task PostTask_WithTitleOnly_Returns201()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/tasks", new { title = "Minimal task" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = doc.RootElement;

        Assert.Equal("Minimal task", root.GetProperty("title").GetString());
        Assert.Equal("Medium", root.GetProperty("priority").GetString());
        Assert.Equal("Incomplete", root.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, root.GetProperty("description").ValueKind);
        Assert.Equal(JsonValueKind.Null, root.GetProperty("dueDate").ValueKind);
        Assert.Equal(JsonValueKind.Null, root.GetProperty("tags").ValueKind);
    }

    [Fact]
    public async Task PostTask_WithoutTitle_Returns400()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/tasks", new { priority = "High" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        // データが保存されないこと
        var listResponse = await client.GetAsync("/api/tasks");
        using var listDoc = JsonDocument.Parse(await listResponse.Content.ReadAsStringAsync());
        Assert.Equal(0, listDoc.RootElement.GetArrayLength());
    }

    [Fact]
    public async Task PostTask_WithEmptyTitle_Returns400()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/tasks", new { title = "" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PostTask_WithInvalidPriority_Returns400()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/tasks", new
        {
            title = "Task",
            priority = "Critical"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PostTask_WithInvalidStatus_Returns400()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/tasks", new
        {
            title = "Task",
            status = "InvalidStatus"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PostTask_WithAllFields_Returns201()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/tasks", new
        {
            title = "Complete project",
            description = "Finish the backend API",
            priority = "Low",
            dueDate = "2025-12-31",
            tags = "work,urgent"
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = doc.RootElement;

        Assert.Equal("Complete project", root.GetProperty("title").GetString());
        Assert.Equal("Finish the backend API", root.GetProperty("description").GetString());
        Assert.Equal("Low", root.GetProperty("priority").GetString());
        Assert.Equal("2025-12-31", root.GetProperty("dueDate").GetString());
        Assert.Equal("work,urgent", root.GetProperty("tags").GetString());
        Assert.Equal("Incomplete", root.GetProperty("status").GetString());
    }

    [Fact]
    public async Task PostTask_SetsCreatedAtAndUpdatedAt()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/tasks", new { title = "Timestamped task" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = doc.RootElement;

        var createdAtText = root.GetProperty("createdAt").GetString();
        var updatedAtText = root.GetProperty("updatedAt").GetString();

        Assert.False(string.IsNullOrWhiteSpace(createdAtText));
        Assert.False(string.IsNullOrWhiteSpace(updatedAtText));

        var createdAt = DateTimeOffset.Parse(createdAtText!).UtcDateTime;
        var updatedAt = DateTimeOffset.Parse(updatedAtText!).UtcDateTime;
        var now = DateTime.UtcNow;

        Assert.InRange(createdAt, now.AddMinutes(-5), now.AddMinutes(5));
        Assert.InRange(updatedAt, now.AddMinutes(-5), now.AddMinutes(5));
        Assert.InRange(updatedAt, createdAt.AddSeconds(-5), createdAt.AddSeconds(5));
    }
}
