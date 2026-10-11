#!/usr/bin/env bash
# Applique les migrations sur une base jetable puis lance les tests SQL.
# Postgres : variables PGHOST/PGPORT/PGUSER/PGPASSWORD si definies (CI), sinon un conteneur Docker postgres:17 (version de Supabase).
set -euo pipefail
cd "$(dirname "$0")/.."

PSQL=(psql)
if [ -z "${PGHOST:-}" ]; then
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    # un ancien conteneur d'une autre version de Postgres est remplace
    if ! docker ps --format '{{.Names}} {{.Image}}' | grep -qx 'pds-pg postgres:17'; then
      docker rm -f pds-pg >/dev/null 2>&1 || true
      docker run -d --name pds-pg -e POSTGRES_PASSWORD=postgres postgres:17 >/dev/null
    fi
    for _ in $(seq 1 40); do docker exec pds-pg pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done
    PSQL=(docker exec -i pds-pg psql -U postgres)
  else
    echo "Aucun Postgres disponible : definir PGHOST/PGUSER/PGPASSWORD ou lancer Docker." >&2
    exit 1
  fi
fi

BASE="pds_test_$$"
"${PSQL[@]}" -q -d postgres -c "create database $BASE" >/dev/null
nettoyer() { "${PSQL[@]}" -q -d postgres -c "drop database if exists $BASE" >/dev/null 2>&1 || true; }
trap nettoyer EXIT

"${PSQL[@]}" -v ON_ERROR_STOP=1 -q -d "$BASE" < tests/sql/00_roles_supabase.sql
for f in supabase/migrations/*.sql; do
  echo "Migration : $f"
  "${PSQL[@]}" -v ON_ERROR_STOP=1 -q -d "$BASE" < "$f"
done
for t in tests/sql/[1-9]*.sql; do
  echo "Tests : $t"
  "${PSQL[@]}" -v ON_ERROR_STOP=1 -d "$BASE" < "$t" 2>&1 | sed -n 's/.*NOTICE:  //p; /ERROR/p; /passes/p'
done
