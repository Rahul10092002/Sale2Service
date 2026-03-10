# Frontend Auth Integration Guide

This guide explains how to integrate the backend authentication APIs into your frontend application. It covers endpoints, request payloads, expected responses, validation rules, client flows (email/password + Google Sign-In), token handling, and common error handling.

Base URL (local):

- `http://localhost:5000/v1`

Headers used by protected endpoints:

- `Authorization: Bearer <JWT_TOKEN>`
- `Content-Type: application/json`

---

**Quick rules**

- The frontend must never send `shop_id`. The backend resolves `shop_id` from the JWT.
- Store JWT securely: prefer `httpOnly` cookie for production; for SPAs, use secure storage with care (see Token Storage below).
- All destructive operations are soft deletes (`deleted_at`).

---

## Endpoints, Payloads & Responses

Each endpoint below includes: URL, HTTP method, request payload, success response example, and common validation errors.

### 1) Shop Owner Signup (Create Shop)

- Endpoint: `POST /v1/auth/signup-owner`
- Purpose: Create a new Shop + Owner user and return JWT

Request payload (JSON):

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

Validation rules (frontend should validate before sending):

- `owner_name`: required, min 2 characters
- `email`: required, valid email format
- `phone`: required, digits only, length 8-15
- `password`: required, min 8, at least one uppercase, one lowercase, one digit, one special char
- `shop_name`: required, min 2
- `business_type`: optional

Success response (201):

```json
{
  "success": true,
  "message": "Shop created successfully",
  "data": {
    "user_id": "<owner_id>",
    "shop_id": "<shop_id>",
    "role": "OWNER",
    "token": "<jwt_token>"
  }
}
```

Common error responses:

- 400 `INVALID_REQUEST` – missing fields or invalid format
- 400 `SIGNUP_FAILED` – email already registered

Frontend notes:

- On success, store the token and redirect to dashboard.
- After signup, backend issues JWT containing `userId`, `shopId`, `role`.

---

### 2) Login (Email or Phone)

- Endpoint: `POST /v1/auth/login`
- Purpose: Authenticate user by email or phone and password

Request payload (JSON):

```json
{
  "email_or_phone": "rahul@gmail.com",
  "password": "StrongPassword@123"
}
```

Validation rules:

- `email_or_phone`: required; validate as email OR phone pattern
- `password`: required

Success response (200):

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "<jwt_token>",
    "user": {
      "id": "<user_id>",
      "name": "Rahul",
      "role": "OWNER",
      "shop_id": "<shop_id>"
    }
  }
}
```

Common error responses:

- 400 `INVALID_REQUEST` – missing fields
- 401 `LOGIN_FAILED` – invalid credentials

Frontend notes:

- Save the returned JWT and the minimal user info (id, name, role, shop_id) in app state.
- Always attach `Authorization: Bearer <token>` when calling protected endpoints.

---

### 3) Google Login (ID Token)

- Endpoint: `POST /v1/auth/google`
- Purpose: Accept Google ID token (from Google Identity Services) and return JWT if user exists

Request payload (JSON):

```json
{ "id_token": "<google_id_token>" }
```

Frontend steps to obtain `id_token` (recommended):

- Use Google Identity Services (GIS) `google.accounts.id.initialize` + `google.accounts.id.prompt` or the One Tap / SignIn button.
- After successful sign-in, GIS returns an `id_token` which you POST to backend.

Validation rules:

- `id_token`: required

Success response (200):

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "<jwt_token>",
    "user": {
      "id": "<user_id>",
      "name": "User Name",
      "role": "STAFF|ADMIN|OWNER",
      "shop_id": "<shop_id>"
    }
  }
}
```

Common error responses:

- 400 `INVALID_REQUEST` – missing `id_token`
- 401 `GOOGLE_LOGIN_FAILED` – invalid token, or user not found (if not registered yet)

Flow notes:

- If user not found, frontend may prompt the user to contact admin or use a `signup-google-user` flow (if your product allows self-signup into a shop).

---

### 4) Google Signup (Owner) — Create Shop via Google

- Endpoint: `POST /v1/auth/signup-owner-google`
- Purpose: Create shop & owner using Google `id_token` (backend verifies token and creates owner account)

Request payload (JSON):

```json
{
  "id_token": "<google_id_token>",
  "shop_name": "Patidar Power Solutions",
  "business_type": "Battery & Inverter",
  "phone": "9876543210" // optional; GIS may provide phone
}
```

Validation rules:

- `id_token`: required
- `shop_name`: required

Success response (201): same shape as standard signup-owner response with token.

Common error responses:

- 400 `GOOGLE_SIGNUP_FAILED` – token invalid or email already registered

Frontend notes:

- Use GIS to get `id_token` then call this endpoint.

---

### 5) Google Signup User (Existing Shop)

- Endpoint: `POST /v1/auth/signup-google-user`
- Purpose: Create a staff/admin user in an existing shop by verifying a Google `id_token`.

Request payload (JSON):

```json
{
  "id_token": "<google_id_token>",
  "shop_id": "<shop_id>",
  "role": "STAFF" // optional, default STAFF
}
```

Validation rules:

