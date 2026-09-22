using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TodoApi.Data;
using TodoApi.Dtos;
using TodoApi.Models;

namespace TodoApi.Controllers;

[ApiController]
[Route("api/tasks")]
public class TasksController : ControllerBase
{
    private const int TagSearchCandidateLimit = 500;
    private readonly TodoDbContext _db;

    public TasksController(TodoDbContext db)
    {
        _db = db;
    }

    [HttpPost]
    public async Task<ActionResult<TaskResponse>> CreateTask(CreateTaskRequest request)
    {
        var task = new TodoTask
        {
            Title = request.Title,
            Description = request.Description,
            Priority = request.Priority,
            DueDate = request.DueDate,
            Tags = request.Tags,
            Status = request.Status
        };

        _db.Tasks.Add(task);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTask), new { id = task.Id }, ToResponse(task));
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TaskResponse>>> GetTasks(
        bool includeCompleted = false,
        string sortBy = "priority",
        string? tag = null)
    {
        if (sortBy is not ("priority" or "dueDate"))
        {
            return BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "sortBy must be either 'priority' or 'dueDate'."
            });
        }

        var query = _db.Tasks.AsNoTracking();

        if (!includeCompleted)
        {
            query = query.Where(t => t.Status != TaskItemStatus.Completed);
        }

        var isUntaggedSearch = string.Equals(
            tag?.Trim(), "__none__", StringComparison.OrdinalIgnoreCase);
        if (isUntaggedSearch)
        {
            query = query.Where(t => string.IsNullOrWhiteSpace(t.Tags));
        }

        // SQLite ではカンマ区切り文字列のタグ境界判定を DB に正確に翻訳できない。
        // 完了状態・ソートは DB 側で適用し、通常タグ検索だけ候補上限を設けてから
        // メモリ上で完全一致判定する。将来は正規化検索列/テーブルへ移行する。
        var ordered = sortBy == "dueDate"
            ? query
                .OrderBy(t => t.DueDate == null)
                .ThenBy(t => t.DueDate)
                .ThenBy(t => t.Priority)
            : query
                .OrderBy(t => t.Priority)
                .ThenBy(t => t.DueDate == null)
                .ThenBy(t => t.DueDate);

        var isTagSearch = !string.IsNullOrWhiteSpace(tag) && !isUntaggedSearch;
        var candidates = isTagSearch
            ? ordered.Take(TagSearchCandidateLimit)
            : ordered;

        var tasks = await candidates
            .Select(t => new
            {
                t.Id,
                t.Title,
                t.Description,
                t.Priority,
                t.DueDate,
                t.Tags,
                t.Status,
                t.CreatedAt,
                t.UpdatedAt
            })
            .ToListAsync();

        if (isTagSearch && tasks.Count == TagSearchCandidateLimit)
        {
            Response.Headers["X-Tag-Search-Truncated"] = "true";
        }

        var filtered = tasks.AsEnumerable();
        if (isTagSearch)
        {
            filtered = filtered.Where(t => MatchesTag(t.Tags, tag!));
        }

        return Ok(filtered.Select(t => new TaskResponse
        {
            Id = t.Id,
            Title = t.Title,
            Description = t.Description,
            Priority = t.Priority.ToString(),
            DueDate = t.DueDate,
            Tags = t.Tags,
            Status = t.Status.ToString(),
            CreatedAt = t.CreatedAt,
            UpdatedAt = t.UpdatedAt
        }));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TaskResponse>> GetTask(int id)
    {
        var task = await _db.Tasks
            .AsNoTracking()
            .SingleOrDefaultAsync(t => t.Id == id);

        if (task is null)
        {
            return NotFound();
        }

        return Ok(ToResponse(task));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<TaskResponse>> UpdateTask(int id, UpdateTaskRequest request)
    {
        var task = await _db.Tasks.SingleOrDefaultAsync(t => t.Id == id);

        if (task is null)
        {
            return NotFound();
        }

        task.Title = request.Title;
        task.Description = request.Description;
        task.Priority = request.Priority;
        task.DueDate = request.DueDate;
        task.Tags = request.Tags;
        task.Status = request.Status;

        await _db.SaveChangesAsync();

        return Ok(ToResponse(task));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteTask(int id)
    {
        var task = await _db.Tasks.SingleOrDefaultAsync(t => t.Id == id);

        if (task is null)
        {
            return NotFound();
        }

        _db.Tasks.Remove(task);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    private static bool MatchesTag(string? tags, string selectedTag)
    {
        if (string.IsNullOrEmpty(tags))
        {
            return false;
        }

        var normalizedSelectedTag = selectedTag.Trim();
        if (normalizedSelectedTag.Length == 0)
        {
            return false;
        }

        return tags
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Any(part => string.Equals(part, normalizedSelectedTag, StringComparison.OrdinalIgnoreCase));
    }

    private static TaskResponse ToResponse(TodoTask task) => new()
    {
        Id = task.Id,
        Title = task.Title,
        Description = task.Description,
        Priority = task.Priority.ToString(),
        DueDate = task.DueDate,
        Tags = task.Tags,
        Status = task.Status.ToString(),
        CreatedAt = task.CreatedAt,
        UpdatedAt = task.UpdatedAt
    };
}
