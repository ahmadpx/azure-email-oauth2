import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { PrismaClient } from "@prisma/client";
import { type Context } from "hono";
import {
  getAuthUrl,
  getTokens,
  refreshAccessToken,
  getUserInfo,
  getEmails,
} from "./azure.client";

const app = new Hono();
const prisma = new PrismaClient();

// Consent flow
app.get("/auth", (c) => {
  const email = c.req.query("email");

  if (!email) {
    return c.text("Email is required to start the authentication process", 400);
  }

  const authUrl = getAuthUrl(email);
  return c.redirect(authUrl);
});

// Callback handler
app.get("/auth/callback", async (c: Context) => {
  const code = c.req.query("code");
  const state = c.req.query("state");

  if (!code || !state) {
    return c.text("Authorization code or state is missing", 400);
  }

  try {
    const { email } = JSON.parse(Buffer.from(state, "base64").toString());
    console.log("Processing callback for email:", email);

    const tokenData = await getTokens(code);
    console.log("Token acquired successfully");

    const userInfo = await getUserInfo(tokenData.access_token);
    console.log("User info fetched:", userInfo.userPrincipalName);

    await prisma.user.upsert({
      where: { email },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      },
      create: {
        email,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      },
    });

    console.log("User upserted successfully");

    return c.text("Authentication successful! You can close this window.");
  } catch (error) {
    console.error("Error during authentication:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return c.text(
      `Authentication failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      500
    );
  }
});

// Read emails flow
app.get("/read-emails", async (c: Context) => {
  const email = c.req.query("email");

  if (!email) {
    return c.text("Email is required", 400);
  }

  try {
    console.log("Fetching user for email:", email);
    let user = await prisma.user.findUnique({
      where: { email: email },
    });

    if (!user) {
      console.log("User not found for email:", email);
      return c.text("User not found", 404);
    }

    console.log("User found:", user.email, "Expires at:", user.expiresAt);

    if (user.expiresAt <= new Date()) {
      console.log("Token expired, refreshing...");
      const newTokenData = await refreshAccessToken(user.refreshToken);
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          accessToken: newTokenData.access_token,
          refreshToken: newTokenData.refresh_token,
          expiresAt: new Date(Date.now() + newTokenData.expires_in * 1000),
        },
      });
    }

    console.log("Fetching emails with access token:", user.accessToken);

    const emails = await getEmails(user.accessToken);
    console.log("Emails fetched successfully");
    return c.json(emails);
  } catch (error) {
    console.error("Error reading emails:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return c.text(
      `Failed to read emails: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      500
    );
  }
});

const PORT = 3000;
console.log(`Server is running on http://localhost:${PORT}`);

serve({
  fetch: app.fetch,
  port: PORT,
});
