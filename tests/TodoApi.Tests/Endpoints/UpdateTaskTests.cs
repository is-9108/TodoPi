using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace TodoApi.Tests.Endpoints;

public class UpdateTaskTests
{
    [Fact]
    public async Task UpdateTask_ExistingId_Returns200()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        var id = await CreateTaskAsync(client, new { title = "Original", priority = "High" });

        var response = await client.PutAsJsonAsync($"/api/tasks/{id}", new
        {
            title = "Updated title",
            description = "Updated description",
            priority = "Low",
            dueDate = "2026-01-15",
            tags = "updated",
            status = "Completed"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = doc.RootElement;

        Assert.Equal(id, root.GetProperty("id").GetInt32());
        Assert.Equal("Updated title", root.GetProperty("title").GetString());
        Assert.Equal("Updated description", root.GetProperty("description").GetString());
        Assert.Equal("Low", root.GetProperty("priority").GetString());
        Assert.Equal("2026-01-15", root.GetProperty("dueDate").GetString());
        Assert.Equal("updated", root.GetProperty("tags").GetString());
        Assert.Equal("Completed", root.GetProperty("status").GetString());
    }

    [Fact]
    public async Task UpdateTask_UpdatesUpdatedAt()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        var createResponse = await client.PostAsJsonAsync("/api/tasks", new { title = "Original" });
        createResponse.EnsureSuccessStatusCode();

        using var createDoc = JsonDocument.Parse(await createResponse.Content.ReadAsStringAsync());
        var id = createDoc.RootElement.GetProperty("id").GetInt32();
        var createdAt = createDoc.RootElement.GetProperty("createdAt").GetString();
        var originalUpdatedAt = createDoc.RootElement.GetProperty("updatedAt").GetString();

        await Task.Delay(50);

        var response = await client.PutAsJsonAsync($"/api/tasks/{id}", new { title = "Updated" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = doc.RootElement;

        Assert.Equal(createdAt, root.GetProperty("createdAt").GetString());
        Assert.NotEqual(originalUpdatedAt, root.GetProperty("updatedAt").GetString());
    }

    [Fact]
    public async Task UpdateTask_NonExistentId_Returns404()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.PutAsJsonAsync("/api/tasks/999999", new { title = "Updated" });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task UpdateTask_InvalidData_Returns400()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        var id = await CreateTaskAsync(client, new { title = "Original", priority = "High" });

        var response = await client.PutAsJsonAsync($"/api/tasks/{id}", new { title = "" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        // データが変更されないこと
        var getResponse = await client.GetAsync($"/api/tasks/{id}");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);

        using var doc = JsonDocument.Parse(await getResponse.Content.ReadAsStringAsync());
        Assert.Equal("Original", doc.RootElement.GetProperty("title").GetString());
        Assert.Equal("High", doc.RootElement.GetProperty("priority").GetString());
    }

    [Fact]
    public async Task UpdateTask_ChangesPriorityAndStatus()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        var id = await CreateTaskAsync(client, new { title = "Task", priority = "High" });

        var response = await client.PutAsJsonAsync($"/api/tasks/{id}", new
        {
            title = "Task",
            priority = "Low",
            status = "Completed"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("Low", doc.RootElement.GetProperty("priority").GetString());
        Assert.Equal("Completed", doc.RootElement.GetProperty("status").GetString());
    }

    private static async Task<int> CreateTaskAsync(HttpClient client, object payload)
    {
        var response = await client.PostAsJsonAsync("/api/tasks", payload);
        response.EnsureSuccessStatusCode();

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return doc.RootElement.GetProperty("id").GetInt32();
    }
}
