#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:4000}"
API="${API:-$BASE_URL/api}"
TOKEN="${TOKEN:-<access_token>}"
COOKIE_JAR="${COOKIE_JAR:-cookies.txt}"
ORGANIZER_ID="${ORGANIZER_ID:-<organizer_uuid>}"
EVENT_ID="${EVENT_ID:-<event_uuid>}"
BOOKING_ID="${BOOKING_ID:-<booking_id>}"
USER_ID="${USER_ID:-<user_id>}"
FILE_PATH="${FILE_PATH:-./public/vercel.svg}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-changeMeAdmin1!}"

function require_value() {
  local name="$1"
  local value="${!name:-}"

  if [[ -z "$value" || "$value" == \<* || "$value" == *\> ]]; then
    echo "Set $name before running this command." >&2
    exit 1
  fi
}

function help_text() {
  cat <<'EOF'
Usage: ./api-curls.sh <command>

Examples:
  ./api-curls.sh health
  TOKEN=atk_xxx ./api-curls.sh bookings-list
  TOKEN=atk_xxx ORGANIZER_ID=org_123 ./api-curls.sh organizer-events-list

Commands:
  health
  api-docs
  auth-register
  auth-login
  auth-refresh
  auth-logout
  auth-me
  admin-licenses
  admin-audit-logs
  admin-organizer-activity
  admin-system-overview
  bookings-list
  bookings-get
  bookings-create
  bookings-update
  bookings-delete
  organizer-create
  organizer-get
  organizer-update
  organizer-events-list
  organizer-events-create
  organizer-events-update
  organizer-events-delete
  organizer-staff-list
  organizer-staff-add
  organizer-staff-delete
  users-list
  users-get
  users-create
  users-update
  users-role-update
  users-delete
  payments-checkout-session
  payments-history
  uploads-image
  rbac-definitions
  analytics-overview
  analytics-bookings
  analytics-payments
  analytics-events
  analytics-users
EOF
}

