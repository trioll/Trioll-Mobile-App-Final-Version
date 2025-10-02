# Layout Components Usage Guide
**Created:** October 3, 2025  
**Purpose:** Documentation for reusable layout components

---

## 📦 Available Components

### 1. ResponsiveContainer

**Purpose:** Wrapper that provides responsive padding based on device size

**When to use:**
- Wrapping sections that need consistent padding
- Creating cards or panels
- Any container that needs device-responsive spacing

**Props:**
- `padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'` - All-around padding
- `paddingHorizontal?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'` - Left/right padding
- `paddingVertical?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'` - Top/bottom padding
- `style?: ViewStyle` - Additional custom styles

**Examples:**

```tsx
import { ResponsiveContainer } from '../src/components/layouts';

// Simple wrapper with medium padding
<ResponsiveContainer padding="md">
  <Text>Content</Text>
</ResponsiveContainer>

// Different horizontal/vertical padding
<ResponsiveContainer paddingHorizontal="lg" paddingVertical="sm">
  <Text>Wide but short content</Text>
</ResponsiveContainer>

// With custom styles
<ResponsiveContainer 
  padding="xl" 
  style={{ backgroundColor: '#000' }}
>
  <Text>Dark background with extra padding</Text>
</ResponsiveContainer>
```

---

### 2. KeyboardAwareScreen

**Purpose:** Combines ScrollView + KeyboardAvoidingView pattern with responsive padding

**When to use:**
- Screens with text inputs
- Forms that need to scroll
- Any screen where keyboard might cover content

**Props:**
- `scrollable?: boolean` - Enable/disable scrolling (default: true)
- `padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'` - Padding size (default: 'md')
- `style?: ViewStyle` - Container style
- `contentContainerStyle?: ViewStyle` - ScrollView content style
- `bounces?: boolean` - Enable bounce effect (default: false)
- `keyboardShouldPersistTaps?: 'always' | 'never' | 'handled'` - Keyboard behavior (default: 'handled')

**Examples:**

```tsx
import { KeyboardAwareScreen } from '../src/components/layouts';

// Basic scrollable form screen
<KeyboardAwareScreen scrollable padding="lg">
  <TextInput placeholder="Email" />
  <TextInput placeholder="Password" />
  <Button title="Login" />
</KeyboardAwareScreen>

// Non-scrollable screen (for shorter forms)
<KeyboardAwareScreen scrollable={false} padding="md">
  <TextInput placeholder="Search" />
  <View>Results here</View>
</KeyboardAwareScreen>

// Custom content styling
<KeyboardAwareScreen 
  padding="xl"
  contentContainerStyle={{ alignItems: 'center' }}
>
  <Text>Centered content</Text>
</KeyboardAwareScreen>
```

---

### 3. FormScreen

**Purpose:** Complete form screen with optional header, back button, and keyboard handling

**When to use:**
- Standard form screens
- Screens that need a title and back button
- Registration/login flows
- Settings screens with forms

**Props:**
- `title?: string` - Screen title
- `onBack?: () => void` - Back button handler
- `padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'` - Content padding (default: 'lg')
- `scrollable?: boolean` - Enable scrolling (default: true)
- `headerStyle?: ViewStyle` - Custom header styles
- `contentStyle?: ViewStyle` - Custom content styles
- `showBackButton?: boolean` - Show/hide back button (default: true)

**Examples:**

```tsx
import { FormScreen } from '../src/components/layouts';

// Complete form with header
<FormScreen 
  title="Register" 
  onBack={() => navigation.goBack()}
  padding="lg"
>
  <TextInput placeholder="Username" />
  <TextInput placeholder="Email" />
  <TextInput placeholder="Password" />
  <Button title="Sign Up" />
</FormScreen>

// Without header (custom header inside)
<FormScreen padding="md" showBackButton={false}>
  <CustomAnimatedHeader />
  <FormFields />
</FormScreen>

// Non-scrollable with title
<FormScreen 
  title="Quick Login"
  onBack={() => navigation.goBack()}
  scrollable={false}
  padding="xl"
>
  <TextInput placeholder="PIN" />
  <Button title="Login" />
</FormScreen>
```

