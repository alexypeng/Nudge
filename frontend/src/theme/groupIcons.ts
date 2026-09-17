import {
    AlarmClock,
    Book,
    CodeXml,
    Coffee,
    Dumbbell,
    Flame,
    Heart,
    LucideIcon,
    Moon,
    Music,
    PawPrint,
    Rocket,
    Star,
    Sun,
    Trophy,
    Users,
    Volleyball,
} from "lucide-react-native";

// Keys are the icon names stored in Group.icon (originally Ionicons glyph names),
// so existing groups keep their icon without a database migration.
export const GROUP_ICONS = {
    people: Users,
    alarm: AlarmClock,
    sunny: Sun,
    fitness: Dumbbell,
    book: Book,
    moon: Moon,
    trophy: Trophy,
    flame: Flame,
    star: Star,
    "musical-notes": Music,
    heart: Heart,
    rocket: Rocket,
    football: Volleyball,
    cafe: Coffee,
    "code-slash": CodeXml,
    paw: PawPrint,
} satisfies Record<string, LucideIcon>;

export type GroupIconName = keyof typeof GROUP_ICONS;

export const GROUP_ICON_NAMES = Object.keys(GROUP_ICONS) as GroupIconName[];

export const DEFAULT_GROUP_ICON: GroupIconName = "people";

export function getGroupIcon(name: string | null | undefined): LucideIcon {
    return GROUP_ICONS[name as GroupIconName] ?? GROUP_ICONS[DEFAULT_GROUP_ICON];
}
