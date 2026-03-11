# RIS-iPACX: Login Page

The Login page is the primary gateway to the RIS platform, enforcing strict authentication protocols.

## 1. Authentication Flow
- **Input**: Username and Password.
- **Backend Validation**: Passwords are hashed using BCrypt (Salt Rounds: 10).
- **JWT Issuance**: Upon successful validation, a JSON Web Token (JWT) is issued.

## 2. Session Configuration
- **Token Expiry**: 30 days (Configurable via `JWT_EXPIRES_IN`).
- **Secure Transport**: In the Advanced version, credentials are transmitted over an encrypted HTTPS tunnel.

## 3. Security Enhancements
- **Rate Limiting**: To prevent brute-force attacks, the login endpoint is restricted to 5 attempts per minute per IP.
- **Role Assignment**: User roles (Radiologist, Admin, etc.) are embedded within the JWT to control front-end routing.

---
*Documentation Version: 1.0 (Page-wise: Login)*
