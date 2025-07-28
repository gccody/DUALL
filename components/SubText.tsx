import { useTheme } from "@/context/ThemeContext";
import React from "react";
import { StyleSheet, Text } from "react-native";

interface SubTextProps {
  text: string;
}

const SubText: React.FC<SubTextProps> = ({ text }) => {
  const { theme } = useTheme();

  return <Text style={[styles.settingValue, { color: theme.subText }]}>{text}</Text>
}

const styles = StyleSheet.create({
  settingValue: {
    fontSize: 16,
  },
})

export default SubText;