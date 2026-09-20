using System.ComponentModel.DataAnnotations;
using TodoApi.Models;

namespace TodoApi.Dtos;

public class UpdateTaskRequest
{
    [Required]
    public string Title { get; set; } = string.Empty;

    // 未定義の数値（例: 999）を 400 にする防御的バリデーション（多重防御）。
    [EnumDataType(typeof(Priority))]
    public Priority Priority { get; set; } = Priority.Medium;

    [EnumDataType(typeof(TaskItemStatus))]
    public TaskItemStatus Status { get; set; } = TaskItemStatus.Incomplete;

    public string? Description { get; set; }

    public DateOnly? DueDate { get; set; }

    public string? Tags { get; set; }
}