---

## 🎯 Migration Examples

### Before (Manual Implementation):

```tsx
// Old way - lots of boilerplate
import { 
  View, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MyScreen = () => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#1a1a2e' }}>
      <View style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
        <Pressable onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color="#FFF" />
        </Pressable>
        <Text style={{ fontSize: 20 }}>My Form</Text>
      </View>
      
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput placeholder="Field 1" />
          <TextInput placeholder="Field 2" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
```

### After (Using FormScreen):

```tsx
// New way - clean and simple
import { FormScreen } from '../src/components/layouts';

const MyScreen = () => {
  return (
    <FormScreen 
      title="My Form" 
      onBack={() => navigation.goBack()}
      padding="lg"
    >
      <TextInput placeholder="Field 1" />
      <TextInput placeholder="Field 2" />
    </FormScreen>
  );
};
```

**Benefits:**
- ✅ 80% less boilerplate code
- ✅ Automatic responsive padding
- ✅ Consistent keyboard handling
- ✅ Built-in SafeAreaView
- ✅ Standard header pattern
- ✅ Easier to maintain

---

## 📏 Padding Size Reference

| Size | iPhone SE (375px) | iPhone 14 (390px) | Pro Max (430px) |
|------|-------------------|-------------------|-----------------|
| `xs` | 2px               | 4px               | 6px             |
| `sm` | 6px               | 8px               | 10px            |
| `md` | 12px              | 16px              | 20px            |
| `lg` | 20px              | 24px              | 28px            |
| `xl` | 32px              | 40px              | 48px            |
| `xxl`| 60px              | 80px              | 96px            |

---

## 🎨 Common Patterns

### Pattern 1: Simple Form Screen

```tsx
<FormScreen 
  title="Login" 
  onBack={() => navigation.goBack()}
>
  <TextInput />
  <TextInput />
  <Button />
</FormScreen>
```

### Pattern 2: Custom Header + Keyboard Aware

```tsx
<KeyboardAwareScreen padding="lg">
  <CustomHeader />
  <FormContent />
</KeyboardAwareScreen>
```

### Pattern 3: Responsive Card

```tsx
<ResponsiveContainer 
  padding="md" 
  style={styles.card}
>
  <CardContent />
</ResponsiveContainer>
```

### Pattern 4: Settings Screen

```tsx
<FormScreen 
  title="Settings" 
  scrollable={true}
  padding="md"
>
  <SettingSection title="Account" />
  <SettingSection title="Privacy" />
  <SettingSection title="Notifications" />
</FormScreen>
```

---

## ⚡ Best Practices

### DO:
- ✅ Use FormScreen for standard form layouts
- ✅ Use KeyboardAwareScreen when you need custom headers
- ✅ Use ResponsiveContainer for cards/sections
- ✅ Stick to predefined padding sizes (xs-xxl)
- ✅ Compose components (ResponsiveContainer inside KeyboardAwareScreen)

### DON'T:
- ❌ Don't hardcode padding values anymore
- ❌ Don't duplicate SafeAreaView + KeyboardAvoidingView boilerplate
- ❌ Don't use custom padding values (use the predefined sizes)
- ❌ Don't nest multiple KeyboardAvoidingViews

---

## 🔄 Component Composition

You can compose these components together:

```tsx
<FormScreen title="Complex Form" onBack={goBack}>
  <ResponsiveContainer padding="md" style={styles.section}>
    <Text>Section 1</Text>
    <Input />
  </ResponsiveContainer>
  
  <ResponsiveContainer padding="md" style={styles.section}>
    <Text>Section 2</Text>
    <Input />
  </ResponsiveContainer>
</FormScreen>
```

---

## 📝 Future Enhancements

Potential additions for Week 4:

1. **ModalContainer** - Standard modal layout
2. **CardContainer** - Consistent card styling
3. **SectionContainer** - Section dividers and spacing
4. **ListScreen** - FlatList with proper keyboard handling

---

**Created:** October 3, 2025  
**Location:** `src/components/layouts/`  
**Imports:** All components use `utils/responsive.ts`
