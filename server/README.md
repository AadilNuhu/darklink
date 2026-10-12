# Darklink backend

This is the API guide for the frontend. Darklink has no accounts or passwords.
Users join a room with a code and a username. Usernames must be unique in each
room.

## Codes and roles

- **Room code:** share with participants. It joins them as regular users.
- **Admin code:** private to one admin and paired with that admin's username.
  Use it with that username to join as an admin.
- Both codes are randomly generated 8-character codes.
- A regular username already taken in the room gets `409 Username already
  exists`. Admins can reconnect with their own admin code.
- An admin can promote a selected room member. The promoted member gets their
  own admin code.

## Main API

All endpoints start with `/api/rooms/`. Send and receive JSON unless noted.

### Create a room

`POST /api/rooms/`

```json
{
  "group_name": "Study group",
  "username": "host",
  "limit": 8,
  "end_time": "2026-10-12T18:00:00Z"
}
```

`username` and `group_name` are required. `limit` is optional (default `1`,
including the host; use `null` for no limit). `end_time` is optional; if left
out or set to `null`, the room expires 15 minutes after creation.

The `201` response includes `room_code`, `username`, `admin_code`, `limit`,
`start_time`, and `end_time`. Save the admin code when creating the room; it
cannot be retrieved later.

### Join a room

`POST /api/rooms/{code}/join/`

Use the room code for a regular user, or their personal admin code for an
admin. The request body is:

```json
{"username": "guest"}
```

A successful `200` response includes `room_code`, `username`, and `role`
(`"U"` for regular user, `"A"` for admin). When joining with an admin code,
`code` is the admin code in the URL and `username` must be its owner. Using an
admin code with a different username does not reveal the room.

### Read chat history

`GET /api/rooms/{room_code}/messages/?username=guest&page=1&page_size=50`

Returns `count`, `page`, `page_size`, and `results`. Each message has `id`,
`username`, `content`, and `datetime`. The username must belong to the room.
Page size defaults to 50 and is capped at 100.

### Admin actions

For these actions, send both headers:

```text
X-Admin-Username: host
X-Admin-Code: <that admin's private code>
```

| Action | Request | Body |
| --- | --- | --- |
| Change room settings | `PATCH /api/rooms/{room_code}/admin/` | `{"limit": 8}` and/or `{"end_time": "2026-10-12T18:00:00Z"}` |
| Promote a member | `POST /api/rooms/{room_code}/admin/members/{username}/promote/` | None |
| Remove admin access | `POST /api/rooms/{room_code}/admin/members/{username}/revoke/` | None |
| End and delete the room | `DELETE /api/rooms/{room_code}/admin/end/` | None |

Promotion returns the selected member's `username` and new `admin_code`. Keep
that code private. A room must always have at least one admin.

For **End and delete the room**, use the room code in the URL as shown above.
The admin code also works in place of `{room_code}`. In either case, send both
admin headers. Success returns `204 No Content`; the room, members, messages,
and connections are deleted.

## WebSocket chat

Connect to:

```text
ws://localhost:8000/ws/chat/{code}/?username={username}
```

Use the room code for a regular user and that user's admin code for an admin.
Send messages as:

```json
{"message": "Hello!"}
```

Everyone connected receives:

```json
{
  "id": 1,
  "message": "Hello!",
  "username": "guest",
  "datetime": "Oct 12, 2026, 12:00 PM UTC"
}
```

Messages can be up to 4,000 characters. Invalid messages return an `error`
field. When a room ends or is deleted, connected clients receive
`{"type":"room_closed"}`. The room is also deleted when its last participant
disconnects.

## Try it with Postman

1. Start the backend from the `server` directory:

   ```powershell
   pipenv run python manage.py runserver 127.0.0.1:8000
   ```
2. Import [the Darklink API collection](./postman/Darklink%20API.postman_collection.json)
   into Postman.
3. Run **1. Create room** first. Postman saves the room code and admin
   credentials for the other example requests.
4. Run the numbered requests. For **7. End room**, the default URL uses the
   room code; both admin headers are already included.

## Backend setup

PostgreSQL is required. Set `DATABASE_URL` before starting the app. For
production, also set `DJANGO_DEBUG=False`, `DJANGO_SECRET_KEY`, and
`DJANGO_ALLOWED_HOSTS`. Set `REDIS_URL` when running multiple ASGI workers.
Schedule `python manage.py cleanup_rooms` at least once per minute to remove
expired rooms and stale connections.
