using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace TodoApi.Tests.Endpoints;

public class GetTaskByIdTests
{
    [Fact]
    public async Task GetTask_ExistingId_Returns200()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        var createResponse = await client.PostAsJsonAsync("/api/tasks", new { title = "Existing task" });
        createResponse.EnsureSuccessStatusCode();

        using var createDoc = JsonDocument.Parse(await createResponse.Content.ReadAsStringAsync());
        var id = createDoc.RootElement.GetProperty("id").GetInt32();

        var response = await client.GetAsync($"/api/tasks/{id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(id, doc.RootElement.GetProperty("id").GetInt32());
        Assert.Equal("Existing task", doc.RootElement.GetProperty("title").GetString());
    }

    [Fact]
    public async Task GetTask_NonExistentId_Returns404()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/tasks/999999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetTask_InvalidId_Returns404()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/tasks/not-a-number");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
