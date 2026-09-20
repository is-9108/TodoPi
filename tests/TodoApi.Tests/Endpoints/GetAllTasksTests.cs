using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace TodoApi.Tests.Endpoints;

public class GetAllTasksTests
{
    [Fact]
    public async Task GetTasks_WhenEmpty_ReturnsEmptyList()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/tasks");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(JsonValueKind.Array, doc.RootElement.ValueKind);
        Assert.Equal(0, doc.RootElement.GetArrayLength());
    }

    [Fact]
    public async Task GetTasks_ReturnsAllTasks()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        await client.PostAsJsonAsync("/api/tasks", new { title = "Task 1" });
        await client.PostAsJsonAsync("/api/tasks", new { title = "Task 2" });
        await client.PostAsJsonAsync("/api/tasks", new { title = "Task 3" });

        var response = await client.GetAsync("/api/tasks");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(3, doc.RootElement.GetArrayLength());
    }

    [Fact]
    public async Task GetTasks_EachTaskContainsExpectedFields()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        await client.PostAsJsonAsync("/api/tasks", new { title = "Field check" });

        var response = await client.GetAsync("/api/tasks");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var items = doc.RootElement.EnumerateArray().ToList();
        var task = Assert.Single(items);

        Assert.True(task.TryGetProperty("id", out _));
        Assert.True(task.TryGetProperty("title", out _));
        Assert.True(task.TryGetProperty("priority", out _));
        Assert.True(task.TryGetProperty("status", out _));
        Assert.True(task.TryGetProperty("createdAt", out _));
        Assert.True(task.TryGetProperty("updatedAt", out _));
    }
}
