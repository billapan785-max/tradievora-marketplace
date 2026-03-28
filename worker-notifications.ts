export interface Env {
  FCM_SERVER_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    // Handle CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/send-notification") {
      return new Response("Not found", { status: 404 });
    }

    try {
      const { fcmToken, title, body, data } = await request.json() as any;

      if (!fcmToken || !title || !body) {
        return new Response("Missing required fields", { status: 400 });
      }

      const fcmResponse = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `key=${env.FCM_SERVER_KEY}`,
        },
        body: JSON.stringify({
          to: fcmToken,
          notification: {
            title,
            body,
            sound: "default",
          },
          data: {
            ...data,
            click_action: "FLUTTER_NOTIFICATION_CLICK",
          },
        }),
      });

      const result = await fcmResponse.json();

      return new Response(JSON.stringify(result), {
        status: fcmResponse.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  },
};
