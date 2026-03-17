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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { useFormik } from "formik";
import * as Yup from "yup";
import { colors } from "@constants/colors";
import { ScreenHeader } from "@components/ui/ScreenHeader";
import { Typography } from "@components/ui/Typography";
import { useWorkspaceStore } from "@stores/useWorkspaceStore";
import { useCreateTag, useUpdateTag } from "@services/tags/tags.queries";

const TAG_COLORS = [
  "#FF3B30",
  "#FF9500",
  "#FFCC00",
  "#34C759",
  "#00C7BE",
  "#32ADE6",
  "#007AFF",
  "#5856D6",
  "#AF52DE",
  "#FF2D55",
  "#A2845E",
  "#8E8E93",
];

const MIN_NAME_LENGTH = 1;

const AddTagScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const {
    mode,
    tagId,
    initialName,
    initialColor,
    workspaceId: paramWorkspaceId,
  } = useLocalSearchParams<{
    mode?: string;
    tagId?: string;
    initialName?: string;
    initialColor?: string;
    workspaceId?: string;
  }>();

  const activeWorkspaceId = useWorkspaceStore((s) => s.id);
  const wsId = paramWorkspaceId || activeWorkspaceId;

  const isEdit = mode === "edit" && !!tagId;

  const { mutate: createTag, isPending: creating } = useCreateTag(wsId);
  const { mutate: updateTag, isPending: updating } = useUpdateTag(wsId);
  const saving = creating || updating;

  const validationSchema = Yup.object({
    name: Yup.string()
      .trim()
      .required(t("tags.errors.nameRequired"))
      .min(MIN_NAME_LENGTH, t("tags.errors.nameMin", { min: MIN_NAME_LENGTH })),
  });

  const formik = useFormik({
    initialValues: {
      name: initialName ?? "",
      color: initialColor ?? TAG_COLORS[5],
    },
    validationSchema,
    validateOnChange: false,
    validateOnBlur: false,
    onSubmit: (values) => {
      if (process.env.EXPO_OS === "ios") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const trimmedName = values.name.trim();

      if (isEdit) {
        updateTag(
          { id: tagId, name: trimmedName, color: values.color },
          {
            onSuccess: () => router.back(),
            onError: () =>
              Alert.alert(
                t("tags.errors.saveTitle"),
                t("tags.errors.saveMessage"),
              ),
          },
        );
        return;
      }

      createTag(
        {
          name: trimmedName,
          color: values.color,
          workspaceId: wsId ?? undefined,
        },
        {
          onSuccess: () => router.back(),
          onError: () =>
            Alert.alert(
              t("tags.errors.saveTitle"),
              t("tags.errors.saveMessage"),
            ),
        },
      );
    },
  });

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
      <ScreenHeader
        title={t(isEdit ? "tags.editTitle" : "tags.addTitle")}
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
          {/* Color preview */}
          <View style={s.colorPreviewRow}>
            <View
              style={[s.colorPreview, { backgroundColor: formik.values.color }]}
            >
              <Ionicons name="pricetag" size={28} color="#fff" />
            </View>
          </View>

          <Typography
            variant="caption"
            color="textSecondary"
            style={s.sectionLabel}
            i18nKey="tags.nameSection"
          />

          <View style={s.nameInputContainer}>
            <TextInput
              style={s.nameInput}
              placeholder={t("tags.namePlaceholder")}
              placeholderTextColor={colors.textTertiary}
              value={formik.values.name}
              onChangeText={(text) => {
                formik.setFieldValue("name", text);
                if (nameError) formik.setFieldError("name", undefined);
              }}
              autoCorrect={false}
              autoFocus={!isEdit}
              returnKeyType="done"
              onSubmitEditing={() => formik.handleSubmit()}
            />
          </View>
          {nameError && (
            <Typography variant="caption" color="error" style={s.errorText}>
              {nameError}
            </Typography>
          )}

          <Typography
            variant="caption"
            color="textSecondary"
            style={s.sectionLabel}
            i18nKey="tags.colorSection"
          />

          <View style={s.colorGrid}>
            {TAG_COLORS.map((color) => (
              <Pressable
                key={color}
                style={[
                  s.colorSwatch,
                  { backgroundColor: color },
                  formik.values.color === color && s.colorSwatchSelected,
                ]}
                onPress={() => formik.setFieldValue("color", color)}
              >
                {formik.values.color === color && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </Pressable>
            ))}
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
  scrollContent: {
    paddingBottom: 40,
  } as ViewStyle,
  colorPreviewRow: {
    alignItems: "center",
    paddingVertical: 24,
  } as ViewStyle,
  colorPreview: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
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
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginHorizontal: 24,
  } as ViewStyle,
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: colors.textPrimary,
  } as ViewStyle,
});

export default AddTagScreen;
