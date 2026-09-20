using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace TodoApi.Tests.Validation;

public class TaskValidationTests
{
    [Theory]
    [InlineData("High")]
    [InlineData("Medium")]
    [InlineData("Low")]
    public async Task Priority_AllValidValues_Accepted(string priority)
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/tasks", new { title = "Task", priority });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(priority, doc.RootElement.GetProperty("priority").GetString());
    }

    [Fact]
    public async Task Priority_InvalidValue_Rejected()
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

    [Theory]
    [InlineData("Incomplete")]
    [InlineData("Completed")]
    public async Task Status_AllValidValues_Accepted(string status)
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/tasks", new { title = "Task", status });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(status, doc.RootElement.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Status_InvalidValue_Rejected()
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
    public async Task Priority_NumericValue_Rejected()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        // 数値で指定された enum 値はデシリアライズ時に拒否され、保存されない。
        var response = await client.PostAsJsonAsync("/api/tasks", new
        {
            title = "Task",
            priority = 999
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Status_NumericValue_Rejected()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/tasks", new
        {
            title = "Task",
            status = 999
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateTask_Priority_NumericValue_Rejected()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        // PUT（UpdateTaskRequest）でも数値 enum 値は 400 で拒否される。
        var response = await client.PutAsJsonAsync("/api/tasks/1", new
        {
            title = "Task",
            priority = 999
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateTask_Status_NumericValue_Rejected()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.PutAsJsonAsync("/api/tasks/1", new
        {
            title = "Task",
            status = 999
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task DueDate_Nullable_Accepted()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        // 期限を省略
        var omittedResponse = await client.PostAsJsonAsync("/api/tasks", new { title = "No due date" });
        Assert.Equal(HttpStatusCode.Created, omittedResponse.StatusCode);

        using (var doc = JsonDocument.Parse(await omittedResponse.Content.ReadAsStringAsync()))
        {
            Assert.Equal(JsonValueKind.Null, doc.RootElement.GetProperty("dueDate").ValueKind);
        }

        // 期限を明示的に null
        var nullResponse = await client.PostAsJsonAsync("/api/tasks", new { title = "Null due date", dueDate = (string?)null });
        Assert.Equal(HttpStatusCode.Created, nullResponse.StatusCode);

        using (var doc = JsonDocument.Parse(await nullResponse.Content.ReadAsStringAsync()))
        {
            Assert.Equal(JsonValueKind.Null, doc.RootElement.GetProperty("dueDate").ValueKind);
        }
    }

    [Fact]
    public async Task Tags_Nullable_Accepted()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        // タグを省略
        var omittedResponse = await client.PostAsJsonAsync("/api/tasks", new { title = "No tags" });
        Assert.Equal(HttpStatusCode.Created, omittedResponse.StatusCode);

        // タグを null
        var nullResponse = await client.PostAsJsonAsync("/api/tasks", new { title = "Null tags", tags = (string?)null });
        Assert.Equal(HttpStatusCode.Created, nullResponse.StatusCode);

        // タグを空文字列
        var emptyResponse = await client.PostAsJsonAsync("/api/tasks", new { title = "Empty tags", tags = "" });
        Assert.Equal(HttpStatusCode.Created, emptyResponse.StatusCode);
    }
}
