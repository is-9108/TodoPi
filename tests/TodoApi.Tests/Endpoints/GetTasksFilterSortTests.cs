using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace TodoApi.Tests.Endpoints;

public class GetTasksFilterSortTests
{
    private static async Task<List<JsonElement>> GetTasksAsync(HttpClient client, string query = "")
    {
        var response = await client.GetAsync($"/api/tasks{query}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return doc.RootElement.EnumerateArray().Select(e => e.Clone()).ToList();
    }

    private static List<string> Titles(List<JsonElement> tasks) =>
        tasks.Select(t => t.GetProperty("title").GetString()!).ToList();

    private static async Task SeedAsync(HttpClient client, object body)
    {
        var response = await client.PostAsJsonAsync("/api/tasks", body);
        response.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task GetTasks_Default_ExcludesCompletedTasks()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();
        await SeedAsync(client, new { title = "Incomplete task" });
        await SeedAsync(client, new { title = "Completed task", status = "Completed" });

        var titles = Titles(await GetTasksAsync(client));
        Assert.Contains("Incomplete task", titles);
        Assert.DoesNotContain("Completed task", titles);
    }

    [Fact]
    public async Task GetTasks_IncludeCompleted_ReturnsAllTasks()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();
        await SeedAsync(client, new { title = "Incomplete task" });
        await SeedAsync(client, new { title = "Completed task", status = "Completed" });

        var titles = Titles(await GetTasksAsync(client, "?includeCompleted=true"));
        Assert.Contains("Incomplete task", titles);
        Assert.Contains("Completed task", titles);
    }

    [Fact]
    public async Task GetTasks_DefaultSort_ByPriorityHighToLow()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();
        await SeedAsync(client, new { title = "Low task", priority = "Low" });
        await SeedAsync(client, new { title = "High task", priority = "High" });
        await SeedAsync(client, new { title = "Medium task", priority = "Medium" });

        Assert.Equal(new[] { "High task", "Medium task", "Low task" }, Titles(await GetTasksAsync(client)));
    }

    [Fact]
    public async Task GetTasks_DefaultSort_ByPriorityThenDueDate()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();
        await SeedAsync(client, new { title = "High late", priority = "High", dueDate = "2025-03-01" });
        await SeedAsync(client, new { title = "High early", priority = "High", dueDate = "2025-01-01" });
        await SeedAsync(client, new { title = "High none", priority = "High" });

        Assert.Equal(new[] { "High early", "High late", "High none" }, Titles(await GetTasksAsync(client)));
    }

    [Fact]
    public async Task GetTasks_SortByDueDate_AscendingWithNullLast()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();
        await SeedAsync(client, new { title = "Middle", dueDate = "2025-03-01" });
        await SeedAsync(client, new { title = "Earliest", dueDate = "2025-01-01" });
        await SeedAsync(client, new { title = "No date" });

        Assert.Equal(new[] { "Earliest", "Middle", "No date" }, Titles(await GetTasksAsync(client, "?sortBy=dueDate")));
    }

    [Fact]
    public async Task GetTasks_FilterByTag_UsesCaseInsensitiveExactMatch()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();
        await SeedAsync(client, new { title = "Work", tags = "  Work  , urgent " });
        await SeedAsync(client, new { title = "Homework", tags = "homework" });
        await SeedAsync(client, new { title = "Home", tags = "home" });

        var titles = Titles(await GetTasksAsync(client, "?tag=work"));
        Assert.Equal(new[] { "Work" }, titles);
        Assert.Equal(new[] { "Work" }, Titles(await GetTasksAsync(client, "?tag=%20Work%20")));
        Assert.Empty(Titles(await GetTasksAsync(client, "?tag=nonexistent")));
    }

    [Fact]
    public async Task GetTasks_FilterByTag_NoneTag_ReturnsNullAndEmpty()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();
        await SeedAsync(client, new { title = "Null tags" });
        await SeedAsync(client, new { title = "Empty tags", tags = "" });
        await SeedAsync(client, new { title = "Tagged", tags = "work" });

        var titles = Titles(await GetTasksAsync(client, "?tag=__none__"));
        Assert.Equal(2, titles.Count);
        Assert.Contains("Null tags", titles);
        Assert.Contains("Empty tags", titles);
        Assert.DoesNotContain("Tagged", titles);
    }

    [Fact]
    public async Task GetTasks_UnknownSortBy_ReturnsBadRequest()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/tasks?sortBy=unknown");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Contains("sortBy", doc.RootElement.GetProperty("title").GetString());
    }

    [Fact]
    public async Task GetTasks_TagSearch_IsCappedAndReportsTruncation()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        for (var i = 0; i < 501; i++)
        {
            await SeedAsync(client, new { title = $"Tagged {i}", tags = "work" });
        }

        var response = await client.GetAsync("/api/tasks?tag=work");
        response.EnsureSuccessStatusCode();
        Assert.True(response.Headers.TryGetValues("X-Tag-Search-Truncated", out var values));
        Assert.Equal("true", values!.Single());

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(500, doc.RootElement.GetArrayLength());
    }

    [Fact]
    public async Task GetTasks_CombinedFilterAndSort()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();
        await SeedAsync(client, new { title = "Urgent late completed", tags = "urgent", dueDate = "2025-03-01", status = "Completed" });
        await SeedAsync(client, new { title = "Urgent early", tags = "urgent", dueDate = "2025-01-01" });
        await SeedAsync(client, new { title = "Other", tags = "other", dueDate = "2025-02-01" });

        var titles = Titles(await GetTasksAsync(client, "?includeCompleted=true&sortBy=dueDate&tag=urgent"));
        Assert.Equal(new[] { "Urgent early", "Urgent late completed" }, titles);
    }
}
