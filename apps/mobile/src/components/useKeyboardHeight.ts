import { useEffect, useState } from "react";
import { Dimensions, Keyboard, type KeyboardEvent, Platform } from "react-native";

/**
 * How much of the window the on-screen keyboard covers, in dp from the bottom edge; 0 while it is
 * hidden. Edge to edge, Android no longer resizes the window for the keyboard, so whatever sits
 * at the bottom (a sheet with a text field) has to move up by itself.
 *
 * Measured from the keyboard's top (`screenY`), not its `height`: on Android the height leaves out
 * the navigation bar under it (on a Vivo V2050, 309.8 dp reported for 333.8 dp covered). Android
 * reports it once the keyboard is up (`keyboardDidShow`), iOS as it starts to rise
 * (`keyboardWillShow`). Discrete events, not a per-frame value: React state is fine here.
 */
export function useKeyboardHeight(): number {
  const [covered, setCovered] = useState(0);
  useEffect(() => {
    const show = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hide = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = (event: KeyboardEvent) => {
      const top = event.endCoordinates.screenY;
      setCovered(Math.max(0, Dimensions.get("window").height - top));
    };
    const subscriptions = [
      Keyboard.addListener(show, onShow),
      Keyboard.addListener(hide, () => setCovered(0)),
    ];
    return () => {
      for (const subscription of subscriptions) subscription.remove();
    };
  }, []);
  return covered;
}
