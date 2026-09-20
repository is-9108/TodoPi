using System.Net;
using System.Net.Http;
using Microsoft.AspNetCore.Hosting;
using Xunit;

namespace TodoApi.Tests.Security;

public class CorsTests
{
    [Fact]
    public async Task NoConfiguredOrigins_EmitNoCorsHeader()
    {
        // AllowedOrigins が未設定の場合、どのオリジンにも CORS ヘッダを返さない。
        using var factory = new CustomWebApplicationFactory()
            .WithWebHostBuilder(builder =>
                builder.ConfigureAppConfiguration((_, config) => config.Sources.Clear()));
        using var client = factory.CreateClient();

        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/tasks");
        request.Headers.Add("Origin", "http://evil.example");

        using var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }

    [Fact]
    public async Task AllowedOrigin_ReceivesAllowOriginHeader()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/tasks");
        request.Headers.Add("Origin", "http://localhost:5173");

        using var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(
            "http://localhost:5173",
            response.Headers.GetValues("Access-Control-Allow-Origin").Single());
    }

    [Fact]
    public async Task DisallowedOrigin_NoCorsHeader()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/tasks");
        request.Headers.Add("Origin", "http://evil.example");

        using var response = await client.SendAsync(request);

        // リクエスト自体は処理されるが、CORS 許可ヘッダは付与されない。
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }

    [Fact]
    public async Task CorsHeader_IsNeverWildcard()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/tasks");
        request.Headers.Add("Origin", "http://localhost:5173");

        using var response = await client.SendAsync(request);

        Assert.DoesNotContain(
            response.Headers.GetValues("Access-Control-Allow-Origin"),
            value => value == "*");
    }
}