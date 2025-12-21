import { format } from 'date-fns';

export const formatDate = (date, pattern = 'yyyy-MM-dd') => {
    return format(new Date(date), pattern);
};

export const formatTime = (date) => {
    return format(new Date(date), 'HH:mm:ss');
};

export const calculatePace = (duration, distance) => {
    if (!distance || !duration) return '0.00';
    return (duration / distance).toFixed(2);
};
