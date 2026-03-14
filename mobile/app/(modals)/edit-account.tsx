import { useCallback, useEffect, useRef } from "react";
import {
  Alert,
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
import { BalanceInput } from "@components/ui/BalanceInput";
import { IconPickerButton } from "@components/ui/IconPickerButton";
import { ScreenHeader } from "@components/ui/ScreenHeader";
import { Typography } from "@components/ui/Typography";
import { usePickerStore } from "@stores/usePickerStore";
import { useWorkspaceStore } from "@stores/useWorkspaceStore";
import {
  useAccount,
  useDeleteAccount,
  useUpdateAccount,
} from "@services/accounts/accounts.queries";

const haptic = () => {
  if (process.env.EXPO_OS === "ios") Haptics.selectionAsync();
};

const EditAccountScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const activeWorkspaceId = useWorkspaceStore((s) => s.id);
  const { data: account } = useAccount(id);
  const { mutate: updateAccount, isPending: saving } =
    useUpdateAccount(activeWorkspaceId);
  const { mutate: deleteAccount, isPending: deleting } =
    useDeleteAccount(activeWorkspaceId);

  const cfg = getAccountTypeConfig(account?.type ?? "bank_account");

  const validationSchema = Yup.object({
    name: Yup.string()
      .trim()
      .required(t("onboarding.accountSetup.errors.nameRequired"))
      .min(1, t("onboarding.accountSetup.errors.nameRequired")),
  });

  const formik = useFormik({
    initialValues: {
      name: account?.name ?? "",
      accountType: account?.type ?? "bank_account",
      currency: account?.currency ?? "USD",
      balance: account?.balance ?? "0",
      isPrimary: account?.isPrimary ?? false,
      icon: account?.icon ?? cfg.icon,
      iconColor: account?.color ?? cfg.color,
    },
    enableReinitialize: true,
    validationSchema,
    validateOnChange: false,
    validateOnBlur: false,
    onSubmit: (values) => {
      if (!id) return;
      if (process.env.EXPO_OS === "ios") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      updateAccount(
        {
          id,
          name: values.name.trim(),
          type: values.accountType,
          currency: values.currency,
          balance: values.balance || "0",
          isPrimary: values.isPrimary,
          icon: values.icon,
          color: values.iconColor,
        },
        {
          onSuccess: () => router.back(),
          onError: () =>
            Alert.alert(
              t("accounts.errors.saveTitle"),
              t("accounts.errors.saveMessage"),
            ),
        },
      );
    },
  });

  const formikRef = useRef(formik);
  formikRef.current = formik;

  useFocusEffect(
    useCallback(() => {
      const store = usePickerStore.getState();
      if (store.accountType) {
        const typeCfg = getAccountTypeConfig(store.accountType);
        formikRef.current.setFieldValue("accountType", store.accountType);
        formikRef.current.setFieldValue("icon", typeCfg.icon);
        formikRef.current.setFieldValue("iconColor", typeCfg.color);
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

  // Sync once account data loads (before user touches anything)
  const initialized = useRef(false);
  useEffect(() => {
    if (account && !initialized.current) {
      initialized.current = true;
      formik.resetForm({
        values: {
          name: account.name,
          accountType: account.type,
          currency: account.currency,
          balance: account.balance,
          isPrimary: account.isPrimary,
          icon: account.icon ?? getAccountTypeConfig(account.type).icon,
          iconColor: account.color ?? getAccountTypeConfig(account.type).color,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  const currencySymbol = getCurrencySymbol(formik.values.currency);
  const nameError =
    formik.submitCount > 0 && formik.errors.name
      ? formik.errors.name
      : undefined;

  const handleArchive = () => {
    if (!id) return;
    Alert.alert(
      t("accounts.archiveConfirmTitle"),
      t("accounts.archiveConfirmMessage", { name: account?.name ?? "" }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("accounts.archiveAccount"),
          onPress: () =>
            updateAccount(
              { id, isArchived: true },
              {
                onSuccess: () => router.back(),
                onError: () =>
                  Alert.alert(
                    t("accounts.errors.archiveTitle"),
                    t("accounts.errors.archiveMessage"),
                  ),
              },
            ),
        },
      ],
    );
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert(
      t("accounts.deleteConfirmTitle"),
      t("accounts.deleteConfirmMessage", { name: account?.name ?? "" }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () =>
            deleteAccount(id, {
              onSuccess: () => {
                router.dismissAll();
                router.replace("/settings/accounts" as never);
              },
              onError: () =>
                Alert.alert(
                  t("accounts.errors.deleteTitle"),
                  t("accounts.errors.deleteMessage"),
                ),
            }),
        },
      ],
    );
  };

  return (
    <View
      style={[
        s.container,
        { paddingBottom: insets.bottom, paddingTop: insets.top },
      ]}
    >
      <ScreenHeader
        title={t("accounts.edit.title")}
        left={<Ionicons name="close" size={24} color={colors.textPrimary} />}
        onLeftPress={() => router.back()}
        right={
          <Typography
            variant="label"
            color={saving ? "textTertiary" : "textPrimary"}
          >
            {t("common.save")}
          </Typography>
        }
        onRightPress={() => formik.handleSubmit()}
        rightVariant="pill"
        rightDisabled={saving}
      />

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
          <IconPickerButton
            icon={formik.values.icon as string}
            color={formik.values.iconColor}
          />

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
                  `/(modals)/currency-picker?selected=${formik.values.currency}&fromModal=1`,
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

            <BalanceInput
              value={formik.values.balance}
              onChange={(v) => formik.setFieldValue("balance", v)}
              currency={formik.values.currency}
            />
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
              />
            </View>
          </View>

          {/* Destructive actions */}
          <View style={s.actionsGroup}>
            <Pressable
              style={({ pressed }) => [s.actionRow, pressed && s.pressed]}
              onPress={handleArchive}
            >
              <Ionicons
                name="archive-outline"
                size={20}
                color={colors.textSecondary}
              />
              <Typography variant="body" color="textSecondary">
                {t("accounts.archiveAccount")}
              </Typography>
            </Pressable>

            <View style={s.separator} />

            <Pressable
              style={({ pressed }) => [
                s.actionRow,
                pressed && s.pressed,
                deleting && s.pressed,
              ]}
              onPress={handleDelete}
              disabled={deleting}
            >
              <Ionicons name="trash-outline" size={20} color={colors.error} />
              <Typography variant="body" color="error">
                {t("accounts.deleteAccount")}
              </Typography>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background } as ViewStyle,
  flex: { flex: 1 } as ViewStyle,
  pressed: { opacity: 0.6 } as ViewStyle,
  disabledButton: { opacity: 0.4 } as ViewStyle,
  scrollContent: { paddingBottom: 40 } as ViewStyle,
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
  toggleGroup: {
    marginHorizontal: 24,
    marginTop: 12,
    backgroundColor: colors.backgroundElevated,
    borderRadius: 14,
    borderCurve: "continuous",
    overflow: "hidden",
  } as ViewStyle,
  actionsGroup: {
    marginHorizontal: 24,
    marginTop: 12,
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
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
});

export default EditAccountScreen;
