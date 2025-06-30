import { UptimeWorkerConfig } from "./packages/uptime-worker/src/types";

export const uptimeWorkerConfig: UptimeWorkerConfig = {
  monitors: [
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
      name: "http-echos-echo",
      target: "https://demo.hobroker.me",
      protectedByZeroTrust: true,
    },
  ],
};
