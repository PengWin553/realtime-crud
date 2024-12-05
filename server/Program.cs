using server.Hubs;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddSingleton<IConfiguration>(builder.Configuration);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add SignalR
builder.Services.AddSignalR();

// Add Cors
builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactClientPolicy", policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:5173",   // React development server
                "https://localhost:5173"   // HTTPS version
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// IMPORTANT: Middleware order matters
app.UseRouting();

// Add CORS before Authorization
app.UseCors("ReactClientPolicy");

app.UseAuthorization();

app.MapControllers();

// Map SignalR hub with CORS policy
app.MapHub<ProductHub>("/producthub")
   .RequireCors("ReactClientPolicy");

app.Run();