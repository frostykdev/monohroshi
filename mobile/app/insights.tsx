import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
  TextStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";
import {
  GiftedChat,
  IMessage,
  Bubble,
  InputToolbar,
  Composer,
  Send,
  BubbleProps,
  Message,
  MessageProps,
} from "react-native-gifted-chat";
import { colors } from "@constants/colors";
import { Typography } from "@components/ui/Typography";
import { ScreenHeader } from "@components/ui/ScreenHeader";
import { useWorkspaceStore } from "@stores/useWorkspaceStore";
import {
  useInsightsStore,
  type ChatMessageEntry,
} from "@stores/useInsightsStore";
import { useSendInsightsMessage } from "@services/insights/insights.queries";
import { useCreateBudget } from "@services/budgets/budgets.queries";
import type { InsightsAction } from "@services/insights/insights.api";

const HEADER_HEIGHT = 56;
const BOT_USER = { _id: "bot", name: "Insights" } as const;
const CURRENT_USER = { _id: "user" } as const;

const SUGGESTED_KEYS = [
  "insights.suggestedQuestions.monthOverview",
  "insights.suggestedQuestions.saveMoney",
  "insights.suggestedQuestions.planBudget",
  "insights.suggestedQuestions.spendingHabits",
] as const;

const toGiftedMessages = (entries: ChatMessageEntry[]): IMessage[] =>
  [...entries].reverse().map((e) => ({
    _id: e.id,
    text: e.content,
    createdAt: new Date(),
    user: e.role === "user" ? CURRENT_USER : BOT_USER,
    ...(e.actions && e.actions.length > 0
      ? { quickReplies: undefined, actions: e.actions }
      : {}),
  }));

const DOT_DURATION = 380;

const TypingIndicator = () => {
  const d1 = useSharedValue(0.3);
  const d2 = useSharedValue(0.3);
  const d3 = useSharedValue(0.3);

  useEffect(() => {
    const cfg = { duration: DOT_DURATION, easing: Easing.inOut(Easing.ease) };
    const anim = withRepeat(
      withSequence(withTiming(1, cfg), withTiming(0.3, cfg)),
      -1,
    );
    d1.value = anim;
    d2.value = withDelay(DOT_DURATION * 0.33, anim);
    d3.value = withDelay(DOT_DURATION * 0.66, anim);
  }, [d1, d2, d3]);

  const s1 = useAnimatedStyle(() => ({ opacity: d1.value }));
  const s2 = useAnimatedStyle(() => ({ opacity: d2.value }));
  const s3 = useAnimatedStyle(() => ({ opacity: d3.value }));

  return (
    <View style={ti.container}>
      <Animated.View style={[ti.dot, s1]} />
      <Animated.View style={[ti.dot, s2]} />
      <Animated.View style={[ti.dot, s3]} />
    </View>
  );
};

const ti = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 12,
  } as ViewStyle,
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  } as ViewStyle,
});

