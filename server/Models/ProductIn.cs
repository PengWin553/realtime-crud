public class ProductIn {
    public int ProdInId { get; set; }
    public int? ProdId { get; set; }
    public int? ProdStock { get; set; }
    public int? ProdRejectStock { get; set; }
    public int? ProdRemainingStock { get; set; }
    public int? ProdDiscarded { get; set; }
    public decimal? ProdTotalLosses { get; set; }
    public DateTime? ProdExpiryDate { get; set; }
    public string? ProdName { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}