import { useCallback, useRef } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useFormik } from "formik";
import * as Yup from "yup";
import { colors } from "@constants/colors";
import { getCurrencySymbol } from "@constants/account-types";
import { DEFAULT_ICON, DEFAULT_ICON_COLOR } from "@constants/icon-list";
import { Typography } from "@components/ui/Typography";
import { useOnboardingStore } from "@stores/useOnboardingStore";
import { useSetupStore } from "@stores/useSetupStore";
import { usePickerStore } from "@stores/usePickerStore";

const MIN_NAME_LENGTH = 3;

const AccountSetupScreen = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const markStepComplete = useSetupStore((s) => s.markStepComplete);
  const setInitialAccount = useOnboardingStore((s) => s.setInitialAccount);
  const workspaceCurrency = useOnboardingStore((s) => s.selectedCurrencyCode);

  const validationSchema = Yup.object({
    name: Yup.string()
      .trim()
      .required(t("onboarding.accountSetup.errors.nameRequired"))
      .min(
        MIN_NAME_LENGTH,
        t("onboarding.accountSetup.errors.nameMin", { min: MIN_NAME_LENGTH }),
      ),
  });

  const formik = useFormik({
    initialValues: {
      name: "",
      accountType: "bank_account",
      currency: workspaceCurrency,
      balance: "",
      isPrimary: true,
      icon: DEFAULT_ICON as string,
      iconColor: DEFAULT_ICON_COLOR,
    },
    validationSchema,
    validateOnChange: false,
    validateOnBlur: false,
    onSubmit: (values) => {
      if (process.env.EXPO_OS === "ios") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      setInitialAccount({
        name: values.name.trim(),
        type: values.accountType,
        currency: values.currency,
        balance: values.balance || "0",
        isPrimary: values.isPrimary,
        icon: values.icon,
        color: values.iconColor,
      });
      markStepComplete("account");
      router.back();
    },
  });

  // Use a ref so useFocusEffect can read latest formik without stale closure
  const formikRef = useRef(formik);
  formikRef.current = formik;

  useFocusEffect(
    useCallback(() => {
      const store = usePickerStore.getState();
      if (store.accountType) {
        formikRef.current.setFieldValue("accountType", store.accountType);
        usePickerStore.setState({ accountType: null });
      }
      if (store.currency) {
        formikRef.current.setFieldValue("currency", store.currency);
        usePickerStore.setState({ currency: null });
      }
      if (store.icon) {
        formikRef.current.setFieldValue("icon", store.icon);
        formikRef.current.setFieldValue(
          "iconColor",
          store.iconColor ?? DEFAULT_ICON_COLOR,
        );
        usePickerStore.setState({ icon: null, iconColor: null });
      }
    }, []),
  );

  const currencySymbol = getCurrencySymbol(formik.values.currency);
  const nameError =
    formik.submitCount > 0 && formik.errors.name
      ? formik.errors.name
      : undefined;

  const haptic = () => {
    if (process.env.EXPO_OS === "ios") {
      Haptics.selectionAsync();
    }
  };

  const handleBalanceChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.,]/g, "").replace(",", ".");
    formik.setFieldValue("balance", cleaned);
  };

  return (
    <View
      style={[
        s.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
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
          onPress={() => formik.handleSubmit()}
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
          <Pressable
            style={s.iconSection}
            onPress={() => {
              haptic();
              router.push(
                `/(modals)/icon-picker?selectedIcon=${encodeURIComponent(formik.values.icon)}&selectedColor=${encodeURIComponent(formik.values.iconColor)}`,
              );
            }}
          >
            <View
              style={[
                s.iconCircle,
                { backgroundColor: formik.values.iconColor },
              ]}
            >
              <Ionicons
                name={
                  formik.values.icon as React.ComponentProps<
                    typeof Ionicons
                  >["name"]
                }
                size={32}
                color={colors.textOnAccent}
              />
              <View style={s.editBadge}>
                <Ionicons name="pencil" size={10} color={colors.textOnAccent} />
              </View>
            </View>
          </Pressable>

          <View style={s.nameInputContainer}>
            <TextInput
              style={s.nameInput}
              placeholder={t("onboarding.accountSetup.namePlaceholder")}
              placeholderTextColor={colors.textTertiary}
              value={formik.values.name}
              onChangeText={(text) => {
                formik.setFieldValue("name", text);
                if (nameError) formik.setFieldError("name", undefined);
              }}
              autoCorrect={false}
              returnKeyType="done"
            />
          </View>
          {nameError && (
            <Typography variant="caption" color="error" style={s.errorText}>
              {nameError}
            </Typography>
          )}

          <View style={s.settingsGroup}>
            <Pressable
              style={({ pressed }) => [s.settingRow, pressed && s.pressed]}
              onPress={() => {
                haptic();
                router.push(
                  `/(modals)/account-type-picker?selected=${formik.values.accountType}`,
                );
              }}
            >
              <Typography variant="body" color="textSecondary">
                {t("onboarding.accountSetup.accountType")}
              </Typography>
              <View style={s.settingValue}>
                <Typography variant="body" color="textPrimary">
                  {t(
                    `onboarding.accountSetup.types.${formik.values.accountType}` as never,
                  )}
                </Typography>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textTertiary}
                />
              </View>
            </Pressable>

            <View style={s.separator} />

            <Pressable
              style={({ pressed }) => [s.settingRow, pressed && s.pressed]}
              onPress={() => {
                haptic();
                router.push(
                  `/(modals)/currency-picker?selected=${formik.values.currency}`,
                );
              }}
            >
              <Typography variant="body" color="textSecondary">
                {t("onboarding.accountSetup.currency")}
              </Typography>
              <View style={s.settingValue}>
                <Typography variant="body" color="textPrimary">
                  {currencySymbol !== formik.values.currency
                    ? `${formik.values.currency} (${currencySymbol})`
                    : formik.values.currency}
                </Typography>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textTertiary}
                />
              </View>
            </Pressable>

            <View style={s.separator} />

            <View style={s.settingRow}>
              <Typography variant="body" color="textSecondary">
                {t("onboarding.accountSetup.balance")} ({formik.values.currency}
                )
              </Typography>
              <View style={s.balanceInputRow}>
                <TextInput
                  style={s.balanceInput}
                  value={formik.values.balance}
                  onChangeText={handleBalanceChange}
                  placeholder={`0.00 ${currencySymbol}`}
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
              </View>
            </View>
          </View>

          <View style={s.toggleGroup}>
            <View style={s.settingRow}>
              <Typography variant="body" color="textPrimary">
                {t("onboarding.accountSetup.markAsPrimary")}
              </Typography>
              <Switch
                value={formik.values.isPrimary}
                onValueChange={(v) => {
                  formik.setFieldValue("isPrimary", v);
                }}
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
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.textSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.background,
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
  errorText: {
    marginHorizontal: 28,
    marginTop: -18,
    marginBottom: 20,
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
