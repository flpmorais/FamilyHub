# Keyboard Avoidance on Android

## The Problem

`KeyboardAvoidingView` with `behavior={Platform.OS === 'ios' ? 'padding' : undefined}` is the React Native default pattern, but it does nothing on Android. When the soft keyboard appears, it overlays the focused input.

Two different solutions are used depending on the UI context.

---

## Solution 1: Bottom Sheet Modal

**Used in:** `src/components/shopping/shopping-add-form.tsx`

### Why `KeyboardAvoidingView` doesn't work here

On Android, `Modal` creates a separate Dialog window. `KeyboardAvoidingView` calculates offsets relative to the main activity window, so it measures incorrectly inside a Modal — the sheet doesn't move, or moves wrong and doesn't return to its original position when the keyboard is dismissed.

### Solution: `Keyboard` listeners + `marginBottom`

```tsx
const [keyboardHeight, setKeyboardHeight] = useState(0);

useEffect(() => {
  const show = Keyboard.addListener("keyboardDidShow", (e) =>
    setKeyboardHeight(e.endCoordinates.height),
  );
  const hide = Keyboard.addListener("keyboardDidHide", () =>
    setKeyboardHeight(0),
  );
  return () => {
    show.remove();
    hide.remove();
  };
}, []);

// Applied to the sheet:
<View style={[s.sheet, { marginBottom: keyboardHeight }]}>
```

### Why it works

`marginBottom` pushes the entire sheet upward by exactly the keyboard height. When the keyboard closes, the value resets to `0` and the sheet returns to its original position. No offset calculations, no platform branching.

---

## Solution 2: Full-Screen Scrollable Form

**Used in:** `src/app/(app)/(recipes)/new.tsx`, `src/app/(app)/(recipes)/[recipeId]/edit.tsx`

### Why `paddingBottom` doesn't work here

Adding `paddingBottom: keyboardHeight` to a `ScrollView`'s `contentContainerStyle` only adds space at the bottom of the scroll content. It does not move the viewport — the focused input is still hidden behind the keyboard until the user manually scrolls.

### Solution: `KeyboardAvoidingView` with `behavior="height"`

```tsx
<KeyboardAvoidingView
  style={s.flex}
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
>
  <ScrollViewContainer ...>
    {/* form fields */}
  </ScrollViewContainer>
</KeyboardAvoidingView>
```

### Why it works

`behavior="height"` shrinks the `KeyboardAvoidingView` height by the keyboard size. This makes the inner `ScrollView` shorter. Android then natively scrolls the focused `TextInput` into view within the now-smaller scroll area. This is standard Android accessibility behavior that only activates once the scroll container is constrained.

`KeyboardAvoidingView` works here (unlike in modals) because the recipe screens are regular activity screens — the offset calculation is accurate against the main window.

---

## Summary

| Context | Solution | Key prop |
|---|---|---|
| Bottom sheet inside `Modal` | `Keyboard` listeners | `marginBottom: keyboardHeight` on sheet |
| Full-screen scrollable form | `KeyboardAvoidingView` | `behavior="height"` on Android |
