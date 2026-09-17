import { useWindowDimensions } from "react-native";

const SCREEN_PADDING = 20; // px-5 on the scroll content, each side
const GAP = 8;
const COLUMNS = 3;

/**
 * Size for the 3-column group tiles on Home, Groups, and New Alarm.
 *
 * Tiles used `width: "31%"` + `aspectRatio: 1`, but an icon plus a two-line name is taller than
 * that square. Android grows the tile to fit yet still measures the wrapping grid with the square
 * height, so the scroll range came up short and the last row was hidden behind the tab bar or a
 * floating button. An explicit width with a minimum (not fixed) height keeps tiles square when the
 * content fits and lets the grid measure their real height when it doesn't.
 */
export function useGridTileStyle() {
    const { width } = useWindowDimensions();
    const size = Math.floor((width - SCREEN_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
    return { width: size, minHeight: size };
}
