import React, { useEffect, useState, useRef, ReactNode } from "react";
import {
  ScrollView,
  ScrollViewProps,
  Keyboard,
  Platform,
  ViewStyle,
} from "react-native";

interface KeyboardAwareScrollViewProps extends ScrollViewProps {
  children: ReactNode;
  extraScrollHeight?: number;
}

/**
 * A ScrollView that automatically adjusts for keyboard appearance.
 * Adds bottom padding when keyboard appears and removes it when dismissed.
 * 
 * Usage:
 * <KeyboardAwareScrollView>
 *   {your content}
 *   <TextInput ... />
 * </KeyboardAwareScrollView>
 */
export function KeyboardAwareScrollView({
  children,
  extraScrollHeight = 40,
  contentContainerStyle,
  ...props
}: KeyboardAwareScrollViewProps) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Merge contentContainerStyle with keyboard padding
  const mergedContentContainerStyle: ViewStyle = {
    paddingBottom: extraScrollHeight + keyboardHeight,
  };

  if (contentContainerStyle) {
    if (Array.isArray(contentContainerStyle)) {
      return (
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[...contentContainerStyle, mergedContentContainerStyle]}
          keyboardShouldPersistTaps="handled"
          {...props}
        >
          {children}
        </ScrollView>
      );
    }
    return (
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[contentContainerStyle, mergedContentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        {...props}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      ref={scrollViewRef}
      contentContainerStyle={mergedContentContainerStyle}
      keyboardShouldPersistTaps="handled"
      {...props}
    >
      {children}
    </ScrollView>
  );
}
