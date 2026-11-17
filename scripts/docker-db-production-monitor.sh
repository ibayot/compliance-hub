#!/usr/bin/env bash
# Read-only monitor for a remote MariaDB reached by a Compliance Hub app container.
#
# Usage:
#   APP_CONTAINER=<app-container-name> bash docker-db-production-monitor.sh stats
#   APP_CONTAINER=<app-container-name> SAMPLE_SECONDS=60 SAMPLE_COUNT=10 bash docker-db-production-monitor.sh stats
#   APP_CONTAINER=<app-container-name> AUDIT_SSH_TARGET=<user@db-host> bash docker-db-production-monitor.sh audit
#
# Stats queries run through the app container's existing DB connection settings.
# The DB password stays inside that container and is never printed or passed as an argument.
# Audit rows live on the separate DB server; audit mode follows its journal or configured log file over SSH.

set -Eeuo pipefail

APP_CONTAINER="${APP_CONTAINER:-rictms_users_service}"
MODE="${1:-stats}"
SAMPLE_SECONDS="${SAMPLE_SECONDS:-60}"
SAMPLE_COUNT="${SAMPLE_COUNT:-0}" # 0 means run until Ctrl+C
AUDIT_SSH_TARGET="${AUDIT_SSH_TARGET:-}"
AUDIT_LOG_FILE="${AUDIT_LOG_FILE:-}"

if ! [[ "$SAMPLE_SECONDS" =~ ^[1-9][0-9]*$ ]]; then
  echo "SAMPLE_SECONDS must be a positive integer." >&2
  exit 2
fi
if ! [[ "$SAMPLE_COUNT" =~ ^[0-9]+$ ]]; then
  echo "SAMPLE_COUNT must be zero or a positive integer." >&2
  exit 2
fi
if [[ "$MODE" != stats && "$MODE" != audit ]]; then
  echo "Usage: $0 [stats|audit]" >&2
  exit 2
fi

if ! docker inspect --format '{{.State.Running}}' "$APP_CONTAINER" 2>/dev/null | tr -d '\r' | grep -qx true; then
  echo "Application container '$APP_CONTAINER' is not running or is not visible to this user." >&2
  exit 1
fi

if [[ "$MODE" == stats ]]; then
  stats_probe="$(cat <<'NODE'
const mysql = require("mysql2/promise");
try { require("dotenv").config(); } catch {}
const sampleSeconds = Number(process.argv[1]);
const sampleCount = Number(process.argv[2]);
const quote = (value) => String.fromCharCode(39) + value + String.fromCharCode(39);
const names = ["Questions", "Queries", "Connections", "Slow_queries", "Threads_connected", "Threads_running"];
const sql = `SHOW GLOBAL STATUS WHERE Variable_name IN (${names.map(quote).join(",")})`;

(async () => {
  if (!process.env.DB_HOST || !process.env.DB_USERNAME) {
    console.error("DB_HOST or DB_USERNAME is unavailable inside the selected app container.");
    process.exit(2);
  }
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_DATABASE || undefined,
    connectTimeout: 5000,
  });
  const readStatus = async () => {
    const [rows] = await connection.query(sql);
    return Object.fromEntries(rows.map((row) => [row.Variable_name, String(row.Value)]));
  };
  const delta = (before, after, name) => {
    const a = BigInt(before[name] || "0");
    const b = BigInt(after[name] || "0");
    return b >= a ? b - a : b;
  };
  const perMinute = (value, elapsed) => (Number(value) * 60 / elapsed).toFixed(1);

  let previous = await readStatus();
  let cycle = 0;
  while (sampleCount === 0 || cycle < sampleCount) {
    const startedAt = Date.now();
    await new Promise((resolve) => setTimeout(resolve, sampleSeconds * 1000));
    const current = await readStatus();
    const elapsed = Math.max(1, (Date.now() - startedAt) / 1000);
    const questions = delta(previous, current, "Questions");
    const queries = delta(previous, current, "Queries");
    const connections = delta(previous, current, "Connections");
    const slowQueries = delta(previous, current, "Slow_queries");

    console.log(
      `${new Date().toISOString()} questions=${questions} questions_per_min=${perMinute(questions, elapsed)} ` +
      `queries=${queries} queries_per_min=${perMinute(queries, elapsed)} ` +
      `new_connections=${connections} new_slow_queries=${slowQueries} ` +
      `threads_connected=${current.Threads_connected || 0} threads_running=${current.Threads_running || 0}`
    );
    previous = current;
    cycle += 1;
  }
  await connection.end();
})().catch((error) => {
  console.error(`Database monitor query failed (${error.code || error.name || "unknown"}).`);
  process.exit(1);
});
NODE
)"
  echo "Monitoring global MariaDB counters through '$APP_CONTAINER' every ${SAMPLE_SECONDS}s."
  echo "One persistent monitor connection is used; each sample includes its own status query. Press Ctrl+C to stop."
  echo "Counters include all clients on the remote DB server, not just this app."
  exec docker exec "$APP_CONTAINER" node -e "$stats_probe" "$SAMPLE_SECONDS" "$SAMPLE_COUNT"
fi

