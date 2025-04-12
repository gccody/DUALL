import Code from "@/components/Code";
import SearchButton from "@/components/SearchButton";
import { colors } from "@/global";
import { FlashList } from '@shopify/flash-list';
import { useEffect, useState } from "react";
import { SafeAreaView, StyleProp, ViewStyle } from "react-native";

// Your TOTP secret key
const TOTP_SECRET = "";

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
        renderItem={({ item, index }) => {
          const isFirstElement = index === 0;
          let style: StyleProp<ViewStyle> = { marginHorizontal: 20, marginBottom: 20, backgroundColor: '#262626', padding: 5, borderRadius: 25 };
          if (isFirstElement) style.marginTop = 20;
          return <Code secret={item} globalTimestamp={timestamp} style={style} />
        }}
        estimatedItemSize={150}
        keyExtractor={(item, index) => `${item}-${index}`}
        extraData={timestamp}
      />
      <SearchButton />
    </SafeAreaView>
  );
}