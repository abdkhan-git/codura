# Social Networking API Endpoints

## User Search & Discovery

### 1. Search Users
**Endpoint:** `GET /api/users/search`

Search for users with advanced filters.

**Query Parameters:**
- `q` (string, optional): Search query (searches username, full_name, university, job_title)
- `university` (string, optional): Filter by university
- `graduation_year` (string, optional): Filter by graduation year
- `min_solved` (number, optional): Minimum problems solved
- `max_solved` (number, optional): Maximum problems solved
- `page` (number, default: 1): Page number
- `limit` (number, default: 25, max: 50): Results per page

**Response:**
```json
{
  "users": [
    {
      "user_id": "uuid",
      "username": "string",
      "full_name": "string",
      "avatar_url": "string | null",
      "university": "string | null",
      "graduation_year": "string | null",
      "job_title": "string | null",
      "bio": "string | null",
      "total_solved": 0,
      "current_streak": 0,
      "contest_rating": 0,
      "connection_status": "none | pending_sent | pending_received | connected | blocked",
      "mutual_connections_count": 0,
      "is_public": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 100,
    "totalPages": 4,
    "hasMore": true
  }
}
```

**Example:**
```
GET /api/users/search?q=software&university=MIT&min_solved=50&page=1&limit=25
```

---

### 2. Connection Suggestions
**Endpoint:** `GET /api/users/suggestions`

Get personalized connection suggestions based on:
- Same university
- Mutual connections
- Similar problem-solving level
- Not already connected

**Query Parameters:**
- `limit` (number, default: 10, max: 20): Number of suggestions

**Response:**
```json
{
  "suggestions": [
    {
      "user_id": "uuid",
      "username": "string",
      "full_name": "string",
      "avatar_url": "string | null",
      "university": "string | null",
      "graduation_year": "string | null",
      "job_title": "string | null",
      "bio": "string | null",
      "total_solved": 0,
      "current_streak": 0,
      "contest_rating": 0,
      "connection_status": "none",
      "mutual_connections_count": 0,
      "is_public": true
    }
  ]
}
```

**Example:**
```
GET /api/users/suggestions?limit=10
```

---

### 3. User Connections List
**Endpoint:** `GET /api/users/[username]/connections`

Get a user's connections (public list, respects privacy settings).

**URL Parameters:**
- `username` (string): Username of the user

**Query Parameters:**
- `page` (number, default: 1): Page number
- `limit` (number, default: 20, max: 50): Results per page

**Response:**
```json
{
  "connections": [
    {
      "user_id": "uuid",
      "username": "string",
      "full_name": "string",
      "avatar_url": "string | null",
      "university": "string | null",
      "graduation_year": "string | null",
      "job_title": "string | null",
      "bio": "string | null",
      "total_solved": 0,
      "current_streak": 0,
      "contest_rating": 0,
      "connection_status": "none | pending_sent | pending_received | connected",
      "mutual_connections_count": 0,
      "is_public": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3,
    "hasMore": true
  }
}
```

**Example:**
```
GET /api/users/johndoe/connections?page=1&limit=20
```

---

## Testing the Endpoints

### Using curl:

**1. Test User Search:**
```bash
curl -X GET "http://localhost:3000/api/users/search?q=developer&limit=5" \
  -H "Cookie: your-session-cookie"
```

**2. Test Connection Suggestions:**
```bash
curl -X GET "http://localhost:3000/api/users/suggestions?limit=5" \
  -H "Cookie: your-session-cookie"
```

**3. Test User Connections:**
```bash
curl -X GET "http://localhost:3000/api/users/johndoe/connections?page=1&limit=10" \
  -H "Cookie: your-session-cookie"
```

### Using the browser console:

```javascript
// Test search
const searchResults = await fetch('/api/users/search?q=software&limit=10').then(r => r.json());
console.log(searchResults);

// Test suggestions
const suggestions = await fetch('/api/users/suggestions?limit=5').then(r => r.json());
console.log(suggestions);

// Test connections
const connections = await fetch('/api/users/johndoe/connections').then(r => r.json());
console.log(connections);
```

---

## Error Responses

All endpoints return standard error responses:

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**403 Forbidden:**
```json
{
  "error": "This profile is private"
}
```

**404 Not Found:**
```json
{
  "error": "User not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error"
}
```
