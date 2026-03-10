# 📘 Warranty & Sales Management System - Backend API

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (v6 or higher)

### Installation

1. **Install dependencies:**

```bash
cd backend
npm install
```

2. **Configure environment:**

```bash
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
```

3. **Start MongoDB** (if running locally):

```bash
mongod
```

4. **Start the server:**

```bash
npm start
# or for development
npm run dev
```

Server will run on: `http://localhost:5000`

---

## 📋 API Endpoints

### Base URL

```
http://localhost:5000/v1
```

### Standard Response Format

**✅ Success Response:**

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

**❌ Error Response:**

```json
{
  "success": false,
  "message": "Error description",
  "error_code": "ERROR_CODE"
}
```

---

## 🔐 1. Authentication APIs

### 1.1 Shop Owner Signup

**Creates a new shop with owner user**

**Endpoint:** `POST /v1/auth/signup-owner`

**Request Body:**

```json
{
  "owner_name": "Rahul Patidar",
  "email": "rahul@gmail.com",
  "phone": "9876543210",
  "password": "StrongPassword@123",
  "shop_name": "Patidar Power Solutions",
  "business_type": "Battery & Inverter"
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Shop created successfully",
  "data": {
    "user_id": "usr_123",
    "shop_id": "shop_456",
    "role": "OWNER",
    "token": "jwt_token_here"
  }
}
```

---

### 1.2 Login

**Login with email or phone**

**Endpoint:** `POST /v1/auth/login`

**Request Body:**

```json
{
  "email_or_phone": "rahul@gmail.com",
  "password": "StrongPassword@123"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt_token",
    "user": {
      "id": "usr_123",
      "name": "Rahul",
      "role": "OWNER",
      "shop_id": "shop_456"
    }
  }
}
```

---

## 🏪 2. Shop Management APIs

**All shop endpoints require authentication:**

```
Authorization: Bearer <JWT_TOKEN>
```

### 2.1 Get Shop Profile

**Get current shop details**

**Endpoint:** `GET /v1/shop/profile`

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "shop_id": "shop_456",
    "shop_name": "Patidar Power Solutions",
    "business_type": "Battery & Inverter",
    "address": "Indore, MP",
    "phone": "9876543210",
    "gst_number": "23ABCDE1234F1Z5",
    "timezone": "Asia/Kolkata",
    "logo_url": "https://cdn.example.com/logo.png"
  }
}
```

---

### 2.2 Update Shop Profile

**Update shop details (OWNER only)**

**Endpoint:** `PUT /v1/shop/profile`

**Headers:**

```
Authorization: Bearer <owner_token>
```

**Request Body:**

```json
{
  "shop_name": "Patidar Energy Solutions",
  "address": "Vijay Nagar, Indore",
  "phone": "9999999999",
  "gst_number": "23ABCDE1234F1Z5",
  "timezone": "Asia/Kolkata",
  "logo_url": "https://cdn.example.com/new-logo.png"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Shop profile updated successfully",
  "data": {
    "shop_id": "shop_456",
    "shop_name": "Patidar Energy Solutions",
    "address": "Vijay Nagar, Indore",
    "phone": "9999999999",
    "gst_number": "23ABCDE1234F1Z5",
    "timezone": "Asia/Kolkata"
  }
}
```

---

## 👥 3. User Management APIs

**All endpoints require authentication**

### 3.1 Add Staff/Admin

**Add new user to shop (OWNER and ADMIN only)**

**Endpoint:** `POST /v1/users`

**Headers:**

```
Authorization: Bearer <owner_or_admin_token>
```

**Request Body:**

```json
{
  "name": "Amit Sharma",
  "email": "amit@gmail.com",
  "phone": "8888888888",
  "role": "STAFF"
}
```

**Note:** Role can be `STAFF` or `ADMIN`. OWNER can add both, ADMIN can only add STAFF.

**Response (201):**

```json
{
  "success": true,
  "message": "User added successfully",
  "data": {
    "user_id": "usr_789",
    "name": "Amit Sharma",
    "email": "amit@gmail.com",
    "role": "STAFF",
    "temporary_password": "Temp@a1b2c3d4"
  }
}
```

---

### 3.2 List All Users

**Get all users in the shop**

**Endpoint:** `GET /v1/users`

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "usr_123",
      "name": "Rahul Patidar",
      "email": "rahul@gmail.com",
      "phone": "9876543210",
      "role": "OWNER",
      "created_at": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": "usr_789",
      "name": "Amit Sharma",
      "email": "amit@gmail.com",
      "phone": "8888888888",
      "role": "STAFF",
      "created_at": "2024-01-16T14:20:00.000Z"
    }
  ]
}
```

---

### 3.3 Get User By ID

**Get specific user details**

**Endpoint:** `GET /v1/users/:id`

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "usr_789",
    "name": "Amit Sharma",
    "email": "amit@gmail.com",
    "phone": "8888888888",
    "role": "STAFF",
    "shop_id": "shop_456",
    "created_at": "2024-01-16T14:20:00.000Z"
  }
}
```

---

### 3.4 Delete User

**Soft delete user (OWNER and ADMIN only)**

**Endpoint:** `DELETE /v1/users/:id`

**Headers:**

```
Authorization: Bearer <owner_or_admin_token>
```

**Response (200):**

```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Notes:**

