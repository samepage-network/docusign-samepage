import createAPIGatewayHandler from "samepage/backend/createAPIGatewayProxyHandler";
import { zOauthRequest, zOauthResponse } from "samepage/internal/types";
import { z } from "zod";
import axios from "axios";

const logic = async (
  args: z.infer<typeof zOauthRequest>
): Promise<z.infer<typeof zOauthResponse>> => {
  const { data } = await axios
    .post<{ access_token: string }>(
      `https://account-d.docusign.com/oauth/token`,
      {
        code: args.code,
        redirect_uri:
          process.env.NODE_ENV === "production"
            ? "https://samepage.network/oauth/docusign"
            : "https://samepage.ngrok.io/oauth/docusign",
        grant_type: "authorization_code",
      },
      {
        headers: {
          Accept: "application/json",
          Authorization: `Basic ${Buffer.from(
            `${process.env.OAUTH_CLIENT_ID}:${process.env.OAUTH_CLIENT_SECRET}`
          ).toString("base64")}`,
        },
      }
    )
    .catch((e) =>
      Promise.reject(
        new Error(`Failed to get access token: ${e.response.data}`)
      )
    );
  const { access_token } = data;
  const account = await axios
    .get<{ accounts: { account_name: string; account_id: string }[] }>(
      `https://account-d.docusign.com/oauth/userinfo`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    )
    .then((r) => r.data.accounts[0]);
  return {
    accessToken: access_token,
    workspace: account.account_id,
    label: account.account_name,
  };
};

export default createAPIGatewayHandler(logic);
