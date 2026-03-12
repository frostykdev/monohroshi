import { Ionicons } from "@expo/vector-icons";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

export type IconSection = {
  titleKey: string;
  icons: IoniconsName[];
};

export const ICON_SECTIONS: IconSection[] = [
  {
    titleKey: "icons.financial",
    icons: [
      "business-outline",
      "bar-chart-outline",
      "logo-bitcoin",
      "briefcase-outline",
      "cash-outline",
      "stats-chart-outline",
      "server-outline",
      "card-outline",
      "pricetag-outline",
      "calculator-outline",
      "cash",
      "person-outline",
      "wallet-outline",
      "trending-up-outline",
      "swap-horizontal-outline",
    ],
  },
  {
    titleKey: "icons.leisure",
    icons: [
      "baseball-outline",
      "basketball-outline",
      "bowling-ball-outline",
      "dice-outline",
      "american-football-outline",
      "game-controller-outline",
      "golf-outline",
      "barbell-outline",
      "tennisball-outline",
      "football-outline",
      "musical-notes-outline",
      "film-outline",
      "color-palette-outline",
      "camera-outline",
      "headset-outline",
      "ticket-outline",
    ],
  },
  {
    titleKey: "icons.education",
    icons: [
      "book-outline",
      "library-outline",
      "school-outline",
      "reader-outline",
    ],
  },
  {
    titleKey: "icons.health",
    icons: [
      "medkit-outline",
      "fitness-outline",
      "pulse-outline",
      "medical-outline",
      "bandage-outline",
    ],
  },
  {
    titleKey: "icons.petsAndKids",
    icons: [
      "paw-outline",
      "skull-outline",
      "fish-outline",
      "accessibility-outline",
      "happy-outline",
    ],
  },
  {
    titleKey: "icons.transport",
    icons: [
      "bicycle-outline",
      "bus-outline",
      "car-outline",
      "train-outline",
      "globe-outline",
      "navigate-outline",
      "airplane-outline",
      "boat-outline",
      "subway-outline",
      "map-outline",
      "car-sport-outline",
      "rocket-outline",
    ],
  },
  {
    titleKey: "icons.food",
    icons: [
      "wine-outline",
      "fast-food-outline",
      "cafe-outline",
      "restaurant-outline",
      "beer-outline",
      "nutrition-outline",
      "pizza-outline",
      "cart-outline",
      "ice-cream-outline",
    ],
  },
  {
    titleKey: "icons.digital",
    icons: [
      "desktop-outline",
      "hardware-chip-outline",
      "phone-portrait-outline",
      "laptop-outline",
      "tablet-portrait-outline",
      "wifi-outline",
      "cloud-outline",
    ],
  },
  {
    titleKey: "icons.home",
    icons: [
      "home-outline",
      "flame-outline",
      "leaf-outline",
      "heart-outline",
      "water-outline",
      "bed-outline",
      "bulb-outline",
      "key-outline",
      "construct-outline",
    ],
  },
  {
    titleKey: "icons.bills",
    icons: [
      "receipt-outline",
      "document-text-outline",
      "mail-outline",
      "call-outline",
      "flash-outline",
      "tv-outline",
    ],
  },
  {
    titleKey: "icons.other",
    icons: [
      "heart-outline",
      "shirt-outline",
      "arrow-down-outline",
      "flower-outline",
      "gift-outline",
      "clipboard-outline",
      "cut-outline",
      "sparkles-outline",
      "star-outline",
      "ellipsis-horizontal-outline",
    ],
  },
];

export const DEFAULT_ICON: IoniconsName = "wallet-outline";
export const DEFAULT_ICON_COLOR = "#8E8E93";

export const ICON_PRESET_COLORS = [
  "#34C759",
  "#AF52DE",
  "#F5A623",
  "#007AFF",
  "#8E8E93",
  "#FF3B30",
  "#FF9500",
  "#5AC8FA",
];