const InsightsScreen = () => {
  const insets = useSafeAreaInsets();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardWillShow", () =>
      setIsKeyboardOpen(true),
    );
    const hideSub = Keyboard.addListener("keyboardWillHide", () =>
      setIsKeyboardOpen(false),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  const workspaceId = useWorkspaceStore((s) => s.id);

  const messages = useInsightsStore((s) => s.messages);
  const addMessage = useInsightsStore((s) => s.addMessage);
  const clearMessages = useInsightsStore((s) => s.clearMessages);

  const mutation = useSendInsightsMessage();
  const createBudgetMutation = useCreateBudget(workspaceId);
  const [executingActionId, setExecutingActionId] = useState<string | null>(
    null,
  );
  const idCounter = useRef(Date.now());

  const nextId = () => {
    idCounter.current += 1;
    return String(idCounter.current);
  };

  const giftedMessages = useMemo(() => toGiftedMessages(messages), [messages]);

  const handleSend = useCallback(
    (text: string) => {
      const userEntry: ChatMessageEntry = {
        id: nextId(),
        role: "user",
        content: text,
      };
      addMessage(userEntry);

      const history = [...messages, userEntry].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      mutation.mutate(
        {
          message: text,
          history: history.slice(0, -1),
          workspaceId: workspaceId ?? undefined,
        },
        {
          onSuccess: (data) => {
            addMessage({
              id: nextId(),
              role: "assistant",
              content: data.reply,
              actions: data.actions,
            });
          },
          onError: () => {
            addMessage({
              id: nextId(),
              role: "assistant",
              content: t("insights.errorMessage"),
            });
          },
        },
      );
    },
    [messages, workspaceId, mutation, addMessage, t, i18n.language],
  );

  const onSendGifted = useCallback(
    (newMessages: IMessage[] = []) => {
      const text = newMessages[0]?.text?.trim();
      if (text) handleSend(text);
    },
    [handleSend],
  );

  const handleActionPress = useCallback(
    (action: InsightsAction, messageId: string) => {
      if (!action.isExecutable) {
        router.push(action.route as never);
        return;
      }

      if (action.actionKey === "execute_create_budget") {
        const chipId = `${messageId}:${action.actionKey}`;
        setExecutingActionId(chipId);
        createBudgetMutation.mutate(
          {
            amount: action.params.amount,
            categoryId: action.params.categoryId || undefined,
            workspaceId: workspaceId ?? undefined,
          },
          {
            onSuccess: () => {
              setExecutingActionId(null);
              addMessage({
                id: nextId(),
                role: "assistant",
                content: t("insights.budgetCreated"),
                actions: [
                  {
                    label: t("insights.viewBudgets"),
                    route: "/settings/budgets",
                    isExecutable: false,
                    actionKey: "view_budgets",
                    params: { categoryId: "", categoryName: "", amount: "" },
                  },
                ],
              });
            },
            onError: () => {
              setExecutingActionId(null);
              addMessage({
                id: nextId(),
                role: "assistant",
                content: t("insights.budgetCreateError"),
              });
            },
          },
        );
      }
    },
    [createBudgetMutation, workspaceId, addMessage, t],
  );

  const renderMessage = useCallback(
    (props: MessageProps<IMessage>): React.ReactElement => {
      const isBot = props.currentMessage?.user._id === "bot";

      if (isBot) {
        const msg = props.currentMessage;
        const actions = (msg as IMessage & { actions?: InsightsAction[] })
          ?.actions;

        return (
          <View style={s.botMessageContainer}>
            <Markdown style={markdownStyles}>
              {(msg?.text as string) ?? ""}
            </Markdown>
            {actions && actions.length > 0 && (
              <View style={s.actionsRow}>
                {actions.map((action) => {
                  const chipId = `${msg?._id}:${action.actionKey}`;
                  const isRunning = executingActionId === chipId;
                  return (
                    <Pressable
                      key={`${action.actionKey}:${action.label}`}
                      style={({ pressed }) => [
                        s.actionChip,
                        action.isExecutable && s.actionChipExecute,
                        pressed && s.actionChipPressed,
                        isRunning && s.actionChipPressed,
                      ]}
                      onPress={() =>
                        handleActionPress(action, String(msg?._id ?? ""))
                      }
                      disabled={isRunning}
                    >
                      {isRunning ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.textOnAccent}
                        />
                      ) : (
                        <>
                          <Typography
                            variant="bodySmall"
                            style={
                              action.isExecutable
                                ? s.executeChipText
                                : s.navigateChipText
                            }
                          >
                            {action.label}
                          </Typography>
                          <Ionicons
                            name={
                              action.isExecutable
                                ? "checkmark-circle-outline"
                                : "chevron-forward"
                            }
                            size={14}
                            color={
                              action.isExecutable
                                ? colors.textOnAccent
                                : colors.accent
                            }
                          />
                        </>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        );
      }

      return (
        <Message
          {...props}
          renderBubble={(bubbleProps: BubbleProps<IMessage>) => (
            <Bubble
              {...bubbleProps}
              wrapperStyle={{ right: s.bubbleRight }}
              textStyle={{ right: s.bubbleTextRight }}
            />
          )}
        />
      );
    },
    [handleActionPress, executingActionId],
  );

  const renderInputToolbar = useCallback(
    (props: React.ComponentProps<typeof InputToolbar>) => (
      <InputToolbar
        {...props}
        containerStyle={[
          s.inputToolbar,
          !isKeyboardOpen && { paddingBottom: insets.bottom },
        ]}
        primaryStyle={s.inputPrimary}
      />
    ),
    [insets.bottom, isKeyboardOpen],
  );

  const renderComposer = useCallback(
    (props: React.ComponentProps<typeof Composer>) => (
      <Composer
        {...props}
        textInputProps={{
          ...props.textInputProps,
          placeholder: t("insights.inputPlaceholder"),
          style: s.composerText,
          placeholderTextColor: colors.textTertiary,
        }}
      />
    ),
    [i18n.language],
  );

  const renderSend = useCallback(
    (props: React.ComponentProps<typeof Send>) => (
      <Send {...props} containerStyle={s.sendContainer}>
        <Ionicons name="arrow-up-circle" size={32} color={colors.accent} />
      </Send>
    ),
    [],
  );

  const renderFooter = useCallback(
    () => (mutation.isPending ? <TypingIndicator /> : null),
    [mutation.isPending],
  );

  const renderChatEmpty = useCallback(() => {
    return (
      <View style={s.emptyContainer}>
        <View style={s.botIconWrapper}>
          <Ionicons
            name="chatbubble-ellipses"
            size={40}
            color={colors.accent}
          />
        </View>
        <Typography
          variant="h3"
          align="center"
          i18nKey="insights.title"
          style={s.emptyTitle}
        />
        <Typography
          variant="body"
          color="textSecondary"
          align="center"
          i18nKey="insights.welcome"
          style={s.emptySubtitle}
        />
        <View style={s.suggestionsContainer}>
          {SUGGESTED_KEYS.map((key) => {
            const text = t(key as never);
            return (
              <Pressable
                key={key}
                style={({ pressed }) => [
                  s.suggestionChip,
                  pressed && s.suggestionChipPressed,
                ]}
                onPress={() => handleSend(text)}
              >
                <Typography variant="bodySmall" color="textPrimary">
                  {text}
                </Typography>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={colors.textTertiary}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }, [handleSend, i18n.language]);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <ScreenHeader
        title={t("insights.title")}
        left={<Ionicons name="close" size={24} color={colors.textPrimary} />}
        onLeftPress={() => router.back()}
        right={
          messages.length > 0 ? (
            <Ionicons name="create-outline" size={22} color={colors.accent} />
          ) : undefined
        }
        onRightPress={messages.length > 0 ? clearMessages : undefined}
      />
      <GiftedChat
        messages={giftedMessages}
        onSend={onSendGifted}
        user={CURRENT_USER}
        colorScheme="dark"
        renderMessage={renderMessage}
        renderFooter={renderFooter}
        renderInputToolbar={renderInputToolbar}
        renderComposer={renderComposer}
        renderSend={renderSend}
        renderChatEmpty={renderChatEmpty}
        renderAvatar={null}
        renderDay={() => null}
        renderTime={() => null}
        isTyping={false}
        isSendButtonAlwaysVisible
        isScrollToBottomEnabled
        scrollToBottomStyle={s.scrollToBottom}
        messagesContainerStyle={s.messagesContainer}
        keyboardAvoidingViewProps={{
          keyboardVerticalOffset: insets.top + HEADER_HEIGHT,
        }}
        listProps={{
          contentContainerStyle:
            messages.length === 0 ? s.emptyListContent : undefined,
        }}
      />
    </View>
  );
};

const markdownStyles = {
  body: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 0,
    marginBottom: 0,
  },
  heading1: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  heading2: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.textPrimary,
    marginTop: 14,
    marginBottom: 6,
  },
  heading3: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    marginTop: 10,
    marginBottom: 4,
  },
  hr: {
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 6,
  },
  strong: {
    fontWeight: "700" as const,
  },
  em: {
    fontStyle: "italic" as const,
  },
  bullet_list: {
    marginTop: 4,
    marginBottom: 4,
  },
  ordered_list: {
    marginTop: 4,
    marginBottom: 4,
  },
  list_item: {
    marginBottom: 3,
  },
  code_inline: {
    backgroundColor: colors.backgroundSurface,
    color: colors.accent,
    fontSize: 13,
    borderRadius: 4,
    paddingHorizontal: 4,
  },
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  messagesContainer: {
    backgroundColor: colors.background,
  } as ViewStyle,

  // Bot message — full-width, no bubble
  botMessageContainer: {
    width: "100%",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 14,
  } as ViewStyle,

  // User bubble
  bubbleRight: {
    backgroundColor: colors.backgroundSurface,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
    marginBottom: 2,
  } as ViewStyle,
  bubbleTextRight: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
  } as TextStyle,

  // Action chips
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 10,
  } as ViewStyle,
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: "rgba(240, 185, 11, 0.08)",
  } as ViewStyle,
  actionChipExecute: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  } as ViewStyle,
  actionChipPressed: {
    opacity: 0.6,
  } as ViewStyle,
  navigateChipText: {
    color: colors.accent,
  } as TextStyle,
  executeChipText: {
    color: colors.textOnAccent,
  } as TextStyle,

  // Input
  inputToolbar: {
    backgroundColor: colors.backgroundElevated,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
  } as ViewStyle,
  inputPrimary: {
    alignItems: "center",
  } as ViewStyle,
  composerText: {
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 22,
    paddingTop: 10,
    paddingHorizontal: 8,
  } as TextStyle,
  sendContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
    marginBottom: 4,
  } as ViewStyle,

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    transform: [{ scaleY: -1 }],
  } as ViewStyle,
  emptyListContent: {
    flexGrow: 1,
  } as ViewStyle,
  botIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.backgroundElevated,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  } as ViewStyle,
  emptyTitle: {
    marginBottom: 8,
  } as TextStyle,
  emptySubtitle: {
    marginBottom: 28,
  } as TextStyle,
  suggestionsContainer: {
    width: "100%",
    gap: 10,
  } as ViewStyle,
  suggestionChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: colors.backgroundElevated,
  } as ViewStyle,
  suggestionChipPressed: {
    opacity: 0.7,
  } as ViewStyle,

  // Scroll to bottom
  scrollToBottom: {
    backgroundColor: colors.backgroundSurface,
    borderColor: colors.border,
    borderWidth: 1,
  } as ViewStyle,
});

export default InsightsScreen;
