# Users Module

## Purpose

Manages internal M & P Shelter staff accounts.

There is no public staff registration. Staff accounts are created by an
ADMIN.

## Endpoint

### POST /api/users

Creates a new staff account.

#### Access

ADMIN only.

#### Middleware

authenticate
→ authorizeRoles("ADMIN")

#### Request Fields

Required:

- role
- firstName
- lastName
- email
- password

Optional:

- middleInitial
- contactNumber

#### Allowed Roles

- ADMIN
- VOLUNTEER
- CARETAKER

The API receives the role name instead of a database role ID.

The service looks up the corresponding role_id before inserting the user.

## Validation

### Names

- firstName is required.
- lastName is required.
- middleInitial is optional.
- Names are trimmed.
- Database length limits are enforced.

### Email

- Required.
- Must be a valid email format.
- Trimmed and converted to lowercase.
- Must be unique.

### Password

- Required.
- Minimum 8 characters.
- Must contain an uppercase letter.
- Must contain a number.
- Must contain a special character.
- Password value is not normalized or modified before hashing.

### Contact Number

- Optional.
- Trimmed.
- Supports reasonable phone-number formats.

## Create User Flow

POST /api/users
→ authenticate
→ authorizeRoles("ADMIN")
→ createUserController
→ createUser service
→ validateCreateUserInput
→ check duplicate email
→ find role by name
→ hash password with bcrypt
→ insertUser repository
→ PostgreSQL
→ return safe user information

## Repository Functions

Current user repository functions include:

- findUserByEmail(email)
- findUserById(userId)
- findRoleByName(roleName)
- insertUser(userData)

## API Response Format

Database fields use snake_case internally.

API responses use camelCase.

Example:

```json
{
  "success": true,
  "user": {
    "userId": "...",
    "firstName": "Maria",
    "middleInitial": "L",
    "lastName": "Santos",
    "email": "maria.santos@example.com",
    "contactNumber": "09171234567",
    "isActive": true,
    "role": "VOLUNTEER"
  }
}
