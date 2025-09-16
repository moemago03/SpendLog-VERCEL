

import { Category } from './types';

export const CATEGORY_COLORS = [
    '#3B82F6', '#2563EB', '#06B6D4', '#8B5CF6', '#EF4444', '#EC4899', '#F59E0B', '#10B981'
];

export const CATEGORY_ICONS = [
    '💰', '🛒', '🛍️', '🍽️', '🚌', '✈️', '🎮', '🏠', '❤️', '💼', '↔️', '🧾', '☂️', '✉️', '📊', '✨', '📄', '🏀', '☕️', '💊', '🎁', '🎟️', '🏥', '⛽️'
];

export const TRIP_CARD_COLORS = [
    '#3B82F6', // Blue
    '#705574', // Mauve
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#EF4444', // Red
    '#06B6D4', // Cyan
];

export const DEFAULT_CATEGORIES: Category[] = [
    { id: 'cat-1', name: 'Cibo', icon: '🍔', color: '#FF9800' },
    { id: 'cat-2', name: 'Alloggio', icon: '🏠', color: '#795548' },
    { id: 'cat-3', name: 'Trasporti', icon: '🚆', color: '#2196F3' },
    { id: 'cat-4', name: 'Attività', icon: '🏞️', color: '#4CAF50' },
    { id: 'cat-5', name: 'Shopping', icon: '🛍️', color: '#E91E63' },
    { id: 'cat-6', name: 'Visti', icon: '🛂', color: '#607D8B' },
    { id: 'cat-7', name: 'Assicurazione', icon: '🛡️', color: '#00BCD4' },
    { id: 'cat-8', name: 'Varie', icon: '📦', color: '#9E9E9E' },
];

export const COUNTRIES_CURRENCIES: { [key: string]: string } = {
    'Thailandia': 'THB',
    'Vietnam': 'VND',
    'Cambogia': 'KHR',
    'Laos': 'LAK',
    'Malesia': 'MYR',
    'Singapore': 'SGD',
    'Indonesia': 'IDR',
    'Filippine': 'PHP',
    'Giappone': 'JPY',
    'Corea del Sud': 'KRW',
    'Cina': 'CNY',
    'Stati Uniti': 'USD',
    'Area Euro': 'EUR',
    'Regno Unito': 'GBP',
};

// New constant for flag colors
export const COUNTRY_FLAG_COLORS: { [key: string]: string } = {
    'Thailandia': '#00247D', // Blue
    'Vietnam': '#DA251D',    // Red
    'Cambogia': '#002B7F',   // Blue
    'Laos': '#002868',       // Blue
    'Malesia': '#0032A0',    // Blue
    'Singapore': '#ED2939',  // Red
    'Indonesia': '#CE1126',  // Red
    'Filippine': '#0038A8',  // Blue
    'Giappone': '#BC002D',   // Red circle color
    'Corea del Sud': '#0047A0', // Blue
    'Cina': '#EE1C25',       // Red
    'Stati Uniti': '#B22234', // Red
    'Area Euro': '#003399',  // EU Blue
    'Regno Unito': '#012169',// Blue
};


export const CURRENCY_TO_COUNTRY: { [key: string]: string } = Object.entries(
    COUNTRIES_CURRENCIES
).reduce((acc, [country, currency]) => {
    if (!acc[currency]) {
        acc[currency] = country;
    }
    return acc;
}, {} as { [key: string]: string });


export const ALL_CURRENCIES = ['EUR', 'USD', 'GBP', 'THB', 'VND', 'KHR', 'LAK', 'MYR', 'SGD', 'IDR', 'PHP', 'JPY', 'KRW', 'CNY'];

// Mock exchange rates relative to EUR
export const MOCK_EXCHANGE_RATES: { [key: string]: number } = {
    'EUR': 1,
    'USD': 1.08,
    'GBP': 0.85,
    'THB': 39.50,
    'VND': 27500,
    'KHR': 4400,
    'LAK': 23500,
    'MYR': 5.10,
    'SGD': 1.46,
    'IDR': 17500,
    'PHP': 63.50,
    'JPY': 168.0,
    'KRW': 1480,
    'CNY': 7.80,
};

// New constant for currency details including flag codes
export const CURRENCY_INFO: { [key: string]: { name: string; flag: string; } } = {
    'EUR': { name: 'Area Euro', flag: 'eu' },
    'USD': { name: 'Stati Uniti', flag: 'us' },
    'GBP': { name: 'Regno Unito', flag: 'gb' },
    'THB': { name: 'Thailandia', flag: 'th' },
    'VND': { name: 'Vietnam', flag: 'vn' },
    'KHR': { name: 'Cambogia', flag: 'kh' },
    'LAK': { name: 'Laos', flag: 'la' },
    'MYR': { name: 'Malesia', flag: 'my' },
    'SGD': { name: 'Singapore', flag: 'sg' },
    'IDR': { name: 'Indonesia', flag: 'id' },
    'PHP': { name: 'Filippine', flag: 'ph' },
    'JPY': { name: 'Giappone', flag: 'jp' },
    'KRW': { name: 'Corea del Sud', flag: 'kr' },
    'CNY': { name: 'Cina', flag: 'cn' },
};