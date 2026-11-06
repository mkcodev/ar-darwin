import { hairline, radius, space, toNativeTextStyle, touchTarget, typography } from "@ar-darwin/ui";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Icon } from "./Icon";

// The field's own line height would clip the caret on Android: only the family and size.
const { fontFamily, fontSize } = toNativeTextStyle(typography.body);

type SearchFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  /** Accessible name of the field (the placeholder is not read once there is text). */
  label: string;
  /** Accessible name of the clear button, shown while there is text. */
  clearLabel: string;
};

/**
 * A search box: magnifier, the native text field and, while there is text, a clear button. 48 dp
 * tall on `bg.surface` with a hairline, like the other fields of the app; the caret and the
 * selection take the accent.
 */
export function SearchField({
  value,
  onChangeText,
  placeholder,
  label,
  clearLabel,
}: SearchFieldProps) {
  const { theme } = useTheme();
  const c = theme.color;
  return (
    <View style={[styles.field, { backgroundColor: c.bg.surface, borderColor: c.border.strong }]}>
      <Icon name="search" color={c.text.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.text.muted}
        accessibilityLabel={label}
        cursorColor={c.accent.default}
        selectionColor={c.accent.subtle}
        selectionHandleColor={c.accent.default}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        style={[styles.input, { color: c.text.primary }]}
      />
      {value !== "" && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={clearLabel}
          onPress={() => onChangeText("")}
          hitSlop={space[2]}
          style={styles.clear}
        >
          <Icon name="close" color={c.text.muted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: touchTarget,
    gap: space[2],
    paddingLeft: space[3],
    borderRadius: radius.pill,
    borderWidth: hairline,
  },
  input: {
    flex: 1,
    alignSelf: "stretch",
    paddingVertical: 0,
    fontFamily,
    fontSize,
  },
  clear: {
    width: touchTarget - space[2],
    height: touchTarget - space[2],
    alignItems: "center",
    justifyContent: "center",
  },
});
