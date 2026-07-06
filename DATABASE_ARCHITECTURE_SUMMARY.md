# Database Architecture: LuxDrive AI Car Rental System
## Overview
This is a modern, relational PostgreSQL database architecture designed to support a multi-tenant car rental platform with AI integration. The system follows a tenant-isolated design where every business-critical entity (Vehicles, Bookings, etc.) is explicitly linked to a specific agency/tenant.

---

## Custom Enums
The schema defines four custom enumerated types for standardizing categorical data:

### 1. `Role`
Defines user account permissions:
- `ADMIN`: Full system-wide access
- `AGENCY`: Access restricted to their own agency's data

### 2. `VehicleStatus`
Tracks the operational state of a car:
- `AVAILABLE`: Ready for rental
- `RENTED`: Currently out on a booking
- `MAINTENANCE`: In for service or repairs
- `UNAVAILABLE`: Temporarily unavailable (manual override)

### 3. `Category`
Classifies vehicles by type for filtering and pricing:
- `ECONOMY`: Budget-friendly vehicles
- `SEDAN`: Standard 4-door sedan
- `SUV`: Sports utility vehicle
- `LUXURY`: Premium high-end vehicles
- `SPORTS`: Performance/sports cars
- `VAN`: Passenger or cargo vans

### 4. `BookingStatus`
Tracks the lifecycle of a rental request:
- `DRAFT`: Work-in-progress, not yet submitted
- `PENDING`: Submitted by customer, awaiting agency confirmation
- `CONFIRMED`: Accepted and booked
- `CANCELLED`: Rejected or cancelled

---

## Core Entities (Models/Tables)

### 1. User
*Table for authentication and access control*
- **Primary Key**: `id` (UUID, auto-generated via `uuid()`)
- **Core Fields**:
  - `email`: Unique user email address
  - `password`: Securely hashed password
  - `role`: Assigns permissions (uses `Role` enum, default `AGENCY`)
  - `isApproved`: Tracks admin approval for new agency accounts (boolean, default `false`)
  - Timestamps for `createdAt` and `updatedAt`

---

### 2. Agency
*The Core Tenant Entity - Multi-Tenancy Foundation*
This model represents a single car rental agency, and all other business data links back to it.
- **Primary Key**: `id` (UUID, auto-generated via `uuid()`)
- **Unique Constraints**: `slug` (URL-safe identifier for landing pages) and `userId` (1:1 with User)
- **Core Fields**:
  - Branding: `name`, `description`, `bio`, `logoUrl`, `bannerUrl`, `primaryColor`
  - Policies: `minAge` (minimum rental age, default 21), `depositAmount` (security deposit), `rentalConditions` (terms of service)
  - Contact: `phone`, `address`, `publicEmail`
  - Timestamps for `createdAt` and `updatedAt`
- **Foreign Key**: `userId` -> `User.id` (One-to-One, CASCADE delete - deleting User deletes Agency)
- **Relations**:
  - One `Agency` has Many `Vehicle[]`
  - One `Agency` has Many `Booking[]`

---

### 3. Vehicle
*Tenant-Isolated Fleet Inventory*
All vehicles belong to exactly one agency, ensuring strict data segregation.
- **Primary Key**: `id` (UUID, auto-generated via `uuid()`)
- **Unique Constraint**: `registrationNumber` (unique across entire platform to prevent duplicates)
- **Core Fields**:
  - Details: `make`, `model`, `year`
  - Pricing & Status: `pricePerDay` (daily rate in MAD), `category` (uses `Category` enum, default `SEDAN`), `status` (uses `VehicleStatus` enum, default `AVAILABLE`)
  - Features & Media: `features` (array of strings for amenities), `imageUrl` (vehicle photo)
  - Timestamps for `createdAt` and `updatedAt`
- **Foreign Key**: `agencyId` -> `Agency.id` (Many-to-One, CASCADE delete - deleting Agency deletes its Vehicles)
- **Relations**:
  - One `Vehicle` has Many `Booking[]`

---

### 4. Customer
*Tenant-Shared? No - Customer records are per booking, but model is global*
Stores customer details for rental history and communication.
- **Primary Key**: `id` (UUID, auto-generated via `uuid()`)
- **Core Fields**:
  - Personal info: `firstName`, `lastName`, `email`, `phone`
  - License: `licenseNumber` (optional)
  - Timestamps for `createdAt` and `updatedAt`
- **Relations**:
  - One `Customer` has Many `Booking[]`

---

### 5. Booking
*The Core Transaction Entity*
Links a Customer, a Vehicle, and an Agency together in a rental agreement, with status tracking.
- **Primary Key**: `id` (UUID, auto-generated via `uuid()`)
- **Core Fields**:
  - Rental Details: `startDate`, `endDate` (actual dates of the rental), `totalPrice` (calculated total cost)
  - Lifecycle: `status` (uses `BookingStatus` enum, default `PENDING`)
  - Timestamps for `createdAt` and `updatedAt`
- **Foreign Keys**:
  - `customerId` -> `Customer.id` (Many-to-One)
  - `vehicleId` -> `Vehicle.id` (Many-to-One)
  - `agencyId` -> `Agency.id` (Many-to-One, **IMPORTANT FOR TENANT ISOLATION**)

---

## Multi-Tenancy Strategy
The platform uses **Explicit Tenant ID** multi-tenancy (the most secure and straightforward approach for relational databases):
1. **Tenant Anchor**: `Agency` model is the single source of truth for a tenant
2. **Tenant Isolation**: Every business entity (`Vehicle`, `Booking`) has a mandatory `agencyId` foreign key that directly links to `Agency.id`
3. **Scoped Queries**: All application logic is enforced to filter queries by the current user's `agencyId` to ensure data privacy between agencies
4. **Cascading Deletes**: If an `Agency` is deleted, all its associated `Vehicle`s and `Booking`s are automatically deleted via `onDelete: Cascade` for clean data management
