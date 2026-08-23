# Authentication Module

## Purpose

Handles authentication for internal M & P Shelter staff accounts.

Authentication uses a JWT stored in an HttpOnly cookie.

## Endpoints

### POST /api/auth/login

Authenticates a staff account.

#### Request

- email
- password

#### Flow

Route
→ Controller
→ Service
→ Validation
→ findUserByEmail()
→ bcrypt password comparison
→ active account check
→ generate JWT
→ set HttpOnly cookie

#### Success

- 200 OK

#### Errors

- 400 Bad Request - Invalid input
- 401 Unauthorized - Invalid email or password
- 403 Forbidden - Account is deactivated

---

### GET /api/auth/me

Returns the currently authenticated user.

#### Middleware

- authenticate

#### Flow

JWT cookie
→ verify token
→ get userId
→ find current user in database
→ check account is active
→ attach current user to req.user
→ controller returns req.user

#### Success

- 200 OK

#### Errors

- 401 Unauthorized - Missing, invalid, or expired token
- 403 Forbidden - Account is deactivated

---

### POST /api/auth/logout

Logs the current user out by clearing the authentication cookie.

#### Success

- 200 OK

## Authentication Middleware

The authenticate middleware:

1. Reads the JWT from the HttpOnly cookie.
2. Verifies the JWT.
3. Extracts the userId.
4. Loads the current user from PostgreSQL.
5. Checks whether the account still exists.
6. Checks whether the account is active.
7. Stores the current user in req.user.
8. Calls next().

The database lookup ensures role changes and account deactivation take
effect without waiting for an existing JWT to expire.

## Authorization

Role-based authorization is handled using:

authorizeRoles(...allowedRoles)

Current roles:

- ADMIN
- VOLUNTEER
- CARETAKER

### Status Codes

- 401 Unauthorized - User is not authenticated.
- 403 Forbidden - User is authenticated but does not have permission.

## Security

- Passwords are hashed using bcrypt.
- Plain-text passwords are never stored.
- JWT is stored in an HttpOnly cookie.
- The authentication cookie cannot be accessed by frontend JavaScript.
- Current account status and role are loaded from the database on
  protected requests.
- Internal server errors are not exposed directly to API clients.