- `id_token`: required
- `shop_id`: required
- `role`: optional, must be `STAFF` or `ADMIN`

Success response (201):

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user_id": "<user_id>",
    "temporary_password": "<temp_password>",
    "name": "User Name",
    "email": "user@example.com",
    "role": "STAFF"
  }
}
```

Common error responses:

- 400 `GOOGLE_SIGNUP_USER_FAILED` – invalid token, missing shop, or already exists

Frontend notes:

- This endpoint is useful for invitation flows where the backend or admin shares `shop_id` with the invited user, but prefer invitation tokens rather than raw `shop_id` in production.

---

## Token Structure & Expiry

- JWT payload includes: `userId`, `shopId`, `role`.
- Tokens expire in 7 days by default.
- The backend currently does not implement refresh tokens in this implementation; consider adding refresh-token endpoints and rotating tokens for production.

## Token Storage Recommendations (Frontend)

- Best (recommended for web apps with a server): store JWT in a `httpOnly`, `Secure`, `SameSite` cookie set by backend.
- For pure SPA clients: store in memory or `sessionStorage` to reduce XSS risk; if using `localStorage`, be aware of XSS attacks.
- Always use HTTPS in production.

## Typical Frontend Code Examples

Fetch example (login):

```javascript
// Email/password login
async function login(emailOrPhone, password) {
  const resp = await fetch("/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email_or_phone: emailOrPhone, password }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.message || "Login failed");
  // Save token and user info
  const { token, user } = data.data;
  // store token in app state  (or cookie via backend)
}
```

Axios example (protected request):

```javascript
import axios from "axios";

axios.defaults.baseURL = "http://localhost:5000/v1";
axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

const profile = await axios.get("/shop/profile");
```

Google Sign-In flow (client side, short):

1. Add GIS script in HTML:

```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

2. Initialize GIS in your JS:

```javascript
/*
  GOOGLE_CLIENT_ID from your Google Cloud console
*/
window.onload = () => {
  google.accounts.id.initialize({
    client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
    callback: handleCredentialResponse,
  });
  google.accounts.id.renderButton(document.getElementById("googleSignInBtn"), {
    theme: "outline",
    size: "large",
  });
};

async function handleCredentialResponse(response) {
  // response.credential is the id_token
  const idToken = response.credential;
  // Send idToken to your backend
  const resp = await fetch("/v1/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken }),
  });
  const data = await resp.json();
  if (!resp.ok) console.error(data);
  else {
    // Save backend-issued JWT
    const token = data.data.token;
  }
}
```

## Client-side Validation Patterns

- Email: RFC-compliant regex or simple `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Phone: `/^[0-9]{8,15}$/`
- Password policy suggestion (example):
  - Min 8 characters
  - At least 1 uppercase: `[A-Z]`
  - At least 1 lowercase: `[a-z]`
  - At least 1 digit: `[0-9]`
  - At least 1 special char: `[!@#$%^&*]`

Example validation function:

```javascript
function validatePassword(p) {
  return /(?=.{8,})(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(p);
}
```

## Error Handling & UX

- Handle 401 by redirecting to login and optionally showing a message "Session expired".
- On 403 (`FORBIDDEN`): show "Access denied" and disable actions in UI.
- Surface backend `message` to users for friendly errors; log `error_code` for diagnostics.

## Logout

- Remove stored token from client storage.
- Optionally call backend endpoint to revoke refresh tokens (not implemented here).

## Security Considerations

- Do not store sensitive data in localStorage in production without considering XSS risks.
- Prefer `httpOnly` cookies set by the server for session tokens.
- Use CSP and other mitigations to reduce XSS risk.
- Use HTTPS in production.

## Developer Tips

- Use the Postman collection to test endpoints quickly (see `Postman_Collection.json`).
- For Google Sign-In testing, create OAuth credentials in Google Cloud and set `Authorized JavaScript origins` to your dev origin.
- For invitation flows, consider issuing one-time invite tokens instead of exposing raw `shop_id`.

## Quick cURL Examples

Signup owner (email/password):

```bash
curl -X POST http://localhost:5000/v1/auth/signup-owner \
  -H "Content-Type: application/json" \
  -d '{"owner_name":"Rahul","email":"rahul@gmail.com","phone":"9876543210","password":"Strong@123","shop_name":"Patidar"}'
```

Login (email):

```bash
curl -X POST http://localhost:5000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email_or_phone":"rahul@gmail.com","password":"Strong@123"}'
```

Google login (send id_token):

```bash
curl -X POST http://localhost:5000/v1/auth/google \
  -H "Content-Type: application/json" \
  -d '{"id_token":"<google_id_token>"}'
```

## Next steps & extensions for production

- Add a `refresh token` flow (rotate refresh token & store it in a secure cookie).
- Implement email verification for accounts created via email/password.
- Add rate limiting for login endpoints.
- Add server-side input validation (e.g., Joi) and detailed error shapes.
- Implement invitation tokens for safer invite flows.

---

If you want, I can:

- Add ready-to-paste React form components for signup/login + Google button.
- Add client-side validation utilities in TypeScript.
- Add an example `httpOnly` cookie setup for JWT in the backend.