case "${1:-help}" in
  health)
    curl "$BASE_URL/health"
    ;;
  api-docs)
    curl "$BASE_URL/api-docs"
    ;;
  auth-register)
    curl -X POST "$API/auth/register" \
      -H "Content-Type: application/json" \
      -c "$COOKIE_JAR" \
      -d '{
        "email": "avery.booker@example.com",
        "password": "changeMeUserNew1!",
        "name": "Avery Booker"
      }'
    ;;
  auth-login)
    curl -X POST "$API/auth/login" \
      -H "Content-Type: application/json" \
      -c "$COOKIE_JAR" \
      -d "{
        \"email\": \"$ADMIN_EMAIL\",
        \"password\": \"$ADMIN_PASSWORD\"
      }"
    ;;
  auth-refresh)
    curl -X POST "$API/auth/refresh" \
      -H "Authorization: Bearer $TOKEN" \
      -b "$COOKIE_JAR" \
      -c "$COOKIE_JAR"
    ;;
  auth-logout)
    curl -X POST "$API/auth/logout" \
      -H "Authorization: Bearer $TOKEN" \
      -b "$COOKIE_JAR" \
      -c "$COOKIE_JAR" \
      -i
    ;;
  auth-me)
    curl "$API/auth/me" \
      -H "Authorization: Bearer $TOKEN"
    ;;
  admin-licenses)
    curl "$API/admin/licenses" \
      -H "Authorization: Bearer $TOKEN"
    ;;
  admin-audit-logs)
    curl "$API/admin/audit-logs" \
      -H "Authorization: Bearer $TOKEN"
    ;;
  admin-organizer-activity)
    require_value ORGANIZER_ID
    curl "$API/admin/organizers/$ORGANIZER_ID/activity" \
      -H "Authorization: Bearer $TOKEN"
    ;;
  admin-system-overview)
    curl "$API/admin/system/overview" \
      -H "Authorization: Bearer $TOKEN"
    ;;
  bookings-list)
    curl "$API/bookings?status=PENDING,CONFIRMED,COMPLETED&eventName=Summit&checkInFrom=2026-07-01&checkInTo=2026-10-31&checkOutFrom=2026-07-02&checkOutTo=2026-11-01&page=1&limit=20" \
      -H "Authorization: Bearer $TOKEN"
    ;;
  bookings-get)
    require_value BOOKING_ID
    curl "$API/bookings/$BOOKING_ID" \
      -H "Authorization: Bearer $TOKEN"
    ;;
  bookings-create)
    require_value EVENT_ID
    curl -X POST "$API/bookings" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"eventId\": \"$EVENT_ID\",
        \"checkIn\": \"2026-07-14\",
        \"checkOut\": \"2026-07-16\"
      }"
    ;;
  bookings-update)
    require_value BOOKING_ID
    curl -X PATCH "$API/bookings/$BOOKING_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "checkIn": "2026-07-15",
        "checkOut": "2026-07-17"
      }'
    ;;
  bookings-delete)
    require_value BOOKING_ID
    curl -X DELETE "$API/bookings/$BOOKING_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -i
    ;;
  organizer-create)
    curl -X POST "$API/organizers" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "Acme Events",
        "ownerId": 3
      }'
    ;;
  organizer-get)
    require_value ORGANIZER_ID
    curl "$API/organizers/$ORGANIZER_ID" \
      -H "Authorization: Bearer $TOKEN"
    ;;
  organizer-update)
    require_value ORGANIZER_ID
    curl -X PATCH "$API/organizers/$ORGANIZER_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "Acme Events Updated"
      }'
    ;;
  organizer-events-list)
    require_value ORGANIZER_ID
    curl "$API/organizers/$ORGANIZER_ID/events" \
      -H "Authorization: Bearer $TOKEN"
    ;;
  organizer-events-create)
    require_value ORGANIZER_ID
    curl -X POST "$API/organizers/$ORGANIZER_ID/events" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "Summer Fest",
        "description": "Main event",
        "price": 49.99,
        "isPublished": true
      }'
    ;;
  organizer-events-update)
    require_value ORGANIZER_ID
    require_value EVENT_ID
    curl -X PATCH "$API/organizers/$ORGANIZER_ID/events/$EVENT_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "Summer Fest 2026",
        "price": 59.99,
        "isPublished": true
      }'
    ;;
  organizer-events-delete)
    require_value ORGANIZER_ID
    require_value EVENT_ID
    curl -X DELETE "$API/organizers/$ORGANIZER_ID/events/$EVENT_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -i
    ;;
  organizer-staff-list)
    require_value ORGANIZER_ID
    curl "$API/organizers/$ORGANIZER_ID/staff" \
      -H "Authorization: Bearer $TOKEN"
    ;;
  organizer-staff-add)
    require_value ORGANIZER_ID
    require_value USER_ID
    curl -X POST "$API/organizers/$ORGANIZER_ID/staff" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"userId\": $USER_ID}"
    ;;
  organizer-staff-delete)
    require_value ORGANIZER_ID
    require_value USER_ID
    curl -X DELETE "$API/organizers/$ORGANIZER_ID/staff/$USER_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -i
    ;;
  users-list)
    curl "$API/users?role=STAFF&search=john&page=1&limit=10" \
      -H "Authorization: Bearer $TOKEN"
    ;;
  users-get)
    require_value USER_ID
    curl "$API/users/$USER_ID" \
      -H "Authorization: Bearer $TOKEN"
    ;;
  users-create)
    curl -X POST "$API/users" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "email": "staff1@example.com",
        "name": "Staff 1",
        "password": "changeMe123!",
        "role": "STAFF"
      }'
    ;;
  users-update)
    require_value USER_ID
    curl -X PATCH "$API/users/$USER_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "Updated Name",
        "email": "updated@example.com"
      }'
    ;;
  users-role-update)
    require_value USER_ID
    curl -X PATCH "$API/users/$USER_ID/role" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "role": "OWNER"
      }'
    ;;
  users-delete)
    require_value USER_ID
    curl -X DELETE "$API/users/$USER_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -i
    ;;
  payments-checkout-session)
    require_value BOOKING_ID
    curl -X POST "$API/payments/checkout-session" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"bookingId\": $BOOKING_ID,
        \"successUrl\": \"http://localhost:3000/payments/success\",
        \"cancelUrl\": \"http://localhost:3000/payments/cancel\"
      }"
    ;;
  payments-history)
    curl "$API/payments/history" \
      -H "Authorization: Bearer $TOKEN"
    ;;
  uploads-image)
    curl -X POST "$API/uploads/image" \
      -H "Authorization: Bearer $TOKEN" \
      -F "file=@$FILE_PATH"
    ;;
  rbac-definitions)
    curl "$API/rbac/definitions" \
      -H "Authorization: Bearer $TOKEN"
    ;;
  analytics-overview)
    curl "$API/analytics/overview?dateFrom=2026-04-01&dateTo=2026-04-09&granularity=day" \
      -H "Authorization: Bearer $TOKEN"
    ;;
  analytics-bookings)
    require_value ORGANIZER_ID
    curl "$API/analytics/bookings?organizerId=$ORGANIZER_ID&dateFrom=2026-04-01&dateTo=2026-04-09" \
      -H "Authorization: Bearer $TOKEN"
    ;;
  analytics-payments)
    require_value ORGANIZER_ID
    curl "$API/analytics/payments?organizerId=$ORGANIZER_ID&dateFrom=2026-04-01&dateTo=2026-04-09" \
      -H "Authorization: Bearer $TOKEN"
    ;;
  analytics-events)
    require_value ORGANIZER_ID
    curl "$API/analytics/events?organizerId=$ORGANIZER_ID&dateFrom=2026-04-01&dateTo=2026-04-09" \
      -H "Authorization: Bearer $TOKEN"
    ;;
  analytics-users)
    require_value ORGANIZER_ID
    curl "$API/analytics/users?organizerId=$ORGANIZER_ID&dateFrom=2026-04-01&dateTo=2026-04-09" \
      -H "Authorization: Bearer $TOKEN"
    ;;
  *)
    help_text
    exit 1
    ;;
esac
