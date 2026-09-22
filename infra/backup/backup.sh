#!/usr/bin/env bash
# Daily encrypted logical backup (blueprint §11.4), on top of the provider's PITR.
# Requires: pg_dump, age (https://age-encryption.org), and a destination (S3/R2/B2 via rclone).
#   BACKUP_DATABASE_URL=... AGE_RECIPIENT=age1... RCLONE_DEST=r2:zecminers-backups ./backup.sh
set -euo pipefail
: "${BACKUP_DATABASE_URL:?}" "${AGE_RECIPIENT:?}" "${RCLONE_DEST:?}"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
file="zecminers-${stamp}.sql.gz.age"
pg_dump --no-owner --format=plain "$BACKUP_DATABASE_URL" | gzip -9 | age -r "$AGE_RECIPIENT" > "/tmp/${file}"
rclone copy "/tmp/${file}" "$RCLONE_DEST/"
rm -f "/tmp/${file}"
echo "backup uploaded: ${file}"
# Restore drill (monthly): rclone copy "$RCLONE_DEST/$file" . && age -d -i key.txt "$file" | gunzip | psql "$RESTORE_URL"
