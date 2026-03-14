import { useCallback, useRef } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
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
import { BalanceInput } from "@components/ui/BalanceInput";
import { ScreenHeader } from "@components/ui/ScreenHeader";
import { Typography } from "@components/ui/Typography";
import { useWorkspaceStore } from "@stores/useWorkspaceStore";
import { usePickerStore } from "@stores/usePickerStore";
import {
  useBudgets,
  useCreateBudget,
  useDeleteBudget,
  useUpdateBudget,
} from "@services/budgets/budgets.queries";

const haptic = () => {
  if (process.env.EXPO_OS === "ios") Haptics.selectionAsync();
};

const getCurrentMonth = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

const AddBudgetModal = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const activeWorkspaceId = useWorkspaceStore((s) => s.id);
  const month = getCurrentMonth();

  const {
    id: editId,
    amount: paramAmount,
    categoryId: paramCategoryId,
    categoryName: paramCategoryName,
  } = useLocalSearchParams<{
    id?: string;
    amount?: string;
    categoryId?: string;
    categoryName?: string;
  }>();

  const isEdit = !!editId;

  const validationSchema = Yup.object({
    amount: Yup.string()
      .required()
      .test(
        "positive",
        t("budgets.errors.saveFailed"),
        (v) => !!v && parseFloat(v) > 0,
      ),
  });

  const formik = useFormik({
    initialValues: {
      amount: paramAmount ?? "",
      isGeneral: !paramCategoryId,
      categoryId: paramCategoryId || null,
      categoryName: paramCategoryName ?? "",
    },
    validationSchema,
    validateOnChange: false,
    validateOnBlur: false,
    onSubmit: (values) => {
      if (process.env.EXPO_OS === "ios") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      if (isEdit && editId) {
        updateBudget(
          { id: editId, amount: values.amount },
          {
            onSuccess: () => router.back(),
            onError: () =>
              Alert.alert(t("common.save"), t("budgets.errors.saveFailed")),
          },
        );
      } else {
        createBudget(
          {
            amount: values.amount,
            categoryId: values.isGeneral ? null : values.categoryId,
            workspaceId: activeWorkspaceId ?? undefined,
            month,
          },
          {
            onSuccess: () => router.back(),
            onError: (err: unknown) => {
              const msg =
                (err as { response?: { status?: number } })?.response
                  ?.status === 409
                  ? t("budgets.errors.duplicate")
                  : t("budgets.errors.saveFailed");
              Alert.alert(t("common.save"), msg);
            },
          },
        );
      }
    },
  });

  const formikRef = useRef(formik);
  formikRef.current = formik;

  useFocusEffect(
    useCallback(() => {
      const store = usePickerStore.getState();
      if (store.categoryId && store.categoryName) {
        formikRef.current.setFieldValue("categoryId", store.categoryId);
        formikRef.current.setFieldValue("categoryName", store.categoryName);
        formikRef.current.setFieldValue("isGeneral", false);
        usePickerStore.setState({ categoryId: null, categoryName: null });
      }
    }, []),
  );

  const { mutate: createBudget, isPending: creating } = useCreateBudget(
    activeWorkspaceId,
    month,
  );
  const { mutate: updateBudget, isPending: updating } = useUpdateBudget(
    activeWorkspaceId,
    month,
  );
  const { mutate: deleteBudget, isPending: deleting } = useDeleteBudget(
    activeWorkspaceId,
    month,
  );

  const { data: existingBudgets = [] } = useBudgets(activeWorkspaceId, month);
  const generalBudgetExists =
    !isEdit && existingBudgets.some((b) => b.categoryId === null);
  const takenCategoryIds = isEdit
    ? []
    : existingBudgets
        .filter((b) => b.categoryId !== null)
        .map((b) => b.categoryId as string);

  const saving = creating || updating;

  const handleScopeToggle = (general: boolean) => {
    haptic();
    formik.setFieldValue("isGeneral", general);
    if (general) {
      formik.setFieldValue("categoryId", null);
      formik.setFieldValue("categoryName", "");
    }
  };

  const handleDelete = () => {
    if (!editId) return;
    Alert.alert(
      t("budgets.deleteConfirmTitle"),
      t("budgets.deleteConfirmMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("budgets.deleteConfirmButton"),
          style: "destructive",
          onPress: () =>
            deleteBudget(editId, {
              onSuccess: () => router.back(),
            }),
        },
      ],
    );
  };

  const { isGeneral, categoryName } = formik.values;

  return (
    <View
      style={[
        s.container,
        { paddingBottom: insets.bottom, paddingTop: insets.top },
      ]}
    >
      <ScreenHeader
        title={t(isEdit ? "budgets.add.titleEdit" : "budgets.add.title")}
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
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Scope — only shown when creating */}
          {!isEdit && (
            <>
              <Typography
                variant="caption"
                color="textSecondary"
                style={s.sectionLabel}
              >
                {t("budgets.scopeLabel").toUpperCase()}
              </Typography>
              <View style={s.card}>
                <Pressable
                  style={({ pressed }) => [
                    s.row,
                    generalBudgetExists && s.rowDisabled,
                    !generalBudgetExists && pressed && s.pressed,
                  ]}
                  onPress={
                    generalBudgetExists
                      ? undefined
                      : () => handleScopeToggle(true)
                  }
                  disabled={generalBudgetExists}
                >
                  <View style={s.rowIcon}>
                    <Ionicons
                      name="globe-outline"
                      size={18}
                      color={
                        generalBudgetExists
                          ? colors.textDisabled
                          : colors.textPrimary
                      }
                    />
                  </View>
                  <View style={s.separator} />
                  <View style={s.flex}>
                    <Typography
                      variant="body"
                      color={
                        generalBudgetExists ? "textDisabled" : "textPrimary"
                      }
                    >
                      {t("budgets.general")}
                    </Typography>
                    {generalBudgetExists && (
                      <Typography variant="caption" color="textDisabled">
                        {t("budgets.errors.duplicate")}
                      </Typography>
                    )}
                  </View>
                  {isGeneral && !generalBudgetExists && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.accent}
                    />
                  )}
                </Pressable>

                <View style={s.divider} />

                <Pressable
                  style={({ pressed }) => [s.row, pressed && s.pressed]}
                  onPress={() => {
                    handleScopeToggle(false);
                    const excluded = takenCategoryIds.join(",");
                    router.push(
                      `/settings/categories?pickerMode=true&tab=expense&fromModal=1${excluded ? `&excludedCategoryIds=${encodeURIComponent(excluded)}` : ""}` as never,
                    );
                  }}
                >
                  <View style={s.rowIcon}>
                    <Ionicons
                      name="pricetag"
                      size={18}
                      color={colors.textPrimary}
                    />
                  </View>
                  <View style={s.separator} />
                  <View style={s.flex}>
                    <Typography variant="body">
                      {t("budgets.category")}
                    </Typography>
                    {categoryName ? (
                      <Typography variant="caption" color="textSecondary">
                        {categoryName}
                      </Typography>
                    ) : null}
                  </View>
                  {!isGeneral && formik.values.categoryId && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.accent}
                    />
                  )}
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.textTertiary}
                  />
                </Pressable>
              </View>
            </>
          )}

          {/* Amount */}
          <Typography
            variant="caption"
            color="textSecondary"
            style={s.sectionLabel}
          >
            {t("budgets.amountLabel").toUpperCase()}
          </Typography>
          <View style={s.card}>
            <BalanceInput
              value={formik.values.amount}
              onChange={(v) => formik.setFieldValue("amount", v)}
              currency="USD"
              label={t("budgets.amountLabel")}
              title={t("budgets.amountLabel")}
              showSignToggle={false}
              showInfo={false}
            />
          </View>

          {/* Delete — edit mode only */}
          {isEdit && (
            <Pressable
              style={({ pressed }) => [s.deleteButton, pressed && s.pressed]}
              onPress={handleDelete}
              disabled={deleting}
            >
              <Typography variant="body" color="error">
                {t("budgets.delete")}
              </Typography>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundElevated,
  } as ViewStyle,
  flex: {
    flex: 1,
  } as ViewStyle,
  scrollContent: {
    paddingBottom: 40,
  } as ViewStyle,
  sectionLabel: {
    marginHorizontal: 28,
    marginTop: 20,
    marginBottom: 6,
    letterSpacing: 0.5,
  } as TextStyle,
  card: {
    marginHorizontal: 16,
    backgroundColor: colors.backgroundSurface,
    borderRadius: 14,
    borderCurve: "continuous",
    overflow: "hidden",
  } as ViewStyle,
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 16,
    gap: 12,
    minHeight: 54,
  } as ViewStyle,
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundElevated,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  separator: {
    width: StyleSheet.hairlineWidth,
    height: 20,
    backgroundColor: colors.border,
  } as ViewStyle,
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 58,
  } as ViewStyle,
  deleteButton: {
    marginTop: 32,
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: colors.backgroundSurface,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  pressed: {
    opacity: 0.6,
  } as ViewStyle,
  rowDisabled: {
    opacity: 0.55,
  } as ViewStyle,
});

export default AddBudgetModal;
