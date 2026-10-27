# Smart Service Management

## Start the frontend

From the project root:

```sh
cd frontend
npm install
npm run dev
```

## Start the backend

In a separate terminal from the project root:

```sh
cd backend
npm install
npm run dev
```

The backend runs on port 5000 and exposes `GET /api/health`.

## Production configuration

Set `VITE_API_BASE_URL` in the frontend build environment to the backend origin
(for example, `https://api.example.com`). If it is omitted, the frontend uses
`http://localhost:5000` for local development.

Set `FRONTEND_ORIGIN` on the backend to the deployed frontend origin. Multiple
origins may be comma-separated. In production, browser cross-origin requests
are denied when this variable is not configured. The backend also requires
`MONGO_URI` and a strong `JWT_SECRET`; keep both out of source control and
configure them only in the deployment environment.
