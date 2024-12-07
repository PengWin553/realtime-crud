# Bakery Perishable Goods Management System

## Overview

A comprehensive, real-time product management system designed specifically for bakery perishable goods. This system provides a robust solution for tracking, updating, and managing product inventory with real-time updates and precise stock control.

## Tech Stack

### Backend
- **Framework:** C# ASP.NET Core MVC (net8.0)
- **Real-time Communication:** SignalR (v1.1.0)
- **ORM:** Dapper (v2.1.35)
- **Database Connector:** MySql.Data (v9.1.0)
- **API Documentation:** Swashbuckle.AspNetCore (v6.4.0)
- **API:** RESTful Web API

### Frontend
- **Runtime:** Node.js (v22.1.0)
- **Library:** React.js
- **Mobile Development:** React JS (mobile interface)
- **Routing:** React Router
- **State Management:** React Hooks
- **Notifications:** Sonner

### Database
- **Database:** MariaDB (MySQL)

## Key Features

- 🍞 Real-time inventory tracking for bakery products
- 📊 Comprehensive stock management
- 🔄 Live updates using SignalR
- 📅 Expiry date tracking
- 🗑️ Product discard management
- 🛒 Point of Sale (POS) System

## Core Functionality

### Product Management
- Create, Read, Update, Delete (CRUD) operations
- Track total stock and reject stock
- Monitor product expiry dates
- Real-time stock level notifications

### Point of Sale (POS) System
- Real-time inventory updates
- Mobile-optimized design with no printing of receipts (as intended)

### Unique Capabilities
- Automatic stock calculation
- Precise tracking of sellable and rejected inventory
- Instant notifications on stock changes

## Mobile-First Approach
- Responsive design for mobile devices
- Optimized for on-the-go inventory management

## Prerequisites

- .NET 8.0 SDK
- Node.js 22.1.0
- MariaDB/MySQL Server
- npm or yarn
- Mobile development environment (React Native CLI or Expo)

## Installation

### Backend Setup
1. Clone the repository
2. Navigate to backend directory
3. Configure database connection in `appsettings.json`
4. Run database migrations
5. Start the API server

```bash
dotnet restore
dotnet ef database update
dotnet run
```

### Frontend Setup
1. Navigate to frontend directory
2. Install dependencies
3. Start development server

```bash
npm install
npm start
```

## Environment Configuration

- Create `.env` files for:
  - Backend database connection
  - API base URL
  - SignalR hub configuration

## Contact

victoriakobayashi553@gmail.com