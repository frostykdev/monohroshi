import { useCallback, useRef } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { useFormik } from "formik";
import * as Yup from "yup";
import { colors } from "@constants/colors";
import { DEFAULT_ICON, DEFAULT_ICON_COLOR } from "@constants/icon-list";
import { IconPickerButton } from "@components/ui/IconPickerButton";
import { ScreenHeader } from "@components/ui/ScreenHeader";
import { Typography } from "@components/ui/Typography";
import { usePickerStore } from "@stores/usePickerStore";
import { useOnboardingStore } from "@stores/useOnboardingStore";
import {
  useCreateCategory,
  useUpdateCategory,
} from "@services/categories/categories.queries";

const MIN_NAME_LENGTH = 2;

const AddCategoryScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const {
    tab,
    workspaceId,
    mode,
    categoryId,
    initialName,
    initialIcon,
    localId,
  } = useLocalSearchParams<{
    tab?: string;
    workspaceId?: string;
    mode?: "edit" | "edit-local";
    categoryId?: string;
    initialName?: string;
    initialIcon?: string;
    localId?: string;
  }>();

  const isEditBackend = mode === "edit" && !!categoryId;
  const isEditLocal = mode === "edit-local" && !!localId;
  const isIncome = tab === "income";

  const { mutate: createCategory, isPending: creating } = useCreateCategory(
    workspaceId || null,
  );
  const { mutate: updateCategory, isPending: updating } = useUpdateCategory(
    workspaceId || null,
  );
  const saving = creating || updating;

  const expenseCategories = useOnboardingStore((s) => s.expenseCategories);
  const incomeCategories = useOnboardingStore((s) => s.incomeCategories);
  const setExpenseCategories = useOnboardingStore(
    (s) => s.setExpenseCategories,
  );
  const setIncomeCategories = useOnboardingStore((s) => s.setIncomeCategories);

  const validationSchema = Yup.object({
    name: Yup.string()
      .trim()
      .required(t("onboarding.categoriesSetup.errors.nameRequired"))
      .min(
        MIN_NAME_LENGTH,
        t("onboarding.categoriesSetup.errors.nameMin", {
          min: MIN_NAME_LENGTH,
        }),
      ),
  });

  const formik = useFormik({
    initialValues: {
      name: initialName ?? "",
      icon: (initialIcon ?? DEFAULT_ICON) as string,
    },
    validationSchema,
    validateOnChange: false,
    validateOnBlur: false,
    onSubmit: (values) => {
      if (process.env.EXPO_OS === "ios") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const trimmedName = values.name.trim();

      if (isEditBackend) {
        updateCategory(
          { id: categoryId, name: trimmedName, icon: values.icon },
          { onSuccess: () => router.back() },
        );
        return;
      }

      if (isEditLocal) {
        const list = isIncome ? incomeCategories : expenseCategories;
        const updated = list.map((c) =>
          c.id === localId
            ? { ...c, name: trimmedName, icon: values.icon as never }
            : c,
        );
        if (isIncome) {
          setIncomeCategories(updated);
        } else {
          setExpenseCategories(updated);
        }
        router.back();
        return;
      }

      createCategory(
        {
          name: trimmedName,
          type: isIncome ? "income" : "expense",
          icon: values.icon,
          workspaceId: workspaceId || undefined,
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
      if (store.icon) {
        formikRef.current.setFieldValue("icon", store.icon);
        usePickerStore.setState({ icon: null, iconColor: null });
      }
    }, []),
  );

  const nameError =
    formik.submitCount > 0 && formik.errors.name
      ? formik.errors.name
      : undefined;

  const titleKey =
    isEditBackend || isEditLocal
      ? "onboarding.categoriesSetup.editTitle"
      : "onboarding.categoriesSetup.addTitle";

  return (
    <View
      style={[
        s.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <ScreenHeader
        title={t(titleKey as never)}
        left={<Ionicons name="close" size={24} color={colors.textPrimary} />}
        onLeftPress={() => router.back()}
        right={
          <Typography
            variant="label"
            color={saving ? "textTertiary" : "textPrimary"}
          >
            {t("onboarding.accountSetup.save")}
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
          <IconPickerButton
            icon={formik.values.icon}
            color={DEFAULT_ICON_COLOR}
            hideColorBar
          />

          <Typography
            variant="caption"
            color="textSecondary"
            style={s.sectionLabel}
            i18nKey="onboarding.categoriesSetup.generalSection"
          />

          <View style={s.nameInputContainer}>
            <TextInput
              style={s.nameInput}
              placeholder={t("onboarding.categoriesSetup.addPlaceholder")}
              placeholderTextColor={colors.textTertiary}
              value={formik.values.name}
              onChangeText={(text) => {
                formik.setFieldValue("name", text);
                if (nameError) formik.setFieldError("name", undefined);
              }}
              autoCorrect={false}
              autoFocus={!isEditBackend && !isEditLocal}
              returnKeyType="done"
              onSubmitEditing={() => formik.handleSubmit()}
            />
          </View>
          {nameError && (
            <Typography variant="caption" color="error" style={s.errorText}>
              {nameError}
            </Typography>
          )}
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
  scrollContent: {
    paddingBottom: 40,
  } as ViewStyle,
  sectionLabel: {
    marginHorizontal: 28,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  } as TextStyle,
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
  } as TextStyle,
  errorText: {
    marginHorizontal: 28,
    marginTop: -18,
    marginBottom: 20,
  } as TextStyle,
});

export default AddCategoryScreen;
