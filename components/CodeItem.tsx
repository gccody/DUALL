import Code from "@/components/Code";
import { useTheme } from "@/context/ThemeContext";
import { Service } from '@/types';
import { StyleSheet, ViewStyle } from "react-native";

interface CodeItemProps {
  service: Service;
  globalTimestamp: number;
  isHighlighted: boolean;
  isFirstItem: boolean;
}

export default function CodeItem({
  service,
  globalTimestamp,
  isHighlighted,
  isFirstItem
}: CodeItemProps) {
  const { theme } = useTheme();

  const highlightStyle: ViewStyle = isHighlighted ? {
    borderColor: theme.accent,
    borderWidth: 2,
  } : {};

  return (
    <Code
      service={service}
      globalTimestamp={globalTimestamp}
      style={[
        highlightStyle,
        isFirstItem && styles.firstItem
      ]}
    />
  );
}

const styles = StyleSheet.create({
  firstItem: {
    marginTop: 16
  }
});