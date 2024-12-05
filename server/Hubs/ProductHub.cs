using Microsoft.AspNetCore.SignalR;

namespace server.Hubs
{
    public class ProductHub : Hub
    {
        // Broadcast methods for different product events
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
    }
}