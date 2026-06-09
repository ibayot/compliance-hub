# Compliance Hub — Deployment Guide

> **Who this is for:** Someone who has never deployed this app before. You don't need to know how to code. You just need to be able to run commands in a terminal.

---

## What You Are Deploying

This is a web application called Compliance Hub. When you finish this guide, your server will be running:

- A **website** (the part users open in a browser)
- A **backend** (4 services that handle data and business logic)
- A **database** (MariaDB — where all data is stored)
- A **cache layer** (Redis — makes things faster)

Everything runs inside Docker containers. Think of Docker as a way to run the app in isolated boxes so you don't have to install Node.js, MariaDB, and Redis manually.

The source code is organized like this:
- Website code is in `frontend/`
- Backend code is in `backend/`
- Docker setup is in `docker-compose.yml`
- Database setup scripts are in `backend/database/`

---

## Before You Start

### What You Need to Install

Make sure these are installed on the server before you begin:

**1. Docker** — runs all the app's containers. Check if installed:
```bash
docker --version
```
You should see something like `Docker version 24.x.x`. If not installed, get it from https://docs.docker.com/engine/install/

**2. Docker Compose** — orchestrates the containers. Check:
```bash
docker compose version
```
You should see `Docker Compose version v2.x.x`. It comes bundled with Docker Desktop, or follow https://docs.docker.com/compose/install/

**3. Git** — downloads the code. Check:
```bash
git --version
```
If not installed, get it from https://git-scm.com/

### What Ports Need to Be Open on the Firewall

| Port | What It's For | Who Should Access It |
|---|---|---|
| **3000** | The website | Your users (open to the local network) |
| **4000** | API Gateway | The website calls this automatically |
| **4101** | Users Service | Internal only — no need to expose |
| **4102** | Ticketing Service | Internal only — no need to expose |
| **4103** | Compliance Service | Internal only — no need to expose |
| **3306** | Database | Internal only — no need to expose |
| **6379** | Cache | Internal only — no need to expose |

> For a typical intranet setup, you only need to open **port 3000** to end users. Everything else stays internal.

### What the Services Do

| Container Name | Role |
|---|---|
| `ricms_mariadb` | Database — stores everything |
| `ricms_redis` | Cache — makes the app faster |
| `ricms_users_service` | Handles login, users, and attendance |
| `ricms_ticketing_service` | Handles tickets and issue tracking |
| `ricms_compliance_service` | Handles documents, KPI, reviews, issuances |
| `ricms_api_gateway` | Routes requests between services — the main entry point |
| `ricms_frontend` | The website that users open in their browser |

---

## Deployment Steps

### Step 1 — Download the Code

Open a terminal on the server and run:

```bash
git clone <remote-url>
cd "Compliance Hub"
```

Replace `<remote-url>` with the Git URL your team provided for this repository. After this, you will be inside a folder called `Compliance Hub` which contains all the project files.

---

### Step 2 — Set Your Passwords and Configuration

This is the most important step for a real deployment. You need to change the default passwords to something secure.

Create a file named `.env` in the root folder of the project using a text editor.

Paste the following content into `.env` and fill in your own values:

```env
# ─────────────────────────────────────────────────────────────
# DATABASE PASSWORDS — change all of these
# ─────────────────────────────────────────────────────────────
MYSQL_ROOT_PASSWORD=change_this_to_a_strong_password
MYSQL_PASSWORD=change_this_to_a_strong_password
DB_PASSWORD=change_this_to_a_strong_password

# Database user and service DB names
DB_USERNAME=ricms_user
USERS_DB_DATABASE=compliance_hub_users
TICKETING_DB_DATABASE=compliance_hub_ticketing
COMPLIANCE_DB_DATABASE=compliance_hub

# ─────────────────────────────────────────────────────────────
# SECRET KEYS FOR LOGINS — generate unique random values (see below)
# ─────────────────────────────────────────────────────────────
JWT_SECRET=paste_a_long_random_string_here
JWT_REFRESH_SECRET=paste_a_different_long_random_string_here

# ─────────────────────────────────────────────────────────────
# YOUR SERVER'S ADDRESS — replace with your server's IP
# ─────────────────────────────────────────────────────────────
CORS_ORIGIN=http://YOUR_SERVER_IP:3000
NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:4000/api

# Gateway-to-service routing (Docker network hostnames)
USERS_SERVICE_URL=http://users-service:4101
TICKETING_SERVICE_URL=http://ticketing-service:4102
COMPLIANCE_SERVICE_URL=http://compliance-service:4103
```

