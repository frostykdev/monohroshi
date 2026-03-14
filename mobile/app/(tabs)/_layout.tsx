import { useEffect } from "react";
import { AppState, Pressable } from "react-native";
import { Tabs, router } from "expo-router";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "@react-native-firebase/auth";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors } from "@constants/colors";

const HapticTabButton = ({
  onPress,
  children,
  style,
}: BottomTabBarButtonProps) => (
  <Pressable
    style={style}
    onPress={(e) => {
      Haptics.selectionAsync().catch(() => {});
      onPress?.(e);
    }}
  >
    {children}
  </Pressable>
);

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const TAB_ICONS: Record<string, { default: IconName; active: IconName }> = {
  index: { default: "home-outline", active: "home" },
  accounts: { default: "wallet-outline", active: "wallet" },
  analytics: { default: "bar-chart-outline", active: "bar-chart" },
  settings: { default: "settings-outline", active: "settings" },
};

const HomeLayout = () => {
  const { t } = useTranslation();

  useEffect(() => {
    const auth = getAuth();

    const ensureAuthenticated = async () => {
      const user = auth.currentUser;

      if (!user) {
        router.replace("/(onboarding)/welcome");
        return;
      }

      try {
        await user.reload();
      } catch {
        await signOut(auth);
        router.replace("/(onboarding)/welcome");
      }
    };

    ensureAuthenticated();

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/(onboarding)/welcome");
      }
    });

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        ensureAuthenticated();
      }
    });

    return () => {
      unsubscribeAuth();
      appStateSub.remove();
    };
  }, []);

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.backgroundElevated,
          borderTopColor: colors.border,
        },
        tabBarButton: (props) => <HapticTabButton {...props} />,
        tabBarIcon: ({ focused, color, size }) => {
          const icon = TAB_ICONS[route.name];
          return (
            <Ionicons
              name={
                icon
                  ? focused
                    ? icon.active
                    : icon.default
                  : "ellipse-outline"
              }
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: t("home.tabs.home") }} />
      <Tabs.Screen
        name="accounts"
        options={{ title: t("home.tabs.accounts") }}
      />
      <Tabs.Screen
        name="analytics"
        options={{ title: t("home.tabs.analytics") }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: t("home.tabs.settings") }}
      />
    </Tabs>
  );
};

export default HomeLayout;
