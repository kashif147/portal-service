# Portal Service

## Environment Configuration

This service uses environment-specific configuration files:

- `.env.development` - Development environment variables
- `.env.staging` - Staging environment variables

The appropriate environment file is automatically loaded based on the `NODE_ENV` environment variable.

## Available Scripts

- `npm start` - Start the service in production mode
- `npm run dev` - Start the service in development mode
- `npm run staging` - Start the service in staging mode
- `npm run dev:watch` - Start the service in development mode with auto-restart
- `npm run staging:watch` - Start the service in staging mode with auto-restart

## Environment Variables

Make sure to configure the following environment variables in your respective `.env` files:

- `NODE_ENV` - Environment (development/staging)
- `PORT` - Server port (default: 4000)
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - JWT secret for authentication
- `POLICY_SERVICE_URL` - Policy service URL
- `USER_SERVICE_URL` - User service URL
- `PORTAL_SERVICE_URL` - Portal service URL
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins
