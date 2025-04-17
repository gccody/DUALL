import Code from "@/components/Code";
import { Service } from '@/types';
import { ViewStyle } from "react-native";

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
  const borderStyle: ViewStyle = {
    borderColor: 'yellow',
    borderWidth: isHighlighted ? 1 : 0,
    marginTop: isFirstItem ? 20 : 0
  };

  return (
    <Code
      service={service}
      globalTimestamp={globalTimestamp}
      style={borderStyle}
    />
  );
}