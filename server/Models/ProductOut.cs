public class ProductOut {

    // from the ProductsOut table
    public int ProdOutId { get; set; }
    public int ProdInId { get; set; }
    public int ProdId { get; set; }
    public int? ProdSold { get; set; }
    public decimal? ProdTotalRevenue { get; set; }

    // additional (not from the ProductsOut table)
    public string? ProdName { get; set; }
    public int? ProdStock { get; set; }
    public decimal? ProdPrice { get; set; }
    public int? ProdRemainingStock { get; set; }
    public DateTime? ProdExpiryDate { get; set; }
}