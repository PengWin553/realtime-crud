using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Dapper;
using MySql.Data.MySqlClient;
using server.Hubs;

namespace server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductsInApiController : ControllerBase
    {
        private readonly string _connectionString;
        private readonly IHubContext<ProductHub> _hubContext;

        public ProductsInApiController(
            IConfiguration configuration,
            IHubContext<ProductHub> hubContext)
        {
            // Use null-coalescing to ensure _connectionString is never null
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");
            _hubContext = hubContext;
        }

        // Get all the stocks of products
        [HttpGet("GetAllStocksOfProducts")]
        public async Task<IActionResult> GetAllStocksOfProducts()
        {
            using var connection = new MySqlConnection(_connectionString);
            await connection.OpenAsync();

            const string query = @"
                SELECT 
                    pi.ProdInId, 
                    pi.ProdId, 
                    pi.ProdStock, 
                    pi.ProdRejectStock, 
                    pi.ProdRemainingStock, 
                    pi.ProdDiscarded,
                    pi.ProdTotalLosses,
                    pi.ProdExpiryDate, 
                    p.ProdName,
                    pi.CreatedAt,
                    pi.UpdatedAt
                FROM 
                    ProductsIn pi
                LEFT JOIN 
                    Products p ON pi.ProdId = p.ProdId
                ORDER BY 
                    pi.ProdInId DESC";

            var result = await connection.QueryAsync<ProductIn>(query);

            if (result.Count() == 0)
                return BadRequest("No stock entries found");

            return Ok(result);
        }

        // Get specified stock of product
        [HttpGet("GetSpecifiedStockOfProduct/{prodInId}")]
        public async Task<ActionResult<ProductIn>> GetSpecifiedStockOfProduct(int prodInId)
        {
            using var connection = new MySqlConnection(_connectionString);
            await connection.OpenAsync();

            const string query = "SELECT * FROM ProductsIn WHERE ProdInId = @ProdInId LIMIT 1";
            var result = await connection.QueryFirstOrDefaultAsync<ProductIn>(query, new { ProdInId = prodInId });

            if (result == null)
                return NotFound($"Stock entry with ID {prodInId} not found");

            return Ok(result);
        }

        // Save a new stock entry
        [HttpPost("SaveStockOfProduct")]
        public async Task<IActionResult> SaveStockOfProduct([FromBody] ProductIn productIn)
        {
            using var connection = new MySqlConnection(_connectionString);
            await connection.OpenAsync();

            const string getProductPriceQuery = "SELECT ProdPrice FROM Products WHERE ProdId = @ProdId";
            var prodPrice = await connection.ExecuteScalarAsync<decimal>(getProductPriceQuery, new { ProdId = productIn.ProdId });

            productIn.ProdRemainingStock = productIn.ProdStock;
            productIn.ProdDiscarded = 0;
            productIn.ProdTotalLosses = productIn.ProdRejectStock * prodPrice;

            const string insertQuery = @"
                INSERT INTO ProductsIn (ProdId, ProdStock, ProdRejectStock, ProdRemainingStock, ProdDiscarded, ProdTotalLosses, ProdExpiryDate, CreatedAt, UpdatedAt)
                VALUES (@ProdId, @ProdStock, @ProdRejectStock, @ProdRemainingStock, @ProdDiscarded, @ProdTotalLosses, @ProdExpiryDate, UTC_TIMESTAMP(), UTC_TIMESTAMP());
                SELECT LAST_INSERT_ID();
            ";

            var newProdInId = await connection.ExecuteScalarAsync<int>(insertQuery, productIn);

            const string updateProductQuery = @"
                UPDATE Products
                SET ProdOverallStock = ProdOverallStock + @NewStock
                WHERE ProdId = @ProdId;
            ";

            await connection.ExecuteAsync(updateProductQuery, new { ProdId = productIn.ProdId, NewStock = productIn.ProdRemainingStock });

            const string insertProductsOutQuery = @"
                INSERT INTO ProductsOut (ProdInId, ProdId, ProdSold, ProdTotalRevenue)
                VALUES (@ProdInId, @ProdId, 0, 0);
            ";

            await connection.ExecuteAsync(insertProductsOutQuery, new { ProdInId = newProdInId, ProdId = productIn.ProdId });

            // Fetch the complete stock entry
            const string getNewStockQuery = @"
                SELECT 
                    pi.*, 
                    p.ProdName
                FROM 
                    ProductsIn pi
                JOIN 
                    Products p ON pi.ProdId = p.ProdId
                WHERE 
                    pi.ProdInId = @ProdInId";
            var savedStock = await connection.QueryFirstAsync<ProductIn>(getNewStockQuery, new { ProdInId = newProdInId });

            // Notify all clients about the new stock entry
            await _hubContext.Clients.All.SendAsync("ReceiveStockAdded", savedStock);

            return Ok(savedStock);
        }

        // Update an existing stock entry
        [HttpPut("UpdateStockOfProduct/{id}")]
        public async Task<IActionResult> UpdateStockOfProduct(int id, [FromBody] ProductIn productIn)
        {
            using var connection = new MySqlConnection(_connectionString);
            await connection.OpenAsync();

            const string getCurrentStockQuery = @"
                SELECT pi.*, p.ProdPrice, p.ProdOverallStock, p.ProdName
                FROM ProductsIn pi
                JOIN Products p ON pi.ProdId = p.ProdId
                WHERE pi.ProdInId = @prodInId
            ";
            var currentStock = await connection.QueryFirstOrDefaultAsync<dynamic>(getCurrentStockQuery, new { prodInId = id });

            if (currentStock == null)
            {
                return NotFound("Product stock not found");
            }

            var oldRemainingStock = currentStock.ProdRemainingStock;
            var newRemainingStock = productIn.ProdStock;
            var stockDifference = newRemainingStock - oldRemainingStock;

            var additionalLosses = (productIn.ProdRejectStock - currentStock.ProdRejectStock) * currentStock.ProdPrice;

            const string updateProductInQuery = @"
                UPDATE ProductsIn
                SET ProdId = @ProdId, ProdStock = @ProdStock, ProdRejectStock = @ProdRejectStock, 
                    ProdRemainingStock = @ProdRemainingStock, 
                    ProdTotalLosses = ProdTotalLosses + @AdditionalLosses,
                    ProdExpiryDate = @ProdExpiryDate, UpdatedAt = UTC_TIMESTAMP()
                WHERE ProdInId = @ProdInId;
            ";

            await connection.ExecuteAsync(updateProductInQuery, new
            {
                productIn.ProdId,
                productIn.ProdStock,
                productIn.ProdRejectStock,
                ProdRemainingStock = newRemainingStock,
                AdditionalLosses = additionalLosses,
                productIn.ProdExpiryDate,
                ProdInId = id
            });

            const string updateProductQuery = @"
                UPDATE Products
                SET ProdOverallStock = ProdOverallStock + @StockDifference
                WHERE ProdId = @ProdId;
            ";

            await connection.ExecuteAsync(updateProductQuery, new { ProdId = productIn.ProdId, StockDifference = stockDifference });

            // Fetch the updated stock entry
            const string getUpdatedStockQuery = @"
                SELECT 
                    pi.*, 
                    p.ProdName
                FROM 
                    ProductsIn pi
                JOIN 
                    Products p ON pi.ProdId = p.ProdId
                WHERE 
                    pi.ProdInId = @ProdInId";
            var updatedStock = await connection.QueryFirstAsync<ProductIn>(getUpdatedStockQuery, new { ProdInId = id });

            // Notify all clients about the updated stock entry
            await _hubContext.Clients.All.SendAsync("ReceiveStockUpdated", updatedStock);

            return Ok(updatedStock);
        }

        // Delete a stock entry
        [HttpDelete("DeleteStockOfProduct/{id}")]
        public async Task<IActionResult> DeleteStockOfProduct(int id)
        {
            using var connection = new MySqlConnection(_connectionString);
            await connection.OpenAsync();

            const string getCurrentStockQuery = @"
                SELECT pi.ProdId, pi.ProdRemainingStock, p.ProdName 
                FROM ProductsIn pi
                JOIN Products p ON pi.ProdId = p.ProdId
                WHERE pi.ProdInId = @prodInId";
            var stockRecord = await connection.QueryFirstOrDefaultAsync<dynamic>(getCurrentStockQuery, new { prodInId = id });

            if (stockRecord == null)
            {
                return NotFound("Product stock not found");
            }

            const string updateProductStockQuery = @"
                UPDATE Products
                SET ProdOverallStock = ProdOverallStock - @ProdRemainingStock
                WHERE ProdId = @ProdId;
            ";

            await connection.ExecuteAsync(updateProductStockQuery, new { ProdId = stockRecord.ProdId, ProdRemainingStock = stockRecord.ProdRemainingStock });

            const string deleteProductsOutQuery = "DELETE FROM ProductsOut WHERE ProdInId = @prodInId";
            await connection.ExecuteAsync(deleteProductsOutQuery, new { prodInId = id });

            const string deleteQuery = "DELETE FROM ProductsIn WHERE ProdInId = @prodInId";
            await connection.ExecuteAsync(deleteQuery, new { prodInId = id });

            // Notify all clients about the deleted stock entry
            await _hubContext.Clients.All.SendAsync("ReceiveStockDeleted", new
            {
                ProdInId = id,
                ProdId = stockRecord.ProdId,
                ProdName = stockRecord.ProdName
            });

            return Ok();
        }

        // Discard a specific stock
        [HttpPost("DiscardStock")]
        public async Task<IActionResult> DiscardStock(int prodInId, int discardAmount)
        {
            using var connection = new MySqlConnection(_connectionString);
            await connection.OpenAsync();

            const string getCurrentStockQuery = @"
                SELECT pi.*, p.ProdPrice, p.ProdName
                FROM ProductsIn pi
                JOIN Products p ON pi.ProdId = p.ProdId
                WHERE pi.ProdInId = @ProdInId";

            var currentStock = await connection.QueryFirstOrDefaultAsync<dynamic>(getCurrentStockQuery, new { ProdInId = prodInId });

            if (currentStock == null)
            {
                return NotFound("Product stock not found");
            }

            if (discardAmount > currentStock.ProdRemainingStock)
            {
                return BadRequest("Discard amount cannot be greater than remaining stock");
            }

            var newRemainingStock = currentStock.ProdRemainingStock - discardAmount;
            var newDiscarded = currentStock.ProdDiscarded + discardAmount;
            var additionalLosses = discardAmount * currentStock.ProdPrice;

            const string updateProductInQuery = @"
                UPDATE ProductsIn
                SET ProdRemainingStock = @ProdRemainingStock,
                    ProdDiscarded = @ProdDiscarded,
                    ProdTotalLosses = ProdTotalLosses + @AdditionalLosses,
                    UpdatedAt = UTC_TIMESTAMP()
                WHERE ProdInId = @ProdInId";

            await connection.ExecuteAsync(updateProductInQuery, new
            {
                ProdRemainingStock = newRemainingStock,
                ProdDiscarded = newDiscarded,
                AdditionalLosses = additionalLosses,
                ProdInId = prodInId
            });

            const string updateProductQuery = @"
                UPDATE Products
                SET ProdOverallStock = ProdOverallStock - @DiscardAmount
                WHERE ProdId = @ProdId";

            await connection.ExecuteAsync(updateProductQuery, new
            {
                DiscardAmount = discardAmount,
                ProdId = currentStock.ProdId
            });

            // Fetch the updated stock entry with product name
            const string getUpdatedStockQuery = @"
                SELECT 
                    pi.*, 
                    p.ProdName
                FROM 
                    ProductsIn pi
                JOIN 
                    Products p ON pi.ProdId = p.ProdId
                WHERE 
                    pi.ProdInId = @ProdInId";
            var updatedStock = await connection.QueryFirstAsync<ProductIn>(getUpdatedStockQuery, new { ProdInId = prodInId });

            // Notify all clients about the discarded stock
            await _hubContext.Clients.All.SendAsync("ReceiveStockDiscarded", new
            {
                ProdInId = prodInId,
                ProdId = currentStock.ProdId,
                ProdName = currentStock.ProdName,
                DiscardAmount = discardAmount,
                UpdatedStock = updatedStock
            });

            return Ok(updatedStock);
        }
    }
}