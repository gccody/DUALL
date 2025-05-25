import { FontAwesome5, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import React from 'react';

export interface BuiltInIcon {
    id: string;
    name: string;
    pack: 'material' | 'fontAwesome' | 'ionicons' | 'materialCommunity';
    iconName: string;
    color: string;
}

export const iconCategories = [
    { id: 'social', name: 'Social Media' },
    { id: 'financial', name: 'Financial' },
    { id: 'technology', name: 'Technology' },
    { id: 'shopping', name: 'Shopping' },
    { id: 'entertainment', name: 'Entertainment' },
    { id: 'productivity', name: 'Productivity' },
    { id: 'general', name: 'General' }
];

export const builtInIcons: Record<string, BuiltInIcon[]> = {
    social: [
        { id: 'facebook', name: 'Facebook', pack: 'fontAwesome', iconName: 'facebook', color: '#1877F2' },
        { id: 'twitter', name: 'Twitter', pack: 'fontAwesome', iconName: 'twitter', color: '#1DA1F2' },
        { id: 'instagram', name: 'Instagram', pack: 'fontAwesome', iconName: 'instagram', color: '#C13584' },
        { id: 'linkedin', name: 'LinkedIn', pack: 'fontAwesome', iconName: 'linkedin', color: '#0077B5' },
        { id: 'reddit', name: 'Reddit', pack: 'fontAwesome', iconName: 'reddit', color: '#FF4500' },
        { id: 'tiktok', name: 'TikTok', pack: 'fontAwesome', iconName: 'tiktok', color: '#000000' },
        { id: 'discord', name: 'Discord', pack: 'fontAwesome', iconName: 'discord', color: '#7289DA' },
        { id: 'snapchat', name: 'Snapchat', pack: 'fontAwesome', iconName: 'snapchat', color: '#FFFC00' },
    ],
    financial: [
        { id: 'bank', name: 'Bank', pack: 'material', iconName: 'account-balance', color: '#2E7D32' },
        { id: 'credit-card', name: 'Credit Card', pack: 'material', iconName: 'credit-card', color: '#1565C0' },
        { id: 'paypal', name: 'PayPal', pack: 'fontAwesome', iconName: 'paypal', color: '#00457C' },
        { id: 'bitcoin', name: 'Bitcoin', pack: 'fontAwesome', iconName: 'bitcoin', color: '#F7931A' },
        { id: 'ethereum', name: 'Ethereum', pack: 'materialCommunity', iconName: 'ethereum', color: '#627EEA' },
        { id: 'money', name: 'Money', pack: 'fontAwesome', iconName: 'money-bill-alt', color: '#4CAF50' },
        { id: 'wallet', name: 'Wallet', pack: 'material', iconName: 'account-balance-wallet', color: '#4A148C' },
        { id: 'chart', name: 'Investments', pack: 'material', iconName: 'show-chart', color: '#00BCD4' },
    ],
    technology: [
        { id: 'github', name: 'GitHub', pack: 'fontAwesome', iconName: 'github', color: '#181717' },
        { id: 'aws', name: 'AWS', pack: 'fontAwesome', iconName: 'aws', color: '#FF9900' },
        { id: 'google', name: 'Google', pack: 'fontAwesome', iconName: 'google', color: '#4285F4' },
        { id: 'microsoft', name: 'Microsoft', pack: 'fontAwesome', iconName: 'microsoft', color: '#00A4EF' },
        { id: 'apple', name: 'Apple', pack: 'fontAwesome', iconName: 'apple', color: '#A2AAAD' },
        { id: 'android', name: 'Android', pack: 'fontAwesome', iconName: 'android', color: '#3DDC84' },
        { id: 'dropbox', name: 'Dropbox', pack: 'fontAwesome', iconName: 'dropbox', color: '#0061FF' },
        { id: 'slack', name: 'Slack', pack: 'fontAwesome', iconName: 'slack', color: '#4A154B' },
    ],
    shopping: [
        { id: 'amazon', name: 'Amazon', pack: 'fontAwesome', iconName: 'amazon', color: '#FF9900' },
        { id: 'shopping-cart', name: 'Shopping', pack: 'material', iconName: 'shopping-cart', color: '#FF6D00' },
        { id: 'store', name: 'Store', pack: 'material', iconName: 'store', color: '#F44336' },
        { id: 'ebay', name: 'eBay', pack: 'fontAwesome', iconName: 'ebay', color: '#E53238' },
        { id: 'shopping-bag', name: 'Shopping Bag', pack: 'fontAwesome', iconName: 'shopping-bag', color: '#795548' },
        { id: 'tag', name: 'Tag', pack: 'fontAwesome', iconName: 'tag', color: '#607D8B' },
    ],
    entertainment: [
        { id: 'netflix', name: 'Netflix', pack: 'fontAwesome', iconName: 'netflix', color: '#E50914' },
        { id: 'spotify', name: 'Spotify', pack: 'fontAwesome', iconName: 'spotify', color: '#1DB954' },
        { id: 'youtube', name: 'YouTube', pack: 'fontAwesome', iconName: 'youtube', color: '#FF0000' },
        { id: 'twitch', name: 'Twitch', pack: 'fontAwesome', iconName: 'twitch', color: '#9146FF' },
        { id: 'steam', name: 'Steam', pack: 'fontAwesome', iconName: 'steam', color: '#171A21' },
        { id: 'headphones', name: 'Music', pack: 'fontAwesome', iconName: 'headphones', color: '#6200EA' },
        { id: 'gamepad', name: 'Gaming', pack: 'fontAwesome', iconName: 'gamepad', color: '#DD2C00' },
        { id: 'movie', name: 'Movies', pack: 'material', iconName: 'movie', color: '#0091EA' },
    ],
    productivity: [
        { id: 'trello', name: 'Trello', pack: 'fontAwesome', iconName: 'trello', color: '#0079BF' },
        { id: 'jira', name: 'Jira', pack: 'fontAwesome', iconName: 'jira', color: '#0052CC' },
        { id: 'notion', name: 'Notion', pack: 'materialCommunity', iconName: 'notion', color: '#000000' },
        { id: 'calendar', name: 'Calendar', pack: 'material', iconName: 'event', color: '#F4511E' },
        { id: 'task', name: 'Tasks', pack: 'material', iconName: 'checklist', color: '#00897B' },
        { id: 'notes', name: 'Notes', pack: 'material', iconName: 'note', color: '#FFC107' },
        { id: 'email', name: 'Email', pack: 'material', iconName: 'email', color: '#D81B60' },
    ],
    general: [
        { id: 'lock', name: 'Lock', pack: 'material', iconName: 'lock', color: '#455A64' },
        { id: 'shield', name: 'Shield', pack: 'material', iconName: 'shield', color: '#0D47A1' },
        { id: 'key', name: 'Key', pack: 'fontAwesome', iconName: 'key', color: '#FFA000' },
        { id: 'fingerprint', name: 'Fingerprint', pack: 'material', iconName: 'fingerprint', color: '#512DA8' },
        { id: 'user', name: 'User', pack: 'fontAwesome', iconName: 'user', color: '#1E88E5' },
        { id: 'building', name: 'Building', pack: 'fontAwesome', iconName: 'building', color: '#5D4037' },
        { id: 'briefcase', name: 'Briefcase', pack: 'fontAwesome', iconName: 'briefcase', color: '#3949AB' },
        { id: 'home', name: 'Home', pack: 'material', iconName: 'home', color: '#EF6C00' },
    ]
};

export function getIconComponent(icon: BuiltInIcon, size: number): React.ReactNode {
    if (!icon) {
        return null;
    }

    switch (icon.pack) {
        case 'material':
            return <MaterialIcons name={icon.iconName as any} size={size} color={icon.color} />;
        case 'fontAwesome':
            return <FontAwesome5 name={icon.iconName as any} size={size} color={icon.color} solid />;
        case 'ionicons':
            return <Ionicons name={icon.iconName as any} size={size} color={icon.color} />;
        case 'materialCommunity':
            return <MaterialCommunityIcons name={icon.iconName as any} size={size} color={icon.color} />;
        default:
            return null;
    }
} 