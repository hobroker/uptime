import { UptimeWorkerConfig } from "./types";

export const uptimeWorkerConfig: UptimeWorkerConfig = {
  monitors: [
    {
      name: "Plex",
      target: "https://plex.hobroker.me",
    },
    {
      name: "Sonarr",
      target: "https://sonarr.hobroker.me",
    },
    {
      name: "Radarr",
      target: "https://radarr.hobroker.me",
    },
    {
      name: "Prowlarr",
      target: "https://prowlarr.hobroker.me",
    },
    {
      name: "Tautulli",
      target: "https://tautulli.hobroker.me",
    },
    {
      name: "Code Server",
      target: "https://code.hobroker.me",
    },
    {
      name: "qBittorrent",
      target: "https://qbittorrent.hobroker.me",
    },
    {
      name: "http-echos-echo",
      target: "https://demo.hobroker.me",
    },
  ],
};
