import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
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
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import type { BottomSheetDefaultBackdropProps } from "@gorhom/bottom-sheet/lib/typescript/components/bottomSheetBackdrop/types";
import { colors } from "@constants/colors";
import {
  getCurrencySymbol,
  getAccountTypeConfig,
} from "@constants/account-types";
import { Typography } from "@components/ui/Typography";
import {
  SegmentedControl,
  type Segment,
} from "@components/ui/SegmentedControl";
import { AmountKeyboard } from "@components/ui/AmountKeyboard";
import { useAmountKeyboard } from "@hooks/useAmountKeyboard";
import { usePickerStore } from "@stores/usePickerStore";
import { useWorkspaceStore } from "@stores/useWorkspaceStore";
import { useAccounts } from "@services/accounts/accounts.queries";
import type { Account } from "@services/accounts/accounts.api";
import { useCreateTransaction } from "@services/transactions/transactions.queries";
import { useFxConvert } from "@services/fx/fx.queries";

// ─── Types ────────────────────────────────────────────────────────────────────

type TransactionType = "expense" | "income" | "transfer";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const haptic = () => {
  if (process.env.EXPO_OS === "ios") Haptics.selectionAsync().catch(() => {});
};

const formatDateLocale = (date: Date, language: string): string =>
  date.toLocaleDateString(language === "uk" ? "uk-UA" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const formatAmount = (value: string, currency: string): string => {
  const num = parseFloat(value);
  if (!value || isNaN(num) || num === 0)
    return `0 ${getCurrencySymbol(currency)}`;
  const abs = Math.abs(num).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${num < 0 ? "−" : ""}${abs} ${getCurrencySymbol(currency)}`;
};

// ─── Mini Calendar ────────────────────────────────────────────────────────────

type CalendarProps = { selected: Date; onSelect: (d: Date) => void };

const WEEK_DAYS_UK = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "НД"];
const WEEK_DAYS_EN = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

const InlineCalendar = ({ selected, onSelect }: CalendarProps) => {
  const { i18n } = useTranslation();
  const [viewing, setViewing] = useState(
    new Date(selected.getFullYear(), selected.getMonth(), 1),
  );

  const year = viewing.getFullYear();
  const month = viewing.getMonth();

  const monthLabel = viewing.toLocaleDateString(
    i18n.language === "uk" ? "uk-UA" : "en-US",
    { month: "long", year: "numeric" },
  );

  const firstDay = new Date(year, month, 1).getDay();
  const offset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  const isSelected = (d: number) =>
    selected.getDate() === d &&
    selected.getMonth() === month &&
    selected.getFullYear() === year;

  const isToday = (d: number) => {
    const now = new Date();
    return (
      now.getDate() === d &&
      now.getMonth() === month &&
      now.getFullYear() === year
    );
  };

  const weekDays = i18n.language === "uk" ? WEEK_DAYS_UK : WEEK_DAYS_EN;

  return (
    <View style={cal.container}>
      <View style={cal.header}>
        <Pressable
          onPress={() => setViewing(new Date(year, month - 1, 1))}
          hitSlop={8}
          style={cal.navBtn}
        >
          <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
        </Pressable>
        <Typography variant="label" style={cal.monthLabel}>
          {monthLabel}
        </Typography>
        <Pressable
          onPress={() => setViewing(new Date(year, month + 1, 1))}
          hitSlop={8}
          style={cal.navBtn}
        >
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.textPrimary}
          />
        </Pressable>
      </View>

      <View style={cal.weekRow}>
        {weekDays.map((d) => (
          <View key={d} style={cal.cell}>
            <Typography
              variant="caption"
              color="textTertiary"
              style={cal.weekDayText}
            >
              {d}
            </Typography>
          </View>
        ))}
      </View>

      {rows.map((row, ri) => (
        <View key={ri} style={cal.weekRow}>
          {Array.from({ length: 7 }).map((_, ci) => {
            const day = row[ci] ?? null;
            const sel = day !== null && isSelected(day);
            const tod = day !== null && isToday(day);
            const dayTextStyles: TextStyle[] = [cal.dayText];
            if (tod && !sel) dayTextStyles.push(cal.todayText);
            if (sel) dayTextStyles.push(cal.selectedDayText);
            return (
              <Pressable
                key={ci}
                style={[cal.cell, sel && cal.selectedCell]}
                onPress={() => {
                  if (day !== null) {
                    haptic();
                    onSelect(new Date(year, month, day));
                  }
                }}
              >
                {day !== null && (
                  <Typography variant="body" style={dayTextStyles}>
                    {day}
                  </Typography>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const cal = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    backgroundColor: colors.backgroundSurface,
    borderRadius: 16,
    borderCurve: "continuous",
    padding: 12,
    marginBottom: 8,
  } as ViewStyle,
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 4,
  } as ViewStyle,
  navBtn: { padding: 4 } as ViewStyle,
  monthLabel: { fontWeight: "700" } as TextStyle,
  weekRow: { flexDirection: "row" } as ViewStyle,
  cell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 36,
    borderRadius: 18,
  } as ViewStyle,
  selectedCell: { backgroundColor: colors.accent } as ViewStyle,
  weekDayText: { fontSize: 11, fontWeight: "600" } as TextStyle,
  dayText: { fontSize: 15, color: colors.textPrimary } as TextStyle,
  todayText: { color: colors.accent, fontWeight: "700" } as TextStyle,
  selectedDayText: {
    color: colors.textOnAccent,
    fontWeight: "700",
  } as TextStyle,
});

// ─── Main Component ───────────────────────────────────────────────────────────

const AddTransactionModal = () => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const activeWorkspaceId = useWorkspaceStore((s) => s.id);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [txType, setTxType] = useState<TransactionType>("expense");
  /** Currency the user is entering the amount in (may differ from account currency). */
  const [currency, setCurrency] = useState("UAH");
  /** Native currency of the selected account. */
  const [accountCurrency, setAccountCurrency] = useState("UAH");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date());
  const [accountId, setAccountId] = useState<string | null>(null);
  const [accountName, setAccountName] = useState<string | null>(null);
  const [accountIcon, setAccountIcon] = useState<string | null>(null);
  const [accountColor, setAccountColor] = useState<string | null>(null);
  const [destAccountId, setDestAccountId] = useState<string | null>(null);
  const [destAccountName, setDestAccountName] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [categoryIcon, setCategoryIcon] = useState<string | null>(null);
  const [categoryColor, setCategoryColor] = useState<string | null>(null);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [showKeyboard, setShowKeyboard] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [isDescFocused, setIsDescFocused] = useState(false);
  const descRef = useRef<TextInput>(null);

  // ── Amount keyboard ──────────────────────────────────────────────────────────
  const keyboard = useAmountKeyboard({
    showSignToggle: false,
    onDone: () => setShowKeyboard(false),
  });

  // ── Account picker sheet ─────────────────────────────────────────────────────
  const accountSheetRef = useRef<BottomSheetModal>(null);
  const destAccountSheetRef = useRef<BottomSheetModal>(null);
  const { data: accounts = [] } = useAccounts(activeWorkspaceId);

  // Auto-select default account once accounts are loaded
  useEffect(() => {
    if (accounts.length === 0 || accountId) return;
    const primary = accounts.find((a) => a.isPrimary) ?? accounts[0];
    setAccountId(primary.id);
    setAccountName(primary.name);
    setAccountIcon(primary.icon ?? null);
    setAccountColor(primary.color ?? null);
    setCurrency(primary.currency);
    setAccountCurrency(primary.currency);
    // Only run when accounts first become available
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

  // ── Mutations ────────────────────────────────────────────────────────────────
  const { mutate: createTransaction, isPending: saving } =
    useCreateTransaction(activeWorkspaceId);

  // ── Picker store sync (on focus) ─────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      const store = usePickerStore.getState();
      if (store.currency) {
        setCurrency(store.currency);
        usePickerStore.setState({ currency: null });
      }
      if (store.categoryId && store.categoryName) {
        setCategoryId(store.categoryId);
        setCategoryName(store.categoryName);
        setCategoryIcon(store.categoryIcon ?? null);
        setCategoryColor(store.categoryColor ?? null);
        usePickerStore.setState({
          categoryId: null,
          categoryName: null,
          categoryIcon: null,
          categoryColor: null,
        });
      }
    }, []),
  );

  // ── FX conversion preview ────────────────────────────────────────────────────
  const isCrossRate = currency !== accountCurrency;
  const { data: fxData } = useFxConvert(
    Math.abs(keyboard.evaluate()),
    currency,
    accountCurrency,
  );
  const convertedAmount = isCrossRate ? (fxData?.converted ?? null) : null;

  // ── Derived ──────────────────────────────────────────────────────────────────
  const symbol = getCurrencySymbol(currency);
  const amountValue = keyboard.evaluate();

  const segments: Segment<TransactionType>[] = [
    { key: "expense", label: t("addTransaction.expense") },
    { key: "income", label: t("addTransaction.income") },
    { key: "transfer", label: t("addTransaction.transfer") },
  ];

  const defaultCategoryLabel =
    txType === "income"
      ? t("addTransaction.uncategorisedIncome")
      : t("addTransaction.uncategorisedExpense");

  const categoryIconName = (categoryIcon ?? "help") as React.ComponentProps<
    typeof Ionicons
  >["name"];

  const accountCfg = accountId
    ? getAccountTypeConfig(
        accounts.find((a) => a.id === accountId)?.type ?? "bank_account",
      )
    : null;

  const accountIconName = (accountIcon ??
    accountCfg?.icon ??
    "wallet-outline") as React.ComponentProps<typeof Ionicons>["name"];

  const accountIconBg =
    accountColor ?? accountCfg?.color ?? colors.backgroundSurface;

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleAmountAreaPress = () => {
    if (isDescFocused) {
      Keyboard.dismiss();
      setIsDescFocused(false);
      descRef.current?.blur();
    }
    setShowCalendar(false);
    setShowKeyboard(true);
  };

  const handleDescPress = () => {
    setShowKeyboard(false);
    setShowCalendar(false);
    setIsDescFocused(true);
    setTimeout(() => descRef.current?.focus(), 50);
  };

  const handleDatePress = () => {
    haptic();
    Keyboard.dismiss();
    setIsDescFocused(false);
    descRef.current?.blur();
    setShowKeyboard(false);
    setShowCalendar((v) => !v);
  };

  const handleAccountPress = (isDestination = false) => {
    haptic();
    Keyboard.dismiss();
    setShowKeyboard(false);
    setShowCalendar(false);
    if (isDestination) {
      destAccountSheetRef.current?.present();
    } else {
      accountSheetRef.current?.present();
    }
  };

  const handleCategoryPress = () => {
    haptic();
    const tab = txType === "income" ? "income" : "expense";
    router.push(
      `/settings/categories?pickerMode=true&tab=${tab}&fromModal=1` as never,
    );
  };

  const handleCurrencyPress = () => {
    haptic();
    router.push(
      `/(modals)/currency-picker?selected=${currency}&fromModal=1` as never,
    );
  };

  const handleSelectAccount = (account: Account) => {
    setAccountId(account.id);
    setAccountName(account.name);
    setAccountIcon(account.icon ?? null);
    setAccountColor(account.color ?? null);
    setCurrency(account.currency);
    setAccountCurrency(account.currency);
    accountSheetRef.current?.dismiss();
  };

  const handleSelectDestAccount = (account: Account) => {
    setDestAccountId(account.id);
    setDestAccountName(account.name);
    destAccountSheetRef.current?.dismiss();
  };

  const handleSave = () => {
    if (!accountId) {
      Alert.alert(
        t("addTransaction.title"),
        t("addTransaction.errors.accountRequired"),
      );
      return;
    }

    const amount = Math.abs(keyboard.evaluate());
    if (amount <= 0) {
      Alert.alert(
        t("addTransaction.title"),
        t("addTransaction.errors.accountRequired"),
      );
      return;
    }

    if (process.env.EXPO_OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    createTransaction(
      {
        type: txType,
        amount: String(amount),
        currency: isCrossRate ? currency : undefined,
        accountId,
        destinationAccountId:
          txType === "transfer" ? (destAccountId ?? undefined) : undefined,
        categoryId: categoryId ?? undefined,
        description: description.trim() || undefined,
        date: date.toISOString(),
        workspaceId: activeWorkspaceId ?? undefined,
      },
      {
        onSuccess: () => router.back(),
        onError: () =>
          Alert.alert(
            t("addTransaction.title"),
            t("addTransaction.errors.saveFailed"),
          ),
      },
    );
  };

  // ── Backdrop ─────────────────────────────────────────────────────────────────
  const renderBackdrop = useCallback(
    (props: BottomSheetDefaultBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
  );

  // ── Account item renderer ─────────────────────────────────────────────────────
  const renderAccountItem = (
    account: Account,
    onPress: (a: Account) => void,
  ) => {
    const cfg = getAccountTypeConfig(account.type);
    const iconName = (account.icon ?? cfg.icon) as React.ComponentProps<
      typeof Ionicons
    >["name"];
    const iconBg = account.color ?? cfg.color;

    return (
      <Pressable
        key={account.id}
        style={({ pressed }) => [s.accountRow, pressed && s.pressed]}
        onPress={() => onPress(account)}
      >
        <View style={[s.accountIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={iconName} size={18} color="#fff" />
        </View>
        <View style={s.flex}>
          <Typography variant="body">{account.name}</Typography>
          <Typography variant="caption" color="textTertiary">
            {account.currency}
          </Typography>
        </View>
        <Typography variant="body" color="textSecondary">
          {formatAmount(account.balance, account.currency)}
        </Typography>
      </Pressable>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <View
      style={[
        s.root,
        { paddingBottom: Platform.OS === "ios" ? 0 : insets.bottom },
      ]}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          style={({ pressed }) => [s.closeBtn, pressed && s.pressed]}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Ionicons name="close" size={22} color={colors.textSecondary} />
        </Pressable>
        <SegmentedControl
          segments={segments}
          activeKey={txType}
          onPress={(k) => {
            haptic();
            setTxType(k);
          }}
          style={s.segmentedControl}
        />
        <View style={s.closeBtn} pointerEvents="none" />
      </View>

      {/* ── Scrollable form ─────────────────────────────────────────────────── */}
      <ScrollView
        style={s.flex}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Amount + description area */}
        <Pressable style={s.amountArea} onPress={handleAmountAreaPress}>
          <View style={s.amountRow}>
            <View style={s.flex}>
              <View style={s.amountDisplayRow}>
                <Typography style={s.amountText}>
                  {keyboard.displayStr}
                </Typography>
                <Typography style={s.amountSymbol}>{` ${symbol}`}</Typography>
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [s.currencyBtn, pressed && s.pressed]}
              onPress={handleCurrencyPress}
            >
              <Typography variant="label" color="textSecondary">
                {currency}
              </Typography>
              <Ionicons
                name="chevron-down"
                size={14}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>

          {/* Description */}
          <Pressable style={s.descRow} onPress={handleDescPress}>
            {isDescFocused ? (
              <TextInput
                ref={descRef}
                style={s.descInput}
                placeholder={t("addTransaction.descriptionPlaceholder")}
                placeholderTextColor={colors.textTertiary}
                value={description}
                onChangeText={setDescription}
                onFocus={() => setIsDescFocused(true)}
                onBlur={() => setIsDescFocused(false)}
                returnKeyType="done"
                onSubmitEditing={() => {
                  setIsDescFocused(false);
                  setShowKeyboard(true);
                }}
                autoFocus
              />
            ) : (
              <Typography
                variant="body"
                color={description ? "textPrimary" : "textTertiary"}
              >
                {description || t("addTransaction.descriptionPlaceholder")}
              </Typography>
            )}
          </Pressable>
        </Pressable>

        {/* Date row */}
        <Pressable
          style={({ pressed }) => [s.formRow, pressed && s.pressed]}
          onPress={handleDatePress}
        >
          <Ionicons
            name="calendar-outline"
            size={16}
            color={colors.textTertiary}
          />
          <Typography variant="body" color="textSecondary">
            {formatDateLocale(date, i18n.language)}
          </Typography>
        </Pressable>

        {/* Inline calendar */}
        {showCalendar && (
          <InlineCalendar
            selected={date}
            onSelect={(d) => {
              setDate(d);
              setShowCalendar(false);
              setShowKeyboard(true);
            }}
          />
        )}

        {/* From account */}
        <View style={s.card}>
          <Pressable
            style={({ pressed }) => [s.cardRow, pressed && s.pressed]}
            onPress={() => handleAccountPress(false)}
          >
            <View
              style={[
                s.rowIconCircle,
                {
                  backgroundColor: accountId
                    ? accountIconBg
                    : colors.backgroundSurface,
                },
              ]}
            >
              <Ionicons
                name={accountId ? accountIconName : "wallet-outline"}
                size={18}
                color={accountId ? "#fff" : colors.textTertiary}
              />
            </View>
            <View style={s.flex}>
              <Typography variant="caption" color="textTertiary">
                {t("addTransaction.fromAccount")}
              </Typography>
              <Typography
                variant="body"
                color={accountId ? "textPrimary" : "textSecondary"}
              >
                {accountName ?? t("addTransaction.fromAccount")}
              </Typography>
            </View>
          </Pressable>

          {/* To account (transfer only) */}
          {txType === "transfer" && (
            <>
              <View style={s.rowDivider} />
              <Pressable
                style={({ pressed }) => [s.cardRow, pressed && s.pressed]}
                onPress={() => handleAccountPress(true)}
              >
                <View
                  style={[
                    s.rowIconCircle,
                    { backgroundColor: colors.backgroundSurface },
                  ]}
                >
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={colors.textTertiary}
                  />
                </View>
                <View style={s.flex}>
                  <Typography variant="caption" color="textTertiary">
                    {t("addTransaction.toAccount")}
                  </Typography>
                  <Typography
                    variant="body"
                    color={destAccountId ? "textPrimary" : "textSecondary"}
                  >
                    {destAccountName ?? t("addTransaction.toAccount")}
                  </Typography>
                </View>
              </Pressable>
            </>
          )}
        </View>

        {/* Category (expense / income only) */}
        {txType !== "transfer" && (
          <View style={s.card}>
            <Pressable
              style={({ pressed }) => [s.cardRow, pressed && s.pressed]}
              onPress={handleCategoryPress}
            >
              <View
                style={[
                  s.rowIconCircle,
                  {
                    backgroundColor: categoryId
                      ? (categoryColor ?? colors.backgroundSurface)
                      : colors.backgroundSurface,
                  },
                ]}
              >
                <Ionicons
                  name={categoryId ? categoryIconName : "help"}
                  size={18}
                  color={categoryId ? "#fff" : colors.textTertiary}
                />
              </View>
              <View style={s.flex}>
                <Typography variant="caption" color="textTertiary">
                  {t("addTransaction.category")}
                </Typography>
                <Typography
                  variant="body"
                  color={categoryId ? "textPrimary" : "textSecondary"}
                >
                  {categoryName ?? defaultCategoryLabel}
                </Typography>
              </View>
              {amountValue !== 0 && (
                <View style={s.categoryAmountCol}>
                  {isCrossRate && convertedAmount !== null ? (
                    <>
                      <Typography variant="body" color="textSecondary">
                        {formatAmount(String(convertedAmount), accountCurrency)}
                      </Typography>
                      <Typography variant="caption" color="textTertiary">
                        {formatAmount(String(amountValue), currency)}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body" color="textSecondary">
                      {formatAmount(String(amountValue), currency)}
                    </Typography>
                  )}
                </View>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* ── Sticky bottom ───────────────────────────────────────────────────── */}
      {showKeyboard ? (
        <View style={s.keyboardArea}>
          <View style={s.keyboardToolbar}>
            <View style={s.toolbarLeft} />
            <Pressable
              style={({ pressed }) => [
                s.saveBtn,
                pressed && s.pressed,
                saving && s.saveBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              <Typography style={s.saveBtnLabel}>
                {t("addTransaction.save")}
              </Typography>
            </Pressable>
          </View>
          <AmountKeyboard onKey={keyboard.handleKey} showSignToggle={false} />
        </View>
      ) : (
        <Pressable
          style={[
            s.bottomSaveBtn,
            {
              marginBottom: insets.bottom > 0 ? insets.bottom + 8 : 24,
            },
            saving && s.saveBtnDisabled,
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          <Typography style={s.bottomSaveBtnLabel}>
            {t("addTransaction.save")}
          </Typography>
        </Pressable>
      )}

      {/* ── From account sheet ──────────────────────────────────────────────── */}
      <BottomSheetModal
        ref={accountSheetRef}
        enableDynamicSizing
        backdropComponent={renderBackdrop}
        backgroundStyle={s.sheetBg}
        handleIndicatorStyle={s.sheetHandle}
      >
        <BottomSheetScrollView
          contentContainerStyle={[
            s.sheetContent,
            { paddingBottom: insets.bottom + 16 },
          ]}
        >
          <Typography variant="label" style={s.sheetTitle}>
            {t("addTransaction.fromAccount")}
          </Typography>
          {accounts.map((a) => renderAccountItem(a, handleSelectAccount))}
        </BottomSheetScrollView>
      </BottomSheetModal>

      {/* ── To account sheet (transfer) ─────────────────────────────────────── */}
      <BottomSheetModal
        ref={destAccountSheetRef}
        enableDynamicSizing
        backdropComponent={renderBackdrop}
        backgroundStyle={s.sheetBg}
        handleIndicatorStyle={s.sheetHandle}
      >
        <BottomSheetScrollView
          contentContainerStyle={[
            s.sheetContent,
            { paddingBottom: insets.bottom + 16 },
          ]}
        >
          <Typography variant="label" style={s.sheetTitle}>
            {t("addTransaction.toAccount")}
          </Typography>
          {accounts
            .filter((a) => a.id !== accountId)
            .map((a) => renderAccountItem(a, handleSelectDestAccount))}
        </BottomSheetScrollView>
      </BottomSheetModal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.backgroundElevated,
  } as ViewStyle,
  flex: { flex: 1 } as ViewStyle,
  pressed: { opacity: 0.6 } as ViewStyle,

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  } as ViewStyle,
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  segmentedControl: { flex: 1 } as ViewStyle,

  scrollContent: { paddingBottom: 16 } as ViewStyle,

  amountArea: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  } as ViewStyle,
  amountRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  } as ViewStyle,
  amountDisplayRow: {
    flexDirection: "row",
    alignItems: "baseline",
  } as ViewStyle,
  amountText: {
    fontSize: 48,
    fontWeight: "700",
    color: colors.textPrimary,
    lineHeight: 56,
  } as TextStyle,
  amountSymbol: {
    fontSize: 28,
    fontWeight: "600",
    color: colors.textSecondary,
    lineHeight: 48,
  } as TextStyle,
  currencyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.backgroundSurface,
    marginBottom: 8,
  } as ViewStyle,
  descRow: {
    marginTop: 6,
    paddingVertical: 4,
  } as ViewStyle,
  descInput: {
    fontSize: 16,
    color: colors.textPrimary,
    paddingVertical: 0,
  } as TextStyle,

  formRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  } as ViewStyle,

  card: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: colors.backgroundSurface,
    borderRadius: 14,
    borderCurve: "continuous",
    overflow: "hidden",
  } as ViewStyle,
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    minHeight: 60,
  } as ViewStyle,
  rowIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 64,
  } as ViewStyle,

  keyboardArea: {
    backgroundColor: colors.backgroundElevated,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  } as ViewStyle,
  keyboardToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  } as ViewStyle,
  toolbarLeft: { flexDirection: "row", gap: 12 } as ViewStyle,
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 8,
    borderCurve: "continuous",
    backgroundColor: colors.backgroundSurface,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  saveBtnDisabled: { opacity: 0.5 } as ViewStyle,
  saveBtnLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  } as TextStyle,

  bottomSaveBtn: {
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 14,
    borderCurve: "continuous",
    backgroundColor: colors.backgroundSurface,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  bottomSaveBtnLabel: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.textPrimary,
  } as TextStyle,

  sheetBg: { backgroundColor: colors.backgroundElevated } as ViewStyle,
  sheetHandle: { backgroundColor: colors.border } as ViewStyle,
  sheetContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  } as ViewStyle,
  sheetTitle: {
    fontWeight: "700",
    marginBottom: 12,
    marginTop: 8,
  } as TextStyle,
  categoryAmountCol: {
    alignItems: "flex-end",
    gap: 2,
  } as ViewStyle,
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  } as ViewStyle,
  accountIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
});

export default AddTransactionModal;
