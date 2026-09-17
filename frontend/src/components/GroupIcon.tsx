import { StyleProp, ViewStyle } from "react-native";
import { getGroupIcon } from "../theme/groupIcons";

interface GroupIconProps {
    name: string | null | undefined;
    size: number;
    color: string;
    style?: StyleProp<ViewStyle>;
}

export function GroupIcon({ name, size, color, style }: GroupIconProps) {
    const Icon = getGroupIcon(name);
    return <Icon size={size} color={color} style={style} />;
}
