import fetch, { Response as FetchResponse } from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const TENANT_ID = "common";
const REDIRECT_URI = process.env.REDIRECT_URI;

console.log({
  CLIENT_ID,
  CLIENT_SECRET,
  TENANT_ID,
  REDIRECT_URI,
});

const SCOPES = [
  "openid",
  "profile",
  "offline_access",
  "https://graph.microsoft.com/User.Read",
  "https://graph.microsoft.com/Mail.Read",
];

const AZURE_ENDPOINTS = {
  AUTHORIZE: `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize`,
  TOKEN: `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
  GRAPH_ME: "https://graph.microsoft.com/v1.0/me",
  GRAPH_MESSAGES: "https://graph.microsoft.com/v1.0/me/messages",
};

export function getAuthUrl(email: string): string {
  const state = Buffer.from(JSON.stringify({ email })).toString("base64");
  const encodedScopes = encodeURIComponent(SCOPES.join(" "));
  return `${
    AZURE_ENDPOINTS.AUTHORIZE
  }?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(
    REDIRECT_URI ?? ""
  )}&scope=${encodedScopes}&state=${state}&prompt=consent&tenant=${TENANT_ID}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

async function handleResponse<T>(response: FetchResponse): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    const errorData = data as ErrorResponse;
    throw new Error(errorData.error?.message || "An error occurred");
  }
  return data as T;
}

export async function getTokens(code: string): Promise<TokenResponse> {
  const response = await fetch(AZURE_ENDPOINTS.TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID ?? "",
      client_secret: CLIENT_SECRET ?? "",
      code: code,
      redirect_uri: REDIRECT_URI ?? "",
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await handleResponse<TokenResponse>(response);
  console.log("Token data received:", {
    access_token: tokenData.access_token.substring(0, 10) + "...",
    expires_in: tokenData.expires_in,
    token_type: tokenData.token_type,
  });
  return tokenData;
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<TokenResponse> {
  const response = await fetch(AZURE_ENDPOINTS.TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID ?? "",
      client_secret: CLIENT_SECRET ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  return handleResponse<TokenResponse>(response);
}

interface UserInfo {
  id: string;
  displayName: string;
  userPrincipalName: string;
}

export async function getUserInfo(accessToken: string): Promise<UserInfo> {
  console.log(
    "Fetching user info with access token:",
    accessToken.substring(0, 10) + "..."
  );

  // Add a small delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const response = await fetch(AZURE_ENDPOINTS.GRAPH_ME, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  console.log("Response status:", response.status);
  console.log("Response headers:", response.headers);

  const responseText = await response.text();
  console.log("Response body:", responseText);

  if (!response.ok) {
    console.error("Error fetching user info. Status:", response.status);
    console.error("Response body:", responseText);
    throw new Error(`Failed to fetch user info: ${responseText}`);
  }

  return JSON.parse(responseText) as UserInfo;
}

interface Email {
  id: string;
  subject: string;
  bodyPreview: string;
  receivedDateTime: string;
}

interface EmailsResponse {
  value: Email[];
}

export async function getEmails(accessToken: string): Promise<Email[]> {
  const response = await fetch(`${AZURE_ENDPOINTS.GRAPH_MESSAGES}?$top=10`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const emailsData = await handleResponse<EmailsResponse>(response);
  return emailsData.value;
}
