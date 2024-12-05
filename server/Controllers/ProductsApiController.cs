using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Dapper;
using MySql.Data.MySqlClient;
using server.Hubs;

namespace server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductsApiController : ControllerBase
    {
        private readonly string _connectionString;
        private readonly IHubContext<ProductHub> _hubContext;

        public ProductsApiController(
            IConfiguration configuration, 
            IHubContext<ProductHub> hubContext)
        {
            // Use null-coalescing to ensure _connectionString is never null
            _connectionString = configuration.GetConnectionString("DefaultConnection") 
                ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");
            _hubContext = hubContext;
        }

        // Get all products with additional details
        [HttpGet("GetProducts")]
        public async Task<IActionResult> GetProducts()
        {
            using var connection = new MySqlConnection(_connectionString);
            await connection.OpenAsync();

            const string query = @"
                SELECT 
                    p.*, 
                    COALESCE(SUM(pi.ProdRemainingStock), 0) AS TotalRemainingStock,
                    COALESCE(SUM(po.ProdSold), 0) AS TotalSold
                FROM 
                    Products p
                LEFT JOIN 
                    ProductsIn pi ON p.ProdId = pi.ProdId
                LEFT JOIN 
                    ProductsOut po ON pi.ProdInId = po.ProdInId
                GROUP BY 
                    p.ProdId
                ORDER BY 
                    p.ProdId DESC";

            var result = await connection.QueryAsync<Product>(query);
            
            if (!result.Any())
                return BadRequest("No products found");

            return Ok(result);
        }

        // Get specified product with detailed information
        [HttpGet("GetProduct/{prodId}")]
        public async Task<ActionResult<Product>> GetProduct(int prodId)
        {
            using var connection = new MySqlConnection(_connectionString);
            await connection.OpenAsync();

            const string query = @"
                SELECT 
                    p.*, 
                    COALESCE(SUM(pi.ProdRemainingStock), 0) AS TotalRemainingStock,
                    COALESCE(SUM(pi.ProdDiscarded), 0) AS TotalDiscarded,
                    COALESCE(SUM(po.ProdSold), 0) AS TotalSold,
                    COALESCE(SUM(po.ProdTotalRevenue), 0) AS TotalRevenue
                FROM 
                    Products p
                LEFT JOIN 
                    ProductsIn pi ON p.ProdId = pi.ProdId
                LEFT JOIN 
                    ProductsOut po ON pi.ProdInId = po.ProdInId
                WHERE 
                    p.ProdId = @ProdId
                GROUP BY 
                    p.ProdId
                LIMIT 1";

            var result = await connection.QueryFirstOrDefaultAsync<Product>(query, new { ProdId = prodId });
            
            if (result == null)
                return NotFound($"Product with ID {prodId} not found");

            return Ok(result);
        }

        // Create a new product
        [HttpPost("SaveProduct")]
        public async Task<IActionResult> SaveProductAsync([FromBody] Product product)
        {
            using var connection = new MySqlConnection(_connectionString);
            await connection.OpenAsync();

            const string query = @"
                INSERT INTO Products 
                (ProdName, ProdDescription, ProdPrice, ProdOverallStock, ProdMinStockLevel, CreatedAt, UpdatedAt)
                VALUES 
                (@ProdName, @ProdDescription, @ProdPrice, @ProdOverallStock, @ProdMinStockLevel, NOW(), NOW());
                
                SELECT * FROM Products WHERE ProdId = LAST_INSERT_ID();";

            // Set CreatedAt and UpdatedAt to current time
            product.CreatedAt = DateTime.Now;
            product.UpdatedAt = DateTime.Now;

            var result = await connection.QueryAsync<Product>(query, product);
            var savedProduct = result.First();

            // Notify all clients about the new product
            await _hubContext.Clients.All.SendAsync("ReceiveProductAdded", savedProduct);

            return Ok(savedProduct);
        }

        // Update an existing product
        [HttpPut("UpdateProduct/{id}")]
        public async Task<IActionResult> UpdateProductAsync(int id, [FromBody] Product product)
        {
            using var connection = new MySqlConnection(_connectionString);
            await connection.OpenAsync();

            const string query = @"
                UPDATE Products
                SET 
                    ProdName = @ProdName, 
                    ProdDescription = @ProdDescription, 
                    ProdPrice = @ProdPrice, 
                    ProdOverallStock = @ProdOverallStock,
                    ProdMinStockLevel = @ProdMinStockLevel,
                    UpdatedAt = NOW()
                WHERE ProdId = @ProdId;
                
                SELECT * FROM Products WHERE ProdId = @ProdId LIMIT 1;";
            
            var parameters = new
            {
                ProdId = id,
                product.ProdName,
                product.ProdDescription,
                product.ProdPrice,
                product.ProdOverallStock,
                product.ProdMinStockLevel
            };

            var result = await connection.QueryAsync<Product>(query, parameters);

            if (!result.Any())
                return NotFound("Product not found");

            var updatedProduct = result.First();

            // Notify all clients about the updated product
            await _hubContext.Clients.All.SendAsync("ReceiveProductUpdated", updatedProduct);

            return Ok(updatedProduct);
        }

        // Delete a product
        [HttpDelete("DeleteProduct/{id}")]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            using var connection = new MySqlConnection(_connectionString);
            await connection.OpenAsync();

            // Check if product exists before deleting
            const string checkQuery = "SELECT COUNT(*) FROM Products WHERE ProdId = @ProdId";
            var exists = await connection.ExecuteScalarAsync<int>(checkQuery, new { ProdId = id });

            if (exists == 0)
                return NotFound($"Product with ID {id} not found");

            // Delete related records in ProductsIn and ProductsOut first
            const string deleteQuery = @"
                DELETE FROM ProductsOut WHERE ProdInId IN (SELECT ProdInId FROM ProductsIn WHERE ProdId = @ProdId);
                DELETE FROM ProductsIn WHERE ProdId = @ProdId;
                DELETE FROM Products WHERE ProdId = @ProdId;";

            await connection.ExecuteAsync(deleteQuery, new { ProdId = id });

            // Notify all clients about the deleted product
            await _hubContext.Clients.All.SendAsync("ReceiveProductDeleted", id);

            return Ok("Product successfully deleted");
        }
    }
}