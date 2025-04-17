import Code from "@/components/Code";
import { SearchBar } from "@/components/SearchBar";
import SearchButton from "@/components/SearchButton";
import { OtpDataContext } from "@/context/OtpDataContext";
import { colors } from "@/global";
import { TOTP } from "@/TOTP";
import { Service } from '@/types';
import { FlashList } from '@shopify/flash-list';
import * as Crypto from 'expo-crypto';
import { useLocalSearchParams } from "expo-router";
import Fuse from 'fuse.js';
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert, SafeAreaView, StyleSheet, Text, View, ViewStyle } from "react-native";

export default function Index() {
  const context = useContext(OtpDataContext);
  const [preSearchData, setPreSearchData] = useState<Array<Service>>(context?.data?.services || []);
  const [services, setServices] = useState<Array<Service>>([]);
  const [search, setSearch] = useState<string>('');
  const [timestamp, setTimestamp] = useState(Date.now());
  const [searchBarVisible, setSearchBarVisible] = useState<boolean>(false);
  const { otpurl }: { otpurl: string } = useLocalSearchParams();
  const [recentCodeIndex, setRecentCodeIndex] = useState<number | null>(null);
  const flashListRef = useRef<FlashList<Service>>(null);

  // Memoize the Fuse instance so it’s created only when preSearchData changes.
  const fuse = useMemo(
    () => new Fuse(preSearchData, { isCaseSensitive: false, keys: ["name", "otp.issuer"], distance: 0.4 }),
    [preSearchData]
  );

  useEffect(() => {
    if (context?.data) {
      setPreSearchData(context.data.services);
    }
  }, [context?.data]);

  // Update search results when search query changes.
  useEffect(() => {
    if (search === '') {
      setServices(preSearchData);
    } else {
      const searchedData = fuse.search(search);
      setServices(searchedData.map((val) => val.item));
    }
  }, [search, preSearchData, fuse]);

  // Add a new code if otpurl is provided.
  useEffect(() => {
    if (otpurl) {
      addCode(otpurl);
    }
  }, [otpurl]);

  // Update timestamp on each animation frame.
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
    if (recentCodeIndex) {
      console.log("Here");
      flashListRef.current?.scrollToIndex({ index: recentCodeIndex, animated: true });
    }
  }, [recentCodeIndex]);

  // Add code from otpurl.
  const addCode = (url: string) => {
    const parsedURL = TOTP.parseUrl(url);
    if (parsedURL === null) return Alert.alert("Error", "Unable to add code!");
    if (parsedURL.type === 'hotp') return Alert.alert("Error", "HOTP is not supported yet");

    const service: Service = {
      otp: {
        algorithm: parsedURL.algorithm,
        digits: parsedURL.digits,
        issuer: parsedURL.issuer,
        link: url,
        period: parsedURL.period ?? 30,
        tokenType: 'TOTP'
      },
      position: preSearchData.length,
      name: parsedURL.account,
      secret: parsedURL.secret,
      uid: Crypto.randomUUID(),
      updatedAt: Date.now(),
      icon: {
        label: parsedURL.issuer.substring(0, 2)
      }
    };

    // In addCode function:
    const codeExists = preSearchData.findIndex((item) =>
      item.name.toLowerCase() === service.name.toLowerCase() &&
      item.otp.issuer.toLowerCase() === service.otp.issuer.toLowerCase() &&
      item.secret === service.secret
    );

    if (codeExists === -1) {
      const newServices = [...preSearchData, service];
      setPreSearchData(newServices);
      updateServices(newServices);
      setRecentCodeIndex(newServices.length);
    } else {
      setRecentCodeIndex(codeExists);
    }
  };

  // Handlers for search actions.
  const onSearch = (text: string) => setSearch(text);
  const onSearchButtonPress = () => setSearchBarVisible(!searchBarVisible);

  if (!context)
    return (<View style={styles.centerContend} ><Text style={styles.redText}>Unable to load context? Contact the developer</Text></View>)

  const { data: contextData, loading: contextLoading, error: contextError, updateGroups, updateServices, updateSettings } = context;

  if (contextError)
    return (<View style={styles.centerContend} ><Text style={styles.redText}>Error: {contextError}</Text></View>)

  if (contextLoading)
    return (<View style={styles.centerContend} ><Text>Loading...</Text></View>)


  if (!context) {
    return (
      <View style={styles.centerContend}>
        <Text>Unable to provide context? Please contact the developer</Text>
      </View>
    );
  }

  const { data, loading, error } = context;

  if (loading || !data) {
    return (
      <View style={styles.centerContend}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContend}>
        <Text style={styles.redText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <SearchBar text={search} isVisible={searchBarVisible} onSearch={onSearch} />
      <FlashList
        ref={flashListRef}
        onTouchStart={() => setRecentCodeIndex(null)}
        data={searchBarVisible ? services : preSearchData}
        renderItem={({ item, index }) => {
          const isFirstElement = index === 0;
          let borderStyle: ViewStyle = {
            borderColor: 'yellow',
            borderWidth: recentCodeIndex === index ? 1 : 0
          };
          if (isFirstElement) borderStyle.marginTop = 20;
          return <Code service={item} globalTimestamp={timestamp} style={borderStyle} />;
        }}
        estimatedItemSize={150}
        keyExtractor={(item, index) => `${item.uid}-${index}`}
        extraData={[timestamp]}
      />
      <SearchButton onPress={onSearchButtonPress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  redText: {
    color: 'red'
  },
  centerContend: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  container: {
    flex: 1,
    backgroundColor: colors.black,
    position: 'relative'
  }
})