import Code from "@/components/Code";
import { colors } from "@/global";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { FlashList } from '@shopify/flash-list';
import { useEffect, useState } from "react";
import { SafeAreaView, TouchableOpacity } from "react-native";

// Your TOTP secret key
const TOTP_SECRET = "";

const SEARCH_BUTTON_SIZE = 60;

export default function Index() {
  let [data, setData] = useState<Array<string>>([TOTP_SECRET]);
  const [timestamp, setTimestamp] = useState(Date.now());

  useEffect(() => {
    let frame: number;
    const update = () => {
      setTimestamp(Date.now());
      frame = requestAnimationFrame(update);
    };

    frame = requestAnimationFrame(update);

    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const temp = [];
    for (let i = 0; i < 200; i++) {
      temp.push(TOTP_SECRET);
    }

    setData(temp);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.black, position: 'relative' }}>
      <FlashList
        data={data}
        renderItem={({ item, index }) => <Code secret={item} globalTimestamp={timestamp} style={{ margin: 20, backgroundColor: '#262626', padding: 5, borderRadius: 25 }} />}
        estimatedItemSize={150}
        keyExtractor={(item, index) => `${item}-${index}`}
        extraData={timestamp}
      />
      <TouchableOpacity style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: colors.secondary,
        borderRadius: SEARCH_BUTTON_SIZE / 2,
        width: SEARCH_BUTTON_SIZE,
        height: SEARCH_BUTTON_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      }}>
        <FontAwesome name="search" size={SEARCH_BUTTON_SIZE / 2} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}