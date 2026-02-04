export interface PrimaryMenuItem {
    slug: string;
    title: string;
    permalink: string;
    shape_svg: string;
    privacy: string;
    enabled: string;
}

export interface ProfileDropdownItem {
    slug: string;
    title: string;
    permalink: string;
    shape_svg: string;
    enabled: string;
}

export interface SidebarBottomLinkItem {
    title: string;
    permalink: string;
}

export interface SidebarBottomLinkGroup {
    title?: string;
    items: SidebarBottomLinkItem[];
}

declare global {
    interface Window {
        fcomModernFeed: {
            rest: {
                url: string;
                nonce: string;
            };
            ajaxUrl: string;
            ajaxNonce: string;
            pluginUrl: string;
            user: {
                id: number;
                name: string;
                username: string;
                avatar: string;
                email: string;
            } | null;
            isLoggedIn: boolean;
            loginUrl: string;
            registerUrl: string;
            logoutUrl: string;
            i18n: Record<string, string>;
            features: {
                reactions: boolean;
                comments: boolean;
                createPost: boolean;
                infiniteScroll: boolean;
                realTimeUpdates: boolean;
                mediaUpload: boolean;
                adminSettings: boolean;
                followersModule: boolean;
            };
            adminSettingsUrl: string;
            portalBaseUrl: string;
            /** Enabled social link providers from "Social Media Links Settings" (key -> title, placeholder, domain) */
            socialLinkProviders?: Record<string, { title: string; placeholder: string; domain: string }>;
            /** Primary Menu Items from Fluent Community settings (order preserved) */
            primaryMenuItems?: PrimaryMenuItem[];
            /** Profile Dropdown Items from Fluent Community settings (order preserved, URLs resolved) */
            profileDropdownItems?: ProfileDropdownItem[];
            /** Sidebar Bottom Link Groups from Fluent Community "Sidebar Bottom Link Groups" (Menu Settings) */
            sidebarBottomLinkGroups?: SidebarBottomLinkGroup[];
            /** Privacy flags from Fluent Community Privacy Settings */
            privacy?: {
                canViewMembersPage: boolean;
                canViewLeaderboardMembers: boolean;
                canDeactivateAccount: boolean;
            };
            settings: {
                tickerInterval: number;
                perPage: number;
            };
        };
    }
}

export interface ApiError {
    message: string;
    status?: number;
    errors?: Record<string, string[]>;
}

function getConfig(): NonNullable<typeof window.fcomModernFeed> {
    const config = window.fcomModernFeed;
    if (!config?.rest?.url) {
        throw new Error(
            '[FcomModernFeed] Configuration not loaded. Clear cache and reload, or ensure the plugin outputs fcomModernFeed before the app script.'
        );
    }
    return config;
}

class ApiClient {
    private get baseUrl(): string {
        return getConfig().rest.url;
    }

    private get nonce(): string {
        return getConfig().rest.nonce;
    }

    private async request<T>(
        method: string,
        endpoint: string,
        data?: Record<string, unknown>
    ): Promise<T> {
        const headers: HeadersInit = {
            'X-WP-Nonce': this.nonce,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };

        const actualMethod = method.toUpperCase();
        let url = `${this.baseUrl}/${endpoint}`;

        const options: RequestInit = {
            method: actualMethod,
            headers,
            credentials: 'same-origin',
        };

        if (method.toUpperCase() === 'GET' && data) {
            const params = new URLSearchParams();
            this.flattenParams(data, params);
            const queryString = params.toString();
            if (queryString) {
                url += `?${queryString}`;
            }
        } else if (data) {
            options.body = JSON.stringify(data);
        }

        // Debug: Log the actual request
        if (endpoint === 'feeds' && method.toUpperCase() === 'POST') {
            console.log('[ApiClient] POST feeds - URL:', url);
            console.log('[ApiClient] POST feeds - Body:', options.body);
        }

        const response = await fetch(url, options);

        // Handle nonce expiry
        if (response.status === 401 || response.status === 403) {
            const errorData = await response.json().catch(() => ({}));
            if (errorData.code === 'rest_cookie_invalid_nonce') {
                await this.renewNonce();
                // Retry the request
                return this.request<T>(method, endpoint, data);
            }
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({
                message: 'Request failed'
            }));
            throw {
                message: errorData.message || 'Request failed',
                status: response.status,
                errors: errorData.errors,
            } as ApiError;
        }

        return response.json();
    }

    private flattenParams(
        data: Record<string, unknown>,
        params: URLSearchParams,
        prefix = ''
    ): void {
        Object.entries(data).forEach(([key, value]) => {
            const paramKey = prefix ? `${prefix}[${key}]` : key;

            if (value === null || value === undefined) {
                return;
            }

            if (typeof value === 'object' && !Array.isArray(value)) {
                this.flattenParams(value as Record<string, unknown>, params, paramKey);
            } else if (Array.isArray(value)) {
                value.forEach((item, index) => {
                    if (typeof item === 'object') {
                        this.flattenParams(item as Record<string, unknown>, params, `${paramKey}[${index}]`);
                    } else {
                        params.append(`${paramKey}[]`, String(item));
                    }
                });
            } else {
                params.append(paramKey, String(value));
            }
        });
    }

    private async renewNonce(): Promise<void> {
        const config = getConfig();
        const formData = new FormData();
        formData.append('action', 'fcom_mf_renew_nonce');
        formData.append('security', config.ajaxNonce);

        const response = await fetch(config.ajaxUrl, {
            method: 'POST',
            credentials: 'same-origin',
            body: formData,
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.data?.nonce) {
                config.rest.nonce = data.data.nonce;
            }
        }
    }

    get<T>(endpoint: string, params?: object): Promise<T> {
        return this.request<T>('GET', endpoint, params as Record<string, unknown>);
    }

    post<T>(endpoint: string, data?: object): Promise<T> {
        return this.request<T>('POST', endpoint, data as Record<string, unknown>);
    }

    put<T>(endpoint: string, data?: object): Promise<T> {
        return this.request<T>('PUT', endpoint, data as Record<string, unknown>);
    }

    patch<T>(endpoint: string, data?: object): Promise<T> {
        return this.request<T>('PATCH', endpoint, data as Record<string, unknown>);
    }

    delete<T>(endpoint: string): Promise<T> {
        return this.request<T>('DELETE', endpoint);
    }

    async uploadFile(
        endpoint: string,
        formData: FormData
    ): Promise<{ media: { url: string; media_key: string; type: string; width?: number; height?: number } }> {
        const response = await fetch(`${this.baseUrl}/${endpoint}`, {
            method: 'POST',
            headers: {
                'X-WP-Nonce': this.nonce,
            },
            credentials: 'same-origin',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({
                message: 'Upload failed'
            }));
            throw {
                message: errorData.message || 'Upload failed',
                status: response.status,
            } as ApiError;
        }

        return response.json();
    }
}

export const api = new ApiClient();
