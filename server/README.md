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
may be `null` for no capacity limit. If `end_time` is omitted or `null`, the
room expires 15 minutes after creation. A supplied `end_time` must be in the
future. The response includes the generated `room_code` and the creator's
eight-character `admin_code` generated with the same random alphabet as the
room code. Participants use the room code to join with any room-unique
username. The private admin code is also a join code, but it only resolves to
the room when used with its owner's exact username. The server stores only its
password hash.
New rooms and promotions issue codes using the shared generator. Existing
rooms created before this change can still authenticate with their previously
issued admin credential until that room is deleted.

### Join a room

`POST /api/rooms/{room_code}/join/`

```json
{"username": "guest"}
```

The room must be active and have capacity. If a username already exists in
that room, attempting to claim it with the room code returns HTTP `409` with a
username-already-exists message. An admin may reconnect only by using their
private admin code in place of the room code and submitting the exact username
assigned that code:

```http
POST /api/rooms/AB12CD34/join/
Content-Type: application/json

{"username": "host"}
```

The response contains the actual `room_code` and the member's role. Using an
admin code with a different username does not reveal or join its room.

### Read message history

`GET /api/rooms/{room_code}/messages/?username=guest&page=1&page_size=50`

History is paginated and available only when `username` belongs to the room.
Message records and membership records are deleted when the room is deleted.

### Admin actions

