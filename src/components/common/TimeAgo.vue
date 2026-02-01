<script setup lang="ts">
import { computed } from 'vue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const props = defineProps<{
    date: string;
    format?: 'relative' | 'absolute' | 'auto';
}>();

const formattedDate = computed(() => {
    const d = dayjs(props.date);
    const now = dayjs();
    const diffHours = now.diff(d, 'hour');

    if (props.format === 'absolute') {
        return d.format('MMM D, YYYY [at] h:mm A');
    }

    if (props.format === 'relative' || diffHours < 24) {
        const diffMinutes = now.diff(d, 'minute');
        const diffDays = now.diff(d, 'day');

        if (diffMinutes < 1) {
            return window.fcomModernFeed.i18n.justNow || 'Just now';
        }
        if (diffMinutes < 60) {
            const template = window.fcomModernFeed.i18n.minutesAgo || '%d minutes ago';
            return template.replace('%d', String(diffMinutes));
        }
        if (diffHours < 24) {
            const template = window.fcomModernFeed.i18n.hoursAgo || '%d hours ago';
            return template.replace('%d', String(diffHours));
        }
        if (diffDays < 7) {
            const template = window.fcomModernFeed.i18n.daysAgo || '%d days ago';
            return template.replace('%d', String(diffDays));
        }
    }

    // For older dates, show full date
    if (d.year() === now.year()) {
        return d.format('MMM D');
    }
    return d.format('MMM D, YYYY');
});

const fullDate = computed(() => {
    return dayjs(props.date).format('MMMM D, YYYY [at] h:mm A');
});
</script>

<template>
    <time
        :datetime="date"
        :title="fullDate"
        class="fcom-mf-time-ago"
    >
        {{ formattedDate }}
    </time>
</template>

<style lang="scss" scoped>
.fcom-mf-time-ago {
    color: $text-secondary;
    font-size: $font-size-sm;
    cursor: default;
}
</style>
