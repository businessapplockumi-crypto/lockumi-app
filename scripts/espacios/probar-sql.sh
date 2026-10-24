#!/usr/bin/env bash
# Prueba la migración de espacios en un Postgres LOCAL y temporal (nunca en un proyecto real). Uso: bash scripts/espacios/probar-sql.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
BIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1); DIR=$(mktemp -d); PORT=${PORT:-54329}
trap '"$BIN/pg_ctl" -D "$DIR" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DIR"' EXIT
"$BIN/initdb" -D "$DIR" -U postgres -A trust -E UTF8 --locale=C.UTF-8 >/dev/null
"$BIN/pg_ctl" -D "$DIR" -o "-p $PORT -k $DIR -c listen_addresses=''" -l "$DIR/log" -w start >/dev/null
P=("$BIN/psql" -h "$DIR" -p "$PORT" -U postgres -d postgres -q -v ON_ERROR_STOP=1)
"${P[@]}" -f scripts/espacios/stubs.sql
"${P[@]}" -f supabase/migrations/20261017000000_lockumi_e2e.sql
"${P[@]}" -v migracion=supabase/migrations/20261024000000_lk_espacios.sql -o /dev/null -f scripts/espacios/prueba.sql 2>&1 | sed 's/^psql:[^ ]* NOTICE:  /  /'
