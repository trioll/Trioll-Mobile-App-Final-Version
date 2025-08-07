import React from 'react';
import { 
  TextInput, 
  View, 
  Text, 
  ViewStyle, 
  TextStyle, 
  StyleSheet, 
  TextInputProps,
  TouchableOpacity
} from 'react-native';
import { DS } from '../../styles/TriollDesignSystem';

interface GlassInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  containerStyle?: ViewStyle | ViewStyle[];
  inputStyle?: TextStyle | TextStyle[];
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
}

export const GlassInput: React.FC<GlassInputProps> = ({
  label,
  error,
  helperText,
  containerStyle,
  inputStyle,
  leftIcon,
  rightIcon,
  onRightIconPress,
  editable = true,
  ...props
}) => {
  const [isFocused, setIsFocused] = React.useState(false);

  const containerStyles = [
    styles.container,
    containerStyle,
  ];

  const inputContainerStyles = [
    styles.inputContainer,
    isFocused && styles.inputContainerFocused,
    error && styles.inputContainerError,
    !editable && styles.inputContainerDisabled,
  ];

  const inputStyles = [
    styles.input,
    leftIcon && styles.inputWithLeftIcon,
    rightIcon && styles.inputWithRightIcon,
    !editable && styles.inputDisabled,
    inputStyle,
  ];

  return (
    <View style={containerStyles}>
      {label && (
        <Text style={[styles.label, error && styles.labelError]}>
          {label}
        </Text>
      )}
      
      <View style={inputContainerStyles}>
        {leftIcon && (
          <View style={styles.iconContainer}>
            {leftIcon}
          </View>
        )}
        
        <TextInput
          {...props}
          style={inputStyles}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          placeholderTextColor={DS.colors.textMuted}
          editable={editable}
        />
        
        {rightIcon && (
          <TouchableOpacity
            style={styles.iconContainer}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      
      {(error || helperText) && (
        <Text style={[styles.helperText, error && styles.errorText]}>
          {error || helperText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: DS.spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: DS.colors.textPrimary,
    marginBottom: DS.spacing.sm,
    letterSpacing: 0.3,
  },
  labelError: {
    color: DS.colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: DS.colors.border,
    borderRadius: DS.effects.borderRadiusMedium,
    height: DS.layout.inputHeight + 8,
    paddingHorizontal: DS.spacing.xs,
    ...DS.effects.shadowSubtle,
  },
  inputContainerFocused: {
    borderColor: DS.colors.primary,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1.5,
    ...DS.effects.shadowMedium,
  },
  inputContainerError: {
    borderColor: DS.colors.error,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
  },
  inputContainerDisabled: {
    opacity: 0.5,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400' as const,
    color: DS.colors.textPrimary,
    paddingHorizontal: DS.spacing.md,
    height: '100%',
    letterSpacing: 0.3,
  },
  inputWithLeftIcon: {
    paddingLeft: 0,
  },
  inputWithRightIcon: {
    paddingRight: 0,
  },
  inputDisabled: {
    color: DS.colors.textDisabled,
  },
  iconContainer: {
    paddingHorizontal: DS.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
  },
  helperText: {
    fontSize: 13,
    color: DS.colors.textSecondary,
    marginTop: DS.spacing.xs,
    marginLeft: DS.spacing.xs,
    letterSpacing: 0.2,
  },
  errorText: {
    color: DS.colors.error,
  },
});