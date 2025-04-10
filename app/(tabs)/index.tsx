import Code from "@/components/Code";
import { colors } from "@/global";
import { useEffect, useState } from "react";
import { SafeAreaView, ScrollView } from "react-native";

// Your TOTP secret key
const TOTP_SECRET = "TESTING_KEY";

export default function Index() {
  let [data, setData] = useState<Array<string>>([]);

  useEffect(() => {
    let temp = [];
    for (let i = 0; i < 100; i++) {
      temp.push(TOTP_SECRET);
    }
    setData(temp);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.black }}>
      <ScrollView>
        {
          data.map((secret, i) => {
            const isLastElement = i === data.length - 1;
            const style = { borderColor: colors.secondary, borderBottomWidth: 1 };
            if (isLastElement) style.borderBottomWidth = 0;
            return (
              <Code key={i} secret={secret} style={style} />
            );
          })
        }
      </ScrollView>
    </SafeAreaView>
  );
}