import { UptimeWorkerConfig } from "./src/types";

const zeroTrustAuth = ({ env }: { env: Env }) => ({
  "CF-Access-Client-Id": env.CF_ACCESS_CLIENT_ID,
  "CF-Access-Client-Secret": env.CF_ACCESS_CLIENT_SECRET,
});

export const uptimeWorkerConfig: UptimeWorkerConfig = {
  statuspageUrl: "https://hobroker.statuspage.io",
  checks: [
    {
      name: "Rancher",
      target: "https://rancher.hobroker.me",
      headers: zeroTrustAuth,
      retryCount: 1,
    },
    {
      name: "Sonarr",
      target: "https://sonarr.hobroker.me",
      headers: zeroTrustAuth,
      retryCount: 1,
    },
    {
      name: "Radarr",
      target: "https://radarr.hobroker.me",
      headers: zeroTrustAuth,
      retryCount: 1,
    },
    {
      name: "Prowlarr",
      target: "https://prowlarr.hobroker.me",
      headers: zeroTrustAuth,
      retryCount: 1,
    },
    {
      name: "Tautulli",
      target: "https://tautulli.hobroker.me",
      headers: zeroTrustAuth,
      retryCount: 1,
    },
    {
      name: "qBittorrent",
      target: "https://qbittorrent.hobroker.me",
      headers: zeroTrustAuth,
      retryCount: 1,
    },
    {
      name: "VS Code",
      target: "https://code.hobroker.me",
      headers: zeroTrustAuth,
      retryCount: 1,
    },
    {
      name: "Syncthing",
      target: "https://syncthing.hobroker.me",
      headers: zeroTrustAuth,
      retryCount: 1,
    },
    {
      name: "n8n",
      target: "https://n8n.hobroker.me",
      headers: zeroTrustAuth,
      retryCount: 1,
    },
    {
      name: "http-echos-echo",
      target: "https://demo.hobroker.me",
      headers: zeroTrustAuth,
      retryCount: 1,
    },
  ],
};