audit_sql="SHOW GLOBAL VARIABLES WHERE Variable_name IN ('server_audit_logging','server_audit_events','server_audit_incl_users','server_audit_excl_users','server_audit_output_type','server_audit_file_path','server_audit_syslog_ident','datadir','general_log','log_output','performance_schema')"
audit_probe="$(cat <<'NODE'
const mysql = require("mysql2/promise");
try { require("dotenv").config(); } catch {}
const sql = process.argv[1];
(async () => {
  if (!process.env.DB_HOST || !process.env.DB_USERNAME) {
    console.error("DB_HOST or DB_USERNAME is unavailable inside the selected app container.");
    process.exit(2);
  }
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_DATABASE || undefined,
    connectTimeout: 5000,
  });
  try {
    const [rows] = await connection.query(sql);
    for (const row of rows) console.log(`${row.Variable_name}\t${row.Value}`);
  } finally {
    await connection.end();
  }
})().catch((error) => {
  console.error(`Database monitor query failed (${error.code || error.name || "unknown"}).`);
  process.exit(1);
});
NODE
)"
audit_config="$(docker exec "$APP_CONTAINER" node -e "$audit_probe" "$audit_sql" | tr -d '\r')"
config_value() {
  printf '%s\n' "$audit_config" | awk -F '\t' -v name="$1" '$1 == name { print $2; exit }'
}
run_ssh() {
  local ssh_user="${SUDO_USER:-}"
  if [[ -n "$ssh_user" && "$ssh_user" != root ]]; then
    sudo -u "$ssh_user" -- ssh -t "$@"
  else
    ssh -t "$@"
  fi
}

echo "Remote MariaDB audit settings read through '$APP_CONTAINER':"
printf '%s\n' "$audit_config"

audit_enabled="$(config_value server_audit_logging)"
audit_type="$(config_value server_audit_output_type)"
audit_file="$(config_value server_audit_file_path)"
data_dir="$(config_value datadir)"
syslog_ident="$(config_value server_audit_syslog_ident)"
syslog_ident="${syslog_ident:-mariadb-audit}"

if [[ "${audit_enabled,,}" != on && "$audit_enabled" != 1 ]]; then
  echo "MariaDB audit logging is not enabled. No live SQL audit rows are available to follow."
  echo "This script does not enable logging or change DB settings."
  exit 0
fi

if [[ -z "$AUDIT_SSH_TARGET" ]]; then
  echo "The DB server is remote. Set AUDIT_SSH_TARGET=<user@db-host> with SSH access to follow its audit output." >&2
  echo "For SYSLOG, journal access is needed; for FILE, read access to the configured audit file is needed." >&2
  exit 2
fi
if ! command -v ssh >/dev/null 2>&1; then
  echo "ssh is required to follow audit output on the remote DB server." >&2
  exit 1
fi

case "${audit_type^^}" in
  FILE)
    if [[ -z "$audit_file" ]]; then
      echo "Audit output is FILE, but server_audit_file_path is empty." >&2
      exit 1
    fi
    if [[ "$audit_file" != /* ]]; then
      if [[ -z "$data_dir" ]]; then
        echo "Audit file path is relative and MariaDB did not report datadir." >&2
        exit 1
      fi
      audit_file="${data_dir%/}/$audit_file"
    fi
    if ! [[ "$audit_file" =~ ^/[A-Za-z0-9._/-]+$ ]]; then
      echo "Audit file path contains unsupported characters; inspect it and tail it manually over SSH." >&2
      exit 1
    fi
    echo "Following the audit file on '$AUDIT_SSH_TARGET': $audit_file. Press Ctrl+C to stop."
    run_ssh "$AUDIT_SSH_TARGET" sudo tail -F -- "$audit_file"
    ;;
  SYSLOG)
    if [[ -n "$AUDIT_LOG_FILE" ]]; then
      if ! [[ "$AUDIT_LOG_FILE" =~ ^/[A-Za-z0-9._/-]+$ ]]; then
        echo "AUDIT_LOG_FILE must be an absolute path containing only letters, digits, dot, underscore, slash, or hyphen." >&2
        exit 2
      fi
      echo "Following '$AUDIT_LOG_FILE' on '$AUDIT_SSH_TARGET', filtered by '$syslog_ident'. Press Ctrl+C to stop."
      run_ssh "$AUDIT_SSH_TARGET" sudo tail -F -- "$AUDIT_LOG_FILE" | grep --line-buffered -F -- "$syslog_ident"
    fi
    if ! [[ "$syslog_ident" =~ ^[A-Za-z0-9_.-]+$ ]]; then
      echo "MariaDB returned an unsupported syslog identifier; set AUDIT_LOG_FILE and inspect the source manually." >&2
      exit 1
    fi
    echo "Following the DB server journal identifier '$syslog_ident' on '$AUDIT_SSH_TARGET'. Press Ctrl+C to stop."
    run_ssh "$AUDIT_SSH_TARGET" sudo journalctl -f -o short-iso --identifier "$syslog_ident"
    ;;
  *)
    echo "Audit output type '${audit_type:-unknown}' is not supported by this script. Read the configured sink on the DB server." >&2
    exit 1
    ;;
esac
