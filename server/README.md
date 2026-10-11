# Darklink backend

Darklink uses anonymous, room-scoped usernames. There is no account or password
login. A participant joins with a room code and a username; usernames must be
unique within that room but may be reused in other rooms.

## Room API

All endpoints are under `/api/rooms/`.

### Create a room

`POST /api/rooms/`

```json
{
  "group_name": "Study group",
  "username": "host",
  "limit": 8,
  "end_time": "2026-10-11T01:00:00Z"
}
```

`limit` defaults to `1`, counts the creator, accepts values from 1 to 20, and
may be `null` for no capacity limit. `end_time` is optional and must be in the
future. The response includes the generated `room_code` and the creator's
one-time `admin_token`. Keep the admin token private; the server stores only
its hash.

### Join a room

`POST /api/rooms/{room_code}/join/`

```json
{"username": "guest"}
```

The room must be active and have capacity. A repeated join using an existing
username in the same room returns that room member; no login is used to prove
the username's identity.

### Read message history

`GET /api/rooms/{room_code}/messages/?username=guest&page=1&page_size=50`

History is paginated and available only when `username` belongs to the room.
Message records and membership records are deleted when the room is deleted.

### Admin actions

Pass the relevant admin token in the `X-Admin-Token` header:

- `PATCH /api/rooms/{room_code}/admin/` updates `limit` and/or `end_time`.
- `POST /api/rooms/{room_code}/admin/members/{username}/promote/` promotes a
  member and returns a new, individual admin token. The token is shown only
  when issued.
- `POST /api/rooms/{room_code}/admin/members/{username}/revoke/` removes that
  member's admin role and token. A room must retain at least one admin.
- `DELETE /api/rooms/{room_code}/admin/end/` immediately ends the room.

Ending a room notifies connected clients, then deletes its room, memberships,
connections, and messages. When the last WebSocket connection disconnects, the
same deletion occurs. Multiple open tabs for the same member count as separate
connections.

## WebSocket

Connect to `/ws/chat/{room_code}/?username={username}` after joining. Send text
frames containing JSON with a string `message` field. Successful broadcasts
contain `id`, `message`, `username`, and `datetime`; invalid payloads return an
`error` object. Messages are limited to 4,000 characters and frames to 64 KiB.
Room closure sends `{"type":"room_closed"}` and closes the socket.

PostgreSQL is the only supported database in every environment. Set
`DATABASE_URL` before starting the application or running tests. Django's test
runner creates a separate temporary PostgreSQL test database. For production,
also set `DJANGO_DEBUG=False`, `DJANGO_SECRET_KEY`, and `DJANGO_ALLOWED_HOSTS`;
the application refuses to start if these production settings are missing.

The connection username is not authenticated: anyone who knows the room code
can claim an existing room username. Admin actions still require the separate
admin token. Use HTTPS/WSS in deployment to protect that token in transit.
New members are held as pending joins for the same 120-second cleanup window
while they establish their first WebSocket connection, preventing the final
existing disconnect from deleting a room during that join handshake.

## Expiration and deployment

Set `REDIS_URL` for a Redis Channels layer when running more than one ASGI
worker. Without Redis, the in-memory channel layer supports only a single
process.

Schedule `python manage.py cleanup_rooms` to run at least once a minute. It
deletes rooms whose optional end time has passed and cleans up connections
whose heartbeat has been stale for 120 seconds. The WebSocket heartbeat keeps
active connections alive; pending members who never connect are also removed
after that timeout. Room deletion removes application database records;
retention in database-provider backups is controlled separately by that
provider.