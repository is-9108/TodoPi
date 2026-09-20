namespace TodoApi.Models;

public class TodoTask
{
    public int Id { get; set; }

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public Priority Priority { get; set; }

    public DateOnly? DueDate { get; set; }

    public string? Tags { get; set; }

    public TaskItemStatus Status { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}
