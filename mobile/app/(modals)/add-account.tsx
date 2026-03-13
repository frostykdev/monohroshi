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
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useFormik } from "formik";
import * as Yup from "yup";
import { colors } from "@constants/colors";
import {
  getAccountTypeConfig,
  getCurrencySymbol,
} from "@constants/account-types";
import { DEFAULT_ICON_COLOR } from "@constants/icon-list";
import { Typography } from "@components/ui/Typography";
import { usePickerStore } from "@stores/usePickerStore";
import { useWorkspaceStore } from "@stores/useWorkspaceStore";
import { useCreateAccount } from "@services/accounts/accounts.queries";

const MIN_NAME_LENGTH = 1;

const AddAccountScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { workspaceId: paramWsId } = useLocalSearchParams<{
    workspaceId?: string;
  }>();
  const activeWorkspaceId = useWorkspaceStore((s) => s.id);
  const workspaceId = paramWsId ?? activeWorkspaceId;

  const { mutate: createAccount, isPending: saving } =
    useCreateAccount(workspaceId);

  const validationSchema = Yup.object({
    name: Yup.string()
      .trim()
      .required(t("onboarding.accountSetup.errors.nameRequired"))
      .min(MIN_NAME_LENGTH, t("onboarding.accountSetup.errors.nameRequired")),
  });

  const formik = useFormik({
    initialValues: {
      name: "",
      accountType: "bank_account",
      currency: "USD",
      balance: "",
      isPrimary: false,
      icon: getAccountTypeConfig("bank_account").icon as string,
      iconColor: getAccountTypeConfig("bank_account").color,
    },
    validationSchema,
    validateOnChange: false,
    validateOnBlur: false,
    onSubmit: (values) => {
      if (process.env.EXPO_OS === "ios") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      createAccount(
        {
          name: values.name.trim(),
          type: values.accountType,
          currency: values.currency,
          balance: values.balance || "0",
          isPrimary: values.isPrimary,
          icon: values.icon,
          color: values.iconColor,
          workspaceId: workspaceId ?? undefined,
        },
        { onSuccess: () => router.back() },
      );
    },
  });

  const formikRef = useRef(formik);
  formikRef.current = formik;

  useFocusEffect(
    useCallback(() => {
      const store = usePickerStore.getState();
      if (store.accountType) {
        const cfg = getAccountTypeConfig(store.accountType);
        formikRef.current.setFieldValue("accountType", store.accountType);
        // Update icon/color to match type if user hasn't customised
        formikRef.current.setFieldValue("icon", cfg.icon);
        formikRef.current.setFieldValue("iconColor", cfg.color);
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

  const haptic = () => {
    if (process.env.EXPO_OS === "ios") Haptics.selectionAsync();
  };

  const currencySymbol = getCurrencySymbol(formik.values.currency);
  const nameError =
    formik.submitCount > 0 && formik.errors.name
      ? formik.errors.name
      : undefined;

  return (
    <View style={[s.container, { paddingBottom: insets.bottom }]}>
      <View style={s.header}>
        <Pressable
          style={({ pressed }) => [s.closeButton, pressed && s.pressed]}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </Pressable>
        <Typography variant="label" i18nKey="accounts.add.title" />
        <Pressable
          style={({ pressed }) => [
            s.saveButton,
            pressed && s.pressed,
            saving && s.disabledButton,
          ]}
          onPress={() => !saving && formik.handleSubmit()}
          disabled={saving}
          hitSlop={8}
        >
          <Typography
            variant="label"
            color={saving ? "textTertiary" : "textPrimary"}
          >
            {t("common.save")}
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
          {/* Icon */}
          <Pressable
            style={s.iconSection}
            onPress={() => {
              haptic();
              router.push(
                `/(modals)/icon-picker?selectedIcon=${encodeURIComponent(formik.values.icon)}&selectedColor=${encodeURIComponent(formik.values.iconColor)}`,
              );
            }}
          >
            <View style={s.iconWrapper}>
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
              </View>
              <View style={s.editBadge}>
                <Ionicons name="pencil" size={13} color={colors.textPrimary} />
              </View>
            </View>
          </Pressable>

          {/* Name */}
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
              autoFocus
              returnKeyType="done"
            />
          </View>
          {nameError && (
            <Typography variant="caption" color="error" style={s.errorText}>
              {nameError}
            </Typography>
          )}

          {/* Settings rows */}
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
              <TextInput
                style={s.balanceInput}
                value={formik.values.balance}
                onChangeText={(text) => {
                  const cleaned = text
                    .replace(/[^0-9.,]/g, "")
                    .replace(",", ".");
                  formik.setFieldValue("balance", cleaned);
                }}
                placeholder={`0.00 ${currencySymbol}`}
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>
          </View>

          <View style={s.toggleGroup}>
            <View style={s.settingRow}>
              <Typography variant="body" color="textPrimary">
                {t("onboarding.accountSetup.markAsPrimary")}
              </Typography>
              <Switch
                value={formik.values.isPrimary}
                onValueChange={(v) => formik.setFieldValue("isPrimary", v)}
                trackColor={{
                  false: colors.backgroundSurface,
                  true: colors.accent,
                }}
                ios_backgroundColor={colors.backgroundSurface}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background } as ViewStyle,
  flex: { flex: 1 } as ViewStyle,
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 56,
  } as ViewStyle,
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundElevated,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  saveButton: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: colors.backgroundElevated,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  pressed: { opacity: 0.6 } as ViewStyle,
  disabledButton: { opacity: 0.4 } as ViewStyle,
  scrollContent: { paddingBottom: 40 } as ViewStyle,
  iconSection: { alignItems: "center", paddingVertical: 24 } as ViewStyle,
  iconWrapper: { position: "relative", width: 80, height: 80 } as ViewStyle,
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  editBadge: {
    position: "absolute",
    bottom: -3,
    right: -3,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.backgroundElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
  } as ViewStyle,
  nameInputContainer: {
    marginHorizontal: 24,
    marginBottom: 8,
    backgroundColor: colors.backgroundElevated,
    borderRadius: 14,
    borderCurve: "continuous",
    paddingHorizontal: 16,
    paddingVertical: 14,
  } as ViewStyle,
  nameInput: { fontSize: 16, color: colors.textPrimary } as TextStyle,
  errorText: {
    marginHorizontal: 28,
    marginTop: 4,
    marginBottom: 8,
  } as TextStyle,
  settingsGroup: {
    marginHorizontal: 24,
    marginTop: 16,
    backgroundColor: colors.backgroundElevated,
    borderRadius: 14,
    borderCurve: "continuous",
    overflow: "hidden",
  } as ViewStyle,
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  } as ViewStyle,
  settingValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  } as ViewStyle,
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 16,
  } as ViewStyle,
  balanceInput: {
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: "right",
    minWidth: 100,
  } as TextStyle,
  toggleGroup: {
    marginHorizontal: 24,
    marginTop: 12,
    backgroundColor: colors.backgroundElevated,
    borderRadius: 14,
    borderCurve: "continuous",
    overflow: "hidden",
  } as ViewStyle,
});

export default AddAccountScreen;
