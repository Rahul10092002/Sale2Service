# Invoice API Documentation

## Overview

The Invoice API provides comprehensive invoice management with customer tracking and product-level warranty management. Each invoice creates customer entries (if not existing), product entries with serial number tracking, and maintains warranty information.

## Base URL

```
/v1/invoices
```

## Authentication

All endpoints require authentication via Bearer token in the Authorization header.

## Endpoints

### 1. Create Invoice

**POST** `/v1/invoices`

Creates a new invoice with customer and product tracking.

#### Request Body

```json
{
  "customer": {
    "full_name": "John Doe",
    "whatsapp_number": "+919876543210",
    "email": "john@example.com",
    "alternate_phone": "+919876543211",
    "customer_type": "RETAIL",
    "gst_number": "29ABCDE1234F1Z5",
    "notes": "VIP Customer",
    "address": {
      "line1": "123 Main Street",
      "line2": "Near Park",
      "city": "Bangalore",
      "state": "Karnataka",
      "pincode": "560001"
    }
  },
  "invoice": {
    "invoice_date": "2026-01-26",
    "payment_status": "PAID",
    "payment_mode": "CASH",
    "discount": 100,
    "notes": "Test invoice"
  },
  "invoice_items": [
    {
      "serial_number": "BAT12345",
      "product_name": "Exide Battery 150Ah",
      "product_category": "BATTERY",
      "company": "Exide",
      "model_number": "EI150",
      "selling_price": 15000,
      "cost_price": 12000,
      "quantity": 1,
      "warranty_type": "STANDARD",
      "warranty_start_date": "2026-01-26",
      "warranty_duration_months": 12,
      "capacity_rating": "150Ah",
      "voltage": "12V",
      "batch_number": "BATCH001",
      "manufacturing_date": "2025-12-01"
    }
  ]
}
```

#### Response

```json
{
  "success": true,
  "message": "Invoice created successfully",
  "data": {
    "invoice": {
      "invoice_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "invoice_number": "INV-2026-0001",
      "customer_id": "64f1a2b3c4d5e6f7a8b9c0d2",
      "shop_id": "64f1a2b3c4d5e6f7a8b9c0d3",
      "invoice_date": "2026-01-26T00:00:00.000Z",
      "payment_status": "PAID",
      "payment_mode": "CASH",
      "subtotal": 23000,
      "discount": 100,
      "tax": 4122,
      "total_amount": 27022,
      "created_by": "64f1a2b3c4d5e6f7a8b9c0d4",
      "customer_id": {
        "full_name": "John Doe",
        "whatsapp_number": "+919876543210"
      }
    },
    "invoice_items": [...],
    "invoice_number": "INV-2026-0001",
    "total_amount": 27022
  }
}
```

### 2. Get All Invoices

**GET** `/v1/invoices?page=1&limit=10&search=John&payment_status=PAID`

#### Query Parameters

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by customer name, phone, or invoice number
- `payment_status` (optional): Filter by payment status

#### Response

```json
{
  "success": true,
  "data": {
    "invoices": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "pages": 5
    }
  }
}
```

### 3. Get Invoice by ID

**GET** `/v1/invoices/:id`

#### Response

```json
{
  "success": true,
  "data": {
    "invoice": {...},
    "invoice_items": [...]
  }
}
```

### 4. Get Next Invoice Number

**GET** `/v1/invoices/next-number`

#### Response

```json
{
  "success": true,
  "data": {
    "invoice_number": "INV-2026-0025",
    "year": 2026,
    "sequence": 25
  }
}
```

### 5. Check Serial Number

**POST** `/v1/invoices/check-serial`

#### Request Body

```json
{
  "serial_number": "BAT12345"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "exists": true,
    "serial_number": "BAT12345",
    "product": {...} // Product details if exists
  }
}
```

### 6. Search Customer

**POST** `/v1/invoices/search-customer`

#### Request Body

```json
{
  "whatsapp_number": "+919876543210"
}
```

#### Response

```json
{
  "success": true,
  "message": "Customer found",
  "data": {
    "customer": {...}
  }
}
```

### 7. Search by Serial Number

**GET** `/v1/invoices/search/serial/:serial_number`

#### Response

```json
{
  "success": true,
  "data": {
    // Product details with invoice and customer information
    "invoice_item_id": "...",
    "serial_number": "BAT12345",
    "product_name": "Exide Battery 150Ah",
    "warranty_end_date": "2027-01-26",
    "invoice_id": {
      "invoice_number": "INV-2026-0001",
      "customer_id": {
        "full_name": "John Doe",
        "whatsapp_number": "+919876543210"
      }
    }
  }
}
```

## Data Models

### Customer Model

- Automatically created/updated based on WhatsApp number
- Stores complete address and contact information
- Supports business customers with GST details

### Invoice Model

- Links to customer and shop
- Tracks payment status and modes
- Calculates totals automatically
- Supports attachments and notes

### Invoice Item Model

- Product-level tracking with unique serial numbers
- Complete warranty information
- Metadata for product specifications
- Status tracking for service management

## Key Features

1. **Customer Deduplication**: Customers are identified by WhatsApp number per shop
2. **Serial Number Uniqueness**: Each product has a unique serial number per shop
3. **Automatic Calculations**: Subtotal, tax, and total are calculated automatically
4. **Warranty Tracking**: Start and end dates calculated based on duration
5. **Future-Ready**: Models support service tracking and CRM features
6. **Search Capabilities**: Search by serial number, customer details, invoice number
7. **Pagination**: All list endpoints support pagination
8. **Transaction Safety**: Database transactions ensure data consistency

## Error Responses

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information (development only)"
}
```

## Status Codes

- 200: Success
- 201: Created successfully
- 400: Bad request / Validation error
- 404: Resource not found
- 500: Internal server error
