import { View, Text } from "react-native";

const CARD_WIDTH = 270;
const CARD_HEIGHT = 170;

const Chip = () => (
  <View
    style={{
      width: 38,
      height: 28,
      backgroundColor: "#C8A84B",
      borderRadius: 6,
      borderCurve: "continuous",
      overflow: "hidden",
    }}
  >
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.2)",
        borderRadius: 6,
        borderCurve: "continuous",
      }}
    />
    <View
      style={{
        position: "absolute",
        top: "50%",
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: "rgba(255,255,255,0.25)",
      }}
    />
    <View
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: "35%",
        width: 1,
        backgroundColor: "rgba(255,255,255,0.25)",
      }}
    />
    <View
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        right: "35%",
        width: 1,
        backgroundColor: "rgba(255,255,255,0.25)",
      }}
    />
  </View>
);

const CardNumberDots = () => (
  <View style={{ flexDirection: "row", gap: 10 }}>
    {[0, 1, 2].map((group) => (
      <View key={group} style={{ flexDirection: "row", gap: 3 }}>
        {[0, 1, 2, 3].map((dot) => (
          <View
            key={dot}
            style={{
              width: 5,
              height: 5,
              borderRadius: 3,
              backgroundColor: "rgba(255,255,255,0.35)",
            }}
          />
        ))}
      </View>
    ))}
    <View style={{ flexDirection: "row", gap: 4 }}>
      {["4", "2"].map((digit, i) => (
        <Text
          key={i}
          style={{
            color: "rgba(255,255,255,0.8)",
            fontSize: 12,
            fontWeight: "500",
            letterSpacing: 2,
          }}
        >
          {digit}
        </Text>
      ))}
    </View>
  </View>
);

const MastercardLogo = () => (
  <View style={{ flexDirection: "row" }}>
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: "#EB001B",
        marginRight: -8,
      }}
    />
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: "#F79E1B",
        opacity: 0.95,
      }}
    />
  </View>
);

export const CardIllustration = () => {
  return (
    <View
      style={{
        width: CARD_WIDTH + 60,
        height: CARD_HEIGHT + 80,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Back card */}
      <View
        style={{
          position: "absolute",
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          backgroundColor: "#252B3D",
          borderRadius: 20,
          borderCurve: "continuous",
          transform: [
            { rotate: "-8deg" },
            { translateX: -18 },
            { translateY: 18 },
          ],
          boxShadow: "0 16px 40px rgba(0, 0, 0, 0.5)",
        }}
      />

      {/* Front card */}
      <View
        style={{
          position: "absolute",
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          backgroundColor: "#151922",
          borderRadius: 20,
          borderCurve: "continuous",
          transform: [{ rotate: "4deg" }],
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
          padding: 22,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.06)",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Chip />
          <View
            style={{
              width: 30,
              height: 30,
              backgroundColor: "#F05E23",
              borderRadius: 15,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
              M
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 20 }}>
          <CardNumberDots />
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginTop: "auto",
          }}
        >
          <Text
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: 11,
              fontWeight: "600",
              letterSpacing: 1.5,
            }}
          >
            MONOHROSHI
          </Text>
          <MastercardLogo />
        </View>
      </View>
    </View>
  );
};
