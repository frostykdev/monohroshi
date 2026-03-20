import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  GiftedChat,
  IMessage,
  Bubble,
  InputToolbar,
  Composer,
  Send,
  BubbleProps,
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

  const handleActionPress = useCallback((action: InsightsAction) => {
    router.push(action.route as never);
  }, []);

  const renderBubble = useCallback(
    (props: BubbleProps<IMessage>) => {
      const msg = props.currentMessage;
      const actions = (msg as IMessage & { actions?: InsightsAction[] })
        ?.actions;

      return (
        <View>
          <Bubble
            {...props}
            wrapperStyle={{
              left: s.bubbleLeft,
              right: s.bubbleRight,
            }}
            textStyle={{
              left: s.bubbleTextLeft,
              right: s.bubbleTextRight,
            }}
          />
          {actions && actions.length > 0 && (
            <View style={s.actionsRow}>
              {actions.map((action) => (
                <Pressable
                  key={action.route}
                  style={({ pressed }) => [
                    s.actionChip,
                    pressed && s.actionChipPressed,
                  ]}
                  onPress={() => handleActionPress(action)}
                >
                  <Typography variant="bodySmall" color="accent">
                    {action.label}
                  </Typography>
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={colors.accent}
                  />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      );
    },
    [handleActionPress],
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
        left={
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        }
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
        renderBubble={renderBubble}
        renderInputToolbar={renderInputToolbar}
        renderComposer={renderComposer}
        renderSend={renderSend}
        renderChatEmpty={renderChatEmpty}
        renderAvatar={null}
        renderDay={() => null}
        renderTime={() => null}
        isTyping={mutation.isPending}
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

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  messagesContainer: {
    backgroundColor: colors.background,
  } as ViewStyle,

  // Bubbles
  bubbleLeft: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
    marginBottom: 2,
  } as ViewStyle,
  bubbleRight: {
    backgroundColor: colors.backgroundSurface,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
    marginBottom: 2,
  } as ViewStyle,
  bubbleTextLeft: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
  } as TextStyle,
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
    paddingLeft: 8,
    paddingTop: 6,
    paddingBottom: 8,
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
  actionChipPressed: {
    opacity: 0.6,
  } as ViewStyle,

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
