import { colors } from "@/global";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { GestureResponderEvent, TouchableOpacity } from "react-native";



export default function SearchButton({ onPress, size = 60 }: { onPress?: ((event: GestureResponderEvent) => void), size?: number }) {
    return (
        <TouchableOpacity style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            backgroundColor: colors.secondary,
            borderRadius: size / 2,
            width: size,
            height: size,
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 5,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 3,
        }}
            onPress={onPress}
        >
            <FontAwesome name="search" size={size / 2} />
        </TouchableOpacity>
    )
}