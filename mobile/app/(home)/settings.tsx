import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  View,
  Pressable,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAuth, signOut } from "@react-native-firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import type { ParseKeys } from "i18next";
import { colors } from "@constants/colors";
import { Typography } from "@components/ui/Typography";
import { useOnboardingStore } from "@stores/useOnboardingStore";
import { useSetupStore } from "@stores/useSetupStore";
import { useWorkspaceStore } from "@stores/useWorkspaceStore";
import { useDeleteAccount } from "@services/users/users.queries";
import { useCategories } from "@services/categories/categories.queries";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

interface RowProps {
  icon: IoniconName;
  iconBg: string;
  labelKey: ParseKeys;
  value?: string;
  onPress?: () => void;
  toggle?: { value: boolean; onChange: (v: boolean) => void };
  destructive?: boolean;
  isLast?: boolean;
  showChevron?: boolean;
}

const Row = ({
  icon,
  iconBg,
  labelKey,
  value,
  onPress,
  toggle,
  destructive,
  isLast,
  showChevron = true,
}: RowProps) => (
  <Pressable
    style={({ pressed }) => [
      s.row,
      !isLast && s.rowDivider,
      pressed && onPress ? s.rowPressed : null,
    ]}
    onPress={onPress}
    disabled={!onPress && !toggle}
  >
    <View style={[s.iconWrap, { backgroundColor: iconBg }]}>
      <Ionicons name={icon} size={18} color={colors.textPrimary} />
    </View>
    <Typography
      variant="body"
      color={destructive ? "error" : "textPrimary"}
      style={s.rowLabel}
      i18nKey={labelKey}
    />
    <View style={s.rowRight}>
      {toggle ? (
        <Switch
          value={toggle.value}
          onValueChange={toggle.onChange}
          trackColor={{ true: colors.success, false: colors.backgroundSurface }}
          ios_backgroundColor={colors.backgroundSurface}
        />
      ) : (
        <>
          {value !== undefined && (
            <Typography variant="body" color="textSecondary">
              {value}
            </Typography>
          )}
          {onPress && showChevron && (
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textTertiary}
            />
          )}
        </>
      )}
    </View>
  </Pressable>
);

interface SectionProps {
  children: React.ReactNode;
  hintKey?: ParseKeys;
}

const Section = ({ children, hintKey }: SectionProps) => (
  <View style={s.sectionOuter}>
    <View style={s.sectionCard}>{children}</View>
    {hintKey && (
      <Typography
        variant="caption"
        color="textSecondary"
        style={s.sectionHint}
        i18nKey={hintKey}
      />
    )}
  </View>
);

