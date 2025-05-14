import { UptimeWorkerConfig } from './types';

const uptimeWorkerConfig: UptimeWorkerConfig = {
	monitors: [
		{
			name: 'Plex',
			target: 'https://plex.hobroker.me',
		},
		{
			name: 'Sonarr',
			target: 'https://sonarr.hobroker.me',
		},
		{
			name: 'Radarr',
			target: 'https://radarr.hobroker.me',
		},
		{
			name: 'Prowlarr',
			target: 'https://prowlarr.hobroker.me',
		},
		{
			name: 'Code Server',
			target: 'https://code.hobroker.me',
		},
		{
			name: 'Qbittorrent',
			target: 'https://qbittorrent.hobroker.me',
		},
		{
			name: 'Demo',
			target: 'https://demo.hobroker.me',
		},
	],
};

export { uptimeWorkerConfig };
