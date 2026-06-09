# Staging Deployment Instructions (Dual-Server Cluster)

This guide provides exactly what you need to deploy the application across two dedicated servers:
- **Server A:** Hosts the Backend, Frontend, Gateway, and Redis caching.
- **Server B:** Hosts the MariaDB Database.

---

## 1. Setting up Server B (The Database)

Since you already have a dedicated database server, Docker is not needed here.

**Steps for your DBA:**
1. Send your DBA the `staging-schema-full.sql` file provided in the repository root.
2. The DBA must create the following three blank databases with `utf8mb4` encoding:
   - `compliance_hub`
   - `compliance_hub_users`
   - `compliance_hub_ticketing`
3. Have the DBA grant all privileges for these three databases to a secure user account (e.g., `compliance_service_user`).
4. The DBA should then run the `staging-schema-full.sql` file against the database instance.
   - *This file automatically creates all tables, seeds the exact system roles (including `pantawid_ict_focal`), and creates a single administrator account (`fo2admin@dswd.gov.ph` with password `password123`).*

---

## 2. Setting up Server A (The Application Cluster)

Server A handles all incoming traffic and application logic. It requires Docker and Docker Compose.

**Steps:**
1. Clone the repository onto Server A.
2. Open `docker-compose.staging.yml` in a text editor (e.g., `nano` or `vim`).
3. You do **NOT** need to create a `.env` file. All environment variables have been safely embedded directly into this Docker file so you only need to make targeted edits.

### Targeted Edits Required in `docker-compose.staging.yml`:

Search for the keyword `TODO` inside the `docker-compose.staging.yml` file to find the exact lines you need to modify.

| Variable Name | What to put in it |
|---|---|
| `APP_URL` | The URL/IP where the backend runs. E.g., `http://192.168.1.100:4000` |
| `FRONTEND_URL` | The URL/IP where the frontend runs. E.g., `http://192.168.1.100` |
| `CORS_ORIGIN` | The URL/IP allowed to connect. E.g., `http://192.168.1.100` |
| `DB_HOST` | **CRITICAL:** The IP Address of Server B (Database Server). |
| `DB_PASSWORD` | The secure password the DBA configured for your database user. |
| `JWT_SECRET` | A long, randomly generated string of characters. |
| `JWT_REFRESH_SECRET` | A second, different randomly generated string. |
| `SMTP_PASS` | Your Google App Password to enable outbound emails. |
| `GOOGLE_CALLBACK_URL` | The exact URL pointing to your Gateway server + callback path. E.g., `http://192.168.1.100:4000/api/auth/google/callback` |

---

## 3. Starting the Application

Once your targeted edits are saved in `docker-compose.staging.yml`, you are ready to boot up the cluster.

Run the following command on Server A:

```bash
docker compose -f docker-compose.staging.yml up -d --build
```

**Verification:**
- **Database Connection**: Run `docker logs rictms_users_service` to ensure the service says "Connected to database successfully".
- **Frontend Access**: Open `http://<SERVER_A_IP>` in your browser.
- **Login**: Log in using `fo2admin@dswd.gov.ph` and `password123`.

*Remember to change the `fo2admin` password from the dashboard immediately after your first login!*
