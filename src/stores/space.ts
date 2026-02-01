import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/api/client';
import type { SpaceFull, SpacesResponse } from '@/api/types';

export const useSpaceStore = defineStore('space', () => {
    // State
    const mySpaces = ref<SpaceFull[]>([]);
    const allSpaces = ref<SpaceFull[]>([]);
    const loading = ref(false);
    const initialized = ref(false);

    // Getters
    const hasMultipleSpaces = computed(() => mySpaces.value.length > 1);

    const canPostSpaces = computed(() => {
        // Return all spaces from mySpaces - these are already spaces user can post to
        // The is_member flag may not always be set when fetched via my_spaces endpoint
        return mySpaces.value;
    });

    // Actions
    async function fetchMySpaces(forceRefresh = false): Promise<void> {
        if (initialized.value && !forceRefresh) return;
        if (loading.value) return; // Prevent concurrent fetches

        loading.value = true;
        try {
            // GET /spaces/ returns only spaces where user is a member (see SpaceController@get)
            const response = await api.get<{ spaces: SpaceFull[] }>('spaces');

            console.log('[FcomModernFeed] Spaces API response:', response);

            // Response format is { spaces: [...] }
            if (response.spaces && Array.isArray(response.spaces)) {
                mySpaces.value = response.spaces;
            } else if (Array.isArray(response)) {
                mySpaces.value = response;
            } else {
                mySpaces.value = [];
            }

            console.log('[FcomModernFeed] Loaded user spaces:', mySpaces.value);
            initialized.value = true;
        } catch (error) {
            console.error('[FcomModernFeed] Failed to fetch spaces:', error);
            // Don't set initialized to true on error, allow retry
            mySpaces.value = [];
        } finally {
            loading.value = false;
        }
    }

    async function fetchAllSpaces(params: { page?: number; search?: string } = {}): Promise<SpaceFull[]> {
        loading.value = true;
        try {
            const response = await api.get<SpacesResponse>('spaces', {
                page: params.page || 1,
                per_page: 20,
                search: params.search,
            });

            const spaces = response.spaces?.data || [];

            if (params.page === 1 || !params.page) {
                allSpaces.value = spaces;
            } else {
                allSpaces.value = [...allSpaces.value, ...spaces];
            }

            return spaces;
        } catch (error) {
            console.error('Failed to fetch spaces:', error);
            return [];
        } finally {
            loading.value = false;
        }
    }

    function getSpaceById(id: number): SpaceFull | undefined {
        return mySpaces.value.find(s => s.id === id) || allSpaces.value.find(s => s.id === id);
    }

    function reset(): void {
        mySpaces.value = [];
        allSpaces.value = [];
        initialized.value = false;
    }

    return {
        // State
        mySpaces,
        allSpaces,
        loading,
        initialized,

        // Getters
        hasMultipleSpaces,
        canPostSpaces,

        // Actions
        fetchMySpaces,
        fetchAllSpaces,
        getSpaceById,
        reset,
    };
});