const SettingsScreen = () => {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const [showIncome, setShowIncome] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [dailyReminder, setDailyReminder] = useState(false);
  const resetOnboarding = useOnboardingStore((s) => s.reset);
  const setOnboardingComplete = useOnboardingStore(
    (s) => s.setOnboardingComplete,
  );
  const resetSetup = useSetupStore((s) => s.reset);

  const workspaceName = useWorkspaceStore((s) => s.name);
  const activeWorkspaceId = useWorkspaceStore((s) => s.id);
  const { data: categories } = useCategories(activeWorkspaceId);
  const categoriesCount = categories?.length ?? 0;
  const { mutateAsync: deleteAccountMutation, isPending: deleting } =
    useDeleteAccount();

  const languageLabel =
    i18n.language === "uk"
      ? t("home.settings.languageUk")
      : t("home.settings.languageEn");

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
    try {
      await deleteAccountMutation();
      setOnboardingComplete(false);
      resetOnboarding();
      resetSetup();
      await signOut(getAuth());
    } catch {
      Alert.alert(
        t("home.deleteAccount.errorTitle"),
        t("home.deleteAccount.errorMessage"),
      );
    }
  };

  const handleComingSoon = () =>
    Alert.alert("Coming soon", "This feature is not yet available.");

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={[
        s.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Typography
        variant="h2"
        i18nKey="home.tabs.settings"
        style={s.pageTitle}
      />

      {/* Workspace */}
      <Section>
        <Pressable
          style={({ pressed }) => [s.row, pressed && s.rowPressed]}
          onPress={() => router.push("/(modals)/workspace-list" as never)}
        >
          <View style={[s.iconWrap, { backgroundColor: colors.iconBlue }]}>
            <Ionicons
              name="business-outline"
              size={18}
              color={colors.textPrimary}
            />
          </View>
          <View style={s.workspaceLabelWrap}>
            <Typography variant="label">{workspaceName}</Typography>
            <Typography
              variant="caption"
              color="textSecondary"
              i18nKey="workspace.details.title"
            />
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.textTertiary}
          />
        </Pressable>
      </Section>

      {/* Pro Banner */}
      <Pressable
        style={({ pressed }) => [s.proBanner, pressed && s.rowPressed]}
        onPress={handleComingSoon}
      >
        <View style={s.proIconWrap}>
          <Ionicons name="star" size={22} color={colors.iconYellow} />
        </View>
        <View style={s.proText}>
          <Typography variant="label" i18nKey="home.settings.upgradePro" />
          <Typography
            variant="bodySmall"
            color="textSecondary"
            i18nKey="home.settings.upgradeProSubtitle"
          />
        </View>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.textTertiary}
        />
      </Pressable>

      {/* Data */}
      <Section>
        {/* <Row
          icon="document-text-outline"
          iconBg={colors.success}
          labelKey="home.settings.importData"
          onPress={handleComingSoon}
        /> */}
        <Row
          icon="share-outline"
          iconBg={colors.iconBlue}
          labelKey="home.settings.exportData"
          onPress={handleComingSoon}
        />
        <Row
          icon="star-outline"
          iconBg={colors.iconYellow}
          labelKey="home.settings.rateApp"
          onPress={handleComingSoon}
          isLast
        />
      </Section>

      {/* Finance */}
      <Section>
        <Row
          icon="pricetag-outline"
          iconBg={colors.warning}
          labelKey="home.settings.categories"
          value={String(categoriesCount)}
          onPress={() => router.push("/(modals)/categories" as never)}
        />
        <Row
          icon="card-outline"
          iconBg={colors.iconPurple}
          labelKey="home.settings.paymentMethods"
          value="5"
          onPress={handleComingSoon}
        />
        <Row
          icon="repeat-outline"
          iconBg={colors.success}
          labelKey="home.settings.recurringTransactions"
          onPress={handleComingSoon}
        />
        <Row
          icon="wallet-outline"
          iconBg={colors.success}
          labelKey="home.settings.budgets"
          value="1"
          onPress={handleComingSoon}
          isLast
        />
      </Section>

      {/* Display */}
      <Section>
        <Row
          icon="trending-up-outline"
          iconBg={colors.success}
          labelKey="home.settings.showIncome"
          toggle={{ value: showIncome, onChange: setShowIncome }}
          isLast
        />
      </Section>

      {/* Currency */}
      <Section>
        <Row
          icon="cash-outline"
          iconBg={colors.iconPurple}
          labelKey="home.settings.transactionCurrency"
          value="UAH"
          onPress={handleComingSoon}
          isLast
        />
      </Section>

      {/* Appearance */}
      <Section>
        <Row
          icon="moon-outline"
          iconBg={colors.error}
          labelKey="home.settings.darkMode"
          toggle={{ value: darkMode, onChange: setDarkMode }}
        />
        <Row
          icon="globe-outline"
          iconBg={colors.iconBlue}
          labelKey="home.settings.language"
          value={languageLabel}
          onPress={handleComingSoon}
          isLast
        />
      </Section>

      {/* Notifications */}
      <Section hintKey="home.settings.dailyReminderHint">
        <Row
          icon="notifications-outline"
          iconBg={colors.warning}
          labelKey="home.settings.dailyReminder"
          toggle={{ value: dailyReminder, onChange: setDailyReminder }}
          isLast
        />
      </Section>

      {/* Community */}
      <Section>
        <Row
          icon="chatbubble-outline"
          iconBg={colors.iconTeal}
          labelKey="home.settings.sendFeedback"
          onPress={handleComingSoon}
        />
        <Row
          icon="share-social-outline"
          iconBg={colors.iconBlue}
          labelKey="home.settings.shareWithFriends"
          onPress={handleComingSoon}
        />
        <Row
          icon="list-outline"
          iconBg={colors.accent}
          labelKey="home.settings.whatsNext"
          onPress={handleComingSoon}
        />
        <Row
          icon="help-circle-outline"
          iconBg={colors.iconPurple}
          labelKey="home.settings.faq"
          onPress={handleComingSoon}
          isLast
        />
      </Section>

      {/* Backup */}
      <Section hintKey="home.settings.localBackupHint">
        <Row
          icon="save-outline"
          iconBg={colors.iconTeal}
          labelKey="home.settings.localBackup"
          onPress={handleComingSoon}
          isLast
        />
      </Section>

      {/* Danger */}
      <Section>
        <Row
          icon="trash-outline"
          iconBg={colors.error}
          labelKey="home.settings.resetData"
          onPress={deleting ? undefined : handleDeleteAccount}
          destructive
          isLast
        />
      </Section>

      {/* Legal */}
      <Section>
        <Row
          icon="document-outline"
          iconBg={colors.backgroundSurface}
          labelKey="home.settings.termsOfUse"
          onPress={handleComingSoon}
        />
        <Row
          icon="shield-checkmark-outline"
          iconBg={colors.backgroundSurface}
          labelKey="home.settings.privacyPolicy"
          onPress={handleComingSoon}
        />
        <Row
          icon="information-circle-outline"
          iconBg={colors.backgroundSurface}
          labelKey="home.settings.version"
          value="1.0.4"
          isLast
          showChevron={false}
        />
      </Section>

      <Typography
        variant="caption"
        color="textTertiary"
        align="center"
        style={s.footer}
        i18nKey="home.settings.footer"
      />
    </ScrollView>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  content: {
    paddingHorizontal: 16,
    gap: 12,
  } as ViewStyle,
  pageTitle: {
    marginBottom: 4,
    paddingHorizontal: 8,
  } as TextStyle,
  workspaceLabelWrap: {
    flex: 1,
    gap: 2,
  } as ViewStyle,
  proBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.proBannerBackground,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderCurve: "continuous",
  } as ViewStyle,
  proIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.backgroundElevated,
    alignItems: "center",
    justifyContent: "center",
    borderCurve: "continuous",
  } as ViewStyle,
  proText: {
    flex: 1,
    gap: 2,
  } as ViewStyle,
  sectionOuter: {
    gap: 6,
  } as ViewStyle,
  sectionCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 14,
    overflow: "hidden",
    borderCurve: "continuous",
  } as ViewStyle,
  sectionHint: {
    paddingHorizontal: 16,
  } as TextStyle,
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 14,
    gap: 12,
    minHeight: 50,
  } as ViewStyle,
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  } as ViewStyle,
  rowPressed: {
    opacity: 0.6,
  } as ViewStyle,
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderCurve: "continuous",
  } as ViewStyle,
  rowLabel: {
    flex: 1,
  } as TextStyle,
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  } as ViewStyle,
  footer: {
    marginTop: 8,
  } as TextStyle,
});

export default SettingsScreen;
