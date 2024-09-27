# Azure AD Email Authentication and Reader

This application demonstrates how to authenticate users with Azure AD and read their emails using Microsoft Graph API. It's built with TypeScript, Hono, and Prisma.

## Features

- Azure AD authentication flow
- Token management (including refresh)
- Email reading from authenticated users
- User data persistence with Prisma

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Azure AD application (for client ID and secret)
- PostgreSQL database

## Setup

1. Clone the repository:

   ```
   git clone <repository-url>
   cd <project-directory>
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Set up your environment variables:
   Create a `.env` file in the root directory and add the following:

   ```
   AZURE_CLIENT_ID=your_azure_client_id
   AZURE_CLIENT_SECRET=your_azure_client_secret
   REDIRECT_URI=http://localhost:3000/auth/callback
   DATABASE_URL=your_postgresql_database_url
   ```

4. Set up the database:

   ```
   npx prisma migrate dev
   ```

5. Start the server:
   ```
   npm start
   ```

## Usage

1. Initiate authentication:

   ```
   GET /auth?email=user@example.com
   ```

   This will redirect the user to the Azure AD login page.

2. Handle the callback:
   The user will be redirected to `/auth/callback` after successful authentication.

3. Read emails:
   ```
   GET /read-emails?email=user@example.com
   ```
   This will return the 10 most recent emails for the authenticated user.

## API Endpoints

- `GET /auth`: Starts the authentication flow
- `GET /auth/callback`: Handles the OAuth callback
- `GET /read-emails`: Retrieves emails for an authenticated user

## Security Considerations

- Ensure that your Azure AD application is properly configured with the correct permissions.
- Keep your `.env` file secure and never commit it to version control.
- Use HTTPS in production to protect user data and tokens.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
