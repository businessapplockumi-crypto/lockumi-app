#!/usr/bin/env bash
# Corre scripts/espacios/prueba.sql (que aplica la migración de espacios dos veces) contra el proyecto Supabase de PRUEBA
# sddgjnuvxzkrhhuczuly, dentro de UNA transacción que siempre termina en ROLLBACK: no deja nada aplicado ni datos nuevos.
# Uso: SUPABASE_DB_URL='postgresql://…' CONFIRMO_PROYECTO=sddgjnuvxzkrhhuczuly bash scripts/espacios/probar-sql-remoto.sh
# SUPABASE_DB_URL: cadena de conexión directa o del pooler en modo SESIÓN (puerto 5432), rol postgres. Nunca se imprime.
set -euo pipefail
cd "$(dirname "$0")/../.."
REF=sddgjnuvxzkrhhuczuly
[ -n "${SUPABASE_DB_URL:-}" ] || { echo "Falta SUPABASE_DB_URL." >&2; exit 2; }
[ "${CONFIRMO_PROYECTO:-}" = "$REF" ] || { echo "Pon CONFIRMO_PROYECTO=$REF para confirmar que es el proyecto de prueba." >&2; exit 2; }
case "$SUPABASE_DB_URL" in *"$REF"*) ;; *) echo "SUPABASE_DB_URL no apunta a $REF; no se corre." >&2; exit 2;; esac
case "$SUPABASE_DB_URL" in *":6543"*) echo "Usa el modo sesión (5432), no el pooler de transacciones (6543)." >&2; exit 2;; esac
psql "$SUPABASE_DB_URL" -X -q -v ON_ERROR_STOP=1 -v migracion=supabase/migrations/20261024000000_lk_espacios.sql <<'SQL' 2>&1 | sed 's/^psql:[^ ]* NOTICE:  /  /'
begin;
\i scripts/espacios/prueba.sql
rollback;
\echo 'ROLLBACK hecho: el proyecto quedó como estaba.'
SQL