Pass both `X-Admin-Username` (the admin's room username) and `X-Admin-Code`
(their eight-character private code) headers:

- `PATCH /api/rooms/{room_code}/admin/` updates `limit` and/or `end_time`.
- `POST /api/rooms/{room_code}/admin/members/{username}/promote/` promotes a
  member and returns a new, individual generated `admin_code` paired with
  that member's username. The code is shown only when issued.
- `POST /api/rooms/{room_code}/admin/members/{username}/revoke/` removes that
  member's admin role and code. A room must retain at least one admin.
- `DELETE /api/rooms/{room_code}/admin/end/` immediately ends the room.

Ending a room notifies connected clients, then deletes its room, memberships,
connections, and messages. When the last WebSocket connection disconnects, the
same deletion occurs. Multiple open tabs for the same member count as separate
connections.

### Test the HTTP API with Postman

Start the backend from the `server` directory:

```powershell
pipenv run python manage.py runserver 127.0.0.1:8000
```

In Postman, click **Import** and select
[Darklink API.postman_collection.json](./postman/Darklink%20API.postman_collection.json).
The collection's `base_url` defaults to `http://127.0.0.1:8000`. Change that
collection variable if you are testing a deployed backend. Run the numbered
requests in order; **1. Create room** saves `room_code`, `admin_username`, and
`admin_code` automatically. Requests 3, 4, 6, and 7 use those admin credentials
in the `X-Admin-Username` and `X-Admin-Code` headers.

| Request | Method and URL | Body / headers | Expected result |
| --- | --- | --- | --- |
| **1. Create room** | `POST {{base_url}}/api/rooms/` | JSON: `group_name`, `username`, optional `limit` and `end_time`. | `201`; returns separate `room_code` and personal `admin_code`. With no `end_time`, it expires in 15 minutes. The collection saves the returned codes and admin username. |
| **2. Join as guest** | `POST {{base_url}}/api/rooms/{{room_code}}/join/` | JSON: `{"username":"guest"}` | `200`; response role is `U`. A username already taken in this room returns `409`, so choose another username. |
| **3. Update room limit** | `PATCH {{base_url}}/api/rooms/{{room_code}}/admin/` | JSON: `{"limit":6}`; headers: `X-Admin-Username: {{admin_username}}`, `X-Admin-Code: {{admin_code}}`. | `200`; returns the updated room details. |
| **4. Promote guest to admin** | `POST {{base_url}}/api/rooms/{{room_code}}/admin/members/guest/promote/` | Headers: `X-Admin-Username: {{admin_username}}`, `X-Admin-Code: {{admin_code}}`. | `200`; returns the guest's personal `admin_code`. The collection saves it with `guest_admin_username`. |
| **5. Read message history** | `GET {{base_url}}/api/rooms/{{room_code}}/messages/?username=host&page=1&page_size=50` | No body or admin headers. | `200`; returns history for that room. The requested username must be a room member. |
| **6. Revoke guest admin** | `POST {{base_url}}/api/rooms/{{room_code}}/admin/members/guest/revoke/` | Headers: `X-Admin-Username: {{admin_username}}`, `X-Admin-Code: {{admin_code}}`. | `204 No Content`; guest returns to role `U` and their admin code is revoked. |
| **7. End room** | `DELETE {{base_url}}/api/rooms/{{room_code}}/admin/end/` | Headers: `X-Admin-Username: {{admin_username}}`, `X-Admin-Code: {{admin_code}}`. | `204 No Content`; room, members, messages, and connections are deleted. |

To end the room using the admin's personal code in the URL instead, change
request 7's URL to
`{{base_url}}/api/rooms/{{admin_code}}/admin/end/`. Keep both admin headers;
the username and code must still match.

The example collection uses `guest` for promotion and revocation and `host` for
history. If you change either username in requests 1 or 2, update the matching
URL/query in requests 4, 5, and 6. Request 4 saves the promoted admin
credentials for reference; the collection's later revoke request deliberately
continues to use the original host admin credentials.

For an extra admin-login check, send
`POST {{base_url}}/api/rooms/{{admin_code}}/join/` with JSON
`{"username":"host"}`. It should return `200`, role `A`, and the real
`room_code`. Using the same admin code with a different username should not
join the room. To verify duplicate-name handling, submit the guest join request
again; it should return `409 Username already exists`.

Request 5 shows message history; its `datetime` is readable UTC, for example
`"Oct 12, 2026, 12:00 PM UTC"`.

### Test chat in Postman

For chat, create a separate disposable room and join both `host` and `guest`.
In Postman, click **New > WebSocket** and connect the host using the admin code
returned by room creation:

```text
ws://127.0.0.1:8000/ws/chat/ADMIN_CODE/?username=host
```

For the guest, use the room code and the guest username:

```text
ws://127.0.0.1:8000/ws/chat/ROOM_CODE/?username=guest
```

In either connection's message box, send:

```json
{"message": "Hello, room!"}
```

Both connections receive a response like this:

```json
{
  "id": 1,
  "message": "Hello, room!",
  "username": "host",
  "datetime": "Oct 12, 2026, 12:00 PM UTC"
}
```

Message `datetime` values in chat and history use the readable UTC format
`Mon D, YYYY, h:mm AM/PM UTC`. The room is deleted when its last WebSocket
connection closes.

## WebSocket

Connect to `/ws/chat/{room_code}/?username={username}` after joining. For an
admin, use their personal admin code in place of `{room_code}`; it resolves
only with that admin's username. Send text frames containing JSON with a string
`message` field. Successful broadcasts contain `id`, `message`, `username`,
and `datetime`; invalid payloads return an `error` object. Messages are limited
to 4,000 characters and frames to 64 KiB. Room closure sends
`{"type":"room_closed"}` and closes the socket.

The current HTTP API accepts `end_time` for room expiration; it does not yet
expose `scheduled_start_time` or `scheduled_end_time` for scheduling a room.

PostgreSQL is the only supported database in every environment. Set
`DATABASE_URL` before starting the application or running tests. Django's test
runner creates a separate temporary PostgreSQL test database. For production,
also set `DJANGO_DEBUG=False`, `DJANGO_SECRET_KEY`, and `DJANGO_ALLOWED_HOSTS`;
the application refuses to start if these production settings are missing.

The connection username is not authenticated: anyone who knows the room code
can claim an existing room username. Admin actions require the admin's
username paired with their separate admin code. Use HTTPS/WSS in deployment to
protect that code in transit.
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