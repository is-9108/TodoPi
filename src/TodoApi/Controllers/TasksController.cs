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
    public async Task<ActionResult<IEnumerable<TaskResponse>>> GetTasks()
    {
        // フルエンティティの実体化を避け、レスポンスに必要な列のみを DB クエリで投影する。
        // enum の ToString() は SQLite に翻訳できないため、enum 値のまま投影してメモリ上で変換する。
        var tasks = await _db.Tasks
            .AsNoTracking()
            .OrderBy(t => t.Id)
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

        return Ok(tasks.Select(t => new TaskResponse
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
