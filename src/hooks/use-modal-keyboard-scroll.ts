import { useState, useEffect, useRef, createRef, RefObject } from "react";
import { Keyboard, Platform, ScrollView, TextInput } from "react-native";

interface UseModalKeyboardScrollOptions {
  inputKeys: string[];
}

interface UseModalKeyboardScrollReturn {
  keyboardHeight: number;
  scrollViewRef: RefObject<ScrollView>;
  inputRefs: { [key: string]: RefObject<TextInput> };
  inputPositions: { current: { [key: string]: number } };
  scrollToInput: (inputKey: string) => void;
  getInputProps: (inputKey: string) => {
    ref: RefObject<TextInput>;
    onLayout: (e: any) => void;
    onFocus: () => void;
  };
}

export function useModalKeyboardScroll(
  options: UseModalKeyboardScrollOptions
): UseModalKeyboardScrollReturn {
  const { inputKeys } = options;
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Create refs for each input
  const inputRefs = useRef<{ [key: string]: RefObject<TextInput> }>({});
  inputKeys.forEach((key) => {
    if (!inputRefs.current[key]) {
      inputRefs.current[key] = createRef<TextInput>();
    }
  });

  const inputPositions = useRef<{ [key: string]: number }>({});

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

  const scrollToInput = (inputKey: string) => {
    const position = inputPositions.current[inputKey];
    if (position !== undefined && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: Math.max(0, position - 120), // Scroll to position with padding from top
        animated: true,
      });
    }
  };

  const getInputProps = (inputKey: string) => ({
    ref: inputRefs.current[inputKey],
    onLayout: (e: any) => {
      inputPositions.current[inputKey] = e.nativeEvent.layout.y;
    },
    onFocus: () => scrollToInput(inputKey),
  });

  return {
    keyboardHeight,
    scrollViewRef,
    inputRefs: inputRefs.current,
    inputPositions,
    scrollToInput,
    getInputProps,
  };
}
