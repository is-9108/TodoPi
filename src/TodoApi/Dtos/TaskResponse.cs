namespace TodoApi.Dtos;

public class TaskResponse
{
    public int Id { get; set; }

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string Priority { get; set; } = string.Empty;

    public DateOnly? DueDate { get; set; }

    public string? Tags { get; set; }

    public string Status { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}
