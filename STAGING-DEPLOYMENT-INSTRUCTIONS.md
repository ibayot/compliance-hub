# Staging Deployment Instructions (Dual-Server Cluster)

## 0. Prerequisites (For Fresh Ubuntu Servers)

Since your application is containerized, you **do not** need to install `npm` or `node` directly on your server. The only software Server A requires is **Docker** and **Docker Compose**. 

Run these exact commands anywhere on Server A to install Docker cleanly:

```bash
# 1. Update your system
sudo apt-get update
sudo apt-get install ca-certificates curl

# 2. Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# 3. Add the repository to Apt sources
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update

# 4. Install Docker Engine and Compose
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 5. Verify the installation
sudo docker compose version
```
*(You should see something like `Docker Compose version v2.x.x`)*

This guide provides exactly what you need to deploy the application across two dedicated servers:
- **Server A:** Hosts the Backend, Frontend, Gateway, and Redis caching.
- **Server B:** Hosts the MariaDB Database.

---

## 1. Setting up Server B (The Database)

Since you already have a dedicated database server, Docker is not needed here.

**Steps for your DBA:**
1. Send your DBA the `staging-schema-full.sql` file provided in the repository root.
2. The DBA must create the following three blank databases with `utf8mb4` encoding:
   - `02_db_stg_compliance_hub`
   - `02_db_stg_compliance_hub_users`
   - `02_db_stg_compliance_hub_ticketing`
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

Important networking note:
- `DB_HOST` must be a reachable IP address or DNS hostname of Server B from Server A.
- Do not use `localhost` or `127.0.0.1` for `DB_HOST` in this staging setup, because containers on Server A would try to connect to themselves.

### .env Database Values for Staging

If you are also maintaining a `.env` file (outside Docker Compose), use these exact staging database values:

```env
DB_DATABASE=02_db_stg_compliance_hub_ticketing
USERS_DB_DATABASE=02_db_stg_compliance_hub_users
TICKETING_DB_DATABASE=02_db_stg_compliance_hub_ticketing
COMPLIANCE_DB_DATABASE=02_db_stg_compliance_hub
```

---

## 3. Starting the Application

Once your targeted edits are saved in `docker-compose.staging.yml`, you are ready to boot up the cluster.

Run the following command on Server A:

```bash
docker compose -f docker-compose.staging.yml up -d --build
```

**Verification:**
- **Container Health**: Run `docker compose -f docker-compose.staging.yml ps` and confirm all services are `Up` and become `healthy`.
- **Database Connectivity**: Run `docker logs rictms_users_service --tail 100` and verify there are no repeated database connection failures.
- **Gateway Health**: Run `curl http://<SERVER_A_IP>:4000/api/health` and confirm all service flags are `true`.
- **Frontend Access**: Open `http://<SERVER_A_IP>` in your browser.
- **Login**: Log in using `fo2admin@dswd.gov.ph` and `password123`.

*Remember to change the `fo2admin` password from the dashboard immediately after your first login!*
