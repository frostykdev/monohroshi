import { useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
  ViewStyle,
  TextStyle,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "@constants/colors";
import {
  getAccountTypeConfig,
  getCurrencySymbol,
} from "@constants/account-types";
import { Typography } from "@components/ui/Typography";
import { AccountTypePickerModal } from "@components/setup/AccountTypePickerModal";
import { CurrencyPickerModal } from "@components/onboarding/CurrencyPickerModal";
import { useOnboardingStore } from "@stores/useOnboardingStore";
import { useSetupStore } from "@stores/useSetupStore";

const AccountSetupScreen = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const markStepComplete = useSetupStore((s) => s.markStepComplete);
  const setInitialAccount = useOnboardingStore((s) => s.setInitialAccount);
  const workspaceCurrency = useOnboardingStore((s) => s.selectedCurrencyCode);

  const typePickerRef = useRef<BottomSheetModal>(null);
  const currencyPickerRef = useRef<BottomSheetModal>(null);

  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState("bank_account");
  const [currency, setCurrency] = useState(workspaceCurrency);
  const [balance, setBalance] = useState("");
  const [isPrimary, setIsPrimary] = useState(true);

  const typeConfig = getAccountTypeConfig(accountType);
  const currencySymbol = getCurrencySymbol(currency);
  const haptic = () => {
    if (process.env.EXPO_OS === "ios") {
      Haptics.selectionAsync();
    }
  };

  const handleSave = () => {
    if (process.env.EXPO_OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setInitialAccount({
      name: name.trim(),
      type: accountType,
      currency,
      balance: balance || "0",
      isPrimary,
    });
    markStepComplete("account");
    router.back();
  };

  const handleSelectType = (type: string) => {
    haptic();
    setAccountType(type);
    typePickerRef.current?.dismiss();
  };

  const handleSelectCurrency = (code: string) => {
    haptic();
    setCurrency(code);
    currencyPickerRef.current?.dismiss();
  };

  const handleBalanceChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.,]/g, "").replace(",", ".");
    setBalance(cleaned);
  };

  return (
    <View
      style={[
        s.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      {/* Header */}
      <View style={s.header}>
        <Pressable
          style={({ pressed }) => [s.headerButton, pressed && s.pressed]}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </Pressable>
        <Typography variant="label" i18nKey="onboarding.accountSetup.title" />
        <Pressable
          style={({ pressed }) => [s.headerButton, pressed && s.pressed]}
          onPress={handleSave}
          hitSlop={8}
        >
          <Typography variant="label" color="textSecondary">
            {t("onboarding.accountSetup.save")}
          </Typography>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={s.flex}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Account Icon */}
          <View style={s.iconSection}>
            <View style={[s.iconCircle, { backgroundColor: typeConfig.color }]}>
              <Ionicons
                name={typeConfig.icon}
                size={32}
                color={colors.textOnAccent}
              />
            </View>
          </View>

          {/* Account Name */}
          <View style={s.nameInputContainer}>
            <TextInput
              style={s.nameInput}
              placeholder={t("onboarding.accountSetup.namePlaceholder")}
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={setName}
              autoCorrect={false}
              returnKeyType="done"
            />
          </View>

          {/* Settings Rows */}
          <View style={s.settingsGroup}>
            {/* Account Type */}
            <Pressable
              style={({ pressed }) => [s.settingRow, pressed && s.pressed]}
              onPress={() => {
                haptic();
                typePickerRef.current?.present();
              }}
            >
              <Typography variant="body" color="textSecondary">
                {t("onboarding.accountSetup.accountType")}
              </Typography>
              <View style={s.settingValue}>
                <Typography variant="body" color="textPrimary">
                  {t(`onboarding.accountSetup.types.${accountType}` as never)}
                </Typography>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textTertiary}
                />
              </View>
            </Pressable>

            <View style={s.separator} />

            {/* Currency */}
            <Pressable
              style={({ pressed }) => [s.settingRow, pressed && s.pressed]}
              onPress={() => {
                haptic();
                currencyPickerRef.current?.present();
              }}
            >
              <Typography variant="body" color="textSecondary">
                {t("onboarding.accountSetup.currency")}
              </Typography>
              <View style={s.settingValue}>
                <Typography variant="body" color="textPrimary">
                  {currency}, {currencySymbol}
                </Typography>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textTertiary}
                />
              </View>
            </Pressable>

            <View style={s.separator} />

            {/* Balance */}
            <View style={s.settingRow}>
              <Typography variant="body" color="textSecondary">
                {t("onboarding.accountSetup.balance")} ({currency})
              </Typography>
              <View style={s.balanceInputRow}>
                <TextInput
                  style={s.balanceInput}
                  value={balance}
                  onChangeText={handleBalanceChange}
                  placeholder={`0.00 ${currencySymbol}`}
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
              </View>
            </View>
          </View>

          {/* Primary Toggle */}
          <View style={s.toggleGroup}>
            <View style={s.settingRow}>
              <Typography variant="body" color="textPrimary">
                {t("onboarding.accountSetup.markAsPrimary")}
              </Typography>
              <Switch
                value={isPrimary}
                onValueChange={setIsPrimary}
                trackColor={{
                  false: colors.backgroundSurface,
                  true: colors.accent,
                }}
                ios_backgroundColor={colors.backgroundSurface}
                style={s.toggle}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <AccountTypePickerModal
        ref={typePickerRef}
        selectedType={accountType}
        onSelect={handleSelectType}
      />
      <CurrencyPickerModal
        ref={currencyPickerRef}
        selectedCode={currency}
        onSelect={handleSelectCurrency}
      />
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  flex: {
    flex: 1,
  } as ViewStyle,
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 52,
  } as ViewStyle,
  headerButton: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  } as ViewStyle,
  scrollContent: {
    paddingBottom: 40,
  } as ViewStyle,
  iconSection: {
    alignItems: "center",
    paddingVertical: 24,
  } as ViewStyle,
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  nameInputContainer: {
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: colors.backgroundElevated,
    borderRadius: 14,
    borderCurve: "continuous",
    paddingHorizontal: 16,
    paddingVertical: 14,
  } as ViewStyle,
  nameInput: {
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: "center",
  } as TextStyle,
  settingsGroup: {
    marginHorizontal: 24,
    backgroundColor: colors.backgroundElevated,
    borderRadius: 14,
    borderCurve: "continuous",
    paddingHorizontal: 16,
  } as ViewStyle,
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    minHeight: 52,
  } as ViewStyle,
  settingValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  } as ViewStyle,
  separator: {
    height: 1,
    backgroundColor: colors.border,
  } as ViewStyle,
  balanceInputRow: {
    flexDirection: "row",
    alignItems: "center",
  } as ViewStyle,
  balanceInput: {
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: "right",
    minWidth: 80,
  } as TextStyle,
  toggleGroup: {
    marginHorizontal: 24,
    marginTop: 16,
    backgroundColor: colors.backgroundElevated,
    borderRadius: 14,
    borderCurve: "continuous",
    paddingHorizontal: 16,
  } as ViewStyle,
  toggle: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
  } as ViewStyle,
  pressed: {
    opacity: 0.6,
  } as ViewStyle,
});

export default AccountSetupScreen;
