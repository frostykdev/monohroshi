import { useCallback, useRef } from "react";
import {
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { useFormik } from "formik";
import * as Yup from "yup";
import { colors } from "@constants/colors";
import { DEFAULT_ICON, DEFAULT_ICON_COLOR } from "@constants/icon-list";
import { Typography } from "@components/ui/Typography";
import { usePickerStore } from "@stores/usePickerStore";
import { useCreateCategory } from "@services/categories/categories.queries";

const MIN_NAME_LENGTH = 2;

const AddCategoryScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { tab, workspaceId } = useLocalSearchParams<{
    tab?: string;
    workspaceId?: string;
  }>();

  const isIncome = tab === "income";
  const { mutate: createCategory, isPending: saving } = useCreateCategory(
    workspaceId || null,
  );

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
      name: "",
      icon: DEFAULT_ICON as string,
    },
    validationSchema,
    validateOnChange: false,
    validateOnBlur: false,
    onSubmit: (values) => {
      if (process.env.EXPO_OS === "ios") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      createCategory(
        {
          name: values.name.trim(),
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

  const haptic = () => {
    if (process.env.EXPO_OS === "ios") Haptics.selectionAsync();
  };

  const nameError =
    formik.submitCount > 0 && formik.errors.name
      ? formik.errors.name
      : undefined;

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
        <Typography
          variant="label"
          i18nKey="onboarding.categoriesSetup.addTitle"
        />
        <Pressable
          style={({ pressed }) => [s.headerButton, pressed && s.pressed]}
          onPress={() => !saving && formik.handleSubmit()}
          disabled={saving}
          hitSlop={8}
        >
          <Typography
            variant="label"
            color={saving ? "textTertiary" : "textSecondary"}
          >
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
                `/(modals)/icon-picker?selectedIcon=${encodeURIComponent(formik.values.icon)}&selectedColor=${encodeURIComponent(DEFAULT_ICON_COLOR)}&hideColorBar=true`,
              );
            }}
          >
            <View style={s.iconWrapper}>
              <View
                style={[s.iconCircle, { backgroundColor: DEFAULT_ICON_COLOR }]}
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
              autoFocus
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
  pressed: {
    opacity: 0.6,
  } as ViewStyle,
  scrollContent: {
    paddingBottom: 40,
  } as ViewStyle,
  iconSection: {
    alignItems: "center",
    paddingVertical: 24,
  } as ViewStyle,
  iconWrapper: {
    position: "relative",
    width: 80,
    height: 80,
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
