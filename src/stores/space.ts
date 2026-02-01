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
        // Return spaces where user can post (is member)
        return mySpaces.value.filter(space => space.is_member);
    });

    // Actions
    async function fetchMySpaces(): Promise<void> {
        if (initialized.value) return;

        loading.value = true;
        try {
            const response = await api.get<SpacesResponse>('spaces', {
                my_spaces: true,
                per_page: 100,
            });

            // Get my_spaces from response if available, otherwise filter from spaces
            if (response.my_spaces) {
                mySpaces.value = response.my_spaces;
            } else if (response.spaces?.data) {
                mySpaces.value = response.spaces.data.filter(s => s.is_member);
            }

            initialized.value = true;
        } catch (error) {
            console.error('Failed to fetch spaces:', error);
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
