import { UptimeWorkerConfig } from "./packages/uptime-worker/src/types";

export const uptimeWorkerConfig: UptimeWorkerConfig = {
  monitors: [
    {
      name: "Rancher",
      target: "https://rancher.hobroker.me",
      protectedByZeroTrust: true,
    },
    {
      name: "Sonarr",
      target: "https://sonarr.hobroker.me",
      protectedByZeroTrust: true,
    },
    {
      name: "Radarr",
      target: "https://radarr.hobroker.me",
      protectedByZeroTrust: true,
    },
    {
      name: "Prowlarr",
      target: "https://prowlarr.hobroker.me",
      protectedByZeroTrust: true,
    },
    {
      name: "Tautulli",
      target: "https://tautulli.hobroker.me",
      protectedByZeroTrust: true,
    },
    {
      name: "qBittorrent",
      target: "https://qbittorrent.hobroker.me",
      protectedByZeroTrust: true,
    },
    {
      name: "VS Code",
      target: "https://code.hobroker.me",
      protectedByZeroTrust: true,
    },
    {
      name: "Syncthing",
      target: "https://syncthing.hobroker.me",
      protectedByZeroTrust: true,
    },
    {
      name: "n8n",
      target: "https://n8n.hobroker.me",
      protectedByZeroTrust: true,
    },
    {
      name: "http-echos-echo",
      target: "https://demo.hobroker.me",
      protectedByZeroTrust: true,
    },
  ],
};
