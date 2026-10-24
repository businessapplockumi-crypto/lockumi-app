#!/usr/bin/env bash
# Ensayo LOCAL de exportar-lk / probar-sql-remoto / aplicar-migracion / revertir-migracion contra una API falsa
# (api-falsa.mjs) sobre un Postgres 17 temporal. No llama a Supabase. Uso: bash scripts/espacios/ensayo-local.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
BIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1); DIR=$(mktemp -d); PORT=${PORT:-54330}; API=${API_PORT:-54331}
trap 'kill $PID_API 2>/dev/null || true; "$BIN/pg_ctl" -D "$DIR/pg" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DIR"' EXIT
"$BIN/initdb" -D "$DIR/pg" -U postgres -A trust -E UTF8 --locale=C.UTF-8 >/dev/null
"$BIN/pg_ctl" -D "$DIR/pg" -o "-p $PORT -k $DIR -c listen_addresses=''" -l "$DIR/log" -w start >/dev/null
P=("$BIN/psql" -h "$DIR" -p "$PORT" -U postgres -d postgres -q -v ON_ERROR_STOP=1)
"${P[@]}" -f scripts/espacios/stubs.sql
"${P[@]}" -f supabase/migrations/20261017000000_lockumi_e2e.sql 2>/dev/null
# Datos que ya había: un alquiler y una tabla ajena (waitlist) que NADIE debe consultar.
"${P[@]}" -c "create table public.waitlist(email text); insert into public.waitlist values ('alguien@ejemplo.cr');
  select set_config('lk.uid', '44444444-4444-4444-8444-444444444444', false);
  select public.lk_crear_contrato('Casa existente', 10, current_date, current_date + 100, '{}', 'demo@lockumi.com', 'otro@ejemplo.cr');
  insert into storage.objects(bucket_id, name) values ('lk-fotos', 'existente/entrada/x.jpg'), ('otro-bucket', 'no-tocar.jpg');" >/dev/null
mkdir -p "$DIR/shim" && (cd "$DIR/shim" && npm init -y >/dev/null && npm i --silent pg@8 >/dev/null)
export SUPABASE_ACCESS_TOKEN="falso-$(head -c 12 /dev/urandom | od -An -tx1 | tr -d ' \n')" CONFIRMO_PROYECTO=sddgjnuvxzkrhhuczuly
export SUPABASE_API_URL="http://127.0.0.1:$API" RESPALDOS="$DIR/respaldos" LOG_API="$DIR/api.log"
NODE_PATH="$DIR/shim/node_modules" PGHOST="$DIR" PGPORT="$PORT" node scripts/espacios/api-falsa.mjs "$API" "$SUPABASE_ACCESS_TOKEN" & PID_API=$!
sleep 1; S=scripts/espacios; OUT="$DIR/salida.txt"; : > "$LOG_API"
paso() { echo "── $*"; "$@" 2>&1 | tee -a "$OUT"; }
paso node $S/aplicar-migracion.mjs
[ ! -s "$LOG_API" ] && echo "  ✓ sin --aplicar-de-verdad no se llamó a la API"
paso node $S/exportar-lk.mjs; R0=$(ls -d "$RESPALDOS"/* | head -1)
paso node $S/probar-sql-remoto.mjs
paso node $S/aplicar-migracion.mjs --aplicar-de-verdad
paso node $S/probar-sql-remoto.mjs
paso node $S/revertir-migracion.mjs --respaldo "$R0" --revertir-de-verdad
node --input-type=module -e "
import { huella, tablasLk, compararHuellas } from './$S/api.mjs'; import { readFileSync } from 'node:fs'
const m = JSON.parse(readFileSync('$R0/manifiesto.json', 'utf8')), d = compararHuellas(m.huella, await huella(await tablasLk()))
console.log(d.length ? '  ✗ después de revertir no quedó igual: ' + d.join('; ') : '  ✓ después de revertir: filas y definiciones lk_* iguales al respaldo de antes'); process.exit(d.length ? 1 : 0)" | tee -a "$OUT"
grep -qi waitlist "$LOG_API" && { echo "  ✗ alguna consulta tocó waitlist"; exit 1; } || echo "  ✓ ninguna consulta nombra waitlist ni otras tablas"
grep -q "no-tocar" "$RESPALDOS"/*/storage-objects-lk-fotos.json && { echo "  ✗ el respaldo trae archivos de otro bucket"; exit 1; } || echo "  ✓ el respaldo de storage solo trae lk-fotos"
grep -qF "$SUPABASE_ACCESS_TOKEN" "$OUT" && { echo "  ✗ se imprimió el token"; exit 1; } || echo "  ✓ el token no aparece en la salida"
echo "  ($(grep -c '^-- consulta' "$LOG_API") consultas a la API falsa; respaldos: $(ls "$RESPALDOS" | wc -l))"
grep -qE "HAY FALLAS|✗|API [0-9]{3}" "$OUT" && { echo ENSAYO CON FALLAS; exit 1; }; echo ENSAYO TODO OK
