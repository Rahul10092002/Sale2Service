# 🚀 Warranty & Sales Management System - Backend

A complete Node.js/Express backend API for managing shops, users, warranties, and sales.

## ✨ Features

- 🔐 **JWT Authentication** - Secure token-based authentication
- 👥 **Role-Based Access Control** - OWNER, ADMIN, STAFF roles
- 🏪 **Shop Management** - Multi-shop support with data isolation
- 👤 **User Management** - Add, view, and manage shop users
- 🔒 **Security First** - Password hashing, soft deletes, shop isolation
- 📝 **Clean Architecture** - MVC pattern with service layer

## 🛠️ Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Bcrypt** - Password hashing

## 📋 Prerequisites

Before you begin, ensure you have:

- Node.js v18+ installed
- MongoDB v6+ installed and running
- npm or yarn package manager

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your configuration
# MONGODB_URI=mongodb://localhost:27017/warranty_sales_db
# JWT_SECRET_KEY=your-secret-key
```

### 3. Start MongoDB

```bash
# Make sure MongoDB is running
mongod
```

### 4. Start Server

```bash
# Production
npm start

# Development
npm run dev
```

Server will be available at: `http://localhost:5000`

## 📚 API Documentation

Complete API documentation is available in [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

### Quick API Overview

#### Authentication

- `POST /v1/auth/signup-owner` - Create shop with owner
- `POST /v1/auth/login` - Login with email/phone

#### Shop Management (Protected)

- `GET /v1/shop/profile` - Get shop details
- `PUT /v1/shop/profile` - Update shop (Owner only)

#### User Management (Protected)

- `POST /v1/users` - Add staff/admin
- `GET /v1/users` - List all users
- `GET /v1/users/:id` - Get user by ID
- `DELETE /v1/users/:id` - Delete user

## 🧪 Testing

### Using Postman

Import the [Postman_Collection.json](./Postman_Collection.json) file into Postman for easy testing.

### Using cURL

**Signup:**

```bash
curl -X POST http://localhost:5000/v1/auth/signup-owner \
  -H "Content-Type: application/json" \
  -d '{
    "owner_name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "password": "SecurePass@123",
    "shop_name": "My Shop",
    "business_type": "Retail"
  }'
```

**Login:**

```bash
curl -X POST http://localhost:5000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email_or_phone": "john@example.com",
    "password": "SecurePass@123"
  }'
```

## 📁 Project Structure

```
backend/
├── index.js                    # Application entry point
├── package.json               # Dependencies
├── .env.example              # Environment template
├── API_DOCUMENTATION.md      # Complete API docs
├── Postman_Collection.json   # Postman test collection
├── config/
│   └── mongoose.js          # Database connection
├── models/
│   ├── User.js             # User model
│   └── Shop.js             # Shop model
├── controllers/
│   ├── authController.js   # Auth endpoints
│   ├── shopController.js   # Shop endpoints
│   └── userController.js   # User management
├── service/
│   ├── authService.js      # Auth business logic
│   ├── shopService.js      # Shop business logic
│   └── userService.js      # User business logic
├── middleware/
│   └── auth.js            # JWT & RBAC middleware
└── routes/
    ├── auth.js            # Auth routes
    ├── shop.js            # Shop routes
    └── user.js            # User routes
```

## 🔐 Security Features

- **JWT Authentication** - Token-based auth with 7-day expiry
- **Password Hashing** - Bcrypt with 10 salt rounds
- **Role-Based Access** - OWNER > ADMIN > STAFF hierarchy
- **Shop Isolation** - Automatic filtering by shop_id from JWT
- **Soft Deletes** - Data retention for audit purposes
- **Input Validation** - Request validation at controller level

## 👥 User Roles

| Role      | Permissions                                                       |
| --------- | ----------------------------------------------------------------- |
| **OWNER** | Full access - Create shop, manage all users, update shop settings |
| **ADMIN** | Manage staff users, view shop details                             |
| **STAFF** | View shop details and users (read-only)                           |

## 🔑 Environment Variables

```env
PORT=5000                              # Server port
NODE_ENV=development                   # Environment
MONGODB_URI=mongodb://localhost:27017/db  # MongoDB connection
JWT_SECRET_KEY=your-secret-key        # JWT signing key
```

**Generate a secure JWT secret:**

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 📊 Database Models

### User Model

- name, email, phone, password (hashed)
- role (OWNER/ADMIN/STAFF)
- shop_id (reference to Shop)
- deleted_at (soft delete)

### Shop Model

- shop_name, business_type
- address, phone, gst_number
- timezone, logo_url
- deleted_at (soft delete)

## 🎯 Key Design Principles

1. **Shop Isolation** - Frontend never sends shop_id, backend resolves from JWT
2. **Soft Deletes** - All deletions set `deleted_at` timestamp
3. **Role Hierarchy** - Strict role-based permission enforcement
4. **Security First** - All sensitive data encrypted/hashed

## 🐛 Error Handling

All errors follow standard format:

```json
{
  "success": false,
  "message": "Error description",
  "error_code": "ERROR_CODE"
}
```

Common error codes:

- `UNAUTHORIZED` - Invalid/missing token
- `FORBIDDEN` - Insufficient permissions
- `INVALID_REQUEST` - Missing required fields
- `LOGIN_FAILED` - Invalid credentials

## 📝 Scripts

```bash
npm start       # Start production server
npm run dev     # Start development server
npm test        # Run tests (to be implemented)
```

## 🚧 Future Enhancements

- [ ] Customer management
- [ ] Product/inventory tracking
- [ ] Warranty management
- [ ] Sales records
- [ ] Invoice generation
- [ ] Email notifications
- [ ] Password reset
- [ ] Refresh tokens
- [ ] Rate limiting
- [ ] API documentation (Swagger)
- [ ] Unit & integration tests

## 📄 License

This project is for educational purposes.

## 🤝 Contributing

Contributions welcome! Please follow the existing code structure and patterns.

## 💬 Support

For questions or issues:

1. Check [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
2. Review existing code patterns
3. Open an issue for bugs

---

**Built with ❤️ using Node.js, Express & MongoDB**
