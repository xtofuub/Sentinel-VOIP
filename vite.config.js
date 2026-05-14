import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";
import process from "node:process";
import { LOCAL_LANGUAGE_OPTIONS, getLocalPranksForCountry } from "./src/lib/prankLibrary.js";

const readJsonBody = async (req) =>
  new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });

const sendJson = (res, payload) => {
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
};

const localApiMock = () => ({
  name: "sentinel-local-api-mock",
  configureServer(server) {
    server.middlewares.use("/api", async (req, res) => {
      const endpoint = (req.url || "").replace(/^\//, "").split("?")[0];
      const body = await readJsonBody(req);

      if (endpoint === "create.lua") {
        sendJson(res, { ok: true, res: "OK", message: "Local mock session created." });
        return;
      }

      if (endpoint === "get_user.lua") {
        sendJson(res, { ok: true, res: "OK", uid: body.uid || body.did || "LOCAL-MOCK-USER" });
        return;
      }

      if (endpoint === "get_dialplan_list" || endpoint === "get_dialplan_list.lua") {
        sendJson(res, {
          ok: true,
          dialplan_list: LOCAL_LANGUAGE_OPTIONS.map((language, index) => ({
            _id: language.country,
            id: language.country,
            c: language.country,
            tname: language.label,
            name: language.label,
            label: language.label,
            locale: language.locale,
            flag: language.flag,
            count: language.count,
            order_multi: language.order || index + 1,
          })),
        });
        return;
      }

      if (endpoint === "get_dialplan_ios.lua") {
        const country = String(body.c || "us").toLowerCase();
        sendJson(
          res,
          getLocalPranksForCountry(country),
        );
        return;
      }

      if (endpoint === "create_task_ios.lua") {
        sendJson(res, {
          ok: true,
          res: "queued",
          message: "Local mock accepted the run. No recording is generated in preview mode.",
          taskId: body._id,
        });
        return;
      }

      res.statusCode = 404;
      sendJson(res, { ok: false, error: `Unknown local mock endpoint: ${endpoint}` });
    });
  },
});

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_API_PROXY_TARGET;

  return {
    plugins: [react(), tailwindcss(), ...(!proxyTarget ? [localApiMock()] : [])],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      proxy: proxyTarget
        ? {
            "/api": {
              target: proxyTarget,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api/, ""),
            },
          }
        : undefined,
    },
  };
});
