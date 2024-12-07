using Microsoft.AspNetCore.SignalR;

namespace server.Hubs
{
    public class ProductHub : Hub
    {
        // Existing product-related methods
        public async Task NotifyProductAdded(Product product)
        {
            await Clients.All.SendAsync("ReceiveProductAdded", product);
        }

        public async Task NotifyProductUpdated(Product product)
        {
            await Clients.All.SendAsync("ReceiveProductUpdated", product);
        }

        public async Task NotifyProductDeleted(int productId)
        {
            await Clients.All.SendAsync("ReceiveProductDeleted", productId);
        }

        // New stock-related methods
        public async Task NotifyStockAdded(ProductIn stock)
        {
            await Clients.All.SendAsync("ReceiveStockAdded", stock);
        }

        public async Task NotifyStockUpdated(ProductIn stock)
        {
            await Clients.All.SendAsync("ReceiveStockUpdated", stock);
        }

        public async Task NotifyStockDeleted(object stockInfo)
        {
            await Clients.All.SendAsync("ReceiveStockDeleted", stockInfo);
        }

        public async Task NotifyStockDiscarded(object discardInfo)
        {
            await Clients.All.SendAsync("ReceiveStockDiscarded", discardInfo);
        }
    }
}