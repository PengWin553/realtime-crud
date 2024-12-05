using server.Hubs;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddSingleton<IConfiguration>(builder.Configuration);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add SignalR
builder.Services.AddSignalR();

// Add Cors
builder.Services.AddCors(option => {
    option.AddDefaultPolicy(builder => {
        builder
            .AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod()
            // If you're using SignalR, you might want to use more specific CORS settings
            .SetIsOriginAllowed(_ => true); // Be cautious with this in production
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment()) {
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Add these lines for SignalR
app.UseCors();
app.UseRouting();

app.UseAuthorization();

app.MapControllers();

// Map SignalR hub
app.MapHub<ProductHub>("/producthub");

app.Run();