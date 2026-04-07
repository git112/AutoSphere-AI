import api from './api';

export const getInstagramAuthUrl = async (): Promise<string> => {
    const { data } = await api.get<{url: string}>('/api/instagram/auth-url');
    return data.url;
};

export const checkInstagramStatus = async (): Promise<boolean> => {
    try {
        const { data } = await api.get<{connected: boolean}>('/api/instagram/status');
        return data.connected;
    } catch {
        return false;
    }
};
