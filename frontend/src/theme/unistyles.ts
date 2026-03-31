import { StyleSheet } from 'react-native-unistyles';
import { Colors } from './colors';

const arcade = {
    colors: Colors,
    spacing: {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 20,
        xxl: 24,
        xxxl: 32,
    },
    radii: {
        sm: 8,
        md: 12,
        card: 18,
        pill: 99,
    },
    typography: {
        hero: {
            fontSize: 48,
            fontWeight: '900' as const,
            letterSpacing: -0.5,
        },
        title: {
            fontSize: 15,
            fontWeight: '900' as const,
            letterSpacing: -0.5,
        },
        label: {
            fontSize: 10,
            fontWeight: '400' as const,
            letterSpacing: 2.5,
            textTransform: 'uppercase' as const,
        },
        body: {
            fontSize: 13,
            fontWeight: '400' as const,
        },
    },
} as const;

type ArcadeTheme = typeof arcade;

declare module 'react-native-unistyles' {
    export interface UnistylesThemes {
        arcade: ArcadeTheme;
    }
}

StyleSheet.configure({
    themes: {
        arcade,
    },
    settings: {
        initialTheme: 'arcade',
    },
});