**How to generate secure secret keys** — run this on any computer that has Node.js installed:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Run it twice. Use the first output for `JWT_SECRET` and the second for `JWT_REFRESH_SECRET`.

> **Example**: If your server IP is `192.168.1.50`, then set:
> `CORS_ORIGIN=http://192.168.1.50:3000`
> `NEXT_PUBLIC_API_URL=http://192.168.1.50:4000/api`

---

### Step 3 — Build the Application

This step packages all the code into Docker images. It will take a few minutes the first time (it's downloading and compiling things).

```bash
docker compose build
```

**You'll know it's finished when** the terminal returns to a prompt without any error messages. Warnings are usually fine; errors in red are not.

---

### Step 4 — Start the Database and Cache

The database and cache must be running first because everything else depends on them.

```bash
docker compose --profile microservices up -d mariadb redis
```

Wait about 30 seconds, then check they started correctly:

```bash
docker compose ps
```

**Look for:** `ricms_mariadb` and `ricms_redis` should show `healthy` in the STATUS column.

If they still show `starting`, wait another 30 seconds and run `docker compose ps` again. Do not continue until both are `healthy`.

---

### Step 5 — Set Up the Database *(First Time Only)*

This creates all the database tables and populates initial data. **You only need to do this once** on a brand new installation.

```bash
docker exec -i ricms_mariadb mysql -uroot -pYOUR_ROOT_PASSWORD < backend/database/microservices-migrate.sql
```

Replace `YOUR_ROOT_PASSWORD` with the `MYSQL_ROOT_PASSWORD` value you set in Step 2.

**You're done when:** The command finishes without printing `ERROR`. Some lines that say "Query OK" or warnings about views already existing are normal and fine.

**What this created:** Three databases — `compliance_hub`, `compliance_hub_users`, and `compliance_hub_ticketing` — with all the required tables and relationships between them.

---

### Step 6 — Start the Backend Services

```bash
docker compose --profile microservices up -d users-service ticketing-service compliance-service api-gateway
```

**What just happened:** Four backend services are now running. They handle all the logic — logins, documents, tickets, KPI, and so on.

---

### Step 7 — Start the Website

```bash
docker compose up -d frontend
```

**What just happened:** The website is now running. Users can open it in a browser.

---

### Step 8 — Restart the Backend Once

After the database was set up in Step 5, do a quick restart of the backend services so they fully connect:

```bash
docker compose --profile microservices restart users-service ticketing-service compliance-service api-gateway
```

This takes about 15–30 seconds.

---

### Step 9 — Confirm Everything is Working

**Check 1 — Health check:**
```bash
curl http://localhost:4000/api/health
```

You should see:
```json
{
  "status": "ok",
  "services": { "users": true, "ticketing": true, "compliance": true }
}
```
All three must say `true`. If any say `false`, that service didn't start correctly (see Troubleshooting below).

**Check 2 — Open the website:**

Open a browser and go to `http://YOUR_SERVER_IP:3000`

You should see the Compliance Hub login page.

**Default login credentials (change after first login!):**
- Email: `admin@rictms.gov.ph`
- Password: `password123`

> ⚠️ Go to Settings immediately after your first login and change the admin password.

---

## Updating the App (After First Deployment)

When a new version is released:

```bash
# 1. Get the latest code
git pull

# 2. Rebuild the images (takes a few minutes)
docker compose build

# 3. Run the migration (safe to run again — it won't break existing data)
docker exec -i ricms_mariadb mysql -uroot -pYOUR_ROOT_PASSWORD < backend/database/microservices-migrate.sql

# 4. Restart services
docker compose --profile microservices restart users-service ticketing-service compliance-service api-gateway
docker compose restart frontend
```

---

## Stopping the App

To stop everything (your data is preserved):

```bash
docker compose --profile microservices down
docker compose down
```

To start it again:
```bash
docker compose --profile microservices up -d mariadb redis
# Wait for both to be healthy, then:
docker compose --profile microservices up -d users-service ticketing-service compliance-service api-gateway
docker compose up -d frontend
```

---

## Configuration Reference

These are all the settings the app understands. Most are already configured in `docker-compose.yml`. You override them in the `.env` file you created in Step 2.

### Database Settings
| Setting | Default | What It Does |
|---|---|---|
| `MYSQL_ROOT_PASSWORD` | `ricms_password` | Password for the database admin account |
| `MYSQL_DATABASE` | `compliance_hub` | Main database name |
| `MYSQL_USER` | `ricms_user` | App's database username |
| `MYSQL_PASSWORD` | `ricms_password` | App's database password |

### Backend Settings
| Setting | Default | What It Does |
|---|---|---|
| `DB_HOST` | `mariadb` | Where the database is (Docker handles this automatically) |
| `DB_PORT` | `3306` | Database port |
| `DB_USERNAME` | `ricms_user` | Database username |
| `DB_PASSWORD` | `ricms_password` | **Change in production** |
| `USERS_DB_DATABASE` | `compliance_hub_users` | Database for user accounts |
| `TICKETING_DB_DATABASE` | `compliance_hub_ticketing` | Database for tickets |
| `COMPLIANCE_DB_DATABASE` | `compliance_hub` | Database for documents, KPI, etc. |
| `REDIS_HOST` | `redis` | Where the cache is (Docker handles this automatically) |
| `REDIS_PORT` | `6379` | Cache port |
| `JWT_SECRET` | *(dev default)* | **Must change in production** — used to sign login sessions |
| `JWT_REFRESH_SECRET` | *(dev default)* | **Must change in production** — used to renew sessions |
| `CORS_ORIGIN` | `http://localhost:3000` | The address of your website (set to your server IP) |

### Frontend Settings
| Setting | Default | What It Does |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api` | Where the website sends API requests (set to your server IP) |

---

## Troubleshooting

### "Port already in use" error

**You see:** `EADDRINUSE` in the logs, or `port is already allocated`

**Fix:**
1. Find what's using the port:
   ```bash
   # Linux/Mac:
   sudo lsof -i :3000
   # Windows:
   netstat -ano | findstr :3000
   ```
2. Kill that process or stop whatever is already running on that port.
3. Restart the affected container: `docker compose restart frontend`

---

### "Service currently unavailable" banner in the app

**You see:** A gray/red "Service Unavailable" panel in the browser.

**Fix:**
1. Check which containers are running:
   ```bash
   docker compose ps
   ```
2. Check the health endpoint to see which service is down:
   ```bash
   curl http://localhost:4000/api/health
   ```
3. Check the logs of the affected service (replace with the actual service name):
   ```bash
   docker compose logs compliance-service
   ```
4. Restart just that service:
   ```bash
   docker compose --profile microservices restart compliance-service
   ```

---

### Login says "Invalid credentials" or fails silently

**Fix:**
1. Confirm all services are healthy: `curl http://localhost:4000/api/health`
2. Check the users-service logs: `docker compose logs users-service`
3. Make sure Step 5 (database setup) completed successfully. If unsure, run it again — it's safe.

---

### The database migration shows errors

**Fix:**
- Make sure MariaDB is healthy before running the migration.
- Double-check the password you typed matches `MYSQL_ROOT_PASSWORD` in your `.env` file.
- If some errors say "table already exists" or "view already exists", that is normal on re-runs — ignore those.

---

## Rolling Back to a Previous Version

If something goes wrong after an update:

1. Stop everything:
   ```bash
   docker compose --profile microservices down
   docker compose down
   ```
2. Restore your database from a backup (always back up before updating!).
3. Go back to the previous version of the code:
   ```bash
   git log --oneline       # shows recent versions — find the one before the update
   git checkout <the-hash-from-the-log>
   ```
4. Rebuild and restart following Steps 3–9 above.

---

## Daily Operations Notes

- **Back up the database regularly.** All data lives in MariaDB. Use `docker exec ricms_mariadb mysqldump ...` or your preferred backup tool.
- **Check container status periodically:** `docker compose ps`
- **View live logs for any service:** `docker compose logs -f <service-name>`
- **Restart a single service** (without stopping others): `docker compose --profile microservices restart <service-name>`
