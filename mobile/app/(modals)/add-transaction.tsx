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
import { Typography } from "@components/ui/Typography";
import {
  SegmentedControl,
  type Segment,
} from "@components/ui/SegmentedControl";
import { AmountKeyboard } from "@components/ui/AmountKeyboard";
import { useAmountKeyboard } from "@hooks/useAmountKeyboard";
import { usePickerStore, type PickedTag } from "@stores/usePickerStore";
import { useWorkspaceStore } from "@stores/useWorkspaceStore";
import { useAccounts, ACCOUNT_KEYS } from "@services/accounts/accounts.queries";
import type { Account } from "@services/accounts/accounts.api";
import { useCategories } from "@services/categories/categories.queries";
import {
  useCreateTransaction,
  TRANSACTION_KEYS,
} from "@services/transactions/transactions.queries";
import { createTransaction as createTransactionApi } from "@services/transactions/transactions.api";
import { useFxConvert } from "@services/fx/fx.queries";
import { useQueryClient } from "@tanstack/react-query";

// ─── Types ────────────────────────────────────────────────────────────────────

type TransactionType = "expense" | "income" | "transfer";

type SplitItem = {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  categorySystemCode: string | null;
  amount: string;
};

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

const AddTransactionModal = () => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const activeWorkspaceId = useWorkspaceStore((s) => s.id);
  const { defaultAccountId } = useLocalSearchParams<{
    defaultAccountId?: string;
  }>();

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
  const [destAccountIcon, setDestAccountIcon] = useState<string | null>(null);
  const [destAccountColor, setDestAccountColor] = useState<string | null>(null);
  const [destAccountCurrency, setDestAccountCurrency] = useState<string | null>(
    null,
  );
  /** null = use auto FX, string = manually overridden */
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
  const [showKeyboard, setShowKeyboard] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [isDescFocused, setIsDescFocused] = useState(false);
  const descRef = useRef<TextInput>(null);

  // ── Amount keyboard ──────────────────────────────────────────────────────────
  const keyboard = useAmountKeyboard({
    showSignToggle: false,
    onDone: () => setShowKeyboard(false),
  });

  // ── Split mode ───────────────────────────────────────────────────────────────
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitItems, setSplitItems] = useState<SplitItem[]>([]);
  const splitIdCounter = useRef(0);
  const nextSplitId = () => {
    splitIdCounter.current += 1;
    return String(splitIdCounter.current);
  };

  const splitAmountSheetRef = useRef<BottomSheetModal>(null);
  const editingSplitAmountIndexRef = useRef(0);
  const keyboardTotalRef = useRef(0);
  const splitAmountKeyboard = useAmountKeyboard({
    showSignToggle: false,
    onDone: (v) => {
      const idx = editingSplitAmountIndexRef.current;
      const enteredAmount = v === "0" || v === "" ? "0" : v;
      setSplitItems((prev) => {
        const updated = prev.map((item, i) =>
          i === idx ? { ...item, amount: enteredAmount } : item,
        );
        // If exactly one other item still has amount "0", auto-fill it with remaining
        const grandTotal = Math.abs(keyboardTotalRef.current);
        const filledTotal = updated.reduce(
          (sum, item, i) =>
            i === idx ? sum : sum + parseFloat(item.amount || "0"),
          0,
        );
        const entered = parseFloat(enteredAmount || "0");
        const remaining =
          Math.round((grandTotal - filledTotal - entered) * 100) / 100;
        const zeroIndexes = updated.reduce<number[]>(
          (acc, item, i) =>
            i !== idx && item.amount === "0" ? [...acc, i] : acc,
          [],
        );
        if (zeroIndexes.length === 1 && remaining >= 0) {
          return updated.map((item, i) =>
            i === zeroIndexes[0]
              ? { ...item, amount: String(remaining) }
              : item,
          );
        }
        return updated;
      });
      splitAmountSheetRef.current?.dismiss();
    },
  });

  const qc = useQueryClient();
  const [splitSaving, setSplitSaving] = useState(false);

  // ── Account picker sheet ─────────────────────────────────────────────────────
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

  // Auto-select account once accounts are loaded.
  // If `defaultAccountId` was passed (e.g. from account-details FAB), prefer that account.
  useEffect(() => {
    if (accounts.length === 0 || accountId) return;
    const preset = defaultAccountId
      ? accounts.find((a) => a.id === defaultAccountId)
      : null;
    const selected = preset ?? accounts.find((a) => a.isPrimary) ?? accounts[0];
    setAccountId(selected.id);
    setAccountName(selected.name);
    setAccountIcon(selected.icon ?? null);
    setAccountColor(selected.color ?? null);
    // Use the first balance's currency as the default transaction currency
    const defaultCurrency = selected.balances[0]?.currency ?? "UAH";
    setCurrency(defaultCurrency);
    setAccountCurrency(defaultCurrency);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

  // ── Mutations ────────────────────────────────────────────────────────────────
  const { mutate: createTransaction, isPending: txSaving } =
    useCreateTransaction(activeWorkspaceId);
  const saving = txSaving || splitSaving;

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
        const splitIdx = store.splitPickerIndex;

        usePickerStore.setState({
          categoryId: null,
          categoryName: null,
          categoryIcon: null,
          categoryColor: null,
          isRefundCategory: false,
          splitPickerIndex: null,
        });

        // Handle pick for a split item
        if (splitIdx !== null) {
          setSplitItems((prev) => {
            const updated = [...prev];
            const newItem: SplitItem = {
              id: updated[splitIdx]?.id ?? nextSplitId(),
              categoryId: pickedId,
              categoryName: store.categoryName!,
              categoryIcon: store.categoryIcon ?? null,
              categoryColor: store.categoryColor ?? null,
              categorySystemCode: pickedSystemCode,
              amount: updated[splitIdx]?.amount ?? "0",
            };
            if (splitIdx < updated.length) {
              updated[splitIdx] = newItem;
            } else {
              updated.push({ ...newItem, id: nextSplitId() });
            }
            return updated;
          });
          return;
        }

        if (pickedSystemCode === "refund") {
          // User picked the "Refund" income category — immediately open the
          // expense category picker with the refund banner.
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

  // ── FX conversion preview ────────────────────────────────────────────────────
  const isCrossRate = currency !== accountCurrency;
  const { data: fxData } = useFxConvert(
    Math.abs(keyboard.evaluate()),
    currency,
    accountCurrency,
  );
  const convertedAmount = isCrossRate ? (fxData?.converted ?? null) : null;

  // FX for transfer destination (source currency → dest account currency)
  const isTransferCrossRate =
    txType === "transfer" &&
    destAccountCurrency !== null &&
    currency !== destAccountCurrency;
  const { data: destFxData } = useFxConvert(
    Math.abs(keyboard.evaluate()),
    currency,
    destAccountCurrency ?? currency,
  );
  const autoDestAmount =
    isTransferCrossRate && destFxData?.converted != null
      ? String(destFxData.converted)
      : txType === "transfer" && destAccountCurrency !== null
        ? String(Math.abs(keyboard.evaluate()))
        : null;
  /** The effective destination amount to send to the backend and display */
  const effectiveDestAmount = destAmount ?? autoDestAmount;

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
    // If the currently selected category is "refund", re-open picker in refund
    // mode (shows expense categories with explanatory banner).
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

  const openSplitCategoryPicker = useCallback(
    (index: number) => {
      haptic();
      usePickerStore.setState({ splitPickerIndex: index });
      const tab = txType === "income" ? "income" : "expense";
      router.push(
        `/settings/categories?pickerMode=true&gridMode=true&tab=${tab}&fromModal=1` as never,
      );
    },
    [txType],
  );

  const handleSplitPress = () => {
    haptic();
    const firstItem: SplitItem = {
      id: nextSplitId(),
      categoryId,
      categoryName,
      categoryIcon,
      categoryColor,
      categorySystemCode,
      amount: "0",
    };
    setIsSplitMode(true);
    setSplitItems([firstItem]);
    openSplitCategoryPicker(1);
  };

  const handleAddSplitCategory = () => {
    haptic();
    openSplitCategoryPicker(splitItems.length);
  };

  const handleDeleteSplitItem = (index: number) => {
    setSplitItems((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length <= 1) {
        // Exit split mode, restore single category from remaining item
        const remaining = updated[0];
        if (remaining) {
          setCategoryId(remaining.categoryId);
          setCategoryName(remaining.categoryName);
          setCategoryIcon(remaining.categoryIcon);
          setCategoryColor(remaining.categoryColor);
          setCategorySystemCode(remaining.categorySystemCode);
        }
        setIsSplitMode(false);
        return [];
      }
      return updated;
    });
  };

  const openSplitAmountSheet = (index: number) => {
    haptic();
    Keyboard.dismiss();
    setShowKeyboard(false);
    setShowCalendar(false);
    editingSplitAmountIndexRef.current = index;
    keyboardTotalRef.current = keyboard.evaluate();
    splitAmountKeyboard.reset(splitItems[index]?.amount || "0", false);
    splitAmountSheetRef.current?.present();
  };

  // Split totals
  const totalAmount = Math.abs(keyboard.evaluate());
  const splitTotal = splitItems.reduce(
    (sum, item) => sum + parseFloat(item.amount || "0"),
    0,
  );
  const remainingAmount = Math.round((totalAmount - splitTotal) * 100) / 100;
  const isSplitBalanced = isSplitMode && Math.abs(remainingAmount) < 0.001;

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
    const firstCurrency = account.balances[0]?.currency ?? "UAH";
    setCurrency(firstCurrency);
    setAccountCurrency(firstCurrency);
    accountSheetRef.current?.dismiss();
  };

  const handleSelectDestAccount = (account: Account) => {
    setDestAccountId(account.id);
    setDestAccountName(account.name);
    setDestAccountIcon(account.icon ?? null);
    setDestAccountColor(account.color ?? null);
    setDestAccountCurrency(account.balances[0]?.currency ?? "UAH");
    setDestAmount(null); // reset manual override when account changes
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

    if (txType === "transfer" && !destAccountId) {
      Alert.alert(
        t("addTransaction.title"),
        t("addTransaction.errors.destinationRequired"),
      );
      return;
    }

    const amount = Math.abs(keyboard.evaluate());
    if (amount <= 0) {
      Alert.alert(
        t("addTransaction.title"),
        t("addTransaction.errors.amountRequired"),
      );
      return;
    }

    if (process.env.EXPO_OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    // ── Split mode: create one transaction per split item ─────────────────────
    if (isSplitMode) {
      if (!isSplitBalanced) {
        Alert.alert(
          t("addTransaction.title"),
          t("addTransaction.errors.splitNotBalanced"),
        );
        return;
      }
      setSplitSaving(true);
      const commonFields = {
        type: txType as "expense" | "income",
        currency: isCrossRate ? currency : undefined,
        accountId: accountId!,
        tagIds:
          selectedTags.length > 0 ? selectedTags.map((tg) => tg.id) : undefined,
        description: description.trim() || undefined,
        date: date.toISOString(),
        workspaceId: activeWorkspaceId ?? undefined,
      };
      Promise.all(
        splitItems.map((item) =>
          createTransactionApi({
            ...commonFields,
            amount: item.amount || "0",
            categoryId: item.categoryId ?? undefined,
          }),
        ),
      )
        .then(([first]) => {
          setSplitSaving(false);
          // Invalidate same caches as useCreateTransaction.onSuccess
          const wsId = activeWorkspaceId;
          qc.invalidateQueries({ queryKey: TRANSACTION_KEYS.all() });
          qc.invalidateQueries({ queryKey: ["transactions", "stats"] });
          qc.invalidateQueries({ queryKey: ["transactions", "recent"] });
          qc.invalidateQueries({
            queryKey: wsId
              ? ACCOUNT_KEYS.byWorkspace(wsId)
              : ACCOUNT_KEYS.all(),
          });
          qc.invalidateQueries({ queryKey: ACCOUNT_KEYS.all() });
          qc.invalidateQueries({
            queryKey: ACCOUNT_KEYS.totalsConverted(wsId),
          });
          qc.invalidateQueries({
            queryKey: ACCOUNT_KEYS.workspaceBalanceHistory(wsId),
          });
          qc.invalidateQueries({
            queryKey: ACCOUNT_KEYS.transactions(accountId!),
          });
          usePickerStore.setState({ newTransactionId: first.id });
          router.back();
        })
        .catch(() => {
          setSplitSaving(false);
          Alert.alert(
            t("addTransaction.title"),
            t("addTransaction.errors.saveFailed"),
          );
        });
      return;
    }

    // ── Normal single transaction ─────────────────────────────────────────────
    createTransaction(
      {
        type: txType,
        amount: String(amount),
        currency: isCrossRate ? currency : undefined,
        accountId,
        destinationAccountId:
          txType === "transfer" ? (destAccountId ?? undefined) : undefined,
        destinationAmount:
          txType === "transfer" && effectiveDestAmount
            ? effectiveDestAmount
            : undefined,
        categoryId: categoryId ?? undefined,
        tagIds:
          selectedTags.length > 0 ? selectedTags.map((t) => t.id) : undefined,
        description: description.trim() || undefined,
        date: date.toISOString(),
        workspaceId: activeWorkspaceId ?? undefined,
      },
      {
        onSuccess: (created) => {
          usePickerStore.setState({ newTransactionId: created.id });
          router.back();
        },
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
          <Ionicons name={iconName} size={18} color={getIconColor(iconBg)} />
        </View>
        <View style={s.flex}>
          <Typography variant="body">{account.name}</Typography>
          <Typography variant="caption" color="textTertiary">
            {account.balances.map((b) => b.currency).join(" · ")}
          </Typography>
        </View>
        <Typography variant="body" color="textSecondary">
          {account.balances
            .map((b) => formatAmount(b.balance, b.currency))
            .join(" / ")}
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
            setCategoryId(null);
            setCategoryName(null);
            setCategoryIcon(null);
            setCategoryColor(null);
            setCategorySystemCode(null);
            setIsRefundCategory(false);
            setSelectedTags([]);
            setIsSplitMode(false);
            setSplitItems([]);
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
        {txType !== "transfer" && !isSplitMode && (
          <>
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
                    {isCrossRate && convertedAmount !== null ? (
                      <>
                        <Typography variant="body" color="textSecondary">
                          {formatAmount(
                            String(convertedAmount),
                            accountCurrency,
                          )}
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

            {/* Split transaction trigger */}
            <Pressable
              style={({ pressed }) => [s.splitRow, pressed && s.pressed]}
              onPress={handleSplitPress}
            >
              <Ionicons
                name="git-branch-outline"
                size={18}
                color={colors.textTertiary}
              />
              <Typography variant="body" color="textTertiary">
                {t("addTransaction.splitTransaction")}
              </Typography>
            </Pressable>
          </>
        )}

        {/* Split mode: one card per category */}
        {txType !== "transfer" && isSplitMode && (
          <>
            {splitItems.map((item, index) => {
              const itemIconName = (item.categoryIcon ??
                "help") as React.ComponentProps<typeof Ionicons>["name"];
              return (
                <View key={item.id} style={s.card}>
                  <View style={s.cardRow}>
                    <Pressable
                      style={({ pressed }) => [
                        s.rowIconCircle,
                        {
                          backgroundColor:
                            item.categoryColor ?? colors.backgroundElevated,
                        },
                        pressed && s.pressed,
                      ]}
                      onPress={() => openSplitCategoryPicker(index)}
                    >
                      <Ionicons name={itemIconName} size={18} color="#fff" />
                    </Pressable>
                    <Pressable
                      style={[s.flex]}
                      onPress={() => openSplitCategoryPicker(index)}
                    >
                      <Typography variant="caption" color="textTertiary">
                        {t("addTransaction.splitCategory")}
                      </Typography>
                      <Typography
                        variant="body"
                        color={
                          item.categoryId ? "textPrimary" : "textSecondary"
                        }
                      >
                        {item.categoryName ??
                          (txType === "income"
                            ? t("addTransaction.uncategorisedIncome")
                            : t("addTransaction.uncategorisedExpense"))}
                      </Typography>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        s.splitAmountBtn,
                        pressed && s.pressed,
                      ]}
                      onPress={() => openSplitAmountSheet(index)}
                    >
                      <Typography
                        variant="body"
                        color="textPrimary"
                        style={s.splitAmountText}
                      >
                        {formatAmount(item.amount || "0", currency)}
                      </Typography>
                    </Pressable>
                    <Pressable
                      hitSlop={8}
                      style={({ pressed }) => [
                        s.splitMenuBtn,
                        pressed && s.pressed,
                      ]}
                      onPress={() =>
                        Alert.alert(
                          item.categoryName ??
                            t("addTransaction.uncategorisedExpense"),
                          undefined,
                          [
                            {
                              text: t("common.delete"),
                              style: "destructive",
                              onPress: () => handleDeleteSplitItem(index),
                            },
                            { text: t("common.cancel"), style: "cancel" },
                          ],
                        )
                      }
                    >
                      <Ionicons
                        name="ellipsis-vertical"
                        size={18}
                        color={colors.textTertiary}
                      />
                    </Pressable>
                  </View>
                </View>
              );
            })}

            {/* Add category row */}
            {splitItems.length < 3 && (
              <Pressable
                style={({ pressed }) => [s.splitRow, pressed && s.pressed]}
                onPress={handleAddSplitCategory}
              >
                <Ionicons name="add" size={18} color={colors.textTertiary} />
                <Typography variant="body" color="textTertiary">
                  {t("addTransaction.addCategory")}
                </Typography>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>

      {/* ── Split warning bar ───────────────────────────────────────────────── */}
      {isSplitMode && !isSplitBalanced && totalAmount > 0 && (
        <View style={s.splitWarningBar}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={colors.warning}
          />
          <Typography variant="bodySmall" style={s.splitWarningText}>
            {formatAmount(String(Math.abs(remainingAmount)), currency)}{" "}
            {t("addTransaction.remainingToDistribute")}
          </Typography>
        </View>
      )}

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
                (saving ||
                  (isSplitMode && !isSplitBalanced && totalAmount > 0)) &&
                  s.saveBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={
                saving || (isSplitMode && !isSplitBalanced && totalAmount > 0)
              }
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
            (saving || (isSplitMode && !isSplitBalanced && totalAmount > 0)) &&
              s.saveBtnDisabled,
          ]}
          onPress={handleSave}
          disabled={
            saving || (isSplitMode && !isSplitBalanced && totalAmount > 0)
          }
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

      {/* ── Split amount sheet ───────────────────────────────────────────────── */}
      <BottomSheetModal
        ref={splitAmountSheetRef}
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
              onPress={() => splitAmountSheetRef.current?.dismiss()}
              hitSlop={8}
            >
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </Pressable>
            <View style={s.destAmountHeaderCenter} pointerEvents="none">
              <Typography variant="label" style={s.destAmountHeaderTitle}>
                {splitItems[editingSplitAmountIndexRef.current]?.categoryName ??
                  t("addTransaction.splitAmountLabel")}
              </Typography>
            </View>
            <Pressable
              style={({ pressed }) => [
                s.destAmountHeaderDone,
                pressed && s.pressed,
              ]}
              onPress={() => splitAmountKeyboard.handleKey("done")}
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
                {getCurrencySymbol(currency)}
                {splitAmountKeyboard.displayStr}
              </Typography>
            </View>
          </View>
          <AmountKeyboard
            onKey={splitAmountKeyboard.handleKey}
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
  rowIconSquare: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 64,
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
  tagBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  } as ViewStyle,
  tagBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textOnAccent,
  } as TextStyle,

  // Split mode
  splitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 30,
    paddingVertical: 14,
  } as ViewStyle,
  splitAmountBtn: {
    paddingLeft: 8,
    alignItems: "flex-end",
  } as ViewStyle,
  splitAmountText: {
    fontWeight: "600",
    textDecorationLine: "underline",
  } as TextStyle,
  splitMenuBtn: {
    paddingLeft: 8,
    paddingRight: 2,
    alignItems: "center",
    justifyContent: "center",
    height: 36,
  } as ViewStyle,
  splitWarningBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.backgroundSurface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  } as ViewStyle,
  splitWarningText: {
    color: colors.warning,
    flex: 1,
  } as TextStyle,
});

export default AddTransactionModal;
