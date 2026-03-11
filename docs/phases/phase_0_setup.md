# Advanced RIS-iPACX: Setup & Environment Configuration

This guide covers the initial setup of the **Advanced RIS-iPACX** environment, focusing on isolation, security, and medical-grade standards.

## 1. Workspace Isolation
The project has been migrated to `/home/jags/RIS_ADVANCED` to separate development from the legacy `RIS` folder. This environment is "lean", with unnecessary binary files and deep dependencies excluded to maintain a high-performance development lifecycle.

## 2. Dedicated Database Configuration
A separate PostgreSQL database has been created to ensure data sovereignty and environmental isolation.

- **DB Name**: `ris_advanced_db`
- **Owner**: `ipacx`
- **Configuration**: Managed via `risbackend/.env`

### Connecting to the Advanced DB
```bash
PGPASSWORD='xcap1' psql -h localhost -U ipacx -d ris_advanced_db
```

## 3. Security Hardening Phase 1: SSL/TLS
In this version, HTTPS is **mandatory** for all communications.

### SSL Certificates
- **Key**: `/home/jags/RIS_ADVANCED/key.pem`
- **Certificate**: `/home/jags/RIS_ADVANCED/cert.pem`

### Environment Flags
| Key | Value | Description |
|-----|-------|-------------|
| `NODE_ENV` | `production` | Force secure optimizations |
| `DATABASE_URL` | `postgresql://...` | Connection to isolated DB |
| `JWT_SECRET` | `xcap1@` | Secure token signing key |

## 4. Initialization Script
To initialize the advanced environment from scratch, run the following sequence:

1. **Install Dependencies**: `npm install` in both `risfrontend` and `risbackend`.
2. **Postgres Setup**: Run migrations in `migrations/` and `risbackend/migrations/`.
3. **Start Servers**: Use `npm run dev` for backend and frontend.

---
*Documentation Version: 1.0 (Advanced Phase)*
