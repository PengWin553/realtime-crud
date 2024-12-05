public class Product{
    public int ProdId { get; set; }
    public string? ProdName { get; set; }
    public string? ProdDescription { get; set; }
    public decimal? ProdPrice { get; set; }
    public int? ProdOverallStock { get; set; }
    public int? ProdMinStockLevel { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}