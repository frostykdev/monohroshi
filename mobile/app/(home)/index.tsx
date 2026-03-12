import { Alert, StyleSheet, View, Pressable, ViewStyle } from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAuth, signOut } from "@react-native-firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "@constants/colors";
import { Typography } from "@components/ui/Typography";
import { Button } from "@components/ui/Button";
import { useOnboardingStore } from "@stores/useOnboardingStore";
import { useSetupStore } from "@stores/useSetupStore";
import { deleteAccount } from "@services/users-api";

const HomeScreen = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState(false);

  const resetOnboarding = useOnboardingStore((s) => s.reset);
  const setOnboardingComplete = useOnboardingStore(
    (s) => s.setOnboardingComplete,
  );
  const resetSetup = useSetupStore((s) => s.reset);

  const handleLogout = async () => {
    await signOut(getAuth());
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t("home.deleteAccount.confirmTitle"),
      t("home.deleteAccount.confirmMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("home.deleteAccount.confirmButton"),
          style: "destructive",
          onPress: confirmDeleteAccount,
        },
      ],
    );
  };

  const confirmDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      setOnboardingComplete(false);
      resetOnboarding();
      resetSetup();
      await signOut(getAuth());
    } catch {
      setDeleting(false);
      Alert.alert(
        t("home.deleteAccount.errorTitle"),
        t("home.deleteAccount.errorMessage"),
      );
    }
  };

  return (
    <View
      style={[
        s.container,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <View style={s.header}>
        <Typography variant="h2">Home</Typography>
        <Pressable
          style={({ pressed }) => [s.logoutButton, pressed && s.pressed]}
          onPress={handleLogout}
          hitSlop={8}
        >
          <Ionicons
            name="log-out-outline"
            size={22}
            color={colors.textSecondary}
          />
        </Pressable>
      </View>

      <View style={s.footer}>
        <Button
          variant="danger"
          size="sm"
          i18nKey="home.deleteAccount.button"
          onPress={handleDeleteAccount}
          loading={deleting}
        />
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  } as ViewStyle,
  logoutButton: {
    padding: 4,
  } as ViewStyle,
  pressed: {
    opacity: 0.6,
  } as ViewStyle,
  footer: {
    marginTop: "auto",
    paddingHorizontal: 24,
  } as ViewStyle,
});

export default HomeScreen;