- Cannot delete OWNER
- ADMIN cannot delete other ADMINs

---

## 🔒 Security Features

### 🎯 Key Security Principles

1. **JWT Authentication**
   - All protected routes require JWT token
   - Token expires in 7 days
   - Token contains: userId, shopId, role

2. **Role-Based Access Control**
   - **OWNER**: Full access (create shop, manage all users, update shop)
   - **ADMIN**: Manage staff, view shop details
   - **STAFF**: View shop details, view users

3. **Shop Isolation**
   - ✅ Backend automatically filters by shop_id from JWT
   - ❌ Frontend NEVER sends shop_id
   - 🔒 Users can only access data from their own shop

4. **Soft Delete**
   - All deletions are soft deletes (sets `deleted_at` field)
   - Data remains in database for audit purposes
   - Queries automatically exclude soft-deleted records

5. **Password Security**
   - Passwords hashed using bcrypt (10 salt rounds)
   - Temporary passwords auto-generated for new users
   - Passwords never included in API responses

---

## 🧪 Testing the API

### Using cURL

**1. Signup Owner:**

```bash
curl -X POST http://localhost:5000/v1/auth/signup-owner \
  -H "Content-Type: application/json" \
  -d '{
    "owner_name": "Rahul Patidar",
    "email": "rahul@gmail.com",
    "phone": "9876543210",
    "password": "StrongPassword@123",
    "shop_name": "Patidar Power Solutions",
    "business_type": "Battery & Inverter"
  }'
```

**2. Login:**

```bash
curl -X POST http://localhost:5000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email_or_phone": "rahul@gmail.com",
    "password": "StrongPassword@123"
  }'
```

**3. Get Shop Profile (use token from login):**

```bash
curl -X GET http://localhost:5000/v1/shop/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**4. Add Staff:**

```bash
curl -X POST http://localhost:5000/v1/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Amit Sharma",
    "email": "amit@gmail.com",
    "phone": "8888888888",
    "role": "STAFF"
  }'
```

---

## 📁 Project Structure

```
backend/
├── index.js                 # Main entry point
├── package.json            # Dependencies
├── .env.example           # Environment template
├── config/
│   ├── express.js        # Express config (future)
│   └── mongoose.js       # MongoDB connection
├── models/
│   ├── User.js          # User model with bcrypt
│   └── Shop.js          # Shop model
├── controllers/
│   ├── authController.js    # Auth endpoints
│   ├── shopController.js    # Shop endpoints
│   └── userController.js    # User management
├── service/
│   ├── authService.js       # Auth business logic
│   ├── shopService.js       # Shop business logic
│   └── userService.js       # User business logic
├── middleware/
│   └── auth.js             # JWT & RBAC middleware
└── routes/
    ├── auth.js             # Auth routes
    ├── shop.js             # Shop routes
    └── user.js             # User routes
```

---

## 🔑 Environment Variables

Create a `.env` file in the backend directory:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/warranty_sales_db
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this-in-production
```

**Generate secure JWT secret:**

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## ❌ Common Error Codes

| Error Code             | Description                  |
| ---------------------- | ---------------------------- |
| `UNAUTHORIZED`         | Missing or invalid JWT token |
| `FORBIDDEN`            | Insufficient permissions     |
| `INVALID_REQUEST`      | Missing required fields      |
| `SIGNUP_FAILED`        | Shop/user creation failed    |
| `LOGIN_FAILED`         | Invalid credentials          |
| `SHOP_NOT_FOUND`       | Shop doesn't exist           |
| `USER_NOT_FOUND`       | User doesn't exist           |
| `USER_CREATION_FAILED` | Error creating user          |
| `DELETE_FAILED`        | Error deleting user          |
| `UPDATE_FAILED`        | Error updating resource      |

---

## 🎓 For Beginners

### Understanding the Flow

1. **Shop Creation:**
   - Owner signs up → Creates Shop + Owner User
   - Returns JWT token for authentication

2. **Adding Users:**
   - OWNER/ADMIN adds staff
   - System generates temporary password
   - Staff logs in with temp password

3. **Data Isolation:**
   - JWT contains shop_id
   - All queries filtered by shop_id
   - Users only see their shop's data

4. **Role Hierarchy:**
   ```
   OWNER (Full Control)
     └── ADMIN (Manage Staff)
          └── STAFF (View Only)
   ```

---

## 🚀 Next Steps

After testing these APIs, you can implement:

- Password reset functionality
- Email notifications for new users
- Customer management
- Product/inventory management
- Warranty tracking
- Sales records
- Invoice generation
- Reports and analytics

---

## 📝 License

This project is for educational purposes.

---

## 💡 Tips

1. Always use HTTPS in production
2. Store JWT tokens securely (httpOnly cookies recommended)
3. Implement rate limiting
4. Add request validation middleware
5. Set up logging (Winston/Morgan)
6. Add API documentation (Swagger)
7. Implement refresh tokens for better security

---

**Built with ❤️ using Node.js, Express & MongoDB**
