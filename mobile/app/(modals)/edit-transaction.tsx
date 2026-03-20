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
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import type { BottomSheetDefaultBackdropProps } from "@gorhom/bottom-sheet/lib/typescript/components/bottomSheetBackdrop/types";
import { colors } from "@constants/colors";
import {
  getCurrencySymbol,
  getAccountTypeConfig,
} from "@constants/account-types";
import { bnParse } from "@utils/bn";
import { getIconColor } from "@constants/icon-list";
import { getCategoryDisplayName } from "@constants/default-categories";
import { Typography } from "@components/ui/Typography";
import {
  SegmentedControl,
  type Segment,
} from "@components/ui/SegmentedControl";
import { AmountKeyboard } from "@components/ui/AmountKeyboard";
import { useAmountKeyboard } from "@hooks/useAmountKeyboard";
import { usePickerStore, type PickedTag } from "@stores/usePickerStore";
import { useWorkspaceStore } from "@stores/useWorkspaceStore";
import { useAccounts } from "@services/accounts/accounts.queries";
import type { Account } from "@services/accounts/accounts.api";
import { useCategories } from "@services/categories/categories.queries";
import {
  useTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from "@services/transactions/transactions.queries";

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
  const num = bnParse(value);
  if (!value || num.isZero()) return `0 ${getCurrencySymbol(currency)}`;
  return `${num.isNegative() ? "−" : ""}${num.abs().toFormat(2)} ${getCurrencySymbol(currency)}`;
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

const EditTransactionModal = () => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const activeWorkspaceId = useWorkspaceStore((s) => s.id);
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: tx, isLoading: txLoading } = useTransaction(id);

  // Tracks the tx.id we have already fully seeded from.
  // Using a ref avoids the effect running again just because this value changes.
  const seededTxIdRef = useRef<string | null>(null);
  // When the initial seed used an empty-tags placeholder (pre-seeded from cache),
  // we still want to apply the real tags once the background refetch brings them.
  const tagsWereEmptyOnSeedRef = useRef(false);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [txType, setTxType] = useState<TransactionType>("expense");
  const [currency, setCurrency] = useState("UAH");
  const [accountCurrency, setAccountCurrency] = useState("UAH");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date());
  const [accountId, setAccountId] = useState<string | null>(null);
  const [accountName, setAccountName] = useState<string | null>(null);
  const [accountIcon, setAccountIcon] = useState<string | null>(null);
  const [accountColor, setAccountColor] = useState<string | null>(null);
  const [destAccountId, setDestAccountId] = useState<string | null>(null);
  const [destAccountName, setDestAccountName] = useState<string | null>(null);
  const [destAccountIcon, setDestAccountIcon] = useState<string | null>(null);
  const [destAccountColor, setDestAccountColor] = useState<string | null>(null);
  const [destAccountCurrency, setDestAccountCurrency] = useState<string | null>(
    null,
  );
  const [destAmount, setDestAmount] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [categoryIcon, setCategoryIcon] = useState<string | null>(null);
  const [categoryColor, setCategoryColor] = useState<string | null>(null);
  const [categorySystemCode, setCategorySystemCode] = useState<string | null>(
    null,
  );
  const [isRefundCategory, setIsRefundCategory] = useState(false);
  const [selectedTags, setSelectedTags] = useState<PickedTag[]>([]);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [isDescFocused, setIsDescFocused] = useState(false);
  const descRef = useRef<TextInput>(null);

  // ── Amount keyboard ──────────────────────────────────────────────────────────
  const keyboard = useAmountKeyboard({
    showSignToggle: false,
    onDone: () => setShowKeyboard(false),
  });

  // ── Account / dest amount sheets ─────────────────────────────────────────────
  const accountSheetRef = useRef<BottomSheetModal>(null);
  const destAccountSheetRef = useRef<BottomSheetModal>(null);
  const destAmountSheetRef = useRef<BottomSheetModal>(null);
  const destAmountKeyboard = useAmountKeyboard({
    showSignToggle: false,
    onDone: (v) => {
      setDestAmount(v === "0" || v === "" ? null : v);
      destAmountSheetRef.current?.dismiss();
    },
  });

  const { data: accounts = [] } = useAccounts(activeWorkspaceId);
  const { data: allCategories = [] } = useCategories(activeWorkspaceId);
  const refundCategoryId =
    allCategories.find((c) => c.systemCode === "refund")?.id ?? null;

  // ── Seed form from fetched transaction ───────────────────────────────────────
  useEffect(() => {
    if (!tx) return;

    const alreadySeeded = seededTxIdRef.current === tx.id;

    if (alreadySeeded) {
      // Only patch tags if the initial seed used an empty-tags placeholder
      // and the background refetch brought the real ones.
      if (tagsWereEmptyOnSeedRef.current && tx.tags.length > 0) {
        setSelectedTags(tx.tags.map((t) => t.tag));
        tagsWereEmptyOnSeedRef.current = false;
      }
      return;
    }

    // Full seed ────────────────────────────────────────────────────────────────
    const validTypes: TransactionType[] = ["expense", "income", "transfer"];
    const resolvedType = validTypes.includes(tx.type as TransactionType)
      ? (tx.type as TransactionType)
      : "expense";
    setTxType(resolvedType);

    const acct = tx.account;
    setAccountId(acct.id);
    setAccountName(acct.name);
    setAccountIcon(acct.icon ?? null);
    setAccountColor(acct.color ?? null);
    setCurrency(acct.currency);
    setAccountCurrency(acct.currency);

    if (tx.destinationAccount) {
      setDestAccountId(tx.destinationAccount.id);
      setDestAccountName(tx.destinationAccount.name);
      setDestAccountIcon(tx.destinationAccount.icon ?? null);
      setDestAccountColor(tx.destinationAccount.color ?? null);
      setDestAccountCurrency(tx.destinationAccount.currency);
      if (tx.destinationAmount) setDestAmount(tx.destinationAmount);
    }

    if (tx.category) {
      setCategoryId(tx.category.id);
      setCategoryName(getCategoryDisplayName(tx.category, t));
      setCategoryIcon(tx.category.icon ?? null);
      setCategoryColor(tx.category.color ?? null);
      const cat = allCategories.find((c) => c.id === tx.category!.id);
      const sc = cat?.systemCode ?? tx.category.translationKey ?? null;
      setCategorySystemCode(sc);
      setIsRefundCategory(sc === "refund");
    }

    const realTags = tx.tags.map((t) => t.tag);
    setSelectedTags(realTags);
    tagsWereEmptyOnSeedRef.current = realTags.length === 0;

    setDescription(tx.description ?? "");
    setDate(new Date(tx.date));

    keyboard.reset(tx.amount, false);
    seededTxIdRef.current = tx.id;
  }, [tx, allCategories, keyboard, t]);

  // ── Mutations ────────────────────────────────────────────────────────────────
  const { mutate: updateTx, isPending: saving } =
    useUpdateTransaction(activeWorkspaceId);
  const { mutate: deleteTx, isPending: deleting } =
    useDeleteTransaction(activeWorkspaceId);

  // ── Picker store sync (on focus) ─────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      const store = usePickerStore.getState();
      if (store.currency) {
        setCurrency(store.currency);
        usePickerStore.setState({ currency: null });
      }
      if (store.categoryId && store.categoryName) {
        const pickedId = store.categoryId;
        const pickedIsRefund = store.isRefundCategory;
        const pickedCategory = allCategories.find((c) => c.id === pickedId);
        const pickedSystemCode = pickedCategory?.systemCode ?? null;

        usePickerStore.setState({
          categoryId: null,
          categoryName: null,
          categoryIcon: null,
          categoryColor: null,
          isRefundCategory: false,
        });

        if (pickedSystemCode === "refund") {
          setCategoryId(pickedId);
          setCategoryName(store.categoryName);
          setCategoryIcon(store.categoryIcon ?? null);
          setCategoryColor(store.categoryColor ?? null);
          setCategorySystemCode(pickedSystemCode);
          setIsRefundCategory(false);
          router.push(
            `/settings/categories?pickerMode=true&gridMode=true&refundMode=true&tab=expense&fromModal=1` as never,
          );
        } else {
          setCategoryId(pickedId);
          setCategoryName(store.categoryName);
          setCategoryIcon(store.categoryIcon ?? null);
          setCategoryColor(store.categoryColor ?? null);
          setCategorySystemCode(pickedSystemCode);
          setIsRefundCategory(pickedIsRefund);
        }
      }
      if (store.selectedTags !== null) {
        setSelectedTags(store.selectedTags);
        usePickerStore.setState({ selectedTags: null });
      }
    }, [allCategories]),
  );

  // ── Derived ──────────────────────────────────────────────────────────────────
  const isCrossRate = currency !== accountCurrency;
  const isTransferCrossRate =
    txType === "transfer" &&
    destAccountCurrency !== null &&
    currency !== destAccountCurrency;

  const autoDestAmount = isTransferCrossRate
    ? null
    : txType === "transfer" && destAccountCurrency !== null
      ? String(Math.abs(keyboard.evaluate()))
      : null;
  const effectiveDestAmount = destAmount ?? autoDestAmount;

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
    if (categorySystemCode === "refund" || categoryId === refundCategoryId) {
      router.push(
        `/settings/categories?pickerMode=true&gridMode=true&refundMode=true&tab=expense&fromModal=1` as never,
      );
      return;
    }
    const tab = txType === "income" ? "income" : "expense";
    router.push(
      `/settings/categories?pickerMode=true&gridMode=true&tab=${tab}&fromModal=1` as never,
    );
  };

  const handleTagsPress = () => {
    haptic();
    const selected = selectedTags.map((t) => t.id).join(",");
    const params = new URLSearchParams({ fromModal: "1" });
    if (selected) params.set("selected", selected);
    router.push(`/(modals)/tag-picker?${params.toString()}` as never);
  };

  const handleDestAmountPress = () => {
    haptic();
    Keyboard.dismiss();
    setShowKeyboard(false);
    setShowCalendar(false);
    const currentVal = effectiveDestAmount ?? "0";
    destAmountKeyboard.reset(currentVal, false);
    destAmountSheetRef.current?.present();
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
    setDestAccountIcon(account.icon ?? null);
    setDestAccountColor(account.color ?? null);
    setDestAccountCurrency(account.currency);
    setDestAmount(null);
    destAccountSheetRef.current?.dismiss();
  };

  const handleSave = () => {
    if (!accountId || !id) return;

    if (txType === "transfer" && !destAccountId) {
      Alert.alert(
        t("editTransaction.title"),
        t("addTransaction.errors.destinationRequired"),
      );
      return;
    }

    const amount = Math.abs(keyboard.evaluate());
    if (amount <= 0) {
      Alert.alert(
        t("editTransaction.title"),
        t("addTransaction.errors.accountRequired"),
      );
      return;
    }

    if (process.env.EXPO_OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    updateTx(
      {
        id,
        type: txType,
        amount: String(amount),
        currency: isCrossRate ? currency : undefined,
        accountId,
        destinationAccountId:
          txType === "transfer" ? (destAccountId ?? null) : null,
        destinationAmount:
          txType === "transfer" && effectiveDestAmount
            ? effectiveDestAmount
            : null,
        categoryId: categoryId ?? null,
        tagIds: selectedTags.map((tag) => tag.id),
        description: description.trim() || null,
        date: date.toISOString(),
      },
      {
        onSuccess: () => router.back(),
        onError: () =>
          Alert.alert(
            t("editTransaction.title"),
            t("editTransaction.errors.saveFailed"),
          ),
      },
    );
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert(
      t("editTransaction.deleteTitle"),
      t("editTransaction.deleteMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("editTransaction.deleteConfirm"),
          style: "destructive",
          onPress: () => {
            if (process.env.EXPO_OS === "ios") {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Warning,
              ).catch(() => {});
            }
            deleteTx(id, {
              onSuccess: () => router.back(),
              onError: () =>
                Alert.alert(
                  t("editTransaction.title"),
                  t("editTransaction.errors.deleteFailed"),
                ),
            });
          },
        },
      ],
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
          <Ionicons name={iconName} size={18} color={getIconColor(iconBg)} />
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

  const isBusy = saving || deleting || txLoading;

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
            setCategoryId(null);
            setCategoryName(null);
            setCategoryIcon(null);
            setCategoryColor(null);
            setCategorySystemCode(null);
            setIsRefundCategory(false);
            setSelectedTags([]);
            setDescription("");
            setDestAccountId(null);
            setDestAccountName(null);
            setDestAccountIcon(null);
            setDestAccountColor(null);
            setDestAccountCurrency(null);
            setDestAmount(null);
          }}
          style={s.segmentedControl}
        />
        <Pressable
          style={({ pressed }) => [s.closeBtn, pressed && s.pressed]}
          onPress={handleDelete}
          hitSlop={8}
          disabled={isBusy}
        >
          <Ionicons
            name="trash-outline"
            size={20}
            color={isBusy ? colors.textTertiary : colors.textSecondary}
          />
        </Pressable>
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

          <TextInput
            ref={descRef}
            style={s.descInput}
            placeholder={t("addTransaction.descriptionPlaceholder")}
            placeholderTextColor={colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            onFocus={() => {
              setIsDescFocused(true);
              setShowKeyboard(false);
              setShowCalendar(false);
            }}
            onBlur={() => setIsDescFocused(false)}
            returnKeyType="done"
            onSubmitEditing={() => {
              setIsDescFocused(false);
              setShowKeyboard(true);
            }}
            onPress={handleDescPress}
          />
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
              setShowKeyboard(false);
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
                color={
                  accountId ? getIconColor(accountIconBg) : colors.textTertiary
                }
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
        </View>

        {/* To account (transfer only) */}
        {txType === "transfer" && (
          <View style={s.card}>
            <Pressable
              style={({ pressed }) => [s.cardRow, pressed && s.pressed]}
              onPress={() => handleAccountPress(true)}
            >
              {(() => {
                const destCfg = destAccountId
                  ? getAccountTypeConfig(
                      accounts.find((a) => a.id === destAccountId)?.type ??
                        "bank_account",
                    )
                  : null;
                const destIconName = (destAccountIcon ??
                  destCfg?.icon ??
                  "wallet-outline") as React.ComponentProps<
                  typeof Ionicons
                >["name"];
                const destIconBg =
                  destAccountColor ??
                  destCfg?.color ??
                  colors.backgroundSurface;
                return (
                  <View
                    style={[
                      s.rowIconCircle,
                      {
                        backgroundColor: destAccountId
                          ? destIconBg
                          : colors.backgroundElevated,
                      },
                    ]}
                  >
                    <Ionicons
                      name={destAccountId ? destIconName : "arrow-forward"}
                      size={18}
                      color={
                        destAccountId
                          ? getIconColor(destIconBg)
                          : colors.textTertiary
                      }
                    />
                  </View>
                );
              })()}
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
              {destAccountId && amountValue !== 0 && (
                <Pressable
                  style={({ pressed }) => [
                    s.destAmountBtn,
                    pressed && s.pressed,
                  ]}
                  onPress={handleDestAmountPress}
                >
                  <View style={s.categoryAmountCol}>
                    <Typography variant="body" color="textSecondary">
                      {formatAmount(
                        effectiveDestAmount ?? "0",
                        destAccountCurrency ?? currency,
                      )}
                    </Typography>
                    {isTransferCrossRate && destAmount === null && (
                      <Typography variant="caption" color="textTertiary">
                        {t("addTransaction.autoConverted")}
                      </Typography>
                    )}
                  </View>
                </Pressable>
              )}
            </Pressable>
          </View>
        )}

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
                      ? (categoryColor ?? colors.backgroundElevated)
                      : colors.backgroundElevated,
                  },
                ]}
              >
                <Ionicons
                  name={categoryId ? categoryIconName : "help"}
                  size={18}
                  color={"#fff"}
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
                {isRefundCategory && (
                  <View style={s.refundBadge}>
                    <Ionicons
                      name="refresh-outline"
                      size={11}
                      color={colors.iconBlue}
                    />
                    <Typography variant="caption" style={s.refundBadgeText}>
                      {t("defaultCategories.refund")}
                    </Typography>
                  </View>
                )}
                {selectedTags.length > 0 && (
                  <View style={s.inlineTags}>
                    <Ionicons
                      name="pricetag"
                      size={12}
                      color={colors.textTertiary}
                    />
                    <Typography variant="caption" color="textTertiary">
                      {selectedTags.map((tag) => tag.name).join(", ")}
                    </Typography>
                  </View>
                )}
              </View>
              {amountValue !== 0 && (
                <View style={s.categoryAmountCol}>
                  <Typography variant="body" color="textSecondary">
                    {formatAmount(String(amountValue), currency)}
                  </Typography>
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
            {txType !== "transfer" ? (
              <Pressable
                style={({ pressed }) => [s.tagToolbarBtn, pressed && s.pressed]}
                onPress={handleTagsPress}
                hitSlop={8}
              >
                <Ionicons
                  name="pricetag"
                  size={20}
                  color={
                    selectedTags.length > 0
                      ? colors.accent
                      : colors.textSecondary
                  }
                />
              </Pressable>
            ) : (
              <View />
            )}
            <Pressable
              style={({ pressed }) => [
                s.saveBtn,
                pressed && s.pressed,
                isBusy && s.saveBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={isBusy}
            >
              <Typography style={s.saveBtnLabel}>
                {t("editTransaction.save")}
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
            isBusy && s.saveBtnDisabled,
          ]}
          onPress={handleSave}
          disabled={isBusy}
        >
          <Typography style={s.bottomSaveBtnLabel}>
            {t("editTransaction.save")}
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

      {/* ── Destination amount sheet ─────────────────────────────────────────── */}
      <BottomSheetModal
        ref={destAmountSheetRef}
        enableDynamicSizing
        backdropComponent={renderBackdrop}
        backgroundStyle={s.sheetBg}
        handleComponent={() => null}
      >
        <BottomSheetView>
          <View style={s.destAmountSheetHeader}>
            <Pressable
              style={({ pressed }) => [
                s.destAmountHeaderBtn,
                pressed && s.pressed,
              ]}
              onPress={() => destAmountSheetRef.current?.dismiss()}
              hitSlop={8}
            >
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </Pressable>
            <View style={s.destAmountHeaderCenter} pointerEvents="none">
              <Typography variant="label" style={s.destAmountHeaderTitle}>
                {getCurrencySymbol(destAccountCurrency ?? currency)}{" "}
                {destAccountName ?? t("addTransaction.toAccount")}
              </Typography>
            </View>
            <Pressable
              style={({ pressed }) => [
                s.destAmountHeaderDone,
                pressed && s.pressed,
              ]}
              onPress={() => destAmountKeyboard.handleKey("done")}
              hitSlop={8}
            >
              <Typography style={s.destAmountDoneLabel}>
                {t("common.done")}
              </Typography>
            </Pressable>
          </View>
          <View style={s.destAmountDivider} />
          <View style={s.destAmountArea}>
            <View style={s.destAmountUnderline}>
              <Typography style={s.destAmountText}>
                {getCurrencySymbol(destAccountCurrency ?? currency)}
                {destAmountKeyboard.displayStr}
              </Typography>
            </View>
          </View>
          <AmountKeyboard
            onKey={destAmountKeyboard.handleKey}
            showSignToggle={false}
          />
        </BottomSheetView>
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
  descInput: {
    fontSize: 16,
    color: colors.textPrimary,
    marginTop: 6,
    paddingVertical: 4,
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

  keyboardArea: {
    backgroundColor: colors.background,
  } as ViewStyle,
  keyboardToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingLeft: 6,
    paddingRight: 10,
    paddingTop: 12,
    paddingBottom: 0,
  } as ViewStyle,
  saveBtn: {
    minHeight: 40,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderCurve: "continuous",
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  saveBtnDisabled: { opacity: 0.5 } as ViewStyle,
  saveBtnLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textOnAccent,
  } as TextStyle,

  bottomSaveBtn: {
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 14,
    borderCurve: "continuous",
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  bottomSaveBtnLabel: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.textOnAccent,
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
  destAmountBtn: {
    alignItems: "flex-end",
    justifyContent: "center",
    paddingLeft: 8,
  } as ViewStyle,
  destAmountSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  } as ViewStyle,
  destAmountHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundSurface,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  destAmountHeaderCenter: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  } as ViewStyle,
  destAmountHeaderTitle: {
    fontWeight: "700",
    textAlign: "center",
  } as TextStyle,
  destAmountHeaderDone: {
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 8,
    borderCurve: "continuous",
    backgroundColor: colors.backgroundSurface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  } as ViewStyle,
  destAmountDoneLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  } as TextStyle,
  destAmountDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  } as ViewStyle,
  destAmountArea: {
    alignItems: "center",
    paddingVertical: 16,
  } as ViewStyle,
  destAmountUnderline: {
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 8,
  } as ViewStyle,
  destAmountText: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: "700",
    color: colors.textPrimary,
  } as TextStyle,
  inlineTags: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  } as ViewStyle,
  refundBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  } as ViewStyle,
  refundBadgeText: {
    color: colors.iconBlue,
  } as TextStyle,
  tagToolbarBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: "auto",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  } as ViewStyle,
});

export default EditTransactionModal;
