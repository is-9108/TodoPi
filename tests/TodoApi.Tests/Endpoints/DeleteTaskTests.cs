using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace TodoApi.Tests.Endpoints;

public class DeleteTaskTests
{
    [Fact]
    public async Task DeleteTask_ExistingId_Returns204()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        var id = await CreateTaskAsync(client, new { title = "To delete" });

        var response = await client.DeleteAsync($"/api/tasks/{id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task DeleteTask_NonExistentId_Returns404()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.DeleteAsync("/api/tasks/999999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task DeleteTask_ConfirmsDeletion()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        var id = await CreateTaskAsync(client, new { title = "To delete" });

        var deleteResponse = await client.DeleteAsync($"/api/tasks/{id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var getResponse = await client.GetAsync($"/api/tasks/{id}");
        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
    }

    private static async Task<int> CreateTaskAsync(HttpClient client, object payload)
    {
        var response = await client.PostAsJsonAsync("/api/tasks", payload);
        response.EnsureSuccessStatusCode();

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return doc.RootElement.GetProperty("id").GetInt32();
    }
}
