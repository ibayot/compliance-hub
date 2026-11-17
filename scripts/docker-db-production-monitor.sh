#!/usr/bin/env bash
# Read-only production monitor for a MariaDB Docker container.
#
# Usage:
#   DB_CONTAINER=<actual-container-name> bash docker-db-production-monitor.sh stats
#   DB_CONTAINER=<actual-container-name> SAMPLE_SECONDS=60 SAMPLE_COUNT=10 bash docker-db-production-monitor.sh stats
#   DB_CONTAINER=<actual-container-name> bash docker-db-production-monitor.sh audit
#
# The DB container must expose MARIADB_ROOT_PASSWORD / MYSQL_ROOT_PASSWORD or
# the corresponding *_FILE variable to its own environment. Secrets are read
# inside the container and are never printed or passed as command arguments.

set -Eeuo pipefail

DB_CONTAINER="${DB_CONTAINER:-rictms_db}"
MODE="${1:-stats}"
SAMPLE_SECONDS="${SAMPLE_SECONDS:-60}"
SAMPLE_COUNT="${SAMPLE_COUNT:-0}" # 0 means run until Ctrl+C

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

if ! docker inspect --format '{{.State.Running}}' "$DB_CONTAINER" 2>/dev/null | tr -d '\r' | grep -qx true; then
  echo "Docker DB container '$DB_CONTAINER' is not running or is not visible to this user." >&2
  exit 1
fi

db_query() {
  local sql="$1"
  docker exec "$DB_CONTAINER" sh -c '
    set -eu
    client="$(command -v mariadb || command -v mysql)"
    password="${MARIADB_ROOT_PASSWORD:-${MYSQL_ROOT_PASSWORD:-${MYSQL_PWD:-}}}"
    password_file="${MARIADB_ROOT_PASSWORD_FILE:-${MYSQL_ROOT_PASSWORD_FILE:-}}"
    if [ -n "$password_file" ]; then
      password="$(cat "$password_file")"
    fi
    if [ -n "$password" ]; then
      export MYSQL_PWD="$password"
    fi
    "$client" --protocol=socket --user=root --batch --raw --skip-column-names -e "$1"
  ' sh "$sql" | tr -d '\r'
}

audit_sql="SHOW GLOBAL VARIABLES WHERE Variable_name IN ('server_audit_logging','server_audit_events','server_audit_incl_users','server_audit_excl_users','server_audit_output_type','server_audit_file_path','server_audit_syslog_ident','datadir','general_log','log_output','performance_schema')"
audit_config="$(db_query "$audit_sql")"
config_value() {
  printf '%s\n' "$audit_config" | awk -F '\t' -v name="$1" '$1 == name { print $2; exit }'
}

if [[ "$MODE" == audit ]]; then
  audit_enabled="$(config_value server_audit_logging)"
  audit_type="$(config_value server_audit_output_type)"
  audit_file="$(config_value server_audit_file_path)"
  data_dir="$(config_value datadir)"
  syslog_ident="$(config_value server_audit_syslog_ident)"
  syslog_ident="${syslog_ident:-mariadb-audit}"

  if [[ "${audit_enabled,,}" != on && "$audit_enabled" != 1 ]]; then
    echo "MariaDB audit logging is not enabled in container '$DB_CONTAINER'. No live SQL audit rows are available to follow."
    echo "This script does not enable logging or change DB settings."
    exit 0
  fi

  case "${audit_type^^}" in
    FILE)
      if [[ -z "$audit_file" ]]; then
        echo "Audit output is FILE, but server_audit_file_path is empty." >&2
        exit 1
      fi
      if [[ "$audit_file" != /* && -n "$data_dir" ]]; then
        audit_file="${data_dir%/}/$audit_file"
      fi
      echo "Following live MariaDB audit file inside '$DB_CONTAINER': $audit_file"
      exec docker exec -i "$DB_CONTAINER" sh -c 'tail -F -- "$1"' sh "$audit_file"
      ;;
    SYSLOG)
      echo "Following host syslog entries containing '$syslog_ident'. Press Ctrl+C to stop."
      if command -v journalctl >/dev/null 2>&1; then
        exec journalctl -f -o short-iso | grep --line-buffered -F "$syslog_ident"
      elif [[ -r /var/log/syslog ]]; then
        exec tail -F /var/log/syslog | grep --line-buffered -F "$syslog_ident"
      elif [[ -r /var/log/messages ]]; then
        exec tail -F /var/log/messages | grep --line-buffered -F "$syslog_ident"
      else
        echo "No readable host journal/syslog found. Try: docker logs --follow '$DB_CONTAINER'" >&2
        exit 1
      fi
      ;;
    *)
      echo "Audit is enabled with output type '${audit_type:-unknown}'. Following Docker stdout; if empty, check the configured audit sink."
      exec docker logs --follow --since 5m "$DB_CONTAINER"
      ;;
  esac
fi

status_sql="SHOW GLOBAL STATUS WHERE Variable_name IN ('Questions','Queries','Connections','Slow_queries','Threads_connected','Threads_running')"
read_status() { db_query "$status_sql"; }
status_value() {
  local snapshot="$1" name="$2"
  awk -F '\t' -v key="$name" '$1 == key { print $2; found=1 } END { if (!found) print 0 }' <<< "$snapshot"
}
counter_delta() {
  local before="$1" after="$2"
  if (( after >= before )); then printf '%s' "$((after - before))"; else printf '%s' "$after"; fi
}

echo "Monitoring MariaDB container '$DB_CONTAINER' every ${SAMPLE_SECONDS}s. Deltas include the monitor's own status reads. Press Ctrl+C to stop."
echo "Audit settings:"
printf '%s\n' "$audit_config"

cycle=0
while :; do
  before="$(read_status)"
  started="$(date +%s)"
  sleep "$SAMPLE_SECONDS"
  after="$(read_status)"
  finished="$(date +%s)"
  elapsed="$((finished - started))"
  (( elapsed > 0 )) || elapsed=1

  q_delta="$(counter_delta "$(status_value "$before" Questions)" "$(status_value "$after" Questions)")"
  query_delta="$(counter_delta "$(status_value "$before" Queries)" "$(status_value "$after" Queries)")"
  connection_delta="$(counter_delta "$(status_value "$before" Connections)" "$(status_value "$after" Connections)")"
  slow_delta="$(counter_delta "$(status_value "$before" Slow_queries)" "$(status_value "$after" Slow_queries)")"
  q_rate="$(awk -v n="$q_delta" -v s="$elapsed" 'BEGIN { printf "%.1f", n * 60 / s }')"
  query_rate="$(awk -v n="$query_delta" -v s="$elapsed" 'BEGIN { printf "%.1f", n * 60 / s }')"

  printf '%s questions=%s (%s/min) queries=%s (%s/min) new_connections=%s new_slow_queries=%s threads_connected=%s threads_running=%s\n' \
    "$(date '+%Y-%m-%dT%H:%M:%S%z')" "$q_delta" "$q_rate" "$query_delta" "$query_rate" "$connection_delta" "$slow_delta" \
    "$(status_value "$after" Threads_connected)" "$(status_value "$after" Threads_running)"

  cycle=$((cycle + 1))
  if (( SAMPLE_COUNT > 0 && cycle >= SAMPLE_COUNT )); then break; fi
done
