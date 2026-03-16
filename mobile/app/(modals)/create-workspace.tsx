import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useFormik } from "formik";
import * as Yup from "yup";
import { colors } from "@constants/colors";
import { ScreenHeader } from "@components/ui/ScreenHeader";
import { Typography } from "@components/ui/Typography";
import { Button } from "@components/ui/Button";
import { useWorkspaceStore } from "@stores/useWorkspaceStore";
import { usePickerStore } from "@stores/usePickerStore";
import { useCreateWorkspace } from "@services/workspaces/workspaces.queries";
import { getCurrencySymbol } from "@constants/account-types";

const MIN_NAME_LENGTH = 2;

const CreateWorkspaceScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);

  const validationSchema = Yup.object({
    name: Yup.string()
      .trim()
      .required(t("workspace.create.errors.nameRequired"))
      .min(
        MIN_NAME_LENGTH,
        t("workspace.create.errors.nameMin", { min: MIN_NAME_LENGTH }),
      ),
  });

  const pickedCurrency = usePickerStore((s) => s.currency);
  const clearPicker = usePickerStore((s) => s.clearAll);

  useFocusEffect(
    useCallback(() => {
      if (pickedCurrency) {
        formik.setFieldValue("currency", pickedCurrency);
        clearPicker();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pickedCurrency, clearPicker]),
  );

  const { mutate: doCreate, isPending: creating } = useCreateWorkspace();

  const handleCreate = (name: string, currency: string) => {
    doCreate(
      { name, currency },
      {
        onSuccess: (data) => {
          setWorkspace(data.id, data.name);
          router.replace("/settings/workspace-list" as never);
        },
        onError: () => {
          Alert.alert(
            t("workspace.create.errors.createTitle"),
            t("workspace.create.errors.createMessage"),
          );
        },
      },
    );
  };

  const formik = useFormik({
    initialValues: { name: "", currency: "USD" },
    validationSchema,
    validateOnChange: false,
    validateOnBlur: false,
    onSubmit: (values) => {
      handleCreate(values.name.trim(), values.currency);
    },
  });

  const nameError =
    formik.submitCount > 0 && formik.errors.name
      ? formik.errors.name
      : undefined;

  const initial = formik.values.name.trim().charAt(0).toUpperCase() || "+";

  return (
    <View
      style={[
        s.container,
        { paddingBottom: insets.bottom, paddingTop: insets.top },
      ]}
    >
      <ScreenHeader
        title={t("workspace.create.title")}
        left={<Ionicons name="close" size={24} color={colors.textPrimary} />}
        onLeftPress={() => router.back()}
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
          <View style={s.heroSection}>
            <View style={s.heroIcon}>
              <Typography variant="h1" color="textOnAccent">
                {initial}
              </Typography>
            </View>
          </View>

          <Typography
            variant="caption"
            color="textSecondary"
            style={s.sectionLabel}
            i18nKey="workspace.details.generalSection"
          />
          <View style={s.card}>
            <View style={[s.inputRow, s.inputRowDivider]}>
              <Typography
                variant="body"
                color="textSecondary"
                style={s.inputLabel}
                i18nKey="workspace.details.nameLabel"
              />
              <View style={s.inputSeparator} />
              <TextInput
                style={s.textInput}
                value={formik.values.name}
                onChangeText={(text) => {
                  formik.setFieldValue("name", text);
                  if (nameError) formik.setFieldError("name", undefined);
                }}
                placeholder={t("workspace.create.namePlaceholder")}
                placeholderTextColor={colors.textTertiary}
                returnKeyType="done"
                autoCorrect={false}
                autoFocus
                maxLength={50}
                onSubmitEditing={() => formik.handleSubmit()}
              />
            </View>
            <Pressable
              style={({ pressed }) => [s.inputRow, pressed && s.pressed]}
              onPress={() =>
                router.push(
                  `/(modals)/currency-picker?selected=${formik.values.currency}&fromModal=1` as never,
                )
              }
            >
              <Typography
                variant="body"
                color="textSecondary"
                style={s.inputLabel}
                i18nKey="workspace.details.currencyLabel"
              />
              <View style={s.inputSeparator} />
              <Typography
                variant="body"
                style={s.currencyValue}
                numberOfLines={1}
              >
                {getCurrencySymbol(formik.values.currency) !==
                formik.values.currency
                  ? `${formik.values.currency} (${getCurrencySymbol(formik.values.currency)})`
                  : formik.values.currency}
              </Typography>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textTertiary}
              />
            </Pressable>
          </View>

          {nameError && (
            <Typography variant="caption" color="error" style={s.errorText}>
              {nameError}
            </Typography>
          )}

          <Button
            variant="primary"
            style={s.createButton}
            loading={creating}
            disabled={creating}
            onPress={() => formik.handleSubmit()}
            i18nKey="workspace.create.createButton"
          />
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
  pressed: { opacity: 0.6 } as ViewStyle,
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  } as ViewStyle,
  heroSection: {
    alignItems: "center",
    paddingVertical: 28,
  } as ViewStyle,
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.backgroundSurface,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  sectionLabel: {
    marginBottom: 6,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  } as TextStyle,
  card: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 14,
    borderCurve: "continuous",
    overflow: "hidden",
    marginBottom: 6,
  } as ViewStyle,
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
    minHeight: 50,
  } as ViewStyle,
  inputRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  } as ViewStyle,
  inputLabel: {
    width: 80,
  } as TextStyle,
  inputSeparator: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    backgroundColor: colors.border,
  } as ViewStyle,
  currencyValue: {
    flex: 1,
  } as TextStyle,
  textInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
  } as TextStyle,
  errorText: {
    marginLeft: 4,
    marginBottom: 16,
  } as TextStyle,
  createButton: {
    marginTop: 12,
  } as ViewStyle,
});

export default CreateWorkspaceScreen;
