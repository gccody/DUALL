import { StyleSheet, Text, View } from "react-native";

interface ErrorViewProps {
  message: string;
}

export default function ErrorView({ message }: ErrorViewProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.errorText}>Error: {message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  errorText: {
    color: 'red'
  }
});