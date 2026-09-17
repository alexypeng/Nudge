import Svg, { Circle, Line, Path } from "react-native-svg";
import { Colors } from "../theme/colors";

interface NudgeMarkProps {
    size: number;
    color?: string;
    accessibilityLabel?: string;
}

// Bells are half-discs tilted outward; atan(0.55) matches the splash icon generator.
const BELL_TILT_DEG = 28.8;
const bell = (cx: number, cy: number) => `M ${cx - 95} ${cy} A 95 95 0 0 1 ${cx + 95} ${cy} Z`;

/**
 * The Nudge alarm clock logo as a vector, so it stays sharp at any size and pixel density.
 * Same geometry as frontend/scripts/generate_splash_icon.py (1024 × 1024 canvas).
 */
export function NudgeMark({ size, color = Colors.accent, accessibilityLabel = "Nudge logo" }: NudgeMarkProps) {
    return (
        <Svg
            width={size}
            height={size}
            viewBox="0 0 1024 1024"
            accessibilityRole="image"
            accessibilityLabel={accessibilityLabel}
        >
            {/* Bells */}
            <Path d={bell(272, 280)} fill={color} transform={`rotate(-${BELL_TILT_DEG} 272 280)`} />
            <Path d={bell(752, 280)} fill={color} transform={`rotate(${BELL_TILT_DEG} 752 280)`} />

            {/* Legs */}
            <Line x1={322} y1={810} x2={252} y2={900} stroke={color} strokeWidth={44} strokeLinecap="round" />
            <Line x1={702} y1={810} x2={772} y2={900} stroke={color} strokeWidth={44} strokeLinecap="round" />

            {/* Face */}
            <Circle cx={512} cy={560} r={300} stroke={color} strokeWidth={44} fill="none" />

            {/* Hands: hour straight up, minute toward two o'clock */}
            <Line x1={512} y1={560} x2={512} y2={390} stroke={color} strokeWidth={44} strokeLinecap="round" />
            <Line x1={512} y1={560} x2={685} y2={460} stroke={color} strokeWidth={44} strokeLinecap="round" />
            <Circle cx={512} cy={560} r={33} fill={color} />
        </Svg>
    );
}
